import MainHeader from '@/components/layout/MainHeader';
import MerchantLogosSection from '@/components/sections/MerchantLogosSection';
import NewArrivalsSection from '@/components/sections/NewArrivalsSection';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import SubCategorySection from '@/components/sections/SubCategorySection';
import { useAuth } from '@/context/AuthContext';
import { Typography } from '@/constants/theme';
import React, { useState } from 'react';
import { 
  Animated, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  Image,
} from 'react-native';
import logo from '@/assets/images/logo/logo.png';
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

          <View style={styles.footer}>
            <Image source={logo} style={styles.footerLogo} resizeMode="contain" />
            <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
            <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  taglineText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
    opacity: 0.6,
    textShadowColor: 'rgba(209, 213, 219, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  footerLogo: {
    width: 140,
    height: 60,
    opacity: 0.25,
  },
});
