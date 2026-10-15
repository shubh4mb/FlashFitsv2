import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Typography, GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import ProductCard from '@/components/common/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedCollectionsSectionProps {
  collections: any[];
  fromExplore?: boolean;
  horizontalMargin?: number;
}

export default function FeaturedCollectionsSection({
  collections = [],
  fromExplore = false,
  horizontalMargin = 16,
}: FeaturedCollectionsSectionProps) {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const cardWidth = SCREEN_WIDTH - horizontalMargin * 2;
  const [activeCollectionIdx, setActiveCollectionIdx] = useState(0);
  const collectionScrollRef = useRef<ScrollView>(null);

  // Auto-scroll collection carousel when multiple collections exist
  useEffect(() => {
    if (collections.length <= 1) return;
    const timer = setInterval(() => {
      setActiveCollectionIdx((prev) => {
        const next = (prev + 1) % collections.length;
        collectionScrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [collections.length, cardWidth]);

  if (!collections || collections.length === 0) {
    return null;
  }

  const activeColl = collections[activeCollectionIdx] || collections[0];

  return (
    <View style={[styles.collectionContainer, { marginHorizontal: horizontalMargin }]}>
      {collections.length > 1 ? (
        <View>
          {/* Horizontal Carousel of Hero Drop Cards */}
          <ScrollView
            ref={collectionScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            onMomentumScrollEnd={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offset / cardWidth);
              if (idx >= 0 && idx < collections.length) {
                setActiveCollectionIdx(idx);
              }
            }}
          >
            {collections.map((coll, idx) => {
              const bgImg =
                coll.heroBanner?.imageUrl ||
                coll.banner?.imageUrl ||
                coll.bannerImage?.url ||
                coll.heroBannerImage?.url ||
                'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=80';

              return (
                <TouchableOpacity
                  key={`collection-card-${coll._id || coll.slug || idx}`}
                  activeOpacity={0.92}
                  style={[styles.collectionHeroCard, { width: cardWidth }]}
                  onPress={() => router.push(`/campaign/${coll.slug}` as any)}
                >
                  <Image
                    source={{ uri: bgImg }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 23, 42, 0.38)', 'rgba(15, 23, 42, 0.94)']}
                    locations={[0.1, 0.45, 0.95]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.collectionHeroContent}>
                    <View style={styles.collectionBadge}>
                      <Text style={styles.collectionBadgeText}>
                        {coll.badgeText || '🔥 CURATED DROP'}
                      </Text>
                    </View>
                    <Text style={styles.collectionHeroTitle} numberOfLines={1}>
                      {coll.name}
                    </Text>
                    <Text style={styles.collectionHeroSubtitle} numberOfLines={2}>
                      {coll.tagline || coll.description || 'Exclusive curated collection'}
                    </Text>
                    <View style={styles.collectionActionRow}>
                      <View style={styles.collectionActionBtn}>
                        <Text style={styles.collectionActionText}>Explore Drop</Text>
                        <Ionicons name="arrow-forward" size={13} color="#0F172A" />
                      </View>
                      {coll.products?.length > 0 && (
                        <Text style={styles.collectionProductCount}>
                          {coll.products.length}+ Styles
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Carousel Dot Indicators */}
          <View style={styles.carouselDotsRow}>
            {collections.map((coll, idx) => (
              <TouchableOpacity
                key={`dot-${coll._id || coll.slug || idx}`}
                onPress={() => {
                  collectionScrollRef.current?.scrollTo({
                    x: idx * cardWidth,
                    animated: true,
                  });
                  setActiveCollectionIdx(idx);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.carouselDot,
                  idx === activeCollectionIdx && [
                    styles.carouselDotActive,
                    { backgroundColor: theme.primary },
                  ],
                ]}
              />
            ))}
          </View>

          {/* Quick Collection Switcher Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collectionTabsContainer}
          >
            {collections.map((coll, idx) => {
              const isSelected = idx === activeCollectionIdx;
              return (
                <TouchableOpacity
                  key={`coll-tab-${coll._id || coll.slug || idx}`}
                  onPress={() => {
                    collectionScrollRef.current?.scrollTo({
                      x: idx * cardWidth,
                      animated: true,
                    });
                    setActiveCollectionIdx(idx);
                  }}
                  style={[
                    styles.collectionTabChip,
                    isSelected && [
                      styles.collectionTabChipActive,
                      { backgroundColor: theme.primary },
                    ],
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.collectionTabText,
                      isSelected && styles.collectionTabTextActive,
                    ]}
                  >
                    {coll.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        /* Single Collection Card */
        (() => {
          const coll = collections[0];
          const bgImg =
            coll.heroBanner?.imageUrl ||
            coll.banner?.imageUrl ||
            coll.bannerImage?.url ||
            coll.heroBannerImage?.url ||
            'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=80';
          return (
            <TouchableOpacity
              activeOpacity={0.92}
              style={[styles.collectionHeroCard, { width: cardWidth }]}
              onPress={() => router.push(`/campaign/${coll.slug}` as any)}
            >
              <Image
                source={{ uri: bgImg }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
              <LinearGradient
                colors={['transparent', 'rgba(15, 23, 42, 0.38)', 'rgba(15, 23, 42, 0.94)']}
                locations={[0.1, 0.45, 0.95]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.collectionHeroContent}>
                <View style={styles.collectionBadge}>
                  <Text style={styles.collectionBadgeText}>{coll.badgeText || '🔥 CURATED DROP'}</Text>
                </View>
                <Text style={styles.collectionHeroTitle} numberOfLines={1}>{coll.name}</Text>
                <Text style={styles.collectionHeroSubtitle} numberOfLines={2}>
                  {coll.tagline || coll.description || 'Exclusive curated collection'}
                </Text>
                <View style={styles.collectionActionRow}>
                  <View style={styles.collectionActionBtn}>
                    <Text style={styles.collectionActionText}>Explore Drop</Text>
                    <Ionicons name="arrow-forward" size={13} color="#0F172A" />
                  </View>
                  {coll.products?.length > 0 && (
                    <Text style={styles.collectionProductCount}>
                      {coll.products.length}+ Styles
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })()
      )}

      {/* Horizontal Product Shelf for the active collection */}
      {activeColl?.products && activeColl.products.length > 0 && (
        <View style={styles.shelfWrapper}>
          <View style={styles.shelfHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.shelfTitle}>{activeColl.name} Highlights</Text>
              <Text style={styles.shelfSubtitle} numberOfLines={1}>
                {activeColl.tagline || 'Top picks from this drop'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.seeAllBtn}
              onPress={() => router.push(`/campaign/${activeColl.slug}` as any)}
            >
              <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* FlatList of Products */}
          <FlatList
            data={activeColl.products}
            horizontal
            nestedScrollEnabled={true}
            removeClippedSubviews={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={10}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            keyExtractor={(prod: any) => prod._id || prod.styleGroupId || prod.id}
            renderItem={({ item: prod }) => (
              <View style={{ width: 155, marginRight: 12 }}>
                <ProductCard
                  product={prod}
                  width={155}
                  containerStyle={{ marginRight: 0 }}
                  fromExplore={fromExplore}
                  isNearby={prod.isNearby}
                  isOnline={prod.isOnline}
                />
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  collectionContainer: {
    marginTop: 6,
    marginBottom: 20,
  },
  collectionHeroCard: {
    height: 185,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
    marginBottom: 12,
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  carouselDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
  },
  collectionTabsContainer: {
    paddingHorizontal: 2,
    paddingBottom: 14,
    gap: 8,
  },
  collectionTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  collectionTabChipActive: {
    borderColor: 'transparent',
  },
  collectionTabText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#475569',
  },
  collectionTabTextActive: {
    color: '#FFFFFF',
  },
  collectionHeroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  collectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  collectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  collectionHeroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    marginBottom: 2,
  },
  collectionHeroSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  collectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  collectionActionText: {
    color: '#0F172A',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
  },
  collectionProductCount: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },
  shelfWrapper: {
    marginTop: 2,
    marginBottom: 6,
  },
  shelfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  shelfTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  shelfSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
  },
  horizontalListPadding: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
});
