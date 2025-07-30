import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AttendanceService } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatTime } from '@/utils/dateUtils';
import { 
  isCurrentTimeInShift, 
  getValidShiftsForCurrentTime, 
  formatShiftTime,
  getCurrentTimeString 
} from '@/utils/shiftTimeUtils';
import { 
  isShiftEnded, 
  formatAbsentMessage, 
  getAbsentStatusColor,
  shouldMarkAbsent 
} from '@/utils/attendanceUtils';
import { Clock, Check as CheckIn, Check as CheckOut, Calendar, TriangleAlert as AlertTriangle, X as XIcon } from 'lucide-react-native';

interface AttendanceStatus {
  shift: string;
  status: 'present' | 'absent' | 'pending';
  checkInTime?: string;
  checkOutTime?: string;
  message?: string;
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());

  const today = new Date().toISOString().split('T')[0];
  const availableShifts = ['morning', 'noon', 'evening', 'night']; // All shifts available for approved users

  useEffect(() => {
    fetchData();
    
    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
      // Also check for absent status updates
      if (admission) {
        updateAttendanceStatus();
      }
    }, 60000);

    return () => clearInterval(timeInterval);
  }, [user]);

  useEffect(() => {
    if (admission && todayAttendance) {
      updateAttendanceStatus();
    }
  }, [admission, todayAttendance]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch today's attendance
      const todayData = await AttendanceService.getUserAttendance(user.id, today);

      if (todayData) {
        setTodayAttendance(todayData);
      }

      // Fetch recent attendance (last 7 days) including absent records
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentData = await AttendanceService.getUserAttendance(user.id);
      const filteredRecentData = recentData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= sevenDaysAgo;
      });

      if (filteredRecentData) {
        setRecentAttendance(filteredRecentData);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendanceStatus = () => {
    const statusArray: AttendanceStatus[] = availableShifts.map(shift => {
      const shiftAttendance = todayAttendance.find(record => record.shift === shift);
      const hasCheckedIn = shiftAttendance && shiftAttendance.checkInTime;
      const isCompleted = shiftAttendance && shiftAttendance.checkInTime && shiftAttendance.checkOutTime;
      
      if (isCompleted) {
        return {
          shift,
          status: 'present',
          checkInTime: shiftAttendance.checkInTime!,
          checkOutTime: shiftAttendance.checkOutTime!
        };
      } else if (hasCheckedIn) {
        return {
          shift,
          status: 'present',
          checkInTime: shiftAttendance.checkInTime!
        };
      } else if (shouldMarkAbsent(shift, !!hasCheckedIn)) {
        return {
          shift,
          status: 'absent',
          message: formatAbsentMessage(shift)
        };
      } else {
        return {
          shift,
          status: 'pending'
        };
      }
    });

    setAttendanceStatus(statusArray);
  };

  const handleCheckIn = async (shift: string) => {
    if (!user) return;

    // Check if current time is within the shift time range
    if (!isCurrentTimeInShift(shift)) {
      Alert.alert(
        'Invalid Time',
        `You can only mark attendance during your assigned shift time (${formatShiftTime(shift)}).`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if already checked in for this shift today
    const existingCheckIn = todayAttendance.find(
      record => record.shift === shift && record.checkInTime && !record.checkOutTime
    );

    if (existingCheckIn) {
      Alert.alert('Already Checked In', 'You are already checked in for this shift.');
      return;
    }

    // Check if already completed this shift today
    const completedShift = todayAttendance.find(
      record => record.shift === shift && record.checkInTime && record.checkOutTime
    );

    if (completedShift) {
      Alert.alert('Shift Completed', 'You have already completed this shift today.');
      return;
    }

    setCheckingIn(true);

    try {
      await AttendanceService.createAttendance({
          userId: user.id,
          shift,
          checkInTime: new Date().toISOString(),
          date: today,
        });

      await fetchData();
      Alert.alert('Success', `Checked in successfully for ${shift} shift!`);
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async (attendanceId: string, shift: string) => {
    if (!user) return;

    // Check if current time is within the shift time range
    if (!isCurrentTimeInShift(shift)) {
      Alert.alert(
        'Invalid Time',
        `You can only mark attendance during your assigned shift time (${formatShiftTime(shift)}).`,
        [{ text: 'OK' }]
      );
      return;
    }

    setCheckingOut(true);

    try {
      await AttendanceService.updateAttendance(attendanceId, {
          checkOutTime: new Date().toISOString(),
        });

      await fetchData();
      Alert.alert('Success', `Checked out successfully from ${shift} shift!`);
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', 'Failed to check out. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const getAttendanceStatusIcon = (record: any) => {
    if (record.status === 'absent') {
      return <XIcon size={16} color="#EF4444" />;
    } else if (record.checkInTime && record.checkOutTime) {
      return <CheckIn size={16} color="#10B981" />;
    } else if (record.checkInTime) {
      return <Clock size={16} color="#F59E0B" />;
    }
    return <Calendar size={16} color="#64748B" />;
  };

  const getAttendanceStatusText = (record: any) => {
    if (record.status === 'absent') {
      return 'ABSENT';
    } else if (record.checkInTime && record.checkOutTime) {
      return 'COMPLETED';
    } else if (record.checkInTime) {
      return 'CHECKED IN';
    }
    return 'PENDING';
  };

  const getAttendanceStatusColor = (record: any) => {
    if (record.status === 'absent') {
      return '#EF4444';
    } else if (record.checkInTime && record.checkOutTime) {
      return '#10B981';
    } else if (record.checkInTime) {
      return '#F59E0B';
    }
    return '#64748B';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user?.approval_status !== 'approved') {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageTitle}>Account Approval Required</Text>
          <Text style={styles.messageText}>
            Your account needs to be approved by an administrator before you can track attendance.
          </Text>
        </Card>
      </View>
    );
  }

  const validShifts = getValidShiftsForCurrentTime(availableShifts);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Track your library visits</Text>
        <View style={styles.timeContainer}>
          <Clock size={16} color="#64748B" />
          <Text style={styles.currentTime}>Current Time: {currentTime}</Text>
        </View>
      </View>

      {/* Time Validation Alert */}
      {validShifts.length === 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertContent}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={styles.alertText}>
              No shifts are currently active. You can only mark attendance during your assigned shift times.
            </Text>
          </View>
        </Card>
      )}

      {/* Today's Check-in/out */}
      <Card style={styles.todayCard}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</Text>

        <View style={styles.shiftsContainer}>
          {attendanceStatus.map((status) => {
            const shiftAttendance = todayAttendance.find(record => record.shift === status.shift);
            const isCheckedIn = shiftAttendance && shiftAttendance.checkInTime && !shiftAttendance.checkOutTime;
            const isCompleted = status.status === 'present' && status.checkOutTime;
            const isAbsent = status.status === 'absent';
            const isShiftActive = isCurrentTimeInShift(status.shift);

            return (
              <View key={status.shift} style={[
                styles.shiftAttendance,
                isAbsent && styles.shiftAbsent
              ]}>
                <View style={styles.shiftInfo}>
                  <View style={styles.shiftHeader}>
                    <Text style={[
                      styles.shiftName,
                      isAbsent && styles.shiftNameAbsent
                    ]}>
                      {status.shift.toUpperCase()}
                    </Text>
                    <View style={styles.shiftStatus}>
                      {isShiftActive && !isAbsent && (
                        <View style={styles.activeIndicator}>
                          <Text style={styles.activeText}>ACTIVE</Text>
                        </View>
                      )}
                      {isAbsent && (
                        <View style={styles.absentIndicator}>
                          <XIcon size={16} color="#FFFFFF" />
                          <Text style={styles.absentText}>ABSENT</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[
                    styles.shiftTime,
                    isAbsent && styles.shiftTimeAbsent
                  ]}>
                    {formatShiftTime(status.shift)}
                  </Text>
                  
                  {isAbsent ? (
                    <Text style={styles.absentMessage}>{status.message}</Text>
                  ) : (
                    <View style={styles.statusContainer}>
                      {isCompleted && (
                        <>
                          <Text style={styles.timeText}>
                            In: {formatTime(status.checkInTime!)}
                          </Text>
                          <Text style={styles.timeText}>
                            Out: {formatTime(status.checkOutTime!)}
                          </Text>
                        </>
                      )}
                      {isCheckedIn && (
                        <Text style={styles.timeText}>
                          In: {formatTime(status.checkInTime!)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {!isAbsent && !shiftAttendance && (
                    <Button
                      title="Check In"
                      onPress={() => handleCheckIn(status.shift)}
                      disabled={checkingIn || !isShiftActive}
                      size="small"
                      style={[
                        styles.actionButton,
                        !isShiftActive && styles.disabledButton
                      ]}
                    >
                      <View style={styles.buttonContent}>
                        <CheckIn size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Check In</Text>
                      </View>
                    </Button>
                  )}
                  {!isAbsent && isCheckedIn && (
                    <Button
                      title="Check Out"
                      onPress={() => handleCheckOut(shiftAttendance.id, status.shift)}
                      disabled={checkingOut || !isShiftActive}
                      variant="secondary"
                      size="small"
                      style={[
                        styles.actionButton,
                        !isShiftActive && styles.disabledButton
                      ]}
                    >
                      <View style={styles.buttonContent}>
                        <CheckOut size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Check Out</Text>
                      </View>
                    </Button>
                  )}
                  {!isAbsent && isCompleted && (
                    <View style={styles.completedStatus}>
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Shift Timings Reference */}
      <Card style={styles.timingsCard}>
        <Text style={styles.sectionTitle}>Shift Timings</Text>
        <View style={styles.timingsList}>
          {availableShifts.map((shift) => (
            <View key={shift} style={styles.timingItem}>
              <Text style={styles.timingShift}>{shift.toUpperCase()}</Text>
              <Text style={styles.timingTime}>{formatShiftTime(shift)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.timingNote}>
          ⚠️ You can only mark attendance during your assigned shift times.
        </Text>
        <Text style={styles.absentWarning}>
          ❌ Students who don't check in during shift time will be marked absent.
        </Text>
      </Card>

      {/* Recent Attendance History */}
      <Card style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Recent History</Text>
        {recentAttendance.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records found</Text>
        ) : (
          <View style={styles.historyList}>
            {recentAttendance.map((record) => (
              <View key={record.id} style={[
                styles.historyItem,
                record.status === 'absent' && styles.historyItemAbsent
              ]}>
                <View style={styles.historyHeader}>
                  {getAttendanceStatusIcon(record)}
                  <Text style={[
                    styles.historyDate,
                    record.status === 'absent' && styles.historyDateAbsent
                  ]}>
                    {new Date(record.date).toLocaleDateString('en-IN')}
                  </Text>
                  <Text style={[
                    styles.historyShift,
                    record.status === 'absent' && styles.historyShiftAbsent
                  ]}>
                    {record.shift.toUpperCase()}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getAttendanceStatusColor(record) }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {getAttendanceStatusText(record)}
                    </Text>
                  </View>
                </View>
                
                {record.status === 'absent' ? (
                  <View style={styles.absentDetails}>
                    <Text style={styles.absentReasonText}>
                      Reason: {record.reason === 'no_checkin' ? 'Did not check in during shift time' : record.reason}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyTimes}>
                    {record.checkInTime && (
                      <Text style={styles.historyTime}>
                        In: {formatTime(record.checkInTime)}
                      </Text>
                    )}
                    {record.checkOutTime && (
                      <Text style={styles.historyTime}>
                        Out: {formatTime(record.checkOutTime)}
                      </Text>
                    )}
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  currentTime: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  messageCard: {
    margin: 16,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  alertCard: {
    margin: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
    lineHeight: 20,
  },
  todayCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  shiftsContainer: {
    gap: 12,
  },
  shiftAttendance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  shiftAbsent: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  shiftNameAbsent: {
    color: '#DC2626',
  },
  shiftStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIndicator: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  absentIndicator: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  absentText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  shiftTime: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  shiftTimeAbsent: {
    color: '#DC2626',
  },
  absentMessage: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  completedStatus: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timingsCard: {
    margin: 16,
  },
  timingsList: {
    gap: 8,
    marginBottom: 12,
  },
  timingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  timingShift: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  timingTime: {
    fontSize: 14,
    color: '#64748B',
  },
  timingNote: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  absentWarning: {
    fontSize: 12,
    color: '#EF4444',
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '600',
  },
  historyCard: {
    margin: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyItemAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    flex: 1,
  },
  historyDateAbsent: {
    color: '#DC2626',
  },
  historyShift: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  historyShiftAbsent: {
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  historyTimes: {
    flexDirection: 'row',
    gap: 16,
  },
  historyTime: {
    fontSize: 12,
    color: '#64748B',
  },
  absentDetails: {
    marginTop: 4,
  },
  absentReasonText: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
  },
});