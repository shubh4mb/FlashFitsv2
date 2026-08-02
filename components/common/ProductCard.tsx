import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
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
  withTiming,
  interpolateColor,
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

  // Robust data extraction
  const variant = product.variant || (Array.isArray(product.variants) && product.variants.length > 0 ? product.variants[0] : null);
  const variantIdForFav = product.variantId || variant?._id || (Array.isArray(product.variants) ? product.variants[0]?._id : null);
  const isFavorite = isInWishlist(productId, variantIdForFav);
  
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
  const isFast = (product.isInstantBuyable || isNearby || (product as any).isNearby);

  const translateY = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const fillProgress = useSharedValue(isFavorite ? 1 : 0);

  useEffect(() => {
    fillProgress.value = withTiming(isFavorite ? 1 : 0, { duration: 250 });
  }, [isFavorite]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scaleValue.value },
    ],
  }));

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: 1 - fillProgress.value,
  }));
  const solidStyle = useAnimatedStyle(() => ({
    opacity: fillProgress.value,
  }));

  const handleWishlistPress = async () => {
    // Bounce + scale pop animation for tactile feel
    translateY.value = withSequence(
      withTiming(-4, { duration: 80 }),
      withSpring(0, { damping: 10, stiffness: 200 })
    );
    scaleValue.value = withSequence(
      withTiming(1.15, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 200 })
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
      onPress={onPress || (() => router.push({ 
        pathname: `/product/${product._id || product.id}`, 
        params: { 
          fromExplore: fromExplore ? 'true' : 'false',
          variantId: variantIdForFav || undefined
        } 
      } as any))}
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

        {/* Wishlist Heart Icon */}
        <TouchableOpacity
          style={styles.wishlistButton}
          activeOpacity={1}
          onPress={handleWishlistPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Animated.View style={[styles.wishlistIconContainer, animatedIconStyle]}>
            {/* Outline heart (Unsaved state) */}
            <Animated.View style={[StyleSheet.absoluteFill, outlineStyle, { alignItems: 'center', justifyContent: 'center' }]}>
               <Ionicons name="heart-outline" size={16} color="#8E8E93" />
            </Animated.View>

            {/* Solid heart (Saved state) */}
            <Animated.View style={[StyleSheet.absoluteFill, solidStyle, { alignItems: 'center', justifyContent: 'center' }]}>
               <Ionicons name="heart" size={16} color="#8B0000" />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>

        {/* Delivery Time Badge */}
        <View style={styles.tryBadge}>
          <View style={[styles.tryDot, { backgroundColor: isFast ? "#3FA65C" : "#C9A24B" }]} />
          <Text style={styles.tryBadgeText}>
            {product.isWarehouseListing || product.source === 'warehouse' ? "FLASHMART" : (isFast ? "20-40 MINS" : "1-7 DAYS")}
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

        {(product.isWarehouseListing || product.source === 'warehouse') && (
          <Text style={{ fontSize: 9.5, color: '#059669', fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
            FF Warehouse • {product.merchantId?.shopName || 'Partner Store'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 8,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.35)', // very low opacity white bg
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  wishlistIconContainer: {
    width: 16,
    height: 16,
  },

  details: {
    padding: 8,
  },
  name: {
    fontFamily: Typography.fontFamily.serifMedium,
    fontWeight: 700,
    fontSize: 10.5,
    color: '#1C1C1A',
    letterSpacing: -0.4, // slightly tight as requested
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
    fontSize: 12,
    color: '#3F3F46',
    letterSpacing: -0.2,
  },
  mrp: {
    fontFamily: Typography.fontFamily.serifMedium,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: -0.1,
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
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  tryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tryBadgeText: {
    fontSize: 7.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#1C1C1A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

const MemoizedProductCard = React.memo(ProductCard, (prevProps, nextProps) => {
  if (prevProps.width !== nextProps.width) return false;
  if (prevProps.fromExplore !== nextProps.fromExplore) return false;
  if (prevProps.isNearby !== nextProps.isNearby) return false;
  if (prevProps.isOnline !== nextProps.isOnline) return false;

  const p1 = prevProps.product;
  const p2 = nextProps.product;

  if (p1 === p2) return true;
  if (!p1 || !p2) return false;

  return (
    (p1._id || p1.id) === (p2._id || p2.id) &&
    p1.variantId === p2.variantId &&
    p1.name === p2.name &&
    p1.price === p2.price &&
    p1.mrp === p2.mrp &&
    p1.isTriable === p2.isTriable &&
    p1.isInstantBuyable === p2.isInstantBuyable &&
    p1.isNearby === p2.isNearby &&
    p1.images?.[0]?.url === p2.images?.[0]?.url
  );
});

export default MemoizedProductCard;

