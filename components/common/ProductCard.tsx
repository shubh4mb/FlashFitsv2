import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { GenderThemes, Typography } from '../../constants/theme';
import { Product } from '../../utils/recentlyViewed';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  width?: number;
  containerStyle?: any;
  fromExplore?: boolean;
  fromStore?: boolean;
  isNearby?: boolean;
  isOnline?: boolean;
}

const ProductCard = ({
  product,
  onPress,
  width = 155,
  containerStyle,
  fromExplore = false,
  fromStore = false,
  isNearby = false,
  isOnline
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
  const isWarehouse = !!((product as any).isWarehouseListing || (product as any).source === 'warehouse');

  // A store is ONLY closed if explicitly marked offline (caller prop > product.isOnline > product.merchantId.isOnline > default open)
  const isStoreOnline =
    isWarehouse ||
    (isOnline !== undefined
      ? isOnline
      : (product as any).isOnline !== undefined
      ? (product as any).isOnline
      : (product as any).merchantId?.isOnline !== undefined
      ? (product as any).merchantId?.isOnline
      : true);

  // Inactive store & real-time stock status check
  const isStoreInactive =
    (product as any).isStoreInactive === true ||
    (product as any).isAvailable === false ||
    (product as any).merchantId?.isActive === false;

  const isOutOfStock =
    isStoreInactive ||
    (product as any).inStock === false ||
    (product as any).stock === 0 ||
    ((product as any).totalStock !== undefined && (product as any).totalStock <= 0) ||
    (variant?.stock !== undefined && variant.stock <= 0 && (product as any).totalStock === undefined);

  const isFast =
    isStoreOnline &&
    !isOutOfStock &&
    (Boolean(product.isInstantBuyable) ||
      Boolean(isNearby) ||
      Boolean((product as any).isNearby) ||
      (isWarehouse && (product as any).isNearby === undefined && (product as any).isInstantBuyable === undefined));

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
          fromStore: (fromStore || (product as any).fromStore) ? 'true' : undefined,
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
          transition={100}
          cachePolicy="memory-disk"
          recyclingKey={productId}
        />

        {/* Out of Stock / Inactive Overlay */}
        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <View style={[styles.outOfStockPill, isStoreInactive && styles.storeInactivePill]}>
              <Text style={styles.outOfStockPillText}>
                {isStoreInactive ? 'UNAVAILABLE' : 'OUT OF STOCK'}
              </Text>
            </View>
          </View>
        )}

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

        {/* Status & Delivery Time Badge */}
        <View style={styles.tryBadge}>
          <View style={[styles.tryDot, {
            backgroundColor: isStoreInactive
              ? "#EF4444"
              : isOutOfStock
                ? "#94A3B8"
                : (!isStoreOnline && fromStore ? "#94A3B8" : (isFast ? "#3FA65C" : "#C9A24B"))
          }]} />
          <Text style={[styles.tryBadgeText, isStoreInactive && { color: '#DC2626' }]}>
            {isStoreInactive
              ? "STORE INACTIVE"
              : isOutOfStock
                ? "OUT OF STOCK"
                : (!isStoreOnline && fromStore)
                  ? "STORE CLOSED"
                  : (isFast ? "20-40 MINS" : "1-7 DAYS")}
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
            <>
              <Text style={styles.mrp}>₹{mrp}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageContainer: {
    width: '100%',
    height: 210,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  wishlistIconContainer: {
    width: 16,
    height: 16,
  },

  details: {
    padding: 10,
  },
  name: {
    fontFamily: Typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 12,
    color: '#121212',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    fontSize: 13.5,
    color: '#121212',
    letterSpacing: -0.2,
  },
  mrp: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: -0.1,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#EBFDFF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  discountText: {
    color: '#0891B2',
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
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
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  outOfStockPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  storeInactivePill: {
    backgroundColor: 'rgba(185, 28, 28, 0.88)',
  },
  outOfStockPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    (p1 as any).isStoreInactive === (p2 as any).isStoreInactive &&
    (p1 as any).inStock === (p2 as any).inStock &&
    (p1 as any).isWarehouseListing === (p2 as any).isWarehouseListing &&
    (p1 as any).source === (p2 as any).source &&
    p1.images?.[0]?.url === p2.images?.[0]?.url
  );
});

export default MemoizedProductCard;

