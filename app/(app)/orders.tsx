import { getAllOrders, getCourierOrders } from "@/api/orders";
import logo from "@/assets/images/logo/logo.png";
import Loader from "@/components/common/Loader";
import PremiumRefreshWrapper from "@/components/common/PremiumRefreshWrapper";
import { GenderThemes, Typography } from "@/constants/theme";
import { useGender } from "@/context/GenderContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import CustomRefreshControl from "@/components/common/CustomRefreshControl";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OrderTab = 'trybuy' | 'courier';

const OrdersScreen = () => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<OrderTab>('trybuy');
  const [tbOrders, setTbOrders] = useState<any[]>([]);
  const [courierOrders, setCourierOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [tbRes, courierRes] = await Promise.allSettled([
        getAllOrders(),
        getCourierOrders(),
      ]);

      if (tbRes.status === 'fulfilled') {
        const data = tbRes.value;
        setTbOrders(Array.isArray(data) ? data : data?.orders || []);
      }
      if (courierRes.status === 'fulfilled') {
        const data = courierRes.value;
        setCourierOrders(Array.isArray(data) ? data : data?.orders || []);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const orders = activeTab === 'trybuy' ? tbOrders : courierOrders;

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "#FF9800",
      placed: "#FF9800",
      accepted: "#2196F3",
      packed: "#673AB7",
      in_transit: "#00BCD4",
      try_phase: "#9C27B0",
      selection_made: "#FF5722",
      return_in_progress: "#FF9800",
      completed: "#4CAF50",
      cancelled: "#F44336",
      rejected: "#F44336",
    };
    return statusColors[status?.toLowerCase()] || "#666";
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={activeTab === 'trybuy' ? "receipt-outline" : "cube-outline"}
          size={80}
          color="#E0E0E0"
        />
      </View>
      <Text style={styles.emptyTitle}>
        No {activeTab === 'trybuy' ? 'Try & Buy' : 'Courier'} Orders
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'trybuy'
          ? 'Try before you buy — browse products from nearby merchants.'
          : 'Order from merchants across India via courier delivery.'}
      </Text>
      <TouchableOpacity
        style={[styles.shopNowButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push(activeTab === 'trybuy' ? "/(app)/(tabs)" : "/(app)/(tabs)/explore" as any)}
      >
        <Text style={styles.shopNowText}>Start Shopping</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        <View style={{ width: 32 }} />
      </View>


      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trybuy' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
          onPress={() => setActiveTab('trybuy')}
        >
          <Ionicons
            name={activeTab === 'trybuy' ? 'home' : 'home-outline'}
            size={16}
            color={activeTab === 'trybuy' ? theme.primary : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'trybuy' && { color: theme.primary, fontWeight: '800' }]}>
            Try & Buy
          </Text>
          {tbOrders.length > 0 && (
            <View style={[styles.badge, { backgroundColor: activeTab === 'trybuy' ? theme.primary : '#CBD5E1' }]}>
              <Text style={styles.badgeText}>{tbOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'courier' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
          onPress={() => setActiveTab('courier')}
        >
          <Ionicons
            name={activeTab === 'courier' ? 'cube' : 'cube-outline'}
            size={16}
            color={activeTab === 'courier' ? theme.primary : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'courier' && { color: theme.primary, fontWeight: '800' }]}>
            Explore
          </Text>
          {courierOrders.length > 0 && (
            <View style={[styles.badge, { backgroundColor: activeTab === 'courier' ? theme.primary : '#CBD5E1' }]}>
              <Text style={styles.badgeText}>{courierOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Loader size={60} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        renderEmptyState()
      ) : (
        <PremiumRefreshWrapper
          scrollY={scrollY}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          <Animated.ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            scrollEventThrottle={16}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.orderCount}>
              {orders.length} {orders.length === 1 ? "Order" : "Orders"}
            </Text>

            {orders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={[
                  styles.orderCard,
                  {
                    borderLeftColor: getStatusColor(order.orderStatus),
                    borderColor: selectedGender === 'Men' ? '#F1F5F9' : theme.primary + '10',
                    shadowColor: theme.primary,
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (activeTab === 'trybuy') {
                    router.push({ pathname: '/order-tracking' as any, params: { orderId: order._id } });
                  } else {
                    router.push({ pathname: '/courier-tracking' as any, params: { orderId: order._id } });
                  }
                }}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdSection}>
                    <Ionicons name="receipt" size={18} color="#64748B" />
                    <Text style={styles.orderId} numberOfLines={1}>
                      #FF_{order._id.slice(-5).toUpperCase()}
                    </Text>
                    {/* Type Badge */}
                    <View style={[
                      styles.orderTypeBadge,
                      { backgroundColor: activeTab === 'trybuy' ? '#DCFCE7' : '#F3E8FF' },
                    ]}>
                      <Text style={[
                        styles.orderTypeBadgeText,
                        { color: activeTab === 'trybuy' ? '#166534' : '#7C3AED' },
                      ]}>
                        {activeTab === 'trybuy' ? 'T&B' : 'COURIER'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.orderStatus) }]}>
                      {order.orderStatus?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="cube-outline" size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      {order.items?.length || 0} {order.items?.length === 1 ? "Item" : "Items"}
                    </Text>
                  </View>
                  {activeTab === 'courier' && (
                    <>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Ionicons name="car-outline" size={14} color="#94A3B8" />
                        <Text style={styles.metaText}>₹{order.deliveryCharge || 40} Delivery</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.totalLabel}>Total Payable</Text>
                    <Text style={[styles.totalAmount, { color: theme.primary }]}>
                      ₹{
                        activeTab === 'trybuy'
                          ? (order.finalBilling?.totalPayable || order.totalAmount)
                          : ((order.totalAmount || 0) + (order.deliveryCharge || 40))
                      }
                    </Text>
                  </View>
                  <View style={styles.trackArrow}>
                    <Text style={styles.trackText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Animated.ScrollView>
      </PremiumRefreshWrapper>
      )}

      <View style={styles.footer}>
        <Image source={logo} style={styles.footerLogo} blurRadius={3} resizeMode="contain" />
        <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
        <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
      </View>
    </View>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backButton: { padding: 4 },
  headerLogo: { width: 100, height: 30 },

  // Tab Switcher
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6, borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomWidth: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: "#64748B",
  },
  orderCount: {
    fontSize: 14, fontFamily: Typography.fontFamily.bold, color: "#94A3B8",
    marginTop: 20, marginBottom: 12, letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderWidth: 1,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  orderHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  orderIdSection: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  orderId: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: "#1E293B" },
  orderTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  orderTypeBadgeText: { fontSize: 9, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: Typography.fontFamily.extraBold },
  orderMeta: {
    flexDirection: "row", alignItems: "center", marginBottom: 16,
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: "#64748B" },
  metaDivider: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", marginHorizontal: 10,
  },
  orderFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9",
  },
  priceContainer: { flex: 1 },
  totalLabel: {
    fontSize: 11, fontFamily: Typography.fontFamily.bold, color: "#94A3B8", marginBottom: 2,
  },
  totalAmount: { fontSize: 18, fontFamily: Typography.fontFamily.extraBold },
  trackArrow: { flexDirection: "row", alignItems: "center", gap: 4 },
  trackText: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: "#64748B" },
  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center", marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05,
    shadowRadius: 10, elevation: 2,
  },
  emptyTitle: {
    fontSize: 20, fontFamily: Typography.fontFamily.bold, color: "#1A1A1A", marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14, fontFamily: Typography.fontFamily.medium, color: "#64748B",
    textAlign: "center", lineHeight: 20, marginBottom: 32,
  },
  shopNowButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2,
    shadowRadius: 8, elevation: 5,
  },
  shopNowText: { color: "#fff", fontSize: 15, fontFamily: Typography.fontFamily.bold },
  footer: { alignItems: 'center', marginVertical: 32 },
  versionText: {
    fontSize: 8, fontFamily: Typography.fontFamily.bold, color: '#d1d5db',
    letterSpacing: 2.5, marginTop: 4,
  },
  taglineText: {
    fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#d1d5db',
    letterSpacing: 2.5, marginTop: 4, opacity: 0.6,
  },
  footerLogo: { width: 140, height: 60, opacity: 0.25 },
});
