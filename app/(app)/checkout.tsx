import { Address, getAddresses } from '@/api/address';
import { createRazorpayOrder, initiateCourierOrder, initiateCourierCheckout, verifyCourierOrderPayment, verifyPayment } from '@/api/orders';
import AddressSelectorModal from '@/components/common/AddressSelectorModal';
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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [chosenAddress, setChosenAddress] = useState<Address | null>(selectedAddress);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
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

  const items = isTB
    ? (merchantCart?.items || [])
    : (courierCart?.items || []);
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
  const upfrontPayable = isTB ? Math.round(merchantTotals?.totalUpfrontPayable || 0) : Math.round(deliveryCharge);
  const totalPayableNow = isTB
    ? upfrontPayable
    : Math.round(
        courierTotals?.totalPayable !== undefined
          ? (courierTotals.totalPayable + deliveryTip)
          : (subtotal - courierOfferDiscount + deliveryCharge + deliveryTip)
      );
  const payLaterAmount = isTB ? subtotal : 0;
  const merchantOffers = merchantCart?.appliedOffers;
  const tbOfferDiscount = merchantOffers?.totalDiscount || 0;
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
        const result = await createRazorpayOrder(chosenAddress._id, deliveryTip, couponCode || undefined, checkoutMerchantId);

        if (result.isFreeOrder) {
          // Free order — already placed, no payment needed
          await refreshCart();
          showAlert({
            title: '✅ Order Placed!',
            message: `Order #${result.orderId?.slice(-6).toUpperCase()} placed.`,
            type: 'success',
            buttons: [{
              text: 'Go to Home',
              onPress: () => router.replace('/(tabs)' as any),
            }]
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
          await refreshCart();
          showAlert({
            title: '✅ Order Placed!',
            message: `Order #${result.orderId?.slice(-6).toUpperCase()} placed.`,
            type: 'success',
            buttons: [{
              text: 'Go to Home',
              onPress: () => router.replace('/(tabs)' as any),
            }]
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
          deliveryTip
        );

        if (initRes.isFreeOrder) {
          await refreshCourierCart();
          showAlert({
            title: 'Orders Placed!',
            message: `Your courier order(s) have been placed successfully.`,
            type: 'success',
            buttons: [{
              text: 'Go to Home',
              onPress: () => router.replace('/(tabs)' as any),
            }]
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
          description: 'Courier Order Payment',
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
          await refreshCourierCart();
          showAlert({
            title: 'Orders Placed!',
            message: `Your courier order(s) have been placed successfully.`,
            type: 'success',
            buttons: [{
              text: 'Go to Home',
              onPress: () => router.replace('/(tabs)' as any),
            }]
          });
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Orders Placed Successfully! 🛍️",
              body: `Your courier order(s) have been placed successfully.`,
              data: { orderId: verifyResult.orderId || initRes.orderId },
            },
            trigger: null,
          });
        } else {
          showToast({ message: 'Failed to place courier orders. Please try again.', type: 'error' });
        }
      }
    } catch (error: any) {
      // Razorpay dismissal (user cancelled) has code PAYMENT_CANCELLED
      if (error?.code === 'PAYMENT_CANCELLED') {
        // User cancelled — do nothing
        return;
      }
      const msg = error.response?.data?.message || error.message || 'Something went wrong';
      showToast({ message: msg, type: 'error' });
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
              We detect you are at <Text style={styles.boldText}>{locationAddress.split(',')[0]}</Text>.
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
                source={{ uri: item.image?.url || item.image }}
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

                {/* --- DELIVERY TOTAL (PAY NOW) --- */}
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 8, marginTop: 8 }}>Pay Upfront Now</Text>

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
                      <Text style={styles.billLabel}>Delivery Fee</Text>
                      <Text style={styles.billValue}>₹{deliveryCharge}</Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Return Handling (Refundable)</Text>
                      <Text style={styles.billValue}>₹{returnCharge}</Text>
                    </View>
                  </>
                )}
                {deliveryTip > 0 && (
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Delivery Tip</Text>
                    <Text style={styles.billValue}>₹{deliveryTip}</Text>
                  </View>
                )}
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Service GST (18%)</Text>
                  <Text style={styles.billValue}>₹{serviceGST}</Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.billRow, { marginBottom: 4 }]}>
                  <Text style={[styles.totalLabel, { color: theme.primary }]}>Total Upfront Payable</Text>
                  <Text style={[styles.totalValue, { color: theme.primary }]}>₹{upfrontPayable}</Text>
                </View>
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
          <Text style={styles.bottomTotal}>₹{finalPayable}</Text>
          <Text style={styles.bottomSub}>{isTB ? 'Upfront Fee Only' : 'Total Amount'}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            { backgroundColor: theme.primary },
            (placing || !chosenAddress || (isTB && tbAvailable === false)) && { backgroundColor: '#CBD5E1' }
          ]}
          onPress={handlePlaceOrder}
          disabled={placing || !chosenAddress || (isTB && tbAvailable === false)}
          activeOpacity={0.8}
        >
          {placing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                {isTB
                  ? tbAvailable === false
                    ? 'Try & Buy Unavailable'
                    : 'Place Try & Buy Order'
                  : 'Place Courier Order'}
              </Text>
              {!(isTB && tbAvailable === false) && (
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

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
});
