import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Root Index Component
 * 
 * This component acts as the primary redirector for the application.
 * It determines whether to send the user to the Authentication flow
 * or the main Application group based on their auth state.
 */
export default function Index() {
  const { isAuthenticated, isLoading, hasSeenOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)');
    } else if (!hasSeenOnboarding) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasSeenOnboarding]);

  return null;
}
