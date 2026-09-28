import { Address, getAddresses } from '@/api/address';
import { createRazorpayOrder, initiateCourierOrder, initiateCourierCheckout, verifyCourierOrderPayment, verifyPayment } from '@/api/orders';
import AddressSelectorModal from '@/components/common/AddressSelectorModal';
import CouponInput from '@/components/common/CouponInput';
import RazorpayWebView from '@/components/common/RazorpayWebView';
import { GenderThemes } from '@/constants/theme';
import { distanceInMeters, useAddress } from '@/context/AddressContext';
import { useAlert, useToast } from '@/context/AlertContext';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { useGender } from '@/context/GenderContext';
import { useOffers } from '@/context/OffersContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; merchantId?: string }>();
  const checkoutType = params.type || 'trybuy'; // 'trybuy' or 'courier'
  const checkoutMerchantId = params.merchantId;

  const { cart, refreshCart, deliveryTip, setDeliveryTip } = useCart();
  const { courierCart, refreshCart: refreshCourierCart, clearCart: clearCourierCart } = useCourierCart();
  const { selectedAddress, setSelectedAddress, locationAddress, locationLoading, userLocation, tbAvailable } = useAddress();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const showAlert = useAlert();
  const showToast = useToast();
  const { isOrderPlacementEnabled, maintenanceTitle, maintenanceMessage } = useSystemStatus();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [chosenAddress, setChosenAddress] = useState<Address | null>(selectedAddress);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');

  const [modalVisible, setModalVisible] = useState(false);
  const [showTryBuyAgreementModal, setShowTryBuyAgreementModal] = useState(false);
  const { appliedOffers, computeBestOffers, couponCode, clearAppliedOffers } = useOffers();





  // Razorpay WebView State
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);
  const [showRazorpay, setShowRazorpay] = useState(false);
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

  const offerDiscount = appliedOffers?.totalDiscount || 0;

  // Calculate totals
  const isTB = checkoutType === 'trybuy';

  // For T&B, get data from the specific merchant's cart
  const merchantCart = isTB && checkoutMerchantId
    ? cart?.merchantCarts?.find(mc => mc.merchantId === checkoutMerchantId)
    : null;
  const isEligible = merchantCart?.deliveryDetails?.isEligibleForTryBuy !== false;

  const items = isTB
    ? (merchantCart?.items || [])
    : (courierCart?.items || []);
  const hasOutOfStockItems = items.some((i: any) => i.isOutOfStock || (i.stockQuantity !== undefined && i.stockQuantity < i.quantity));
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const mrpTotal = items.reduce((a, i) => a + i.mrp * i.quantity, 0);
  const discount = mrpTotal - subtotal;

  const merchantTotals = merchantCart?.totals;
  const courierTotals = courierCart?.totals;
  const courierOfferDiscount = courierCart?.appliedOffers?.totalDiscount || 0;
  const courierFreeDelivery = !!courierCart?.appliedOffers?.freeDelivery;

  const deliveryCharge = isTB
    ? (merchantTotals?.totalDeliveryCharge || 0)
    : (courierTotals?.courierDeliveryCharge || 0);

  const returnCharge = isTB ? (merchantTotals?.totalReturnCharge || 0) : 0;
  const baseServiceGST = isTB ? (merchantTotals?.serviceGST || 0) : 0;
  const serviceGST = isTB ? Math.round(baseServiceGST) : 0;
  const merchantOffers = merchantCart?.appliedOffers;
  const tbOfferDiscount = merchantOffers?.totalDiscount || 0;
  const tipToApply = Number(deliveryTip) > 0 ? Number(deliveryTip) : (Number(merchantTotals?.deliveryTip) || 0);

  const upfrontPayable = isTB
    ? 0
    : Math.round((courierFreeDelivery ? 0 : deliveryCharge) + tipToApply);
  const totalPayableNow = isTB
    ? 0
    : Math.round(
        courierTotals?.totalPayable !== undefined
          ? (courierTotals.totalPayable + tipToApply)
          : (subtotal - courierOfferDiscount + (courierFreeDelivery ? 0 : deliveryCharge) + tipToApply)
      );
  const estimatedDeliveryAndTip = (merchantOffers?.freeDelivery ? 0 : (deliveryCharge + returnCharge)) + tipToApply;
  const payLaterAmount = isTB ? Math.round(subtotal + estimatedDeliveryAndTip) : 0;
  const finalPayable = totalPayableNow;

  // Sync local chosenAddress with global selectedAddress if it changes
  useEffect(() => {
    if (selectedAddress) {
      setChosenAddress(selectedAddress);
    }
  }, [selectedAddress]);

  // Re-evaluate best offers (coupon) for checkout cart context if couponCode is active
  useEffect(() => {
    if (couponCode && items.length > 0) {
      computeBestOffers({
        items,
        subtotal,
        merchantTotals: items.reduce((acc: Record<string, number>, item: any) => {
          const mid = item.merchantId?._id || item.merchantId || 'unknown';
          acc[mid] = (acc[mid] || 0) + ((item.price || 0) * (item.quantity || 1));
          return acc;
        }, {}),
      }, couponCode);
    }
  }, [couponCode, items, subtotal, computeBestOffers]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAddresses();
        const addrs = res?.addresses || [];
        setAddresses(addrs);

        // If no address selected yet, pick default or first
        if (!selectedAddress && addrs.length > 0) {
          const defaultAddr = addrs.find((a: Address) => a.isDefault) || addrs[0];
          setChosenAddress(defaultAddr);
          // Also set it globally so it's consistent
          setSelectedAddress(defaultAddr);
        }
      } catch (err) {
        console.error('Failed to load addresses:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showMismatch = (() => {
    if (!chosenAddress || !userLocation || !locationAddress || locationLoading) return false;

    let addrLat, addrLng;
    if (chosenAddress.location?.coordinates) {
      [addrLng, addrLat] = chosenAddress.location.coordinates;
    } else if ((chosenAddress as any).latitude !== undefined && (chosenAddress as any).longitude !== undefined) {
      addrLat = (chosenAddress as any).latitude;
      addrLng = (chosenAddress as any).longitude;
    }

    if (addrLat !== undefined && addrLng !== undefined) {
      const dist = distanceInMeters(userLocation.latitude, userLocation.longitude, Number(addrLat), Number(addrLng));
      return dist > 100;
    }

    return true;
  })();

  const handlePlaceOrder = async () => {
    if (!chosenAddress) {
      showToast({ message: 'Please select a delivery address.', type: 'warning' });
      return;
    }

    if (isOrderPlacementEnabled === false) {
      showAlert({
        title: maintenanceTitle || 'Maintenance in Progress',
        message: maintenanceMessage || 'Live ordering is temporarily paused while we prepare for launch. Please check back soon!',
        type: 'warning',
      });
      return;
    }

    if (hasOutOfStockItems) {
      showAlert({
        title: 'Items Out of Stock',
        message: 'Some items in your cart are no longer available in the requested quantity. Please remove or adjust them.',
        type: 'error'
      });
      return;
    }

    if (isTB) {
      // Validate merchant status first
      if (merchantCart?.merchantDetails?.isOnline === false) {
        showAlert({
          title: 'Store Offline',
          message: 'This merchant just switched offline. Please remove items or try again later.',
          type: 'error'
        });
        return;
      }
      // Check if user has seen Doorstep Try-On Protocol Confirmation Modal
      try {
        const hasSeen = await AsyncStorage.getItem('has_seen_try_buy_guidance');
        if (!hasSeen) {
          setShowTryBuyAgreementModal(true);
          return;
        }
      } catch (e) {
        console.log('Error checking try & buy guidance flag in checkout', e);
      }
    }

    executeOrderPlacement();
  };

  const executeOrderPlacement = async () => {
    setShowTryBuyAgreementModal(false);
    if (isTB) {
      try {
        await AsyncStorage.setItem('has_seen_try_buy_guidance', 'true');
      } catch (e) {
        console.log('Error saving try & buy guidance flag in checkout', e);
      }
    }
    if (!chosenAddress) {
      showToast({ message: 'Please select a delivery address.', type: 'warning' });
      return;
    }
    setPlacing(true);
    try {
      if (isTB) {
        // === VALIDATE MERCHANT STATUS ===
        if (merchantCart?.merchantDetails?.isOnline === false) {
          showAlert({
            title: 'Store Offline',
            message: 'This merchant just switched offline. Please remove items or try again later.',
            type: 'error'
          });
          setPlacing(false);
          return;
        }

        // === REAL RAZORPAY FLOW: Try & Buy ===
        const result = await createRazorpayOrder(chosenAddress._id, tipToApply, couponCode || undefined, checkoutMerchantId, paymentMethod);

        if (result.isFreeOrder) {
          // Free order — already placed, no payment needed
          clearAppliedOffers();
          await refreshCart();
          showToast({
            message: `Order #${result.orderId?.slice(-6).toUpperCase()} placed successfully! 🛍️`,
            type: 'success',
          });
          router.replace({
            pathname: '/order-tracking' as any,
            params: { orderId: result.orderId },
          });

          Notifications.scheduleNotificationAsync({
            content: {
              title: "Order Placed Successfully! 🛍️",
              body: `Your order #${result.orderId?.slice(-6).toUpperCase()} has been confirmed.`,
              data: { orderId: result.orderId },
            },
            trigger: null,
          });
          return;
        }

        // Open Razorpay Checkout WebView
        const options = {
          description: tipToApply > 0 ? `Try & Buy Delivery Fee + ₹${tipToApply} Tip` : 'Try & Buy Delivery Fee',
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
          theme: { color: '#0F172A' },
        };

        const paymentData = await openRazorpayCheckout(options);

        // Verify payment with backend
        const verifyResult = await verifyPayment({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          orderId: result.orderId,
        });

        if (verifyResult.success) {
          clearAppliedOffers();
          await refreshCart();
          showToast({
            message: `Order #${result.orderId?.slice(-6).toUpperCase()} placed successfully! 🛍️`,
            type: 'success',
          });
          router.replace({
            pathname: '/order-tracking' as any,
            params: { orderId: result.orderId },
          });

          Notifications.scheduleNotificationAsync({
            content: {
              title: "Order Placed Successfully! 🛍️",
              body: `Your order #${result.orderId?.slice(-6).toUpperCase()} has been confirmed.`,
              data: { orderId: result.orderId },
            },
            trigger: null,
          });
        }
      } else {
        // === REAL RAZORPAY FLOW: Courier ===
        const initRes = await initiateCourierCheckout(
          chosenAddress._id,
          tipToApply
        );

        if (initRes.isFreeOrder) {
          clearAppliedOffers();
          await refreshCourierCart();
          showToast({
            message: `Your courier order has been placed successfully! 🛍️`,
            type: 'success',
          });
          router.replace({
            pathname: '/courier-tracking' as any,
            params: { orderId: initRes.orderId },
          });
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Orders Placed Successfully! 🛍️",
              body: `Your courier order(s) have been placed successfully.`,
              data: { orderId: initRes.orderId },
            },
            trigger: null,
          });
          return;
        }

        // Open Razorpay Checkout WebView (Single Payment!)
        const options = {
          description: tipToApply > 0 ? `Courier Order Payment + ₹${tipToApply} Tip` : 'Courier Order Payment',
          currency: 'INR',
          key: initRes.key_id,
          amount: initRes.amount,
          name: 'FlashFits',
          order_id: initRes.razorpayOrderId,
          prefill: {
            contact: initRes.contact,
            name: initRes.name,
            email: initRes.email,
          },
          theme: { color: '#0F172A' },
        };

        const paymentData = await openRazorpayCheckout(options);

        const verifyResult = await verifyCourierOrderPayment({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        });

        if (verifyResult.success) {
          clearAppliedOffers();
          await refreshCourierCart();
          const targetOrderId = verifyResult.orderId || initRes.orderId;
          showToast({
            message: `Your courier order has been placed successfully! 🛍️`,
            type: 'success',
          });
          router.replace({
            pathname: '/courier-tracking' as any,
            params: { orderId: targetOrderId },
          });
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Orders Placed Successfully! 🛍️",
              body: `Your courier order(s) have been placed successfully.`,
              data: { orderId: targetOrderId },
            },
            trigger: null,
          });
        } else {
          showToast({ message: 'Failed to place courier orders. Please try again.', type: 'error' });
        }
      }
    } catch (error: any) {
      if (error?.code === 'PAYMENT_CANCELLED') {
        // User cancelled — do nothing
        return;
      }
      if (error?.response?.data?.isMaintenance) {
        showAlert({
          title: maintenanceTitle || 'Maintenance in Progress',
          message: error?.response?.data?.message || maintenanceMessage || 'Live ordering is temporarily paused while we prepare for launch.',
          type: 'warning',
        });
        return;
      }
      const msg = error.response?.data?.message || error.message || 'Something went wrong';
      if (msg.toLowerCase().includes('high traffic') || msg.toLowerCase().includes('partners are currently busy') || msg.toLowerCase().includes('riders are currently busy')) {
        showAlert({
          title: 'Riders Busy 🛵',
          message: 'All our delivery partners are currently busy in your zone. Please try placing your order again after some time.',
          type: 'warning'
        });
      } else {
        showToast({ message: msg, type: 'error' });
      }
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isTB ? 'Try & Buy Checkout' : 'Courier Checkout'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Checkout Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: isTB ? '#DCFCE7' : '#F3E8FF' }]}>
          <Ionicons name={isTB ? 'home' : 'cube'} size={16} color={isTB ? '#166534' : '#7C3AED'} />
          <Text style={[styles.typeBadgeText, { color: isTB ? '#166534' : '#7C3AED' }]}>
            {isTB ? 'Try & Buy • Platform Delivery' : 'Courier • Flat ₹40 Delivery'}
          </Text>
        </View>

        {/* Address Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            {addresses.length > 0 && (
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={[styles.changeText, { color: theme.primary }]}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {chosenAddress ? (
            <TouchableOpacity
              style={styles.addressDisplay}
              activeOpacity={0.7}
              onPress={() => setModalVisible(true)}
            >
              <View style={[styles.addressIcon, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons
                  name={chosenAddress.addressType?.toLowerCase() === 'home' ? 'home' : 'briefcase'}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <View style={styles.addressDetails}>
                <Text style={styles.addressType}>{chosenAddress.addressType}</Text>
                <Text style={styles.contactDetails}>{chosenAddress.name} • {chosenAddress.phone}</Text>
                <Text style={styles.addressLine} numberOfLines={2}>
                  {chosenAddress.addressLine1}{chosenAddress.addressLine2 ? `, ${chosenAddress.addressLine2}` : ''}
                </Text>
                <Text style={styles.addressCity}>
                  {chosenAddress.city}, {chosenAddress.state} - {chosenAddress.pincode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <View style={styles.noAddressContainer}>
              <Ionicons name="location-outline" size={32} color="#CBD5E1" />
              <Text style={styles.noAddress}>New to FlashFits? Add your delivery address to continue.</Text>
            </View>
          )}

          {!chosenAddress && (
            <TouchableOpacity
              style={[styles.addAddressMainBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/select-location' as any)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addAddressMainText}>Add Delivery Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Try & Buy Location Unavailable Warning */}
        {isTB && tbAvailable === false && (
          <View style={[styles.mismatchCard, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
            <View style={styles.mismatchHeader}>
              <Ionicons name="warning" size={18} color="#EF4444" />
              <Text style={[styles.mismatchTitle, { color: '#EF4444' }]}>Try & Buy Unavailable</Text>
            </View>
            <Text style={[styles.mismatchText, { color: '#991B1B' }]}>
              Try & Buy delivery is not serviceable at the selected address. Please switch to a different address or move items to the Standard cart to proceed.
            </Text>
          </View>
        )}

        {/* Location Mismatch Tip */}
        {showMismatch && (
          <View style={styles.mismatchCard}>
            <View style={styles.mismatchHeader}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.mismatchTitle}>Location Mismatch?</Text>
            </View>
            <Text style={styles.mismatchText}>
              We detect you are at <Text style={styles.boldText}>{locationAddress?.split(',')[0] || ''}</Text>.
              Want to ship here instead?
            </Text>
            <TouchableOpacity
              style={styles.switchLocationBtn}
              onPress={() => setSelectedAddress(null)}
            >
              <Text style={[styles.switchLocationText, { color: theme.primary }]}>Use Current Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
          </Text>
          {items.slice(0, 3).map((item, idx) => (
            <View key={item._id || idx} style={styles.summaryItem}>
              <Image
                source={{ uri: (item.image as any)?.url || item.image }}
                style={styles.summaryImage}
                contentFit="cover"
              />
              <View style={styles.summaryItemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productId?.name || 'Product'}</Text>
                <Text style={styles.itemMeta}>Qty: {item.quantity} • Size: {item.size}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={styles.moreItems}>+{items.length - 3} more items</Text>
          )}
        </View>

        {/* Final Payment Preference Selection */}
        {isTB && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Final Payment Method</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Select how you'd like to pay for the items you decide to keep after your trial session.
            </Text>
            
            <View style={styles.paymentSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentOptionBtn,
                  paymentMethod === 'online' && { borderColor: theme.primary, backgroundColor: theme.primary + '08' }
                ]}
                onPress={() => setPaymentMethod('online')}
              >
                <Ionicons name="card" size={20} color={paymentMethod === 'online' ? theme.primary : '#64748B'} />
                <Text style={[styles.paymentOptionText, paymentMethod === 'online' && { color: theme.primary, fontWeight: '700' }]}>
                  Pay Online
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentOptionBtn,
                  paymentMethod === 'cod' && { borderColor: theme.primary, backgroundColor: theme.primary + '08' }
                ]}
                onPress={() => setPaymentMethod('cod')}
              >
                <Ionicons name="cash" size={20} color={paymentMethod === 'cod' ? theme.primary : '#64748B'} />
                <Text style={[styles.paymentOptionText, paymentMethod === 'cod' && { color: theme.primary, fontWeight: '700' }]}>
                  Cash on Delivery (COD)
                </Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'cod' && (
              <View style={styles.paymentInfoNote}>
                <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                <Text style={styles.paymentInfoNoteText}>
                  COD is only available for final purchases up to ₹1000. If your kept items exceed ₹1000, you will be required to pay online after trying.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Coupons & Offers Section */}
        <CouponInput
          cartContext={{
            items,
            subtotal,
            merchantTotals: items.reduce((acc: Record<string, number>, item: any) => {
              const mid = item.merchantId?._id || item.merchantId || 'unknown';
              acc[mid] = (acc[mid] || 0) + ((item.price || 0) * (item.quantity || 1));
              return acc;
            }, {}),
          }}
          themeColor={theme.primary}
          orderType={isTB ? 'try_and_buy' : 'courier'}
          appliedOffersData={isTB ? merchantOffers : courierCart?.appliedOffers}
          onOffersUpdated={async () => {
            if (isTB) {
              await refreshCart();
            } else {
              await refreshCourierCart();
            }
          }}
        />

        {/* Bill Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bill Summary</Text>
          </View>
          <View>
            {isTB && (
              <>
                {/* --- PRODUCTS TOTAL (PAY LATER) --- */}
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>₹{subtotal}</Text>
                </View>

                {isTB && tbOfferDiscount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: '#16A34A' }]}>Offer Savings (Applied on Purchase)</Text>
                    <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '800' }]}>- ₹{tbOfferDiscount}</Text>
                  </View>
                )}

                <View style={styles.divider} />
                <View style={[styles.billRow, { marginBottom: 16 }]}>
                  <Text style={[styles.billLabel, { fontSize: 13, color: '#64748B' }]}>Pay Later (For items you decide to keep)</Text>
                  <Text style={[styles.billValue, { fontSize: 13, color: '#64748B' }]}>₹{payLaterAmount - tbOfferDiscount}</Text>
                </View>

                 {isEligible && (
                  <>
                    {/* --- POST-TRIAL SUMMARY --- */}
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 8, marginTop: 8 }}>Pay After Trial</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                      No upfront payment required! Pay for delivery, tip, and kept items after the trial session.
                    </Text>

                    {merchantOffers?.freeDelivery ? (
                      <>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Delivery Fee</Text>
                          <Text style={[styles.billValue, { color: '#10B981', fontWeight: '700' }]}>FREE</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: -6, marginBottom: 10 }}>
                          Free Delivery applied via Offer!
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Estimated Delivery Fee</Text>
                          <Text style={styles.billValue}>₹{deliveryCharge}</Text>
                        </View>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Return Handling (Refunded if all kept)</Text>
                          <Text style={styles.billValue}>₹{returnCharge}</Text>
                        </View>
                      </>
                    )}
                    {deliveryTip > 0 && (
                      <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Delivery Tip (Post-Trial)</Text>
                        <Text style={styles.billValue}>₹{deliveryTip}</Text>
                      </View>
                    )}
                    <View style={styles.divider} />
                    <View style={[styles.billRow, { marginBottom: 4 }]}>
                      <Text style={[styles.totalLabel, { color: '#10B981' }]}>Payable Upfront Now</Text>
                      <Text style={[styles.totalValue, { color: '#10B981' }]}>₹0 (FREE)</Text>
                    </View>
                  </>
                )}
              </>
            )}

            {!isTB && (
              <>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>₹{subtotal}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <Text style={[styles.billValue, courierFreeDelivery && { color: '#10B981', fontWeight: '700' }]}>
                    {courierFreeDelivery ? 'FREE' : `₹${deliveryCharge}`}
                  </Text>
                </View>
                {courierFreeDelivery && (
                  <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: -6, marginBottom: 10 }}>
                    Free Delivery applied via Offer!
                  </Text>
                )}
                {deliveryTip > 0 && (
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Delivery Tip</Text>
                    <Text style={styles.billValue}>₹{deliveryTip}</Text>
                  </View>
                )}
                {courierOfferDiscount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: '#16A34A' }]}>Offer Savings</Text>
                    <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '800' }]}>- ₹{courierOfferDiscount}</Text>
                  </View>
                )}

                <View style={styles.divider} />
                <View style={styles.billRow}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={[styles.totalValue, { color: theme.primary }]}>₹{finalPayable}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Bottom */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View>
          <Text style={styles.bottomTotal}>{isTB ? '₹0' : `₹${finalPayable}`}</Text>
          <Text style={styles.bottomSub}>{isTB ? 'Pay after trial' : 'Total Amount'}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            { backgroundColor: theme.primary },
            (placing || !chosenAddress || (isTB && tbAvailable === false) || isOrderPlacementEnabled === false || hasOutOfStockItems) && { backgroundColor: '#CBD5E1' }
          ]}
          onPress={handlePlaceOrder}
          disabled={placing || !chosenAddress || (isTB && tbAvailable === false) || isOrderPlacementEnabled === false || hasOutOfStockItems}
          activeOpacity={0.8}
        >
          {placing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                {isOrderPlacementEnabled === false
                  ? 'Maintenance in Progress'
                  : hasOutOfStockItems
                    ? 'Items Out of Stock'
                    : isTB
                      ? tbAvailable === false
                        ? 'Try & Buy Unavailable'
                        : 'Place Try & Buy Order'
                      : 'Place Courier Order'}
              </Text>
              {isOrderPlacementEnabled !== false && !(isTB && tbAvailable === false) && !hasOutOfStockItems && (
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Doorstep Try & Buy Protocol Modal ── */}
      <Modal
        visible={showTryBuyAgreementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTryBuyAgreementModal(false)}
      >
        <View style={styles.tbModalBackdrop}>
          <View style={styles.tbModalCard}>
            {/* Header */}
            <View style={styles.tbModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={[styles.tbModalBadge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                  <View style={[styles.tbModalBadgeDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.tbModalBadgeText, { color: theme.primary }]}>DOORSTEP TRIAL PROTOCOL</Text>
                </View>
                <Text style={styles.tbModalTitle}>Doorstep Try-On Rules</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTryBuyAgreementModal(false)}
                style={styles.tbModalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.tbModalSubtitle}>
              Please review the trial conditions before dispatching your order:
            </Text>

            <ScrollView style={styles.tbModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.tbRuleItem}>
                <View style={[styles.tbRuleIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="timer-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.tbRuleTextContainer}>
                  <Text style={styles.tbRuleHeading}>10–15 Min Fitting Window</Text>
                  <Text style={styles.tbRuleBody}>
                    Our delivery rider will wait outside your door while you try on your items in your private space.
                  </Text>
                </View>
              </View>

              <View style={styles.tbRuleItem}>
                <View style={[styles.tbRuleIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="pricetag-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.tbRuleTextContainer}>
                  <Text style={styles.tbRuleHeading}>Keep Tags & Hygiene Seals</Text>
                  <Text style={styles.tbRuleBody}>
                    Original tags and barcodes must remain attached. Avoid deodorant, perfume, or makeup marks during trial.
                  </Text>
                </View>
              </View>

              <View style={styles.tbRuleItem}>
                <View style={[styles.tbRuleIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="card-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.tbRuleTextContainer}>
                  <Text style={styles.tbRuleHeading}>₹0 Upfront • Pay After Trial</Text>
                  <Text style={styles.tbRuleBody}>
                    Hand unwanted garments back to the rider. Settle payment immediately for the items you choose to keep.
                  </Text>
                </View>
              </View>

              <View style={styles.tbRuleItem}>
                <View style={[styles.tbRuleIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.tbRuleTextContainer}>
                  <Text style={styles.tbRuleHeading}>Safe Return of Items</Text>
                  <Text style={styles.tbRuleBody}>
                    Please handle garments with care and safely return any unwanted products to your delivery partner in original condition without damage or stains.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.tbModalActions}>
              <TouchableOpacity
                style={[styles.tbConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={executeOrderPlacement}
                activeOpacity={0.85}
              >
                <Text style={styles.tbConfirmBtnText}>I Agree & Place Order</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tbCancelBtn}
                onPress={() => setShowTryBuyAgreementModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.tbCancelBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddressSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      <RazorpayWebView
        visible={showRazorpay}
        options={razorpayOptions}
        onSuccess={handleRazorpaySuccess}
        onError={handleRazorpayError}
        onClose={handleRazorpayClose}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 16 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 16,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  addressDisplay: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  addressIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addressDetails: { flex: 1 },
  addressType: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  contactDetails: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 2 },
  addressLine: { fontSize: 13, color: '#475569', lineHeight: 18 },
  addressCity: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  noAddress: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic' },
  addressList: { marginBottom: 8 },
  addressChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8,
  },
  addressChipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addAddressText: { fontSize: 13, fontWeight: '600' },
  summaryItem: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
    flexDirection: 'row', gap: 12, alignItems: 'center'
  },
  summaryImage: {
    width: 50, height: 50, borderRadius: 10, backgroundColor: '#F8FAFC'
  },
  summaryItemDetails: {
    flex: 1,
  },
  itemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  itemMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  moreItems: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 8 },
  tipDesc: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  tipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 14, color: '#64748B' },
  billValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingTop: 16, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bottomTotal: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  bottomSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
  },
  placeOrderText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noAddressContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  addAddressMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  addAddressMainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  mismatchCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 16,
  },
  mismatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mismatchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  mismatchText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  switchLocationBtn: {
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  switchLocationText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  paymentSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  paymentOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  paymentInfoNote: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  paymentInfoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
    fontWeight: '500',
  },

  /* ── TRY & BUY AGREEMENT MODAL ── */
  tbModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  tbModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  tbModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tbModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
    gap: 5,
  },
  tbModalBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tbModalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tbModalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  tbModalCloseBtn: {
    padding: 4,
  },
  tbModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  tbModalScroll: {
    maxHeight: 280,
  },
  tbRuleItem: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  tbRuleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbRuleTextContainer: {
    flex: 1,
  },
  tbRuleHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  tbRuleBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  tbModalActions: {
    marginTop: 16,
    gap: 8,
  },
  tbConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tbConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tbCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tbCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
