import React from 'react';
import { StyleSheet, View, Animated, RefreshControl } from 'react-native';
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

  const handleScroll = React.useMemo(() => {
    return Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    );
  }, [scrollY]);

  return (
    <View style={styles.container}>
      <CustomRefreshControl
        scrollY={scrollY}
        refreshing={refreshing}
        onRefresh={onRefresh}
        threshold={threshold}
      />

      {React.cloneElement(children as React.ReactElement<any>, {
        onScroll: handleScroll,
        scrollEventThrottle: 16,
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        )
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PremiumRefreshWrapper;
