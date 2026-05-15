import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  FlatList,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { getOrderById, finalpaymentInitiate, finalPaymentVerify } from '@/api/orders';
import { joinOrderRoom, listenOrderUpdates, removeOrderListeners } from '@/sockets/order.socket';
import { getSocket } from '@/config/socket';
import { calculateFinalBilling } from '@/utils/ItemSelectionCalculation';
import RazorpayWebView from '@/components/common/RazorpayWebView';
import { useAlert, useToast } from '@/context/AlertContext';

// ── Types ──
type OrderStep = { id: string; label: string; completed: boolean };

type Item = {
  _id: string;
  name: string;
  image?: string;
  size?: string;
  price: number;
  quantity: number;
  tryStatus?: 'pending' | 'keep' | 'returned';
  returnReason?: string | null;
};

type OrderData = {
  _id?: string;
  orderStatus?: string;
  estimatedTime?: string | number;
  customerDeliveryStatus?: string;
  otp?: string;
  items?: Item[];
  trialPhaseStart?: string | number | null;
  trialPhaseDuration?: number;
  deliveryRiderDetails?: { name?: string; phone?: string };
  deliveryLocation?: any;
  pickupLocation?: any;
  deliveryCharge?: number;
  returnCharge?: number;
  totalAmount?: number;
  totalPayable?: number;
  finalBilling?: any;
  merchantDetails?: { name?: string };
  createdAt?: string;
  [k: string]: any;
};

// ── Helpers ──
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const statusToSteps = (status?: string): OrderStep[] => {
  const steps: OrderStep[] = [
    { id: 'picked', label: 'Picked', completed: false },
    { id: 'in-transit', label: 'In Transit', completed: false },
    { id: 'arrived', label: 'Arrived', completed: false },
  ];
  switch (status) {
    case 'packed':
      steps[0].completed = true;
      break;
    case 'in_transit':
      steps[0].completed = true;
      steps[1].completed = true;
      break;
    case 'try_phase':
    case 'selection_made':
    case 'return_in_progress':
      steps[0].completed = true;
      steps[1].completed = true;
      steps[2].completed = true;
      break;
  }
  return steps;
};

// ── Trial Timer Component ──
const TrialTimer = ({ start, duration }: { start: string | number | null; duration: number }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!start) return;
    const startTime = new Date(start as string).getTime();
    const endTime = startTime + duration * 60 * 1000;
    const tick = () => setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, duration]);

  if (timeLeft <= 0) return null;

  const progress = duration > 0 ? timeLeft / (duration * 60) : 0;
  const isUrgent = timeLeft < 120;

  return (
    <View style={[styles.timerCard, isUrgent && { borderColor: '#EF4444' }]}>
      <View style={styles.timerHeader}>
        <Ionicons name="timer-outline" size={20} color={isUrgent ? '#EF4444' : '#F59E0B'} />
        <Text style={[styles.timerLabel, isUrgent && { color: '#EF4444' }]}>Trial Time Remaining</Text>
      </View>
      <Text style={[styles.timerValue, isUrgent && { color: '#EF4444' }]}>{formatTime(timeLeft)}</Text>
      <View style={styles.timerBar}>
        <View style={[styles.timerBarFill, { width: `${progress * 100}%`, backgroundColor: isUrgent ? '#EF4444' : '#F59E0B' }]} />
      </View>
      <Text style={styles.timerHint}>Try your clothes and make your selection below</Text>
    </View>
  );
};

