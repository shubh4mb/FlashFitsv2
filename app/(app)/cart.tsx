import React from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Platform,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { useGender } from '@/context/GenderContext';
import { GenderThemes } from '@/constants/theme';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import CartItem from '@/components/common/CartItem';
import { LinearGradient } from 'expo-linear-gradient';

export default function CartScreen() {
  const { cart, loading, clearCart } = useCart();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const items = cart?.items || [];
  
  // Totals Calculation
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const mrpTotal = items.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
  const discount = mrpTotal - subtotal;
  
  // Delivery Fees from unique merchants in cart
  const deliveryFees = cart?.deliveryDetails?.reduce((acc: number, d: any) => acc + (d.deliveryCharge || 0), 0) || 0;
  const totalAmount = subtotal + deliveryFees;

  if (loading && !cart) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <SafeAreaView style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>My Cart</ThemedText>
          <TouchableOpacity 
            onPress={clearCart}
            disabled={items.length === 0}
            style={styles.clearButton}
          >
            <Text style={[styles.clearText, { color: items.length > 0 ? '#EF4444' : '#CBD5E1' }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
              <Ionicons name="cart-outline" size={60} color={theme.primary} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>Your cart is empty</ThemedText>
            <ThemedText style={styles.emptyText}>
              Looks like you haven't added anything to your cart yet.
            </ThemedText>
            <TouchableOpacity 
              style={[styles.exploreButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/(tabs)' as any)}
            >
              <Text style={styles.exploreText}>Explore Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Items List */}
            <View style={styles.section}>
              {items.map((item) => (
                <CartItem key={item._id} item={item} />
              ))}
            </View>

            {/* Bill Details */}
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryTitle}>Bill Details</ThemedText>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Item Total (MRP)</Text>
                <Text style={styles.summaryValue}>₹{mrpTotal}</Text>
              </View>

              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>- ₹{discount}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>{deliveryFees > 0 ? `₹${deliveryFees}` : 'FREE'}</Text>
              </View>

              <View style={[styles.divider, { marginVertical: 12 }]} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{totalAmount}</Text>
              </View>
            </View>

            {/* Savings Badge */}
            {discount > 0 && (
              <View style={[styles.savingsBadge, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.savingsText, { color: '#10B981' }]}>
                  Yay! You're saving ₹{discount} on this order
                </Text>
              </View>
            )}
            
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom Action */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
            style={styles.gradient}
            pointerEvents="none"
          />
          <View style={styles.bottomContent}>
            <View>
              <Text style={styles.bottomTotal}>₹{totalAmount}</Text>
              <Text style={styles.totalItemsText}>{items.length} {items.length === 1 ? 'Item' : 'Items'}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkoutButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  clearButton: {
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
});
