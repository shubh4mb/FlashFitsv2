import { createRazorpayOrder, verifyPayment } from '@/api/orders';
import logo from '@/assets/images/logo/logo.png';
import AddressSelectorModal from '@/components/common/AddressSelectorModal';
import CartItem from '@/components/common/CartItem';
import CouponInput from '@/components/common/CouponInput';
import Loader from '@/components/common/Loader';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import RazorpayWebView from '@/components/common/RazorpayWebView';
import SwipeToBuy from '@/components/common/SwipeToBuy';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useAlert, useToast } from '@/context/AlertContext';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { useGender } from '@/context/GenderContext';
import { useOffers } from '@/context/OffersContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CartTab = 'instant' | 'standard';

export default function CartScreen() {
  const { cart, loading, clearCart, deliveryTip, setDeliveryTip, moveToCourier, refreshCart, applyOffer, removeOffer } = useCart();
  const showToast = useToast();
  const showAlert = useAlert();
  const { courierCart, loading: courierLoading, clearCart: clearCourierCart, refreshCart: refreshCourierCart, applyOfferCourier, removeOfferCourier } = useCourierCart();
  const { selectedGender } = useGender();
  const { selectedAddress, tbAvailable, deliveryAvailable } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const { tab, merchantId: targetMerchantId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<CartTab>((tab === 'courier' ? 'standard' : 'instant'));
  const [modalVisible, setModalVisible] = useState(false);
  const { computeBestOffers, couponCode, appliedOffers } = useOffers();

  // Razorpay & Swipe to Buy State
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [resetSwipeKey, setResetSwipeKey] = useState(0);
  const checkoutPromiseRef = useRef<{ resolve: (value: any) => void; reject: (reason?: any) => void } | null>(null);
  const openRazorpayCheckout = (options: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      setRazorpayOptions(options);
      checkoutPromiseRef.current = { resolve, reject };
      setShowRazorpay(true);
    });
  };

  const handleRazorpaySuccess = (data: any) => {
    setShowRazorpay(false);
    if (checkoutPromiseRef.current) {
      checkoutPromiseRef.current.resolve(data);
      checkoutPromiseRef.current = null;
    }
  };

  const handleRazorpayError = (error: any) => {
    setShowRazorpay(false);
    if (checkoutPromiseRef.current) {
      checkoutPromiseRef.current.reject(error);
      checkoutPromiseRef.current = null;
    }
  };

  const handleRazorpayClose = () => {
    setShowRazorpay(false);
    if (checkoutPromiseRef.current) {
      checkoutPromiseRef.current.reject({ code: 'PAYMENT_CANCELLED' });
      checkoutPromiseRef.current = null;
    }
  };

  const scrollX = useRef(new Animated.Value(0)).current;
  const horizontalScrollRef = useRef<ScrollView>(null);

  // Optimized merchant carts memoization with O(N) precomputed timestamps
  const merchantCarts = useMemo(() => {
    if (!cart?.merchantCarts?.length) return [];
    const mapped = cart.merchantCarts.map((mc: any) => {
      let maxTime = 0;
      if (mc.items && mc.items.length > 0) {
        for (let i = 0; i < mc.items.length; i++) {
          const item = mc.items[i];
          let t = 0;
          if (item.updatedAt) {
            t = new Date(item.updatedAt).getTime();
          } else if (item.createdAt) {
            t = new Date(item.createdAt).getTime();
          } else if (item.addedAt) {
            t = new Date(item.addedAt).getTime();
          } else if (item._id && typeof item._id === 'string' && item._id.length === 24) {
            t = parseInt(item._id.substring(0, 8), 16) * 1000;
          }
          if (t > maxTime) maxTime = t;
        }
      }
      return { mc, maxTime };
    });
    mapped.sort((a, b) => b.maxTime - a.maxTime);
    return mapped.map(entry => entry.mc);
  }, [cart?.merchantCarts]);

  // Calculate initial index based on passed merchantId
  const initialIndex = useMemo(() => {
    if (targetMerchantId && merchantCarts.length > 0) {
      const idx = merchantCarts.findIndex((mc: any) => mc.merchantId === targetMerchantId);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  }, [targetMerchantId, merchantCarts]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Keep activeIndex synced if initialIndex changes upon loading
  useEffect(() => {
    if (initialIndex > 0) {
      setActiveIndex(initialIndex);
      setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      }, 100);
    }
  }, [initialIndex]);

  const tbItems = cart?.items || [];
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScrollEndDrag = (event: any) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  // Refresh cart on focus
  useFocusEffect(
    useCallback(() => {
      refreshCart();
      refreshCourierCart();
    }, [refreshCart, refreshCourierCart])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshCart(), refreshCourierCart()]);
    setRefreshing(false);
  };

  const handleTryBuyPlaceOrder = async (merchantId: string) => {
    const merchantCart = cart?.merchantCarts?.find(mc => mc.merchantId === merchantId);
    if (!merchantCart) return;

    if (!selectedAddress) {
      showToast({ message: 'Please select a delivery address.', type: 'warning' });
      setModalVisible(true);
      setResetSwipeKey(prev => prev + 1);
      return;
    }

    if (merchantCart.deliveryDetails?.isEligibleForTryBuy === false) {
      showToast({ message: 'This store is too far for Try & Buy. Please change address.', type: 'warning' });
      setModalVisible(true);
      setResetSwipeKey(prev => prev + 1);
      return;
    }

    if (merchantCart.merchantDetails?.isOnline === false) {
      showToast({ message: 'This store is currently offline.', type: 'error' });
      setResetSwipeKey(prev => prev + 1);
      return;
    }

    setPlacingOrder(true);
    try {
      const addressId = selectedAddress._id || (selectedAddress as any)?.id;
      const result = await createRazorpayOrder(
        addressId,
        deliveryTip,
        couponCode || undefined,
        merchantId,
        'online'
      );

      if (result.isFreeOrder) {
        await refreshCart();
        showAlert({
          title: '✅ Order Placed!',
          message: `Order #${result.orderId?.slice(-6).toUpperCase()} placed.`,
          type: 'success',
          buttons: [{
            text: 'Go to Home',
            onPress: () => router.replace('/(tabs)' as any),
          }],
        });

        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Order Placed Successfully! 🛍️',
            body: `Your order #${result.orderId?.slice(-6).toUpperCase()} has been confirmed.`,
            data: { orderId: result.orderId },
          },
          trigger: null,
        });
        return;
      }

      const options = {
        description: 'Try & Buy Delivery Fee',
        currency: 'INR',
        key: result.key_id,
        amount: result.amount,
        name: 'FlashFits',
        order_id: result.razorpayOrderId,
        prefill: {
          contact: result.contact,
          name: result.name,
          email: result.email,
        },
        theme: { color: theme.primary },
      };

      const paymentData = await openRazorpayCheckout(options);

      const verifyResult = await verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        orderId: result.orderId,
      });

      if (verifyResult.success) {
        await refreshCart();
        showAlert({
          title: '✅ Order Placed!',
          message: `Order #${result.orderId?.slice(-6).toUpperCase()} placed.`,
          type: 'success',
          buttons: [{
            text: 'Go to Home',
            onPress: () => router.replace('/(tabs)' as any),
          }],
        });

        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Order Placed Successfully! 🛍️',
            body: `Your order #${result.orderId?.slice(-6).toUpperCase()} has been confirmed.`,
            data: { orderId: result.orderId },
          },
          trigger: null,
        });
      }
    } catch (error: any) {
      if (error?.code === 'PAYMENT_CANCELLED') {
        showToast({ message: 'Payment cancelled.', type: 'warning' });
      } else {
        showToast({ message: error?.message || 'Payment failed. Please try again.', type: 'error' });
      }
      setResetSwipeKey(prev => prev + 1);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleStandardCheckout = () => {
    if (!selectedAddress) {
      setModalVisible(true);
      return;
    }
    router.push({ pathname: '/checkout', params: { type: 'courier' } } as any);
  };

  const handleMoveToCourier = async (merchantId: string) => {
    try {
      await moveToCourier({ merchantId });
      await refreshCourierCart();
    } catch (error) {
      console.error("Move to courier failed:", error);
    }
  };

  const scrollToMerchant = (index: number) => {
    horizontalScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  // Standard (Courier) Cart Data
  const courierItems = courierCart?.items || [];
  const courierTotals = courierCart?.totals;
  const courierAppliedOffers = courierCart?.appliedOffers;
  const couponDiscount = appliedOffers?.totalDiscount || 0;
  const courierTotal = courierTotals?.totalPayable || (
    courierItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) +
    (courierItems.length > 0 ? 40 : 0)
  );

  const currentMerchantCart = merchantCarts[activeIndex];


  if ((loading || courierLoading) && merchantCarts.length === 0 && courierItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Loader size={60} />
      </View>
    );
  }

  const isUpdating = loading || courierLoading;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>Shopping Cart</ThemedText>
          <TouchableOpacity
            onPress={() => {
              if (activeTab === 'instant') {
                if (currentMerchantCart) {
                  clearCart(currentMerchantCart.merchantId);
                }
              } else {
                clearCourierCart();
              }
            }}
            disabled={(activeTab === 'instant' ? merchantCarts : courierItems).length === 0}
          >
            <Text style={[styles.clearText, { color: (activeTab === 'instant' ? merchantCarts : courierItems).length > 0 ? '#EF4444' : '#CBD5E1' }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'instant' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('instant')}
          >
            <Ionicons name="flash" size={16} color={activeTab === 'instant' ? theme.primary : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'instant' && { color: theme.primary, fontWeight: '800' }]}>Try & Buy</Text>
            {merchantCarts.length > 0 && <View style={[styles.badge, { backgroundColor: activeTab === 'instant' ? theme.primary : '#CBD5E1' }]}><Text style={styles.badgeText}>{merchantCarts.length}</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'standard' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('standard')}
          >
            <Ionicons name="cart" size={18} color={activeTab === 'standard' ? theme.primary : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'standard' && { color: theme.primary, fontWeight: '800' }]}>Cart</Text>
            {courierItems.length > 0 && <View style={[styles.badge, { backgroundColor: activeTab === 'standard' ? theme.primary : '#CBD5E1' }]}><Text style={styles.badgeText}>{courierItems.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Merchant Hub (Logo Navigation) - Only for Instant Cart */}
        {activeTab === 'instant' && merchantCarts.length > 1 && (
          <View style={styles.merchantHub}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.merchantHubContent,
                merchantCarts.length <= 4 && { justifyContent: 'center', flex: 1 }
              ]}
            >
              {merchantCarts.map((mc, index) => (
                <TouchableOpacity
                  key={mc.merchantId}
                  onPress={() => scrollToMerchant(index)}
                  style={styles.hubWrapper}
                >
                  <View style={[
                    styles.hubLogoContainer,
                    activeIndex !== index && { opacity: 0.4, backgroundColor: 'transparent' }
                  ]}>
                    <Image source={mc.merchantId === 'flashmart' ? logo : { uri: mc.merchantDetails?.logo?.url || mc.merchantDetails?.logo }} style={styles.hubLogo} contentFit="contain" />
                  </View>
                  {activeIndex === index && <View style={styles.hubActiveLine} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>


      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'instant' ? (
          merchantCarts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="flash-outline" size={60} color={theme.primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>Your Try & Buy Cart is Empty!</ThemedText>
              <Text style={styles.emptyDesc}>Experience fashion in a flash! Add items from nearby stores to try them at home before you buy.</Text>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)' as any)}>
                <Text style={styles.exploreText}>Explore Nearby Shops</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              ref={horizontalScrollRef}
              style={{ flex: 1 }}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (index !== activeIndex) {
                  setActiveIndex(index);
                }
              }}
            >
              {merchantCarts.map((mc, index) => {
                const mTotals = mc.totals;
                const mOffers = mc.appliedOffers;
                const isOffline = mc.merchantDetails?.isOnline === false;
                const isEligible = mc.deliveryDetails?.isEligibleForTryBuy !== false;

                return (
                  <View key={mc.merchantId} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                    <PremiumRefreshWrapper
                      scrollY={scrollY}
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    >
                      <Animated.ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.slideContent}
                        scrollEventThrottle={16}
                        keyboardShouldPersistTaps="handled"
                      >
                        {/* Delivery Address Header Card */}
                        <TouchableOpacity
                          style={styles.addressHeaderCard}
                          activeOpacity={0.8}
                          onPress={() => setModalVisible(true)}
                        >
                          <View style={styles.addressHeaderLeft}>
                            <View style={[styles.addressIconCircle, { backgroundColor: theme.primary + '15' }]}>
                              <Ionicons name="location" size={18} color={theme.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.addressSubHeader}>Delivering Try & Buy to</Text>
                              <Text style={styles.addressMainText} numberOfLines={1}>
                                {selectedAddress
                                  ? `${selectedAddress.addressType ? selectedAddress.addressType.toUpperCase() + ': ' : ''}${selectedAddress.addressLine1 || selectedAddress.street || selectedAddress.city || 'Saved Address'}`
                                  : 'Tap to select delivery address'}
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.changePill, { borderColor: theme.primary + '30', backgroundColor: theme.primary + '08' }]}>
                            <Text style={[styles.changePillText, { color: theme.primary }]}>Change</Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                          </View>
                        </TouchableOpacity>

                        {/* Merchant Header Branding */}
                        <TouchableOpacity
                          style={styles.brandingHeader}
                          activeOpacity={0.7}
                          onPress={() => router.push(`/merchant/${mc.merchantId}` as any)}
                        >
                          <View style={styles.brandingInfo}>
                            <Text style={styles.brandingShopName}>{mc.merchantDetails?.shopName} ({mc.items.reduce((sum: number, i: any) => sum + i.quantity, 0)}/6)</Text>
                            <View style={styles.brandingStatusRow}>
                              {!isEligible ? (
                                <Text style={[styles.statusTag, { color: '#F59E0B', backgroundColor: '#FEF3C7' }]}>Too Far</Text>
                              ) : isOffline ? (
                                <View style={{ gap: 4, alignItems: 'flex-start' }}>
                                  <Text style={[styles.statusTag, { color: '#EF4444', backgroundColor: '#FEE2E2' }]}>Shop Closed</Text>
                                  <Text style={[styles.statusTag, { color: '#EF4444', backgroundColor: '#ffffffff', fontSize: 8 }]}>Reopens tomorrow at 9 AM</Text>
                                </View>
                              ) : (
                                <Text style={[styles.statusTag, { color: '#10B981', backgroundColor: '#DCFCE7' }]}>Try & Buy</Text>
                              )}
                              {isEligible && !isOffline && (
                                <Text style={styles.brandingMins}>Delivery in {mc.deliveryDetails?.estimatedTime || '25-30'} mins</Text>
                              )}
                            </View>
                          </View>
                          <Image source={mc.merchantId === 'flashmart' ? logo : { uri: mc.merchantDetails?.logo?.url || mc.merchantDetails?.logo }} style={styles.brandingLogo} contentFit="contain" />
                        </TouchableOpacity>

                        {!isEligible && (
                          <View style={styles.warningBanner}>
                            <View style={styles.warningHeaderRow}>
                              <Ionicons name="location-outline" size={24} color="#D97706" />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.warningTitle, { fontFamily: Typography.fontFamily.bold }]}>You're a bit far from this store</Text>
                                <Text style={[styles.warningText, { fontFamily: Typography.fontFamily.medium }]}>
                                  This store is too far for Try & Buy delivery at your current location. To proceed, please select a closer address or move these items to the standard cart.
                                </Text>
                              </View>
                            </View>
                            <View style={styles.warningActionsContainer}>
                              <TouchableOpacity
                                style={[styles.warningActionButton, styles.changeAddressButton]}
                                onPress={() => setModalVisible(true)}
                              >
                                <Ionicons name="map-outline" size={16} color="#0F172A" />
                                <Text style={[styles.warningActionButtonText, { fontFamily: Typography.fontFamily.bold }]}>Change Address</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.warningActionButton, styles.moveToCourierButton, { backgroundColor: theme.primary }]}
                                onPress={() => handleMoveToCourier(mc.merchantId)}
                              >
                                <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
                                <Text style={[styles.warningActionButtonText, { color: '#fff', fontFamily: Typography.fontFamily.bold }]}>Move to Courier</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {isEligible && isOffline && (
                          <View style={[styles.warningBanner, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                            <View style={styles.warningHeaderRow}>
                              <Ionicons name="moon-outline" size={24} color="#EF4444" />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.warningTitle, { color: '#B91C1C', fontFamily: Typography.fontFamily.bold }]}>Merchant is Offline</Text>
                                <Text style={[styles.warningText, { color: '#DC2626', fontFamily: Typography.fontFamily.medium }]}>
                                  This store is currently offline. You can keep these items in your Try & Buy cart, and checkout when the store is back online.
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}

                        {/* Items */}
                        <View style={styles.itemsContainer}>
                          {mc.items.map((item) => (
                            <CartItem key={item._id} item={item} />
                          ))}
                        </View>

                        {/* Offers Section */}
                        {mOffers?.availableOffers?.length > 0 && (
                          <View style={styles.offersSection}>
                            <View style={styles.offersHeaderRow}>
                              <View style={styles.offersHeaderTitleContainer}>
                                <MaterialCommunityIcons name="ticket-percent-outline" size={22} color={theme.primary} />
                                <Text style={[styles.offersSectionTitle, { fontFamily: Typography.fontFamily.bold }]}>Offers & Benefits</Text>
                              </View>
                              <View style={[styles.offersCountBadge, { backgroundColor: theme.primary + '10' }]}>
                                <Text style={[styles.offersCountText, { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                                  {mOffers.availableOffers.length} {mOffers.availableOffers.length === 1 ? 'Offer' : 'Offers'}
                                </Text>
                              </View>
                            </View>

                            {mOffers.availableOffers.map((offer: any) => {
                              const isApplied = mOffers.appliedOffers?.some((o: any) => (o._id?.toString() || o.offerId?.toString()) === (offer._id?.toString() || offer.offerId?.toString()));

                              const minCartValue = offer.conditions?.minCartValue || 0;
                              const minOrderValue = offer.conditions?.minOrderValue || 0;
                              const threshold = Math.max(minCartValue, minOrderValue);
                              const showTryAndBuyWarning = threshold > 0;

                              return (
                                <View key={offer._id} style={{ marginBottom: 12 }}>
                                  <View
                                    style={[
                                      styles.offerCard,
                                      { marginBottom: 0 },
                                      isApplied && {
                                        borderColor: theme.primary,
                                        backgroundColor: theme.primary + '05',
                                      },
                                      showTryAndBuyWarning && {
                                        borderBottomLeftRadius: 0,
                                        borderBottomRightRadius: 0,
                                        borderBottomWidth: 0,
                                      }
                                    ]}
                                  >
                                    {isApplied && (
                                      <View style={[styles.appliedBadge, { backgroundColor: theme.primary }]}>
                                        <Ionicons name="checkmark" size={10} color="#fff" />
                                      </View>
                                    )}

                                    <View style={styles.offerCardLeft}>
                                      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '12' }]}>
                                        <MaterialCommunityIcons name="ticket-percent" size={22} color={theme.primary} />
                                      </View>
                                      <View style={styles.offerDetails}>
                                        <View style={styles.codeRow}>
                                          <View style={[styles.codeBadge, { borderColor: theme.primary + '30', backgroundColor: theme.primary + '08' }]}>
                                            <Text style={[styles.codeText, { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                                              {offer.couponCode || offer.title}
                                            </Text>
                                          </View>
                                          {!!offer.discountAmount && (
                                            <Text style={[styles.saveTag, { color: '#10B981', fontFamily: Typography.fontFamily.bold }]}>
                                              Save ₹{offer.discountAmount}
                                            </Text>
                                          )}
                                        </View>
                                        <Text style={[styles.offerDescription, { fontFamily: Typography.fontFamily.medium }]} numberOfLines={2}>
                                          {offer.description || `Get ₹${offer.discountAmount} off on your order`}
                                        </Text>
                                      </View>
                                    </View>

                                    <View style={styles.offerCardRight}>
                                      {isApplied ? (
                                        <TouchableOpacity
                                          onPress={() => removeOffer(offer._id)}
                                          activeOpacity={0.7}
                                          style={[styles.actionBtn, styles.removeBtn]}
                                        >
                                          <Text style={[styles.removeBtnText, { fontFamily: Typography.fontFamily.bold }]}>Remove</Text>
                                        </TouchableOpacity>
                                      ) : (
                                        <TouchableOpacity
                                          onPress={() => applyOffer(offer._id)}
                                          activeOpacity={0.7}
                                          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                                        >
                                          <Text style={[styles.applyBtnText, { fontFamily: Typography.fontFamily.bold }]}>Apply</Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </View>

                                  {showTryAndBuyWarning && (
                                    <View style={styles.warningContainer}>
                                      <Ionicons name="warning" size={14} color="#D97706" />
                                      <Text style={styles.warningText}>
                                        Try & Buy Note: You must keep items worth at least ₹{threshold} during final payment to claim this offer.
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {/* Coupon Input */}
                        <CouponInput
                          cartContext={{
                            items: mc.items,
                            subtotal: mTotals?.subtotal,
                            merchantTotals: {
                              [mc.merchantId]: mTotals?.subtotal,
                            },
                          }}
                          themeColor={theme.primary}
                          orderType="try_and_buy"
                          appliedOffersData={mc.appliedOffers}
                        />


                        {/* Tip Section */}
                        <View style={styles.slideTipSection}>
                          <Text style={styles.tipSectionTitle}>Tip your Delivery Partner</Text>
                          <View style={styles.tipRow}>
                            {[10, 20, 50].map((amount) => (
                              <TouchableOpacity
                                key={amount}
                                style={[styles.tipPill, deliveryTip === amount && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}
                                onPress={() => setDeliveryTip(deliveryTip === amount ? 0 : amount)}
                              >
                                <Text style={[styles.tipPillText, deliveryTip === amount && { color: theme.primary }]}>₹{amount}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>


                        {/* Bill Summary */}
                        <View style={styles.premiumBill}>
                          <Text style={styles.billTitle}>Bill Summary</Text>
                          <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{mTotals?.subtotal}</Text></View>
                          {mOffers?.totalDiscount > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Offer Applied</Text><Text style={[styles.billValue, { color: theme.primary, fontWeight: '700' }]}>- ₹{mOffers.totalDiscount}</Text></View>}

                          {mOffers?.totalDiscount > 0 && (
                            <View style={[styles.billRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#F1F5F9' }]}>
                              <Text style={[styles.billLabel, { fontWeight: '700', color: '#0F172A' }]}>Total after offer</Text>
                              <Text style={[styles.billValue, { fontWeight: '800' }]}>₹{Math.max(0, (mTotals?.subtotal || 0) - (mOffers?.totalDiscount || 0)).toFixed(0)}</Text>
                            </View>
                          )}

                          <View style={styles.billDivider} />

                          <View style={styles.payLaterSection}>
                            <Ionicons name="time-outline" size={14} color="#64748B" />
                            <Text style={styles.payLaterText}>Keep what you love, pay only for those after trying, return the rest (Max: ₹{Math.max(0, (mTotals?.subtotal || 0) - (mOffers?.totalDiscount || 0)).toFixed(0)})</Text>
                          </View>

                          {isEligible && (
                            <>
                              <Text style={styles.upfrontTitle}>Payable Now</Text>
                              <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Delivery Charge (Partial refundable)</Text>
                                <Text style={[styles.billValue, mOffers?.freeDelivery && { color: '#10B981', fontWeight: '700' }]}>
                                  {mOffers?.freeDelivery ? 'FREE' : `₹${mTotals?.totalDeliveryCharge + mTotals?.totalReturnCharge}`}
                                </Text>
                              </View>
                              {mOffers?.freeDelivery ? (
                                <Text style={[styles.billSubText, { color: '#10B981', fontWeight: '700', marginTop: -6, marginBottom: 10 }]}>
                                  Free Delivery applied via Offer!
                                </Text>
                              ) : (
                                mTotals?.totalReturnCharge > 0 && (
                                  <Text style={styles.billSubText}>₹{mTotals.totalReturnCharge} will be deducted from total, if nothing is returned</Text>
                                )
                              )}
                              {mTotals?.serviceGST > 0 && (
                                <View style={styles.billRow}><Text style={styles.billLabel}>Platform GST</Text><Text style={styles.billValue}>₹{Math.round(mTotals?.serviceGST || 0)}</Text></View>
                              )}
                              {deliveryTip > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Rider Tip</Text><Text style={styles.billValue}>₹{deliveryTip}</Text></View>}

                              <View style={[styles.billRow, { marginTop: 12 }]}>
                                <Text style={styles.grandTotalLabel}>Total Payable Now</Text>
                                <Text style={[styles.grandTotalValue, { color: theme.primary }]}>₹{Math.max(0, Math.round(mTotals?.totalUpfrontPayable || 0))}</Text>
                              </View>
                            </>
                          )}
                        </View>

                        <View style={styles.footer}>
                          <Image source={logo} style={styles.footerLogo} blurRadius={3} contentFit="contain" />
                          <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                          <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
                        </View>
                      </Animated.ScrollView>
                    </PremiumRefreshWrapper>
                  </View>
                );
              })}
            </ScrollView>
          )
        ) : (
          /* Standard Cart Section */
          courierItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="cart-outline" size={60} color={theme.primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>Your Shopping Cart{'\n'}is Empty</ThemedText>
              <Text style={styles.emptyDesc}>Find your next favorite outfit. Explore our latest arrivals and exclusive collections today.</Text>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)/explore' as any)}>
                <Text style={styles.exploreText}>Explore Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <PremiumRefreshWrapper
              scrollY={scrollY}
              refreshing={refreshing}
              onRefresh={onRefresh}
            >
              <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.standardContent}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.standardBanner}>
                  <MaterialCommunityIcons name="truck-delivery" size={20} color="#7C3AED" />
                  <Text style={styles.standardBannerText}>Standard delivery across India • Flat ₹40</Text>
                </View>

                <View style={styles.itemsContainer}>
                  {courierItems.map((item) => (
                    <CartItem key={item._id} item={item} isCourier={true} />
                  ))}
                </View>

                {/* Courier Offers Section */}
                {courierAppliedOffers?.availableOffers?.length > 0 && (
                  <View style={styles.offersSection}>
                    <View style={styles.offersHeaderRow}>
                      <View style={styles.offersHeaderTitleContainer}>
                        <MaterialCommunityIcons name="ticket-percent-outline" size={22} color={theme.primary} />
                        <Text style={[styles.offersSectionTitle, { fontFamily: Typography.fontFamily.bold }]}>Offers & Benefits</Text>
                      </View>
                      <View style={[styles.offersCountBadge, { backgroundColor: theme.primary + '10' }]}>
                        <Text style={[styles.offersCountText, { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                          {courierAppliedOffers.availableOffers.length} {courierAppliedOffers.availableOffers.length === 1 ? 'Offer' : 'Offers'}
                        </Text>
                      </View>
                    </View>

                    {courierAppliedOffers.availableOffers.map((offer: any) => {
                      const isApplied = courierAppliedOffers.appliedOffers?.some((o: any) => (o._id?.toString() || o.offerId?.toString()) === (offer._id?.toString() || offer.offerId?.toString()));
                      return (
                        <View
                          key={offer._id}
                          style={[
                            styles.offerCard,
                            isApplied && {
                              borderColor: theme.primary,
                              backgroundColor: theme.primary + '05',
                            }
                          ]}
                        >
                          {isApplied && (
                            <View style={[styles.appliedBadge, { backgroundColor: theme.primary }]}>
                              <Ionicons name="checkmark" size={10} color="#fff" />
                            </View>
                          )}

                          <View style={styles.offerCardLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '12' }]}>
                              <MaterialCommunityIcons name="ticket-percent" size={22} color={theme.primary} />
                            </View>
                            <View style={styles.offerDetails}>
                              <View style={styles.codeRow}>
                                <View style={[styles.codeBadge, { borderColor: theme.primary + '30', backgroundColor: theme.primary + '08' }]}>
                                  <Text style={[styles.codeText, { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                                    {offer.couponCode || offer.title}
                                  </Text>
                                </View>
                                {!!offer.discountAmount && (
                                  <Text style={[styles.saveTag, { color: '#10B981', fontFamily: Typography.fontFamily.bold }]}>
                                    Save ₹{offer.discountAmount}
                                  </Text>
                                )}
                              </View>
                              <Text style={[styles.offerDescription, { fontFamily: Typography.fontFamily.medium }]} numberOfLines={2}>
                                {offer.description || `Get ₹${offer.discountAmount} off on your order`}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.offerCardRight}>
                            {isApplied ? (
                              <TouchableOpacity
                                onPress={() => removeOfferCourier(offer._id)}
                                activeOpacity={0.7}
                                style={[styles.actionBtn, styles.removeBtn]}
                              >
                                <Text style={[styles.removeBtnText, { fontFamily: Typography.fontFamily.bold }]}>Remove</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                onPress={() => applyOfferCourier(offer._id)}
                                activeOpacity={0.7}
                                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                              >
                                <Text style={[styles.applyBtnText, { fontFamily: Typography.fontFamily.bold }]}>Apply</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Coupon Input */}
                <CouponInput
                  cartContext={{
                    items: courierItems,
                    subtotal: courierTotals?.subtotal || 0,
                    merchantTotals: courierItems.reduce((acc: Record<string, number>, item: any) => {
                      const mid = item.merchantId?._id || item.merchantId || 'unknown';
                      acc[mid] = (acc[mid] || 0) + ((item.price || 0) * (item.quantity || 1));
                      return acc;
                    }, {}),
                  }}
                  themeColor={theme.primary}
                  orderType="courier"
                  appliedOffersData={courierAppliedOffers}
                />

                <View style={styles.logisticsNote}>
                  <Ionicons name="information-circle" size={18} color="#64748B" />
                  <Text style={styles.logisticsNoteText}>
                    Standard delivery does not include the 'Try & Buy' option. Logistics are managed by our retail partners directly. {'\n'}Note: Cash on Delivery (COD) is not available.
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.billTitle}>Order Summary</Text>
                  <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{courierTotals?.subtotal || 0}</Text></View>
                  {courierAppliedOffers?.totalDiscount > 0 && <View style={styles.billRow}><Text style={[styles.billLabel, { color: theme.primary, fontWeight: '700' }]}>Offer Applied</Text><Text style={[styles.billValue, { color: theme.primary, fontWeight: '700' }]}>- ₹{courierAppliedOffers.totalDiscount}</Text></View>}
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Delivery Fee</Text>
                    <Text style={[styles.billValue, courierAppliedOffers?.freeDelivery && { color: '#10B981', fontWeight: '700' }]}>
                      {courierAppliedOffers?.freeDelivery ? 'FREE' : `₹${courierTotals?.courierDeliveryCharge || 40}`}
                    </Text>
                  </View>
                  {courierAppliedOffers?.freeDelivery && (
                    <Text style={[styles.billSubText, { color: '#10B981', fontWeight: '700', marginTop: -6, marginBottom: 10 }]}>
                      Free Delivery applied via Offer!
                    </Text>
                  )}
                  <View style={styles.billDivider} />
                  <View style={styles.billRow}>
                    <Text style={styles.grandTotalLabel}>Total Amount</Text>
                    <Text style={[styles.grandTotalValue, { color: theme.primary }]}>₹{Math.max(0, Number(courierTotal)).toFixed(0)}</Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <Image source={logo} style={styles.footerLogo} blurRadius={3} contentFit="contain" />
                  <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                  <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
                </View>
              </Animated.ScrollView>
            </PremiumRefreshWrapper>
          )
        )}
      </View>

      {/* Pinned Bottom Area */}
      {(activeTab === 'instant' ? merchantCarts.length > 0 : courierItems.length > 0) && (
        <View style={[styles.pinnedContainer, { paddingBottom: insets.bottom + 12 }]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']} style={styles.pinnedGradient} />

          {activeTab === 'instant' ? (
            <View style={{ gap: 8 }}>
              {deliveryAvailable === false || currentMerchantCart?.deliveryDetails?.isEligibleForTryBuy === false ? (
                <TouchableOpacity
                  style={[
                    styles.checkoutBtn,
                    { backgroundColor: theme.primary, flex: 1, justifyContent: 'center' }
                  ]}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={[styles.checkoutBtnText, { textAlign: 'center', fontFamily: Typography.fontFamily.bold }]}>
                    {currentMerchantCart?.deliveryDetails?.isEligibleForTryBuy === false
                      ? "Too Far From Store • Tap to Change Address"
                      : "Outside Service Area • Tap to Change Address"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <SwipeToBuy
                  onSwipeComplete={() => handleTryBuyPlaceOrder(currentMerchantCart.merchantId)}
                  disabled={currentMerchantCart?.merchantDetails?.isOnline === false || placingOrder}
                  loading={placingOrder}
                  themeColor={theme.primary}
                  resetKey={resetSwipeKey}
                  text={
                    currentMerchantCart?.merchantDetails?.isOnline === false
                      ? 'Shop Closed Now'
                      : `Swipe to Try & Buy • Pay ₹${Math.round(currentMerchantCart?.totals?.totalUpfrontPayable || 0)}`
                  }
                />
              )}
            </View>
          ) : (
            <View style={styles.pinnedInner}>
              <View>
                <Text style={styles.pinnedPrice}>₹{Math.round(courierTotal)}</Text>
                <Text style={styles.pinnedSub}>Total Payable</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: theme.primary }]}
                onPress={handleStandardCheckout}
              >
                <Text style={styles.checkoutBtnText}>Checkout Now</Text>
                <Feather name="arrow-right" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <AddressSelectorModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      <RazorpayWebView
        visible={showRazorpay}
        options={razorpayOptions}
        onSuccess={handleRazorpaySuccess}
        onError={handleRazorpayError}
        onClose={handleRazorpayClose}
      />

      {/* Loading Overlay */}
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <Loader size={40} />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  clearText: { fontSize: 13, fontWeight: '700' },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomWidth: 3 },
  tabText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  badge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  // Merchant Hub
  merchantHub: { backgroundColor: '#fff', paddingBottom: 8 },
  merchantHubContent: { paddingHorizontal: 16, gap: 12 },
  hubWrapper: { alignItems: 'center', justifyContent: 'center', height: 48 },
  hubLogoContainer: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  hubLogo: { width: '80%', height: '80%' },
  hubActiveLine: { position: 'absolute', bottom: 0, width: 24, height: 3, borderRadius: 2, backgroundColor: '#000' },

  slideContent: { padding: 12, paddingBottom: 110 },
  brandingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  brandingInfo: { flex: 1 },
  brandingShopName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  brandingStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusTag: { fontSize: 9, fontWeight: '800', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  brandingMins: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  brandingLogo: { width: 44, height: 44, borderRadius: 10 },

  warningBanner: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 12,
  },
  warningHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  warningTitle: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 11.5,
    color: '#B45309',
    lineHeight: 16,
  },
  warningActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  warningActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  changeAddressButton: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  moveToCourierButton: {
    // background dynamically styled
  },
  warningActionButtonText: {
    fontSize: 12,
    color: '#0F172A',
  },

  itemsContainer: { gap: 8, marginBottom: 14 },

  premiumBill: { backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  billTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billLabel: { fontSize: 12.5, color: '#64748B' },
  billValue: { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  billSubText: { fontSize: 8, color: '#64748B', marginTop: -4, marginBottom: 6, fontWeight: '500', marginLeft: 0 },
  billDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

  payLaterSection: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 10, marginBottom: 12 },
  payLaterText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  upfrontTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  grandTotalValue: { fontSize: 17, fontWeight: '900' },

  slideTipSection: { marginTop: 12, padding: 12, backgroundColor: '#fff', borderRadius: 16 },
  tipSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipPill: { flex: 1, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tipPillText: { fontSize: 12.5, fontWeight: '700', color: '#64748B' },

  // Standard Cart
  standardContent: { padding: 12, paddingBottom: 110 },
  standardBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3E8FF', padding: 10, borderRadius: 12, marginBottom: 12 },
  standardBannerText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  logisticsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logisticsNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    fontWeight: '500',
  },

  // Pinned Bottom
  pinnedContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 6 },
  pinnedGradient: { position: 'absolute', top: -20, left: 0, right: 0, height: 20 },
  pinnedInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinnedPrice: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  pinnedSub: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  checkoutBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 80 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 6, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  exploreButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  exploreText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2,
    marginTop: 2,
  },
  taglineText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2,
    marginTop: 2,
    opacity: 0.6,
    textShadowColor: 'rgba(209, 213, 219, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  footerLogo: {
    width: 110,
    height: 48,
    opacity: 0.25,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  offersSection: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  offersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offersHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offersSectionTitle: {
    fontSize: 14,
    color: '#0F172A',
  },
  offersCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  offersCountText: {
    fontSize: 10,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 10,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  appliedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  offerDetails: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  codeBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  saveTag: {
    fontSize: 11,
  },
  offerDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
  },
  offerCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  removeBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  removeBtnText: {
    fontSize: 11,
    color: '#EF4444',
  },
  applyBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
    borderTopWidth: 0,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
    flex: 1,
    lineHeight: 15,
  },
  addressHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  addressHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  addressIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSubHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressMainText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  changePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
