import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, LayoutAnimation, UIManager, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllOrders } from '@/api/orders';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, BrandColors } from '@/constants/theme';
import { joinOrderRoom, listenOrderUpdates, removeOrderListeners } from '@/sockets/order.socket';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_TB_STATUSES = ['placed', 'accepted', 'packed', 'in_transit', 'try_phase', 'selection_made'];
const ACTIVE_COURIER_STATUSES = ['placed', 'accepted', 'packed', 'confirmed', 'shipped', 'in_transit'];

const isOrderActive = (order: any) => {
  if (!order) return false;

  const status = (order.orderStatus || '').toLowerCase();
  const paymentStatus = (order.paymentStatus || '').toLowerCase();
  const customerDeliveryStatus = (order.customerDeliveryStatus || '').toLowerCase();
  const deliveryRiderStatus = (order.deliveryRiderStatus || '').toLowerCase();

  // Cancelled by field indicators
  if (order.cancelledBy || order.cancelledAt) {
    return false;
  }

  // Cancelled, rejected, failed, or returned are permanently inactive
  if (['cancelled', 'rejected', 'failed', 'payment_failed', 'returned'].includes(status)) {
    return false;
  }

  // Delivery rider status or customer delivery status cancelled
  if (['cancelled', 'failed', 'returned'].includes(customerDeliveryStatus)) {
    return false;
  }

  if (['cancelled'].includes(deliveryRiderStatus)) {
    return false;
  }

  // Order fully completed
  if (status === 'completed') {
    return false;
  }

  // Customer delivery status is completed or delivered -> Customer has finished delivery/handover
  if (['completed', 'delivered'].includes(customerDeliveryStatus)) {
    return false;
  }

  // If return in progress, the customer is done (rider is returning to store)
  if (status === 'return_in_progress') {
    return false;
  }

  // If all items are returned and selection is made or paid
  const items = order.items || [];
  const allReturned = items.length > 0 && items.every((i: any) => i.tryStatus === 'returned' || i.tryStatus === 'return');
  if (allReturned && (paymentStatus === 'paid' || customerDeliveryStatus === 'completed' || ['completed', 'return_in_progress'].includes(status))) {
    return false;
  }

  // If payment is paid and order is in selection_made, customer already paid
  if (paymentStatus === 'paid' && ['selection_made', 'completed', 'return_in_progress'].includes(status)) {
    return false;
  }

  // Try & Buy: Selection made
  if (status === 'selection_made') {
    return paymentStatus !== 'paid' && !['completed', 'delivered'].includes(customerDeliveryStatus);
  }

  const isCourier = order.isCourier || order._isCourier || order.deliveryMode === 'courier' || order.fulfillmentType === 'courier';
  if (isCourier) {
    return ACTIVE_COURIER_STATUSES.includes(status);
  }
  return ACTIVE_TB_STATUSES.includes(status);
};

const getOrderSubtitle = (order: any) => {
  const shortId = order?._id ? String(order._id).slice(-5).toUpperCase() : '------';
  const status = (order.orderStatus || '').toLowerCase();

  if (status === 'selection_made') {
    if (order.trialPhaseEnd || order.photoVerified || (order as any)?.isPhotoVerified) {
      return `#${shortId} • PAYMENT PENDING`;
    }
    return `#${shortId} • SHARE OTP WITH RIDER`;
  }
  if (status === 'try_phase') {
    return `#${shortId} • TRYING CLOTHES`;
  }
  if (status === 'in_transit') {
    return `#${shortId} • RIDER ON THE WAY`;
  }
  if (status === 'packed') {
    return `#${shortId} • ORDER PACKED`;
  }
  if (status === 'accepted') {
    return `#${shortId} • ORDER ACCEPTED`;
  }
  if (status === 'placed') {
    return `#${shortId} • ORDER PLACED`;
  }
  return `#${shortId} • ${order.orderStatus?.toUpperCase().replace('_', ' ') || 'ACTIVE'}`;
};

