import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAIB03SqQGHfrOcKsJTtYwTReTjICl_Rf4",
  authDomain: "silid-c65e9.firebaseapp.com",
  projectId: "silid-c65e9",
  storageBucket: "silid-c65e9.firebasestorage.app",
  messagingSenderId: "82749066444",
  appId: "1:82749066444:web:9e0565994f6772f0f94669",
  measurementId: "G-MN8CC380NY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence for Firestore
// This is the core magic that makes the app work offline without manually syncing!
enableIndexedDbPersistence(db, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
}).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Firebase persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firebase persistence not supported by this browser');
  }
});
