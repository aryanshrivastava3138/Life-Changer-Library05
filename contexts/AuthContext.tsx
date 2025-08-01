import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase.config';
import { UserService } from '../lib/firebase';

interface User {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: any;
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, mobileNumber: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!isMountedRef.current) return;
      
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          try {
            const userProfile = await UserService.getUserById(firebaseUser.uid);
            console.log('Fetched user profile:', userProfile);
            if (userProfile) {
              setUser(userProfile as User);
            } else {
              console.log('User profile not found in Firestore for UID:', firebaseUser.uid);
              // User exists in Auth but not in Firestore, sign them out
              await firebaseSignOut(auth);
              setUser(null);
            }
          } catch (firestoreError: any) {
            console.error('Firestore connection error:', firestoreError);
            if (firestoreError.message?.includes('offline') || firestoreError.code === 'unavailable') {
              console.error(`
🔥 FIRESTORE DATABASE NOT ACCESSIBLE:

The Firestore database cannot be reached. This usually means:
1. The Firestore database hasn't been created in your Firebase project
2. Network connectivity issues
3. Incorrect Firebase configuration

TO FIX THIS:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: life-changer-library-01
3. Navigate to Firestore Database
4. Create a database if it doesn't exist
5. Restart your development server
              `);
            }
            // Sign out user if Firestore is not accessible
            try {
              await firebaseSignOut(auth);
            } catch (signOutError) {
              console.error('Error signing out user:', signOutError);
            }
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      if (isMountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!emailRegex.test(trimmedEmail)) {
        return { error: 'Please enter a valid email address' };
      }

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      
      // Fetch user profile
      try {
        const userProfile = await UserService.getUserById(userCredential.user.uid);
        console.log('Login - fetched user profile:', userProfile);
        if (!userProfile) {
          console.log('Login - user profile not found for UID:', userCredential.user.uid);
          return { error: 'User profile not found. Please contact support.' };
        }
      } catch (firestoreError: any) {
        console.error('Firestore error during sign in:', firestoreError);
        if (firestoreError.message?.includes('offline') || firestoreError.code === 'unavailable') {
          return { error: 'Database connection failed. Please check your internet connection and try again.' };
        }
        return { error: 'Unable to access user profile. Please try again later.' };
      }

      return {};
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle Firebase Auth errors
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return { error: 'Invalid email or password' };
        case 'auth/user-disabled':
          return { error: 'This account has been disabled' };
        case 'auth/too-many-requests':
          return { error: 'Too many failed attempts. Please try again later' };
        case 'auth/network-request-failed':
          return { error: 'Network error. Please check your connection' };
        default:
          return { error: error.message || 'An error occurred during sign in' };
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string, mobileNumber: string) => {
    try {
      // Validate inputs
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!emailRegex.test(trimmedEmail)) {
        return { error: 'Please enter a valid email address' };
      }

      if (!fullName.trim()) {
        return { error: 'Full name is required' };
      }

      if (!mobileNumber.trim()) {
        return { error: 'Mobile number is required' };
      }

      if (password.length < 6) {
        return { error: 'Password must be at least 6 characters long' };
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      
      // Create user profile in Firestore
      try {
        const userProfile = {
          id: userCredential.user.uid,
          email: trimmedEmail,
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          role: 'student' as const,
          approvalStatus: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Create user document with the user's UID as the document ID
        await UserService.createUserWithId(userCredential.user.uid, userProfile);
        console.log('User created successfully');
      } catch (firestoreError: any) {
        console.error('Firestore error during user creation:', firestoreError);
        
        // Delete the Firebase Auth user if Firestore creation fails
        try {
          await userCredential.user.delete();
        } catch (deleteError) {
          console.error('Error cleaning up Firebase Auth user:', deleteError);
        }
        
        if (firestoreError.message?.includes('offline') || firestoreError.code === 'unavailable') {
          return { error: 'Database connection failed. Please check your internet connection and try again.' };
        }
        return { error: 'Failed to create user profile. Please try again later.' };
      }

      return {};

    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Handle Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          return { error: 'An account with this email already exists' };
        case 'auth/weak-password':
          return { error: 'Password is too weak. Please choose a stronger password' };
        case 'auth/network-request-failed':
          return { error: 'Network error. Please check your connection' };
        case 'auth/operation-not-allowed':
          return { error: 'Email/password accounts are not enabled. Please contact support' };
        default:
          return { error: error.message || 'An error occurred during registration' };
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};