export default function ActiveOrderBanner() {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();

  const handleOrderPress = (order: any) => {
    const isCourier = order.isCourier || order._isCourier || order.deliveryMode === 'courier' || order.fulfillmentType === 'courier';
    if (isCourier) {
      router.push({ pathname: '/courier-tracking' as any, params: { orderId: order._id } });
    } else {
      router.push({ pathname: '/order-tracking' as any, params: { orderId: order._id } });
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const ordersRes: any = await getAllOrders();
      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || [];
      const activeList = orders.filter(isOrderActive);
      setActiveOrders(activeList);

      // Join socket rooms for live updates
      activeList.forEach((o: any) => {
        if (o._id) {
          joinOrderRoom(o._id);
        }
      });
    } catch (err) {
      console.log('Error fetching active orders for banner', err);
    }
  }, []);

  // Re-fetch whenever user navigates between screens or returns from a child screen
  useEffect(() => {
    fetchOrders();
  }, [pathname, fetchOrders]);

  // Re-fetch when app returns to foreground from background
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchOrders();
      }
    });
    return () => {
      appStateSub.remove();
    };
  }, [fetchOrders]);

  // Primary active lifecycle: polling & real-time socket events with instant optimistic drop
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);

    let unsubscribe: (() => void) | undefined;
    listenOrderUpdates((updateData: any) => {
      if (!updateData) {
        fetchOrders();
        return;
      }

      const updateId = String(updateData._id || updateData.orderId || '').replace(/^["']|["']$/g, '').trim();
      const st = (updateData.orderStatus || '').toLowerCase();
      const isCancelled =
        ['cancelled', 'rejected', 'failed', 'returned', 'completed'].includes(st) ||
        Boolean(updateData.cancelledBy) ||
        Boolean(updateData.cancelledAt) ||
        updateData.customerDeliveryStatus === 'cancelled' ||
        updateData.deliveryRiderStatus === 'cancelled' ||
        Boolean(updateData.isCancelled);

      if (updateId && isCancelled) {
        // Drop the cancelled order from banner immediately (0ms response)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveOrders((prev) =>
          prev.filter((o) => {
            const currentId = String(o._id || '').replace(/^["']|["']$/g, '').trim();
            return currentId !== updateId;
          })
        );
      }

      // Revalidate full active orders list with backend
      fetchOrders();
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      clearInterval(interval);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchOrders]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (activeOrders.length === 0) return null;

  const dynamicBottom = (Platform.OS === 'ios' ? 85 : 90) + insets.bottom + 16;
  const gradientColors = (theme as any)?.buttonGradient || BrandColors.buttonGradient || ['#00C2E8', '#0088B8'];

  // Single active order: Render original style
  if (activeOrders.length === 1) {
    const singleOrder = activeOrders[0];
    return (
      <View style={[styles.stackWrapper, { bottom: dynamicBottom }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.touchableCard}
          onPress={() => handleOrderPress(singleOrder)}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="cube" size={18} color={theme.primary || '#00C2E8'} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>Track Order</Text>
                <Text style={styles.subtitle}>
                  {getOrderSubtitle(singleOrder)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Multiple active orders: Stacked deck / expandable list
  return (
    <View style={[styles.stackWrapper, { bottom: dynamicBottom }]}>
      {/* Background card stack effects when collapsed */}
      {!isExpanded && (
        <>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.stackBackCard,
              { opacity: 0.35, zIndex: -2, transform: [{ translateY: 6 }, { scaleX: 0.92 }] },
            ]}
          />
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.stackBackCard,
              { opacity: 0.65, zIndex: -1, transform: [{ translateY: 3 }, { scaleX: 0.96 }] },
            ]}
          />
        </>
      )}

      {isExpanded ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.expandedContainer}
        >
          {/* Header Toggle */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.expandedHeader}
            onPress={toggleExpanded}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="layers" size={16} color={theme.primary || '#00C2E8'} />
              </View>
              <Text style={styles.expandedTitle}>{activeOrders.length} Active Orders</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.expandedDivider} />

          {/* Orders List */}
          {activeOrders.map((order, idx) => (
            <TouchableOpacity
              key={order._id}
              activeOpacity={0.7}
              style={[
                styles.orderItem,
                idx === activeOrders.length - 1 && { borderBottomWidth: 0 }
              ]}
              onPress={() => handleOrderPress(order)}
            >
              <View style={styles.orderItemLeft}>
                <Ionicons name="cube-outline" size={16} color="#fff" style={{ opacity: 0.85 }} />
                <View>
                  <Text style={styles.orderItemTitle}>
                    Order #{order?._id ? String(order._id).slice(-5).toUpperCase() : '------'}
                  </Text>
                  <Text style={styles.orderItemSub}>
                    {getOrderSubtitle(order).split(' • ')[1] || order.orderStatus?.toUpperCase().replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          ))}
        </LinearGradient>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.touchableCard}
          onPress={toggleExpanded}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="layers" size={18} color={theme.primary || '#00C2E8'} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{activeOrders.length} Active Orders</Text>
                <Text style={styles.subtitle}>Tap to track</Text>
              </View>
            </View>
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stackWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    width: 230,
    zIndex: 1000,
  },
  touchableCard: {
    borderRadius: 16,
    shadowColor: '#0088B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  stackBackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 52,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#0088B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  container: {
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  expandedContainer: {
    borderRadius: 20,
    padding: 12,
    elevation: 8,
    shadowColor: '#0088B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  expandedDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderItemTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderItemSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
});
