// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Use the explicit project name as the second parameter
  // Replace "your-project-name" with your actual Firebase project name
  app = getApps().length === 0 
    ? initializeApp(firebaseConfig, "your-project-name") 
    : getApps()[0];
    
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Connect to emulators in development if needed
  if (process.env.NODE_ENV === 'development' && false) { // Set to true to enable emulators
    // Uncomment these if you're using Firebase emulators
    // First, import the emulator functions if you need them:
    // import { connectAuthEmulator } from 'firebase/auth';
    // import { connectFirestoreEmulator } from 'firebase/firestore';
    
    // Then connect to the emulators:
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
  }
}

export { app, auth, db };