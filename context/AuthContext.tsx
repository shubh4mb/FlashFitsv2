import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { updateAuthToken } from '../api/axiosConfig';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasSeenOnboarding: boolean;
    signIn: (token: string, userId: string, isNewUser?: boolean) => Promise<void>;
    signOut: () => Promise<void>;
    completeOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);

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
      
        // Optional: Listen for unauthorized events to trigger logout
        // DeviceEventEmitter.addListener('auth_unauthorized', signOut);
        // return () => { DeviceEventEmitter.removeAllListeners('auth_unauthorized') };
    }, []);

    const signIn = async (token: string, userId: string, isNewUser?: boolean) => {
        try {
            await SecureStore.setItemAsync('token', token);
            await SecureStore.setItemAsync('userId', userId);

            if (isNewUser) {
                setHasSeenOnboarding(false);
                await SecureStore.setItemAsync('hasSeenOnboarding', 'false');
            }

            updateAuthToken(token);
            setIsAuthenticated(true);

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
