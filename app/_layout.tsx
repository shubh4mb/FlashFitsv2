import '../global.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, signOut } = useAuth();

  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('Unauthorized event received, signing out...');
      signOut();
    };
    const subscription = DeviceEventEmitter.addListener('auth_unauthorized', handleUnauthorized);
    return () => { subscription.remove(); };
  }, [signOut]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
        gestureEnabled: isAuthenticated,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}
