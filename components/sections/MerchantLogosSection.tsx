import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchMerchants } from '@/api/merchants';
import { ThemedText } from '@/components/common/themed-text';
import { GenderThemes } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
  genderCategory: string[];
  rating?: number;
}

export default function MerchantLogosSection() {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const response = await fetchMerchants();
      console.log('Merchants API response:', response);
      
      // AxiosConfig unwraps the response data if success=true
      const merchantsList = response?.merchants || response?.data?.merchants || [];
      setMerchants(merchantsList);
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = useMemo(() => {
    // Backend enums for Merchants are 'Men', 'Women', 'Kids', 'Unisex'
    return merchants.filter(m => 
      m.genderCategory && (
        m.genderCategory.includes(selectedGender) || 
        m.genderCategory.includes('Unisex') ||
        m.genderCategory.some(g => g.toUpperCase() === selectedGender.toUpperCase())
      )
    );
  }, [merchants, selectedGender]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (filteredMerchants.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Official Stores</ThemedText>
        <TouchableOpacity>
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
    marginVertical: 16,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  merchantCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderRightColor: '#F1F5F9',
    // Premium floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  shopName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
});
