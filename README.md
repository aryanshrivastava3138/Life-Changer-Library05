# Life Changer Library Management System

A comprehensive library management system built with Expo and Firebase for managing student admissions, seat bookings, attendance tracking, and payments.

## Features

- **User Authentication**: Secure registration and login system
- **Student Admission**: Complete admission form with course selection and shift preferences
- **Seat Booking**: Interactive seat selection for different time shifts
- **Attendance Tracking**: Check-in/check-out system for library visits
- **Payment Management**: UPI-based payment system with QR codes
- **Profile Management**: User profile and payment history

## Setup Instructions

### 1. Firebase Setup

1. Create a new project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password provider
3. Create a Firestore database
4. Get your Firebase configuration from Project Settings
4. Create a `.env` file in the root directory and add your credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

**Important**: 
- Replace all placeholder values with your actual Firebase configuration
- After updating the `.env` file, restart your development server with `npm run dev`

### 2. Firestore Setup

The app will automatically create the following collections when you use the features:

- `users` - User profiles and roles
- `admissions` - Student admission records
- `seat_bookings` - Seat reservation data
- `attendance` - Check-in/check-out records
- `payments` - Payment transaction history
- `notifications` - System notifications
- `admin_logs` - Admin action audit trail

### 3. Firebase Security Rules

Set up Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Other collections with similar patterns
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Authentication Setup

In your Firebase console:
1. Go to Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Disable "Email link (passwordless sign-in)" unless needed

## Database Schema

### Users Collection
- Stores user profiles linked to Firebase Auth
- Includes role-based access (student/admin)
- Approval status tracking

### Admissions Collection
- Complete student admission details
- Course information and shift preferences
- Payment status tracking

### Seat Bookings Collection
- Seat reservation system
- Shift-based booking with date tracking
- Prevents double booking

### Attendance Collection
- Check-in/check-out tracking
- Shift-based attendance records
- Historical attendance data

### Payment History Collection
- Complete payment transaction records
- Receipt number generation
- Duration and amount tracking

### Notifications Collection
- System notifications for users
- Admin-to-student messaging
- Read status tracking

### Admin Logs Collection
- Audit trail for admin actions
- User approval/rejection logs
- System activity tracking

## Development

1. Install dependencies:
```bash
npm install
```

2. Set up your Firebase configuration in `.env`

3. Start the development server:
```bash
npm run dev
```

4. Open the app in your browser or Expo Go app

## Deployment

This app can be deployed to:
- Expo Application Services (EAS)
- Vercel (for web)
- Netlify (for web)

Make sure to update your environment variables in your deployment platform and configure Firebase for production.

## Security Features

- Firebase Authentication with secure email/password
- Firestore security rules for data protection
- Role-based access control
- Input validation and sanitization
- Secure file uploads with Firebase Storage

## Push Notifications

The app is set up to use Firebase Cloud Messaging (FCM) for push notifications:
- Renewal alerts
- Admin messages to students
- System notifications

## Support

For issues or questions, please check the Firebase documentation or contact the development team.

## Migration from Supabase

This project has been migrated from Supabase to Firebase for better scalability and features. All data structures and functionality remain the same, but now use Firebase services for authentication, database, and storage.