import { AddressProvider } from '@/context/AddressContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CourierCartProvider } from '@/context/CourierCartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { OffersProvider } from '@/context/OffersContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomSplashScreen from '@/components/common/SplashScreen';
import { useFonts as usePlayfair, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

import {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts as useManrope,
} from '@expo-google-fonts/manrope';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
  WorkSans_800ExtraBold,
  WorkSans_900Black,
  useFonts as useWorkSans,
} from '@expo-google-fonts/work-sans';

export default function RootLayout() {
  const [manropeLoaded] = useManrope({
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const [workSansLoaded] = useWorkSans({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    WorkSans_800ExtraBold,
    WorkSans_900Black,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_400Regular_Italic,
  });

  const [showCustomSplash, setShowCustomSplash] = React.useState(true);

  useEffect(() => {
    if (manropeLoaded && workSansLoaded && playfairLoaded) {
      // Hide the native splash screen as soon as our custom one is ready to take over
      SplashScreen.hideAsync();
    }
  }, [manropeLoaded, workSansLoaded, playfairLoaded]);

  if (!manropeLoaded || !workSansLoaded || !playfairLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AuthProvider>
        <AddressProvider>
          <WishlistProvider>
            <CartProvider>
              <CourierCartProvider>
                <OffersProvider>
                  <RootNavigator />
                  <StatusBar style="dark" />
                  {showCustomSplash && (
                    <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />
                  )}
                </OffersProvider>
              </CourierCartProvider>
            </CartProvider>
          </WishlistProvider>
        </AddressProvider>
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
      // The native splash is already hidden in RootLayout when fonts load.
      // We don't need to do anything here regarding SplashScreen.hideAsync()
      // because we are using a custom splash screen component.
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
