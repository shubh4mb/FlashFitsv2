import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Image, ViewStyle } from 'react-native';

interface LoaderProps {
  size?: number;
  style?: ViewStyle;
}

const Loader = ({ size = 40, style }: LoaderProps) => {
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rotation
    const animation = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    
    animation.start();

    return () => animation.stop();
  }, [rotationAnim]);

  // Continuous rotation mapped from 0-1 to degrees
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={{
          transform: [{ rotate: rotation }],
        }}
      >
        <Image
          source={require('../../assets/images/logo/scrollUpLoader.png')}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Loader;