// ══════════════════════════════════════════════════
//   Main Screen
// ══════════════════════════════════════════════════

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const showAlert = useAlert();
  const showToast = useToast();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [steps, setSteps] = useState<OrderStep[]>(statusToSteps());
  const [otp, setOtp] = useState('');
  const [rider, setRider] = useState<{ name: string; phone?: string } | null>(null);
  const [trialActive, setTrialActive] = useState(false);
  const [trialStart, setTrialStart] = useState<string | number | null>(null);
  const [trialDuration, setTrialDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [billingSummary, setBillingSummary] = useState({
    baseAmount: 0,
    gst: 0,
    overtimePenalty: 0,
    returnCharge: 0,
    returnChargeDeduction: 0,
    totalPayable: 0,
    itemsAccepted: 0,
    itemsReturned: 0,
    allItemsKept: true,
  });

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

  // ── Fetch order ──
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await getOrderById(orderId);
      const data: OrderData = res?.order || res;
      if (!data) return;

      // Handle completed try phase -> redirect to return page
      if (data.orderStatus === 'selection_made') {
        router.replace({
          pathname: '/return-items' as any,
          params: {
            orderId: data._id,
            otp: data.otp,
            items: JSON.stringify(data.items),
            orderData: JSON.stringify(data),
          },
        });
        return;
      }

      setOrder(data);
      setOtp(data.otp || '');
      setSteps(statusToSteps(data.orderStatus));

      if (data.deliveryRiderDetails?.name) {
        setRider({ name: data.deliveryRiderDetails.name, phone: data.deliveryRiderDetails.phone });
      }

      if (data.items) {
        setItems(data.items.map(i => ({ ...i, tryStatus: i.tryStatus || 'pending', returnReason: i.returnReason || null })));
      }

      if (data.trialPhaseStart && data.trialPhaseDuration) {
        setTrialActive(true);
        setTrialStart(data.trialPhaseStart);
        setTrialDuration(data.trialPhaseDuration);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // ── Connect socket ──
  useEffect(() => {
    if (!orderId) return;
    fetchOrder();

    const setupSocket = async () => {
      await joinOrderRoom(orderId);
      listenOrderUpdates((update: any) => {
        console.log('📦 Order update:', update);

        // Handle completed try phase -> redirect
        if (update.orderStatus === 'selection_made') {
          router.replace({
            pathname: '/return-items' as any,
            params: {
              orderId: orderId,
              otp: update.otp || otp,
              items: JSON.stringify(update.items || items),
              orderData: JSON.stringify(order),
            },
          });
          return;
        }

        if (update.orderStatus === 'try_phase') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Rider Arrived! 🏠',
              body: 'Your rider has reached your location. Please meet them to receive your order.',
              data: { orderId: orderId },
            },
            trigger: null,
          });
          showToast({ message: 'Your rider has reached your location!', type: 'info' });
        }

        if (update.orderStatus) {
          setSteps(prev => {
            const newSteps = statusToSteps(update.orderStatus);
            return prev.map((step, i) => ({
              ...step,
              completed: step.completed || (newSteps[i]?.completed ?? false),
            }));
          });
          setOrder(prev => prev ? { ...prev, orderStatus: update.orderStatus } : prev);
        }
        if (update.otp) setOtp(update.otp);
        if (update.estimatedTime) {
          setOrder(prev => prev ? { ...prev, estimatedTime: update.estimatedTime } : prev);
        }
        if (update.deliveryRiderDetails) {
          setRider({ name: update.deliveryRiderDetails.name, phone: update.deliveryRiderDetails.phone });
        }
        if (update.items) {
          setItems(update.items.map((i: any) => ({ ...i, tryStatus: i.tryStatus || 'pending', returnReason: i.returnReason || null })));
        }
        if (update.trialPhaseDuration && update.trialPhaseStart) {
          setTrialActive(true);
          setTrialStart(update.trialPhaseStart);
          setTrialDuration(update.trialPhaseDuration);
        }
      });

      const socket = getSocket();
      if (socket) {
        socket.on('trialPhaseStart', (data: any) => {
          if (data.orderId === orderId) {
            setTrialActive(true);
            setTrialStart(data.trialPhaseStart);
            setTrialDuration(data.trialPhaseDuration);
          }
        });
      }
    };

    setupSocket();
    return () => {
      const socket = getSocket();
      if (socket) socket.off('trialPhaseStart');
      removeOrderListeners();
    };
  }, [orderId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  };

  // ── Update billing whenever items change ──
  useEffect(() => {
    if (items.length > 0) {
      const summary = calculateFinalBilling({
        orderItems: [...items],
        returnCharge: order?.returnCharge ?? 0,
      });
      setBillingSummary(summary);
    }
  }, [items, order?.returnCharge]);

  // ── Item keep/return ──
  const handleItemUpdate = (index: number, tryStatus: 'keep' | 'returned', reason: string | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], tryStatus, returnReason: reason };
    setItems(updated);
  };

  const allSelected = items.length > 0 && items.every(i => i.tryStatus === 'keep' || i.tryStatus === 'returned');
  const hasReturns = items.some(i => i.tryStatus === 'returned');
  const isAllReturned = items.every(i => i.tryStatus === 'returned');

  // ── Submit selection (Mock Razorpay + real API) ──
  const handleSubmitSelection = async () => {
    if (!allSelected) {
      showToast({ message: 'Please mark each item as Keep or Return.', type: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId: orderId!,
        items: items.map(i => ({
          itemId: i._id,
          tryStatus: i.tryStatus,
          returnReason: i.returnReason || null,
        })),
      };

      // initiate final payment order (this creates Razorpay order on backend)
      const res = await finalpaymentInitiate(payload);

      if (!res) {
        setSubmitting(false);
        return;
      }

      if (isAllReturned) {
        // All items returned - no payment needed, go to return handover
        router.replace({
          pathname: '/return-items' as any,
          params: {
            orderId: orderId!,
            otp,
            items: JSON.stringify(items),
            orderData: JSON.stringify(order),
          },
        });
        return;
      }

      // === REAL RAZORPAY PAYMENT FLOW ===
      const {
        amount,
        key_id,
        razorpayOrder,
        orderId: internalOrderId,
        contact,
        name: customerName,
        email,
      } = res;

      // Open Razorpay Checkout WebView
      const options = {
        description: 'FlashFits - Final Payment',
        currency: 'INR',
        key: key_id,
        amount: amount,
        name: 'FlashFits',
        order_id: razorpayOrder?.id || razorpayOrder,
        prefill: {
          contact: contact,
          name: customerName,
          email: email,
        },
        theme: { color: '#0F172A' },
      };

      try {
        const paymentData = await openRazorpayCheckout(options);

        // Verify with backend
        const verifyResult = await finalPaymentVerify(paymentData, internalOrderId);

        if (verifyResult.success) {
          if (hasReturns) {
            // Has return items - go to return handover page
            router.replace({
              pathname: '/return-items' as any,
              params: {
                orderId: internalOrderId,
                otp,
                items: JSON.stringify(items.filter(i => i.tryStatus === 'returned')),
                orderData: JSON.stringify(order),
              },
            });
          } else {
            // All items kept - show success
            showAlert({
              title: '✅ Payment Successful!',
              message: `All ${billingSummary.itemsAccepted} items kept.\nTotal: ₹${billingSummary.totalPayable}`,
              type: 'success',
              buttons: [{ text: 'View Orders', onPress: () => router.replace('/orders' as any) }]
            });
          }
        }
      } catch (paymentErr: any) {
        // Razorpay dismissal (user cancelled)
        if (paymentErr?.code === 'PAYMENT_CANCELLED') {
          // User cancelled — do nothing
        } else {
          showToast({ message: paymentErr?.description || paymentErr?.message || 'Payment could not be completed. Please try again.', type: 'error' });
        }
      } finally {
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('Submit selection error:', err);
      showToast({ message: err.response?.data?.message || 'Failed to process. Please try again.', type: 'error' });
      setSubmitting(false);
    }
  };

  const status = order?.orderStatus || '';
  const isTryPhase = ['try_phase', 'selection_made'].includes(status);
  const isCompleted = ['completed', 'return_in_progress'].includes(status);
  const isTracking = ['placed', 'accepted', 'packed', 'in_transit'].includes(status);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading order…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderId?.slice(-5).toUpperCase()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ─── Status Banner ─── */}
        <View style={[styles.statusBanner, { backgroundColor: theme.primary + '10' }]}>
          <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
          <View style={{ flex: 1 }}>
            {isTracking && (
              <>
                <Text style={[styles.statusLabel, { color: theme.primary }]}>
                  {status.replace(/_/g, ' ').toUpperCase()}
                </Text>
                {order?.estimatedTime && (
                  <Text style={styles.eta}>
                    {order.estimatedTime === 'Calculating...' ? 'Estimating arrival...' : `Arriving in ${order.estimatedTime} mins`}
                  </Text>
                )}
              </>
            )}
            {isTryPhase && (
              <Text style={[styles.statusLabel, { color: theme.primary }]}>TRY YOUR FITS ⚡</Text>
            )}
            {isCompleted && (
              <Text style={[styles.statusLabel, { color: '#10B981' }]}>ORDER COMPLETED ✅</Text>
            )}
          </View>
          <View style={[styles.tbBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={{ color: '#166534', fontSize: 10, fontWeight: '700' }}>TRY & BUY</Text>
          </View>
        </View>

        {/* ─── Delivery Steps ─── */}
        {(isTracking || isTryPhase) && (
          <View style={styles.stepsCard}>
            <Text style={styles.cardTitle}>Delivery Progress</Text>
            <View style={styles.stepsRow}>
              {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                  <View style={styles.stepContainer}>
                    <View style={[styles.stepCircle, step.completed ? styles.stepDone : styles.stepPending]}>
                      {step.completed ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Ionicons name="time-outline" size={14} color="#94A3B8" />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, step.completed && { color: '#0F172A', fontWeight: '700' }]}>
                      {step.label}
                    </Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[styles.stepLine, step.completed && styles.lineActive]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ─── Rider Info ─── */}
        {rider && (isTracking || isTryPhase) && (
          <View style={styles.riderCard}>
            <View style={[styles.riderAvatar, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{rider.name?.charAt(0) || 'R'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{rider.name}</Text>
              <Text style={styles.riderRole}>Delivery Partner</Text>
            </View>
            {rider.phone && rider.phone !== 'N/A' && (
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: theme.primary }]}
                onPress={() => Linking.openURL(`tel:${rider.phone}`)}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── OTP Badge ─── */}
        {otp && isTryPhase && (
          <View style={styles.otpCard}>
            <Ionicons name="key-outline" size={18} color="#1A73E8" />
            <Text style={styles.otpText}>OTP: <Text style={{ fontWeight: '900', letterSpacing: 2 }}>{otp}</Text></Text>
          </View>
        )}

        {/* ─── Trial Timer ─── */}
        {trialActive && isTryPhase && <TrialTimer start={trialStart} duration={trialDuration} />}

        {/* ─── Try Phase: Item Selection ─── */}
        {isTryPhase && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Items to Keep or Return</Text>
            <Text style={styles.cardSubtitle}>Try your clothes and decide what to keep</Text>

            {items.map((item, idx) => (
              <View key={item._id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="shirt-outline" size={24} color="#CBD5E1" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemMeta}>Size: {item.size} • ₹{item.price} × {item.quantity}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, item.tryStatus === 'keep' && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}
                    onPress={() => handleItemUpdate(idx, 'keep', null)}
                  >
                    <Ionicons name={item.tryStatus === 'keep' ? 'checkmark-circle' : 'checkmark-circle-outline'} size={18} color={item.tryStatus === 'keep' ? '#16A34A' : '#94A3B8'} />
                    <Text style={[styles.actionText, item.tryStatus === 'keep' && { color: '#16A34A', fontWeight: '800' }]}>
                      Keep
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, item.tryStatus === 'returned' && { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
                    onPress={() => handleItemUpdate(idx, 'returned', item.returnReason || 'Not liked')}
                  >
                    <Ionicons name={item.tryStatus === 'returned' ? 'arrow-undo-circle' : 'arrow-undo-circle-outline'} size={18} color={item.tryStatus === 'returned' ? '#EF4444' : '#94A3B8'} />
                    <Text style={[styles.actionText, item.tryStatus === 'returned' && { color: '#EF4444', fontWeight: '800' }]}>
                      Return
                    </Text>
                  </TouchableOpacity>
                </View>

                {item.tryStatus === 'returned' && (
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Why are you returning?"
                    placeholderTextColor="#94A3B8"
                    value={item.returnReason || ''}
                    onChangeText={text => handleItemUpdate(idx, 'returned', text)}
                    multiline
                  />
                )}
              </View>
            ))}

            {/* Billing Summary */}
            <View style={styles.billingCard}>
              <Text style={styles.billingTitle}>Billing Summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>
                  Items Kept ({billingSummary.itemsAccepted})
                </Text>
                <Text style={styles.billValue}>₹{billingSummary.baseAmount}</Text>
              </View>

              {billingSummary.returnChargeDeduction > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: '#10B981' }]}>Return Charge Saved</Text>
                  <Text style={[styles.billValue, { color: '#10B981' }]}>- ₹{billingSummary.returnChargeDeduction}</Text>
                </View>
              )}

              {billingSummary.itemsReturned > 0 && order?.returnCharge && order.returnCharge > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabelSmall}>
                    Return Charge ({billingSummary.itemsReturned} items)
                  </Text>
                  <Text style={styles.billValueSmall}>₹{order.returnCharge}</Text>
                </View>
              )}

              <View style={styles.billDivider} />

              <View style={styles.billRow}>
                <Text style={styles.billTotal}>Total Payable</Text>
                <Text style={[styles.billTotal, { color: theme.primary }]}>₹{billingSummary.totalPayable}</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: allSelected ? theme.primary : '#CBD5E1' },
              ]}
              onPress={handleSubmitSelection}
              disabled={!allSelected || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={hasReturns ? 'arrow-undo' : 'card'} size={20} color="#fff" />
                  <Text style={styles.submitText}>
                    {isAllReturned
                      ? 'Return All Items'
                      : hasReturns
                        ? 'Pay & Submit Returns'
                        : `Pay ₹${billingSummary.totalPayable}`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Completed State ─── */}
        {isCompleted && (
          <View style={styles.completedCard}>
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.completedTitle}>
              {status === 'return_in_progress' ? 'Return Processed!' : 'Order Completed!'}
            </Text>
            <Text style={styles.completedSub}>
              {status === 'return_in_progress'
                ? 'Your return has been processed successfully'
                : 'Thank you for shopping with FlashFits'}
            </Text>

            {/* Items */}
            {items.map((item) => (
              <View key={item._id} style={styles.completedItem}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.completedImage} />
                ) : (
                  <View style={[styles.completedImage, { backgroundColor: '#F1F5F9' }]} />
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Size: {item.size} • ₹{item.price}</Text>
                  <View style={[
                    styles.statusChip,
                    { backgroundColor: item.tryStatus === 'keep' ? '#DCFCE715' : '#FEF2F215' },
                  ]}>
                    <Text style={{
                      fontSize: 10, fontWeight: '700',
                      color: item.tryStatus === 'keep' ? '#16A34A' : '#EF4444',
                    }}>
                      {(item.tryStatus || 'delivered').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Billing */}
            <View style={[styles.billingCard, { backgroundColor: '#0F172A', marginTop: 16 }]}>
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: 'rgba(255,255,255,0.6)' }]}>Items Total</Text>
                <Text style={[styles.billValue, { color: '#fff' }]}>₹{order?.finalBilling?.baseAmount || order?.totalAmount || 0}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: 'rgba(255,255,255,0.6)' }]}>Delivery Fee</Text>
                <Text style={[styles.billValue, { color: '#fff' }]}>₹{order?.deliveryCharge || 0}</Text>
              </View>
              <View style={[styles.billDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <View style={styles.billRow}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Total Paid</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981' }}>
                  ₹{order?.finalBilling?.totalPayable || order?.totalPayable || 0}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
              onPress={() => router.replace('/(app)/(tabs)' as any)}
            >
              <Text style={styles.submitText}>Continue Shopping</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: theme.primary }]}
              onPress={() => router.replace('/orders' as any)}
            >
              <Text style={[styles.outlineText, { color: theme.primary }]}>Order History</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Waiting State ─── */}
        {status === 'placed' && (
          <View style={styles.waitingCard}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.waitingText}>Waiting for merchant to accept your order…</Text>
          </View>
        )}

        {/* ─── Package Info (collapsible) ─── */}
        {(isTracking || isTryPhase) && items.length > 0 && (
          <>
            <TouchableOpacity style={styles.packageToggle} onPress={() => setPackageOpen(!packageOpen)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="cube-outline" size={20} color="#475569" />
                <Text style={styles.packageToggleText}>View Package ({items.length} items)</Text>
              </View>
              <Ionicons name={packageOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
            </TouchableOpacity>
            {packageOpen && (
              <View style={styles.packageList}>
                {items.map(item => (
                  <View key={item._id} style={styles.packageItem}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.packageImage} />
                    ) : (
                      <View style={[styles.packageImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="shirt-outline" size={16} color="#CBD5E1" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.packageName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.packageMeta}>₹{item.price} • Size: {item.size} • Qty: {item.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ─── Order Info ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>#{order?._id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Store</Text>
            <Text style={styles.detailValue}>{order?.merchantDetails?.name || 'Store'}</Text>
          </View>
          {order?.deliveryLocation && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery To</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {order.deliveryLocation.addressLine1}, {order.deliveryLocation.city}
              </Text>
            </View>
          )}
          {order?.createdAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Placed On</Text>
              <Text style={styles.detailValue}>
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Try & Buy Info Banner */}
        {isTracking && (
          <View style={styles.tryBuyBanner}>
            <View style={[styles.tryBuyIcon, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tryBuyTitle}>Try & Buy Available</Text>
              <Text style={styles.tryBuyDesc}>
                Try your items at home before making the final decision. Return unwanted items with the delivery partner.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 16 },

  // Status
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 16, gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '800' },
  eta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tbBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  // Steps
  stepsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  stepContainer: { alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  stepDone: { backgroundColor: '#10B981' },
  stepPending: { backgroundColor: '#F1F5F9' },
  stepLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  stepLine: { width: 40, height: 3, backgroundColor: '#F1F5F9', marginHorizontal: 4, borderRadius: 2 },
  lineActive: { backgroundColor: '#10B981' },

  // Rider
  riderCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16, gap: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },
  riderAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  riderName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  riderRole: { fontSize: 12, color: '#64748B' },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // OTP
  otpCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 12,
    padding: 14, marginBottom: 16, gap: 10,
  },
  otpText: { fontSize: 15, color: '#1E40AF', fontWeight: '600' },

  // Timer
  timerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#FEF3C7',
  },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  timerLabel: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  timerValue: { fontSize: 36, fontWeight: '900', color: '#F59E0B', textAlign: 'center', letterSpacing: 4, marginBottom: 12 },
  timerBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  timerBarFill: { height: '100%', borderRadius: 3 },
  timerHint: { fontSize: 12, color: '#64748B', textAlign: 'center' },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 16 },

  // Items
  itemCard: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 56, height: 70, borderRadius: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  itemMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  reasonInput: {
    marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 10, fontSize: 13, color: '#0F172A', minHeight: 40, backgroundColor: '#FAFAFA',
  },

  // Billing
  billingCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginTop: 8 },
  billingTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 13, color: '#64748B' },
  billValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  billLabelSmall: { fontSize: 11, color: '#94A3B8' },
  billValueSmall: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  billDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  billTotal: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  // Submit
  submitBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8,
    borderWidth: 1.5,
  },
  outlineText: { fontSize: 15, fontWeight: '700' },

  // Completed
  completedCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center',
  },
  completedIcon: { marginBottom: 16 },
  completedTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  completedSub: { fontSize: 14, color: '#64748B', marginBottom: 20, textAlign: 'center' },
  completedItem: {
    flexDirection: 'row', paddingVertical: 12, width: '100%',
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  completedImage: { width: 50, height: 60, borderRadius: 10 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },

  // Waiting
  waitingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 12,
    padding: 14, marginBottom: 16, gap: 10,
  },
  waitingText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  // Package
  packageToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  packageToggleText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  packageList: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  packageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  packageImage: { width: 40, height: 50, borderRadius: 8 },
  packageName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  packageMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },

  // Detail
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  detailLabel: { fontSize: 13, color: '#64748B' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#0F172A', maxWidth: '60%', textAlign: 'right' },

  // Try & Buy Banner
  tryBuyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 16,
    padding: 16, marginBottom: 16, gap: 12, borderWidth: 1, borderColor: '#DCFCE7',
  },
  tryBuyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tryBuyTitle: { fontSize: 14, fontWeight: '800', color: '#166534', marginBottom: 4 },
  tryBuyDesc: { fontSize: 12, color: '#15803D', lineHeight: 18 },
});
