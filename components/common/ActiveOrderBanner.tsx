import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAllOrders } from '@/api/orders';
import { useGender } from '@/context/GenderContext';
import { GenderThemes } from '@/constants/theme';

const ACTIVE_STATUSES = ['placed', 'accepted', 'packed', 'in_transit', 'try_phase', 'selection_made', 'return_in_progress'];

export default function ActiveOrderBanner() {
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const fetchOrders = async () => {
    try {
      const ordersRes = await getAllOrders();
      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || [];
      const active = orders.find((o: any) => ACTIVE_STATUSES.includes(o.orderStatus?.toLowerCase()));
      
      if (active) {
        setActiveOrder(active);
      } else {
        setActiveOrder(null);
      }
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

  if (!activeOrder) return null;

  const handlePress = () => {
    router.push({ pathname: '/order-tracking' as any, params: { orderId: activeOrder._id } });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.container, { backgroundColor: theme.primary }]}
      onPress={handlePress}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="cube" size={24} color={theme.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Track Order</Text>
          <Text style={styles.subtitle}>
            #{activeOrder._id.slice(-5).toUpperCase()} • {activeOrder.orderStatus?.toUpperCase()}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 105 : 95, // Positioned just above tabs
    left: 16,
    right: 16,
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
    zIndex: 1000,
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
});
