import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Text,
  View,
} from 'react-native';

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
    </View>
  );
}

export default function TabLayout() {
  return (
    <TabsContainer />
  );
}
