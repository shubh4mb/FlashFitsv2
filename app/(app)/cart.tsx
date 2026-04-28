import AddressSelectorModal from '@/components/common/AddressSelectorModal';
import CartItem from '@/components/common/CartItem';
import Loader from '@/components/common/Loader';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { useGender } from '@/context/GenderContext';
import { useOffers } from '@/context/OffersContext';
import { useToast } from '@/context/AlertContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import logo from '@/assets/images/logo/logo.png';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import {
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CartTab = 'instant' | 'standard';

export default function CartScreen() {
  const { cart, loading, clearCart, deliveryTip, setDeliveryTip, moveToCourier, refreshCart, applyOffer, removeOffer } = useCart();
  const showToast = useToast();
  const { courierCart, loading: courierLoading, clearCart: clearCourierCart, refreshCart: refreshCourierCart, applyOfferCourier, removeOfferCourier } = useCourierCart();
  const { selectedGender } = useGender();
  const { selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const { tab } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<CartTab>((tab === 'courier' ? 'standard' : 'instant'));
  const [modalVisible, setModalVisible] = useState(false);
  const { computeBestOffers, couponCode } = useOffers();

  // Carousel state
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const merchantCarts = cart?.merchantCarts || [];
  const tbItems = cart?.items || [];
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScrollEndDrag = (event: any) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  // Refresh cart on focus
  useFocusEffect(
    useCallback(() => {
      refreshCart();
      refreshCourierCart();
    }, [refreshCart, refreshCourierCart])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshCart(), refreshCourierCart()]);
    setRefreshing(false);
  };

  const handleCheckout = (merchantId: string) => {
    const merchantCart = cart?.merchantCarts?.find(mc => mc.merchantId === merchantId);
    console.log(merchantCart, 'merchantCart');

    if (!merchantCart) return;

    if (!selectedAddress) {
      setModalVisible(true);
      return;
    }

    if (merchantCart.merchantDetails?.isOnline === false) {
      showToast({ message: "This merchant is currently offline", type: 'error' });
      return;
    }

    if (merchantCart.deliveryDetails?.isEligibleForTryBuy === false) {
      showToast({ message: "This store is too far for Try & Buy. Move items to courier or remove them.", type: 'warning' });
      return;
    }

    router.push({ pathname: '/checkout', params: { type: 'trybuy', merchantId } } as any);
  };

  const handleStandardCheckout = () => {
    if (!selectedAddress) {
      setModalVisible(true);
      return;
    }
    const hasOffline = courierItems.some((item: any) => item.merchantId?.isOnline === false);
    if (hasOffline) {
      showToast({ message: "Some merchants are offline", type: 'error' });
      return;
    }
    router.push({ pathname: '/checkout', params: { type: 'courier' } } as any);
  };

  const handleMoveToCourier = async (merchantId: string) => {
    try {
      await moveToCourier({ merchantId });
      await refreshCourierCart();
    } catch (error) {
      console.error("Move to courier failed:", error);
    }
  };

  const scrollToMerchant = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // Standard (Courier) Cart Data
  const courierItems = courierCart?.items || [];
  const courierTotals = courierCart?.totals;
  const courierAppliedOffers = courierCart?.appliedOffers;
  const courierTotal = courierTotals?.totalPayable || courierItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) + (courierItems.length > 0 ? 40 : 0);

  const currentMerchantCart = merchantCarts[activeIndex];


  if ((loading || courierLoading) && tbItems.length === 0 && courierItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Loader size={60} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>Shopping Cart</ThemedText>
          <TouchableOpacity
            onPress={activeTab === 'instant' ? clearCart : clearCourierCart}
            disabled={(activeTab === 'instant' ? merchantCarts : courierItems).length === 0}
          >
            <Text style={[styles.clearText, { color: (activeTab === 'instant' ? merchantCarts : courierItems).length > 0 ? '#EF4444' : '#CBD5E1' }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'instant' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('instant')}
          >
            <Ionicons name="flash" size={16} color={activeTab === 'instant' ? theme.primary : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'instant' && { color: theme.primary, fontWeight: '800' }]}>Try & Buy</Text>
            {merchantCarts.length > 0 && <View style={[styles.badge, { backgroundColor: activeTab === 'instant' ? theme.primary : '#CBD5E1' }]}><Text style={styles.badgeText}>{merchantCarts.length}</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'standard' && { ...styles.activeTab, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('standard')}
          >
            <Ionicons name="cart" size={18} color={activeTab === 'standard' ? theme.primary : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'standard' && { color: theme.primary, fontWeight: '800' }]}>Cart</Text>
            {courierItems.length > 0 && <View style={[styles.badge, { backgroundColor: activeTab === 'standard' ? theme.primary : '#CBD5E1' }]}><Text style={styles.badgeText}>{courierItems.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Merchant Hub (Logo Navigation) - Only for Instant Cart */}
        {activeTab === 'instant' && merchantCarts.length > 1 && (
          <View style={styles.merchantHub}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.merchantHubContent,
                merchantCarts.length <= 4 && { justifyContent: 'center', flex: 1 }
              ]}
            >
              {merchantCarts.map((mc, index) => (
                <TouchableOpacity
                  key={mc.merchantId}
                  onPress={() => scrollToMerchant(index)}
                  style={styles.hubWrapper}
                >
                  <View style={[
                    styles.hubLogoContainer,
                    activeIndex !== index && { opacity: 0.4, backgroundColor: 'transparent' }
                  ]}>
                    <Image source={{ uri: mc.merchantDetails?.logo?.url || mc.merchantDetails?.logo }} style={styles.hubLogo} contentFit="contain" />
                  </View>
                  {activeIndex === index && <View style={styles.hubActiveLine} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>


      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'instant' ? (
          merchantCarts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="flash-outline" size={60} color={theme.primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>Your Instant Cart is empty</ThemedText>
              <Text style={styles.emptyDesc}>Try & Buy isn't just fast, it's instant. Add items to try them at home now!</Text>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)' as any)}>
                <Text style={styles.exploreText}>Browse Shops</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={merchantCarts}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.merchantId}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (index !== activeIndex) {
                  setActiveIndex(index);
                }
              }}
              renderItem={({ item: mc }) => {
                const mTotals = mc.totals;
                const mOffers = mc.appliedOffers;
                const isOffline = mc.merchantDetails?.isOnline === false;
                const isEligible = mc.deliveryDetails?.isEligibleForTryBuy !== false;

                return (
                  <View style={{ width: SCREEN_WIDTH }}>
                    <PremiumRefreshWrapper
                      scrollY={scrollY}
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    >
                      <Animated.ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.slideContent}
                        scrollEventThrottle={16}
                      >
                      {/* Merchant Header Branding */}
                      <TouchableOpacity 
                        style={styles.brandingHeader}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/merchant/${mc.merchantId}` as any)}
                      >
                        <View style={styles.brandingInfo}>
                          <Text style={styles.brandingShopName}>{mc.merchantDetails?.shopName}</Text>
                          <View style={styles.brandingStatusRow}>
                            {isOffline ? (
                              <View style={{ gap: 4, alignItems: 'flex-start' }}>
                                <Text style={[styles.statusTag, { color: '#EF4444', backgroundColor: '#FEE2E2' }]}>Shop Closed</Text>
                                <Text style={[styles.statusTag, { color: '#EF4444', backgroundColor: '#ffffffff', fontSize: 8 }]}>Reopens tomorrow at 9 AM</Text>
                              </View>
                            ) : !isEligible ? (
                              <Text style={[styles.statusTag, { color: '#F59E0B', backgroundColor: '#FEF3C7' }]}>Too Far</Text>
                            ) : (
                              <Text style={[styles.statusTag, { color: '#10B981', backgroundColor: '#DCFCE7' }]}>Try & Buy</Text>
                            )}
                            {!isOffline && (
                              <Text style={styles.brandingMins}>Delivery in {mc.deliveryDetails?.estimatedTime || '25-30'} mins</Text>
                            )}
                          </View>
                        </View>
                        <Image source={{ uri: mc.merchantDetails?.logo?.url || mc.merchantDetails?.logo }} style={styles.brandingLogo} contentFit="contain" />
                      </TouchableOpacity>

                      {!isEligible && !isOffline && (
                        <View style={styles.warningBanner}>
                          <Ionicons name="warning" size={20} color="#B45309" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.warningText}>This store is too far for Try & Buy. Move items to standard cart to continue.</Text>
                            <TouchableOpacity style={styles.warningAction} onPress={() => handleMoveToCourier(mc.merchantId)}>
                              <Text style={styles.warningActionText}>Move to Standard Cart</Text>
                              <Feather name="arrow-right" size={14} color="#0F172A" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Items */}
                      <View style={styles.itemsContainer}>
                        {mc.items.map((item) => (
                          <CartItem key={item._id} item={item} />
                        ))}
                      </View>

                      {/* Offers Section */}
                      {mOffers?.availableOffers?.length > 0 && (
                        <View style={{ backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0F172A' }}>Offers & Benefits</Text>
                          {mOffers.availableOffers.map((offer: any) => {
                            const isApplied = mOffers.appliedOffers?.some((o: any) => o._id === offer._id || o.offerId === offer._id);
                            return (
                              <View key={offer._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
                                <View style={{ flex: 1, paddingRight: 16 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>{offer.couponCode || offer.title}</Text>
                                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{offer.description || `Get ₹${offer.discountAmount} off`}</Text>
                                </View>
                                {isApplied ? (
                                  <TouchableOpacity onPress={() => removeOffer(offer._id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Remove</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <TouchableOpacity onPress={() => applyOffer(offer._id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: theme.primary + '10', borderWidth: 1, borderColor: theme.primary }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>Apply</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Bill Summary */}
                      <View style={styles.premiumBill}>
                        <Text style={styles.billTitle}>Bill Summary</Text>
                         <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{mTotals?.mrpTotal}</Text></View>
                         {mTotals?.discount > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Shop Discount</Text><Text style={[styles.billValue, { color: '#10B981' }]}>- ₹{mTotals?.discount}</Text></View>}
                         {mOffers?.totalDiscount > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Offer Applied</Text><Text style={[styles.billValue, { color: theme.primary, fontWeight: '700' }]}>- ₹{mOffers.totalDiscount}</Text></View>}
                         
                         {(mTotals?.discount > 0 || mOffers?.totalDiscount > 0) && (
                           <View style={[styles.billRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#F1F5F9' }]}>
                             <Text style={[styles.billLabel, { fontWeight: '700', color: '#0F172A' }]}>Total after discounts</Text>
                             <Text style={[styles.billValue, { fontWeight: '800' }]}>₹{((mTotals?.subtotal || 0) - (mOffers?.totalDiscount || 0)).toFixed(0)}</Text>
                           </View>
                         )}

                        <View style={styles.billDivider} />

                        <View style={styles.payLaterSection}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.payLaterText}>Keep what you love, pay only for those after trying, return the rest (Max: ₹{((mTotals?.subtotal || 0) - (mOffers?.totalDiscount || 0)).toFixed(0)})</Text>
                        </View>

                        <Text style={styles.upfrontTitle}>Payable Now</Text>
                        <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Charge (Partial refundable)</Text><Text style={styles.billValue}>₹{mOffers?.freeDelivery ? 0 : (mTotals?.totalDeliveryCharge + mTotals?.totalReturnCharge)}</Text></View>
                        {mTotals?.totalReturnCharge > 0 && !mOffers?.freeDelivery && (
                          <Text style={styles.billSubText}>₹{mTotals.totalReturnCharge} will be refunded if nothing is returned</Text>
                        )}
                        <View style={styles.billRow}><Text style={styles.billLabel}>Platform GST</Text><Text style={styles.billValue}>₹{((mTotals?.serviceGST || 0) + deliveryTip * 0.18).toFixed(2)}</Text></View>
                        {deliveryTip > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Rider Tip</Text><Text style={styles.billValue}>₹{deliveryTip}</Text></View>}

                        <View style={[styles.billRow, { marginTop: 12 }]}>
                          <Text style={styles.grandTotalLabel}>Total Payable Now</Text>
                          <Text style={[styles.grandTotalValue, { color: theme.primary }]}>₹{Number(mTotals?.totalUpfrontPayable + deliveryTip).toFixed(2)}</Text>
                        </View>
                      </View>

                      {/* Tip Section */}
                      <View style={styles.slideTipSection}>
                        <Text style={styles.tipSectionTitle}>Tip your Delivery Partner</Text>
                        <View style={styles.tipRow}>
                          {[10, 20, 50].map((amount) => (
                            <TouchableOpacity
                              key={amount}
                              style={[styles.tipPill, deliveryTip === amount && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}
                              onPress={() => setDeliveryTip(deliveryTip === amount ? 0 : amount)}
                            >
                              <Text style={[styles.tipPillText, deliveryTip === amount && { color: theme.primary }]}>₹{amount}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      
                      <View style={styles.footer}>
                        <Image source={logo} style={styles.footerLogo} blurRadius={3} contentFit="contain" />
                        <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                        <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
                      </View>
                      </Animated.ScrollView>
                    </PremiumRefreshWrapper>
                  </View>
                );
              }}
            />
          )
        ) : (
          /* Standard Cart Section */
          courierItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="cart-outline" size={60} color={theme.primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>Your Cart is empty</ThemedText>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(tabs)/explore' as any)}>
                <Text style={styles.exploreText}>Explore Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <PremiumRefreshWrapper
              scrollY={scrollY}
              refreshing={refreshing}
              onRefresh={onRefresh}
            >
              <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.standardContent}
                scrollEventThrottle={16}
              >
              <View style={styles.standardBanner}>
                <MaterialCommunityIcons name="truck-delivery" size={20} color="#7C3AED" />
                <Text style={styles.standardBannerText}>Standard delivery across India • Flat ₹40</Text>
              </View>

              <View style={styles.itemsContainer}>
                {courierItems.map((item) => (
                  <CartItem key={item._id} item={item} isCourier={true} />
                ))}
              </View>

              {/* Courier Offers Section */}
              {courierAppliedOffers?.availableOffers?.length > 0 && (
                <View style={{ backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 12, marginHorizontal: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0F172A' }}>Offers & Benefits</Text>
                  {courierAppliedOffers.availableOffers.map((offer: any) => {
                    const isApplied = courierAppliedOffers.appliedOffers?.some((o: any) => o._id === offer._id || o.offerId === offer._id);
                    return (
                      <View key={offer._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>{offer.couponCode || offer.title}</Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{offer.description || `Get ₹${offer.discountAmount} off`}</Text>
                        </View>
                        {isApplied ? (
                          <TouchableOpacity onPress={() => removeOfferCourier(offer._id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Remove</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => applyOfferCourier(offer._id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: theme.primary + '10', borderWidth: 1, borderColor: theme.primary }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>Apply</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.summaryCard}>
                <Text style={styles.billTitle}>Order Summary</Text>
                <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{courierTotals?.mrpTotal || 0}</Text></View>
                {((courierTotals?.discount || 0) - (courierAppliedOffers?.totalDiscount || 0)) > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Shop Discount</Text><Text style={[styles.billValue, { color: '#10B981' }]}>- ₹{(courierTotals?.discount || 0) - (courierAppliedOffers?.totalDiscount || 0)}</Text></View>}
                {courierAppliedOffers?.totalDiscount > 0 && <View style={styles.billRow}><Text style={[styles.billLabel, { color: theme.primary, fontWeight: '700' }]}>Offer Applied</Text><Text style={[styles.billValue, { color: theme.primary, fontWeight: '700' }]}>- ₹{courierAppliedOffers.totalDiscount}</Text></View>}
                <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Fee</Text><Text style={styles.billValue}>₹{courierTotals?.courierDeliveryCharge || 40}</Text></View>
                <View style={styles.billDivider} />
                <View style={styles.billRow}>
                  <Text style={styles.grandTotalLabel}>Total Amount</Text>
                  <Text style={[styles.grandTotalValue, { color: theme.primary }]}>₹{courierTotal}</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Image source={logo} style={styles.footerLogo} blurRadius={3} contentFit="contain" />
                <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
              </View>
            </Animated.ScrollView>
          </PremiumRefreshWrapper>
          )
        )}
      </View>

      {/* Pinned Checkout Button */}
      {(activeTab === 'instant' ? merchantCarts.length > 0 : courierItems.length > 0) && (
        <View style={[styles.pinnedContainer, { paddingBottom: insets.bottom + 16 }]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']} style={styles.pinnedGradient} />

          <View style={styles.pinnedInner}>
            <View>
              <Text style={styles.pinnedPrice}>
                ₹{activeTab === 'instant'
                  ? Number((currentMerchantCart?.totals?.totalUpfrontPayable || 0) + deliveryTip).toFixed(0)
                  : courierTotal}
              </Text>
              <Text style={styles.pinnedSub}>{activeTab === 'instant' ? 'Payable Now' : 'Total Payable'}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                { backgroundColor: theme.primary },
                activeTab === 'instant' && (currentMerchantCart?.merchantDetails?.isOnline === false || currentMerchantCart?.deliveryDetails?.isEligibleForTryBuy === false) && { backgroundColor: '#CBD5E1' }
              ]}
              disabled={activeTab === 'instant' && (currentMerchantCart?.merchantDetails?.isOnline === false || currentMerchantCart?.deliveryDetails?.isEligibleForTryBuy === false)}
              onPress={() => activeTab === 'instant' ? handleCheckout(currentMerchantCart.merchantId) : handleStandardCheckout()}
            >
              <Text style={styles.checkoutBtnText}>
                {activeTab === 'instant' ? 'Proceed to Try & Buy' : 'Checkout Now'}
              </Text>
              <Feather name="arrow-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <AddressSelectorModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  clearText: { fontSize: 14, fontWeight: '700' },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomWidth: 3 },
  tabText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  // Merchant Hub
  merchantHub: { backgroundColor: '#fff', paddingBottom: 12 },
  merchantHubContent: { paddingHorizontal: 20, gap: 16 },
  hubWrapper: { alignItems: 'center', justifyContent: 'center', height: 60 },
  hubLogoContainer: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  hubLogo: { width: '80%', height: '80%' },
  hubActiveLine: { position: 'absolute', bottom: 0, width: 28, height: 3, borderRadius: 2, backgroundColor: '#000' },

  slideContent: { padding: 20, paddingBottom: 140 },
  brandingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandingInfo: { flex: 1 },
  brandingShopName: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  brandingStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusTag: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  brandingMins: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  brandingLogo: { width: 60, height: 60, borderRadius: 12 },

  warningBanner: { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 14, borderRadius: 16, gap: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FEF3C7' },
  warningText: { fontSize: 13, color: '#92400E', fontWeight: '500', lineHeight: 18 },
  warningAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  warningActionText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  itemsContainer: { gap: 12, marginBottom: 24 },

  premiumBill: { backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  billTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 14, color: '#64748B' },
  billValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  billSubText: { fontSize: 11, color: '#64748B', marginTop: -6, marginBottom: 10, fontWeight: '500', marginLeft: 0 },
  billDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  payLaterSection: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, marginBottom: 20 },
  payLaterText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  upfrontTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  grandTotalLabel: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  grandTotalValue: { fontSize: 20, fontWeight: '900' },

  slideTipSection: { marginTop: 20, padding: 20, backgroundColor: '#fff', borderRadius: 24 },
  tipSectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  tipRow: { flexDirection: 'row', gap: 12 },
  tipPill: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tipPillText: { fontSize: 14, fontWeight: '700', color: '#64748B' },

  // Standard Cart
  standardContent: { padding: 20, paddingBottom: 140 },
  standardBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F3E8FF', padding: 14, borderRadius: 16, marginBottom: 20 },
  standardBannerText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20 },

  // Pinned Bottom
  pinnedContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 10 },
  pinnedGradient: { position: 'absolute', top: -30, left: 0, right: 0, height: 30 },
  pinnedInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinnedPrice: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  pinnedSub: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 20 },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  exploreButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  exploreText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  footer: {
    alignItems: 'center',
    marginTop: 28,
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
