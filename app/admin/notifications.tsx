import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserService, NotificationService, AdminLogService } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Send, Users, User as UserIcon, Bell } from 'lucide-react-native';

export default function AdminNotificationsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  // Redirect if not admin
  if (user?.role !== 'admin') {
    router.replace('/admin');
    return null;
  }

  useEffect(() => {
    fetchStudents();
  }, []);

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

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both title and message');
      return;
    }

    if (!sendToAll && selectedStudents.length === 0) {
      Alert.alert('Error', 'Please select at least one student or choose "Send to All"');
      return;
    }

    setSending(true);

    try {
      const targetStudents = sendToAll ? students.map(s => s.id) : selectedStudents;
      
      // Create notifications for selected students
      const notifications = targetStudents.map(studentId => ({
        userId: studentId,
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        createdBy: user?.id,
      }));

      // Create notifications in batch
      await Promise.all(notifications.map(notification => 
        NotificationService.createNotification(notification)
      ));

      // Log admin action
      await AdminLogService.createLog({
          adminId: user?.id,
          action: 'send_notification',
          details: {
            title: title.trim(),
            message: message.trim(),
            type: notificationType,
            recipientCount: targetStudents.length,
            sendToAll: sendToAll
          }
        });

      Alert.alert(
        'Success',
        `Notification sent to ${targetStudents.length} student${targetStudents.length > 1 ? 's' : ''}!`
      );

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedStudents([]);
      setSendToAll(false);
      setNotificationType('info');

    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Button
          onPress={() => router.back()}
          variant="outline"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#2563EB" />
        </Button>
        <Text style={styles.title}>Send Notifications</Text>
        <Text style={styles.subtitle}>Send custom messages to students</Text>
      </View>

      {/* Notification Form */}
      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Compose Notification</Text>

        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter notification title"
          required
        />

        <Input
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Enter notification message"
          multiline
          numberOfLines={4}
          required
        />

        {/* Notification Type */}
        <Text style={styles.fieldLabel}>Notification Type</Text>
        <View style={styles.typeButtons}>
          {[
            { key: 'info', label: 'Info', color: '#2563EB' },
            { key: 'success', label: 'Success', color: '#10B981' },
            { key: 'warning', label: 'Warning', color: '#F59E0B' },
            { key: 'error', label: 'Error', color: '#EF4444' }
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeButton,
                notificationType === type.key && { backgroundColor: type.color }
              ]}
              onPress={() => setNotificationType(type.key as any)}
            >
              <Text style={[
                styles.typeButtonText,
                notificationType === type.key && styles.typeButtonTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Recipients */}
      <Card style={styles.recipientsCard}>
        <Text style={styles.sectionTitle}>Recipients</Text>

        <TouchableOpacity
          style={[
            styles.sendToAllOption,
            sendToAll && styles.sendToAllOptionSelected
          ]}
          onPress={() => setSendToAll(!sendToAll)}
        >
          <Users size={24} color={sendToAll ? '#FFFFFF' : '#2563EB'} />
          <Text style={[
            styles.sendToAllText,
            sendToAll && styles.sendToAllTextSelected
          ]}>
            Send to All Students ({students.length})
          </Text>
        </TouchableOpacity>

        {!sendToAll && (
          <>
            <Text style={styles.selectStudentsText}>
              Or select individual students ({selectedStudents.length} selected):
            </Text>
            
            <View style={styles.studentsList}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentItem,
                    selectedStudents.includes(student.id) && styles.studentItemSelected
                  ]}
                  onPress={() => toggleStudentSelection(student.id)}
                >
                  <UserIcon size={20} color={
                    selectedStudents.includes(student.id) ? '#FFFFFF' : '#64748B'
                  } />
                  <View style={styles.studentInfo}>
                    <Text style={[
                      styles.studentName,
                      selectedStudents.includes(student.id) && styles.studentNameSelected
                    ]}>
                      {student.fullName}
                    </Text>
                    <Text style={[
                      styles.studentEmail,
                      selectedStudents.includes(student.id) && styles.studentEmailSelected
                    ]}>
                      {student.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* Send Button */}
      <Card style={styles.sendCard}>
        <Button
          title={sending ? 'Sending...' : 'Send Notification'}
          onPress={handleSendNotification}
          disabled={sending}
          style={styles.sendButton}
        >
          <View style={styles.sendButtonContent}>
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>
              {sending ? 'Sending...' : 'Send Notification'}
            </Text>
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
  formCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  recipientsCard: {
    margin: 16,
  },
  sendToAllOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 16,
  },
  sendToAllOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sendToAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },
  sendToAllTextSelected: {
    color: '#FFFFFF',
  },
  selectStudentsText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  studentsList: {
    gap: 8,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  studentItemSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  studentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  studentNameSelected: {
    color: '#FFFFFF',
  },
  studentEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  studentEmailSelected: {
    color: '#FFFFFF',
  },
  sendCard: {
    margin: 16,
    marginBottom: 32,
  },
  sendButton: {
    width: '100%',
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});