// Firebase Firestore document interfaces
export interface User {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Admission {
  id: string;
  userId: string;
  name: string;
  age: number;
  contactNumber: string;
  fullAddress: string;
  email: string;
  courseName: string;
  fatherName: string;
  fatherContact: string;
  duration: 1 | 3 | 6;
  selectedShifts: string[];
  registrationFee: number;
  shiftFee: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid';
  paymentDate?: any;
  startDate?: any;
  endDate?: any;
  createdAt: any;
  updatedAt: any;
}

export interface SeatBooking {
  id: string;
  userId: string;
  shift: 'morning' | 'noon' | 'evening' | 'night';
  seatNumber: string;
  bookingStatus: 'booked' | 'available' | 'pending';
  bookingDate: string;
  createdAt: any;
  updatedAt: any;
}

export interface Attendance {
  id: string;
  userId: string;
  shift: string;
  checkInTime?: any;
  checkOutTime?: any;
  date: string;
  status?: 'present' | 'absent';
  reason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  method: 'upi' | 'cash' | 'qr';
  status: 'pending' | 'approved' | 'rejected';
  durationMonths: number;
  paymentDate: any;
  receiptNumber: string;
  bookingId?: string;
  admissionId?: string;
  approvedBy?: string;
  approvedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdBy?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  details?: any;
  createdAt: any;
  updatedAt: any;
}