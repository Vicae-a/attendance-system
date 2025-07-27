// firebase.js - Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';


// Your Firebase configuration
// Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCsk-iI5dGtNOq4wNrnZGmo3yL6wveSn7k",
  authDomain: "childrens-church-attendance.firebaseapp.com",
  projectId: "childrens-church-attendance",
  storageBucket: "childrens-church-attendance.firebasestorage.app",
  messagingSenderId: "960873670481",
  appId: "1:960873670481:web:672fd321cecf3d96ced570",
  measurementId: "G-SFCYLL573S"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Uncomment these lines for local development with Firebase emulators
// if (location.hostname === 'localhost') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectAuthEmulator(auth, 'http://localhost:9099');
//   connectStorageEmulator(storage, 'localhost', 9199);
// }

export default app;