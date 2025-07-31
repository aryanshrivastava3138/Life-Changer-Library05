import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCOKNRigqVWABQbV_sE64ZnDkcFrV81oaU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "life-changer-library-01.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "life-changer-library-01",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "life-changer-library-01.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1052583497759",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1052583497759:web:bd421a9bce4b7252a9c52a"
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!firebaseConfig[field as keyof typeof firebaseConfig]) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    console.error(`❌ Firebase configuration missing fields: ${missingFields.join(', ')}`);
    console.error(`
🚨 FIREBASE SETUP REQUIRED:

Missing configuration fields: ${missingFields.join(', ')}

Please check your .env file and ensure all Firebase configuration variables are set correctly.
    `);
    throw new Error(`Firebase configuration missing fields: ${missingFields.join(', ')}`);
  }
  
  console.log('✅ Firebase configuration validated successfully');
  return true;
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  validateFirebaseConfig();
  
  // Initialize Firebase app
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
  } else {
    app = getApps()[0];
    console.log('✅ Firebase app already initialized');
  }

  // Initialize Auth with proper persistence
  try {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
    console.log('✅ Firebase Auth initialized');
  } catch (authError: any) {
    // If auth is already initialized, get the existing instance
    if (authError.code === 'auth/already-initialized') {
      auth = getAuth(app);
      console.log('✅ Firebase Auth already initialized');
    } else {
      console.error('❌ Firebase Auth initialization error:', authError);
      
      // Provide specific guidance for configuration-not-found error
      if (authError.code === 'auth/configuration-not-found') {
        console.error(`
🔥 FIREBASE AUTHENTICATION SETUP REQUIRED:

The error 'auth/configuration-not-found' means Email/Password authentication 
is not enabled in your Firebase project.

TO FIX THIS:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: ${firebaseConfig.projectId}
3. Navigate to Authentication → Sign-in method
4. Enable "Email/Password" provider
5. Save the changes
6. Restart your development server

Your current auth domain: ${firebaseConfig.authDomain}
Make sure this matches your Firebase project's auth domain.
        `);
      }
      
      throw authError;
    }
  }

  // Initialize Firestore with better error handling
  try {
    db = getFirestore(app);
    console.log('✅ Firestore initialized');
  } catch (firestoreError: any) {
    console.error('❌ Firestore initialization error:', firestoreError);
    console.error(`
🔥 FIRESTORE DATABASE SETUP REQUIRED:

The Firestore database may not be created in your Firebase project.

TO FIX THIS:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: ${firebaseConfig.projectId}
3. Navigate to Firestore Database
4. Click "Create database"
5. Choose "Start in production mode" or "Start in test mode" for development
6. Select a location for your database
7. Wait for the database to be created
8. Restart your development server

Project ID: ${firebaseConfig.projectId}
    `);
    throw firestoreError;
  }
  
  // Initialize Storage
  try {
    storage = getStorage(app);
    console.log('✅ Firebase Storage initialized');
  } catch (storageError: any) {
    console.error('❌ Firebase Storage initialization error:', storageError);
    // Storage is not critical for basic functionality, so we don't throw
  }

  console.log('✅ All Firebase services initialized successfully');

} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  
  // Provide more specific error information
  if (error instanceof Error) {
    console.error('Error details:', {
      message: error.message,
      name: error.name
    });
    
    // Show user-friendly error message for configuration issues
    if (error.message.includes('configuration-not-found') || error.message.includes('auth/configuration-not-found')) {
      console.error(`
🚨 FIREBASE SETUP INCOMPLETE:

Please complete Firebase Authentication setup:
1. Visit: https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers
2. Enable Email/Password sign-in method
3. Restart your development server

Current configuration:
- Project ID: ${firebaseConfig.projectId}
- Auth Domain: ${firebaseConfig.authDomain}
      `);
    }
  }
  
  // Don't throw the error to prevent app crash, but log it
  console.error('Firebase services may not be available');
}

// Ensure exports are always available (with fallbacks)
export { auth, db, storage };
export default app;