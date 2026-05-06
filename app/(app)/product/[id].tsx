import { productDetailPage, fetchRelatedProducts } from '@/api/products';
import { GenderThemes, Typography, Palette } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAddress } from '@/context/AddressContext';
import { addToRecentlyViewed } from '@/utils/recentlyViewed';
import ProductCard from '@/components/common/ProductCard';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import Loader from '@/components/common/Loader';

import { useCourierCart } from '@/context/CourierCartContext';
import { useToast } from '@/context/AlertContext';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 520;

const ProductDetailPage = () => {
  const { id, fromExplore, variantId, size } = useLocalSearchParams();
  const isExplore = fromExplore === 'true';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const { userLocation, selectedAddress } = useAddress();

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { cart, addToCart: addItemToCart } = useCart();
  const { courierCart, addToCourierCart: addItemToCourierCart } = useCourierCart();
  const showToast = useToast();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [showOnlyNearby, setShowOnlyNearby] = useState(!isExplore);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const isWishlisted = product ? isInWishlist(product._id) : false;

  const scrollY = useRef(new Animated.Value(0)).current;
  const wishlistScale = useRef(new Animated.Value(1)).current;
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
      const data = await productDetailPage(id as string, lat, lng);
      setProduct(data);
      if (data?._id) {
        const relData = await fetchRelatedProducts(data._id, lat, lng);
        setRelatedProducts(relData || []);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleScrollEndDrag = (event: any) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
        const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
        const data = await productDetailPage(id as string, lat, lng);
        setProduct(data);

        if (data.variants?.[0]) {
          // Find target variant based on variantId param or fallback to first
          const targetVariant = variantId 
            ? data.variants.find((v: any) => v._id === variantId) 
            : data.variants[0];

          if (targetVariant) {
            setSelectedColor(targetVariant.color.name);
            
            // Set size from param or first in stock
            if (size) {
              setSelectedSize(size as string);
            } else {
              const firstInStockSize = targetVariant.sizes.find((s: any) => s.stock > 0);
              if (firstInStockSize) setSelectedSize(firstInStockSize.size);
            }
          }
        }

        const activeVariant = variantId 
          ? data.variants.find((v: any) => v._id === variantId) || data.variants[0]
          : data.variants[0];

        addToRecentlyViewed({
          id: data._id,
          name: data.name,
          price: activeVariant?.price,
          mrp: activeVariant?.mrp,
          images: activeVariant?.images,
          ratings: data.ratings,
          variantId: activeVariant?._id,
        });
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, variantId, size]);

  // ── Fetch Related Products ──
  useEffect(() => {
    const loadRelated = async () => {
      if (!product?._id) return;
      try {
        setLoadingRelated(true);
        const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
        const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
        const data = await fetchRelatedProducts(product._id, lat, lng);
        setRelatedProducts(data || []);
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoadingRelated(false);
      }
    };

    loadRelated();
  }, [product?._id, selectedAddress, userLocation]);

  const filteredRelated = useMemo(() => {
    if (!showOnlyNearby) return relatedProducts;
    return relatedProducts.filter(p => p.isInstantBuyable);
  }, [relatedProducts, showOnlyNearby]);

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

  const isNearby = product?.isNearby || false;
  const isOnline = product?.isOnline !== false && product?.merchantId?.isOnline !== false;
  const productIsNearby = isNearby; // Using proximity for showing range-based info

  const showFeedback = () => {
    setShowAddedFeedback(true);
    Animated.sequence([
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowAddedFeedback(false));
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

  const handleOpenCartModal = () => {
    if (!selectedSize) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({ message: 'Please select a size', type: 'warning' });
      return;
    }
    setCartModalVisible(true);
  };

  const handleConfirmAddToCartInstant = async () => {
    try {
      setIsAdding(true);
      const activeVariant = product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0];
      const targetMerchantId = product.merchantId?._id || product.merchantId;

      await addItemToCart({
        productId: product._id,
        variantId: activeVariant._id,
        size: selectedSize,
        quantity: 1,
        merchantId: targetMerchantId,
        image: { url: activeVariant.images?.[0]?.url || '' },
      });
      
      setCartModalVisible(false);
      router.push({ pathname: '/cart', params: { tab: 'trybuy' } } as any);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showToast({ message: 'Failed to add item to bag. Please try again.', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleConfirmAddToCartStandard = async () => {
    try {
      setIsAdding(true);
      const activeVariant = product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0];
      const targetMerchantId = product.merchantId?._id || product.merchantId;

      await addItemToCourierCart({
        productId: product._id,
        variantId: activeVariant._id,
        size: selectedSize,
        quantity: 1,
        merchantId: targetMerchantId,
        image: { url: activeVariant.images?.[0]?.url || '' },
      });
      
      setCartModalVisible(false);
      showFeedback();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to add to courier cart:', error);
      showToast({ message: 'Failed to add item to bag. Please try again.', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size={60} />
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
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }} />
        </View>
      </Animated.View>

      {/* Floating Static Header */}
      <View style={[styles.staticHeader, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.staticIcon} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{ width: 40 }} />
      </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
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
                  transform: [{ scale: imageScale }],
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


          {/* Bottom Shade Gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.4)']}
            style={styles.imageBottomShade}
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
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                style={styles.inlineShareBtn}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{product.ratings || '4.5'}</Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{activeVariant.price}</Text>
            {discountPercent > 0 && (
              <>
                <Text style={styles.mrp}>₹{activeVariant.mrp}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                </View>
              </>
            )}
          </View>

          {/* Merchant Section */}
          <TouchableOpacity 
            style={styles.merchantSection}
            onPress={() => router.push(`/merchant/${product.merchantId?._id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.merchantLogoContainer}>
              <Image 
                source={{ uri: product.merchantId?.logo?.url }} 
                style={styles.merchantLogo}
                contentFit="contain"
              />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantLabel}>Sold by</Text>
              <Text style={styles.merchantName}>{product.merchantId?.shopName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Merchant / Delivery Status Info */}
          {productIsNearby && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 6 }}>
              {product?.merchantId?.isOnline === false && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Ionicons name="moon" size={12} color="#D97706" style={{ marginRight: 5 }} />
                  <Text style={{ color: '#92400E', fontSize: 11, fontFamily: Typography.fontFamily.bold }}>
                    Merchant Offline
                  </Text>
                </View>
              )}
              {product?.isTriable && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                  <Ionicons name="flash" size={12} color="#059669" style={{ marginRight: 5 }} />
                  <Text style={{ color: '#065F46', fontSize: 11, fontFamily: Typography.fontFamily.bold }}>
                    Try & Buy Available
                  </Text>
                </View>
              )}
            </View>
          )}

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
              <Ionicons name="flash" size={16} color="#64748B" />
              <Text style={styles.deliveryText}>Express Delivery</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryItem}>
              <Ionicons name="refresh" size={16} color="#64748B" />
              <Text style={styles.deliveryText}>Easy Returns</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryItem}>
              <Ionicons name="shield-checkmark" size={16} color="#64748B" />
              <Text style={styles.deliveryText}>Genuine</Text>
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text 
              style={styles.description}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {product.description ||
                'Elevate your wardrobe with this stylish and durable piece. Crafted with premium materials for ultimate comfort and a sleek modern look.'}
            </Text>
            {(product.description?.length > 150 || (!product.description && 130 > 150)) && (
              <TouchableOpacity 
                onPress={() => setShowFullDescription(!showFullDescription)}
                style={{ marginTop: 4 }}
                activeOpacity={0.7}
              >
                <Text style={{ color: theme.primary, fontFamily: Typography.fontFamily.bold, fontSize: 13 }}>
                  {showFullDescription ? 'Show Less' : 'Read More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Related Products Section */}
          <View style={styles.relatedSection}>
            <View style={[styles.relatedHeader, { justifyContent: 'space-between', marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>You May Also Like</Text>
                {loadingRelated && <ActivityIndicator size="small" color={theme.primary} />}
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={styles.toggleLabel}>Instant Try & Buy</Text>
                  <Text style={styles.toggleSublabel}>Nearby stores only</Text>
                </View>
                <Switch
                  value={showOnlyNearby}
                  onValueChange={(val) => {
                    setShowOnlyNearby(val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: '#CBD5E1', true: theme.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : showOnlyNearby ? theme.secondary : '#F8FAFC'}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
            </View>
            
            {filteredRelated.length > 0 ? (
              <FlatList
                data={filteredRelated}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.relatedList}
                renderItem={({ item }) => (
                  <ProductCard 
                    product={item} 
                    width={160}
                    containerStyle={styles.relatedCard}
                    fromExplore={isExplore}
                  />
                )}
              />
            ) : !loadingRelated && (
              <View style={styles.emptyRelated}>
                <Text style={styles.emptyRelatedText}>
                  {showOnlyNearby 
                    ? "No instant try items nearby. Try turning off the filter!" 
                    : "No related products found."}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.spacer} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>

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
          style={[styles.cartBtn, { backgroundColor: theme.primary }, isAdding && { opacity: 0.8 }]}
          onPress={handleOpenCartModal}
          activeOpacity={0.85}
          disabled={isAdding}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
          {isAdding ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="bag-add-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.cartBtnText}>ADD TO BAG</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Product Added Feedback Indicator */}
      {showAddedFeedback && (
        <Animated.View style={[styles.feedbackIndicator, { opacity: feedbackOpacity, bottom: insets.bottom + 100 }]}>
           <BlurView intensity={90} tint="dark" style={styles.feedbackBlur}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.feedbackText}>Added to Bag</Text>
              <TouchableOpacity onPress={() => router.push('/cart')}>
                <Text style={[styles.viewCartText, { color: theme.primary }]}>VIEW CART</Text>
              </TouchableOpacity>
           </BlurView>
        </Animated.View>
      )}

      {/* Add To Cart Modal */}
      <Modal
        visible={cartModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCartModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setCartModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Delivery Option</Text>
            
            {/* Instant Delivery Option */}
            <TouchableOpacity 
              style={[styles.deliveryOptionBtn, !isNearby && styles.deliveryOptionBtnDisabled]} 
              onPress={isNearby ? handleConfirmAddToCartInstant : undefined}
              activeOpacity={0.7}
            >
              <View style={styles.deliveryOptionIcon}>
                <Ionicons name="flash" size={24} color={isNearby ? "#22C55E" : "#94A3B8"} />
              </View>
              <View style={styles.deliveryOptionTexts}>
                <Text style={[styles.deliveryOptionTitle, !isNearby && { color: "#94A3B8" }]}>Instant Delivery</Text>
                <Text style={styles.deliveryOptionSub}>20 - 40 Mins</Text>
                {!isNearby ? (
                  <Text style={styles.deliveryOptionReason}>Out of range for instant delivery</Text>
                ) : !isOnline ? (
                  <Text style={[styles.deliveryOptionReason, { color: '#D97706' }]}>
                    Merchant is offline. Item will be added to {product.merchantId?.shopName}'s instant cart.
                  </Text>
                ) : (
                  <Text style={[styles.deliveryOptionReason, { color: '#64748B' }]}>
                    Item will be added to {product.merchantId?.shopName}'s instant cart.
                  </Text>
                )}
              </View>
              {isNearby && <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />}
            </TouchableOpacity>

            {/* Standard Delivery Option */}
            <TouchableOpacity 
              style={styles.deliveryOptionBtn} 
              onPress={handleConfirmAddToCartStandard}
              activeOpacity={0.7}
            >
              <View style={[styles.deliveryOptionIcon, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="cube-outline" size={24} color="#64748B" />
              </View>
              <View style={styles.deliveryOptionTexts}>
                <Text style={styles.deliveryOptionTitle}>Standard Delivery</Text>
                <Text style={styles.deliveryOptionSub}>1 - 7 Days</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>
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
  cartBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  feedbackIndicator: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  feedbackBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  viewCartText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginHorizontal: 8,
    letterSpacing: -0.2,
  },
  staticHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 110, // Higher than animated header to stay on top
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  staticIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent for visibility on light backgrounds
    overflow: 'hidden',
  },
  imageGallery: {
    height: IMAGE_HEIGHT,
    backgroundColor: '#000000', // Changed to black to blend with the bottom shade
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
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 0.5,
  },
  imageBottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120, // Slightly taller for a smoother shade
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
    fontFamily: Typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    color: '#475569',
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  price: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  mrp: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontFamily: Typography.fontFamily.medium,
  },
  discountBadge: {
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 12,
    color: '#059669',
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    marginBottom: 8,
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
    fontFamily: Typography.fontFamily.medium,
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
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
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
    paddingTop: 14,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
  },
  relatedSection: {
    marginTop: 32,
    marginBottom: 8,
  },
  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  relatedList: {
    paddingRight: 20,
    paddingBottom: 10,
  },
  relatedCard: {
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyRelated: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRelatedText: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
  },
  floatingToggleContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
  },
  floatingToggleBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  toggleTextCol: {
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  toggleSublabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  inlineShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 20,
  },
  deliveryOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  deliveryOptionBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  deliveryOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deliveryOptionTexts: {
    flex: 1,
  },
  deliveryOptionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    marginBottom: 2,
  },
  deliveryOptionSub: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  deliveryOptionReason: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#EF4444',
    marginTop: 4,
  },
  merchantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  merchantLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantLogo: {
    width: '70%',
    height: '70%',
  },
  merchantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  merchantLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  merchantName: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
});

export default ProductDetailPage;
