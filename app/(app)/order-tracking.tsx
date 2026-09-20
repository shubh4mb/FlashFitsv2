import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { getOrderById, finalpaymentInitiate, finalPaymentVerify, confirmCodSelection, reportUnresponsiveRider, confirmClothSelection } from '@/api/orders';
import { getMyReviews } from '@/api/reviews';
import { joinOrderRoom, listenOrderUpdates, removeOrderListeners, leaveOrderRoom } from '@/sockets/order.socket';
import { getSocket } from '@/config/socket';
import { calculateFinalBilling } from '@/utils/ItemSelectionCalculation';
import RazorpayWebView from '@/components/common/RazorpayWebView';
import { useAlert, useToast } from '@/context/AlertContext';
import { applyCoupon as applyCouponApi, getAvailableOffers } from '@/api/offers';
import CouponOffersModal from '@/components/modals/CouponOffersModal';
import LiveOrderMap from '@/components/common/LiveOrderMap';

// ── Types ──
type OrderStep = { id: string; label: string; completed: boolean };

type Item = {
  _id: string;
  name: string;
  image?: string;
  size?: string;
  price: number;
  quantity: number;
  tryStatus?: 'pending' | 'keep' | 'returned' | 'accepted' | 'return';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Helpers ──
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const statusToSteps = (status?: string, deliveryRiderStatus?: string): OrderStep[] => {
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
      if (deliveryRiderStatus === 'at_delivery') {
        steps[2].completed = true;
      }
      break;
    case 'try_phase':
    case 'selection_made':
    case 'return_in_progress':
    case 'completed':
      steps[0].completed = true;
      steps[1].completed = true;
      steps[2].completed = true;
      break;
  }
  return steps;
};

// ── Trial Timer Component ──
const TrialTimer = ({ start, duration }: { start: string | number | null; duration: number }) => {
  const [minutesLeft, setMinutesLeft] = useState(duration);
  const [startTimeFormatted, setStartTimeFormatted] = useState('');

  useEffect(() => {
    if (!start) return;
    const startTime = new Date(start as string);
    
    // Format start time e.g., 2:30 PM
    const formatted = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setStartTimeFormatted(formatted);

    const updateCalculations = () => {
      const elapsedMs = Date.now() - startTime.getTime();
      const elapsedMins = Math.floor(elapsedMs / 60000);
      setMinutesLeft(Math.max(0, duration - elapsedMins));
    };

    updateCalculations();
    const id = setInterval(updateCalculations, 60000); // update every minute
    return () => clearInterval(id);
  }, [start, duration]);

  if (minutesLeft <= 0) return null;

  const progress = duration > 0 ? (duration - minutesLeft) / duration : 0;
  const isUrgent = minutesLeft < 5;

  return (
    <View style={[styles.timerCard, isUrgent && { borderColor: '#EF4444' }]}>
      <View style={styles.timerHeader}>
        <Ionicons name="time-outline" size={20} color={isUrgent ? '#EF4444' : '#F59E0B'} />
        <Text style={[styles.timerLabel, isUrgent && { color: '#EF4444' }]}>Trial Period Active</Text>
      </View>
      <Text style={[styles.timerValue, { fontSize: 18, marginVertical: 4 }, isUrgent && { color: '#EF4444' }]}>
        Started at: {startTimeFormatted}
      </Text>
      <View style={styles.timerBar}>
        <View style={[styles.timerBarFill, { width: `${progress * 100}%`, backgroundColor: isUrgent ? '#EF4444' : '#F59E0B' }]} />
      </View>
      <Text style={styles.timerHint}>Time remaining: {minutesLeft} mins</Text>
    </View>
  );
};

// ── Estimated Bill Component ──
interface EstimatedBillSectionProps {
  summary: {
    baseAmount: number;
    itemsAccepted: number;
    itemsReturned: number;
    effectiveReturnCharge: number;
    totalPayable: number;
    [key: string]: any;
  };
  isFreeDelivery: boolean;
  isFreeReturn?: boolean;
  originalDeliveryCharge: number;
  effectiveDeliveryCharge: number;
  overtimeFee: number;
  discountAmount: number;
  themeColor: string;
  title?: string;
  showNotice?: boolean;
}

const EstimatedBillSection: React.FC<EstimatedBillSectionProps> = ({
  summary,
  isFreeDelivery,
  isFreeReturn = isFreeDelivery,
  originalDeliveryCharge,
  effectiveDeliveryCharge,
  overtimeFee,
  discountAmount,
  themeColor,
  title = "Estimated Bill",
  showNotice = true,
}) => {
  return (
    <View style={styles.estimateCard}>
      <View style={styles.estimateHeader}>
        <View style={styles.estimateTitleContainer}>
          <Ionicons name="receipt-outline" size={18} color={themeColor} />
          <Text style={styles.estimateTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        </View>
        <View style={styles.estimateBadge}>
          <Text style={styles.estimateBadgeText}>ESTIMATE</Text>
        </View>
      </View>

      {/* Items Kept */}
      <View style={styles.estimateRow}>
        <Text style={styles.estimateLabel}>
          Items Kept ({summary.itemsAccepted} {summary.itemsAccepted === 1 ? 'item' : 'items'})
        </Text>
        <Text style={styles.estimateValue}>₹{summary.baseAmount}</Text>
      </View>

      {/* Delivery Fee */}
      <View style={styles.estimateRow}>
        <Text style={styles.estimateLabel}>Delivery Fee</Text>
        {isFreeDelivery ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {originalDeliveryCharge > 0 && (
              <Text style={styles.estimateStrikethrough}>₹{originalDeliveryCharge}</Text>
            )}
            <Text style={[styles.estimateValue, { color: '#16A34A', fontWeight: '800' }]}>FREE</Text>
          </View>
        ) : (
          <Text style={styles.estimateValue}>₹{effectiveDeliveryCharge}</Text>
        )}
      </View>

      {/* Return Fee */}
      {summary.itemsReturned > 0 ? (
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>
            Return Fee ({summary.itemsReturned} {summary.itemsReturned === 1 ? 'item' : 'items'})
          </Text>
          {isFreeReturn || summary.effectiveReturnCharge === 0 ? (
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>FREE</Text>
            </View>
          ) : (
            <Text style={styles.estimateValue}>₹{summary.effectiveReturnCharge}</Text>
          )}
        </View>
      ) : (
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>Return Fee</Text>
          <Text style={[styles.estimateValue, { color: '#16A34A' }]}>₹0</Text>
        </View>
      )}

      {/* Rider Waiting Charge */}
      <View style={styles.estimateRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.estimateLabel}>Rider Waiting Charge</Text>
          <Text style={styles.estimateSubLabel}>
            {overtimeFee > 0 ? 'Extra trial time beyond 10 mins (₹2/min)' : '10 mins trial time included free'}
          </Text>
        </View>
        <Text style={[styles.estimateValue, overtimeFee > 0 ? { color: '#0F172A', fontWeight: '700' } : { color: '#16A34A', fontWeight: '700' }]}>
          {overtimeFee > 0 ? `₹${overtimeFee}` : 'FREE'}
        </Text>
      </View>

      {/* Discounts (if any) */}
      {discountAmount > 0 && (
        <View style={styles.estimateRow}>
          <Text style={[styles.estimateLabel, { color: '#16A34A', fontWeight: '700' }]}>Discounts & Offers</Text>
          <Text style={[styles.estimateValue, { color: '#16A34A', fontWeight: '800' }]}>- ₹{discountAmount}</Text>
        </View>
      )}

      <View style={styles.estimateDivider} />

      {/* Estimated Total */}
      <View style={styles.estimateTotalRow}>
        <View>
          <Text style={styles.estimateTotalLabel}>Estimated Total</Text>
          <Text style={styles.estimateTotalHint}>Final bill calculated upon return handover</Text>
        </View>
        <Text style={[styles.estimateTotalValue, { color: themeColor }]}>
          ₹{summary.totalPayable}
        </Text>
      </View>

      {/* Handover Notice */}
      {showNotice && (
        <View style={styles.estimateNoticeBox}>
          <Ionicons name="time-outline" size={18} color="#2563EB" style={{ marginTop: 1 }} />
          <Text style={styles.estimateNoticeText}>
            Trial period ends when handover is done and your delivery partner verifies the OTP.
          </Text>
        </View>
      )}
    </View>
  );
};

