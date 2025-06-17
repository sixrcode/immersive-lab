import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
// import { getAuth } from "firebase/auth"; // Example if auth is needed directly from here
// import { getFirestore } from "firebase/firestore"; // Example for Firestore

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
// Conditional initialization to prevent re-initialization in Next.js HMR
let firebaseApp: FirebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp(); // If already initialized, use that app
}

// const auth = getAuth(firebaseApp); // Example: export auth if needed globally
// const db = getFirestore(firebaseApp); // Example: export db if needed globally

export { firebaseApp }; // Export the initialized app
// export { auth, db }; // Example: export services
