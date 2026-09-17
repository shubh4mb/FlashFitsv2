import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { updateAuthToken } from '../api/axiosConfig';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface UserData {
    name?: string;
    email?: string;
    phoneNumber?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasSeenOnboarding: boolean;
    signIn: (token: string, userId: string, refreshToken?: string, isNewUser?: boolean, userData?: UserData) => Promise<void>;
    signOut: () => Promise<void>;
    completeOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);

    // Setup Push Notifications
    const { expoPushToken, sendPushTokenToBackend } = usePushNotifications();

    // Auto-send token if user is already authenticated on boot and token is ready
    useEffect(() => {
        if (isAuthenticated && expoPushToken) {
            sendPushTokenToBackend(expoPushToken);
        }
    }, [isAuthenticated, expoPushToken]);

    useEffect(() => {
        const loadToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('token');
                const seenOnboardingStr = await SecureStore.getItemAsync('hasSeenOnboarding');
                const seenOnboarding = seenOnboardingStr === 'true';

                setHasSeenOnboarding(seenOnboarding);

                if (token) {
                    updateAuthToken(token);
                    setIsAuthenticated(true);
                } else {
                    updateAuthToken(null);
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Failed to load auth state', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadToken();
    }, []);

    const signIn = async (token: string, userId: string, refreshToken?: string, isNewUser?: boolean, userData?: UserData) => {
        try {
            await SecureStore.setItemAsync('token', token);
            await SecureStore.setItemAsync('userId', userId);
            
            if (refreshToken) {
                await SecureStore.setItemAsync('refreshToken', refreshToken);
            }

            if (userData?.email) {
                await SecureStore.setItemAsync('userEmail', userData.email);
            }
            if (userData?.name) {
                await SecureStore.setItemAsync('userName', userData.name);
            }
            if (userData?.phoneNumber) {
                await SecureStore.setItemAsync('phoneNumber', userData.phoneNumber);
            }

            if (isNewUser) {
                setHasSeenOnboarding(false);
                await SecureStore.setItemAsync('hasSeenOnboarding', 'false');
            } else {
                setHasSeenOnboarding(true);
                await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
            }

            updateAuthToken(token);
            setIsAuthenticated(true);

            if (expoPushToken) {
                sendPushTokenToBackend(expoPushToken);
            }

            setTimeout(() => {
                if (isNewUser) {
                    router.replace('/(auth)/onboarding');
                } else {
                    router.replace('/(app)/(tabs)');
                }
            }, 0);
        } catch (error) {
            console.error('Failed to sign in', error);
        }
    };

    const completeOnboarding = async () => {
        try {
            await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
            setHasSeenOnboarding(true);
            router.replace('/(app)/(tabs)');
        } catch (error) {
            console.error('Failed to complete onboarding', error);
            router.replace('/(app)/(tabs)');
        }
    };

    const signOut = async () => {
        try {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('userId');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userEmail');
            await SecureStore.deleteItemAsync('userName');
            await SecureStore.deleteItemAsync('phoneNumber');
            
            // Clean up Google session if active
            try {
                const { GoogleSignin } = require('@react-native-google-signin/google-signin');
                const { GOOGLE_AUTH_CONFIG } = require('../config/auth');
                GoogleSignin.configure(GOOGLE_AUTH_CONFIG);
                if (await GoogleSignin.isSignedIn()) {
                    await GoogleSignin.signOut();
                }
            } catch (err) {
                console.log('Google Sign-In signOut error:', err);
            }

            updateAuthToken(null);
            setIsAuthenticated(false);

            setTimeout(() => {
                router.replace('/(auth)');
            }, 0);
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, hasSeenOnboarding, signIn, signOut, completeOnboarding }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
