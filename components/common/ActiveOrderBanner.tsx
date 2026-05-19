import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAllOrders } from '@/api/orders';
import { useGender } from '@/context/GenderContext';
import { GenderThemes } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_STATUSES = ['placed', 'accepted', 'packed', 'in_transit', 'try_phase', 'selection_made', 'return_in_progress'];

export default function ActiveOrderBanner() {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const fetchOrders = async () => {
    try {
      const ordersRes = await getAllOrders();
      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || [];
      const activeList = orders.filter((o: any) => ACTIVE_STATUSES.includes(o.orderStatus?.toLowerCase()));
      setActiveOrders(activeList);
    } catch (err) {
      console.log('Error fetching active orders for banner', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }, [])
  );

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (activeOrders.length === 0) return null;

  // Single active order: Render original style
  if (activeOrders.length === 1) {
    const singleOrder = activeOrders[0];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.container, { backgroundColor: theme.primary }]}
        onPress={() => router.push({ pathname: '/order-tracking' as any, params: { orderId: singleOrder._id } })}
      >
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={24} color={theme.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Track Order</Text>
            <Text style={styles.subtitle}>
              #{singleOrder._id.slice(-5).toUpperCase()} • {singleOrder.orderStatus?.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>
    );
  }

  // Multiple active orders: Stacked deck / expandable list
  return (
    <View style={styles.stackWrapper}>
      {/* Background card stack effects when collapsed */}
      {!isExpanded && (
        <>
          <View style={[styles.stackBackCard, { backgroundColor: theme.primary, opacity: 0.3, zIndex: -2, transform: [{ translateY: 8 }, { scaleX: 0.92 }] }]} />
          <View style={[styles.stackBackCard, { backgroundColor: theme.primary, opacity: 0.6, zIndex: -1, transform: [{ translateY: 4 }, { scaleX: 0.96 }] }]} />
        </>
      )}

      {isExpanded ? (
        <View style={[styles.expandedContainer, { backgroundColor: theme.primary }]}>
          {/* Header Toggle */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.expandedHeader}
            onPress={toggleExpanded}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="layers" size={20} color={theme.primary} />
              </View>
              <Text style={styles.expandedTitle}>{activeOrders.length} Active Orders</Text>
            </View>
            <Ionicons name="chevron-down" size={24} color="#fff" />
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
              onPress={() => {
                router.push({ pathname: '/order-tracking' as any, params: { orderId: order._id } });
              }}
            >
              <View style={styles.orderItemLeft}>
                <Ionicons name="cube-outline" size={18} color="#fff" style={{ opacity: 0.8 }} />
                <View>
                  <Text style={styles.orderItemTitle}>
                    Order #{order._id.slice(-5).toUpperCase()}
                  </Text>
                  <Text style={styles.orderItemSub}>
                    {order.orderStatus?.toUpperCase().replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.container, { backgroundColor: theme.primary }]}
          onPress={toggleExpanded}
        >
          <View style={styles.leftContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="layers" size={24} color={theme.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{activeOrders.length} Active Orders</Text>
              <Text style={styles.subtitle}>Tap to view and track individually</Text>
            </View>
          </View>
          <Ionicons name="chevron-up" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stackWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 105 : 95, // Positioned just above tabs
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  stackBackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  container: {
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  expandedContainer: {
    borderRadius: 24,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  expandedDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  orderItemSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
