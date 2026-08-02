import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface SwipeToBuyProps {
  onSwipeComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  themeColor?: string;
  resetKey?: any;
}

export default function SwipeToBuy({
  onSwipeComplete,
  disabled = false,
  loading = false,
  text = 'Swipe to Place Try & Buy Order',
  themeColor = '#0F172A',
  resetKey,
}: SwipeToBuyProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const panX = useRef(new Animated.Value(0)).current;
  const isCompletedRef = useRef(false);

  const HANDLE_SIZE = 42;
  const PADDING = 3;
  const maxTranslateX = Math.max(0, containerWidth - HANDLE_SIZE - PADDING * 2);

  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);
  const maxTranslateXRef = useRef(maxTranslateX);

  useEffect(() => {
    disabledRef.current = disabled;
    loadingRef.current = loading;
    maxTranslateXRef.current = maxTranslateX;
  }, [disabled, loading, maxTranslateX]);

  // Reset slider whenever resetKey changes
  const resetSlider = () => {
    isCompletedRef.current = false;
    Animated.spring(panX, {
      toValue: 0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    resetSlider();
  }, [resetKey, disabled]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current && !loadingRef.current && !isCompletedRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabledRef.current && !loadingRef.current && !isCompletedRef.current && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        const maxTrans = maxTranslateXRef.current;
        if (maxTrans <= 0 || isCompletedRef.current) return;
        const dx = Math.max(0, Math.min(gestureState.dx, maxTrans));
        panX.setValue(dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxTrans = maxTranslateXRef.current;
        if (maxTrans <= 0 || isCompletedRef.current) return;
        if (gestureState.dx >= maxTrans * 0.7) {
          isCompletedRef.current = true;
          Animated.timing(panX, {
            toValue: maxTrans,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            onSwipeComplete();
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isCompletedRef.current) {
          Animated.spring(panX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const textOpacity = panX.interpolate({
    inputRange: [0, Math.max(1, maxTranslateX * 0.6)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        { backgroundColor: disabled ? '#F1F5F9' : themeColor + '15', borderColor: disabled ? '#CBD5E1' : themeColor + '40' },
      ]}
    >
      {/* Background Text */}
      <Animated.View style={[styles.textContainer, { opacity: disabled ? 0.6 : textOpacity }]}>
        <Text style={[styles.text, { color: disabled ? '#94A3B8' : themeColor }]}>
          {disabled ? 'Store Unavailable' : text}
        </Text>
        {!disabled && !loading && (
          <View style={styles.chevrons}>
            <Feather name="chevrons-right" size={18} color={themeColor} />
          </View>
        )}
      </Animated.View>

      {/* Swipe Thumb Handle */}
      <Animated.View
        style={[
          styles.handle,
          {
            backgroundColor: disabled ? '#CBD5E1' : themeColor,
            transform: [{ translateX: panX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : disabled ? (
          <Ionicons name="lock-closed" size={20} color="#fff" />
        ) : (
          <Feather name="arrow-right" size={22} color="#fff" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    padding: 3,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 30,
    paddingRight: 10,
    gap: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  chevrons: {
    marginLeft: 2,
  },
  handle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});
