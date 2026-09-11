import { getAllOrders, getCourierOrders } from "@/api/orders";
import logo from "@/assets/images/logo/logo.png";
import Loader from "@/components/common/Loader";
import PremiumRefreshWrapper from "@/components/common/PremiumRefreshWrapper";
import { BrandColors, GenderThemes, Typography } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGender } from "@/context/GenderContext";
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
  Linking,
  Alert,
} from "react-native";
import CustomRefreshControl from "@/components/common/CustomRefreshControl";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterTab = 'All' | 'Processing' | 'Shipped' | 'Delivered' | 'Return';

const FILTER_TABS: FilterTab[] = ['All', 'Processing', 'Shipped', 'Delivered', 'Return'];

const OrdersScreen = () => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
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

      let tbList: any[] = [];
      let courierList: any[] = [];

      if (tbRes.status === 'fulfilled') {
        const data: any = tbRes.value;
        const list = Array.isArray(data) ? data : data?.orders || [];
        tbList = list.map((o: any) => ({
          ...o,
          _isCourier: Boolean(o.isCourier || o.deliveryMode === 'courier' || o.fulfillmentType === 'courier'),
        }));
      }
      if (courierRes.status === 'fulfilled') {
        const data: any = courierRes.value;
        const list = Array.isArray(data) ? data : data?.orders || [];
        courierList = list.map((o: any) => ({
          ...o,
          _isCourier: true,
        }));
      }

      const orderMap = new Map<string, any>();
      [...tbList, ...courierList].forEach(order => {
        if (order?._id) {
          orderMap.set(String(order._id), order);
        }
      });

      const combined = Array.from(orderMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setAllOrders(combined);

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

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'delivered') return '#10B981';
    if (s === 'in_transit' || s === 'shipped' || s === 'accepted') return BrandColors.primary;
    if (s === 'pending' || s === 'placed' || s === 'packed') return '#F59E0B';
    if (s === 'return_in_progress' || s === 'returned') return '#8B5CF6';
    if (s === 'cancelled' || s === 'rejected') return '#EF4444';
    return '#64748B';
  };

  const filteredOrders = allOrders.filter(order => {
    if (activeFilter === 'All') return true;
    const s = order.orderStatus?.toLowerCase() || '';
    if (activeFilter === 'Processing') return ['pending', 'placed', 'packed', 'accepted'].includes(s);
    if (activeFilter === 'Shipped') return ['in_transit', 'shipped', 'try_phase'].includes(s);
    if (activeFilter === 'Delivered') return ['completed', 'delivered'].includes(s);
    if (activeFilter === 'Return') return ['return_in_progress', 'returned'].includes(s);
    return true;
  });

  const openWhatsAppSupport = async (orderId: string, orderStatus: string) => {
    try {
      const shortId = orderId ? String(orderId).slice(-5).toUpperCase() : 'ORDER';
      const message = encodeURIComponent(
        `Hi FlashFits Support! 👋\n\nI need help regarding my order: #FF_${shortId}\nOrder Status: ${orderStatus?.toUpperCase()}\n\nMy concern is: `
      );
      const url = `whatsapp://send?phone=918383823813&text=${message}`;
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/918383823813?text=${message}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="receipt-outline"
          size={80}
          color="#CBD5E1"
        />
      </View>
      <Text style={styles.emptyTitle}>
        No Orders Yet
      </Text>
      <Text style={styles.emptySubtitle}>
        Your past and current orders will appear here.
      </Text>
      <TouchableOpacity
        style={[styles.shopNowButton, { backgroundColor: BrandColors.primary }]}
        onPress={() => router.push("/(app)/(tabs)" as any)}
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
          <Ionicons name="chevron-back" size={24} color={BrandColors.matteBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Filter Tabs matching Design Mockup */}
      <View style={styles.filterTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsContent}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: BrandColors.primary, borderColor: BrandColors.primary }
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && { color: '#FFFFFF', fontWeight: '700' }
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Loader size={60} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
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
              {filteredOrders.map((order) => {
                const isCourier = order._isCourier;
                const totalPayable = isCourier
                  ? ((order.totalAmount || 0) + (order.deliveryCharge || 40))
                  : (order.finalBilling?.totalPayable || order.totalAmount || 0);

                return (
                  <TouchableOpacity
                    key={order._id}
                    style={styles.orderCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isCourier) {
                        router.push({ pathname: '/courier-tracking' as any, params: { orderId: order._id } });
                      } else {
                        router.push({ pathname: '/order-tracking' as any, params: { orderId: order._id } });
                      }
                    }}
                  >
                    <View style={styles.orderHeader}>
                      <View style={styles.orderIdSection}>
                        <Text style={styles.orderId} numberOfLines={1}>
                          Order ID #{order?._id ? String(order._id).slice(-6).toUpperCase() : '------'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) + '15' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(order.orderStatus) }]}>
                            {order.orderStatus?.toUpperCase()}
                          </Text>
                        </View>
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
                    </View>

                    <View style={styles.orderFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>
                          ₹{totalPayable}
                        </Text>
                      </View>
                      <View style={styles.trackArrow}>
                        <Text style={styles.trackText}>Track Order</Text>
                        <Ionicons name="chevron-forward" size={16} color={BrandColors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </Animated.ScrollView>
        </PremiumRefreshWrapper>
      )}

      <View style={styles.footer}>
        <Image source={logo} style={styles.footerLogo} blurRadius={3} resizeMode="contain" />
        <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
        <Text style={styles.versionText}>MADE IN KERALA 🌴</Text>
      </View>
    </View>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: BrandColors.matteBlack,
  },
  headerLogo: { width: 100, height: 30 },

  filterTabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: BrandColors.offWhite,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: BrandColors.textSecondary,
  },

  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: "#64748B",
  },
  orderCount: {
    fontSize: 14, fontFamily: Typography.fontFamily.bold, color: "#94A3B8",
    marginTop: 10, marginBottom: 12, letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  orderHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  orderIdSection: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  orderId: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: BrandColors.matteBlack },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: Typography.fontFamily.bold },
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

