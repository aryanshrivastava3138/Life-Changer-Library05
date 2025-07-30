import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react-native';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!fullName || !email || !mobileNumber || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signUp(email.trim(), password, fullName.trim(), mobileNumber.trim());
    
    if (result.error) {
      setError(result.error);
    } else {
      router.replace('/admission');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Life Changer Library today</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Development helper */}
          {__DEV__ && (
            <View style={styles.devHelper}>
              <Text style={styles.devHelperTitle}>Development Info:</Text>
              <Text style={styles.devHelperText}>
                Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </Text>
              <Text style={styles.devHelperText}>
                Supabase Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </Text>
            </View>
          )}

          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            required
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <Input
            label="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            required
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            required
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            required
          />

          <Button
            title={loading ? 'Creating Account...' : 'Create Account'}
            onPress={handleRegister}
            disabled={loading}
            style={styles.registerButton}
          />

          <Button
            title="Already have an account? Sign In"
            onPress={() => router.push('/auth/login')}
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
  registerButton: {
    marginBottom: 16,
  },
  devHelper: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  devHelperTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  devHelperText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});