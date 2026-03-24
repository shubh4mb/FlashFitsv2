import React from 'react';
import OnboardingSwiper from '../../components/auth/OnboardingSwiper';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingScreen() {
    const { completeOnboarding } = useAuth();

    return <OnboardingSwiper onComplete={completeOnboarding} />;
}
