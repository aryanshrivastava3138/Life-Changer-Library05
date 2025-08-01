import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserService, NotificationService, AdminLogService, COLLECTIONS } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { ArrowLeft, Search, CircleCheck as CheckCircle, Clock, X as XIcon, UserCheck } from 'lucide-react-native';

export default function AdminStudentsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Redirect if not admin
  if (user?.role !== 'admin') {
    router.replace('/admin');
    return null;
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, filter]);

  const fetchStudents = async () => {
    try {
      const data = await UserService.getUsersByRole('student');
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.mobileNumber.includes(searchQuery)
      );
    }

    // Apply status filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(student => student.approvalStatus === 'pending');
        break;
      case 'approved':
        filtered = filtered.filter(student => student.approvalStatus === 'approved');
        break;
      case 'rejected':
        filtered = filtered.filter(student => student.approvalStatus === 'rejected');
        break;
    }

    setFilteredStudents(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
    setRefreshing(false);
  };

  const updateApprovalStatus = async (studentId: string, status: 'approved' | 'rejected') => {
    try {
      console.log(`Updating student ${studentId} status to ${status}`);
      
      // Update user approval status
      await UserService.updateUser(studentId, {
        approvalStatus: status,
        approvedBy: user?.id,
        approvedAt: new Date().toISOString()
      });

      // Log admin action
      await AdminLogService.createLog({
        adminId: user?.id || '',
        action: `${status}_student_account`,
        targetUserId: studentId,
        details: { approvalStatus: status }
      });

      // Send notification to student
      await NotificationService.createNotification({
        userId: studentId,
        title: `Account ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: status === 'approved' 
          ? 'Your account has been approved! You can now book seats and use library services.'
          : 'Your account application has been rejected. Please contact the library for more information.',
        type: status === 'approved' ? 'success' : 'error',
        createdBy: user?.id
      });

      Alert.alert('Success', `Student account ${status} successfully`);
      await fetchStudents();
    } catch (error) {
      console.error('Error updating approval status:', error);
      Alert.alert('Error', `Failed to ${status} student account. Please try again.`);
    }
  };

  const confirmApprovalAction = (student: any, action: 'approved' | 'rejected') => {
    Alert.alert(
      `${action === 'approved' ? 'Approve' : 'Reject'} Account`,
      `Are you sure you want to ${action === 'approved' ? 'approve' : 'reject'} ${student.fullName}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approved' ? 'Approve' : 'Reject',
          style: action === 'approved' ? 'default' : 'destructive',
          onPress: () => updateApprovalStatus(student.id, action)
        }
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} color="#FFFFFF" />;
      case 'rejected': return <XIcon size={16} color="#FFFFFF" />;
      case 'pending': return <Clock size={16} color="#FFFFFF" />;
      default: return <Clock size={16} color="#FFFFFF" />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
        <Text style={styles.title}>Student Management</Text>
        <Text style={styles.subtitle}>Approve or reject student accounts</Text>
      </View>

      {/* Search and Filters */}
      <Card style={styles.filtersCard}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search students..."
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterButtons}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' }
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                filter === filterOption.key && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption.key as any)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption.key && styles.filterButtonTextActive
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Students List */}
      <Card style={styles.studentsCard}>
        <Text style={styles.sectionTitle}>
          Students ({filteredStudents.length})
        </Text>

        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {filteredStudents.map((student) => (
              <View key={student.id} style={styles.studentItem}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.fullName}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    <Text style={styles.studentMobile}>{student.mobileNumber}</Text>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(student.approvalStatus) }
                    ]}>
                      {getStatusIcon(student.approvalStatus)}
                      <Text style={styles.statusText}>
                        {student.approvalStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.studentDetails}>
                  <Text style={styles.detailText}>
                    Registered: {formatDate(student.createdAt)}
                  </Text>
                  {student.approvedAt && (
                    <Text style={styles.detailText}>
                      {student.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}: {formatDate(student.approvedAt)}
                    </Text>
                  )}
                </View>

                {student.approvalStatus === 'pending' && (
                  <View style={styles.actionButtons}>
                    <Button
                      title="Approve"
                      onPress={() => confirmApprovalAction(student, 'approved')}
                      size="small"
                      style={styles.actionButton}
                    />
                    <Button
                      title="Reject"
                      onPress={() => confirmApprovalAction(student, 'rejected')}
                      size="small"
                      variant="danger"
                      style={styles.actionButton}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
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
  filtersCard: {
    margin: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  studentsCard: {
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
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  studentsList: {
    gap: 16,
  },
  studentItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  studentMobile: {
    fontSize: 14,
    color: '#64748B',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  studentDetails: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});
