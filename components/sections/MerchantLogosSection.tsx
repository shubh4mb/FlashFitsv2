import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchMerchants } from '@/api/merchants';
import { ThemedText } from '@/components/common/themed-text';
import { GenderThemes, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import Skeleton from '../common/Skeleton';

const MerchantLogosSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={100} height={20} />
      <Skeleton width={60} height={16} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.merchantCard}>
          <Skeleton width={72} height={72} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width={60} height={12} />
        </View>
      ))}
    </ScrollView>
  </View>
);

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
  genderCategory: string[];
}

export default function MerchantLogosSection({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchants();
  }, [refreshKey]);

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
    }
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

  if (loading) {
    return <MerchantLogosSkeleton />;
  }

  if (filteredMerchants.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Brands</ThemedText>
        <TouchableOpacity onPress={() => router.push('/stores')}>
          <Text style={[styles.viewAll, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredMerchants.map((merchant) => (
          <TouchableOpacity 
            key={merchant._id} 
            style={styles.merchantCard}
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
              />
            </View>
            <Text style={styles.shopName} numberOfLines={1}>
              {merchant.shopName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  viewAll: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingBottom: 8,
  },
  merchantCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  logoContainer: {
    margin:4,
    width: 72,
    height: 72,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  logo: {
    width: '85%',
    height: '85%',
  },
  shopName: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#334155',
    textAlign: 'center',
  },
});
