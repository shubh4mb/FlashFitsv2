import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { listenOrderUpdates } from '@/sockets/order.socket';

type Item = {
  _id: string;
  name: string;
  image?: string;
  size?: string;
  price: number;
  quantity: number;
  tryStatus?: string;
};

type OrderData = {
  _id?: string;
  orderStatus?: string;
  items?: Item[];
  otp?: string;
  finalBilling?: any;
  deliveryCharge?: number;
  totalAmount?: number;
  deliveryLocation?: any;
  createdAt?: string;
  [k: string]: any;
};

export default function ReturnItemsScreen() {
  const { items: itemsParam, otp, orderId, orderData: orderDataParam } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const parsedOrderData: OrderData | null = orderDataParam
    ? (typeof orderDataParam === 'string' ? JSON.parse(orderDataParam) : orderDataParam)
    : null;

  const returnItems: Item[] = itemsParam
    ? (typeof itemsParam === 'string' ? JSON.parse(itemsParam) : itemsParam)
    : [];

  const [showCompletion, setShowCompletion] = useState(false);

  // Listen for order completion via socket
  useEffect(() => {
    const initListener = async () => {
      await listenOrderUpdates((data) => {
        const orderStatus = data?.orderStatus;
        if (orderStatus === 'otp-verified-return' || orderStatus === 'delivered' || orderStatus === 'completed') {
          setShowCompletion(true);
        }
      });
    };

    initListener();
  }, [orderId]);

  // ─── Completion State ───
  if (showCompletion) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Return Complete</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.completionContainer}>
          <View style={styles.completionIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.completionTitle}>Return Processed!</Text>
          <Text style={styles.completionSub}>
            Your return has been verified by the delivery partner
          </Text>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order ID</Text>
              <Text style={styles.summaryValue}>#{(orderId as string)?.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Returned</Text>
              <Text style={styles.summaryValue}>{returnItems.length}</Text>
            </View>
            {parsedOrderData?.finalBilling?.totalPayable != null && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount Paid</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  ₹{parsedOrderData.finalBilling.totalPayable}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.replace('/(app)/(tabs)' as any)}
          >
            <Text style={styles.primaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.primary }]}
            onPress={() => router.replace('/orders' as any)}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Order History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main Return Handover View ───
  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="shirt-outline" size={24} color="#CBD5E1" />
          </View>
        )}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Size {item.size}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Qty {item.quantity}</Text>
          </View>
        </View>
        <Text style={styles.price}>₹{item.price}</Text>
      </View>

      <View style={styles.checkIcon}>
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: '#0F172A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Return Order</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            Order #{(orderId as string)?.slice(-6).toUpperCase()}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* OTP Card */}
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <View style={styles.otpIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
            <Text style={styles.otpLabel}>Verification Code</Text>
          </View>
          <View style={styles.otpDisplay}>
            <Text style={styles.otpValue}>{otp || '----'}</Text>
          </View>
          <View style={styles.otpHintRow}>
            <Ionicons name="information-circle-outline" size={14} color="#64748B" />
            <Text style={styles.otpHint}>Share this code with the delivery partner</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="flash" size={18} color={theme.primary} />
            <Text style={styles.instructionTitle}>Handover Instructions</Text>
          </View>
          <Text style={styles.instructionText}>• Ensure all items are properly kept</Text>
          <Text style={styles.instructionText}>• Share the OTP before handing over</Text>
          <Text style={styles.instructionText}>• Keep items ready for pickup</Text>
        </View>

        {/* Items Section */}
        <View style={styles.itemsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Items to Return</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{returnItems.length}</Text>
            </View>
          </View>

          <FlatList
            data={returnItems}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.iconAction}>
            <View style={styles.iconCircle}>
              <Ionicons name="call" size={18} color="#fff" />
            </View>
            <Text style={styles.iconBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconAction}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles" size={18} color="#fff" />
            </View>
            <Text style={styles.iconBtnText}>Support</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.handoverBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.replace('/(app)/(tabs)' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.handoverText}>Complete Handover</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  content: { flex: 1, padding: 20 },

  // OTP Card
  otpCard: {
    backgroundColor: '#0F172A', borderRadius: 20, padding: 24, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  otpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  otpIconCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  otpLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  otpDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, paddingVertical: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 16,
  },
  otpValue: { fontSize: 42, fontWeight: '900', letterSpacing: 10, color: '#10B981' },
  otpHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  otpHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 6 },

  // Instructions
  instructionsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  instructionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  instructionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginLeft: 10 },
  instructionText: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 2 },

  // Items Section
  itemsSection: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  countBadge: {
    backgroundColor: '#0F172A', width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  countBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Item Card
  itemCard: {
    flexDirection: 'row', padding: 16, borderRadius: 16, backgroundColor: '#fff',
    marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  imageContainer: { borderRadius: 12, overflow: 'hidden' },
  image: { width: 56, height: 70, borderRadius: 12 },
  itemDetails: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  price: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  checkIcon: { marginLeft: 12 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 16,
  },
  secondaryActions: { flexDirection: 'row', gap: 12 },
  iconAction: { alignItems: 'center' },
  iconCircle: {
    backgroundColor: '#0F172A', width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 4 },
  handoverBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  handoverText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Completion
  completionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  completionIcon: { marginBottom: 24 },
  completionTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  completionSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  summaryCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 32,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  summaryLabel: { fontSize: 14, color: '#64748B' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  primaryBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
});
