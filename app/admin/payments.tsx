import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService, UserService, SeatBookingService, AdmissionService, NotificationService, AdminLogService } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Payment, User, SeatBooking, Admission } from '@/types/database';
import { formatDate } from '@/utils/dateUtils';
import { ArrowLeft, CircleCheck as CheckCircle, Circle as XCircle, Clock, Banknote, MapPin, Calendar, GraduationCap } from 'lucide-react-native';

interface CashPaymentWithDetails extends Payment {
  user: User;
  booking?: SeatBooking;
  admission?: Admission;
}

export default function AdminPaymentsScreen() {
  const { user } = useAuth();
  const [cashPayments, setCashPayments] = useState<CashPaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Redirect if not admin
  if (user?.role !== 'admin') {
    router.replace('/admin');
    return null;
  }

  useEffect(() => {
    fetchCashPayments();
  }, []);

  const fetchCashPayments = async () => {
    try {
      const payments = await PaymentService.getAllPayments();
      
      const paymentsWithDetails = await Promise.all(
        payments.map(async (payment) => {
          const userDetails = await UserService.getUserById(payment.userId);
          let booking = null;
          let admission = null;

          if (payment.bookingId) {
            booking = await SeatBookingService.getBookingById(payment.bookingId);
          }

          if (payment.admissionId) {
            admission = await AdmissionService.getAdmissionById(payment.admissionId);
          }

          return {
            ...payment,
            user: userDetails,
            booking,
            admission
          } as CashPaymentWithDetails;
        })
      );

      setCashPayments(paymentsWithDetails.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error fetching cash payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCashPayments();
    setRefreshing(false);
  };

  const handlePaymentAction = async (payment: CashPaymentWithDetails, action: 'approve' | 'reject') => {
    const paymentId = payment.id;
    setProcessing(paymentId);

    try {
      // Update payment status
      await PaymentService.updatePayment(paymentId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedBy: user?.id,
        approvedAt: new Date()
      });

      if (action === 'approve') {
        // If it's a booking payment, update the booking status to 'booked'
        if (payment.bookingId) {
          await SeatBookingService.updateBooking(payment.bookingId, {
            bookingStatus: 'booked'
          });
        }

        // If it's an admission payment, update the admission status and dates
        if (payment.admissionId) {
          const startDate = new Date();
          const admission = await AdmissionService.getAdmissionById(payment.admissionId);
          
          if (admission) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + admission.duration);

            await AdmissionService.updateAdmission(payment.admissionId, {
              paymentStatus: 'paid',
              paymentDate: startDate,
              startDate: startDate,
              endDate: endDate
            });
          }
        }
      } else if (action === 'reject') {
        // If rejected, remove the booking (if it exists)
        if (payment.bookingId) {
          await SeatBookingService.deleteBooking(payment.bookingId);
        }

        // If rejected admission payment, keep admission as pending
        if (payment.admissionId) {
          await AdmissionService.updateAdmission(payment.admissionId, {
            paymentStatus: 'pending'
          });
        }

        // Send notification to student about rejection
        await NotificationService.createNotification({
          userId: payment.userId,
          title: 'Payment Rejected',
          body: `Your cash payment of ₹${payment.amount} has been rejected. Please contact the library for more information.`,
          type: 'error',
          isRead: false,
          createdBy: user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Log admin action
      await AdminLogService.createLog({
        adminId: user?.id || '',
        action: `${action}_cash_payment`,
        details: { 
          paymentId: paymentId, 
          amount: payment.amount,
          userName: payment.user?.fullName,
          paymentType: payment.bookingId ? 'booking' : 'admission'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Send success notification to student if approved
      if (action === 'approve') {
        await NotificationService.createNotification({
          userId: payment.userId,
          title: 'Payment Approved',
          body: `Your cash payment of ₹${payment.amount} has been approved. ${payment.bookingId ? 'Your seat booking is now confirmed.' : 'Your admission is now active.'}`,
          type: 'success',
          isRead: false,
          createdBy: user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      Alert.alert(
        'Success',
        `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
      );

      await fetchCashPayments();
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      Alert.alert('Error', `Failed to ${action} payment. Please try again.`);
    } finally {
      setProcessing(null);
    }
  };

  const confirmAction = (payment: CashPaymentWithDetails, action: 'approve' | 'reject') => {
    const paymentType = payment.bookingId ? 'seat booking' : 'admission';
    const details = payment.bookingId 
      ? `Seat ${payment.booking?.seatNumber} for ${payment.booking?.shift} shift`
      : `Admission for ${payment.admission?.courseName}`;

    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Reject'} Payment`,
      `Are you sure you want to ${action} the ${paymentType} payment of ₹${payment.amount} from ${payment.user?.fullName || 'Unknown User'}?\n\nDetails: ${details}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => handlePaymentAction(payment, action)
        }
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const pendingPayments = cashPayments.filter(p => p.status === 'pending');
  const processedPayments = cashPayments.filter(p => p.status !== 'pending');

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Button
          onPress={() => router.back()}
          variant="outline"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#2563EB" />
        </Button>
        <Text style={styles.title}>Cash Payments</Text>
        <Text style={styles.subtitle}>Manage cash payment approvals</Text>
      </View>

      {/* Pending Payments */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Pending Approvals ({pendingPayments.length})
        </Text>
        
        {pendingPayments.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No pending cash payments to review</Text>
          </View>
        ) : (
          <View style={styles.paymentsList}>
            {pendingPayments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{payment.user?.fullName || 'N/A'}</Text>
                    <Text style={styles.userEmail}>{payment.user?.email || 'N/A'}</Text>
                    <Text style={styles.userMobile}>{payment.user?.mobileNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amount}>₹{payment.amount}</Text>
                    <View style={styles.pendingBadge}>
                      <Clock size={12} color="#FFFFFF" />
                      <Text style={styles.pendingText}>PENDING</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  {payment.bookingId && payment.booking && (
                    <View style={styles.bookingDetails}>
                      <View style={styles.detailRow}>
                        <MapPin size={14} color="#64748B" />
                        <Text style={styles.detailText}>
                          Seat {payment.booking.seatNumber} - {payment.booking.shift.toUpperCase()} shift
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Calendar size={14} color="#64748B" />
                        <Text style={styles.detailText}>
                          Date: {new Date(payment.booking.bookingDate).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {payment.admissionId && payment.admission && (
                    <View style={styles.admissionDetails}>
                      <View style={styles.detailRow}>
                        <GraduationCap size={14} color="#64748B" />
                        <Text style={styles.detailText}>
                          Course: {payment.admission.courseName}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Clock size={14} color="#64748B" />
                        <Text style={styles.detailText}>
                          Duration: {payment.admission.duration} month{payment.admission.duration > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Calendar size={14} color="#64748B" />
                        <Text style={styles.detailText}>
                          Shifts: {payment.admission.selectedShifts.join(', ')}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <Text style={styles.detailText}>
                    Submitted: {formatDate(payment.createdAt)}
                  </Text>
                  <Text style={styles.detailText}>
                    Type: {payment.admissionId ? 'Admission Payment' : 'Seat Booking Payment'}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.approveButton, processing === payment.id && styles.disabledButton]}
                    onPress={() => {
                      if (processing !== payment.id) {
                        confirmAction(payment, 'approve');
                      }
                    }}
                    disabled={processing === payment.id}
                    activeOpacity={0.7}
                  >
                    <View style={styles.buttonContent}>
                      <CheckCircle size={16} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Approve</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rejectButton, processing === payment.id && styles.disabledButton]}
                    onPress={() => {
                      if (processing !== payment.id) {
                        confirmAction(payment, 'reject');
                      }
                    }}
                    disabled={processing === payment.id}
                    activeOpacity={0.7}
                  >
                    <View style={styles.buttonContent}>
                      <XCircle size={16} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Reject</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Payment History */}
      {processedPayments.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <View style={styles.paymentsList}>
            {processedPayments.map((payment) => (
              <View key={payment.id} style={styles.historyItem}>
                <View style={styles.paymentHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{payment.user?.fullName || 'N/A'}</Text>
                    <Text style={styles.userEmail}>{payment.user?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amount}>₹{payment.amount}</Text>
                    <View style={[
                      styles.statusBadge,
                      payment.status === 'approved' ? styles.approvedBadge : styles.rejectedBadge
                    ]}>
                      {payment.status === 'approved' ? (
                        <CheckCircle size={12} color="#FFFFFF" />
                      ) : (
                        <XCircle size={12} color="#FFFFFF" />
                      )}
                      <Text style={styles.statusText}>
                        {payment.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  <Text style={styles.detailText}>
                    Processed: {formatDate(payment.approvedAt || payment.createdAt)}
                  </Text>
                  <Text style={styles.detailText}>
                    Type: {payment.admissionId ? 'Admission Payment' : 'Seat Booking Payment'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  sectionCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  paymentsList: {
    gap: 16,
  },
  paymentItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    opacity: 0.8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  userMobile: {
    fontSize: 12,
    color: '#64748B',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  approvedBadge: {
    backgroundColor: '#10B981',
  },
  rejectedBadge: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  paymentDetails: {
    marginBottom: 16,
  },
  bookingDetails: {
    marginBottom: 8,
  },
  admissionDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 48,
    alignItems: 'center',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});