import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import OtpInputComponent from '../../components/auth/OtpInput';

export default function OtpVerificationScreen() {
  const { phone, email, mode } = useLocalSearchParams<{
    phone?: string;
    email?: string;
    mode?: 'phone' | 'email';
  }>();

  return (
    <OtpInputComponent
      phone={phone || ''}
      email={email || ''}
      mode={mode || (email ? 'email' : 'phone')}
    />
  );
}
