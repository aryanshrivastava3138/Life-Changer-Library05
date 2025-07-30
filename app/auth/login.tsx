import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, User, Shield } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signIn(email.trim(), password);
    
    if (result.error) {
      setError(result.error);
    } else {
      // Check if user role matches selected role after successful login
      // The AuthContext will handle the actual role verification
      if (selectedRole === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Button
          onPress={() => router.back()}
          variant="outline"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#2563EB" />
        </Button>

        <Card style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Choose your login type and sign in</Text>

          {/* Role Selection */}
          <View style={styles.roleSelection}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                selectedRole === 'student' && styles.roleButtonSelected
              ]}
              onPress={() => setSelectedRole('student')}
            >
              <User size={24} color={selectedRole === 'student' ? '#FFFFFF' : '#2563EB'} />
              <Text style={[
                styles.roleButtonText,
                selectedRole === 'student' && styles.roleButtonTextSelected
              ]}>
                Student Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                selectedRole === 'admin' && styles.roleButtonSelected
              ]}
              onPress={() => setSelectedRole('admin')}
            >
              <Shield size={24} color={selectedRole === 'admin' ? '#FFFFFF' : '#2563EB'} />
              <Text style={[
                styles.roleButtonText,
                selectedRole === 'admin' && styles.roleButtonTextSelected
              ]}>
                Admin Login
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            required
          />

          <Button
            title={loading ? 'Signing In...' : `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Student'}`}
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginButton}
          />

          <Button
            title="Don't have an account? Register"
            onPress={() => router.push('/auth/register')}
            variant="outline"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  roleSelection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  roleButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: '#FFFFFF',
  },
  loginButton: {
    marginBottom: 16,
  },
});