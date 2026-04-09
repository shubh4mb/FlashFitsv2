import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGender } from '@/context/GenderContext';
import { useOffers } from '@/context/OffersContext';
import { GenderThemes } from '@/constants/theme';
import OfferBadge from '@/components/common/OfferBadge';
import { Offer } from '@/api/offers';

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const { offers, flashSales, loading, refreshOffers, refreshFlashSales } = useOffers();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshOffers(), refreshFlashSales()]);
    setRefreshing(false);
  };

  // Categorize offers
  const activeFlashSales = flashSales.filter(o => new Date(o.endDate) > new Date());
  const adminOffers = offers.filter(o => o.scope === 'admin' && !o.isFlashSale);
  const merchantOffers = offers.filter(o => o.scope === 'merchant');
  const couponOffers = offers.filter(o => o.requiresCoupon && o.couponCode);

  const sections = [
    { title: '⚡ Flash Sales', data: activeFlashSales, empty: 'No active flash sales' },
    { title: '🎁 Special Offers', data: adminOffers, empty: 'No special offers right now' },
    { title: '🏪 Store Offers', data: merchantOffers, empty: 'No store offers available' },
    { title: '🎟️ Coupon Offers', data: couponOffers, empty: 'No coupon offers' },
  ].filter(s => s.data.length > 0);

  if (loading && offers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offers & Deals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{offers.length}</Text>
            <Text style={styles.statLabel}>Active Offers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{activeFlashSales.length}</Text>
            <Text style={styles.statLabel}>Flash Sales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{couponOffers.length}</Text>
            <Text style={styles.statLabel}>Coupons</Text>
          </View>
        </View>

        {sections.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Offers Available</Text>
            <Text style={styles.emptyDesc}>Check back later for amazing deals!</Text>
          </View>
        )}

        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((offer) => (
              <OfferListItem key={offer._id} offer={offer} theme={theme} />
            ))}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function OfferListItem({ offer, theme }: { offer: Offer; theme: any }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!offer.isFlashSale) return;
    const update = () => {
      const diff = new Date(offer.endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m left`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [offer]);

  const discountLabel = offer.discountType === 'flat'
    ? `₹${offer.discountValue} OFF`
    : `${offer.discountValue}% OFF`;

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerLeft}>
        <View style={[styles.discountCircle, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.discountText, { color: theme.primary }]}>{discountLabel}</Text>
        </View>
      </View>
      <View style={styles.offerCenter}>
        <Text style={styles.offerTitle} numberOfLines={2}>{offer.title}</Text>
        {offer.description ? (
          <Text style={styles.offerDesc} numberOfLines={1}>{offer.description}</Text>
        ) : null}
        <View style={styles.offerMeta}>
          <OfferBadge type={offer.type} compact />
          {offer.conditions?.minCartValue ? (
            <Text style={styles.offerCondition}>Above ₹{offer.conditions.minCartValue}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.offerRight}>
        {offer.couponCode ? (
          <View style={styles.couponTag}>
            <Text style={styles.couponTagText}>{offer.couponCode}</Text>
          </View>
        ) : (
          <View style={styles.autoTag}>
            <Text style={styles.autoTagText}>Auto</Text>
          </View>
        )}
        {offer.isFlashSale && timeLeft && (
          <Text style={styles.timerText}>{timeLeft}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  offerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  offerLeft: {
    marginRight: 12,
  },
  discountCircle: {
    width: 60,
    height: 60,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 16,
  },
  offerCenter: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  offerDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerCondition: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  offerRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 8,
  },
  couponTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
  },
  couponTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  autoTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  autoTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  timerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
});
