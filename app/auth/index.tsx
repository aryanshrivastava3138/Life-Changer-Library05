import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BookOpen } from 'lucide-react-native';

export default function AuthHomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BookOpen size={64} color="#2563EB" />
        <Text style={styles.title}>Life Changer Library</Text>
        <Text style={styles.subtitle}>Your gateway to knowledge and success</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Login"
          onPress={() => router.push('/auth/login')}
          style={styles.button}
        />
        <Button
          title="Register"
          onPress={() => router.push('/auth/register')}
          variant="outline"
          style={styles.button}
        />
      </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    width: '100%',
  },
});