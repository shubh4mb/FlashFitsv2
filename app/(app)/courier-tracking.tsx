import { cancelCourierOrder, getCourierOrderById, requestCourierOrderReturn, getCourierOrderReturnCharge } from '@/api/orders';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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
  Modal,
  TextInput,
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

  // Return request states
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedReturnItems, setSelectedReturnItems] = useState<Record<string, { quantity: number; selected: boolean }>>({});
  const [faultType, setFaultType] = useState<'customer_choice' | 'merchant_fault'>('customer_choice');
  const [calculatedReturnCharge, setCalculatedReturnCharge] = useState<number | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [loadingReturnCharge, setLoadingReturnCharge] = useState(false);
  const [returnImages, setReturnImages] = useState<string[]>([]);

  const isWithinReturnWindow = () => {
    if (!order) return false;
    const deliveryDate = order.deliveredAt || order.updatedAt;
    if (!deliveryDate) return true; // fallback
    const diffTime = Math.abs(new Date().getTime() - new Date(deliveryDate).getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestImageLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - returnImages.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setReturnImages(prev => [...prev, ...newUris].slice(0, 5));
      }
    } catch (err) {
      console.error('Pick image error:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access camera is required.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        setReturnImages(prev => [...prev, newUri].slice(0, 5));
      }
    } catch (err) {
      console.error('Take photo error:', err);
    }
  };

  const handleRemoveImage = (index: number) => {
    setReturnImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenReturnModal = async () => {
    if (!order || !order.items) return;
    
    // Initialize selected items (default to unselected, qty 1)
    const initialSelection: Record<string, { quantity: number; selected: boolean }> = {};
    order.items.forEach((item) => {
      const key = `${item.productId}_${item.variantId}`;
      initialSelection[key] = { quantity: 1, selected: false };
    });
    setSelectedReturnItems(initialSelection);
    setReturnReason('');
    setFaultType('customer_choice');
    setReturnImages([]);
    setReturnModalVisible(true);

    // Fetch calculated return charge
    setLoadingReturnCharge(true);
    try {
      const res = await getCourierOrderReturnCharge(orderId!);
      if (res && res.success) {
        setCalculatedReturnCharge(res.returnCharge);
      }
    } catch (err) {
      console.error('Failed to get return charge:', err);
    } finally {
      setLoadingReturnCharge(false);
    }
  };

  const handleSubmitReturn = async () => {
    const itemsToReturn = Object.entries(selectedReturnItems)
      .filter(([_, value]) => value.selected)
      .map(([key, value]) => {
        const [productId, variantId] = key.split('_');
        return { productId, variantId, quantity: value.quantity };
      });

    if (itemsToReturn.length === 0) {
      Alert.alert('Error', 'Please select at least one item to return.');
      return;
    }
    if (!returnReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for the return.');
      return;
    }

    setSubmittingReturn(true);
    try {
      await requestCourierOrderReturn(orderId!, itemsToReturn, returnReason, faultType, returnImages);
      setReturnModalVisible(false);
      showAlert({
        title: 'Return Requested',
        message: 'Your return request has been submitted successfully.',
        type: 'success',
        buttons: [{ text: 'OK', onPress: () => fetchOrder() }]
      });
    } catch (err: any) {
      showToast({ message: err.response?.data?.message || 'Failed to submit return request.', type: 'error' });
    } finally {
      setSubmittingReturn(false);
    }
  };

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
  const isReturned = status === 'returned';

  const getStatusColor = () => {
    if (isDelivered) return '#10B981';
    if (isCancelled) return '#EF4444';
    if (isReturned) return '#8B5CF6';
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
        {!isCancelled && !isReturned && (
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

        {/* Return request tracking card */}
        {order?.returnRequest && order.returnRequest.status !== 'none' && (
          <View style={styles.returnCard}>
            <View style={styles.returnHeaderRow}>
              <View style={[styles.returnStatusBadge, { backgroundColor: getReturnStatusColor(order.returnRequest.status) + '15' }]}>
                <Text style={[styles.returnStatusText, { color: getReturnStatusColor(order.returnRequest.status) }]}>
                  RETURN: {order.returnRequest.status.toUpperCase()}
                </Text>
              </View>
              {order.returnRequest.processedAt && (
                <Text style={styles.returnProcessedDate}>
                  Processed on {new Date(order.returnRequest.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              )}
            </View>

            <View style={styles.returnDetailsBox}>
              <Text style={styles.returnReasonText}>
                <Text style={{ fontWeight: '700' }}>Reason: </Text>
                {order.returnRequest.reason}
              </Text>
              <Text style={styles.returnTypeText}>
                <Text style={{ fontWeight: '700' }}>Type: </Text>
                {order.returnRequest.faultType === 'merchant_fault' ? 'Merchant Fault (Free return)' : 'Customer Preference (Charge deducted)'}
              </Text>
              {order.returnRequest.status === 'received' ? (
                <Text style={styles.returnRefundInfoText}>
                  Refund Processed: Return charge was {order.returnRequest.faultType === 'merchant_fault' ? '₹0 (Merchant fault)' : `₹${order.returnRequest.returnCharge}`}. Refund amount credited to your wallet.
                </Text>
              ) : (
                <Text style={styles.returnRefundInfoText}>
                  Return Charge: {order.returnRequest.faultType === 'merchant_fault' ? 'FREE' : `₹${order.returnRequest.returnCharge} (deducted from refund)`}
                </Text>
              )}
            </View>

            {/* Return Step Timeline (if not rejected) */}
            {order.returnRequest.status !== 'rejected' && (
              <View style={styles.returnTimeline}>
                {['pending', 'picked', 'shipped', 'received'].map((step, idx) => {
                  const currentIdx = ['pending', 'picked', 'shipped', 'received'].indexOf(order.returnRequest.status);
                  const isCompleted = currentIdx >= idx;
                  const isLast = idx === 3;
                  const stepLabels: Record<string, string> = {
                    pending: 'Requested',
                    picked: 'Picked Up',
                    shipped: 'Shipped',
                    received: 'Completed'
                  };

                  return (
                    <View key={step} style={styles.returnTimelineStep}>
                      <View style={styles.returnTimelineLeft}>
                        <View style={[
                          styles.returnTimelineCircle,
                          isCompleted
                            ? { backgroundColor: getReturnStatusColor(order.returnRequest.status), borderColor: getReturnStatusColor(order.returnRequest.status) }
                            : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                        ]}>
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          ) : (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' }} />
                          )}
                        </View>
                        {!isLast && (
                          <View style={[
                            styles.returnTimelineLine,
                            isCompleted ? { backgroundColor: getReturnStatusColor(order.returnRequest.status) } : { backgroundColor: '#E2E8F0' },
                          ]} />
                        )}
                      </View>
                      <Text style={[
                        styles.returnTimelineLabel,
                        isCompleted ? { color: '#0F172A', fontWeight: '750' } : { color: '#94A3B8' }
                      ]}>
                        {stepLabels[step]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Rejected State message */}
            {order.returnRequest.status === 'rejected' && (
              <View style={styles.rejectedMessageContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.rejectedMessageText}>
                  This return request has been rejected by the merchant. Please contact support if you have any questions.
                </Text>
              </View>
            )}
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

        {/* Return Button */}
        {isDelivered && (!order?.returnRequest || order.returnRequest.status === 'none') && isWithinReturnWindow() && (
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={handleOpenReturnModal}
          >
            <Ionicons name="refresh-outline" size={18} color={theme.primary} />
            <Text style={[styles.returnBtnText, { color: theme.primary }]}>Return Items</Text>
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

      {/* Return Modal */}
      <Modal
        visible={returnModalVisible}
        animationType="slide"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setReturnModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Return</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>Order #{orderId?.slice(-5).toUpperCase()}</Text>

            <Text style={styles.sectionTitle}>Select items to return</Text>
            {order?.items?.map((item) => {
              const key = `${item.productId}_${item.variantId}`;
              const selection = selectedReturnItems[key] || { quantity: 1, selected: false };

              return (
                <View key={key} style={styles.modalItemRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => {
                      setSelectedReturnItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], selected: !prev[key].selected }
                      }));
                    }}
                  >
                    <Ionicons
                      name={selection.selected ? "checkbox" : "square-outline"}
                      size={24}
                      color={selection.selected ? theme.primary : "#94A3B8"}
                    />
                  </TouchableOpacity>

                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.modalItemImage} />
                  ) : (
                    <View style={[styles.modalItemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="shirt-outline" size={18} color="#CBD5E1" />
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemMeta}>Size: {item.size} • Price: ₹{item.price}</Text>

                    {/* Quantity Selector if selected */}
                    {selection.selected && (
                      <View style={styles.qtySelectorRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => {
                            if (selection.quantity > 1) {
                              setSelectedReturnItems(prev => ({
                                ...prev,
                                [key]: { ...prev[key], quantity: prev[key].quantity - 1 }
                              }));
                            }
                          }}
                        >
                          <Ionicons name="remove" size={16} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{selection.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => {
                            if (selection.quantity < item.quantity) {
                              setSelectedReturnItems(prev => ({
                                ...prev,
                                [key]: { ...prev[key], quantity: prev[key].quantity + 1 }
                              }));
                            }
                          }}
                        >
                          <Ionicons name="add" size={16} color="#0F172A" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>Why are you returning?</Text>
            
            {/* Quick Reason Pills */}
            <View style={styles.reasonsGrid}>
              {[
                { label: "Size doesn't fit", fault: 'customer_choice' },
                { label: "Didn't match expectation", fault: 'customer_choice' },
                { label: "Damaged product", fault: 'merchant_fault' },
                { label: "Incorrect item received", fault: 'merchant_fault' },
              ].map((r) => {
                const isSelected = returnReason === r.label && faultType === r.fault;
                return (
                  <TouchableOpacity
                    key={r.label}
                    style={[
                      styles.reasonPill,
                      isSelected ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: '#E2E8F0' }
                    ]}
                    onPress={() => {
                      setReturnReason(r.label);
                      setFaultType(r.fault as any);
                    }}
                  >
                    <Text style={[styles.reasonPillText, isSelected ? { color: '#fff' } : { color: '#475569' }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Additional details</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Please describe the issue in detail..."
              multiline
              numberOfLines={4}
              value={returnReason}
              onChangeText={setReturnReason}
            />

            <Text style={styles.sectionTitle}>Evidence Photos (Optional)</Text>
            <Text style={styles.sectionSubtitle}>Please upload up to 5 photos showing the condition of the items.</Text>
            
            <View style={styles.imageUploadContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagePreviewScroll}>
                {returnImages.map((uri, index) => (
                  <View key={uri} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => handleRemoveImage(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {returnImages.length < 5 && (
                  <View style={styles.uploadButtonsRow}>
                    <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage}>
                      <Ionicons name="images-outline" size={24} color={theme.primary} />
                      <Text style={[styles.uploadBoxText, { color: theme.primary }]}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBox} onPress={handleTakePhoto}>
                      <Ionicons name="camera-outline" size={24} color={theme.primary} />
                      <Text style={[styles.uploadBoxText, { color: theme.primary }]}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Estimated Return Charge */}
            <View style={styles.chargePreviewCard}>
              <Text style={styles.chargePreviewTitle}>Estimated Refund Calculation</Text>
              
              {loadingReturnCharge ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 10 }} />
              ) : (
                <View style={{ marginTop: 8 }}>
                  <View style={styles.chargePreviewRow}>
                    <Text style={styles.chargePreviewLabel}>Return Shipping Charge</Text>
                    <Text style={styles.chargePreviewValue}>
                      {faultType === 'merchant_fault' ? '₹0 (FREE)' : `₹${calculatedReturnCharge || 120}`}
                    </Text>
                  </View>
                  <Text style={styles.chargePreviewSub}>
                    {faultType === 'merchant_fault'
                      ? 'The merchant will cover the return shipping fee because the item was damaged or incorrect.'
                      : `A return fee of ₹${calculatedReturnCharge || 120} will be deducted from your total refund amount.`}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmitReturn}
              disabled={submittingReturn}
            >
              {submittingReturn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit Return Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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

  // Return button
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  returnBtnText: { fontSize: 15, fontWeight: '800' },

  // Return Card & Details
  returnCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  returnHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  returnStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  returnStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  returnProcessedDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  returnDetailsBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  returnReasonText: {
    fontSize: 13,
    color: '#334155',
  },
  returnTypeText: {
    fontSize: 13,
    color: '#334155',
  },
  returnRefundInfoText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 4,
  },
  
  // Return Timeline
  returnTimeline: {
    marginTop: 10,
    gap: 12,
  },
  returnTimelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnTimelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 20,
  },
  returnTimelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  returnTimelineLine: {
    width: 1.5,
    height: 16,
    position: 'absolute',
    top: 20,
  },
  returnTimelineLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rejectedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  rejectedMessageText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
    lineHeight: 16,
  },

  // Modal styling
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 12,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  modalItemImage: {
    width: 48,
    height: 60,
    borderRadius: 8,
  },
  qtySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  reasonPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  reasonPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  chargePreviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 24,
  },
  chargePreviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  chargePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chargePreviewLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  chargePreviewValue: {
    fontSize: 14,
    fontWeight: '850',
    color: '#0F172A',
  },
  chargePreviewSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 4,
  },
  modalSubmitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 12,
    fontWeight: '500',
  },
  imageUploadContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  imagePreviewScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 4,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadBoxText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
