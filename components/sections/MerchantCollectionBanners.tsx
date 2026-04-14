import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useOffers } from '../../context/OffersContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  merchantId: string;
  theme: any;
}

export default function MerchantCollectionBanners({ merchantId, theme }: Props) {
  const { promotionalBanners } = useOffers();
  const router = useRouter();

  // Filter banners that link to collections
  // Ideally, we'd also check if the merchant has products in this collection,
  // but for now we'll show banners and let the click handle empty results if any.
  const collectionBanners = promotionalBanners.filter(b => b.conditions?.collectionId);

  if (collectionBanners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={SCREEN_WIDTH - 60}
        decelerationRate="fast"
      >
        {collectionBanners.map((banner) => (
          <TouchableOpacity
            key={banner._id}
            activeOpacity={0.9}
            onPress={() => {
              router.push({
                pathname: '/(app)/search-results',
                params: { 
                  collectionId: banner.conditions.collectionId,
                  selectedStores: [merchantId],
                  title: `${banner.title} in Store`
                }
              });
            }}
            style={styles.bannerCard}
          >
            <Image
              source={{ uri: banner.bannerImage?.url }}
              style={styles.bannerImage}
              contentFit="cover"
            />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <View style={[styles.shopNowBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.shopNowText}>Shop the Collection</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  bannerCard: {
    width: SCREEN_WIDTH - 80,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  shopNowBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
