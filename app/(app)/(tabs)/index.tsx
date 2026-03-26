import MainHeader from '@/components/layout/MainHeader';
import MerchantLogosSection from '@/components/sections/MerchantLogosSection';
import NewArrivalsSection from '@/components/sections/NewArrivalsSection';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import SubCategorySection from '@/components/sections/SubCategorySection';
import { useAuth } from '@/context/AuthContext';
import { Typography } from '@/constants/theme';
import React, { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    // Give it a small delay for the animation to look good
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  return (
    <View style={styles.container}>
      <MainHeader scrollY={scrollY} onHeaderLayout={setHeaderHeight} refreshKey={refreshKey} />

      <CustomRefreshControl 
        scrollY={scrollY} 
        refreshing={refreshing} 
        onRefresh={onRefresh} 
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {headerHeight > 0 && <View style={{ height: headerHeight }} />}
        {/* <SubCategorySection refreshKey={refreshKey} /> */}
        <MerchantLogosSection refreshKey={refreshKey} />
        <RecentlyViewedSection refreshKey={refreshKey} />
        <NewArrivalsSection refreshKey={refreshKey} />
        {/* <GenderHero /> */}

        <View style={{ padding: 20 }}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to FlashFits!</Text>
            <Text style={styles.welcomeSubTitle}>Your premium fashion destination</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => signOut()}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeContainer: {
    marginVertical: 24,
    alignItems: 'center', // This is wrong, should be alignItems: 'center'
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.serifBold,
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeSubTitle: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Typography.fontFamily.medium,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
});
