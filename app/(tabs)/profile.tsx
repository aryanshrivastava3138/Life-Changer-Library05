import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AdmissionService, PaymentService } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { User, CreditCard, Settings, CircleHelp as HelpCircle, LogOut, Shield } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [admission, setAdmission] = useState<any | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch admission data - get the most recent admission
      const admissionData = await AdmissionService.getUserAdmissions(user.id);

      if (admissionData && admissionData.length > 0) {
        setAdmission(admissionData[0]);
      }

      // Fetch payment history
      const paymentData = await PaymentService.getUserPayments(user.id);

      if (paymentData) {
        setPaymentHistory(paymentData);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <User size={32} color="#2563EB" />
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Shield size={16} color="#FFFFFF" />
            <Text style={styles.adminText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Profile Information */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>{user?.full_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mobile Number</Text>
          <Text style={styles.infoValue}>{user?.mobile_number}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {formatDate(user?.createdAt || '')}
          </Text>
        </View>
      </Card>

      {/* Admission Details */}
      {admission && (
        <Card style={styles.admissionCard}>
          <Text style={styles.sectionTitle}>Admission Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Course</Text>
            <Text style={styles.infoValue}>{admission.courseName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{admission.duration} months</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shifts</Text>
            <Text style={styles.infoValue}>
              {admission.selectedShifts.join(', ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[
              styles.infoValue,
              { color: admission.paymentStatus === 'paid' ? '#10B981' : '#F59E0B' }
            ]}>
              {admission.paymentStatus === 'paid' ? 'Active' : 'Pending Payment'}
            </Text>
          </View>
          {admission.startDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoValue}>
                {formatDate(admission.startDate)}
              </Text>
            </View>
          )}
          {admission.endDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>End Date</Text>
              <Text style={styles.infoValue}>
                {formatDate(admission.endDate)}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {paymentHistory.map((payment) => (
            <View key={payment.id} style={styles.paymentItem}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
                <Text style={styles.paymentDate}>
                  {formatDate(payment.paymentDate)}
                </Text>
              </View>
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentDetail}>
                  Duration: {payment.durationMonths} months
                </Text>
                <Text style={styles.paymentDetail}>
                  Mode: {payment.paymentMode.toUpperCase()}
                </Text>
                <Text style={styles.paymentDetail}>
                  Receipt: {payment.receiptNumber}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsList}>
          <Button
            onPress={() => {/* Navigate to help */}}
            variant="outline"
            style={styles.actionButton}
          >
            <View style={styles.actionContent}>
              <HelpCircle size={20} color="#2563EB" />
              <Text style={styles.actionText}>Help & Support</Text>
            </View>
          </Button>
          
          {user?.role === 'admin' && (
            <Button
              onPress={() => router.push('/admin')}
              variant="outline"
              style={styles.actionButton}
            >
              <View style={styles.actionContent}>
                <Shield size={20} color="#2563EB" />
                <Text style={styles.actionText}>Admin Panel</Text>
              </View>
            </Button>
          )}
        </View>
      </Card>

      {/* Sign Out */}
      <Card style={styles.signOutCard}>
        <Button
          onPress={handleSignOut}
          variant="danger"
          style={styles.signOutButton}
        >
          <View style={styles.actionContent}>
            <LogOut size={20} color="#FFFFFF" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </Button>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  admissionCard: {
    margin: 16,
  },
  paymentCard: {
    margin: 16,
  },
  paymentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  paymentDate: {
    fontSize: 14,
    color: '#64748B',
  },
  paymentDetails: {
    gap: 4,
  },
  paymentDetail: {
    fontSize: 12,
    color: '#64748B',
  },
  actionsCard: {
    margin: 16,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  signOutCard: {
    margin: 16,
    marginBottom: 32,
  },
  signOutButton: {
    width: '100%',
  },
  signOutText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});