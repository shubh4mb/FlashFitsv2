import { Stack } from 'expo-router';
import { GenderProvider } from '@/context/GenderContext';

export default function AppLayout() {
  return (
    <GenderProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search-results" options={{ headerShown: false }} />
      </Stack>
    </GenderProvider>
  );
}
