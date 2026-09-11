import { fetchRelatedProducts, productDetailPage } from '@/api/products';
import Loader from '@/components/common/Loader';
import ProductCard from '@/components/common/ProductCard';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import flashfitsLogo from '@/assets/images/logo/logo.png';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { addToRecentlyViewed } from '@/utils/recentlyViewed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@/context/AlertContext';
import { useCourierCart } from '@/context/CourierCartContext';
import ExpandableSection from '@/components/common/ExpandableSection';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageViewing from 'react-native-image-viewing';


const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 520;

const formatText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};



const ProductDetailPage = () => {
  const { id, fromExplore, variantId, size } = useLocalSearchParams();
  const isExplore = fromExplore === 'true';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [limitErrorModalVisible, setLimitErrorModalVisible] = useState(false);
  const [limitErrorMessage, setLimitErrorMessage] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'features' | 'specs'>('details');
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const { userLocation, selectedAddress } = useAddress();
  const showToast = useToast();

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { cart, addToCart: addItemToCart } = useCart();
  const { courierCart, addToCourierCart: addItemToCourierCart } = useCourierCart();
  const instantCartCount = cart?.merchantCarts?.length || 0;
  const courierCartCount = courierCart?.items?.length || 0;

  const [product, setProduct] = useState<any>(null);

  const currentMerchantCount = useMemo(() => {
    if (!product || !cart?.merchantCarts) return 0;

    const targetMid = String(product?.merchantId?._id || product?.merchantId);

    const mCart = cart.merchantCarts.find((mc: any) => {
      const mcId = String(mc.merchantDetails?._id || mc.merchantId);
      return mcId === targetMid;
    });

    if (mCart && mCart.items) {
      return mCart.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    }
    return 0;
  }, [product, cart?.merchantCarts]);

  const otherMerchantCart = useMemo(() => {
    if (!product || !cart?.merchantCarts) return null;

    const targetMid = String(product?.merchantId?._id || product?.merchantId);

    return cart.merchantCarts.find((mc: any) => {
      const mcId = String(mc.merchantDetails?._id || mc.merchantId);
      return mcId !== targetMid;
    });
  }, [product, cart?.merchantCarts]);

  const [selectedFulfillmentMode, setSelectedFulfillmentMode] = useState<'flashmart' | 'directStore' | 'courier'>('courier');
  const [deliveryOptionsModalVisible, setDeliveryOptionsModalVisible] = useState(false);
  const [lastAddedCartType, setLastAddedCartType] = useState<'flashmart' | 'directStore' | 'courier'>('flashmart');
  const [wasAlreadyInCart, setWasAlreadyInCart] = useState(false);
  const [lastAddedItemQty, setLastAddedItemQty] = useState(1);

  const targetStoreInfo = useMemo(() => {
    if (lastAddedCartType === 'courier') {
      const totalCourierQty = courierCart?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || courierCartCount || 0;
      const shopName = product?.merchantId?.shopName || product?.merchantName || 'Courier Store';
      return {
        shopName: `${shopName} (Courier)`,
        itemCount: totalCourierQty,
      };
    }

    if (lastAddedCartType === 'flashmart') {
      const flashmartCart = cart?.merchantCarts?.find((mc: any) => String(mc.merchantId) === 'flashmart');
      const totalFlashmartQty = flashmartCart?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) ||
                               cart?.items?.filter((i: any) => i.source === 'warehouse')?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0;
      return {
        shopName: 'FlashFits Hub Warehouse',
        itemCount: totalFlashmartQty,
      };
    }

    // Direct Store
    const targetMid = String(product?.merchantId?._id || product?.merchantId);
    const mCart = cart?.merchantCarts?.find((mc: any) => {
      const mcId = String(mc.merchantDetails?._id || mc.merchantId);
      return mcId === targetMid;
    });

    const storeQty = mCart?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || currentMerchantCount || 0;
    const storeName = mCart?.merchantDetails?.shopName || product?.merchantId?.shopName || product?.merchantName || product?.shopName || 'Store';

    return {
      shopName: storeName,
      itemCount: storeQty,
    };
  }, [lastAddedCartType, product, cart, courierCart, currentMerchantCount, courierCartCount]);

  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [showOnlyNearby, setShowOnlyNearby] = useState(!isExplore);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const isWishlisted = product ? isInWishlist(product._id, (product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0])?._id) : false;

  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const wishlistScale = useRef(new Animated.Value(1)).current;
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const [isDescExpanded, setIsDescExpanded] = useState(false);

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
        console.log("=== ProductDetailPage Mount ===", { id, fromExplore, variantId, size });
        const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
        const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
        const data = await productDetailPage(id as string, lat, lng);
        setProduct(data);

        // Smart location & fulfillment mode default
        const flashmartAvail = !!(data?.fulfillmentOptions?.flashmart?.available || (data?.isWarehouseListing && data?.isNearby));
        const storeAvail = !!(data?.fulfillmentOptions?.directStore?.available || data?.availableInShop || (!data?.isWarehouseListing && data?.isInstantBuyable && data?.isNearby));
        if (flashmartAvail) {
          setSelectedFulfillmentMode('flashmart');
        } else if (storeAvail) {
          setSelectedFulfillmentMode('directStore');
        } else {
          setSelectedFulfillmentMode('courier');
        }
        console.log("=== ProductDetailPage data.variants ===", data.variants?.map((v: any) => ({ _id: v._id, color: v.color?.name })));

        if (data.variants?.[0]) {
          const targetVariant = variantId
            ? data.variants.find((v: any) => v._id === variantId || v.colorVariantId === variantId)
            : data.variants[0];

          if (targetVariant) {
            setSelectedColor(targetVariant.color?.name || 'Default');

            if (size) {
              setSelectedSize(size as string);
            } else {
              const colorVariants = data.variants.filter((v: any) => (v.color?.name || 'Default') === (targetVariant.color?.name || 'Default'));
              const firstInStock = colorVariants.find((v: any) => v.stock > 0) || colorVariants[0];
              if (firstInStock) setSelectedSize(firstInStock.size);
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
  const productIsNearby = isNearby;

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

  const handleOpenDeliveryOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const flashmartAvailable = product?.fulfillmentOptions?.flashmart !== undefined
      ? !!product.fulfillmentOptions.flashmart?.available
      : !!(product?.isWarehouseListing && (product?.isNearby ?? true));

    const directStoreAvailable = product?.fulfillmentOptions?.directStore !== undefined
      ? !!product.fulfillmentOptions.directStore?.available
      : !!(product?.availableInShop || (!product?.isWarehouseListing && (product?.isNearby ?? false) && (product?.isInstantBuyable ?? false)));

    if (selectedFulfillmentMode === 'flashmart' && !flashmartAvailable) {
      setSelectedFulfillmentMode(directStoreAvailable ? 'directStore' : 'courier');
    } else if (selectedFulfillmentMode === 'directStore' && !directStoreAvailable) {
      setSelectedFulfillmentMode(flashmartAvailable ? 'flashmart' : 'courier');
    } else if (selectedFulfillmentMode === 'courier' && (flashmartAvailable || directStoreAvailable)) {
      setSelectedFulfillmentMode(flashmartAvailable ? 'flashmart' : 'directStore');
    }

    setDeliveryOptionsModalVisible(true);
  };

  const handleAddToCartSelectedMode = async () => {
    if (!selectedSize) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({ message: 'Please select a size', type: 'warning' });
      return;
    }

    try {
      setIsAdding(true);
      const activeVariant = product.variants.find((v: any) => v.color.name === selectedColor) || product.variants[0];
      const rawMerchantId = product.merchantId?._id || product.merchantId;
      const targetMerchantId = rawMerchantId ? String(rawMerchantId) : (product.source === 'warehouse' || selectedFulfillmentMode === 'flashmart' ? 'flashmart' : 'flashmart');

      // Check if item was already in cart before adding
      let existed = false;
      let prevQty = 0;
      if (selectedFulfillmentMode === 'courier') {
        const existing = courierCart?.items?.find((i: any) => 
          String(i.productId?._id || i.productId) === String(product._id) && 
          String(i.variantId) === String(activeVariant._id) && 
          i.size === selectedSize
        );
        if (existing) {
          existed = true;
          prevQty = existing.quantity || 1;
        }
      } else {
        const isWh = selectedFulfillmentMode === 'flashmart';
        const existing = cart?.items?.find((i: any) => 
          String(i.productId?._id || i.productId) === String(product._id) && 
          String(i.variantId) === String(activeVariant._id) && 
          i.size === selectedSize &&
          (isWh ? i.source === 'warehouse' : i.source !== 'warehouse')
        );
        if (existing) {
          existed = true;
          prevQty = existing.quantity || 1;
        }
      }

      setWasAlreadyInCart(existed);
      setLastAddedItemQty(existed ? prevQty + 1 : 1);

      if (selectedFulfillmentMode === 'courier') {
        await addItemToCourierCart({
          productId: product._id,
          variantId: activeVariant._id,
          size: selectedSize,
          quantity: 1,
          merchantId: targetMerchantId,
          image: { url: activeVariant.images?.[0]?.url || '' },
        });
        setLastAddedCartType('courier');
      } else if (selectedFulfillmentMode === 'flashmart') {
        await addItemToCart({
          productId: product._id,
          variantId: activeVariant._id,
          size: selectedSize,
          quantity: 1,
          merchantId: targetMerchantId,
          image: { url: activeVariant.images?.[0]?.url || '' },
          source: 'warehouse',
        });
        setLastAddedCartType('flashmart');
      } else {
        await addItemToCart({
          productId: product._id,
          variantId: activeVariant._id,
          size: selectedSize,
          quantity: 1,
          merchantId: targetMerchantId,
          image: { url: activeVariant.images?.[0]?.url || '' },
          source: 'shop',
        });
        setLastAddedCartType('directStore');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeliveryOptionsModalVisible(false);
      showToast({ message: 'Added to cart', type: 'success' });
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message || '';
      const isLimitError = error?.response?.status === 400 && (
        /limit|6|try & buy|slot/i.test(serverMessage)
      );

      if (isLimitError) {
        setDeliveryOptionsModalVisible(false);
        setLimitErrorMessage(serverMessage || "You can only have up to 6 Try & Buy item slots per merchant.");
        setLimitErrorModalVisible(true);
      } else {
        console.error('Failed to add to cart:', error);
        showToast({ message: serverMessage || 'Failed to add item to bag. Please try again.', type: 'error' });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const colorOptions = useMemo(() => {
    if (!product?.variants) return [];
    const map = new Map();
    product.variants.forEach((v: any) => {
      const cName = v.color?.name || 'Default';
      if (!map.has(cName)) {
        map.set(cName, v.color || { name: 'Default', hex: '#ccc' });
      }
    });
    return Array.from(map.values());
  }, [product?.variants]);

  const availableSizes = useMemo(() => {
    if (!product?.variants) return [];
    return product.variants.filter((v: any) => (v.color?.name || 'Default') === (selectedColor || 'Default'));
  }, [product?.variants, selectedColor]);

  const activeVariant = useMemo(() => {
    if (!product?.variants) return null;
    const match = product.variants.find((v: any) => 
      (v.color?.name || 'Default') === (selectedColor || 'Default') && v.size === selectedSize
    );
    return match || availableSizes[0] || product.variants[0];
  }, [product?.variants, selectedColor, selectedSize, availableSizes]);

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
        <Ionicons name="alert-circle-outline" size={44} color="#CBD5E1" />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = activeVariant?.images || [];
  const discountPercent = (activeVariant?.mrp && activeVariant?.price && activeVariant.mrp > activeVariant.price)
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
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{ width: 36 }} />
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
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setZoomIndex(index);
                    setIsZoomVisible(true);
                  }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Image source={{ uri: img.url }} style={styles.mainImage} contentFit="cover" transition={300} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Image Counter Pill */}
          <View style={styles.imageCounter}>
            <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
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
            colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.32)']}
            style={styles.imageBottomShade}
          />
        </View>

        {/* Content Card */}
        <View style={styles.content}>
          {/* Brand + Rating Row */}
          <View style={styles.topRow}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.name}>{product.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={styles.ratingText}>{product.ratings || '4.5'}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.inlineShareBtn}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={15} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Price & Status Badges */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
              <Text style={styles.price}>₹{activeVariant.price}</Text>
              {discountPercent > 0 && (
                <>
                  <Text style={styles.mrp}>₹{activeVariant.mrp}</Text>
                  <Text style={styles.discountText}>{discountPercent}% off</Text>
                </>
              )}
            </View>

            {productIsNearby && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {product?.merchantId?.isOnline === false && (
                  <View style={styles.statusPillWarning}>
                    <Ionicons name="moon" size={10} color="#B45309" style={{ marginRight: 4 }} />
                    <Text style={styles.statusPillWarningText}>Merchant offline</Text>
                  </View>
                )}
                {product?.isTriable && (
                  <View style={styles.statusPillSuccess}>
                    <Ionicons name="flash" size={10} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.statusPillSuccessText}>Try & Buy</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Merchant / FlashMart Section */}
          <TouchableOpacity
            style={styles.merchantSection}
            onPress={() => {
              if (product.isWarehouseListing && product.availableInShop && product.shopMerchantId) {
                router.push(`/merchant/${product.shopMerchantId}` as any);
              } else if (product.merchantId?._id) {
                router.push(`/merchant/${product.merchantId._id}` as any);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.merchantLogoContainer}>
              {product.isWarehouseListing ? (
                <Image
                  source={flashfitsLogo}
                  style={styles.merchantLogo}
                  contentFit="contain"
                />
              ) : (
                <Image
                  source={{ uri: product.merchantId?.logo?.url }}
                  style={styles.merchantLogo}
                  contentFit="contain"
                />
              )}
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantLabel}>
                {product.isWarehouseListing ? 'Dispatched from' : 'Sold by'}
              </Text>
              <Text style={styles.merchantName}>
                {product.isWarehouseListing
                  ? `FF Warehouse • ${product.sourceMerchantName || product.merchantId?.shopName || 'Partner Store'}`
                  : product.merchantId?.shopName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          {/* Dual Availability Banner */}
          {product.isWarehouseListing && product.availableInShop && (
            <View style={{
              backgroundColor: '#ECFDF5',
              borderColor: '#10B981',
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#D1FAE5',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons name="storefront" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#065F46' }}>
                  Also Available in Store 🏪
                </Text>
                <Text style={{ fontSize: 11, color: '#047857', marginTop: 2, fontFamily: Typography.fontFamily.medium }}>
                  In stock at {product.shopMerchantName || 'the local merchant shop'} (in range for Instant Try)
                </Text>
              </View>
              {product.shopMerchantId && (
                <TouchableOpacity
                  onPress={() => router.push(`/merchant/${product.shopMerchantId}` as any)}
                  style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: Typography.fontFamily.bold }}>View Store</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Color Selection */}
          {colorOptions.length > 1 && colorOptions.some((c: any) => c && c.name && c.name.toLowerCase() !== 'none' && c.name.trim() !== '') && (
            <>
              <Text style={styles.sectionTitle}>
                Color <Text style={styles.sectionSubtitle}>{formatText(selectedColor || '')}</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionRow}>
                {colorOptions.map((c: any, i: number) => {
                  if (!c || !c.name || c.name.toLowerCase() === 'none' || c.name.trim() === '') return null;
                  const isSelected = selectedColor === c.name;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setSelectedColor(c.name);
                        const sizesForColor = product.variants.filter((v: any) => (v.color?.name || 'Default') === c.name);
                        const firstInStock = sizesForColor.find((v: any) => v.stock > 0) || sizesForColor[0];
                        if (firstInStock) setSelectedSize(firstInStock.size);
                        setActiveIndex(0);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.7}
                      style={[
                        styles.colorChip,
                        isSelected && { borderColor: theme.primary, borderWidth: 1.5, backgroundColor: '#FFFFFF' },
                      ]}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c.hex || '#ccc' },
                          isSelected && {
                            ...Platform.select({
                              ios: { shadowColor: c.hex, shadowOpacity: 0.35, shadowRadius: 3, shadowOffset: { width: 0, height: 1.5 } },
                              android: { elevation: 2 },
                            }),
                          },
                        ]}
                      />
                      <Text style={[styles.chipText, isSelected && { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                        {formatText(c.name)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Size Selection */}
          <Text style={styles.sectionTitle}>
            Size <Text style={styles.sectionSubtitle}>{selectedSize || 'Select'}</Text>
          </Text>
          <View style={styles.sizeGrid}>
            {availableSizes.map((s: any, i: number) => {
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
                    isSelected && { backgroundColor: BrandColors.primary, borderColor: BrandColors.primary },
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
              <Ionicons name="flash" size={13} color="#94A3B8" />
              <Text style={styles.deliveryText}>Express delivery</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryItem}>
              <Ionicons name="refresh" size={13} color="#94A3B8" />
              <Text style={styles.deliveryText}>Easy returns</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryItem}>
              <Ionicons name="shield-checkmark" size={13} color="#94A3B8" />
              <Text style={styles.deliveryText}>Genuine</Text>
            </View>
          </View>

          <View style={{ marginBottom: 26 }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0', marginBottom: 16 }}>
              {[
                { id: 'details', label: 'Details' },
                ...(product.features?.length ? [{ id: 'features', label: 'Highlights' }] : []),
                ...(product.attributes?.length ? [{ id: 'specs', label: 'Specs' }] : [])
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveDetailTab(tab.id as any)}
                  style={{ paddingVertical: 10, marginRight: 24, borderBottomWidth: 2, borderBottomColor: activeDetailTab === tab.id ? theme.primary : 'transparent', paddingHorizontal: 2 }}
                >
                  <Text style={{ fontSize: 13, fontFamily: activeDetailTab === tab.id ? Typography.fontFamily.semiBold : Typography.fontFamily.medium, color: activeDetailTab === tab.id ? theme.primary : '#64748B' }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ minHeight: 60 }}>
              {activeDetailTab === 'details' && (
                <View>
                  <Text
                    style={[styles.description, { lineHeight: 22 }]}
                    numberOfLines={isDescExpanded ? undefined : 3}
                  >
                    {product.description ||
                      'Elevate your wardrobe with this stylish and durable piece. Crafted with premium materials for ultimate comfort and a sleek modern look.'}
                  </Text>
                  {(product.description || 'Elevate your wardrobe with this stylish and durable piece. Crafted with premium materials for ultimate comfort and a sleek modern look.').length > 120 && (
                    <TouchableOpacity
                      onPress={() => setIsDescExpanded(!isDescExpanded)}
                      style={{ marginTop: 6, alignSelf: 'flex-start' }}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontFamily: Typography.fontFamily.bold,
                        color: theme.primary
                      }}>
                        {isDescExpanded ? 'Read Less' : 'Read More'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {activeDetailTab === 'features' && (
                <View>
                  {product.features?.map((feature: string, index: number) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingHorizontal: 4 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', marginTop: 8, marginRight: 10 }} />
                      <Text style={[styles.description, { flex: 1, lineHeight: 20 }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              {activeDetailTab === 'specs' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                  {product.attributes?.map((attr: any, index: number) => (
                    <View key={index} style={{ width: '50%', marginBottom: 14, paddingRight: 8 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontFamily: Typography.fontFamily.medium, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.5 }}>{formatText(attr.attributeId?.name || attr.attribute?.name || attr.name || attr.key || 'Specification')}</Text>
                      <Text style={{ fontSize: 13, color: '#1E293B', fontFamily: Typography.fontFamily.semiBold }}>{formatText(attr.value)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Complete the Look Section */}
          {product?.matchingProducts && product.matchingProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <View style={[styles.relatedHeader, { marginBottom: 14 }]}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>Complete the Look</Text>
              </View>
              <FlashList
                data={product.matchingProducts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item: any) => item._id}
                contentContainerStyle={styles.relatedList}
                renderItem={({ item }: { item: any }) => (
                  <ProductCard
                    product={item}
                    width={160}
                    containerStyle={styles.relatedCard}
                    fromExplore={isExplore}
                    isNearby={item.isInstantBuyable || item.isNearby}
                    isOnline={item.isOnline !== false}
                  />
                )}
              />
            </View>
          )}

          {/* Related Products Section */}
          <View style={styles.relatedSection}>
            <View style={[styles.relatedHeader, { justifyContent: 'space-between', marginBottom: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>You may also like</Text>
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
                  trackColor={{ false: '#E2E8F0', true: theme.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : showOnlyNearby ? theme.secondary : '#F8FAFC'}
                  style={{ transform: [{ scale: 0.75 }] }}
                />
              </View>
            </View>

            {filteredRelated.length > 0 ? (
              <FlashList
                data={filteredRelated}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item: any) => item._id}
                contentContainerStyle={styles.relatedList}
                renderItem={({ item }: { item: any }) => (
                  <ProductCard
                    product={item}
                    width={160}
                    containerStyle={styles.relatedCard}
                    fromExplore={isExplore}
                    isNearby={showOnlyNearby || item.isInstantBuyable || item.isNearby}
                    isOnline={item.isOnline !== false}
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
              size={21}
              color={isWishlisted ? '#EF4444' : '#64748B'}
            />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.cartIconBtn}
          onPress={() => router.push('/cart')}
          activeOpacity={0.7}
        >
          <Ionicons name="bag-handle-outline" size={21} color="#64748B" />

          {instantCartCount > 0 && (
            <View style={[styles.cartBadge, styles.cartInstantBadge, { backgroundColor: '#F59E0B' }]}>
              <View style={[styles.cartBadgeContent, { paddingLeft: 2 }]}>
                <Text style={styles.cartBadgeText}>{instantCartCount > 9 ? '9+' : instantCartCount}</Text>
                <Ionicons name="flash" size={6} color="#fff" style={{ marginLeft: 1 }} />
              </View>
            </View>
          )}

          {courierCartCount > 0 && (
            <View style={[styles.cartBadge, styles.cartCourierBadge, { backgroundColor: theme.accent || theme.primary }]}>
              <Text style={styles.cartBadgeText}>{courierCartCount > 9 ? '9+' : courierCartCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cartBtn, { backgroundColor: BrandColors.primary }, isAdding && { opacity: 0.8 }]}
          onPress={handleOpenDeliveryOptions}
          activeOpacity={0.85}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="bag-handle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.cartBtnText}>
                ADD TO BAG
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Delivery Options Popup Modal (Sliding Bottom Sheet) */}
      <Modal
        visible={deliveryOptionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeliveryOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeliveryOptionsModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />

            {/* Header Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 16, fontFamily: Typography.fontFamily.bold, color: '#0F172A' }}>
                  Select Delivery Option
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', fontFamily: Typography.fontFamily.medium, marginTop: 2 }}>
                  {"Choose how you'd like your item fulfilled"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeliveryOptionsModalVisible(false)}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Item Summary Pill */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Image
                source={{ uri: activeVariant?.images?.[0]?.url }}
                style={{ width: 38, height: 46, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#0F172A' }} numberOfLines={1}>
                  {product?.name}
                </Text>
                <Text style={{ fontSize: 11, color: selectedSize ? '#64748B' : '#EF4444', fontFamily: Typography.fontFamily.medium, marginTop: 2 }}>
                  Size: <Text style={{ color: selectedSize ? '#0F172A' : '#EF4444', fontFamily: Typography.fontFamily.bold }}>{selectedSize || 'Not Selected'}</Text>
                  {selectedColor ? ` • Color: ${formatText(selectedColor)}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontFamily: Typography.fontFamily.bold, color: theme.primary }}>
                ₹{activeVariant?.price}
              </Text>
            </View>

            {/* Size Selector inside Pop Up */}
            <View style={{ marginBottom: 14, backgroundColor: selectedSize ? '#F8FAFC' : '#FEF2F2', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: selectedSize ? '#F1F5F9' : '#FCA5A5' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: selectedSize ? '#0F172A' : '#DC2626' }}>
                  {selectedSize ? `Size: ${selectedSize}` : '⚠️ Select Size (Required)'}
                </Text>
                {!selectedSize && (
                  <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#DC2626' }}>
                    Tap a size below
                  </Text>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {activeVariant?.sizes?.map((s: any, i: number) => {
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
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: isSelected ? theme.primary : outOfStock ? '#F1F5F9' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.primary : outOfStock ? '#E2E8F0' : selectedSize ? '#CBD5E1' : '#F87171',
                        minWidth: 42,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: Typography.fontFamily.bold,
                          color: isSelected ? '#FFFFFF' : outOfStock ? '#CBD5E1' : '#0F172A',
                          textDecorationLine: outOfStock ? 'line-through' : 'none',
                        }}
                      >
                        {s.size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Options List */}
            {(() => {
              const flashmartAvailable = product?.fulfillmentOptions?.flashmart !== undefined
                ? !!product.fulfillmentOptions.flashmart?.available
                : !!(product?.isWarehouseListing && (product?.isNearby ?? true));

              const directStoreAvailable = product?.fulfillmentOptions?.directStore !== undefined
                ? !!product.fulfillmentOptions.directStore?.available
                : !!(product?.availableInShop || (!product?.isWarehouseListing && (product?.isNearby ?? false) && (product?.isInstantBuyable ?? false)));

              const merchantShopName = product?.shopMerchantName || product?.merchantId?.shopName || product?.merchantName || product?.shopName || 'Store';
              const hasAnyTryAndBuy = flashmartAvailable || directStoreAvailable;

              return (
                <View style={{ gap: 10, marginBottom: 18 }}>
                  {/* Option 1: Warehouse Try & Buy - Only show if available */}
                  {flashmartAvailable && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedFulfillmentMode('flashmart');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.fulfillmentCard,
                        selectedFulfillmentMode === 'flashmart' && styles.fulfillmentCardActiveFlashmart,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons
                            name={selectedFulfillmentMode === 'flashmart' ? "radio-button-on" : "radio-button-off"}
                            size={18}
                            color={selectedFulfillmentMode === 'flashmart' ? '#10B981' : '#94A3B8'}
                          />
                          <Ionicons name="flash" size={16} color="#10B981" />
                          <Text style={styles.fulfillmentTitle}>
                            FlashMart Hub (Warehouse)
                          </Text>
                        </View>
                        <View style={[styles.fulfillmentBadge, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={[styles.fulfillmentBadgeText, { color: '#059669' }]}>
                            45 MINS
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.fulfillmentSub, { marginLeft: 26 }]}>
                        ⚡ Try & Buy at doorstep from FlashFits Hub
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Option 2: Dynamic Merchant Store Try & Buy - Only show if available */}
                  {directStoreAvailable && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedFulfillmentMode('directStore');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.fulfillmentCard,
                        selectedFulfillmentMode === 'directStore' && styles.fulfillmentCardActiveStore,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                          <Ionicons
                            name={selectedFulfillmentMode === 'directStore' ? "radio-button-on" : "radio-button-off"}
                            size={18}
                            color={selectedFulfillmentMode === 'directStore' ? '#F59E0B' : '#94A3B8'}
                          />
                          <Ionicons name="storefront-outline" size={16} color="#F59E0B" />
                          <Text style={styles.fulfillmentTitle} numberOfLines={1}>
                            {merchantShopName} (Shop)
                          </Text>
                        </View>
                        <View style={[styles.fulfillmentBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.fulfillmentBadgeText, { color: '#D97706' }]}>
                            45–60 MINS
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.fulfillmentSub, { marginLeft: 26 }]}>
                        🏪 Doorstep Try & Buy directly from {merchantShopName}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* If neither Try & Buy option is available */}
                  {!hasAnyTryAndBuy && (
                    <View style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 12, color: '#64748B', fontFamily: Typography.fontFamily.medium }}>
                        ⚡ Doorstep Try & Buy is currently unavailable for this item in your area. You can order with Pan-India Courier delivery below.
                      </Text>
                    </View>
                  )}

                  {/* Option 3: Pan-India Courier */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedFulfillmentMode('courier');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.fulfillmentCard,
                      selectedFulfillmentMode === 'courier' && styles.fulfillmentCardActiveCourier,
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons
                          name={selectedFulfillmentMode === 'courier' ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={selectedFulfillmentMode === 'courier' ? theme.primary : '#94A3B8'}
                        />
                        <Ionicons name="cube-outline" size={16} color="#64748B" />
                        <Text style={styles.fulfillmentTitle}>Pan-India Courier</Text>
                      </View>
                      <View style={[styles.fulfillmentBadge, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.fulfillmentBadgeText, { color: '#475569' }]}>2–4 DAYS</Text>
                      </View>
                    </View>
                    <Text style={[styles.fulfillmentSub, { marginLeft: 26 }]}>
                      📦 Doorstep Shipping Across India
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Confirm Add Button */}
            <TouchableOpacity
              style={{
                height: 48,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                overflow: 'hidden',
                position: 'relative',
              }}
              onPress={handleAddToCartSelectedMode}
              activeOpacity={0.85}
              disabled={isAdding}
            >
              <LinearGradient
                colors={[theme.dark || '#000000', theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {isAdding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="bag-add-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: Typography.fontFamily.bold }}>
                    {selectedFulfillmentMode === 'flashmart'
                      ? 'Add to Warehouse Cart'
                      : selectedFulfillmentMode === 'directStore'
                      ? `Add to ${product?.shopMerchantName || product?.merchantId?.shopName || product?.merchantName || product?.shopName || 'Shop'} Cart`
                      : 'Confirm & Add to Bag'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Limit Error Modal */}
      <Modal
        visible={limitErrorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLimitErrorModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 20, width: '100%', maxWidth: 340, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="warning-outline" size={26} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 16, fontFamily: Typography.fontFamily.bold, color: '#0F172A', marginBottom: 6, textAlign: 'center' }}>Cart limit reached</Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 22, lineHeight: 18 }}>
              {limitErrorMessage || "You can only have a maximum of 6 Try & Buy items per merchant. Please checkout your existing cart first to add more."}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, width: '100%', paddingVertical: 13, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                setLimitErrorModalVisible(false);
                router.push({ pathname: '/cart', params: { tab: 'instant' } } as any);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: Typography.fontFamily.bold }}>Go to cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Zoom Modal */}
      <ImageViewing
        images={images.map((img: any) => ({ uri: img.url }))}
        imageIndex={zoomIndex}
        visible={isZoomVisible}
        onRequestClose={() => setIsZoomVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
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
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Typography.fontFamily.semiBold,
  },
  backButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.semiBold,
    flex: 1,
  },
  viewCartText: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.4,
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
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    textAlign: 'center',
    marginHorizontal: 8,
    letterSpacing: -0.1,
  },
  staticHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 110,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  staticIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  imageGallery: {
    height: IMAGE_HEIGHT,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    top: 58,
    right: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 0.3,
  },
  imageBottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  pagination: {
    position: 'absolute',
    bottom: 32,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeDot: {
    width: 18,
    borderRadius: 2.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    backgroundColor: '#FFFFFF',
    marginTop: -28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  brand: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  name: {
    fontSize: 16.5,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    color: '#475569',
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  mrp: {
    fontSize: 12.5,
    color: '#B0B8C4',
    textDecorationLine: 'line-through',
    fontFamily: Typography.fontFamily.regular,
  },
  discountBadge: {
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 12,
    color: '#059669',
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.1,
  },
  statusPillWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  statusPillWarningText: {
    color: '#B45309',
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
  },
  statusPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF7',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  statusPillSuccessText: {
    color: '#059669',
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    marginBottom: 9,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
  },
  selectionRow: {
    marginBottom: 18,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  colorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  chipText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  sizeChip: {
    width: 40,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    overflow: 'hidden',
  },
  disabledSizeChip: {
    opacity: 0.35,
    backgroundColor: '#F1F5F9',
  },
  sizeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#334155',
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
    height: 1,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '-20deg' }],
  },
  deliveryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FAFBFC',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 22,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deliveryText: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    letterSpacing: 0.05,
  },
  deliveryDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E7EBEF',
  },
  description: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#64748B',
    fontFamily: Typography.fontFamily.regular,
    letterSpacing: 0.05,
  },
  spacer: {
    height: 110,
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
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F4F6F8',
  },
  wishlistBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  cartBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cartBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  relatedSection: {
    marginTop: 30,
    marginBottom: 6,
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
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyRelated: {
    padding: 18,
    backgroundColor: '#FAFBFC',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRelatedText: {
    fontSize: 12,
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
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
  },
  toggleTextCol: {
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
  },
  toggleSublabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
  },
  inlineShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 15.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 18,
  },
  deliveryOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  deliveryOptionBtnDisabled: {
    backgroundColor: '#FAFBFC',
    borderColor: '#F1F5F9',
  },
  deliveryOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deliveryOptionTexts: {
    flex: 1,
  },
  deliveryOptionTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
    marginBottom: 2,
  },
  deliveryOptionSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
  },
  deliveryOptionReason: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#EF4444',
    marginTop: 4,
  },
  merchantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    backgroundColor: '#FAFBFC',
    borderRadius: 14,
    marginBottom: 18,
  },
  fulfillmentSection: {
    marginBottom: 16,
  },
  fulfillmentGrid: {
    gap: 10,
    marginTop: 8,
  },
  fulfillmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  fulfillmentCardActiveFlashmart: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  fulfillmentCardActiveStore: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  fulfillmentCardActiveCourier: {
    borderColor: '#64748B',
    backgroundColor: '#F8FAFC',
  },
  fulfillmentCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  fulfillmentTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  disabledText: {
    color: '#94A3B8',
  },
  fulfillmentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontFamily: Typography.fontFamily.medium,
  },
  fulfillmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fulfillmentBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  merchantLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F6',
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
    marginLeft: 11,
  },
  merchantLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  merchantName: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#1C1917',
  },
  cartIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    minWidth: 17,
    height: 17,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartInstantBadge: {
    top: -3,
    right: -3,
    zIndex: 2,
  },
  cartCourierBadge: {
    bottom: -2,
    right: -3,
    zIndex: 1,
  },
  cartBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.1,
  },
});

export default ProductDetailPage;