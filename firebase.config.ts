import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredKeys = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  
  if (missingKeys.length > 0) {
    console.error('❌ Missing Firebase configuration keys:', missingKeys);
    console.error('Please add these to your .env file:');
    missingKeys.forEach(key => {
      console.error(`${key}=your_value_here`);
    });
    throw new Error('Firebase configuration is incomplete');
  }

  console.log('✅ Firebase configuration validated successfully');
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;
let messaging;

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

  // Initialize Auth with persistence
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }

  // Initialize Firestore
  db = getFirestore(app);
  
  // Initialize Storage
  storage = getStorage(app);
  
  // Initialize Messaging (web only for now)
  if (Platform.OS === 'web') {
    messaging = getMessaging(app);
  }

  // Connect to emulator in development
  if (__DEV__ && Platform.OS === 'web') {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔧 Connected to Firestore emulator');
    } catch (error) {
      console.log('ℹ️ Firestore emulator not available, using production');
    }
  }

  console.log('✅ Firebase services initialized successfully');

} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { auth, db, storage, messaging };
export default app;