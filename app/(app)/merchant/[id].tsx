import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fetchMerchantById } from '@/api/merchants';
import ParallaxScrollView from '@/components/common/parallax-scroll-view';
import { ThemedText } from '@/components/common/themed-text';
import { useGender } from '@/context/GenderContext';
import { GenderThemes } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Merchant {
  _id: string;
  shopName: string;
  logo: { url: string };
  backgroundImage?: { url: string };
  rating: number;
  reviewCount: number;
  address: string;
  location?: {
    coordinates: [number, number]; // [lng, lat]
  };
  operatingHours: string;
  shopDescription?: string;
  genderCategory: string[];
  phoneNumber?: string;
}

import { useAddress } from '@/context/AddressContext';
import { calculateDistanceKm } from '@/utils/locationHelper';

export default function MerchantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedGender } = useGender();
  const { selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [merchant, setMerchant] = useState<any>(null); // Use any for inner objects or define strictly
  const [loading, setLoading] = useState(true);
  const [distanceInfo, setDistanceInfo] = useState<{km: string, mins: string} | null>(null);

  useEffect(() => {
    if (id) {
      loadMerchantDetails();
    }
  }, [id]);

  useEffect(() => {
    if (merchant && selectedAddress?.location?.coordinates) {
      const merchantCoords = merchant.address?.location?.coordinates;
      const userCoords = selectedAddress.location.coordinates;

      if (merchantCoords && userCoords) {
        const distKm = calculateDistanceKm(
          userCoords[1], // User Lat
          userCoords[0], // User Lng
          merchantCoords[1], // Merchant Lat
          merchantCoords[0]  // Merchant Lng
        );
        
        // Estimate time: 3 mins per km + 10 mins prep time
        const estMins = Math.round(distKm * 3 + 10);
        
        setDistanceInfo({
          km: distKm.toFixed(1),
          mins: `${estMins}-${estMins + 10}`
        });
      }
    }
  }, [merchant, selectedAddress]);

  const loadMerchantDetails = async () => {
    try {
      setLoading(true);
      const response = await fetchMerchantById(id);
      // AxiosConfig unwraps the { merchant: {...} } data
      setMerchant(response?.merchant || response?.data?.merchant);
    } catch (error) {
      console.error('Failed to load merchant details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={styles.errorContainer}>
        <Text>Merchant not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F8FAFC', dark: '#0F172A' }}
      headerImage={
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: merchant.backgroundImage?.url || merchant.logo.url }}
            style={styles.headerImage}
            contentFit="cover"
          />
          <View style={styles.overlay} />
          
          {/* Custom Back Button */}
          <TouchableOpacity 
            style={styles.headerBackButton}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.content}>
        {/* Floating Logo Card */}
        <View style={styles.logoCard}>
          <View style={styles.logoWrapper}>
            <Image
              source={{ uri: merchant.logo.url }}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <View style={styles.mainInfo}>
            <ThemedText type="title" style={styles.shopName}>{merchant.shopName}</ThemedText>
            <View style={styles.ratingRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFFFFF" />
                <Text style={styles.ratingText}>{merchant.rating || '4.5'}</Text>
              </View>
              <Text style={styles.reviewText}>({merchant.reviewCount || 0} reviews)</Text>
            </View>
            
            {distanceInfo && (
              <View style={styles.distanceRow}>
                <Ionicons name="bicycle" size={16} color={theme.primary} />
                <Text style={styles.distanceText}>{distanceInfo.km} km away · {distanceInfo.mins} mins</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagContainer}>
          {merchant.genderCategory?.map((gender: string) => (
            <View key={gender} style={[styles.tag, { borderColor: theme.primary + '40' }]}>
              <Text style={[styles.tagText, { color: theme.primary }]}>{gender}</Text>
            </View>
          ))}
          <View style={styles.statusBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Open Now</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <Text style={styles.description}>
            {merchant.shopDescription || `${merchant.shopName} is a premium merchant at FlashFits offering curated fashion collections for ${merchant.genderCategory?.join(' & ')}.`}
          </Text>
        </View>

        {/* Info Rows */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={20} color={theme.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Operating Hours</Text>
              <Text style={styles.infoValue}>
                {typeof merchant.operatingHours === 'string' 
                  ? merchant.operatingHours 
                  : merchant.operatingHours?.open && merchant.operatingHours?.close 
                    ? `${merchant.operatingHours.open} - ${merchant.operatingHours.close}`
                    : '10:00 AM - 09:00 PM'}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={20} color={theme.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {typeof merchant.address === 'string' 
                  ? merchant.address 
                  : merchant.address?.street 
                    ? `${merchant.address.street}${merchant.address.city ? `, ${merchant.address.city}` : ''}`
                    : 'HustleHub Tech Park, HSR Layout'}
              </Text>
            </View>
          </View>

          {merchant.phoneNumber && (
            <View style={styles.infoCard}>
              <Ionicons name="call-outline" size={20} color={theme.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Contact</Text>
                <Text style={styles.infoValue}>{merchant.phoneNumber}</Text>
              </View>
            </View>
          )}
        </View>

        {/* CTA Section */}
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
        >
          <Text style={styles.primaryButtonText}>View Store Collections</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  headerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -30,
  },
  logoCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -40,
    marginBottom: 20,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  mainInfo: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 4,
  },
  shopName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  statusText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'justify',
  },
  infoGrid: {
    gap: 16,
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    gap: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
