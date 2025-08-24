import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDaEYcIDx2qa-n3PRmOc0fuauPBzkNVwUw",
  authDomain: "collabhub-346af.firebaseapp.com",
  projectId: "collabhub-346af",
  storageBucket: "collabhub-346af.firebasestorage.app",
  messagingSenderId: "539659083314",
  appId: "1:539659083314:web:9e8b43b89ea314b961262b",
  measurementId: "G-5ZWLVECCXF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 