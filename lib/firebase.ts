import { 
  collection, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase.config';

// Firestore Collections
export const COLLECTIONS = {
  USERS: 'users',
  ADMISSIONS: 'admissions',
  PAYMENTS: 'payments',
  SEAT_BOOKINGS: 'seat_bookings',
  ATTENDANCE: 'attendance',
  NOTIFICATIONS: 'notifications',
  ADMIN_LOGS: 'admin_logs'
};

// Generic Firestore operations
export class FirebaseService {
  // Create document
  static async create(collectionName: string, data: any) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  static async update(collectionName: string, docId: string, data: any) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { id: docId, ...data };
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Delete document
  static async delete(collectionName: string, docId: string) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return true;
    } catch (error) {
      console.error(`Error deleting document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Get single document
  static async getById(collectionName: string, docId: string) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // Get all documents
  static async getAll(collectionName: string, orderByField?: string, orderDirection: 'asc' | 'desc' = 'desc') {
    try {
      let q = collection(db, collectionName);
      
      if (orderByField) {
        q = query(collection(db, collectionName), orderBy(orderByField, orderDirection));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Get documents with where clause
  static async getWhere(
    collectionName: string, 
    field: string, 
    operator: any, 
    value: any,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ) {
    try {
      let q = query(collection(db, collectionName), where(field, operator, value));
      
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error querying documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Real-time listener
  static onSnapshot(
    collectionName: string, 
    callback: (data: any[]) => void,
    errorCallback?: (error: Error) => void
  ) {
    try {
      const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(data);
      }, errorCallback);
    } catch (error) {
      console.error(`Error setting up listener for ${collectionName}:`, error);
      if (errorCallback) errorCallback(error as Error);
    }
  }

  // Upload file to Firebase Storage
  static async uploadFile(path: string, file: Blob | Uint8Array | ArrayBuffer) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Delete file from Firebase Storage
  static async deleteFile(path: string) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

// User-specific operations
export class UserService extends FirebaseService {
  static async createUserWithId(userId: string, userData: any) {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, userId);
      await setDoc(docRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: userId, ...userData };
    } catch (error) {
      console.error(`Error creating user with ID ${userId}:`, error);
      throw error;
    }
  }

  static async createUser(userData: any) {
    return this.create(COLLECTIONS.USERS, userData);
  }

  static async getUserById(userId: string) {
    return this.getById(COLLECTIONS.USERS, userId);
  }

  static async updateUser(userId: string, userData: any) {
    return this.update(COLLECTIONS.USERS, userId, userData);
  }

  static async getUsersByRole(role: string) {
    const users = await this.getWhere(COLLECTIONS.USERS, 'role', '==', role);
    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getUsersByApprovalStatus(status: string) {
    const users = await this.getWhere(COLLECTIONS.USERS, 'approvalStatus', '==', status);
    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Admission operations
export class AdmissionService extends FirebaseService {
  static async createAdmission(admissionData: any) {
    return this.create(COLLECTIONS.ADMISSIONS, admissionData);
  }

  static async getUserAdmissions(userId: string) {
    return this.getWhere(COLLECTIONS.ADMISSIONS, 'userId', '==', userId);
  }

  static async updateAdmission(admissionId: string, admissionData: any) {
    return this.update(COLLECTIONS.ADMISSIONS, admissionId, admissionData);
  }
}

// Seat booking operations
export class SeatBookingService extends FirebaseService {
  static async createBooking(bookingData: any) {
    return this.create(COLLECTIONS.SEAT_BOOKINGS, bookingData);
  }

  static async getUserBookings(userId: string) {
    return this.getWhere(COLLECTIONS.SEAT_BOOKINGS, 'userId', '==', userId, 'createdAt');
  }

  static async getBookingsByDate(date: string) {
    return this.getWhere(COLLECTIONS.SEAT_BOOKINGS, 'bookingDate', '==', date);
  }

  static async getBookingsByShiftAndDate(shift: string, date: string) {
    const bookings = await this.getWhere(COLLECTIONS.SEAT_BOOKINGS, 'bookingDate', '==', date);
    return bookings.filter(booking => booking.shift === shift);
  }

  static async updateBooking(bookingId: string, bookingData: any) {
    return this.update(COLLECTIONS.SEAT_BOOKINGS, bookingId, bookingData);
  }

  static async deleteBooking(bookingId: string) {
    return this.delete(COLLECTIONS.SEAT_BOOKINGS, bookingId);
  }
}

// Attendance operations
export class AttendanceService extends FirebaseService {
  static async createAttendance(attendanceData: any) {
    return this.create(COLLECTIONS.ATTENDANCE, attendanceData);
  }

  static async getUserAttendance(userId: string, date?: string) {
    if (date) {
      const attendance = await this.getWhere(COLLECTIONS.ATTENDANCE, 'userId', '==', userId);
      return attendance.filter(record => record.date === date);
    }
    return this.getWhere(COLLECTIONS.ATTENDANCE, 'userId', '==', userId, 'createdAt');
  }

  static async updateAttendance(attendanceId: string, attendanceData: any) {
    return this.update(COLLECTIONS.ATTENDANCE, attendanceId, attendanceData);
  }

  static async getAttendanceByDate(date: string) {
    return this.getWhere(COLLECTIONS.ATTENDANCE, 'date', '==', date);
  }
}

// Notification operations
export class NotificationService extends FirebaseService {
  static async createNotification(notificationData: any) {
    return this.create(COLLECTIONS.NOTIFICATIONS, notificationData);
  }

  static async getUserNotifications(userId: string) {
    return this.getWhere(COLLECTIONS.NOTIFICATIONS, 'userId', '==', userId, 'createdAt');
  }

  static async markNotificationAsRead(notificationId: string) {
    return this.update(COLLECTIONS.NOTIFICATIONS, notificationId, { isRead: true });
  }

  static async deleteNotification(notificationId: string) {
    return this.delete(COLLECTIONS.NOTIFICATIONS, notificationId);
  }
}

// Payment operations
export class PaymentService extends FirebaseService {
  static async createPayment(paymentData: any) {
    return this.create(COLLECTIONS.PAYMENTS, paymentData);
  }

  static async getUserPayments(userId: string) {
    try {
      // Use getAll and filter client-side to avoid composite index requirement
      const allPayments = await this.getAll(COLLECTIONS.PAYMENTS, 'createdAt');
      return allPayments.filter(payment => payment.userId === userId);
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }

  static async updatePayment(paymentId: string, paymentData: any) {
    return this.update(COLLECTIONS.PAYMENTS, paymentId, paymentData);
  }

  static async getPaymentsByStatus(status: string) {
    const payments = await this.getWhere(COLLECTIONS.PAYMENTS, 'status', '==', status);
    return payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Admin log operations
export class AdminLogService extends FirebaseService {
  static async createLog(logData: any) {
    return this.create(COLLECTIONS.ADMIN_LOGS, logData);
  }

  static async getLogsByAdmin(adminId: string) {
    return this.getWhere(COLLECTIONS.ADMIN_LOGS, 'adminId', '==', adminId, 'createdAt');
  }

  static async getAllLogs() {
    return this.getAll(COLLECTIONS.ADMIN_LOGS, 'createdAt');
  }
}
