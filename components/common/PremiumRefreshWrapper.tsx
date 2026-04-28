import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, Animated, Platform, RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import CustomRefreshControl from './CustomRefreshControl';

interface PremiumRefreshWrapperProps {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  scrollY: Animated.Value;
  threshold?: number;
}

const PremiumRefreshWrapper = ({
  children,
  refreshing,
  onRefresh,
  scrollY,
  threshold = 80
}: PremiumRefreshWrapperProps) => {
  const panY = useRef(new Animated.Value(0)).current;
  const isAtTop = useRef(true);

  // Combine scroll offset and pan gesture for a unified "pull" value
  // On Android, scrollY is 0 during pull, so panY takes over
  // On iOS, scrollY goes negative, so we use that primarily
  const pullDistance = Animated.add(
    Animated.multiply(scrollY, -1),
    panY
  );

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
      // Trigger refresh if pulled far enough
      if (event.nativeEvent.translationY > threshold && !refreshing && isAtTop.current) {
        onRefresh();
      }
      // Reset pan value
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0
      }).start();
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        isAtTop.current = event.nativeEvent.contentOffset.y <= 0;
      }
    }
  );

  return (
    <View style={styles.container}>
      <CustomRefreshControl
        scrollY={pullDistance.interpolate({
           inputRange: [0, threshold],
           outputRange: [0, -threshold],
           extrapolate: 'clamp'
        })}
        refreshing={refreshing}
        onRefresh={onRefresh}
        threshold={threshold}
      />
      
      <PanGestureHandler
        onGestureEvent={Platform.OS === 'android' ? onGestureEvent : undefined}
        onHandlerStateChange={Platform.OS === 'android' ? onHandlerStateChange : undefined}
        activeOffsetY={[0, 10]}
        failOffsetY={[-10, 0]}
        enabled={isAtTop.current && !refreshing}
      >
        <Animated.View style={styles.container}>
          {React.cloneElement(children as React.ReactElement, {
            onScroll: handleScroll,
            scrollEventThrottle: 16,
            // Keep native RefreshControl as a fallback/trigger
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="transparent"
                colors={['transparent']}
              />
            )
          })}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PremiumRefreshWrapper;
