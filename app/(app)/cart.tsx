import AddressSelectorModal from '@/components/common/AddressSelectorModal';
import CartItem from '@/components/common/CartItem';
import Loader from '@/components/common/Loader';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { GenderThemes } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { useGender } from '@/context/GenderContext';
import { useOffers } from '@/context/OffersContext';
import CouponInput from '@/components/common/CouponInput';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CartTab = 'trybuy' | 'courier';

export default function CartScreen() {
  const { cart, loading, clearCart, updateQuantity, removeItem, deliveryTip, setDeliveryTip, moveToCourier } = useCart();
  const { courierCart, loading: courierLoading, clearCart: clearCourierCart, removeItem: removeCourierItem, refreshCart: refreshCourierCart } = useCourierCart();
  const { selectedGender } = useGender();
  const { selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const { tab } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<CartTab>((tab as CartTab) || 'trybuy');
  const [modalVisible, setModalVisible] = useState(false);
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const feeBreakdownAnim = useRef(new Animated.Value(0)).current;
  const { appliedOffers, computeBestOffers, couponCode } = useOffers();

  const toggleBreakdown = () => {
    const toValue = isBreakdownExpanded ? 0 : 1;
    setIsBreakdownExpanded(!isBreakdownExpanded);
    Animated.timing(feeBreakdownAnim, {
      toValue,
      duration: 350,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  const handleCheckout = () => {
    if (!selectedAddress) {
      setModalVisible(true);
    } else if (hasIneligibleItems) {
      alert("Some items in your cart are not eligible for Try & Buy. Please move them to courier or remove them to proceed.");
    } else {
      router.push({ pathname: '/checkout', params: { type: activeTab } } as any);
    }
  };

  const handleMoveToCourier = async (merchantId: string) => {
    try {
      await moveToCourier({ merchantId });
      await refreshCourierCart();
    } catch (error) {
      console.error("Move to courier failed:", error);
    }
  };

  // === T&B Cart (Try & Buy) ===
  const tbItems = cart?.items || [];
  const tbTotals = cart?.totals;
  const tbSubtotal = tbTotals?.subtotal || tbItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tbMrpTotal = tbTotals?.mrpTotal || tbItems.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
  const tbDiscount = tbTotals?.discount || (tbMrpTotal - tbSubtotal);
  const tbDeliveryFees = tbTotals?.totalDeliveryCharge || cart?.deliveryDetails?.reduce((acc: number, d: any) => acc + (d.deliveryCharge || 0), 0) || 0;
  const tbTotal = tbTotals?.finalTotal || (tbSubtotal + tbDeliveryFees);

  const tbByMerchant = tbItems.reduce((acc: Record<string, any[]>, item) => {
    const merchantId = item.merchantId?._id || item.merchantId || 'unknown';
    if (!acc[merchantId]) acc[merchantId] = [];
    acc[merchantId].push(item);
    return acc;
  }, {});
  const merchantGroups = Object.entries(tbByMerchant);

  const hasIneligibleItems = cart?.deliveryDetails?.some((d: any) => d.isEligibleForTryBuy === false);

  // === Courier Cart ===
  const courierItems = courierCart?.items || [];
  const courierTotals = courierCart?.totals;
  const courierSubtotal = courierTotals?.subtotal || courierItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const courierMrpTotal = courierTotals?.mrpTotal || courierItems.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
  const courierDiscount = courierTotals?.discount || (courierMrpTotal - courierSubtotal);
  const courierDelivery = courierTotals?.courierDeliveryCharge || (courierItems.length > 0 ? 40 : 0);
  const courierTotal = courierTotals?.totalPayable || (courierSubtotal + courierDelivery);

  // Auto-compute best offers when cart changes
  const cartContext = {
    items: activeTab === 'trybuy' ? tbItems : courierItems,
    subtotal: activeTab === 'trybuy' ? tbSubtotal : courierSubtotal,
    merchantTotals: {},
  };

  useEffect(() => {
    const items = activeTab === 'trybuy' ? (cart?.items || []) : (courierCart?.items || []);
    const sub = items.reduce((a: number, i: any) => a + ((i.price || 0) * (i.quantity || 1)), 0);
    const merchantTotals: Record<string, number> = {};
    items.forEach((item: any) => {
      const mid = item.merchantId?._id || item.merchantId || 'unknown';
      merchantTotals[mid] = (merchantTotals[mid] || 0) + ((item.price || 0) * (item.quantity || 1));
    });
    if (items.length > 0 && sub > 0) {
      computeBestOffers({ items, subtotal: sub, merchantTotals }, couponCode || undefined);
    }
  }, [cart?.items?.length, courierCart?.items?.length, activeTab]);

  const tbCount = tbItems.length;
  const courierCount = courierItems.length;

  const isLoading = activeTab === 'trybuy' ? loading : courierLoading;
  const currentItems = activeTab === 'trybuy' ? tbItems : courierItems;

  if (isLoading && currentItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Loader size={60} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#0F172A" />
            </TouchableOpacity>
            <ThemedText type="subtitle" style={styles.headerTitle}>My Cart</ThemedText>
          </View>

          <TouchableOpacity
            onPress={activeTab === 'trybuy' ? clearCart : clearCourierCart}
            disabled={currentItems.length === 0}
            style={styles.clearButton}
          >
            <Text style={[styles.clearText, { color: currentItems.length > 0 ? '#EF4444' : '#CBD5E1' }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trybuy' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('trybuy')}
          >
            <Ionicons name={activeTab === 'trybuy' ? 'home' : 'home-outline'} size={16} color={activeTab === 'trybuy' ? theme.primary : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'trybuy' && { color: theme.primary, fontWeight: '800' }]}>Try & Buy</Text>
            {tbCount > 0 && <View style={[styles.badge, { backgroundColor: activeTab === 'trybuy' ? theme.primary : '#CBD5E1' }]}><Text style={styles.badgeText}>{tbCount}</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'courier' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('courier')}
          >
            <Ionicons name={activeTab === 'courier' ? 'cube' : 'cube-outline'} size={16} color={activeTab === 'courier' ? theme.primary : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'courier' && { color: theme.primary, fontWeight: '800' }]}>Explore</Text>
            {courierCount > 0 && <View style={[styles.badge, { backgroundColor: activeTab === 'courier' ? theme.primary : '#CBD5E1' }]}><Text style={styles.badgeText}>{courierCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'trybuy' ? (
          tbItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="cart-outline" size={60} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>Your Try & Buy cart is empty</ThemedText>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)' as any)}>
                <Text style={styles.exploreText}>Explore Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.deliveryInfoWrapper}>
                <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.deliveryInfo} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}>
                  <View style={styles.deliveryHeader}>
                    <View style={styles.deliveryLeftSection}>
                      <View style={styles.deliveryTimeContainer}>
                        <Text style={styles.deliveryMainText}>Delivery in</Text>
                        <Text style={styles.deliveryTimeText}>2 hours</Text>
                      </View>
                      <View style={styles.superFastBadge}>
                        <MaterialIcons name="bolt" size={12} color="#00B386" />
                        <Text style={styles.badgeText}>Superfast</Text>
                      </View>
                    </View>
                    <View style={styles.deliveryRightSection}>
                      <Text style={styles.itemSummaryText}>{tbCount} items</Text>
                      <Text style={styles.totalAmountText}>₹{tbSubtotal}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {merchantGroups.map(([merchantId, items]) => {
                const deliveryInfo = cart?.deliveryDetails?.find((d: any) => d.merchantId === merchantId);
                const isEligible = deliveryInfo?.isEligibleForTryBuy !== false;

                return (
                  <View key={merchantId} style={styles.merchantGroup}>
                    <View style={styles.merchantHeader}>
                      <MaterialCommunityIcons name="storefront-outline" size={20} color="#64748B" />
                      <Text style={styles.merchantName}>{items[0]?.merchantId?.shopName || 'Store'}</Text>
                      {!isEligible && (
                        <View style={styles.ineligibleBadge}>
                          <Text style={styles.ineligibleBadgeText}>Too Far</Text>
                        </View>
                      )}
                    </View>

                    {!isEligible && (
                      <View style={styles.ineligibleWarning}>
                        <Ionicons name="warning" size={18} color="#B45309" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ineligibleText}>
                            This store is beyond 7km. Try & Buy is not available for this location.
                          </Text>
                          <View style={styles.ineligibleActions}>
                            <TouchableOpacity
                              style={styles.moveBtn}
                              onPress={() => handleMoveToCourier(merchantId)}
                            >
                              <Text style={styles.moveBtnText}>Move to Courier</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.discardBtn}
                              onPress={() => clearCart()} // Or implement removeAllForMerchant
                            >
                              <Text style={styles.discardBtnText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {items.map((item) => (
                      <CartItem key={item._id} item={item} />
                    ))}
                  </View>
                );
              })}

              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryTitle}>Try & Buy Summary</ThemedText>

                {/* --- PRODUCTS TOTAL (PAY LATER) --- */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items Total (MRP)</Text>
                  <Text style={styles.summaryValue}>₹{tbMrpTotal}</Text>
                </View>
                {tbDiscount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Item Discount</Text>
                    <Text style={[styles.summaryValue, { color: '#10B981' }]}>- ₹{tbDiscount}</Text>
                  </View>
                )}
                {appliedOffers && (appliedOffers.totalDiscount > 0 || appliedOffers.freeDelivery) && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#16A34A' }]}>Offer Savings</Text>
                    <Text style={[styles.summaryValue, { color: '#16A34A', fontWeight: '800' }]}>
                      {appliedOffers.totalDiscount > 0 ? `- ₹${appliedOffers.totalDiscount}` : ''}
                      {appliedOffers.freeDelivery ? ' (Free Delivery)' : ''}
                    </Text>
                  </View>
                )}
                <View style={[styles.divider, { marginVertical: 8 }]} />
                <View style={[styles.summaryRow, { marginBottom: 16 }]}>
                  <Text style={[styles.totalLabel, { fontSize: 13, color: '#64748B' }]}>Pay Later (For items you decide to keep)</Text>
                  <Text style={[styles.totalValue, { fontSize: 13, color: '#64748B' }]}>₹{tbSubtotal - (appliedOffers?.totalDiscount || 0)}</Text>
                </View>

                {/* --- DELIVERY TOTAL (PAY NOW) --- */}
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 8 }}>Pay Upfront Now</Text>
                {!appliedOffers?.freeDelivery && (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Delivery Fee</Text>
                      <Text style={styles.summaryValue}>₹{tbDeliveryFees}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Return Handling (Refundable)</Text>
                      <Text style={styles.summaryValue}>₹{tbTotals?.totalReturnCharge || 0}</Text>
                    </View>
                  </>
                )}
                {deliveryTip > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Tip</Text>
                    <Text style={styles.summaryValue}>₹{deliveryTip}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service GST (18%)</Text>
                  <Text style={styles.summaryValue}>₹{tbTotals?.serviceGST || 0}</Text>
                </View>
                <View style={[styles.divider, { marginVertical: 12 }]} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total Upfront Payable</Text>
                  <Text style={styles.totalValue}>₹{Number((tbTotals?.totalUpfrontPayable || 0) + deliveryTip).toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Add a Tip for Rider</Text>
                <View style={styles.tipContainer}>
                  {[10, 20, 50].map((amount) => (
                    <TouchableOpacity key={amount} style={[styles.tipButton, deliveryTip === amount && styles.activeTipButton]} onPress={() => setDeliveryTip(deliveryTip === amount ? 0 : amount)}>
                      <Text style={[styles.tipButtonText, deliveryTip === amount && styles.activeTipButtonText]}>₹{amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.upfrontNotice}>* Only Upfront Cart Fee (Delivery, Return & Tip) will be charged now.</Text>
              </View>

              <CouponInput cartContext={cartContext} themeColor={theme.primary} />

              <View style={{ height: 200 }} />
            </>
          )
        ) : (
          courierItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="cube-outline" size={60} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>Your Explore cart is empty</ThemedText>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)/explore' as any)}>
                <Text style={styles.exploreText}>Browse Explore Collection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.courierInfoBanner}>
                <Ionicons name="cube" size={16} color="#7C3AED" />
                <Text style={styles.courierInfoText}>Flat ₹40 delivery • Shipped by merchant</Text>
              </View>
              <View style={styles.section}>
                {courierItems.map((item) => (
                  <CartItem key={item._id} item={item} isCourier={true} />
                ))}
              </View>
              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryTitle}>Bill Details</ThemedText>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Item Total (MRP)</Text><Text style={styles.summaryValue}>₹{courierMrpTotal}</Text></View>
                {courierDiscount > 0 && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Discount</Text><Text style={[styles.summaryValue, { color: '#10B981' }]}>- ₹{courierDiscount}</Text></View>}
                {appliedOffers && (appliedOffers.totalDiscount > 0 || appliedOffers.freeDelivery) && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#16A34A' }]}>Offer Savings</Text>
                    <Text style={[styles.summaryValue, { color: '#16A34A', fontWeight: '800' }]}>
                      {appliedOffers.totalDiscount > 0 ? `- ₹${appliedOffers.totalDiscount}` : ''}
                      {appliedOffers.freeDelivery ? ' (Free Delivery)' : ''}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery Fee</Text><Text style={styles.summaryValue}>₹{courierDelivery}</Text></View>
                <View style={[styles.divider, { marginVertical: 12 }]} />
                <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total Payable</Text><Text style={styles.totalValue}>₹{courierTotal - (appliedOffers?.totalDiscount || 0)}</Text></View>
              </View>

              <CouponInput cartContext={cartContext} themeColor={theme.primary} />

              <View style={{ height: 140 }} />
            </>
          )
        )}
      </ScrollView>

      {(activeTab === 'trybuy' ? tbItems.length > 0 : courierItems.length > 0) && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']} style={styles.gradient} />
          {activeTab === 'trybuy' && (
            <View style={styles.breakdownContainer}>
              <TouchableOpacity onPress={toggleBreakdown} style={styles.breakdownHeader} activeOpacity={0.7}>
                <View style={styles.breakdownHeaderLeft}>
                  <View style={styles.upfrontIconContainer}><MaterialIcons name="local-shipping" size={14} color={theme.primary} /></View>
                  <Text style={styles.upfrontHeaderText}>Upfront Cart Fee | ₹{Number(tbTotals?.totalUpfrontPayable || 0).toFixed(2)}</Text>
                </View>
                <MaterialIcons name={isBreakdownExpanded ? "keyboard-arrow-down" : "keyboard-arrow-up"} size={20} color="#64748B" />
              </TouchableOpacity>
              <Animated.View style={{ height: feeBreakdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }), overflow: 'hidden' }}>
                <View style={styles.breakdownContent}>
                  <View style={styles.breakdownRow}><Text style={[styles.breakdownLabel, { fontWeight: '700', color: '#0F172A' }]}>Items Total</Text><Text style={[styles.breakdownValue, { fontWeight: '700' }]}>₹{Number(tbSubtotal).toFixed(2)}</Text></View>
                  {!appliedOffers?.freeDelivery && (
                    <>
                      <View style={[styles.breakdownRow, { marginTop: 8, borderTopWidth: 0.5, borderTopColor: '#E2E8F0', paddingTop: 8 }]}><Text style={styles.breakdownLabel}>Delivery Charge</Text><Text style={styles.breakdownValue}>₹{Number(tbDeliveryFees).toFixed(2)}</Text></View>
                      <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Return Charge (Refundable)</Text><Text style={styles.breakdownValue}>₹{Number(tbTotals?.totalReturnCharge || 0).toFixed(2)}</Text></View>
                    </>
                  )}
                  <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Delivery Tip</Text><Text style={styles.breakdownValue}>₹{Number(deliveryTip).toFixed(2)}</Text></View>
                  <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Service GST (18%)</Text><Text style={styles.breakdownValue}>₹{Number(tbTotals?.serviceGST || 0).toFixed(2)}</Text></View>
                  <View style={[styles.breakdownRow, { marginTop: 4 }]}><Text style={[styles.breakdownLabel, { color: '#10B981', fontWeight: '600' }]}>Total Upfront Payable</Text><Text style={[styles.breakdownValue, { color: '#10B981' }]}>₹{Number(tbTotals?.totalUpfrontPayable || 0).toFixed(2)}</Text></View>
                </View>
              </Animated.View>
            </View>
          )}
          <View style={styles.bottomContent}>
            <View>
              <Text style={styles.bottomTotal}>
                ₹{activeTab === 'trybuy' ? Number((tbTotals?.totalUpfrontPayable || 0) + deliveryTip).toFixed(2) : courierTotal - (appliedOffers?.totalDiscount || 0)}
              </Text>
              <Text style={styles.totalItemsText}>
                {currentItems.length} {currentItems.length === 1 ? 'Item' : 'Items'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: (selectedAddress && !hasIneligibleItems) ? theme.primary : (hasIneligibleItems ? '#CBD5E1' : '#F59E0B') }
              ]}
              onPress={handleCheckout}
              disabled={activeTab === 'trybuy' && hasIneligibleItems}
            >
              {selectedAddress ? (
                <>
                  <Text style={styles.checkoutText}>
                    {activeTab === 'trybuy' ? 'Proceed to Try' : 'Checkout'}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </>
              ) : (
                <>
                  <Ionicons name="location-outline" size={18} color="#FFF" />
                  <Text style={styles.checkoutText}>Confirm Address</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <AddressSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36, // Slighly smaller
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearButton: {
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },

  // Merchant grouping for T&B
  merchantGroup: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  tbBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tbBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Replicated layout styles
  deliveryInfoWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  deliveryInfo: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden'
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  deliveryLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  deliveryTimeContainer: {
    marginRight: 12
  },
  deliveryMainText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  deliveryTimeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  superFastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F8F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  deliveryRightSection: {
    alignItems: 'flex-end'
  },
  itemSummaryText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500'
  },
  totalAmountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },

  tipSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tipButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  activeTipButton: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  tipButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  activeTipButtonText: {
    color: '#10B981',
    fontWeight: '700',
  },
  upfrontNotice: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
  },

  breakdownContainer: {
    paddingBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  breakdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upfrontIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upfrontHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownContent: {
    paddingBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Courier Info
  courierInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  courierInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },

  // Bill
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
  },


  // Bottom
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  gradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  totalItemsText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  exploreButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 16,
  },
  exploreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ineligibleBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ineligibleBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ineligibleWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  ineligibleText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 18,
  },
  ineligibleActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  moveBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  discardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  discardBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});
