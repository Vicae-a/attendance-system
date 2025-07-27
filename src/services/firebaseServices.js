import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    setDoc,
    onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase.js';

// Children Services
export const childrenService = {
    // Get all children
    async getAll() {
        try {
            const querySnapshot = await getDocs(
                query(collection(db, 'children'), orderBy('name'))
            );
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching children:', error);
            throw error;
        }
    },

    // Add new child
    async add(childData) {
        try {
            const docRef = await addDoc(collection(db, 'children'), {
                ...childData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding child:', error);
            throw error;
        }
    },

    // Update child
    async update(childId, updates) {
        try {
            const docRef = doc(db, 'children', childId);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating child:', error);
            throw error;
        }
    },

    // Delete child
    async delete(childId) {
        try {
            const docRef = doc(db, 'children', childId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting child:', error);
            throw error;
        }
    },

    // Upload child photo
    async uploadPhoto(childId, file) {
        try {
            const timestamp = Date.now();
            const photoRef = ref(storage, `children-photos/${childId}_${timestamp}_${file.name}`);
            const snapshot = await uploadBytes(photoRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading photo:', error);
            throw error;
        }
    }
};

// Attendance Services
export const attendanceService = {
    // Get attendance records for a specific date
    async getByDate(date) {
        try {
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const datePath = `${year}/${month}/${date}`;

            const recordsRef = collection(db, 'attendance', datePath, 'records');
            const snapshot = await getDocs(recordsRef);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                childId: doc.id,
                date: date,
                present: doc.data().present,
                markedAt: doc.data().markedAt
            }));
        } catch (error) {
            console.error('Error fetching attendance:', error);
            // Fallback to old structure if needed
            const q = query(
                collection(db, 'attendance'),
                where('date', '==', date)
            );
            const oldSnapshot = await getDocs(q);
            return oldSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
    },

    // Get attendance history for a child
    async getByChild(childId) {
        try {
            // Try with optimized query first
            const q = query(
                collection(db, 'attendance'),
                where('childId', '==', childId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error with indexed query:', error);

            // Fallback to client-side sorting
            const q = query(
                collection(db, 'attendance'),
                where('childId', '==', childId)
            );
            const querySnapshot = await getDocs(q);
            const results = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return results.sort((a, b) =>
                new Date(b.date || 0) - new Date(a.date || 0)
            );
        }
    },
    // Get all attendance records
    async getAll() {
        try {
            const q = query(
                collection(db, 'attendance'),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching all attendance:', error);
            throw error;
        }
    },

    // Migrate historical data
    async migrateHistoricalData() {
        const oldAttendance = await getDocs(collection(db, 'attendance'));
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const doc of oldAttendance.docs) {
            const data = doc.data();
            if (data.present) {
                const dateObj = new Date(data.date);
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth() + 1;
                const datePath = `${year}/${month}/${data.date}`;

                const newRef = doc(db, 'attendance', datePath, 'records', data.childId);
                batch.set(newRef, {
                    present: true,
                    markedAt: data.markedAt || serverTimestamp()
                });

                batchCount++;
                if (batchCount % 400 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }
    },

    // Mark attendance (present or absent)
    async markAttendance(childId, date, isPresent) {
        try {
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const datePath = `${year}/${month}/${date}`;

            const batch = writeBatch(db);

            // Old structure (keep temporarily)
            const oldQuery = query(
                collection(db, 'attendance'),
                where('childId', '==', childId),
                where('date', '==', date)
            );
            const oldSnapshot = await getDocs(oldQuery);

            if (isPresent) {
                // New structure
                const newRef = doc(db, 'attendance', datePath, 'records', childId);
                batch.set(newRef, {
                    present: true,
                    markedAt: serverTimestamp()
                });

                // Old structure
                if (oldSnapshot.empty) {
                    const oldRef = doc(collection(db, 'attendance'));
                    batch.set(oldRef, {
                        childId,
                        date,
                        present: true,
                        markedAt: serverTimestamp()
                    });
                } else {
                    batch.update(doc(db, 'attendance', oldSnapshot.docs[0].id), {
                        present: true,
                        markedAt: serverTimestamp()
                    });
                }
            } else {
                // Delete from both structures if marking absent
                if (!oldSnapshot.empty) {
                    batch.delete(doc(db, 'attendance', oldSnapshot.docs[0].id));
                }
                const newRef = doc(db, 'attendance', datePath, 'records', childId);
                batch.delete(newRef);
            }

            await batch.commit();

            if (isPresent) {
                return {
                    id: childId, // Using childId as doc ID in new structure
                    childId,
                    date,
                    present: true,
                    markedAt: serverTimestamp()
                };
            }
            return null;


        } catch (error) {
            console.error('Error marking attendance:', error);
            throw error;
        }
    },

    setupDateListener(date, callback) {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const datePath = `${year}/${month}/${date}`;

        const recordsRef = collection(db, 'attendance', datePath, 'records');
        return onSnapshot(recordsRef, (snapshot) => {
            const records = snapshot.docs.map(doc => ({
                id: doc.id, // childId
                childId: doc.id,
                date: date,
                present: doc.data().present,
                markedAt: doc.data().markedAt?.toDate() || new Date()
            }));
            callback(records);
        });
    }
};

// Sample data function
export const addSampleData = async () => {
    try {
        const sampleChildren = [
            {
                name: 'Emma Johnson',
                birthDate: '2018-03-15',
                address: '123 Main Street, Lagos',
                parentName: 'Sarah Johnson',
                parentPhone: '+234 801 234 5678',
                parentEmail: 'sarah.johnson@email.com',
                medicalNotes: 'Allergic to peanuts'
            },
            {
                name: 'Liam Smith',
                birthDate: '2019-07-22',
                address: '456 Oak Avenue, Lagos',
                parentName: 'Mike Smith',
                parentPhone: '+234 802 345 6789',
                parentEmail: 'mike.smith@email.com',
                medicalNotes: ''
            },
            {
                name: 'Sophia Davis',
                birthDate: '2016-11-08',
                address: '789 Pine Street, Lagos',
                parentName: 'Lisa Davis',
                parentPhone: '+234 803 456 7890',
                parentEmail: 'lisa.davis@email.com',
                medicalNotes: 'Asthma inhaler needed'
            },
            {
                name: 'Noah Wilson',
                birthDate: '2020-01-30',
                address: '321 Elm Drive, Lagos',
                parentName: 'David Wilson',
                parentPhone: '+234 804 567 8901',
                parentEmail: 'david.wilson@email.com',
                medicalNotes: ''
            },
            {
                name: 'Ava Brown',
                birthDate: '2017-09-12',
                address: '654 Cedar Lane, Lagos',
                parentName: 'Jennifer Brown',
                parentPhone: '+234 805 678 9012',
                parentEmail: 'jennifer.brown@email.com',
                medicalNotes: 'Lactose intolerant'
            }
        ];

        console.log('Adding sample children...');
        for (const child of sampleChildren) {
            await childrenService.add(child);
        }
        console.log('Sample data added successfully!');
    } catch (error) {
        console.error('Error adding sample data:', error);
    }
};