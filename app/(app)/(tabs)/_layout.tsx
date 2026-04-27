import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Text,
  View
} from 'react-native';

const AnimatedIconWrapper = ({ focused, iconName, color, label, isMain }: { focused: boolean, iconName: any, color: string, label: string, isMain?: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  const size = isMain ? 68 : 72;

  return (
    <Animated.View
      style={{
        width: isMain ? 75 : 85,
        height: isMain ? 75 : 60,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
        ...(isMain && { marginTop: -35 })
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 100, // Large value ensures perfect circle
          backgroundColor: isMain ? '#FFFFFF' : (focused ? '#F1F5F9' : 'transparent'),
          alignItems: 'center',
          justifyContent: 'center',
          ...(isMain && {
            // Standard shadow/elevation for center buttons
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: focused ? 0.25 : 0.12,
            shadowRadius: 12,
            elevation: focused ? 12 : 6,
            borderWidth: 2,
            borderColor: focused ? '#F1F5F9' : '#FFFFFF',
          })
        }}
      >
        <Ionicons
          name={iconName}
          size={isMain ? (focused ? 32 : 28) : (focused ? 24 : 22)}
          color={color}
        />
        {(!isMain || focused) && (
          <Text
            style={{
              fontSize: isMain ? 8 : 10,
              marginTop: 1,
              color: color,
              fontWeight: 'bold',
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

function TabsContainer() {
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs
        initialRouteName="index"
        backBehavior="initialRoute"
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
            let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'flash-outline';
            let label = '⚡ Try';

            if (route.name === 'index') {
              iconName = focused ? 'flash' : 'flash-outline';
              label = 'Try & Buy';
            } else if (route.name === 'explore') {
              iconName = focused ? 'compass' : 'compass-outline';
              label = 'Explore';
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
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <AnimatedIconWrapper
                  focused={focused}
                  iconName={iconName}
                  color={color}
                  label={label}
                  isMain={route.name === 'index'}
                />
              </View>
            );
          },
        })}
      >
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="categories" />
        <Tabs.Screen name="index" />
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
