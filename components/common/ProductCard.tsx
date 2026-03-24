import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Product } from '../../utils/recentlyViewed';
import { Palette } from '../../constants/Theme';
import { useWishlist } from '@/context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  width?: number;
  containerStyle?: any;
}

const ProductCard = ({ product, onPress, width = 160, containerStyle }: ProductCardProps) => {
  const router = useRouter();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const productId = product._id || product.id || '';
  const isFavorite = isInWishlist(productId);

  // Extract data with fallbacks
  const imageUrl = product.images?.[0]?.url || 'https://via.placeholder.com/300';
  const price = product.price;
  const mrp = product.mrp;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const handleWishlistPress = async () => {
    // Priority: explicit variantId > first variant's _id
    // NEVER fall back to productId as variantId, as the backend will 404
    const variantId = product.variantId || product.variants?.[0]?._id;
    
    if (!variantId) {
      console.warn(`Cannot toggle wishlist for product ${productId}: No variant ID found.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    await toggleWishlist(productId, variantId);
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
        
        {/* Badges */}
        {product.isTriable && (
          <View style={styles.tryBadge}>
            <Text style={styles.tryBadgeText}>Try & Buy</Text>
          </View>
        )}
        
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
          <View style={styles.ratingBadge}>
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
    height: 200,
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
    fontWeight: '700',
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
    fontWeight: '800',
  },
  details: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  mrp: {
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
    fontWeight: '700',
  },
  reviewsText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default ProductCard;
