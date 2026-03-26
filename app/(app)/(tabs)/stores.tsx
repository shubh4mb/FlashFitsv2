import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchMerchants } from '@/api/merchants';
import MainHeader from '@/components/layout/MainHeader';
import { GenderThemes, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/common/themed-view';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 64) / 4; // 4 columns with padding and gap

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
  genderCategory: string[];
}

export default function StoresScreen() {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const response = await fetchMerchants();
      const merchantsList = response?.merchants || response?.data?.merchants || [];
      setMerchants(merchantsList);
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMerchants();
  };

  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => 
      m.genderCategory && (
        m.genderCategory.includes(selectedGender) || 
        m.genderCategory.includes('Unisex') ||
        m.genderCategory.some(g => g.toUpperCase() === selectedGender.toUpperCase())
      )
    );
  }, [merchants, selectedGender]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MainHeader onHeaderLayout={setHeaderHeight} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      >
        {headerHeight > 0 && <View style={{ height: headerHeight }} />}

        <View style={styles.content}>
          <Text style={styles.title}>All Brands</Text>
          
          <View style={styles.grid}>
            {filteredMerchants.map((merchant) => (
              <TouchableOpacity 
                key={merchant._id} 
                style={styles.merchantCard}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/merchant/[id]', params: { id: merchant._id } } as any);
                }}
              >
                <View style={styles.logoContainer}>
                  <Image
                    source={{ uri: merchant.logo.url }}
                    style={styles.logo}
                    contentFit="contain"
                    transition={300}
                  />
                </View>
                <Text style={styles.shopName} numberOfLines={1}>
                  {merchant.shopName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  merchantCard: {
    width: COLUMN_WIDTH,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH, // Make it a perfect square
    borderRadius: 2, // As requested: borderRadius 2 (curved)
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '65%',
    height: '65%',
  },
  shopName: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    textAlign: 'center',
  },
});
