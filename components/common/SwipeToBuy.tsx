import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { BrandColors, Typography } from '@/constants/theme';
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
  themeColor = BrandColors.primary,
  resetKey,
}: SwipeToBuyProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const panX = useRef(new Animated.Value(0)).current;
  const isCompletedRef = useRef(false);

  const HANDLE_SIZE = 44;
  const PADDING = 4;
  const maxTranslateX = Math.max(0, containerWidth - HANDLE_SIZE - PADDING * 2);

  const onSwipeCompleteRef = useRef(onSwipeComplete);
  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);
  const maxTranslateXRef = useRef(maxTranslateX);

  useEffect(() => {
    onSwipeCompleteRef.current = onSwipeComplete;
    disabledRef.current = disabled;
    loadingRef.current = loading;
    maxTranslateXRef.current = maxTranslateX;
  }, [onSwipeComplete, disabled, loading, maxTranslateX]);

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
            onSwipeCompleteRef.current?.();
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

  const displayText = disabled ? 'Store Unavailable' : text;
  const hasDivider = displayText.includes('•');
  const textParts = hasDivider ? displayText.split('•') : [displayText];

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: disabled ? '#27272A' : BrandColors.matteBlack,
          borderColor: disabled ? '#3F3F46' : 'rgba(255,255,255,0.12)',
        },
      ]}
    >
      {/* Dynamic Swipe Glow Trail (Native Driver Compatible) */}
      {!disabled && containerWidth > 0 && (
        <Animated.View
          style={[
            styles.progressTrail,
            {
              width: containerWidth,
              left: -containerWidth + HANDLE_SIZE + PADDING * 2,
              backgroundColor: themeColor + '25',
              transform: [{ translateX: panX }],
            },
          ]}
        />
      )}

      {/* Background Text with Split Contrast */}
      <Animated.View style={[styles.textContainer, { opacity: disabled ? 0.6 : textOpacity }]}>
        {hasDivider ? (
          <View style={styles.textRow}>
            <Text style={[styles.textMain, { color: disabled ? '#71717A' : '#FFFFFF' }]}>
              {textParts[0].trim()}
            </Text>
            <Text style={styles.textDivider}>•</Text>
            <Text style={[styles.textAccent, { color: disabled ? '#71717A' : themeColor }]}>
              {textParts.slice(1).join('•').trim()}
            </Text>
          </View>
        ) : (
          <Text style={[styles.textMain, { color: disabled ? '#71717A' : '#FFFFFF' }]}>
            {displayText}
          </Text>
        )}

        {!disabled && !loading && (
          <View style={styles.chevrons}>
            <Feather name="chevrons-right" size={17} color={themeColor} />
          </View>
        )}
      </Animated.View>

      {/* Swipe Thumb Handle */}
      <Animated.View
        style={[
          styles.handle,
          {
            backgroundColor: disabled ? '#3F3F46' : themeColor,
            transform: [{ translateX: panX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {loading ? (
          <ActivityIndicator color={disabled ? '#A1A1AA' : '#121212'} size="small" />
        ) : disabled ? (
          <Ionicons name="lock-closed" size={18} color="#A1A1AA" />
        ) : (
          <Feather name="arrow-right" size={22} color="#121212" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  progressTrail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 26,
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 38,
    paddingRight: 12,
    gap: 4,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textMain: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.2,
  },
  textDivider: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#71717A',
    marginHorizontal: 4,
  },
  textAccent: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.2,
  },
  chevrons: {
    marginLeft: 3,
  },
  handle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

