import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserService, SeatBookingService, PaymentService } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, Calendar, CreditCard, TrendingUp, TriangleAlert as AlertTriangle, Settings, Bell, UserCheck, ChartBar as BarChart3, ArrowRight } from 'lucide-react-native';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalBookingsToday: number;
  pendingCashPayments: number;
  expiringSoon: number;
  shiftOccupancy: {
    [key: string]: {
      booked: number;
      total: number;
      percentage: number;
    };
  };
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not admin
  if (user?.role !== 'admin') {
    router.replace('/admin');
    return null;
  }

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all required data
      const [students, bookings, payments] = await Promise.all([
        UserService.getUsersByRole('student'),
        SeatBookingService.getBookingsByDate(new Date().toISOString().split('T')[0]),
        PaymentService.getPaymentsByStatus('pending')
      ]);

      // Calculate stats
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.approvalStatus === 'approved').length;
      const totalBookingsToday = bookings.length;
      const pendingCashPayments = payments.length;
      const expiringSoon = 0; // TODO: Calculate based on admission end dates

      // Calculate shift occupancy
      const shifts = ['morning', 'noon', 'evening', 'night'];
      const shiftOccupancy: any = {};
      
      shifts.forEach(shift => {
        const shiftBookings = bookings.filter(b => b.shift === shift && b.bookingStatus === 'booked');
        shiftOccupancy[shift] = {
          booked: shiftBookings.length,
          total: 50,
          percentage: Math.round((shiftBookings.length / 50) * 100)
        };
      });
      
      setStats({
        totalStudents,
        activeStudents,
        totalBookingsToday,
        pendingCashPayments,
        expiringSoon,
        shiftOccupancy
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const getOccupancyColor = (percentage: number): string => {
    if (percentage >= 80) return '#EF4444'; // Red
    if (percentage >= 60) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Life Changer Library Management</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Users size={32} color="#2563EB" />
          <Text style={styles.statNumber}>{stats?.totalStudents || 0}</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </Card>

        <Card style={styles.statCard}>
          <UserCheck size={32} color="#10B981" />
          <Text style={styles.statNumber}>{stats?.activeStudents || 0}</Text>
          <Text style={styles.statLabel}>Active Students</Text>
        </Card>

        <Card style={styles.statCard}>
          <Calendar size={32} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats?.totalBookingsToday || 0}</Text>
          <Text style={styles.statLabel}>Today's Bookings</Text>
        </Card>

        <Card style={styles.statCard}>
          <AlertTriangle size={32} color="#EF4444" />
          <Text style={styles.statNumber}>{stats?.pendingCashPayments || 0}</Text>
          <Text style={styles.statLabel}>Pending Payments</Text>
        </Card>
      </View>

      {/* Shift Occupancy */}
      <Card style={styles.occupancyCard}>
        <Text style={styles.sectionTitle}>Today's Shift Occupancy</Text>
        <View style={styles.shiftsContainer}>
          {stats?.shiftOccupancy ? Object.entries(stats.shiftOccupancy).map(([shift, data]) => (
            <View key={shift} style={styles.shiftOccupancy}>
              <View style={styles.shiftHeader}>
                <Text style={styles.shiftName}>{shift.toUpperCase()}</Text>
                <Text style={[
                  styles.occupancyPercentage,
                  { color: getOccupancyColor(data.percentage) }
                ]}>
                  {data.percentage}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${data.percentage}%`,
                      backgroundColor: getOccupancyColor(data.percentage)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.occupancyText}>
                {data.booked} / {data.total} seats
              </Text>
            </View>
          )) : (
            <Text style={styles.noDataText}>No booking data available</Text>
          )}
        </View>
      </Card>

      {/* Alerts */}
      {stats && stats.expiringSoon > 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={styles.alertTitle}>Expiring Subscriptions</Text>
          </View>
          <Text style={styles.alertText}>
            {stats.expiringSoon} student subscription{stats.expiringSoon > 1 ? 's' : ''} expiring within 7 days
          </Text>
          <Button
            title="View Details"
            onPress={() => router.push('/admin/students')}
            variant="outline"
            size="small"
            style={styles.alertButton}
          />
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/admin/students')}
          >
            <Users size={24} color="#2563EB" />
            <Text style={styles.actionText}>Manage Students</Text>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/admin/payments')}
          >
            <CreditCard size={24} color="#10B981" />
            <Text style={styles.actionText}>Cash Payments</Text>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/admin/notifications')}
          >
            <Bell size={24} color="#F59E0B" />
            <Text style={styles.actionText}>Send Notifications</Text>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          title="Back to Main App"
          onPress={() => router.replace('/(tabs)')}
          variant="outline"
          style={styles.navButton}
        />
      </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  occupancyCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  shiftsContainer: {
    gap: 16,
  },
  shiftOccupancy: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  occupancyPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  occupancyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  alertCard: {
    margin: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 12,
    lineHeight: 20,
  },
  alertButton: {
    alignSelf: 'flex-start',
  },
  actionsCard: {
    margin: 16,
  },
  actionGrid: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  navigation: {
    padding: 16,
    paddingBottom: 32,
  },
  navButton: {
    width: '100%',
  },
});