import { fetchMerchants } from '@/api/merchants';
import { ThemedText } from '@/components/common/themed-text';
import { GenderThemes, Typography, SectionHeaderStyles } from '@/constants/theme';
import { useAddress, distanceInMeters } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Skeleton from '../common/Skeleton';
import CompactStoreCard from '@/components/common/CompactStoreCard';
import { Ionicons } from '@expo/vector-icons';

const MerchantLogosSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={100} height={20} />
      <Skeleton width={60} height={16} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.compactCard}>
          <Skeleton width="100%" height={60} borderRadius={0} />
          <View style={styles.compactInfo}>
            <View style={{ position: 'absolute', top: -18, left: 8 }}>
              <Skeleton width={36} height={36} borderRadius={8} />
            </View>
            <View style={{ marginTop: 20 }}>
              <Skeleton width={80} height={12} style={{ marginBottom: 6 }} />
              <Skeleton width={50} height={10} />
            </View>
          </View>
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
  backgroundImage?: {
    url: string;
  };
  genderCategory: string[];
  shipsWithinHours: number;
  isOnline: boolean;
  isNearby: boolean;
  isWarehouse?: boolean;
  rating?: number;
  address?: {
    location?: {
      coordinates: number[]; // [lng, lat]
    };
    city?: string;
    area?: string;
  };
}

export default function MerchantLogosSection({
  refreshKey = 0,
  initialMerchants
}: {
  refreshKey?: number;
  initialMerchants?: Merchant[];
}) {
  const router = useRouter();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [merchants, setMerchants] = useState<Merchant[]>(initialMerchants || []);
  const [loading, setLoading] = useState(!initialMerchants);

  useEffect(() => {
    if (initialMerchants && initialMerchants.length > 0) {
      setMerchants(initialMerchants);
      setLoading(false);
    } else {
      loadMerchants();
    }
  }, [refreshKey, userLocation, selectedAddress, initialMerchants]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
      const response = await fetchMerchants(lat, lng, selectedGender, true); // strict=true
      const merchantsList = response?.merchants || response?.data?.merchants || [];
      setMerchants(merchantsList);
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = useMemo(() => {
    return merchants;
  }, [merchants]);

  const userLat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
  const userLng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

  const getDistanceStr = (merchant: Merchant) => {
    const mCoords = merchant.address?.location?.coordinates;
    if (!mCoords || !userLat || !userLng) return null;
    const dist = distanceInMeters(userLat, userLng, mCoords[1], mCoords[0]);
    if (dist > 10000) return null; // Only show if under 10 km
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    }
    return `${(dist / 1000).toFixed(1)} km`;
  };

  if (loading) {
    return <MerchantLogosSkeleton />;
  }

  if (filteredMerchants.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stores near you</Text>
        <TouchableOpacity onPress={() => router.push('/stores')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={140 + 12} // card width + margin
      >
        {filteredMerchants.map((merchant) => {
          const distanceStr = getDistanceStr(merchant);
          
          return (
            <View key={merchant._id}>
              <CompactStoreCard
                merchant={merchant}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/merchant/[id]', params: { id: merchant._id, fromExplore: 'false', isWarehouse: merchant.isWarehouse ? 'true' : 'false' } } as any);
                }}
                subInfoText={distanceStr}
                subInfoIcon="location-outline"
              />
            </View>
          );
        })}
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
    marginBottom: 16,
  },
  title: SectionHeaderStyles.title,
  viewAll: SectionHeaderStyles.viewAll,
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 4,
    paddingBottom: 8,
  },
  compactCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  compactInfo: {
    padding: 8,
    paddingTop: 22,
    position: 'relative',
  },
});
