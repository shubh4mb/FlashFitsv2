import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { updateAuthToken } from '../api/axiosConfig';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasSeenOnboarding: boolean;
    signIn: (token: string, userId: string, refreshToken?: string, isNewUser?: boolean) => Promise<void>;
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

    const signIn = async (token: string, userId: string, refreshToken?: string, isNewUser?: boolean) => {
        try {
            await SecureStore.setItemAsync('token', token);
            await SecureStore.setItemAsync('userId', userId);
            
            if (refreshToken) {
                await SecureStore.setItemAsync('refreshToken', refreshToken);
            }

            if (isNewUser) {
                setHasSeenOnboarding(false);
                await SecureStore.setItemAsync('hasSeenOnboarding', 'false');
            }

            updateAuthToken(token);
            setIsAuthenticated(true);

            if (expoPushToken) {
                sendPushTokenToBackend(expoPushToken);
            }

            setTimeout(() => {
                if (isNewUser || !hasSeenOnboarding) {
                    router.replace('/(auth)/onboarding');
                } else {
                    router.replace('/(tabs)');
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
