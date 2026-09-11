import { BrandColors, GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import ActiveOrderBanner from '@/components/common/ActiveOrderBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Animated,
  Platform,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const AnimatedIconWrapper = ({
  focused,
  iconName,
  color,
  label,
  isMain,
  isSmallScreen,
}: {
  focused: boolean;
  iconName: any;
  color: string;
  label: string;
  isMain?: boolean;
  isSmallScreen?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.06 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  if (isMain) {
    const size = isSmallScreen ? 58 : 62;
    return (
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
          marginTop: isSmallScreen ? -20 : -24,
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <Ionicons
          name={iconName}
          size={focused ? (isSmallScreen ? 25 : 27) : (isSmallScreen ? 22 : 24)}
          color={color}
        />
        <Text
          allowFontScaling={false}
          style={{
            fontSize: focused ? (isSmallScreen ? 7.5 : 8) : (isSmallScreen ? 7 : 7.5),
            marginTop: 1,
            color: color,
            fontWeight: 'bold',
            textAlign: 'center',
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
        paddingVertical: 2,
        overflow: 'visible',
      }}
    >
      <Ionicons
        name={iconName}
        size={focused ? (isSmallScreen ? 22 : 23) : (isSmallScreen ? 20 : 21)}
        color={color}
      />
      <Text
        allowFontScaling={false}
        style={{
          fontSize: isSmallScreen ? 9.5 : 10,
          marginTop: 2,
          color: color,
          fontWeight: focused ? '700' : '500',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Animated.View>
  );
};

function TabsContainer() {
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 360;

  // Responsive bottom padding adapting to Android gestures / 3-button and iOS home bar
  const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 14 : 10);
  const contentHeight = Platform.OS === 'ios' ? 52 : 54;
  const tabHeight = contentHeight + bottomPadding;

  return (
    <View style={{ flex: 1, backgroundColor: BrandColors.offWhite }}>
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
            bottom: 0,
            left: 0,
            right: 0,
            height: tabHeight,
            backgroundColor: 'transparent',
            paddingTop: 6,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: bottomPadding,
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -3 },
            borderTopWidth: 0,
          },
          tabBarItemStyle: {
            flex: 1,
            paddingHorizontal: 0,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'visible',
          },
          tabBarBackground: () => {
            return (
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']} // Solid White
                style={{
                  flex: 1,
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  overflow: 'hidden',
                  borderTopWidth: 1,
                  borderColor: '#F1F5F9',
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            );
          },
          tabBarActiveTintColor: BrandColors.matteBlack,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarIcon: ({ color, focused }) => {
            let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'flash-outline';
            let label = '⚡ Try';

            if (route.name === 'index') {
              iconName = focused ? 'flash' : 'flash-outline';
              label = 'Try & Buy';
            } else if (route.name === 'flashmart') {
              iconName = focused ? 'cube' : 'cube-outline';
              label = 'FlashMart';
            } else if (route.name === 'explore') {
              iconName = focused ? 'compass' : 'compass-outline';
              label = 'Explore';
            } else if (route.name === 'categories') {
              iconName = focused ? 'grid' : 'grid-outline';
              label = 'Categories';
            } else if (route.name === 'stores') {
              iconName = focused ? 'storefront' : 'storefront-outline';
              label = 'Stores';
            }

            return (
              <View style={{ width: 80, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                <AnimatedIconWrapper
                  focused={focused}
                  iconName={iconName}
                  color={color}
                  label={label}
                  isMain={route.name === 'index'}
                  isSmallScreen={isSmallScreen}
                />
              </View>
            );
          },
        })}
      >
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="flashmart" />
        <Tabs.Screen name="index" />
        <Tabs.Screen name="stores" />
        <Tabs.Screen name="categories" />
      </Tabs>
      <ActiveOrderBanner />
    </View>
  );
}

export default function TabLayout() {
  return (
    <TabsContainer />
  );
}
