import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { Product } from '../../utils/recentlyViewed';
import { GenderThemes, Typography } from '../../constants/theme';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  width?: number;
  containerStyle?: any;
  fromExplore?: boolean;
  isNearby?: boolean;
  isOnline?: boolean;
}

const ProductCard = ({ 
  product, 
  onPress, 
  width = 155, 
  containerStyle, 
  fromExplore = false,
  isNearby = false,
  isOnline = false 
}: ProductCardProps) => {
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

  const scale = useSharedValue(1);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleWishlistPress = async () => {
    // Pop animation
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

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
      onPress={onPress || (() => router.push({ pathname: `/product/${product._id || product.id}`, params: { fromExplore: fromExplore ? 'true' : 'false' } } as any))}
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

        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistButton}
          activeOpacity={0.8}
          onPress={handleWishlistPress}
        >
          <BlurView intensity={70} tint="light" style={styles.wishlistBlur}>
            <Animated.View style={animatedHeartStyle}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? "#EF4444" : "#1E293B"}
              />
            </Animated.View>
          </BlurView>
        </TouchableOpacity>

        {/* Delivery Time Badge */}
        <View style={[styles.tryBadge, { backgroundColor: (product.isInstantBuyable || isNearby || product.isNearby) ? "#22C55E" : "#64748B" }]}>
          <Ionicons name={(product.isInstantBuyable || isNearby || product.isNearby) ? "flash" : "time-outline"} size={10} color="#FFFFFF" />
          <Text style={styles.tryBadgeText}>
            {(product.isInstantBuyable || isNearby || product.isNearby) ? "20-40 MINS" : "1-7 DAYS"}
          </Text>
        </View>
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
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wishlistBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
  },
  details: {
    padding: 8,
  },
  name: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  price: {
    fontFamily: Typography.fontFamily.serifMedium,
    fontSize: 15,
    color: '#0F172A',
  },
  mrp: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
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
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryText: {
    color: '#15803d',
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  onlineDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E', // Green
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  tryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100, // Minimal pill shape
    gap: 4,
    // Refined professional shadow
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tryBadgeText: {
    fontSize: 8, // Slightly larger for readability
    fontFamily: Typography.fontFamily.bold,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

export default ProductCard;
