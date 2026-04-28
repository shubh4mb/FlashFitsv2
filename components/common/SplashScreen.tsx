import { Typography } from '@/constants/theme';
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
  withRepeat,
  withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_ASSETS = [
  require('@/assets/splashScreenAssests/24.png'),
  require('@/assets/splashScreenAssests/25.png'),
  require('@/assets/splashScreenAssests/26.png'),
  require('@/assets/splashScreenAssests/27.png'),
  require('@/assets/splashScreenAssests/28.png'),
  require('@/assets/splashScreenAssests/29.png'),
  require('@/assets/splashScreenAssests/30.png'),
  require('@/assets/splashScreenAssests/31.png'),
  require('@/assets/splashScreenAssests/32.png'),
  require('@/assets/splashScreenAssests/33.png'),
  require('@/assets/splashScreenAssests/34.png'),
];

const FloatingAsset = ({ source, index }: { source: any; index: number }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Avoid overlap using sector-based distribution and alternating radius levels
  const sectorAngle = (Math.PI * 2) / SPLASH_ASSETS.length;
  const angle = (index * sectorAngle) + (Math.random() - 0.5) * (sectorAngle * 0.5);

  const radiusLevel = index % 2 === 0 ? 0.45 : 0.75; // Alternate between inner and outer zones
  const targetRadiusX = (width / 2) * (radiusLevel + Math.random() * 0.2);
  const targetRadiusY = (height / 2) * (radiusLevel + Math.random() * 0.2);

  const targetX = Math.cos(angle) * targetRadiusX;
  const targetY = Math.sin(angle) * targetRadiusY;
  const targetScale = 0.3 + Math.random() * 0.35;
  const targetRotation = (Math.random() - 0.5) * 60;

  useEffect(() => {
    // Firework burst timing - hyper velocity
    const delay = 600;

    // Near-instantaneous explosive burst to sides
    x.value = withDelay(delay, withTiming(targetX, { duration: 250, easing: Easing.out(Easing.expo) }));
    y.value = withDelay(delay, withTiming(targetY, { duration: 250, easing: Easing.out(Easing.expo) }));
    scale.value = withDelay(delay, withTiming(targetScale, { duration: 250, easing: Easing.out(Easing.back(1)) }));
    opacity.value = withDelay(delay, withTiming(0.8, { duration: 150 }));
    rotation.value = withDelay(delay, withTiming(targetRotation, { duration: 250 }));

    // Rapid floating oscillation after the burst
    const floatDuration = 1500 + Math.random() * 1000;
    const floatDelay = delay + 250;

    x.value = withDelay(floatDelay, withRepeat(withTiming(targetX + (Math.random() - 0.5) * 50, { duration: floatDuration }), -1, true));
    y.value = withDelay(floatDelay, withRepeat(withTiming(targetY + (Math.random() - 0.5) * 50, { duration: floatDuration }), -1, true));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image
        source={source}
        style={{ width: 120, height: 120 }}
        contentFit="contain"
        priority="high"
      />
    </Animated.View>
  );
};

export default function CustomSplashScreen({ onFinish }: SplashScreenProps) {

  // Animation shared values
  const containerScale = useSharedValue(0.95);
  const containerOpacity = useSharedValue(0);
  const containerY = useSharedValue(50);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);

  const shineTranslateX = useSharedValue(-100);

  const taglineOpacity = useSharedValue(0);
  const taglineScale = useSharedValue(0.95);

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
  }));

  const mainWrapperStyle = useAnimatedStyle(() => ({
    opacity: mainExitOpacity.value,
  }));

  return (
    <Animated.View style={[styles.fullScreen, mainWrapperStyle]}>
      {/* Vertical Hero Splash Container */}
      <Animated.View style={[styles.mockupContainer, containerStyle]}>
        <View style={styles.contentWrapper}>
          {/* Logo Reveal Section */}
          <View style={styles.logoSection}>
            {/* Floating Background Assets */}
            {SPLASH_ASSETS.map((asset, index) => (
              <FloatingAsset key={index} source={asset} index={index} />
            ))}

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
                  colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                  style={styles.shineGradient}
                />
              </Animated.View>
            </Animated.View>
            {/* Tagline Reveal */}
            <Animated.View style={[styles.taglineWrapper, taglineStyle]}>
              <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
              <Text style={styles.subTaglineText}>TRY & BUY</Text>
            </Animated.View>
          </View>


        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
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
    height: 100,
    width: 280,
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
  reflectionWrapper: {
    marginTop: -4,
    height: 64,
    opacity: 0.05,
    transform: [{ scaleY: -1 }],
  },
  reflectionLogo: {
    height: 64,
    width: 200,
  },
  taglineWrapper: {
    alignItems: 'center',
  },
  taglineText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#000000ff',
    letterSpacing: 2.5,
    marginTop: 4,
    opacity: 0.2,
    // textShadowColor: 'rgba(209, 213, 219, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  subTaglineText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#000000ff',
    letterSpacing: 4,
    marginTop: 8,
    opacity: 0.4,
    textAlign: 'center',
  },
});
