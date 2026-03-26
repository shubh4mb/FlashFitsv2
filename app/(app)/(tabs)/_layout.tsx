import AddressSelectionModal from '@/components/modals/AddressSelectionModal';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Text,
  View,
} from 'react-native';
import { getAddresses } from '../../../api/address';
import { checkDeliveryAvailability } from '../../../api/auth';
import { useAddress } from '../../../context/AddressContext';
import { isWithinRange } from '../../../utils/locationHelper';

const AnimatedIconWrapper = ({ focused, iconName, color, label }: { focused: boolean, iconName: any, color: string, label: string }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.2 : 1,
        useNativeDriver: false,
      }),
      Animated.timing(bgAnim, {
        toValue: focused ? 1 : 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#F1F5F9'],
  });

  return (
    <Animated.View
      style={{
        backgroundColor,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        width: 55,
        height: 55,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Ionicons name={iconName} size={focused ? 25 : 22} color={color} />
      <Text
        style={{
          fontSize: focused ? 6 : 10,
          marginTop: 2,
          color: color, // Use the active/inactive tint color instead of hardcoded
          fontWeight: focused ? 'bold' : 'normal',
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
};

function TabsContainer() {
  const { setAddresses, setSelectedAddress, selectedAddress, registerModal } = useAddress();
  const addressModalRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    registerModal(addressModalRef);
  }, []);

  useEffect(() => {
    const initLocation = async () => {
      try {
        // 1. Check for token
        const token = await SecureStore.getItemAsync('token');
        if (!token) {
          setIsInitializing(false);
          return;
        }

        // 2. Request Location Permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied');
          // Still fetch addresses even if location is denied
          const res = await getAddresses();
          setAddresses(res?.addresses || []);
          setIsInitializing(false);
          return;
        }

        // 3. Get Current Position
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // 4. Check Availability (Optional but good for UX)
        await checkDeliveryAvailability(latitude, longitude);

        // 5. Fetch Saved Addresses
        const res = await getAddresses();
        const userAddresses = res?.addresses || [];
        setAddresses(userAddresses);

        // 6. Geofencing check (200m)
        const isAnyInRange = userAddresses.some((addr: any) => {
          if (!addr.location?.coordinates) return false;
          return isWithinRange(
            latitude,
            longitude,
            addr.location.coordinates[1],
            addr.location.coordinates[0],
            200
          );
        });

        // 7. Restore or Auto-select Address
        const saved = await SecureStore.getItemAsync('selectedAddress');
        const isDismissed = await SecureStore.getItemAsync('addressModalDismissed');

        if (isDismissed === 'true') {
          setIsInitializing(false);
          return;
        }

        if (!isAnyInRange) {
          // User is out of range of ALL saved addresses
          setTimeout(() => {
            addressModalRef.current?.open();
          }, 500);
        } else if (saved) {
          // Address restored via Context, do nothing
        } else if (userAddresses.length > 0) {
          setSelectedAddress(userAddresses[0]);
        } else {
          // No saved addresses, open modal
          setTimeout(() => {
            addressModalRef.current?.open();
          }, 500);
        }

      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initLocation();
  }, []);

  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: 'none',
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            height: Platform.OS === 'ios' ? 85 : 90,
            backgroundColor: 'transparent',
            paddingTop: 22, // Increased to move icons down
            borderRadius: 30,
            paddingBottom: Platform.OS === 'ios' ? 18 : 10, // Reduced bottom space
            elevation: 4, // Reduced elevation for better blending
            shadowColor: '#000',
            shadowOpacity: 0.08, // Subtle shadow for a seamless feel
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -3 },
          },
          tabBarBackground: () => {
            return (
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']} // Solid White
                style={{
                  flex: 1,
                  overflow: 'hidden',
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            );
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.primary,
          tabBarIcon: ({ color, focused }) => {
            let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home-outline';
            let label = 'Home';

            if (route.name === 'index') {
              iconName = focused ? 'home' : 'home-outline';
              label = 'Home';
            } else if (route.name === 'categories') {
              iconName = focused ? 'grid' : 'grid-outline';
              label = 'Categories';
            } else if (route.name === 'stores') {
              iconName = focused ? 'storefront' : 'storefront-outline';
              label = 'Stores';
            } else if (route.name === 'wishlist') {
              iconName = focused ? 'heart' : 'heart-outline';
              label = 'Wishlist';
            }

            return (
              <View style={{ opacity: focused ? 1 : 0.6 }}>
                <AnimatedIconWrapper
                  focused={focused}
                  iconName={iconName}
                  color={color}
                  label={label}
                />
              </View>
            );
          },
        })}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="categories" />
        <Tabs.Screen name="stores" />
        <Tabs.Screen name="wishlist" />
      </Tabs>
      <AddressSelectionModal
        ref={addressModalRef}
        onDismiss={async () => {
          await SecureStore.setItemAsync('addressModalDismissed', 'true');
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <TabsContainer />
  );
}
