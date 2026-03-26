import { productDetailPage } from '@/api/products';
import { GenderThemes, Typography } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { addToRecentlyViewed } from '@/utils/recentlyViewed';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 520;

const ProductDetailPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart: addItemToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isWishlisted = product ? isInWishlist(product._id) : false;

  const scrollY = useRef(new Animated.Value(0)).current;
  const wishlistScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productDetailPage(id as string);
        setProduct(data);

        if (data.variants?.[0]) {
          setSelectedColor(data.variants[0].color.name);
          const firstInStockSize = data.variants[0].sizes.find((s: any) => s.stock > 0);
          if (firstInStockSize) setSelectedSize(firstInStockSize.size);
        }

        addToRecentlyViewed({
          id: data._id,
          name: data.name,
          price: data.variants[0]?.price,
          mrp: data.variants[0]?.mrp,
          images: data.variants[0]?.images,
          ratings: data.ratings,
          variantId: data.variants[0]?._id, // Add this
        });
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-150, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT],
    outputRange: [0, -IMAGE_HEIGHT * 0.35],
    extrapolate: 'clamp',
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${product.name} on FlashFits!`,
        url: `https://flashfits.com/product/${id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleWishlistToggle = () => {
    if (product) {
      const activeVariant = product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0];
      toggleWishlist(product._id, activeVariant._id);

      Animated.sequence([
        Animated.spring(wishlistScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
        Animated.spring(wishlistScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Please select a size');
      return;
    }

    try {
      const activeVariant = product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0];

      await addItemToCart({
        productId: product._id,
        variantId: activeVariant._id,
        size: selectedSize,
        quantity: 1,
        merchantId: product.merchantId?._id || product.merchantId,
        image: activeVariant.images?.[0]?.url || '',
      });

      router.push('/cart' as any);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeVariant = product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0];
  const images = activeVariant?.images || [];
  const discountPercent = activeVariant.mrp > activeVariant.price
    ? Math.round(((activeVariant.mrp - activeVariant.price) / activeVariant.mrp) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Animated Blur Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
          <TouchableOpacity style={styles.headerIcon} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Floating Static Header */}
      <View style={[styles.staticHeader, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.staticIcon} onPress={() => router.back()} activeOpacity={0.7}>
          <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.staticIcon} onPress={handleShare} activeOpacity={0.7}>
          <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        bounces
      >
        {/* Image Gallery with Parallax */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {images.map((img: any, index: number) => (
              <Animated.View
                key={index}
                style={{
                  width,
                  height: IMAGE_HEIGHT,
                  transform: [{ scale: imageScale }, { translateY: imageTranslateY }],
                }}
              >
                <Image source={{ uri: img.url }} style={styles.mainImage} contentFit="cover" transition={300} />
              </Animated.View>
            ))}
          </ScrollView>

          {/* Image Counter Pill */}
          <View style={styles.imageCounter}>
            <BlurView intensity={50} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
            <Text style={styles.imageCounterText}>{activeIndex + 1}/{images.length}</Text>
          </View>

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {images.map((_: any, i: number) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex && [styles.activeDot, { backgroundColor: '#FFFFFF' }],
                ]}
              />
            ))}
          </View>

          {/* Gradient fade into content */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.6)', '#FFFFFF']}
            style={styles.imageGradient}
          />
        </View>

        {/* Content Card */}
        <View style={styles.content}>
          {/* Brand + Rating Row */}
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: theme.accent }]}>
                {product.brandId?.name || 'FlashFits Exclusive'}
              </Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.ratingText}>{product.ratings || '4.5'}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.primary }]}>₹{activeVariant.price}</Text>
            {discountPercent > 0 && (
              <>
                <Text style={styles.mrp}>₹{activeVariant.mrp}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                </View>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Color Selection */}
          <Text style={styles.sectionTitle}>
            Color <Text style={styles.sectionSubtitle}>{selectedColor}</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionRow}>
            {product.variants.map((v: any, i: number) => {
              const isSelected = selectedColor === v.color.name;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setSelectedColor(v.color.name);
                    setActiveIndex(0);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.colorChip,
                    isSelected && { borderColor: theme.primary, borderWidth: 2, backgroundColor: '#FFFFFF' },
                  ]}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: v.color.hex || '#ccc' },
                      isSelected && {
                        ...Platform.select({
                          ios: { shadowColor: v.color.hex, shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
                          android: { elevation: 3 },
                        }),
                      },
                    ]}
                  />
                  <Text style={[styles.chipText, isSelected && { color: theme.primary, fontWeight: '800' }]}>
                    {v.color.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Size Selection */}
          <Text style={styles.sectionTitle}>
            Size <Text style={styles.sectionSubtitle}>{selectedSize || 'Select'}</Text>
          </Text>
          <View style={styles.sizeGrid}>
            {activeVariant.sizes.map((s: any, i: number) => {
              const isSelected = selectedSize === s.size;
              const outOfStock = s.stock === 0;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    if (!outOfStock) {
                      setSelectedSize(s.size);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  disabled={outOfStock}
                  activeOpacity={0.7}
                  style={[
                    styles.sizeChip,
                    isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                    outOfStock && styles.disabledSizeChip,
                  ]}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      isSelected && styles.selectedSizeText,
                      outOfStock && styles.disabledSizeText,
                    ]}
                  >
                    {s.size}
                  </Text>
                  {outOfStock && <View style={styles.strikethrough} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Delivery Info Strip */}
          <View style={styles.deliveryStrip}>
            <View style={styles.deliveryItem}>
              <Ionicons name="flash" size={16} color={theme.primary} />
              <Text style={styles.deliveryText}>Express Delivery</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryItem}>
              <Ionicons name="refresh" size={16} color={theme.primary} />
              <Text style={styles.deliveryText}>Easy Returns</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryItem}>
              <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
              <Text style={styles.deliveryText}>Genuine</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>About this product</Text>
          <Text style={styles.description}>
            {product.description ||
              'Elevate your wardrobe with this stylish and durable piece. Crafted with premium materials for ultimate comfort and a sleek modern look.'}
          </Text>

          <View style={styles.spacer} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']} // Fully opaque gray-to-white gradient
          style={[StyleSheet.absoluteFill]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Animated.View style={{ transform: [{ scale: wishlistScale }] }}>
          <TouchableOpacity
            style={[styles.wishlistBtn, isWishlisted && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}
            onPress={handleWishlistToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={24}
              color={isWishlisted ? '#EF4444' : '#64748B'}
            />
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[styles.cartBtn, { backgroundColor: theme.primary }]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
          <Ionicons name="bag-add-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.cartBtnText}>ADD TO BAG</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerContent: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Typography.fontFamily.serifExtraBold,
    color: '#0F172A',
    textAlign: 'center',
    marginHorizontal: 8,
    letterSpacing: -0.3,
  },
  staticHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  staticIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageGallery: {
    height: IMAGE_HEIGHT,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    top: 60,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  pagination: {
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  activeDot: {
    width: 22,
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brand: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  name: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.serifExtraBold,
    color: '#0F172A',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  price: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.serifExtraBold,
    letterSpacing: -0.4,
  },
  mrp: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontFamily: Typography.fontFamily.medium,
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    color: '#059669',
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.serifBold,
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
  },
  selectionRow: {
    marginBottom: 16,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  chipText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  sizeChip: {
    width: 44,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  disabledSizeChip: {
    opacity: 0.35,
    backgroundColor: '#F1F5F9',
  },
  sizeText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#1E293B',
  },
  selectedSizeText: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },
  disabledSizeText: {
    color: '#94A3B8',
  },
  strikethrough: {
    position: 'absolute',
    width: '70%',
    height: 1.5,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '-20deg' }],
  },
  deliveryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    letterSpacing: 0.1,
  },
  deliveryDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    fontFamily: Typography.fontFamily.regular,
    letterSpacing: 0.1,
  },
  spacer: {
    height: 120,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  wishlistBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cartBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cartBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});

export default ProductDetailPage;
