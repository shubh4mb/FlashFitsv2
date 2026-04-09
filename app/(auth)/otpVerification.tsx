import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import OtpInputComponent from '../../components/auth/OtpInput';

export default function OtpVerificationScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  return <OtpInputComponent phone={phone || ''} />;
}
