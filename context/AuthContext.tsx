
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { updateAuthToken } from '../api/axiosConfig';
import { getUserProfile } from '../api/auth';
import { usePushNotifications } from '../hooks/usePushNotifications';

export interface UserData {
    name?: string;
    email?: string;
    phoneNumber?: string;
    profilePicture?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasSeenOnboarding: boolean;
    user: UserData | null;
    setUser: React.Dispatch<React.SetStateAction<UserData | null>>;
    refreshUserProfile: () => Promise<UserData | null>;
    signIn: (token: string, userId: string, refreshToken?: string, isNewUser?: boolean, userData?: UserData) => Promise<void>;
    signOut: () => Promise<void>;
    completeOnboarding: () => void;
    requestPushPermissions: () => Promise<string | undefined>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
    const [user, setUser] = useState<UserData | null>(null);

    // Setup Push Notifications
    const { expoPushToken, sendPushTokenToBackend, requestPushPermissions } = usePushNotifications();

    const refreshUserProfile = useCallback(async (): Promise<UserData | null> => {
        try {
            const res = await getUserProfile();
            const profile = res?.user || res?.data?.user || res?.data || res;
            if (profile && (profile.email || profile.name || profile.phoneNumber)) {
                const updatedUser: UserData = {
                    name: profile.name || undefined,
                    email: profile.email || undefined,
                    phoneNumber: profile.phoneNumber || undefined,
                    profilePicture: profile.profilePicture || undefined,
                };
                setUser(prev => ({ ...prev, ...updatedUser }));
                if (profile.name) await SecureStore.setItemAsync('userName', profile.name);
                if (profile.email) await SecureStore.setItemAsync('userEmail', profile.email);
                if (profile.phoneNumber) await SecureStore.setItemAsync('phoneNumber', profile.phoneNumber);
                return updatedUser;
            }
        } catch (e) {
            // Silently catch in case user is offline
        }
        return null;
    }, []);

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

                const [savedName, savedEmail, savedPhone] = await Promise.all([
                    SecureStore.getItemAsync('userName'),
                    SecureStore.getItemAsync('userEmail'),
                    SecureStore.getItemAsync('phoneNumber'),
                ]);

                if (savedName || savedEmail || savedPhone) {
                    setUser({
                        name: savedName || undefined,
                        email: savedEmail || undefined,
                        phoneNumber: savedPhone || undefined,
                    });
                }

                if (token) {
                    updateAuthToken(token);
                    setIsAuthenticated(true);
                    refreshUserProfile().catch(() => {});
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

    const signIn = useCallback(async (token: string, userId: string, refreshToken?: string, isNewUser?: boolean, userData?: UserData) => {
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

            if (userData) {
                setUser(userData);
            } else {
                const [savedName, savedEmail, savedPhone] = await Promise.all([
                    SecureStore.getItemAsync('userName'),
                    SecureStore.getItemAsync('userEmail'),
                    SecureStore.getItemAsync('phoneNumber'),
                ]);
                setUser({
                    name: savedName || undefined,
                    email: savedEmail || undefined,
                    phoneNumber: savedPhone || undefined,
                });
            }
            refreshUserProfile().catch(() => {});

            if (expoPushToken) {
                sendPushTokenToBackend(expoPushToken);
            } else {
                // Contextually request notifications upon successful sign-in
                requestPushPermissions().then(t => {
                    if (t) sendPushTokenToBackend(t);
                }).catch(() => {});
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
    }, [expoPushToken, refreshUserProfile, sendPushTokenToBackend]);

    const completeOnboarding = useCallback(async () => {
        try {
            await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
            setHasSeenOnboarding(true);
            router.replace('/(app)/(tabs)');
        } catch (error) {
            console.error('Failed to complete onboarding', error);
            router.replace('/(app)/(tabs)');
        }
    }, []);

    const signOut = useCallback(async () => {
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
            setUser(null);

            setTimeout(() => {
                router.replace('/(auth)');
            }, 0);
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    }, []);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        isLoading,
        hasSeenOnboarding,
        user,
        setUser,
        refreshUserProfile,
        signIn,
        signOut,
        completeOnboarding,
        requestPushPermissions,
    }), [
        isAuthenticated,
        isLoading,
        hasSeenOnboarding,
        user,
        refreshUserProfile,
        signIn,
        signOut,
        completeOnboarding,
        requestPushPermissions,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
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
