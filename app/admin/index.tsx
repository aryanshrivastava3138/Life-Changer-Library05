import { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Shield, ArrowRight } from 'lucide-react-native';

export default function AdminIndexScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        Alert.alert(
          'Access Denied',
          'Please login to access the admin panel.',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
        return;
      }

      if (user.role !== 'admin') {
        Alert.alert(
          'Access Denied',
          'You do not have admin privileges.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      // If user is admin, redirect to dashboard
      router.replace('/admin/dashboard');
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.accessCard}>
        <Shield size={64} color="#2563EB" style={styles.icon} />
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>
          Checking your admin privileges...
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  accessCard: {
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
});