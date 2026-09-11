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
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  tryStatus?: 'pending' | 'keep' | 'returned' | 'accepted';
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
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<'online' | 'cod'>('cod');
  const [offersModalVisible, setOffersModalVisible] = useState(false);
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

      // Handle completed try phase -> redirect to return page only if paid and has returns
      if (data.orderStatus === 'selection_made' && data.paymentStatus === 'paid') {
        const hasReturns = data.items?.some((i: any) => i.tryStatus === 'returned');
        if (hasReturns) {
          router.replace({
            pathname: '/return-items' as any,
            params: {
              orderId: data._id || cleanOrderId,
              otp: data.otp || '',
              items: JSON.stringify(data.items),
              orderData: JSON.stringify(data),
            },
          });
          return data.orderStatus;
        }
      }

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
        setItems(data.items.map(i => ({ ...i, tryStatus: i.tryStatus || 'pending', returnReason: i.returnReason || null })));
        const alreadySubmitted = data.orderStatus === 'selection_made' || data.items.some((i: any) => i.tryStatus === 'accepted' || i.tryStatus === 'returned');
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

        // Handle completed try phase -> redirect if returns exist and paid
        if (update.orderStatus === 'selection_made' && update.paymentStatus === 'paid') {
          const hasReturns = (update.items || items)?.some((i: any) => i.tryStatus === 'returned');
          if (hasReturns) {
            router.replace({
              pathname: '/return-items' as any,
              params: {
                orderId: cleanOrderId,
                otp: update.otp || otp,
                items: JSON.stringify(update.items || items),
                orderData: JSON.stringify(order),
              },
            });
            return;
          }
        }

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
          setItems(update.items.map((i: any) => ({ ...i, tryStatus: i.tryStatus || 'pending', returnReason: i.returnReason || null })));
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
              message: `OTP verified! Delivery partner is capturing verification photo.${data.overtimePenalty > 0 ? `\nOvertime fee: ₹${data.overtimePenalty}` : ''}`,
              type: 'info',
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
                message: `Payment of ₹${data.amountCollected} has been confirmed by your delivery partner.\nPlease hand over the return items.`,
                type: 'success',
                buttons: [{
                  text: 'Handover Returns',
                  onPress: () => {
                    router.replace({
                      pathname: '/return-items' as any,
                      params: {
                        orderId: cleanOrderId,
                        otp: '',
                        items: JSON.stringify(items.filter(i => i.tryStatus === 'returned')),
                        orderData: JSON.stringify(order),
                      },
                    });
                  }
                }]
              });
            } else {
              showAlert({
                title: '✅ Order Complete!',
                message: `Payment of ₹${data.amountCollected} has been confirmed by your delivery partner.\nThank you for shopping with FlashFits!`,
                type: 'success',
                buttons: [{ text: 'View Orders', onPress: () => router.replace('/orders' as any) }]
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

  // ── Calculate discount on kept items ──
  const appliedOffersList = order?.appliedOffers || [];
  const keptItems = items.filter(i => i.tryStatus === 'keep');
  const keptSubtotal = keptItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  let discountToApply = 0;
  if (appliedOffersList.length > 0 && keptSubtotal > 0) {
    for (const appliedOffer of appliedOffersList) {
      const minSpend = (appliedOffer as any).conditions?.minCartValue || (appliedOffer as any).conditions?.minOrderValue || 0;
      if (minSpend > 0 && keptSubtotal < minSpend) {
        continue;
      }
      if (appliedOffer.discountType === 'percentage' && appliedOffer.discountValue) {
        let d = (keptSubtotal * appliedOffer.discountValue) / 100;
        if ((appliedOffer as any).maxDiscount) d = Math.min(d, (appliedOffer as any).maxDiscount);
        discountToApply += d;
      } else if (appliedOffer.discountType === 'flat' && appliedOffer.discountValue) {
        discountToApply += Math.min(appliedOffer.discountValue, keptSubtotal);
      } else if (appliedOffer.discountApplied) {
        discountToApply += appliedOffer.discountApplied;
      }
    }
    discountToApply = Math.round(discountToApply);
  }

  // ── Update billing whenever items change ──
  useEffect(() => {
    if (items.length > 0) {
      const summary = calculateFinalBilling({
        orderItems: [...items],
        deliveryCharge: order?.originalDeliveryCharge ?? order?.deliveryCharge ?? 0,
        returnCharge: order?.originalReturnCharge ?? order?.returnCharge ?? 0,
        deliveryTip: order?.finalBilling?.deliveryTip ?? order?.deliveryTip ?? 0,
        discountToApply,
        overtimePenalty: order?.finalBilling?.overtimePenalty ?? order?.overtimePenalty ?? 0,
      });
      setBillingSummary(summary);
    }
  }, [items, order?.originalDeliveryCharge, order?.deliveryCharge, order?.originalReturnCharge, order?.returnCharge, order?.finalBilling?.deliveryTip, order?.deliveryTip, order?.finalBilling?.overtimePenalty, order?.overtimePenalty, discountToApply]);

  useEffect(() => {
    if (order?.paymentMethod === 'cod') {
      if (billingSummary.totalPayable > 1000) {
        setFinalPaymentMethod('online');
      } else {
        setFinalPaymentMethod('cod');
      }
    }
  }, [billingSummary.totalPayable, order?.paymentMethod]);

  // ── Item keep/return ──
  const handleItemUpdate = (index: number, tryStatus: 'keep' | 'returned', reason: string | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], tryStatus, returnReason: reason };
    setItems(updated);
  };

  const allSelected = items.length > 0 && items.every(i => i.tryStatus === 'keep' || i.tryStatus === 'returned');
  const hasReturns = items.some(i => i.tryStatus === 'returned');
  const isAllReturned = items.every(i => i.tryStatus === 'returned');

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
          tryStatus: i.tryStatus,
          returnReason: i.returnReason || null,
        })),
      };

      await confirmClothSelection(payload);
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
        finalPaymentMethod: order?.paymentMethod === 'cod' ? finalPaymentMethod : 'online',
      };

      // If customer chose COD and prefers COD payment for kept items, bypass Razorpay final payment
      if (order?.paymentMethod === 'cod' && finalPaymentMethod === 'cod' && !isAllReturned) {
        const verifyResult = await confirmCodSelection({
          orderId: orderId!,
          items: items.map(i => ({
            itemId: i._id,
            tryStatus: i.tryStatus,
            returnReason: i.returnReason || null,
          })),
          finalPaymentMethod: 'cod'
        });

        if (verifyResult.success) {
          if (hasReturns) {
            router.replace({
              pathname: '/return-items' as any,
              params: {
                orderId: orderId!,
                otp,
                items: JSON.stringify(items.filter(i => i.tryStatus === 'returned')),
                orderData: JSON.stringify(order),
              },
            });
          } else {
            showAlert({
              title: '✅ Selection Confirmed!',
              message: `Your selections have been recorded.\nPlease hand over ₹${billingSummary.totalPayable} cash to the delivery rider.`,
              type: 'success',
              buttons: [{ text: 'View Orders', onPress: () => router.replace('/orders' as any) }]
            });
          }
        }
        setSubmitting(false);
        return;
      }

      // initiate final payment order (this creates Razorpay order on backend)
      const res = await finalpaymentInitiate(payload);

      if (!res) {
        setSubmitting(false);
        return;
      }

      if (isAllReturned) {
        // All items returned
        if (res.isDeliveryFree) {
          showAlert({
            title: '🎁 Free Delivery Applied!',
            message: 'All items returned. Delivery is free because of your applied offer. Please hand over the package to the delivery partner.',
            type: 'success',
            buttons: [{
              text: 'OK',
              onPress: () => {
                router.replace({
                  pathname: '/return-items' as any,
                  params: {
                    orderId: orderId!,
                    otp,
                    items: JSON.stringify(items),
                    orderData: JSON.stringify(res.order || order),
                  },
                });
              }
            }]
          });
          return;
        } else if (res.requiresDeliveryFee && res.deliveryFeeAmount > 0) {
          showAlert({
            title: 'Delivery Fee Due',
            message: `All items returned. A delivery fee of ₹${res.deliveryFeeAmount} is payable directly to your delivery partner.`,
            type: 'info',
            buttons: [{
              text: 'Pay Directly to Rider',
              onPress: () => {
                router.replace({
                  pathname: '/return-items' as any,
                  params: {
                    orderId: orderId!,
                    otp: res?.order?.otp || res?.otp || otp,
                    items: JSON.stringify(items),
                    orderData: JSON.stringify(res?.order || order),
                  },
                });
              }
            }]
          });
          return;
        }

        // Default all-returned redirect
        router.replace({
          pathname: '/return-items' as any,
          params: {
            orderId: orderId!,
            otp: res?.order?.otp || res?.otp || otp,
            items: JSON.stringify(items),
            orderData: JSON.stringify(res?.order || order),
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
  const isRiderVerified = Boolean(order?.trialPhaseEnd && (order?.photoVerified || (order as any)?.isPhotoVerified));
  const hasSubmittedSelection = isSelectionSubmitted || order?.orderStatus === 'selection_made' || isRiderVerified;
  // Show the live map only after the rider has picked up the items from the merchant
  const isItemPickedUp =
    status === 'in_transit' ||
    ['picked_up', 'en_route_delivery', 'at_delivery'].includes(order?.deliveryRiderStatus) ||
    order?.customerDeliveryStatus === 'on_the_way';

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
        {/* ─── Status Banner ─── */}
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
            {isCompleted && (
              <Text style={[styles.statusLabel, { color: '#10B981' }]}>ORDER COMPLETED ✅</Text>
            )}
          </View>
          <View style={[styles.tbBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={{ color: '#166534', fontSize: 10, fontWeight: '700' }}>TRY & BUY</Text>
          </View>
        </View>

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

                {/* Trial Completion OTP Banner */}
                {otp && (
                  <View style={styles.otpCard}>
                    <Ionicons name="key-outline" size={18} color="#1A73E8" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.otpText}>
                        Trial Completion OTP: <Text style={{ fontWeight: '900', letterSpacing: 2 }}>{otp}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        Share this OTP with your delivery partner once you finalize what to keep or return.
                      </Text>
                    </View>
                  </View>
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

                  {/* Confirm Selection Button (DOES NOT CHARGE - saves selection and unlocks rider verification) */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: allSelected ? theme.primary : '#CBD5E1', marginTop: 12 },
                    ]}
                    onPress={handleConfirmSelectionOnly}
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
                  {!order?.trialPhaseEnd && (
                    <TouchableOpacity
                      onPress={() => setIsSelectionSubmitted(false)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 8 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>Edit Selection</Text>
                    </TouchableOpacity>
                  )}
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
                    {order?.photoVerified ? (
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    ) : (
                      <ActivityIndicator size="small" color="#6366F1" />
                    )}
                    <Text style={{ fontSize: 13, fontWeight: '600', color: order?.photoVerified ? '#16A34A' : '#4F46E5' }}>
                      {order?.photoVerified ? "3. Verification Photo Recorded" : "3. Awaiting Verification Photo..."}
                    </Text>
                  </View>
                </View>

                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="information-circle" size={18} color="#2563EB" />
                  <Text style={{ flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 16 }}>
                    Your bill summary and final payment screen will unlock as soon as your delivery partner finishes OTP and photo verification.
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
                  </View>
                </View>

                {/* Items Summary */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
                    Items Breakdown ({items.filter(i => i.tryStatus === 'keep' || i.tryStatus === 'accepted').length} kept, {items.filter(i => i.tryStatus === 'returned').length} returned)
                  </Text>
                  {items.map((item) => (
                    <View key={item._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Size: {item.size} • Status: <Text style={{ fontWeight: '700', color: item.tryStatus === 'keep' || item.tryStatus === 'accepted' ? '#16A34A' : '#EF4444' }}>{(item.tryStatus === 'keep' || item.tryStatus === 'accepted') ? 'KEPT' : 'RETURNED'}</Text></Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                        {(item.tryStatus === 'keep' || item.tryStatus === 'accepted') ? `₹${item.price * (item.quantity || 1)}` : '₹0'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Coupons & Offers Section (Post-Try Phase) */}
                {appliedOffersList.length > 0 && (
                  <View style={[styles.billingCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="tag-check" size={18} color="#16A34A" />
                        <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#166534' }}>
                          Applied Offers & Coupons
                        </Text>
                      </View>
                      {discountToApply > 0 && (
                        <View style={{ backgroundColor: '#16A34A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontFamily: Typography.fontFamily.bold, color: '#FFFFFF' }}>
                            Saved ₹{discountToApply}
                          </Text>
                        </View>
                      )}
                    </View>

                    {appliedOffersList.map((appliedItem: any, idx: number) => {
                      const isCoupon = !!(appliedItem.couponCode || appliedItem.requiresCoupon);
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
                            marginBottom: 6,
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
                                  backgroundColor: isCoupon ? '#EDE9FE' : '#FEF3C7',
                                  borderWidth: 1,
                                  borderColor: isCoupon ? '#DDD6FE' : '#FDE68A',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontFamily: Typography.fontFamily.bold,
                                    color: isCoupon ? '#6D28D9' : '#B45309',
                                  }}
                                >
                                  {isCoupon ? '🎟️ COUPON' : '🏷️ STORE OFFER (Auto-applied)'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#0F172A' }}>
                                {appliedItem.couponCode || appliedItem.title}
                              </Text>
                            </View>
                            {!thresholdMet && (
                              <Text style={{ fontSize: 10, fontFamily: Typography.fontFamily.medium, color: '#B45309' }}>
                                ⚠️ Requires kept items worth at least ₹{minSpend}
                              </Text>
                            )}
                          </View>

                          {thresholdMet && discountToApply > 0 && (
                            <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#16A34A' }}>
                              - ₹{discountToApply}
                            </Text>
                          )}
                        </View>
                      );
                    })}

                    <TouchableOpacity
                      onPress={() => setOffersModalVisible(true)}
                      style={{ alignItems: 'center', marginTop: 4, paddingTop: 4 }}
                    >
                      <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: theme.primary }}>
                        View full coupon & offer details ›
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Detailed Billing Summary */}
                <View style={styles.billingCard}>
                  <Text style={styles.billingTitle}>Billing Summary</Text>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>
                      Items Kept ({billingSummary.itemsAccepted})
                    </Text>
                    <Text style={styles.billValue}>₹{billingSummary.baseAmount}</Text>
                  </View>

                  {billingSummary.discountApplied > 0 && (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, { color: '#10B981', fontFamily: Typography.fontFamily.bold }]}>
                        Coupon & Offers Discount
                      </Text>
                      <Text style={[styles.billValue, { color: '#10B981', fontFamily: Typography.fontFamily.bold }]}>
                        - ₹{billingSummary.discountApplied}
                      </Text>
                    </View>
                  )}

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

                  {/* WAITING CHARGE / OVERTIME PENALTY */}
                  {(order?.finalBilling?.overtimePenalty || order?.overtimePenalty || billingSummary.overtimePenalty) > 0 ? (
                    <View style={[styles.billRow, { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: '#FECACA' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="time" size={16} color="#EF4444" />
                        <Text style={[styles.billLabel, { color: '#DC2626', fontWeight: '700' }]}>
                          Overtime Waiting Fee ({order?.trialPhaseDuration ? `${order.trialPhaseDuration - 10}m overtime` : 'past 10 mins'})
                        </Text>
                      </View>
                      <Text style={[styles.billValue, { color: '#DC2626', fontWeight: '800' }]}>
                        + ₹{order?.finalBilling?.overtimePenalty || order?.overtimePenalty || billingSummary.overtimePenalty}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, { color: '#64748B' }]}>Waiting Fee</Text>
                      <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '600' }]}>₹0 (Free Trial)</Text>
                    </View>
                  )}

                  {billingSummary.itemsAccepted > 0 && (billingSummary.deliveryCharge ?? 0) > 0 && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Delivery Charge</Text>
                      <Text style={styles.billValue}>₹{billingSummary.deliveryCharge}</Text>
                    </View>
                  )}

                  {billingSummary.itemsAccepted > 0 && (billingSummary.deliveryTip ?? 0) > 0 && (
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

                {/* COD Options / Warnings */}
                {order?.paymentMethod === 'cod' && !isAllReturned && (
                  <View style={{ marginTop: 16, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
                      Final Payment Method
                    </Text>
                    
                    {billingSummary.totalPayable > 1000 ? (
                      <View style={{
                        flexDirection: 'row',
                        backgroundColor: '#FEF2F2',
                        borderColor: '#FCA5A5',
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: 'flex-start',
                        gap: 8,
                      }}>
                        <Ionicons name="warning-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
                        <Text style={{ flex: 1, fontSize: 12, color: '#991B1B', lineHeight: 16, fontWeight: '500' }}>
                          Liquid cash payment is not available for final purchases exceeding ₹1000. You are required to pay online to confirm selection.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                          style={[{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderWidth: 1.5,
                            borderColor: '#E2E8F0',
                            borderRadius: 12,
                            paddingVertical: 10,
                          }, finalPaymentMethod === 'cod' && { borderColor: theme.primary, backgroundColor: theme.primary + '08' }]}
                          onPress={() => setFinalPaymentMethod('cod')}
                        >
                          <Ionicons name="cash-outline" size={16} color={finalPaymentMethod === 'cod' ? theme.primary : '#64748B'} />
                          <Text style={[{ fontSize: 13, fontWeight: '600', color: '#64748B' }, finalPaymentMethod === 'cod' && { color: theme.primary, fontWeight: '700' }]}>
                            Cash to Rider
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderWidth: 1.5,
                            borderColor: '#E2E8F0',
                            borderRadius: 12,
                            paddingVertical: 10,
                          }, finalPaymentMethod === 'online' && { borderColor: theme.primary, backgroundColor: theme.primary + '08' }]}
                          onPress={() => setFinalPaymentMethod('online')}
                        >
                          <Ionicons name="card-outline" size={16} color={finalPaymentMethod === 'online' ? theme.primary : '#64748B'} />
                          <Text style={[{ fontSize: 13, fontWeight: '600', color: '#64748B' }, finalPaymentMethod === 'online' && { color: theme.primary, fontWeight: '700' }]}>
                            Pay Online
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Final Submit / Payment Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleSubmitSelection}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={isAllReturned ? 'cash' : finalPaymentMethod === 'cod' ? 'cash' : 'card'} size={20} color="#fff" />
                      <Text style={styles.submitText}>
                        {isAllReturned
                          ? `Pay ₹${billingSummary.totalPayable} Directly to Rider`
                          : finalPaymentMethod === 'cod'
                            ? `Confirm COD Payment (₹${billingSummary.totalPayable})`
                            : `Pay ₹${billingSummary.totalPayable} to FlashFits`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
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

            {/* Existing Ratings */}
            {reviews.length > 0 && (
              <View style={{ width: '100%', marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>Your Ratings</Text>
                {reviews.map((rev, idx) => (
                  <View key={idx} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', textTransform: 'capitalize' }}>
                        {rev.targetType}
                      </Text>
                      <View style={{ flexDirection: 'row' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons key={star} name={star <= rev.rating ? "star" : "star-outline"} size={14} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                    {rev.title && <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 6, color: '#334155' }}>{rev.title}</Text>}
                    {rev.comment && <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{rev.comment}</Text>}
                    {rev.images && rev.images.length > 0 && (
                      <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                        {rev.images.map((img: string, i: number) => (
                          <Image key={i} source={{ uri: img }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            {reviews.length === 0 && (
              <TouchableOpacity
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0F172A',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  marginTop: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
                onPress={() => router.push({ pathname: '/rate-order', params: { orderId: order?._id } } as any)}
              >
                <View style={{
                  backgroundColor: '#F59E0B',
                  padding: 6,
                  borderRadius: 10,
                  marginRight: 12,
                }}>
                  <Ionicons name="star" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
                    Rate Your Experience
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
                    Tell us how we did
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: theme.primary, marginTop: 12 }]}
              onPress={() => router.replace('/(app)/(tabs)' as any)}
            >
              <Text style={[styles.outlineText, { color: theme.primary }]}>Continue Shopping</Text>
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

      <CouponOffersModal
        visible={offersModalVisible}
        onClose={() => setOffersModalVisible(false)}
        offers={appliedOffersList.map((o: any) => ({
          _id: o._id || o.offerId || 'applied-offer',
          title: o.title || o.couponCode || 'Applied Discount',
          couponCode: o.couponCode,
          requiresCoupon: !!o.couponCode,
          discountAmount: o.discountApplied || discountToApply,
          discountType: o.discountType,
          discountValue: o.discountValue,
          conditions: o.conditions,
          description: o.description || (o.couponCode ? `Coupon code ${o.couponCode} applied` : `Special offer on your order`),
        }))}
        appliedOffers={appliedOffersList}
        appliedCouponCode={order?.couponCode || appliedOffersList.find((o: any) => o.couponCode)?.couponCode}
        onApplyCoupon={async () => {}}
        onApplyOffer={async () => {}}
        themeColor={theme.primary}
        orderType="try_and_buy"
        cartTotal={keptSubtotal}
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
