import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import logo from "@/assets/images/logo/logo.png";
import { getAllOrders } from "@/api/orders";
import { useGender } from "@/context/GenderContext";
import { GenderThemes, Typography } from "@/constants/theme";
import Loader from "@/components/common/Loader";

const OrdersScreen = () => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getAllOrders();
      if (res) {
        setOrders(Array.isArray(res) ? res : res.orders || []);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
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
    const statusColors: Record<string, string> = {
      placed: "#FF9800",
      confirmed: "#2196F3",
      preparing: "#9C27B0",
      ready: "#4CAF50",
      picked: "#00BCD4",
      delivered: "#4CAF50",
      cancelled: "#F44336",
    };
    return statusColors[status?.toLowerCase()] || "#666";
  };

  const getStatusIcon = (status: string) => {
    const statusIcons: Record<string, any> = {
      placed: "receipt-outline",
      confirmed: "checkmark-circle-outline",
      preparing: "restaurant-outline",
      ready: "cube-outline",
      picked: "bicycle-outline",
      delivered: "checkmark-done-circle",
      cancelled: "close-circle-outline",
    };
    return statusIcons[status?.toLowerCase()] || "information-circle-outline";
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="receipt-outline" size={80} color="#E0E0E0" />
      </View>
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your order history will appear here once you make your first purchase
      </Text>
      <TouchableOpacity
        style={[styles.shopNowButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/(app)/(tabs)")}
      >
        <Text style={styles.shopNowText}>Start Shopping</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        <View style={{ width: 32 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Loader size={60} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
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
                    shadowColor: theme.primary 
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  // Navigate to order detail if exists, otherwise just show ID
                  console.log("Order pressed:", order._id);
                }}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdSection}>
                    <Ionicons name="receipt" size={18} color="#64748B" />
                    <Text style={styles.orderId} numberOfLines={1}>
                      #FF_{order._id.slice(-5).toUpperCase()}
                    </Text>
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
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.totalLabel}>Total Payable</Text>
                    <Text style={[styles.totalAmount, { color: theme.primary }]}>
                      ₹{order.finalBilling?.totalPayable || order.totalAmount}
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
        </ScrollView>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 4,
  },
  headerLogo: {
    width: 100,
    height: 30,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: "#64748B",
  },
  orderCount: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: "#94A3B8",
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderIdSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  orderId: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: "#1E293B",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.extraBold,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: "#64748B",
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 10,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  priceContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: "#94A3B8",
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
  },
  trackArrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trackText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: "#64748B",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  shopNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  shopNowText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
  },
  // ── Footer
  footer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  versionText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  taglineText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
    opacity: 0.6,
    textShadowColor: 'rgba(209, 213, 219, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  footerLogo: {
    width: 140,
    height: 60,
    opacity: 0.25,
  },
});
