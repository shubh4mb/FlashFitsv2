import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import PhoneLogin from '@/components/auth/PhoneLogin';

export default function LoginScreen() {
  const router = useRouter();
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(app)/(tabs)');
      return true;
    });

    return () => backHandler.remove();
  }, [router]);

  return <PhoneLogin />;
}
