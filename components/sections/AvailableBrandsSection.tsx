import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { useAddress } from '@/context/AddressContext';
import { fetchCourierProducts } from '@/api/products';
import { GenderThemes, Typography } from '@/constants/theme';

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
}

interface AvailableBrandsSectionProps {
  initialMerchants?: Merchant[];
  refreshKey?: number;
  hideExploreLink?: boolean;
}

export default function AvailableBrandsSection({ 
  initialMerchants, 
  refreshKey = 0,
  hideExploreLink = false
}: AvailableBrandsSectionProps) {
  const router = useRouter();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [merchants, setMerchants] = useState<Merchant[]>(initialMerchants || []);
  const [loading, setLoading] = useState(!initialMerchants);

  useEffect(() => {
    if (!initialMerchants || initialMerchants.length === 0 || refreshKey > 0) {
      loadCourierMerchants();
    }
  }, [refreshKey, selectedGender, selectedAddress, userLocation]);

  useEffect(() => {
    if (initialMerchants) {
      setMerchants(initialMerchants);
    }
  }, [initialMerchants]);

  const loadCourierMerchants = async () => {
    try {
      if (!initialMerchants) setLoading(true);
      
      const genderMap: Record<string, string> = { Men: 'MEN', Women: 'WOMEN', Kids: 'KIDS', All: 'MEN' };
      const apiGender = genderMap[selectedGender] || 'MEN';
      
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      const data = await fetchCourierProducts(apiGender, 1, lat, lng);
      setMerchants(data?.merchants || []);
    } catch (error) {
      console.error('Error loading courier merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !initialMerchants) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (merchants.length === 0) return null;

  return (
    <View style={styles.merchantsSection}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => router.push('/explore')}
        disabled={hideExploreLink}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.sectionTitle}>Explore Stores</Text>
        </View>
        {!hideExploreLink && (
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        )}
      </TouchableOpacity>
      <FlatList
        data={merchants}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.merchantsList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.merchantItem}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: item._id } } as any)}
          >
            <View style={styles.merchantLogoContainer}>
              <Image 
                source={{ uri: item.logo?.url }} 
                style={styles.merchantLogo} 
                contentFit="contain"
                transition={200}
              />
            </View>
            <Text style={styles.merchantName} numberOfLines={1}>{item.shopName}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  merchantsSection: {
    marginBottom: 24,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  merchantsList: {
    paddingRight: 16,
  },
  merchantItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 72,
  },
  merchantLogoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  merchantLogo: {
    width: '60%',
    height: '60%',
  },
  merchantName: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
    textAlign: 'center',
    width: '100%',
  },
});
