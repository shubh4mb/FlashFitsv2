import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import OtpInputComponent from '../../components/auth/OtpInput';

export default function OtpVerificationScreen() {
  const { phone, token, userId, isNewUser } = useLocalSearchParams<{ 
    phone: string, 
    token: string, 
    userId: string,
    isNewUser: string 
  }>();

  return <OtpInputComponent 
    phone={phone || ''} 
    preFetchedToken={token} 
    preFetchedUserId={userId} 
    isNewUser={isNewUser === "true"} 
  />;
}
