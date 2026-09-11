import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';

const CATEGORIES_BY_GENDER: Record<string, Array<{ id: string; label: string; query: string; image: string; tag?: string }>> = {
  Men: [
    {
      id: 'm_oversized',
      label: 'Oversized',
      query: 'Oversized',
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=300&q=80',
      tag: 'HOT',
    },
    {
      id: 'm_hoodies',
      label: 'Hoodies',
      query: 'Hoodie',
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'm_jeans',
      label: 'Denims',
      query: 'Jeans',
      image: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=300&q=80',
      tag: 'NEW',
    },
    {
      id: 'm_cargo',
      label: 'Cargos',
      query: 'Cargo',
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'm_sneakers',
      label: 'Sneakers',
      query: 'Sneakers',
      image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=300&q=80',
      tag: '⚡ 60M',
    },
    {
      id: 'm_shirts',
      label: 'Shirts',
      query: 'Shirt',
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80',
    },
  ],
  Women: [
    {
      id: 'w_dresses',
      label: 'Dresses',
      query: 'Dress',
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80',
      tag: 'HOT',
    },
    {
      id: 'w_tops',
      label: 'Tops & Tees',
      query: 'Top',
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'w_coords',
      label: 'Co-ords',
      query: 'Co-ord',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80',
      tag: 'TRENDING',
    },
    {
      id: 'w_jeans',
      label: 'Jeans',
      query: 'Jeans',
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'w_footwear',
      label: 'Footwear',
      query: 'Footwear',
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=300&q=80',
      tag: '⚡ 60M',
    },
    {
      id: 'w_ethnic',
      label: 'Ethnic',
      query: 'Kurti',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80',
    },
  ],
  Kids: [
    {
      id: 'k_tshirts',
      label: 'T-Shirts',
      query: 'Kids T-Shirt',
      image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=300&q=80',
      tag: 'CUTE',
    },
    {
      id: 'k_sets',
      label: 'Sets',
      query: 'Kids Set',
      image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'k_footwear',
      label: 'Shoes',
      query: 'Kids Shoes',
      image: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'k_bottoms',
      label: 'Bottoms',
      query: 'Kids Jeans',
      image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=300&q=80',
    },
  ],
};

export default function QuickCategoryRail({ refreshKey = 0 }: { refreshKey?: number }) {
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const router = useRouter();

  const categories = CATEGORIES_BY_GENDER[selectedGender] || CATEGORIES_BY_GENDER.Men;

  const handleCategoryPress = (category: typeof categories[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(app)/search-results',
      params: {
        q: category.query,
        title: `${category.label} - Try & Buy`,
        deliveryMode: 'tryAndBuy',
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Shop by Style</Text>
          <View style={styles.liveDropPill}>
            <Text style={styles.liveDropText}>60-MIN TRIAL</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/(tabs)/categories')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.8}
            onPress={() => handleCategoryPress(cat)}
            style={styles.categoryItem}
          >
            {/* Story Ring Gradient with Signature Brand Cyan */}
            <LinearGradient
              colors={[BrandColors.primary, BrandColors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.storyRing}
            >
              <View style={styles.imageInner}>
                <Image
                  source={{ uri: cat.image }}
                  style={styles.categoryImage}
                  contentFit="cover"
                  transition={300}
                />
              </View>
            </LinearGradient>

            {/* Tag Badge if present */}
            {cat.tag && (
              <View style={[styles.tagBadge, { backgroundColor: BrandColors.primary }]}>
                <Text style={styles.tagText}>{cat.tag}</Text>
              </View>
            )}

            <Text style={styles.categoryLabel} numberOfLines={1}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.extraBold,
    color: BrandColors.matteBlack,
    letterSpacing: -0.2,
  },
  liveDropPill: {
    backgroundColor: BrandColors.softCyan,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BrandColors.softCyanBorder,
  },
  liveDropText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.extraBold,
    color: BrandColors.cyanDeep,
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: BrandColors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
    position: 'relative',
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  tagBadge: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  tagText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 8,
  },
});
