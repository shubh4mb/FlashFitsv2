import { BrandColors, Typography } from '@/constants/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const containerY = useSharedValue(0);
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.96);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);

  const shineTranslateX = useSharedValue(-250);

  const taglineOpacity = useSharedValue(0);
  const taglineScale = useSharedValue(0.9);

  const dotScale = useSharedValue(0);
  const mainExitOpacity = useSharedValue(1);

  const handleFinish = () => {
    if (onFinish) {
      onFinish();
    }
  };

  useEffect(() => {
    // Container entry
    containerY.value = withTiming(0, { duration: 800, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    containerOpacity.value = withTiming(1, { duration: 800 });
    containerScale.value = withTiming(1, { duration: 800 });

    // Logo reveal
    logoOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(400, withTiming(1, { duration: 600 }));

    // Shine sweep
    shineTranslateX.value = withDelay(1000, withTiming(300, { duration: 1000, easing: Easing.inOut(Easing.ease) }));

    // Tagline
    taglineOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    taglineScale.value = withDelay(1200, withTiming(1, { duration: 500 }));

    // Dot spring
    dotScale.value = withDelay(1800, withTiming(1, { duration: 400, easing: Easing.back(1.5) }));

    // Exit animation & trigger onFinish
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      mainExitOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(handleFinish)();
        }
      });
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [
      { translateY: containerY.value },
      { scale: containerScale.value },
    ],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineTranslateX.value }, { skewX: '-20deg' }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ scale: taglineScale.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  const mainWrapperStyle = useAnimatedStyle(() => ({
    opacity: mainExitOpacity.value,
  }));

  const [isExiting, setIsExiting] = React.useState(false);

  return (
    <Animated.View
      pointerEvents={isExiting ? 'none' : 'auto'}
      style={[styles.fullScreen, mainWrapperStyle]}
    >
      {/* Reference Image Signature Palette: Cyan, Sky Luminous, Electric Glow, & Deep Ocean */}
      {/* Layer 1: Primary Diagonal Fluid Flow matching the image background */}
      <LinearGradient
        colors={['#28DCF4', '#00C2E8', '#00A4C8', '#0088B8', '#046684']}
        locations={[0, 0.3, 0.58, 0.8, 1]}
        start={{ x: 0.05, y: 0.05 }}
        end={{ x: 0.95, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 2: Electric Cyan Luminescent Wash matching the glowing dial ring */}
      <LinearGradient
        colors={['rgba(0, 245, 255, 0.4)', 'transparent', 'rgba(4, 102, 132, 0.5)']}
        locations={[0, 0.52, 1]}
        start={{ x: 0.1, y: 0.15 }}
        end={{ x: 0.9, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Layer 3: Ambient Specular Sheen for silky seamless diffusion */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.22)', 'rgba(40, 220, 244, 0.25)', 'transparent', 'rgba(0, 136, 184, 0.35)']}
        locations={[0, 0.32, 0.7, 1]}
        start={{ x: 0, y: 0.85 }}
        end={{ x: 1, y: 0.15 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Vertical Hero Splash Container */}
      <Animated.View style={[styles.mockupContainer, containerStyle]}>
        <View style={styles.contentWrapper}>
          {/* Logo Reveal Section */}
          <View style={styles.logoSection}>

            <Animated.View style={[styles.logoWrapper, logoStyle]}>
              <Image
                source={require('@/assets/images/logo/logo.png')}
                style={styles.logo}
                contentFit="contain"
              />

              {/* Premium Shine Sweep */}
              <Animated.View style={[styles.shineContainer, shineStyle]}>
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
                  style={styles.shineGradient}
                />
              </Animated.View>
            </Animated.View>
            {/* Tagline Reveal */}
            <Animated.View style={[styles.taglineWrapper, taglineStyle]}>
              <Text style={styles.taglineText}>JUST MINUTES, JUST FASHION</Text>
              <Text style={styles.subTaglineText}>TRY & BUY</Text>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Loading Section Matching Design Mockup */}
      <Animated.View style={[styles.bottomLoader, dotStyle]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { opacity: 0.9 }]} />
          <View style={[styles.dot, { opacity: 0.6 }]} />
          <View style={[styles.dot, { opacity: 0.3 }]} />
        </View>
        <Text style={styles.loadingText}>Loading your style...</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  mockupContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoSection: {
    position: 'relative',
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  logo: {
    height: 110,
    width: 290,
  },
  shineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 60,
  },
  shineGradient: {
    flex: 1,
  },
  taglineWrapper: {
    alignItems: 'center',
  },
  taglineText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: BrandColors.matteBlack,
    letterSpacing: 2.5,
    marginTop: 6,
    textAlign: 'center',
  },
  subTaglineText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: BrandColors.matteBlack,
    letterSpacing: 3.5,
    marginTop: 6,
    opacity: 0.7,
    textAlign: 'center',
  },
  bottomLoader: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.matteBlack,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: BrandColors.matteBlack,
    letterSpacing: 0.2,
    opacity: 0.85,
  },
});