// ══════════════════════════════════════════════════
//   Main Screen
// ══════════════════════════════════════════════════

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const cleanOrderId = useMemo(() => orderId ? String(orderId).replace(/^["']|["']$/g, '').trim() : '', [orderId]);
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
  const [reviews, setReviews] = useState<any[]>([]);
  const hasNotifiedArrival = useRef(false);
  const [trialActive, setTrialActive] = useState(false);
  const [trialStart, setTrialStart] = useState<string | number | null>(null);
  const [trialDuration, setTrialDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  const [isSelectionSubmitted, setIsSelectionSubmitted] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<'online' | 'cod'>('online');
  const [selectedStarRating, setSelectedStarRating] = useState<number>(5);
  const [offersModalVisible, setOffersModalVisible] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    title?: string;
    description?: string;
    discountType?: 'percentage' | 'flat';
    discountValue?: number;
    maxDiscount?: number;
    minCartValue?: number;
    freeDelivery?: boolean;
    freeReturn?: boolean;
    freeWaiting?: boolean;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [billingSummary, setBillingSummary] = useState({
    baseAmount: 0,
    gst: 0,
    overtimePenalty: 0,
    deliveryCharge: 0,
    deliveryTip: 0,
    returnCharge: 0,
    effectiveReturnCharge: 0,
    returnChargeDeduction: 0,
    discountApplied: 0,
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
    if (!cleanOrderId) return null;
    try {
      const res = await getOrderById(cleanOrderId);
      const data: OrderData = res?.order || res?.data || res;
      if (!data || !data._id) return null;

      if (data.deliveryRiderStatus === 'at_delivery' || data.orderStatus === 'try_phase') {
        hasNotifiedArrival.current = true;
      }

      setOrder(data);
      setOtp(data.otp || '');
      setSteps(statusToSteps(data.orderStatus, data.deliveryRiderStatus));

      if (data.deliveryRiderDetails?.name) {
        setRider({ name: data.deliveryRiderDetails.name, phone: data.deliveryRiderDetails.phone });
      } else if ((data as any).deliveryRiderId?.name) {
        setRider({ name: (data as any).deliveryRiderId.name, phone: (data as any).deliveryRiderId.phone });
      }

      if (data.items) {
        setItems(data.items.map(i => {
          const raw = (i.tryStatus as string | undefined);
          const mapped: 'keep' | 'returned' | 'pending' = (raw === 'accepted' || raw === 'keep')
            ? 'keep'
            : (raw === 'returned' || raw === 'return')
              ? 'returned'
              : 'pending';
          return { ...i, tryStatus: mapped, returnReason: i.returnReason || null };
        }));
        const alreadySubmitted = data.orderStatus === 'selection_made' || data.items.some((i: any) => i.tryStatus === 'accepted' || i.tryStatus === 'keep' || i.tryStatus === 'returned');
        if (alreadySubmitted) {
          setIsSelectionSubmitted(true);
        }
      }

      if (data.trialPhaseStart && data.trialPhaseDuration && !data.trialPhaseEnd) {
        setTrialActive(true);
        setTrialStart(data.trialPhaseStart);
        setTrialDuration(data.trialPhaseDuration);
      } else if (data.trialPhaseEnd) {
        setTrialActive(false);
      }

      if (['completed', 'return_in_progress'].includes(data.orderStatus || '')) {
        try {
          const revRes = await getMyReviews(cleanOrderId);
          setReviews(revRes.reviews || []);
        } catch (e) {
          console.error('Failed to fetch reviews:', e);
        }
      }

      return data.orderStatus;
    } catch (err) {
      console.error('Failed to fetch order:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cleanOrderId]);

  // ── Connect socket ──
  useEffect(() => {
    if (!cleanOrderId) return;

    let socketJoined = false;

    const setupSocket = async () => {
      await joinOrderRoom(cleanOrderId);
      socketJoined = true;

      listenOrderUpdates((update: any) => {
        console.log('📦 Order update:', update);

        if ((update.deliveryRiderStatus === 'at_delivery' || update.orderStatus === 'try_phase') && !hasNotifiedArrival.current) {
          hasNotifiedArrival.current = true;
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Rider Arrived! 🏠',
              body: 'Your rider has reached your location. Please meet them to receive your order.',
              data: { orderId: cleanOrderId },
            },
            trigger: null,
          });
          showToast({ message: 'Your rider has reached your location!', type: 'info' });
        }

        if (update.orderStatus || update.deliveryRiderStatus) {
          setSteps(prev => {
            const newSteps = statusToSteps(update.orderStatus, update.deliveryRiderStatus);
            return prev.map((step, i) => ({
              ...step,
              completed: step.completed || (newSteps[i]?.completed ?? false),
            }));
          });
          setOrder(prev => prev ? { ...prev, orderStatus: update.orderStatus || prev.orderStatus, deliveryRiderStatus: update.deliveryRiderStatus || prev.deliveryRiderStatus } : prev);
        }
        if (update.otp !== undefined) setOtp(update.otp || '');
        if (update.paymentStatus) {
          setOrder(prev => prev ? { ...prev, paymentStatus: update.paymentStatus } : prev);
        }
        if (update.estimatedTime) {
          setOrder(prev => prev ? { ...prev, estimatedTime: update.estimatedTime } : prev);
        }
        if (update.deliveryRiderDetails?.name) {
          setRider({ name: update.deliveryRiderDetails.name, phone: update.deliveryRiderDetails.phone });
        } else if (update.deliveryRiderId?.name) {
          setRider({ name: update.deliveryRiderId.name, phone: update.deliveryRiderId.phone });
        }
        if (update.photoVerified !== undefined) {
          setOrder(prev => prev ? { ...prev, photoVerified: update.photoVerified } : prev);
        }
        if (update.returnPhotos) {
          setOrder(prev => prev ? { ...prev, returnPhotos: update.returnPhotos } : prev);
        }
        if (update.items) {
          setItems(update.items.map((i: any) => {
            const raw = i.tryStatus;
            const mapped = (raw === 'accepted' || raw === 'keep')
              ? 'keep'
              : (raw === 'returned' || raw === 'return')
                ? 'returned'
                : 'pending';
            return { ...i, tryStatus: mapped, returnReason: i.returnReason || null };
          }));
        }
        if (update.trialPhaseDuration && update.trialPhaseStart && !update.trialPhaseEnd) {
          setTrialActive(true);
          setTrialStart(update.trialPhaseStart);
          setTrialDuration(update.trialPhaseDuration);
        }
        if (update.trialPhaseEnd) {
          setTrialActive(false);
          setOtp('');
          setOrder(prev => prev ? {
            ...prev,
            trialPhaseEnd: update.trialPhaseEnd,
            trialPhaseDuration: update.trialPhaseDuration ?? prev.trialPhaseDuration,
            overtimePenalty: update.overtimePenalty ?? prev.overtimePenalty,
            finalBilling: update.finalBilling ?? prev.finalBilling,
          } : prev);
          showToast({ message: 'Trial ended! Amount calculated.', type: 'info' });
        }
      });

      const socket = getSocket();
      if (socket) {
        socket.on('trialPhaseStart', (data: any) => {
          const matches = !data.orderId || String(data.orderId).replace(/^["']|["']$/g, '') === cleanOrderId;
          if (matches) {
            setTrialActive(true);
            setTrialStart(data.trialPhaseStart);
            setTrialDuration(data.trialPhaseDuration);
          }
        });

        socket.on('photoVerified', (data: any) => {
          const matches = !data.orderId || String(data.orderId).replace(/^["']|["']$/g, '') === cleanOrderId;
          if (matches) {
            setOrder(prev => prev ? { ...prev, photoVerified: true, returnPhotos: data.returnPhotos } : prev);
            showToast({ message: 'Verification photo recorded by delivery partner!', type: 'info' });
          }
        });

        socket.on('trialPhaseEnded', (data: any) => {
          const matches = !data.orderId || String(data.orderId).replace(/^["']|["']$/g, '') === cleanOrderId;
          if (matches) {
            setTrialActive(false);
            setOtp('');
            setOrder(prev => prev ? {
              ...prev,
              trialPhaseEnd: data.trialPhaseEnd,
              trialPhaseDuration: data.durationMinutes ?? data.trialPhaseDuration ?? prev.trialPhaseDuration,
              overtimePenalty: data.overtimePenalty ?? prev.overtimePenalty,
              finalBilling: data.finalBilling ?? prev.finalBilling,
            } : prev);

            showAlert({
              title: '⏰ OTP Verified',
              message: `OTP verified! Please review your bill summary and complete payment.${data.overtimePenalty > 0 ? `\nRider waiting charge: ₹${data.overtimePenalty}` : ''}`,
              type: 'success',
            });
          }
        });

        socket.on('cashCollected', (data: any) => {
          const matches = !data.orderId || String(data.orderId).replace(/^["']|["']$/g, '') === cleanOrderId;
          if (matches) {
            setOrder(prev => prev ? {
              ...prev,
              paymentStatus: 'paid',
              orderStatus: data.orderStatus || 'selection_made',
              customerDeliveryStatus: 'completed',
            } : prev);

            if (data.hasReturns) {
              showAlert({
                title: '💵 Cash Received!',
                message: `Payment of ₹${data.amountCollected} confirmed. Your return items have been recorded and handed over.`,
                type: 'success',
                buttons: [
                  { text: 'Order Details', onPress: () => {} },
                  { text: 'View All Orders', onPress: () => router.replace('/orders' as any) }
                ]
              });
            } else {
              showAlert({
                title: '✅ Order Complete!',
                message: `Payment of ₹${data.amountCollected} has been confirmed by your delivery partner.\nThank you for shopping with FlashFits!`,
                type: 'success',
                buttons: [
                  { text: 'Order Details', onPress: () => {} },
                  { text: 'View All Orders', onPress: () => router.replace('/orders' as any) }
                ]
              });
            }
          }
        });
      }
    };

    fetchOrder().then((status) => {
      // Only join room if order is active
      const activeStates = ['placed', 'accepted', 'packed', 'in_transit', 'try_phase', 'selection_made'];
      if (status && activeStates.includes(status)) {
        setupSocket();
      }
    });

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('trialPhaseStart');
        socket.off('photoVerified');
        socket.off('trialPhaseEnded');
        socket.off('cashCollected');
      }
      removeOrderListeners();
      if (socketJoined) {
        leaveOrderRoom(cleanOrderId);
      }
    };
  }, [cleanOrderId]);

  // ── Auto-poll fallback during active delivery / handover transition ──
  useEffect(() => {
    if (!cleanOrderId) return;
    const activePollingStatuses = ['in_transit', 'packed', 'accepted', 'placed'];
    const riderAtDelivery = order?.deliveryRiderStatus === 'at_delivery';

    // Poll every 12 seconds as fallback while awaiting handover or rider arrival (sockets handle instant updates)
    if (!order?.orderStatus || activePollingStatuses.includes(order.orderStatus) || riderAtDelivery) {
      const pollInterval = setInterval(() => {
        fetchOrder();
      }, 12000);
      return () => clearInterval(pollInterval);
    }
  }, [cleanOrderId, order?.orderStatus, order?.deliveryRiderStatus, fetchOrder]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder().finally(() => setRefreshing(false));
  }, [fetchOrder]);


  const handleReportRider = async () => {
    if (order?.riderUnresponsiveReport?.status === 'pending') {
      showToast({ message: 'You have already reported the rider. An admin is reviewing it.', type: 'info' });
      return;
    }
    
    Alert.alert(
      "Report Rider Unresponsive",
      "Are you sure you want to report the rider? An admin will review this and may cancel your order if the rider cannot be reached.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Report", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!orderId) return;
              await reportUnresponsiveRider(orderId as string);
              showToast({ message: 'Rider reported successfully. Admin will review.', type: 'success' });
              fetchOrder();
            } catch (err: any) {
              showToast({ message: err.response?.data?.message || 'Failed to report rider.', type: 'error' });
            }
          }
        }
      ]
    );
  };

  // ── Order Status Predicates ──
  const status = order?.orderStatus || '';
  const isTryPhase = ['try_phase', 'selection_made'].includes(status);
  const isCompleted = order?.paymentStatus === 'paid' && (['completed', 'return_in_progress'].includes(status) || status === 'selection_made');
  const isTracking = ['placed', 'accepted', 'packed', 'in_transit'].includes(status);
  const isRiderVerified = Boolean(order?.trialPhaseEnd || order?.photoVerified || (order as any)?.isPhotoVerified);
  const hasSubmittedSelection = isSelectionSubmitted || order?.orderStatus === 'selection_made' || isRiderVerified;
  const isWaitingForRiderCash =
    (order?.paymentMethod === 'cod' || order?.deliveryRiderStatus === 'collecting_cash') &&
    order?.paymentStatus !== 'paid' &&
    billingSummary.totalPayable > 0;
  // Show the live map only after the rider has picked up the items from the merchant
  const isItemPickedUp =
    status === 'in_transit' ||
    ['picked_up', 'en_route_delivery', 'at_delivery'].includes(order?.deliveryRiderStatus) ||
    order?.customerDeliveryStatus === 'on_the_way';

  // ── Item Status Predicates ──
  const isItemKept = (item: any) => item.tryStatus === 'keep' || item.tryStatus === 'accepted';
  const isItemReturned = (item: any) => item.tryStatus === 'returned' || item.tryStatus === 'return';
  const isItemDecided = (item: any) => isItemKept(item) || isItemReturned(item);

  // ── Sync active coupon from order if available ──
  useEffect(() => {
    if (order?.couponCode && !appliedCoupon) {
      const matchedOffer = order.appliedOffers?.find((o: any) => o.couponCode?.toUpperCase() === order.couponCode?.toUpperCase());
      setAppliedCoupon({
        code: order.couponCode,
        discount: matchedOffer?.discountApplied || 0,
        title: matchedOffer?.title || order.couponCode,
        discountType: matchedOffer?.discountType,
        discountValue: matchedOffer?.discountValue,
        maxDiscount: (matchedOffer as any)?.maxDiscount,
        minCartValue: (matchedOffer as any)?.conditions?.minCartValue,
        freeDelivery: Boolean(matchedOffer?.freeDelivery),
        freeReturn: Boolean((matchedOffer as any)?.freeReturn || matchedOffer?.freeDelivery),
        freeWaiting: Boolean((matchedOffer as any)?.freeWaiting || matchedOffer?.freeDelivery),
      });
    }
  }, [order?.couponCode, order?.appliedOffers]);

  // ── Calculate discount on kept items ──
  const appliedOffersList = order?.appliedOffers || [];
  const keptItems = items.filter(isItemKept);
  const returnedItems = items.filter(isItemReturned);
  const keptSubtotal = keptItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const isCodPayment = order?.paymentMethod === 'cod' || (typeof order?.razorpayPaymentId === 'string' && order.razorpayPaymentId.startsWith('cod_'));
  const totalPaid = order?.finalBilling?.totalPayable ?? order?.totalPayable ?? billingSummary.totalPayable ?? 0;

  // ── Fetch available offers for final stage ──
  useEffect(() => {
    if (!order) return;
    const mid = order.merchantId?._id ? order.merchantId._id.toString() : (order.merchantId?.toString() || undefined);
    getAvailableOffers(keptSubtotal, mid, 'try_and_buy')
      .then((offers) => {
        setAvailableOffers(offers || []);
      })
      .catch((err) => {
        console.error('Failed to load available offers for order:', err);
      });
  }, [cleanOrderId, order?.merchantId, isRiderVerified, keptSubtotal]);

  // ── Apply Coupon Code Handler ──
  const handleApplyCouponCode = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) {
      showToast({ message: 'Please enter a coupon code', type: 'warning' });
      return false;
    }

    if (keptItems.length === 0 || keptSubtotal === 0) {
      showToast({ message: 'Please select at least 1 item to keep before applying a coupon.', type: 'warning' });
      return false;
    }

    setApplyingCoupon(true);
    try {
      const mid = order?.merchantId?._id ? order.merchantId._id.toString() : (order?.merchantId?.toString() || undefined);
      const cartContext = {
        items: keptItems.map(item => ({
          ...item,
          productId: (item as any).productId || item._id,
          categoryId: (item as any).categoryId,
          price: item.price,
          quantity: item.quantity || 1,
          merchantId: mid,
        })),
        subtotal: keptSubtotal,
        merchantTotals: mid ? { [mid]: keptSubtotal } : {},
      };

      const res = await applyCouponApi(code, cartContext, 'try_and_buy');
      if (res && res.success) {
        const offer = res.offer || {};
        const discountAmount = Number(res.discountAmount) || 0;
        const isFree = Boolean(offer.freeDelivery);
        setAppliedCoupon({
          code,
          discount: discountAmount,
          title: offer.title || code,
          description: offer.description,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          maxDiscount: offer.maxDiscount,
          minCartValue: offer.conditions?.minCartValue,
          freeDelivery: isFree,
          freeReturn: Boolean(offer.freeReturn || isFree),
          freeWaiting: Boolean(offer.freeWaiting || isFree),
        });
        setCouponCodeInput('');
        setOffersModalVisible(false);
        showToast({
          message: isFree && discountAmount === 0
            ? `Coupon ${code} applied! Free Delivery, Returns & Waiting unlocked 🎉`
            : `Coupon ${code} applied! Saved ₹${discountAmount}`,
          type: 'success',
        });
        return true;
      } else {
        showToast({
          message: res?.message || 'Invalid coupon code',
          type: 'error',
        });
        return false;
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to apply coupon';
      showToast({ message: msg, type: 'error' });
      return false;
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    showToast({ message: 'Coupon removed', type: 'info' });
  };

  const handleApplyOffer = async (offer: any) => {
    if (offer.couponCode) {
      return await handleApplyCouponCode(offer.couponCode);
    }
    showToast({ message: 'Store offers are automatically applied to qualifying items', type: 'info' });
    return false;
  };

  const combinedOffersForModal = useMemo(() => {
    const map = new Map<string, any>();
    availableOffers.forEach((o: any) => {
      const key = o._id?.toString() || o.couponCode || Math.random().toString();
      map.set(key, o);
    });
    appliedOffersList.forEach((o: any) => {
      const key = o._id?.toString() || o.offerId?.toString() || o.couponCode || 'applied';
      if (!map.has(key)) {
        map.set(key, {
          _id: key,
          title: o.title || o.couponCode || 'Applied Discount',
          couponCode: o.couponCode,
          requiresCoupon: !!o.couponCode,
          discountAmount: o.discountApplied,
          discountType: o.discountType,
          discountValue: o.discountValue,
          conditions: o.conditions,
          description: o.description || (o.couponCode ? `Coupon code ${o.couponCode}` : 'Applied store promotion'),
        });
      }
    });
    return Array.from(map.values());
  }, [availableOffers, appliedOffersList]);

  // ── Auto-applied Store promotions (excluding coupon code offers) ──
  let storeOffersDiscount = 0;
  if (appliedOffersList.length > 0 && keptSubtotal > 0) {
    for (const appliedOffer of appliedOffersList) {
      if (appliedOffer.couponCode) {
        continue;
      }
      const minSpend = (appliedOffer as any).conditions?.minCartValue || (appliedOffer as any).conditions?.minOrderValue || 0;
      if (minSpend > 0 && keptSubtotal < minSpend) {
        continue;
      }
      if (appliedOffer.discountType === 'percentage' && appliedOffer.discountValue) {
        let d = (keptSubtotal * appliedOffer.discountValue) / 100;
        if ((appliedOffer as any).maxDiscount) d = Math.min(d, (appliedOffer as any).maxDiscount);
        storeOffersDiscount += d;
      } else if (appliedOffer.discountType === 'flat' && appliedOffer.discountValue) {
        storeOffersDiscount += Math.min(appliedOffer.discountValue, keptSubtotal);
      } else if (appliedOffer.discountApplied) {
        storeOffersDiscount += appliedOffer.discountApplied;
      }
    }
  }
  storeOffersDiscount = Math.round(storeOffersDiscount);

  // ── Dynamic Coupon Discount Calculation ──
  let couponDiscount = 0;
  if (appliedCoupon && keptSubtotal > 0) {
    const minSpend = appliedCoupon.minCartValue || 0;
    if (minSpend === 0 || keptSubtotal >= minSpend) {
      if (appliedCoupon.discountType === 'percentage' && appliedCoupon.discountValue) {
        let d = (keptSubtotal * appliedCoupon.discountValue) / 100;
        if (appliedCoupon.maxDiscount) d = Math.min(d, appliedCoupon.maxDiscount);
        couponDiscount = d;
      } else if (appliedCoupon.discountType === 'flat' && appliedCoupon.discountValue) {
        couponDiscount = Math.min(appliedCoupon.discountValue, keptSubtotal);
      } else if (appliedCoupon.discount) {
        couponDiscount = Math.min(appliedCoupon.discount, keptSubtotal);
      }
    }
  }
  couponDiscount = Math.round(couponDiscount);

  // Combined discount to deduct from kept items total
  const discountToApply = storeOffersDiscount + couponDiscount;

  // ── Free Logistics Status & Charges ──
  const isFreeDelivery = Boolean(
    appliedCoupon?.freeDelivery || 
    appliedOffersList.some((o: any) => o.freeDelivery) ||
    order?.deliveryCharge === 0 ||
    order?.originalDeliveryCharge === 0
  );

  const isFreeReturn = Boolean(
    isFreeDelivery ||
    appliedCoupon?.freeReturn ||
    appliedCoupon?.freeDelivery ||
    appliedOffersList.some((o: any) => o.freeReturn || o.freeDelivery) ||
    order?.returnCharge === 0 ||
    order?.deliveryCharge === 0 ||
    order?.originalDeliveryCharge === 0
  );

  const isFreeWaiting = Boolean(
    isFreeDelivery ||
    appliedCoupon?.freeWaiting ||
    appliedCoupon?.freeDelivery ||
    appliedOffersList.some((o: any) => o.freeWaiting || o.freeDelivery)
  );

  const originalDeliveryCharge = Number(order?.originalDeliveryCharge ?? order?.deliveryCharge ?? 0);
  const effectiveDeliveryCharge = isFreeDelivery ? 0 : originalDeliveryCharge;
  const originalReturnCharge = Number(order?.originalReturnCharge ?? order?.returnCharge ?? 0);
  const effectiveReturnCharge = isFreeReturn ? 0 : originalReturnCharge;

  // ── Estimated Trial Overtime Penalty (waived if isFreeWaiting) ──
  const estimatedOvertimePenalty = useMemo(() => {
    if (isFreeWaiting) return 0;
    if (order?.finalBilling?.overtimePenalty !== undefined && order.finalBilling.overtimePenalty > 0) {
      return order.finalBilling.overtimePenalty;
    }
    if (order?.overtimePenalty !== undefined && order.overtimePenalty > 0) {
      return order.overtimePenalty;
    }
    const start = order?.trialPhaseStart || trialStart;
    if (!start) return 0;
    const startTime = new Date(start as string).getTime();
    const endTime = order?.trialPhaseEnd ? new Date(order.trialPhaseEnd).getTime() : Date.now();
    const elapsedMins = Math.floor((endTime - startTime) / 60000);
    return elapsedMins > 10 ? (elapsedMins - 10) * 2 : 0;
  }, [isFreeWaiting, order?.finalBilling?.overtimePenalty, order?.overtimePenalty, order?.trialPhaseStart, order?.trialPhaseEnd, trialStart]);

  useEffect(() => {
    if (items.length > 0) {
      const summary = calculateFinalBilling({
        orderItems: [...items],
        deliveryCharge: effectiveDeliveryCharge,
        returnCharge: effectiveReturnCharge,
        deliveryTip: order?.finalBilling?.deliveryTip ?? order?.deliveryTip ?? 0,
        discountToApply,
        overtimePenalty: estimatedOvertimePenalty,
      });
      setBillingSummary(summary);
    }
  }, [items, effectiveDeliveryCharge, effectiveReturnCharge, order?.finalBilling?.deliveryTip, order?.deliveryTip, estimatedOvertimePenalty, discountToApply]);

  // ── Item keep/return ──
  const handleItemUpdate = (index: number, tryStatus: 'keep' | 'returned', reason: string | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], tryStatus, returnReason: reason };
    setItems(updated);
  };

  const allSelected = items.length > 0 && items.every(isItemDecided);
  const hasReturns = items.some(isItemReturned);
  const isAllReturned = items.length > 0 && items.every(isItemReturned);

  useEffect(() => {
    if (!isAllReturned && finalPaymentMethod !== 'online') {
      setFinalPaymentMethod('online');
    }
  }, [isAllReturned, finalPaymentMethod]);

  // ── Confirm cloth selection without charging (waits for rider OTP & photo verification) ──
  const handleConfirmSelectionOnly = async () => {
    if (!allSelected) {
      showToast({ message: 'Please mark each item as Keep or Return.', type: 'warning' });
      return;
    }

    setConfirmingSelection(true);
    try {
      const payload = {
        orderId: orderId!,
        items: items.map(i => ({
          itemId: i._id,
          tryStatus: isItemReturned(i) ? 'return' : 'keep',
          returnReason: isItemReturned(i) ? (i.returnReason?.trim() || null) : null,
        })),
      };

      await confirmClothSelection(payload);
      setShowConfirmModal(false);
      setIsSelectionSubmitted(true);
      showToast({ message: 'Selection saved! Please share your OTP with your delivery partner.', type: 'success' });
    } catch (err: any) {
      console.error('Confirm selection error:', err);
      showToast({ message: err?.response?.data?.message || 'Failed to save selection. Please try again.', type: 'error' });
    } finally {
      setConfirmingSelection(false);
    }
  };

  // ── Submit selection & Pay (Triggered from Bill Summary Screen after rider verifies OTP & photo) ──
  const handleSubmitSelection = async () => {
    setSubmitting(true);
    try {
      // Ensure all items are decided without blocking: any item explicitly returned stays returned, everything else is kept
      const finalizedItems = items.map(i => {
        const isRet = isItemReturned(i);
        return {
          itemId: i._id,
          tryStatus: isRet ? 'returned' : 'keep',
          returnReason: isRet ? (i.returnReason?.trim() || null) : null,
        };
      });

      // Update state so UI stays in complete sync
      setItems(prev => prev.map(i => ({
        ...i,
        tryStatus: isItemReturned(i) ? 'returned' : 'keep',
      })));

      // If customer returned all items and chose to pay directly to rider (COD)
      if (isAllReturned && finalPaymentMethod === 'cod' && billingSummary.totalPayable > 0) {
        const codRes = await confirmCodSelection({
          orderId: orderId!,
          items: finalizedItems,
          finalPaymentMethod: 'cod',
        });

        if (codRes && (codRes.success || codRes.orderId)) {
          setOrder(prev => prev ? {
            ...prev,
            orderStatus: 'selection_made',
            customerDeliveryStatus: 'in_progress',
            deliveryRiderStatus: 'collecting_cash',
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            finalBilling: {
              ...prev.finalBilling,
              baseAmount: billingSummary.baseAmount,
              totalPayable: billingSummary.totalPayable,
              deliveryCharge: billingSummary.deliveryCharge,
              discount: billingSummary.discountApplied,
            }
          } : null);
          await fetchOrder();

          showAlert({
            title: '💵 Cash Payment Selected',
            message: `Please hand over ₹${billingSummary.totalPayable} directly to ${rider?.name || 'your delivery partner'} (Cash or UPI QR).\n\nYour order will automatically complete once your delivery partner confirms receipt on their phone.`,
            type: 'info',
            buttons: [
              { text: 'Got it', onPress: () => {} }
            ]
          });
        }
        setSubmitting(false);
        return;
      }

      // Online Razorpay payment for final payment
      const payload = {
        orderId: orderId!,
        items: finalizedItems,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        finalPaymentMethod: 'online',
      };

      // initiate final payment order (this creates Razorpay order on backend)
      const res = await finalpaymentInitiate(payload);

      if (!res) {
        setSubmitting(false);
        return;
      }

      // If nothing is payable (₹0 due)
      if (res.isDeliveryFree || billingSummary.totalPayable === 0) {
        setOrder(prev => prev ? {
          ...prev,
          orderStatus: hasReturns ? 'return_in_progress' : 'completed',
          paymentStatus: 'paid',
          finalBilling: {
            ...prev.finalBilling,
            baseAmount: billingSummary.baseAmount,
            totalPayable: 0,
            deliveryCharge: 0,
            discount: billingSummary.discountApplied,
          }
        } : null);
        await fetchOrder();

        showAlert({
          title: hasReturns ? '✅ Return Complete!' : '✅ Order Confirmed!',
          message: hasReturns
            ? 'All items returned with ₹0 fee due. Package handed over to delivery partner.'
            : 'All items kept with ₹0 due. Thank you for shopping with FlashFits!',
          type: 'success',
          buttons: [
            { text: 'Order Details', onPress: () => {} },
            { text: 'View All Orders', onPress: () => router.replace('/orders' as any) }
          ]
        });
        setSubmitting(false);
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
          setOrder(prev => prev ? {
            ...prev,
            orderStatus: hasReturns ? 'return_in_progress' : 'completed',
            paymentStatus: 'paid',
            finalBilling: {
              ...prev.finalBilling,
              baseAmount: billingSummary.baseAmount,
              totalPayable: billingSummary.totalPayable,
              deliveryCharge: billingSummary.deliveryCharge,
              discount: billingSummary.discountApplied,
            }
          } : null);
          await fetchOrder();

          showAlert({
            title: '✅ Payment Successful!',
            message: hasReturns
              ? `Payment of ₹${billingSummary.totalPayable} confirmed. Your return items have been recorded and handed over.`
              : `Payment of ₹${billingSummary.totalPayable} confirmed! Thank you for shopping with FlashFits.`,
            type: 'success',
            buttons: [
              { text: 'Order Details', onPress: () => {} },
              { text: 'View All Orders', onPress: () => router.replace('/orders' as any) }
            ]
          });
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading order…</Text>
      </View>
    );
  }

  const handleHelp = () => {
    if (order?.riderUnresponsiveReport?.status === 'pending') {
      Alert.alert('Rider Reported', 'You have already reported the rider. An admin is reviewing it.');
      return;
    }
    Alert.alert(
      "Help Support",
      "How can we assist you with this order?",
      [
        { text: "Rider is unresponsive", onPress: handleReportRider },
        { text: "Other Issue", onPress: () => router.push('/(app)/help-center') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderId?.slice(-5).toUpperCase()}</Text>
        <TouchableOpacity onPress={handleHelp} style={styles.backBtn}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary }}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ─── Status Banner (shown during tracking & try phase) ─── */}
        {!isCompleted && (
          <View style={[styles.statusBanner, { backgroundColor: theme.primary + '10' }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
            <View style={{ flex: 1 }}>
              {isTracking && (
                <>
                  <Text style={[styles.statusLabel, { color: theme.primary }]}>
                    {order?.deliveryRiderStatus === 'at_delivery' ? 'ARRIVED' : status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  {order?.deliveryRiderStatus === 'at_delivery' ? (
                    <Text style={styles.eta}>
                      Rider has reached your location!
                    </Text>
                  ) : (
                    order?.estimatedTime && (
                      <Text style={styles.eta}>
                        {order.estimatedTime === 'Calculating...' ? 'Estimating arrival...' : `Arriving in ${order.estimatedTime} mins`}
                      </Text>
                    )
                  )}
                </>
              )}
              {isTryPhase && (
                <Text style={[styles.statusLabel, { color: theme.primary }]}>TRY YOUR FITS ⚡</Text>
              )}
            </View>
            <View style={[styles.tbBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ color: '#166534', fontSize: 10, fontWeight: '700' }}>TRY & BUY</Text>
            </View>
          </View>
        )}

        {/* ─── Live Delivery Map (OpenStreetMap) ─── */}
        {isTracking && isItemPickedUp && (
          <LiveOrderMap
            orderId={orderId}
            orderStatus={status}
            deliveryRiderStatus={order?.deliveryRiderStatus}
            pickupCoordinates={order?.pickupLocation?.coordinates}
            deliveryCoordinates={order?.deliveryLocation?.coordinates}
            merchantName={order?.merchantDetails?.name || 'Store'}
            riderName={rider?.name || 'Rider'}
            estimatedMinutes={order?.estimatedTime}
          />
        )}

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
          <View style={[styles.riderCard, { flexDirection: 'column', gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
          </View>
        )}

        {/* ─── Handover OTP Badge (Only in-transit before delivery) ─── */}
        {otp && status === 'in_transit' && (
          <View style={styles.otpCard}>
            <Ionicons name="key-outline" size={18} color="#1A73E8" />
            <View style={{ flex: 1 }}>
              <Text style={styles.otpText}>
                Handover OTP: <Text style={{ fontWeight: '900', letterSpacing: 2 }}>{otp}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* ─── Try Phase Section ─── */}
        {isTryPhase && (
          <>
            {/* STAGE 1: Customer Item Selection (Before customer confirms selection) */}
            {!isRiderVerified && !hasSubmittedSelection && (
              <>
                {/* Active Trial Timer */}
                {trialActive && !order?.trialPhaseEnd && (
                  <TrialTimer start={trialStart} duration={trialDuration} />
                )}

                {/* Item Selection Card */}
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
                          style={[styles.actionBtn, isItemKept(item) && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}
                          onPress={() => handleItemUpdate(idx, 'keep', null)}
                        >
                          <Ionicons name={isItemKept(item) ? 'checkmark-circle' : 'checkmark-circle-outline'} size={18} color={isItemKept(item) ? '#16A34A' : '#94A3B8'} />
                          <Text style={[styles.actionText, isItemKept(item) && { color: '#16A34A', fontWeight: '800' }]}>
                            Keep
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, isItemReturned(item) && { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
                          onPress={() => handleItemUpdate(idx, 'returned', item.returnReason || '')}
                        >
                          <Ionicons name={isItemReturned(item) ? 'arrow-undo-circle' : 'arrow-undo-circle-outline'} size={18} color={isItemReturned(item) ? '#EF4444' : '#94A3B8'} />
                          <Text style={[styles.actionText, isItemReturned(item) && { color: '#EF4444', fontWeight: '800' }]}>
                            Return
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {isItemReturned(item) && (
                        <TextInput
                          style={[styles.reasonInput, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}
                          placeholder="Feel free to add feedback (Optional)"
                          placeholderTextColor="#94A3B8"
                          value={item.returnReason || ''}
                          onChangeText={text => handleItemUpdate(idx, 'returned', text)}
                          multiline
                        />
                      )}
                    </View>
                  ))}

                  {/* Estimated Bill (Live Selection) */}
                  <EstimatedBillSection
                    summary={billingSummary}
                    isFreeDelivery={isFreeDelivery}
                    isFreeReturn={isFreeReturn}
                    originalDeliveryCharge={originalDeliveryCharge}
                    effectiveDeliveryCharge={effectiveDeliveryCharge}
                    overtimeFee={estimatedOvertimePenalty}
                    discountAmount={discountToApply}
                    themeColor={theme.primary}
                    title="Estimated Bill"
                    showNotice={true}
                  />

                  {/* Confirm Selection Button (DOES NOT CHARGE - saves selection and unlocks rider verification) */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: allSelected ? theme.primary : '#CBD5E1', marginTop: 12 },
                    ]}
                    onPress={() => {
                      if (!allSelected) {
                        showToast({ message: 'Please mark each item as Keep or Return.', type: 'warning' });
                        return;
                      }
                      setShowConfirmModal(true);
                    }}
                    disabled={!allSelected || confirmingSelection}
                  >
                    {confirmingSelection ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                        <Text style={styles.submitText}>
                          {allSelected ? "Confirm Selection & Share OTP" : "Select Keep or Return for all items"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STAGE 2: Waiting for Delivery Partner Verification (OTP & Photo) */}
            {!isRiderVerified && hasSubmittedSelection && (
              <View style={[styles.card, { backgroundColor: '#fff', borderColor: '#E2E8F0', borderWidth: 1, padding: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="shield-checkmark" size={24} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Selection Recorded</Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      {items.filter(i => i.tryStatus === 'keep' || i.tryStatus === 'accepted').length} kept • {items.filter(i => i.tryStatus === 'returned').length} returned
                    </Text>
                  </View>
                </View>

                {/* Big OTP Card */}
                <View style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 16,
                  marginVertical: 10,
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Share Completion OTP with Delivery Partner
                  </Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: theme.primary, letterSpacing: 6, marginVertical: 6 }}>
                    {otp || order?.otp || '••••'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                    Your delivery partner will enter this OTP on their app to conclude the trial period.
                  </Text>
                </View>

                {/* Estimated Bill in Stage 2 */}
                <EstimatedBillSection
                  summary={billingSummary}
                  isFreeDelivery={isFreeDelivery}
                  isFreeReturn={isFreeReturn}
                  originalDeliveryCharge={originalDeliveryCharge}
                  effectiveDeliveryCharge={effectiveDeliveryCharge}
                  overtimeFee={estimatedOvertimePenalty}
                  discountAmount={discountToApply}
                  themeColor={theme.primary}
                  title="Estimated Bill"
                  showNotice={true}
                />

                {/* Live Step Progress Checklist */}
                <View style={{ gap: 10, marginTop: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>1. Your Selection Confirmed</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {order?.trialPhaseEnd ? (
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    ) : (
                      <ActivityIndicator size="small" color="#F59E0B" />
                    )}
                    <Text style={{ fontSize: 13, fontWeight: '600', color: order?.trialPhaseEnd ? '#16A34A' : '#D97706' }}>
                      {order?.trialPhaseEnd ? "2. Rider OTP Verified (Trial Ended)" : "2. Awaiting Rider OTP Entry..."}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="card-outline" size={20} color="#6366F1" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#4F46E5' }}>
                      3. Bill & payment screen unlocks upon OTP verification
                    </Text>
                  </View>
                </View>

                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="information-circle" size={18} color="#2563EB" />
                  <Text style={{ flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 16 }}>
                    Your bill summary and final payment screen will unlock as soon as your delivery partner enters your OTP.
                  </Text>
                </View>
              </View>
            )}

            {/* STAGE 3: Bill Summary & Final Payment (UNLOCKED ONLY AFTER RIDER VERIFICATION) */}
            {isRiderVerified && (
              <View style={styles.card}>
                {/* Header Badge */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#F0FDF4',
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#86EFAC',
                  marginBottom: 16,
                }}>
                  <Ionicons name="checkmark-circle" size={26} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#15803D' }}>
                      Trial Verified! Bill Summary
                    </Text>
                    <Text style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                      {order?.trialPhaseDuration ? `Trial duration: ${order.trialPhaseDuration} mins.` : 'Trial verified by delivery partner.'} Please review your bill and complete payment.
                    </Text>
                    {order?.photoVerified && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                        <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '600' }}>
                          Return photo evidence recorded
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Items Summary */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
                    Items Breakdown ({items.filter(isItemKept).length} kept, {items.filter(isItemReturned).length} returned)
                  </Text>
                  {items.map((item, idx) => (
                    <View key={item._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          Size: {item.size} • Status: <Text style={{ fontWeight: '700', color: isItemKept(item) ? '#16A34A' : '#EF4444' }}>{isItemKept(item) ? 'KEPT' : 'RETURNED'}</Text>
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          {isItemKept(item) ? `₹${item.price * (item.quantity || 1)}` : '₹0'}
                        </Text>
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: isItemKept(item) ? '#FEF2F2' : '#DCFCE7',
                            borderWidth: 1,
                            borderColor: isItemKept(item) ? '#FECACA' : '#BBF7D0',
                          }}
                          onPress={() => handleItemUpdate(idx, isItemKept(item) ? 'returned' : 'keep', isItemKept(item) ? (item.returnReason || '') : null)}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isItemKept(item) ? '#EF4444' : '#16A34A' }}>
                            {isItemKept(item) ? 'Return item' : 'Keep item'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Coupons & Offers Section (Post-Try Phase) */}
                <View style={[styles.billingCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, marginBottom: 16, padding: 14 }]}>
                  {/* Section Title */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="ticket-percent-outline" size={20} color={theme.primary} />
                      <Text style={{ fontSize: 14, fontFamily: Typography.fontFamily.bold, color: '#0F172A' }}>
                        Coupons & Offers
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setOffersModalVisible(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: theme.primary }}>
                        View All Offers ›
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active Applied Coupon Card (if a coupon is applied) */}
                  {appliedCoupon ? (
                    <View
                      style={{
                        backgroundColor: '#F0FDF4',
                        borderColor: '#86EFAC',
                        borderWidth: 1.5,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View
                            style={{
                              backgroundColor: '#DCFCE7',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#86EFAC',
                            }}
                          >
                            <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#15803D', letterSpacing: 0.5 }}>
                              {appliedCoupon.code}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#166534' }}>
                              Coupon Applied!
                            </Text>
                            {appliedCoupon.minCartValue && keptSubtotal < appliedCoupon.minCartValue ? (
                              <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#B45309', marginTop: 2 }}>
                                ⚠️ Min. kept spend ₹{appliedCoupon.minCartValue} required
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 11, color: '#15803D', marginTop: 1 }}>
                                {appliedCoupon.title ? appliedCoupon.title : 'Savings applied on kept items'}
                              </Text>
                            )}
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={handleRemoveCoupon}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: '#FEF2F2',
                            borderWidth: 1,
                            borderColor: '#FECACA',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#EF4444' }}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {appliedCoupon.freeDelivery && (
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#DCFCE7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#166534' }}>
                            Delivery Fee Waived:
                          </Text>
                          <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#16A34A' }}>
                            {originalDeliveryCharge > 0 ? `FREE (Saved ₹${originalDeliveryCharge})` : 'FREE (₹0)'}
                          </Text>
                        </View>
                      )}

                      {(!appliedCoupon.minCartValue || keptSubtotal >= appliedCoupon.minCartValue) && couponDiscount > 0 && (
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#DCFCE7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#166534' }}>
                            Discount deduction on final bill:
                          </Text>
                          <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#16A34A' }}>
                            - ₹{couponDiscount}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    /* Coupon Input Field when no coupon is applied */
                    <View style={{ marginBottom: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: '#E2E8F0',
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                        }}
                      >
                        <MaterialCommunityIcons name="ticket-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontFamily: Typography.fontFamily.bold,
                            color: '#0F172A',
                            paddingVertical: 8,
                            letterSpacing: 0.5,
                          }}
                          placeholder="Enter coupon code"
                          placeholderTextColor="#94A3B8"
                          value={couponCodeInput}
                          onChangeText={(text) => setCouponCodeInput(text.toUpperCase())}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={{
                            backgroundColor: couponCodeInput.trim() ? theme.primary : '#E2E8F0',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 8,
                          }}
                          onPress={() => handleApplyCouponCode()}
                          disabled={!couponCodeInput.trim() || applyingCoupon}
                        >
                          {applyingCoupon ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: Typography.fontFamily.bold,
                                color: couponCodeInput.trim() ? '#FFFFFF' : '#94A3B8',
                              }}
                            >
                              Apply
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Quick Offer Trigger */}
                      <TouchableOpacity
                        onPress={() => setOffersModalVisible(true)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          marginTop: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <MaterialCommunityIcons name="tag-outline" size={14} color={theme.primary} />
                        <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: theme.primary }}>
                          Tap to select from available coupons & offers ›
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Auto-applied store offers (if any non-coupon offers exist in order) */}
                  {appliedOffersList
                    .filter((o: any) => !o.couponCode && (!appliedCoupon || o.offerId !== (appliedCoupon as any)._id))
                    .map((appliedItem: any, idx: number) => {
                      const minSpend = appliedItem.conditions?.minCartValue || appliedItem.conditions?.minOrderValue || 0;
                      const thresholdMet = minSpend === 0 || keptSubtotal >= minSpend;

                      return (
                        <View
                          key={appliedItem._id || appliedItem.offerId || idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 10,
                            padding: 10,
                            marginTop: 6,
                            borderWidth: 1,
                            borderColor: thresholdMet ? '#DCFCE7' : '#FDE68A',
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <View
                                style={{
                                  paddingHorizontal: 5,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  backgroundColor: '#FEF3C7',
                                  borderWidth: 1,
                                  borderColor: '#FDE68A',
                                }}
                              >
                                <Text style={{ fontSize: 9, fontFamily: Typography.fontFamily.bold, color: '#B45309' }}>
                                  🏷️ STORE OFFER (Auto-applied)
                                </Text>
                              </View>
                              <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#0F172A' }}>
                                {appliedItem.title || 'Store promotion'}
                              </Text>
                            </View>
                            {!thresholdMet && (
                              <Text style={{ fontSize: 10, fontFamily: Typography.fontFamily.medium, color: '#B45309' }}>
                                ⚠️ Requires kept items worth at least ₹{minSpend}
                              </Text>
                            )}
                          </View>
                          {thresholdMet && (appliedItem.discountApplied || 0) > 0 && (
                            <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#16A34A' }}>
                              - ₹{appliedItem.discountApplied}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                </View>

                {/* Detailed Billing Summary */}
                <View style={styles.billingCard}>
                  <Text style={styles.billingTitle}>Billing Summary</Text>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>
                      Items Kept ({billingSummary.itemsAccepted})
                    </Text>
                    <Text style={styles.billValue}>₹{billingSummary.baseAmount}</Text>
                  </View>

                  {/* Active Applied Coupon in Billing Summary */}
                  {appliedCoupon && (couponDiscount > 0 || appliedCoupon.freeDelivery) && (
                    <View style={[styles.billRow, { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="pricetag" size={15} color="#16A34A" />
                        <View>
                          <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#15803D' }}>
                            Coupon ({appliedCoupon.code})
                          </Text>
                          {appliedCoupon.freeDelivery && (
                            <Text style={{ fontSize: 11, color: '#166534', fontFamily: Typography.fontFamily.medium }}>
                              Free Delivery Applied
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#16A34A' }}>
                        {couponDiscount > 0 ? `- ₹${couponDiscount}` : 'FREE DEL'}
                      </Text>
                    </View>
                  )}

                  {/* Store Offers Discount (auto-applied promotions) */}
                  {storeOffersDiscount > 0 && (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, { color: '#10B981', fontFamily: Typography.fontFamily.bold }]}>
                        Store Offers Discount
                      </Text>
                      <Text style={[styles.billValue, { color: '#10B981', fontFamily: Typography.fontFamily.bold }]}>
                        - ₹{storeOffersDiscount}
                      </Text>
                    </View>
                  )}

                  {billingSummary.returnChargeDeduction > 0 && (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, { color: '#10B981' }]}>Return Charge Saved</Text>
                      <Text style={[styles.billValue, { color: '#10B981' }]}>- ₹{billingSummary.returnChargeDeduction}</Text>
                    </View>
                  )}

                  {billingSummary.itemsReturned > 0 && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabelSmall}>
                        Return Charge ({billingSummary.itemsReturned} items)
                      </Text>
                      {isFreeReturn || billingSummary.effectiveReturnCharge === 0 ? (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>FREE</Text>
                        </View>
                      ) : (
                        <Text style={styles.billValueSmall}>₹{billingSummary.effectiveReturnCharge}</Text>
                      )}
                    </View>
                  )}

                  {/* RIDER WAITING CHARGE */}
                  {!isFreeWaiting && (order?.finalBilling?.overtimePenalty || order?.overtimePenalty || billingSummary.overtimePenalty) > 0 ? (
                    <View style={styles.billRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                        <Ionicons name="time-outline" size={15} color="#64748B" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.billLabel} numberOfLines={1}>
                            Rider Waiting Charge
                          </Text>
                          <Text style={styles.billLabelSmall} numberOfLines={1}>
                            {order?.trialPhaseDuration ? `Trial time: ${order.trialPhaseDuration}m (10m free)` : 'Extra trial time beyond 10 mins'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.billValue, { color: '#0F172A', fontWeight: '700' }]}>
                        ₹{order?.finalBilling?.overtimePenalty || order?.overtimePenalty || billingSummary.overtimePenalty}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.billRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                        <Ionicons name="time-outline" size={15} color="#64748B" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.billLabel}>Rider Waiting Charge</Text>
                          <Text style={styles.billLabelSmall}>
                            {isFreeWaiting ? 'Free trial waiting included with coupon' : '10 mins trial time included'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>FREE</Text>
                      </View>
                    </View>
                  )}

                  {/* Delivery Charge */}
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Delivery Charge</Text>
                    {isFreeDelivery ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {originalDeliveryCharge > 0 && (
                          <Text style={{ fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' }}>
                            ₹{originalDeliveryCharge}
                          </Text>
                        )}
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>FREE</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.billValue}>₹{originalDeliveryCharge}</Text>
                    )}
                  </View>

                  {(billingSummary.deliveryTip ?? 0) > 0 && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Delivery Tip</Text>
                      <Text style={styles.billValue}>₹{billingSummary.deliveryTip}</Text>
                    </View>
                  )}

                  <View style={styles.billDivider} />

                  <View style={styles.billRow}>
                    <Text style={styles.billTotal}>Total Payable</Text>
                    <Text style={[styles.billTotal, { color: theme.primary }]}>₹{billingSummary.totalPayable}</Text>
                  </View>
                </View>

                {/* 2-WAY HANDSHAKE: Waiting for Rider Payment Confirmation */}
                {isWaitingForRiderCash ? (
                  <View style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: '#86EFAC',
                    padding: 16,
                    marginTop: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#DCFCE7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Ionicons name="cash" size={26} color="#16A34A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontFamily: Typography.fontFamily.bold, color: '#15803D' }}>
                          Pay ₹{billingSummary.totalPayable} to Delivery Partner
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.medium, color: '#166534', marginTop: 2 }}>
                          Hand over cash or scan delivery partner's UPI QR
                        </Text>
                      </View>
                    </View>

                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      marginBottom: 14,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <ActivityIndicator size="small" color="#16A34A" />
                        <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#15803D' }}>
                          Waiting for Delivery Partner to Confirm...
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#4B5563', lineHeight: 18 }}>
                        Please hand over ₹{billingSummary.totalPayable} to {rider?.name || 'your delivery partner'}. Once they confirm payment on their device, your order will complete automatically.
                      </Text>

                      {rider?.phone && (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 10,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            backgroundColor: '#F3F4F6',
                            borderRadius: 8,
                            alignSelf: 'flex-start',
                          }}
                          onPress={() => Linking.openURL(`tel:${rider.phone}`)}
                        >
                          <Ionicons name="call" size={13} color="#374151" />
                          <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#374151' }}>
                            Call {rider.name || 'Rider'}: {rider.phone}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Secondary option to switch to Razorpay online payment */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 12,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#93C5FD',
                      }}
                      onPress={() => {
                        setFinalPaymentMethod('online');
                        setOrder(prev => prev ? { ...prev, paymentMethod: 'online' } : prev);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="card-outline" size={16} color="#2563EB" />
                      <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#2563EB' }}>
                        Change to Pay Online via Razorpay
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Payment Option Selector — ONLY when all items are returned (no items kept) and amount > 0 */}
                    {isAllReturned && billingSummary.totalPayable > 0 && (
                      <View style={styles.paymentOptionContainer}>
                        <Text style={styles.paymentOptionHeader}>
                          Choose Payment Option
                        </Text>
                        <Text style={styles.paymentOptionSubtext}>
                          Since no items were kept, you can pay the remaining charges (delivery, return & waiting charge) online or directly to your delivery partner.
                        </Text>

                        <View style={styles.paymentOptionCardsWrap}>
                          {/* Option 1: Pay Online via Razorpay */}
                          <TouchableOpacity
                            style={[
                              styles.paymentOptionCard,
                              finalPaymentMethod === 'online' && { borderColor: theme.primary, backgroundColor: '#F8FAFC' },
                            ]}
                            onPress={() => setFinalPaymentMethod('online')}
                            activeOpacity={0.8}
                          >
                            <View style={[
                              styles.paymentOptionRadio,
                              finalPaymentMethod === 'online' && { borderColor: theme.primary },
                            ]}>
                              {finalPaymentMethod === 'online' && (
                                <View style={[styles.paymentOptionRadioInner, { backgroundColor: theme.primary }]} />
                              )}
                            </View>
                            <View style={[styles.paymentOptionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                              <Ionicons name="card" size={20} color="#2563EB" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.paymentOptionTitle}>
                                Pay Online to FlashFits
                              </Text>
                              <Text style={styles.paymentOptionDesc}>
                                Directly via Razorpay (UPI, Cards, NetBanking)
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* Option 2: Pay Directly to Rider */}
                          <TouchableOpacity
                            style={[
                              styles.paymentOptionCard,
                              finalPaymentMethod === 'cod' && { borderColor: theme.primary, backgroundColor: '#F8FAFC' },
                            ]}
                            onPress={() => setFinalPaymentMethod('cod')}
                            activeOpacity={0.8}
                          >
                            <View style={[
                              styles.paymentOptionRadio,
                              finalPaymentMethod === 'cod' && { borderColor: theme.primary },
                            ]}>
                              {finalPaymentMethod === 'cod' && (
                                <View style={[styles.paymentOptionRadioInner, { backgroundColor: theme.primary }]} />
                              )}
                            </View>
                            <View style={[styles.paymentOptionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="cash" size={20} color="#16A34A" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.paymentOptionTitle}>
                                Pay Directly to Rider
                              </Text>
                              <Text style={styles.paymentOptionDesc}>
                                Hand over Cash or UPI directly to your delivery partner
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Final Payment CTA */}
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        { backgroundColor: theme.primary, marginTop: isAllReturned && billingSummary.totalPayable > 0 ? 10 : 16 },
                      ]}
                      onPress={handleSubmitSelection}
                      disabled={submitting}
                      activeOpacity={0.85}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons
                            name={
                              billingSummary.totalPayable === 0
                                ? 'checkmark-circle'
                                : (isAllReturned && finalPaymentMethod === 'cod')
                                  ? 'cash'
                                  : 'card'
                            }
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.submitText}>
                            {billingSummary.totalPayable === 0
                              ? 'Complete Order (₹0 Due)'
                              : (isAllReturned && finalPaymentMethod === 'cod')
                                ? `Pay ₹${billingSummary.totalPayable} to Rider`
                                : `Pay ₹${billingSummary.totalPayable} with Razorpay`}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                      <Ionicons
                        name={isAllReturned && finalPaymentMethod === 'cod' ? 'cash-outline' : 'shield-checkmark'}
                        size={14}
                        color={isAllReturned && finalPaymentMethod === 'cod' ? '#64748B' : '#16A34A'}
                      />
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                        {isAllReturned && finalPaymentMethod === 'cod'
                          ? `Hand over ₹${billingSummary.totalPayable} cash or UPI to delivery partner upon return`
                          : 'Secured by Razorpay • UPI, Cards, NetBanking'}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* ─── Completed State (Revamped Luxury Experience) ─── */}
        {isCompleted && (
          <View style={styles.completedContainer}>
            {/* 1. Celebratory Hero Card */}
            <View style={styles.premiumHeroCard}>
              <View style={styles.heroHaloOuter}>
                <View style={[styles.heroHaloInner, { backgroundColor: isAllReturned ? '#F1F5F9' : '#DCFCE7' }]}>
                  <Ionicons
                    name={isAllReturned ? 'sparkles' : 'checkmark-done-circle'}
                    size={38}
                    color={isAllReturned ? '#0F172A' : '#16A34A'}
                  />
                </View>
              </View>

              <View style={[styles.heroPill, { backgroundColor: isAllReturned ? '#F1F5F9' : '#DCFCE7' }]}>
                <Ionicons
                  name={isAllReturned ? 'cube-outline' : 'flash'}
                  size={12}
                  color={isAllReturned ? '#475569' : '#16A34A'}
                />
                <Text style={[styles.heroPillText, { color: isAllReturned ? '#475569' : '#166534' }]}>
                  {isAllReturned ? 'RETURN COMPLETED & SETTLED' : 'TRY & BUY COMPLETED'}
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                {isAllReturned
                  ? 'All Done! Return Handed Over'
                  : keptItems.length === items.length
                    ? 'FlashFits in Your Closet! ✨'
                    : 'Your Selection is Finalized! ✨'}
              </Text>

              <Text style={styles.heroSubtitle}>
                {isAllReturned
                  ? 'Your return items have been verified and handed over to your delivery partner. Thank you for trying FlashFits!'
                  : `You kept ${keptItems.length} ${keptItems.length === 1 ? 'item' : 'items'}${returnedItems.length > 0 ? ` and returned ${returnedItems.length}` : ''}. We hope you love your new fits!`}
              </Text>

              <View style={styles.heroOrderMetaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="receipt-outline" size={13} color="#64748B" />
                  <Text style={styles.metaChipText}>Order #{orderId?.slice(-5).toUpperCase()}</Text>
                </View>
                <View style={styles.metaDot} />
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={13} color="#64748B" />
                  <Text style={styles.metaChipText}>
                    {order?.trialPhaseDuration ? `${order.trialPhaseDuration}m trial` : 'Instant Delivery'}
                  </Text>
                </View>
                <View style={styles.metaDot} />
                <View style={styles.metaChip}>
                  <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
                  <Text style={[styles.metaChipText, { color: '#16A34A', fontWeight: '700' }]}>Verified</Text>
                </View>
              </View>
            </View>

            {/* 2. Visual Outcome Highlights (Kept vs Returned) */}
            <View style={styles.statsStripRow}>
              <View style={[styles.statBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="shirt" size={16} color="#16A34A" />
                  <Text style={[styles.statBoxLabel, { color: '#166534' }]}>Kept Items</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: '#15803D' }]}>{keptItems.length}</Text>
                <Text style={styles.statBoxSub}>₹{keptSubtotal} in wardrobe</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="arrow-undo" size={16} color="#64748B" />
                  <Text style={[styles.statBoxLabel, { color: '#475569' }]}>Returned</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: '#0F172A' }]}>{returnedItems.length}</Text>
                <Text style={styles.statBoxSub}>Handed to rider</Text>
              </View>
            </View>

            {/* 3. SHOWSTOPPER: Rate Your Experience Card */}
            {reviews.length === 0 ? (
              <LinearGradient
                colors={['#0F172A', '#1E293B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rateExperienceCard}
              >
                <View style={styles.rateBadgeRow}>
                  <View style={styles.rateBadge}>
                    <Ionicons name="sparkles" size={13} color="#F59E0B" />
                    <Text style={styles.rateBadgeText}>YOUR FEEDBACK MATTERS</Text>
                  </View>
                </View>

                <Text style={styles.rateCardTitle}>How Did Your Fit Feel?</Text>
                <Text style={styles.rateCardSubtitle}>
                  Rate your delivery speed, rider, and trial experience in seconds.
                </Text>

                {/* Interactive 5-Star Rating Bar */}
                <View style={styles.rateStarsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedStarRating(star);
                        router.push({
                          pathname: '/rate-order',
                          params: { orderId: order?._id, initialRating: star.toString() }
                        } as any);
                      }}
                      style={styles.starTouchable}
                    >
                      <Ionicons
                        name={selectedStarRating >= star ? 'star' : 'star-outline'}
                        size={36}
                        color={selectedStarRating >= star ? '#FBBF24' : 'rgba(251,191,36,0.3)'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.rateTapHint}>Tap a star to rate directly</Text>

                {/* Quick Feedback Feature Tags */}
                <View style={styles.ratePillsRow}>
                  <TouchableOpacity
                    style={styles.rateQuickChip}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: '/rate-order', params: { orderId: order?._id, initialRating: '5' } } as any);
                    }}
                  >
                    <Ionicons name="flash" size={12} color="#FBBF24" />
                    <Text style={styles.rateQuickChipText}>15-Min Delivery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rateQuickChip}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: '/rate-order', params: { orderId: order?._id, initialRating: '5' } } as any);
                    }}
                  >
                    <Ionicons name="shirt" size={12} color="#FBBF24" />
                    <Text style={styles.rateQuickChipText}>Fit & Quality</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rateQuickChip}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: '/rate-order', params: { orderId: order?._id, initialRating: '5' } } as any);
                    }}
                  >
                    <Ionicons name="bicycle" size={12} color="#FBBF24" />
                    <Text style={styles.rateQuickChipText}>Rider Service</Text>
                  </TouchableOpacity>
                </View>

                {/* Luxury CTA Button */}
                <TouchableOpacity
                  style={styles.rateCtaBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: '/rate-order',
                      params: { orderId: order?._id, initialRating: (selectedStarRating || 5).toString() }
                    } as any);
                  }}
                  activeOpacity={0.88}
                >
                  <View style={styles.rateCtaIconWrap}>
                    <Ionicons name="star" size={16} color="#0F172A" />
                  </View>
                  <Text style={styles.rateCtaBtnText}>Rate Your Experience</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0F172A" />
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              /* If already rated: Elegant Verified Rating Showcase */
              <View style={styles.reviewedCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.verifiedCheckBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    </View>
                    <View>
                      <Text style={styles.reviewedTitle}>Thank You for Your Review!</Text>
                      <Text style={styles.reviewedSub}>Your feedback helps improve FlashFits</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/rate-order', params: { orderId: order?._id } } as any)}
                    style={styles.updateRatingBtn}
                  >
                    <Text style={styles.updateRatingText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {reviews.map((rev, idx) => (
                  <View key={idx} style={styles.reviewItemCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.reviewTargetType}>{rev.targetType}</Text>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= rev.rating ? "star" : "star-outline"}
                            size={14}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                    </View>
                    {rev.title ? <Text style={styles.reviewItemTitle}>{rev.title}</Text> : null}
                    {rev.comment ? <Text style={styles.reviewItemComment}>{rev.comment}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {/* 4. Items Showcase */}
            <View style={styles.premiumSectionCard}>
              <View style={styles.cardHeaderWithCount}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="bag-handle-outline" size={18} color="#0F172A" />
                  <Text style={styles.premiumCardTitle}>Items Breakdown</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {items.map((item) => {
                  const kept = isItemKept(item);
                  return (
                    <View key={item._id} style={styles.itemLuxuryRow}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.itemLuxuryImage} />
                      ) : (
                        <View style={[styles.itemLuxuryImage, styles.placeholderImage]}>
                          <Ionicons name="shirt-outline" size={20} color="#94A3B8" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginHorizontal: 12 }}>
                        <Text style={styles.itemLuxuryName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemLuxuryMeta}>
                          Size: {item.size} • Qty: {item.quantity || 1}
                        </Text>
                        {item.returnReason ? (
                          <Text style={styles.itemLuxuryReason} numberOfLines={1}>
                            Feedback: {item.returnReason}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[styles.itemLuxuryPrice, !kept && styles.itemPriceStrike]}>
                          ₹{item.price * (item.quantity || 1)}
                        </Text>
                        <View style={[styles.luxuryStatusPill, kept ? styles.keptPill : styles.returnedPill]}>
                          <Ionicons
                            name={kept ? 'checkmark' : 'arrow-undo'}
                            size={11}
                            color={kept ? '#15803D' : '#64748B'}
                          />
                          <Text style={[styles.luxuryStatusText, kept ? styles.keptText : styles.returnedText]}>
                            {kept ? 'KEPT' : 'RETURNED'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 5. Luxury Receipt Card */}
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="receipt-outline" size={18} color="#0F172A" />
                  <Text style={styles.receiptTitle}>Payment Summary</Text>
                </View>
                <View style={[
                  styles.paymentMethodPill,
                  isCodPayment ? styles.codPill : styles.onlinePill
                ]}>
                  <Ionicons
                    name={isCodPayment ? 'cash-outline' : 'card-outline'}
                    size={12}
                    color={isCodPayment ? '#16A34A' : '#2563EB'}
                  />
                  <Text style={[
                    styles.paymentMethodPillText,
                    { color: isCodPayment ? '#16A34A' : '#2563EB' }
                  ]}>
                    {totalPaid === 0 ? '₹0 DUE' : isCodPayment ? 'PAID TO RIDER' : 'PAID ONLINE'}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptDividerSolid} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Items Total ({keptItems.length} kept)</Text>
                <Text style={styles.receiptValue}>₹{order?.finalBilling?.baseAmount ?? keptSubtotal}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Delivery Fee</Text>
                <Text style={[styles.receiptValue, (order?.finalBilling?.deliveryCharge === 0 || isFreeDelivery) && { color: '#16A34A', fontWeight: '800' }]}>
                  {(order?.finalBilling?.deliveryCharge === 0 || isFreeDelivery) ? 'FREE' : `₹${originalDeliveryCharge || order?.deliveryCharge || 0}`}
                </Text>
              </View>

              {returnedItems.length > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Return Fee ({returnedItems.length} items)</Text>
                  <Text style={[styles.receiptValue, (order?.finalBilling?.returnCharge === 0 || isFreeReturn) && { color: '#16A34A', fontWeight: '800' }]}>
                    {(order?.finalBilling?.returnCharge === 0 || isFreeReturn) ? 'FREE' : `₹${order?.finalBilling?.returnCharge ?? order?.returnCharge ?? 0}`}
                  </Text>
                </View>
              )}

              {!isFreeWaiting && (order?.finalBilling?.overtimePenalty || order?.overtimePenalty || 0) > 0 ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Rider Waiting Charge</Text>
                  <Text style={styles.receiptValue}>
                    ₹{order?.finalBilling?.overtimePenalty || order?.overtimePenalty}
                  </Text>
                </View>
              ) : (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Rider Waiting Charge</Text>
                  <Text style={[styles.receiptValue, { color: '#16A34A', fontWeight: '800' }]}>FREE</Text>
                </View>
              )}

              {(order?.finalBilling?.deliveryTip || order?.deliveryTip || 0) > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Delivery Tip</Text>
                  <Text style={styles.receiptValue}>₹{order?.finalBilling?.deliveryTip || order?.deliveryTip}</Text>
                </View>
              )}

              {(order?.finalBilling?.discount || 0) > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: '#16A34A', fontWeight: '700' }]}>Discounts & Offers</Text>
                  <Text style={[styles.receiptValue, { color: '#16A34A', fontWeight: '800' }]}>
                    - ₹{order?.finalBilling?.discount}
                  </Text>
                </View>
              )}

              <View style={styles.receiptDividerSolid} />

              <View style={styles.receiptTotalRow}>
                <View>
                  <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                  <Text style={styles.receiptTotalHint}>
                    {isCodPayment ? 'Collected by delivery partner' : 'Verified via Razorpay'}
                  </Text>
                </View>
                <Text style={[styles.receiptTotalValue, { color: theme.primary }]}>
                  ₹{totalPaid}
                </Text>
              </View>
            </View>

            {/* 6. Delivery Partner Appreciation Card */}
            {rider && (
              <View style={styles.riderThankCard}>
                <View style={[styles.riderThankAvatar, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name="bicycle" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riderThankName}>{rider.name}</Text>
                  <Text style={styles.riderThankSub}>FlashFits Delivery Partner</Text>
                </View>
                <TouchableOpacity
                  style={styles.riderRateChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/rate-order', params: { orderId: order?._id, initialRating: '5' } } as any);
                  }}
                >
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.riderRateChipText}>Rate Rider</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 7. Post-Purchase Actions */}
            <View style={styles.completedActions}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.replace('/(app)/(tabs)' as any)}
                activeOpacity={0.88}
              >
                <Ionicons name="bag-handle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Continue Shopping</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => router.replace('/orders' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="list" size={18} color="#0F172A" />
                <Text style={styles.secondaryActionText}>View All Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.helpLinkBtn}
                onPress={handleHelp}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={16} color="#64748B" />
                <Text style={styles.helpLinkText}>Need help with this order? Contact Support</Text>
              </TouchableOpacity>
            </View>
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

      <CouponOffersModal
        visible={offersModalVisible}
        onClose={() => setOffersModalVisible(false)}
        offers={combinedOffersForModal}
        appliedOffers={appliedOffersList}
        appliedCouponCode={appliedCoupon?.code || null}
        onApplyCoupon={handleApplyCouponCode}
        onApplyOffer={handleApplyOffer}
        onRemoveCoupon={handleRemoveCoupon}
        themeColor={theme.primary}
        orderType="try_and_buy"
        cartTotal={keptSubtotal}
      />

      {/* ─── Final Selection Confirmation Modal ─── */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (!confirmingSelection) setShowConfirmModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {
            if (!confirmingSelection) setShowConfirmModal(false);
          }}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.confirmSheetContainer}>
            <View style={styles.confirmDragHandle} />

            {/* Modal Header */}
            <View style={styles.confirmModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmModalTitle}>Confirm Your Selection</Text>
                <Text style={styles.confirmModalSubtitle}>
                  Review the dresses you want to keep and return
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!confirmingSelection) setShowConfirmModal(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.confirmCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable list of items */}
            <ScrollView
              style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Keeping Section */}
              <View style={styles.confirmSection}>
                <View style={styles.confirmSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text style={[styles.confirmSectionTitle, { color: '#16A34A' }]}>
                      Keeping ({keptItems.length})
                    </Text>
                  </View>
                  {keptItems.length > 0 && (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#16A34A' }}>
                      ₹{keptSubtotal}
                    </Text>
                  )}
                </View>

                {keptItems.length === 0 ? (
                  <Text style={styles.confirmEmptyText}>No dresses being kept</Text>
                ) : (
                  keptItems.map(item => (
                    <View key={item._id} style={styles.confirmItemRow}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.confirmItemImage} />
                      ) : (
                        <View style={[styles.confirmItemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="shirt-outline" size={18} color="#94A3B8" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.confirmItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.confirmItemMeta}>
                          Size: {item.size} • Qty: {item.quantity || 1}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={styles.confirmItemPrice}>₹{item.price * (item.quantity || 1)}</Text>
                        <View style={[styles.confirmBadge, { backgroundColor: '#DCFCE7' }]}>
                          <Text style={[styles.confirmBadgeText, { color: '#16A34A' }]}>KEEP</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Returning Section */}
              <View style={[styles.confirmSection, { marginTop: 12 }]}>
                <View style={styles.confirmSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="arrow-undo-circle" size={18} color="#EF4444" />
                    <Text style={[styles.confirmSectionTitle, { color: '#EF4444' }]}>
                      Returning ({returnedItems.length})
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                    Handover to partner
                  </Text>
                </View>

                {returnedItems.length === 0 ? (
                  <Text style={styles.confirmEmptyText}>No dresses being returned</Text>
                ) : (
                  returnedItems.map(item => (
                    <View key={item._id} style={styles.confirmItemRow}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.confirmItemImage} />
                      ) : (
                        <View style={[styles.confirmItemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="shirt-outline" size={18} color="#94A3B8" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.confirmItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.confirmItemMeta}>
                          Size: {item.size} • Qty: {item.quantity || 1}
                        </Text>
                        {item.returnReason ? (
                          <Text style={styles.confirmItemReason} numberOfLines={1}>
                            Feedback: {item.returnReason}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={[styles.confirmItemPrice, { color: '#94A3B8', textDecorationLine: 'line-through' }]}>
                          ₹{item.price * (item.quantity || 1)}
                        </Text>
                        <View style={[styles.confirmBadge, { backgroundColor: '#FEF2F2' }]}>
                          <Text style={[styles.confirmBadgeText, { color: '#EF4444' }]}>RETURN</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Estimated Bill inside Confirmation Modal */}
              <EstimatedBillSection
                summary={billingSummary}
                isFreeDelivery={isFreeDelivery}
                isFreeReturn={isFreeReturn}
                originalDeliveryCharge={originalDeliveryCharge}
                effectiveDeliveryCharge={effectiveDeliveryCharge}
                overtimeFee={estimatedOvertimePenalty}
                discountAmount={discountToApply}
                themeColor={theme.primary}
                title="Estimated Bill"
                showNotice={false}
              />

              {/* Warning Notice Banner */}
              <View style={styles.confirmWarningBox}>
                <Ionicons name="alert-circle" size={22} color="#D97706" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmWarningTitle}>Selection cannot be changed</Text>
                  <Text style={styles.confirmWarningDesc}>
                    Once confirmed, you cannot change this selection. Your delivery partner will collect any returned items, and you will proceed to payment.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmBackBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={confirmingSelection}
              >
                <Text style={styles.confirmBackText}>Review Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmProceedBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmSelectionOnly}
                disabled={confirmingSelection}
              >
                {confirmingSelection ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={styles.confirmProceedText}>Confirm & Proceed</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  // ─── Revamped Luxury Completed Screen Styles ───
  completedContainer: {
    width: '100%',
    marginBottom: 24,
  },
  premiumHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  heroHaloOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroHaloInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  heroOrderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  statsStripRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  statBoxLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBoxValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
  },
  statBoxSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Showstopper Rate Experience Card
  rateExperienceCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  rateBadgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  rateCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  rateCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 16,
  },
  rateStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  starTouchable: {
    padding: 4,
  },
  rateTapHint: {
    fontSize: 11,
    color: 'rgba(251, 191, 36, 0.8)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 14,
  },
  ratePillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 16,
  },
  rateQuickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  rateQuickChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  rateCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  rateCtaIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateCtaBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },

  // Reviewed Showcase Card
  reviewedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  verifiedCheckBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewedSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  updateRatingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  updateRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reviewItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewTargetType: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  reviewItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  reviewItemComment: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },

  // Luxury Items Showcase
  premiumSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  premiumCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  itemLuxuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemLuxuryImage: {
    width: 52,
    height: 64,
    borderRadius: 10,
  },
  placeholderImage: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLuxuryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemLuxuryMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemLuxuryReason: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemLuxuryPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemPriceStrike: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  luxuryStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keptPill: {
    backgroundColor: '#DCFCE7',
  },
  returnedPill: {
    backgroundColor: '#F1F5F9',
  },
  luxuryStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  keptText: {
    color: '#15803D',
  },
  returnedText: {
    color: '#64748B',
  },

  // Receipt Card
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentMethodPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codPill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  onlinePill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  receiptDividerSolid: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptTotalHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  receiptTotalValue: {
    fontSize: 22,
    fontWeight: '900',
  },

  // Rider Card
  riderThankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  riderThankAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderThankName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  riderThankSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  riderRateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  riderRateChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },

  // Post-Purchase Actions
  completedActions: {
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  helpLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  helpLinkText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

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

  // Confirmation Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  confirmDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  confirmModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  confirmCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  confirmSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  confirmSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 6,
    textAlign: 'center',
  },
  confirmItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  confirmItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  confirmItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  confirmItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  confirmItemReason: {
    fontSize: 10,
    color: '#EF4444',
    fontStyle: 'italic',
    marginTop: 1,
  },
  confirmItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confirmBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  confirmWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  confirmWarningDesc: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 16,
  },
  confirmFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 8,
  },
  confirmBackBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmProceedBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmProceedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Estimated Bill Section Styles
  estimateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    overflow: 'hidden',
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    width: '100%',
  },
  estimateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  estimateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  estimateBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: 'center',
  },
  estimateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  estimateLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  estimateSubLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  estimateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  estimateStrikethrough: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  estimateDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  estimateTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginBottom: 4,
  },
  estimateTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  estimateTotalHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  estimateTotalValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  estimateNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  estimateNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#1D4ED8',
    lineHeight: 16,
    fontWeight: '600',
  },

  // Payment Option Selector (When no items are kept)
  paymentOptionContainer: {
    marginTop: 16,
    marginBottom: 6,
  },
  paymentOptionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  paymentOptionSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  paymentOptionCardsWrap: {
    gap: 8,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  paymentOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
