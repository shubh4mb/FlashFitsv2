import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Product } from '../../utils/recentlyViewed';
import { GenderThemes, Palette, Typography } from '../../constants/theme';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  width?: number;
  containerStyle?: any;
}

const ProductCard = ({ product, onPress, width = 155, containerStyle }: ProductCardProps) => {
  // console.log(product, 'procn');

  const router = useRouter();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const productId = product._id || product.id || '';
  const isFavorite = isInWishlist(productId);

  // Robust data extraction
  const variant = product.variant || (Array.isArray(product.variants) && product.variants.length > 0 ? product.variants[0] : null);
  
  // Image URL extraction: variant images array > top-level images array > variant singular image field > placeholder
  const imageUrl = 
    (variant?.images && Array.isArray(variant.images) && variant.images.length > 0 ? variant.images[0].url : null) ||
    (product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0].url : null) ||
    variant?.image || 
    'https://via.placeholder.com/300';

  const price = variant?.price ?? product.price ?? 0;
  const mrp = variant?.mrp ?? product.mrp ?? price;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isTriable = variant?.isTriable ?? product.isTriable ?? false;

  const handleWishlistPress = async () => {
    // Priority: explicit variantId > current variant's _id > first variant in array
    const vId = product.variantId || variant?._id || (Array.isArray(product.variants) ? product.variants[0]?._id : null);

    if (!vId) {
      console.warn(`Cannot toggle wishlist for product ${productId}: No variant ID found.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await toggleWishlist(productId, vId);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress || (() => router.push(`/product/${product._id || product.id}` as any))}
      style={[styles.container, width ? { width } : {}, containerStyle]}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />

        {/* Badges placeholder - removed tryBadge from here to move to details */}

        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistButton}
          activeOpacity={0.7}
          onPress={handleWishlistPress}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? "#EF4444" : "#1E293B"}
          />
        </TouchableOpacity>
      </View>

      {/* Details Section */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{price}</Text>
          {discount > 0 && (
            <Text style={styles.mrp}>₹{mrp}</Text>
          )}
        </View>

        <View style={styles.ratingRow}>
          <View style={[styles.ratingBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="star" size={10} color="#FFFFFF" />
            <Text style={styles.ratingText}>{product.ratings || '4.2'}</Text>
          </View>

          <Text style={styles.reviewsText}>(120)</Text>

          {isTriable && (
            <View style={styles.tryContainer}>
              <Text style={styles.tryText}>Try & Buy</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 0,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  details: {
    padding: 12,
  },
  name: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  price: {
    fontFamily: Typography.fontFamily.serifMedium,
    fontSize: 18,
    color: '#0F172A',
  },
  mrp: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  reviewsText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  tryContainer: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  tryText: {
    color: '#166534',
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
});

export default ProductCard;
