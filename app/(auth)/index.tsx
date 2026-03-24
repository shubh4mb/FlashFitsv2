import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import PhoneLogin from '@/components/auth/PhoneLogin';

export default function LoginScreen() {
  // Prevent Android back button from navigating back to tabs after logout
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  return <PhoneLogin />;
}
