// api/children/index.js - Get all children
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const q = query(collection(db, 'children'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const children = [];
      
      querySnapshot.forEach((doc) => {
        children.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.status(200).json(children);
    } catch (error) {
      console.error('Error fetching children:', error);
      res.status(500).json({ error: 'Failed to fetch children' });
    }
  } else if (req.method === 'POST') {
    try {
      const childData = {
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'children'), childData);
      res.status(201).json({ id: docRef.id, ...childData });
    } catch (error) {
      console.error('Error adding child:', error);
      res.status(500).json({ error: 'Failed to add child' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// api/children/[id].js - Get, update, or delete specific child
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    try {
      const docRef = doc(db, 'children', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        res.status(200).json({ id: docSnap.id, ...docSnap.data() });
      } else {
        res.status(404).json({ error: 'Child not found' });
      }
    } catch (error) {
      console.error('Error fetching child:', error);
      res.status(500).json({ error: 'Failed to fetch child' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'children', id), updateData);
      res.status(200).json({ id, ...updateData });
    } catch (error) {
      console.error('Error updating child:', error);
      res.status(500).json({ error: 'Failed to update child' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteDoc(doc(db, 'children', id));
      res.status(200).json({ message: 'Child deleted successfully' });
    } catch (error) {
      console.error('Error deleting child:', error);
      res.status(500).json({ error: 'Failed to delete child' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// api/attendance/index.js - Get attendance records
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { date, childId } = req.query;
      let q = collection(db, 'attendance');
      
      if (date) {
        q = query(q, where('date', '==', date));
      }
      
      if (childId) {
        q = query(q, where('childId', '==', childId));
      }
      
      q = query(q, orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const attendance = [];
      
      querySnapshot.forEach((doc) => {
        attendance.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.status(200).json(attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  } else if (req.method === 'POST') {
    try {
      const attendanceData = {
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      res.status(201).json({ id: docRef.id, ...attendanceData });
    } catch (error) {
      console.error('Error adding attendance:', error);
      res.status(500).json({ error: 'Failed to add attendance' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// api/attendance/bulk.js - Bulk attendance operations
import { db } from '../../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { date, attendanceData } = req.body;
      
      // First, remove any existing attendance for this date
      const q = query(collection(db, 'attendance'), where('date', '==', date));
      const existingSnapshot = await getDocs(q);
      
      const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Then add new attendance records
      const addPromises = attendanceData.map(record => 
        addDoc(collection(db, 'attendance'), {
          ...record,
          date,
          createdAt: new Date().toISOString()
        })
      );
      
      await Promise.all(addPromises);
      
      res.status(200).json({ message: 'Bulk attendance updated successfully' });
    } catch (error) {
      console.error('Error updating bulk attendance:', error);
      res.status(500).json({ error: 'Failed to update bulk attendance' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// api/reports/attendance.js - Generate attendance reports
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, childId } = req.query;
      
      let q = collection(db, 'attendance');
      
      if (startDate && endDate) {
        q = query(q, where('date', '>=', startDate), where('date', '<=', endDate));
      }
      
      if (childId) {
        q = query(q, where('childId', '==', childId));
      }
      
      q = query(q, orderBy('date', 'desc'));
      
      const attendanceSnapshot = await getDocs(q);
      const childrenSnapshot = await getDocs(collection(db, 'children'));
      
      // Create a map of children for quick lookup
      const childrenMap = {};
      childrenSnapshot.forEach(doc => {
        childrenMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      
      // Process attendance data
      const attendanceData = [];
      const summaryData = {};
      
      attendanceSnapshot.forEach(doc => {
        const record = { id: doc.id, ...doc.data() };
        const child = childrenMap[record.childId];
        
        if (child) {
          attendanceData.push({
            ...record,
            childName: child.name,
            childAge: calculateAge(child.birthDate)
          });
          
          // Build summary
          if (!summaryData[record.childId]) {
            summaryData[record.childId] = {
              child: child,
              totalServices: 0,
              presentCount: 0,
              absentCount: 0
            };
          }
          
          summaryData[record.childId].totalServices++;
          if (record.present) {
            summaryData[record.childId].presentCount++;
          } else {
            summaryData[record.childId].absentCount++;
          }
        }
      });
      
      // Calculate percentages
      const summary = Object.values(summaryData).map(item => ({
        ...item,
        attendancePercentage: item.totalServices > 0 
          ? Math.round((item.presentCount / item.totalServices) * 100) 
          : 0
      }));
      
      res.status(200).json({
        attendanceData,
        summary,
        totalRecords: attendanceData.length
      });
    } catch (error) {
      console.error('Error generating attendance report:', error);
      res.status(500).json({ error: 'Failed to generate attendance report' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Helper function
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}