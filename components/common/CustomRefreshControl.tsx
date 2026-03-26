import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Image } from 'react-native';

interface CustomRefreshControlProps {
  scrollY: Animated.Value;
  refreshing: boolean;
  onRefresh: () => void;
  threshold?: number;
}

const CustomRefreshControl = ({
  scrollY,
  refreshing,
  onRefresh,
  threshold = 70
}: CustomRefreshControlProps) => {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    isRefreshingRef.current = refreshing;
    if (refreshing) {
      // Continuous rotation during refreshing
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotationAnim.stopAnimation();
      rotationAnim.setValue(0);
    }
  }, [refreshing, rotationAnim]);

  // Map scroll position to rotation when pulling
  const pullRotation = scrollY.interpolate({
    inputRange: [-threshold, 0],
    outputRange: ['360deg', '0deg'],
    extrapolate: 'clamp',
  });

  // Opacity of the loader
  const opacity = scrollY.interpolate({
    inputRange: [-threshold, -threshold / 3, 0],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  // Scale of the loader
  const scale = scrollY.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  // Continuous rotation mapped from 0-1 to degrees
  const activeRotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const finalRotation = refreshing ? activeRotation : pullRotation;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [
            { translateY: scrollY.interpolate({
                inputRange: [-threshold, 0],
                outputRange: [threshold / 2, 0],
                extrapolate: 'clamp',
              }) 
            },
            { scale },
            { rotate: finalRotation }
          ],
        },
      ]}
    >
      <Image
        source={require('../../assets/images/logo/scrollUpLoader.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    zIndex: 1001,
    elevation: 1001,
  },
  image: {
    width: 40,
    height: 40,
  },
});

export default CustomRefreshControl;
