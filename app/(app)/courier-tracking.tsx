import { cancelCourierOrder, getCourierOrderById } from '@/api/orders';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert, useToast } from '@/context/AlertContext';

type OrderStep = { id: string; label: string; icon: string; completed: boolean };

type OrderData = {
  _id?: string;
  orderStatus?: string;
  items?: any[];
  totalAmount?: number;
  deliveryCharge?: number;
  totalPayable?: number;
  deliveryLocation?: any;
  merchantDetails?: { name?: string; phone?: string };
  trackingDetails?: {
    trackingId?: string;
    courierPartner?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  };
  createdAt?: string;
  [k: string]: any;
};

const statusToSteps = (status?: string): OrderStep[] => {
  const steps: OrderStep[] = [
    { id: 'placed', label: 'Placed', icon: 'receipt-outline', completed: false },
    { id: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline', completed: false },
    { id: 'packed', label: 'Packed', icon: 'cube-outline', completed: false },
    { id: 'shipped', label: 'Shipped', icon: 'airplane-outline', completed: false },
    { id: 'delivered', label: 'Delivered', icon: 'home-outline', completed: false },
  ];

  const statusOrder = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
  const idx = statusOrder.indexOf(status?.toLowerCase() || '');

  for (let i = 0; i <= idx; i++) {
    if (i < steps.length) steps[i].completed = true;
  }

  return steps;
};

export default function CourierTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const showAlert = useAlert();
  const showToast = useToast();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [steps, setSteps] = useState<OrderStep[]>(statusToSteps());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await getCourierOrderById(orderId);
      const data = res?.order || res;
      if (!data) return;
      setOrder(data);
      setSteps(statusToSteps(data.orderStatus));
    } catch (err) {
      console.error('Failed to fetch courier order:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  };

  const handleCancel = () => {
    showAlert({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order?',
      type: 'warning',
      buttons: [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelCourierOrder(orderId!);
              showAlert({
                title: 'Order Cancelled',
                message: 'Your courier order has been cancelled.',
                type: 'success',
                buttons: [
                  { text: 'OK', onPress: () => router.replace('/orders' as any) },
                ]
              });
            } catch (err: any) {
              showToast({ message: err.response?.data?.message || 'Failed to cancel order.', type: 'error' });
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    });
  };

  const status = order?.orderStatus?.toLowerCase() || '';
  const canCancel = ['placed', 'confirmed'].includes(status);
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled';

  const getStatusColor = () => {
    if (isDelivered) return '#10B981';
    if (isCancelled) return '#EF4444';
    return theme.primary;
  };

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
        <Text style={styles.headerTitle}>Courier #{orderId?.slice(-5).toUpperCase()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() + '10' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
              {(order?.orderStatus || 'UNKNOWN').toUpperCase()}
            </Text>
            {order?.trackingDetails?.estimatedDelivery && !isDelivered && !isCancelled && (
              <Text style={styles.eta}>
                Est. delivery: {new Date(order.trackingDetails.estimatedDelivery).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                })}
              </Text>
            )}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '700' }}>COURIER</Text>
          </View>
        </View>

        {/* Progress Timeline */}
        {!isCancelled && (
          <View style={styles.timelineCard}>
            <Text style={styles.cardTitle}>Order Progress</Text>
            <View style={styles.timeline}>
              {steps.map((step, i) => (
                <View key={step.id} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineCircle,
                      step.completed
                        ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                        : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                    ]}>
                      {step.completed ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Ionicons name={step.icon as any} size={14} color="#94A3B8" />
                      )}
                    </View>
                    {i < steps.length - 1 && (
                      <View style={[
                        styles.timelineLine,
                        step.completed ? { backgroundColor: '#10B981' } : { backgroundColor: '#E2E8F0' },
                      ]} />
                    )}
                  </View>
                  <Text style={[
                    styles.timelineLabel,
                    step.completed ? { color: '#0F172A', fontWeight: '700' } : { color: '#94A3B8' },
                  ]}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cancelled State */}
        {isCancelled && (
          <View style={styles.cancelledCard}>
            <Ionicons name="close-circle" size={48} color="#EF4444" />
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSub}>This order has been cancelled. Refund will be processed within 3-5 business days.</Text>
          </View>
        )}

        {/* Tracking Details */}
        {order?.trackingDetails?.trackingId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tracking Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Courier Partner</Text>
              <Text style={styles.detailValue}>{order.trackingDetails.courierPartner || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tracking ID</Text>
              <Text style={[styles.detailValue, { color: theme.primary }]}>{order.trackingDetails.trackingId}</Text>
            </View>
            {order.trackingDetails.trackingUrl && (
              <TouchableOpacity
                style={[styles.trackBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
                onPress={() => Linking.openURL(order!.trackingDetails!.trackingUrl!)}
              >
                <Ionicons name="open-outline" size={16} color={theme.primary} />
                <Text style={[styles.trackBtnText, { color: theme.primary }]}>Track on Courier Site</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* No tracking yet */}
        {!order?.trackingDetails?.trackingId && !isDelivered && !isCancelled && (
          <View style={styles.awaitingCard}>
            <Ionicons name="hourglass-outline" size={24} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.awaitingTitle}>Awaiting Shipment</Text>
              <Text style={styles.awaitingText}>Tracking details will appear once the order is shipped</Text>
            </View>
          </View>
        )}

        {/* Delivered State */}
        {isDelivered && (
          <View style={styles.deliveredCard}>
            <View style={styles.deliveredIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            </View>
            <Text style={styles.deliveredTitle}>Order Delivered!</Text>
            <Text style={styles.deliveredSub}>Your order has been delivered successfully</Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({order?.items?.length || 0})</Text>
          {order?.items?.map((item, idx) => (
            <View key={item._id || idx} style={styles.itemRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="shirt-outline" size={18} color="#CBD5E1" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemMeta}>Size: {item.size} • Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Order Info */}
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
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Billing */}
        <View style={[styles.card, { backgroundColor: '#0F172A', borderColor: '#1E293B' }]}>
          <Text style={[styles.cardTitle, { color: '#fff' }]}>Payment Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabelDark}>Items Total</Text>
            <Text style={styles.billValueDark}>₹{order?.totalAmount || 0}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabelDark}>Delivery Charge</Text>
            <Text style={styles.billValueDark}>₹{order?.deliveryCharge || 40}</Text>
          </View>
          {order?.gst > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabelDark}>GST</Text>
              <Text style={styles.billValueDark}>₹{order?.gst}</Text>
            </View>
          )}
          <View style={[styles.billDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          <View style={styles.billRow}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Total Paid</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981' }}>
              ₹{order?.totalPayable || ((order?.totalAmount || 0) + (order?.deliveryCharge || 40))}
            </Text>
          </View>
        </View>

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Continue Shopping */}
        {isDelivered && (
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.replace('/(app)/(tabs)/explore' as any)}
          >
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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

  // Status Banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 16, gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '800' },
  eta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  // Timeline
  timelineCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  timeline: { marginTop: 12 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 14, width: 28 },
  timelineCircle: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  timelineLine: { width: 2, height: 24, marginVertical: 2 },
  timelineLabel: { fontSize: 14, fontWeight: '500', paddingTop: 4, paddingBottom: 20 },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },

  // Items
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  itemImage: { width: 48, height: 60, borderRadius: 10 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  itemMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 },

  // Details
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  detailLabel: { fontSize: 13, color: '#64748B' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#0F172A', maxWidth: '60%', textAlign: 'right' },

  // Billing
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabelDark: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  billValueDark: { fontSize: 14, fontWeight: '600', color: '#fff' },
  billDivider: { height: 1, marginVertical: 10 },

  // Track Button
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, marginTop: 12, borderWidth: 1,
  },
  trackBtnText: { fontSize: 14, fontWeight: '700' },

  // Awaiting
  awaitingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 16,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FEF3C7',
  },
  awaitingTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  awaitingText: { fontSize: 12, color: '#92400E', marginTop: 2 },

  // Delivered
  deliveredCard: {
    backgroundColor: '#F0FDF4', borderRadius: 20, padding: 24, marginBottom: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7',
  },
  deliveredIcon: { marginBottom: 12 },
  deliveredTitle: { fontSize: 22, fontWeight: '800', color: '#166534', marginBottom: 4 },
  deliveredSub: { fontSize: 14, color: '#15803D' },

  // Cancelled
  cancelledCard: {
    backgroundColor: '#FEF2F2', borderRadius: 20, padding: 24, marginBottom: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2',
  },
  cancelledTitle: { fontSize: 20, fontWeight: '800', color: '#991B1B', marginTop: 8, marginBottom: 4 },
  cancelledSub: { fontSize: 13, color: '#B91C1C', textAlign: 'center', lineHeight: 18 },

  // Cancel
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2', marginBottom: 16,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  // Continue
  continueBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16,
  },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
