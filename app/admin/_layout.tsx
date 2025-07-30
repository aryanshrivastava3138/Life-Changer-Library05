import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="students" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}