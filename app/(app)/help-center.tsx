import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { GenderThemes, Typography } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import axiosInstance from '@/api/axiosConfig';
import * as SecureStore from 'expo-secure-store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WHATSAPP_NUMBER = '918383823813';

const SUPPORT_CATEGORIES = [
  { key: 'order_delayed', label: 'Order Delayed', icon: 'time-outline', emoji: '⏰' },
  { key: 'return_issue', label: 'Return Issue', icon: 'arrow-undo-outline', emoji: '🔄' },
  { key: 'try_buy_issue', label: 'Try & Buy Issue', icon: 'shirt-outline', emoji: '👔' },
  { key: 'refund_issue', label: 'Refund Issue', icon: 'wallet-outline', emoji: '💰' },
  { key: 'wrong_product', label: 'Wrong Product', icon: 'alert-circle-outline', emoji: '⚠️' },
  { key: 'size_exchange', label: 'Size Exchange', icon: 'resize-outline', emoji: '📐' },
  { key: 'merchant_issue', label: 'Merchant Issue', icon: 'storefront-outline', emoji: '🏪' },
  { key: 'report_bug', label: 'Report a Bug', icon: 'bug-outline', emoji: '🐞' },
];

const FAQ_DATA = [
  {
    question: 'How does Try & Buy work?',
    answer:
      'Try & Buy allows customers to order fashion products and try them at the time of delivery before confirming the purchase. A Delivery charge  may be collected during checkout. Customers can keep the products they like and return the remaining items immediately to the delivery partner during the same visit. Final billing will be adjusted based on the items retained by the customer.',
  },
  {
    question: 'What is the refund policy?',
    answer:
      'For Try & Buy orders, products once selected and confirmed by the customer during the trial session are considered final and are not eligible for return or refund, except in cases of damaged or incorrect items. This policy is implemented to prevent misuse and fraudulent activities. For courier-based orders, eligible returns can be requested as per the retailer’s return policy, and approved refunds will be credited to the original payment method after successful verification.'
  },
  {
    question: 'What is the return policy?',
    answer:
      'For Try & Buy orders, unwanted items must be returned immediately during the delivery trial session. Once the delivery process is completed and accepted by the customer, returns may not be applicable unless the item received is damaged, defective, or incorrect. For courier-based retailer orders, return eligibility depends on the individual retailer’s policy.',
  },
  {
    question: 'How does delivery work?',
    answer:
      'FlashFits supports both instant Try & Buy delivery and courier-based retailer shipping. For nearby Try & Buy orders, delivery partners collect products from local stores and deliver them directly to customers for trial at doorstep. For distant retailer orders, products are packed and shipped directly by the respective retailer through courier services. Delivery timelines may vary based on seller location and courier availability.',
  },
  {
    question: 'Who manages courier-based orders?',
    answer:
      'Courier-based orders placed from distant retailers are directly managed and fulfilled by the respective retail store. The retailer is responsible for product availability, packaging, dispatch, shipping updates, and applicable return handling. FlashFits acts as a platform connecting customers with partnered retailers.',
  },
  {
    question: 'How are retailers verified on FlashFits?',
    answer:
      'Retailers partnered with FlashFits undergo a verification process that may include business validation, identity verification, store checks, and compliance review before onboarding. FlashFits aims to work with trusted retail partners to provide customers with a reliable shopping experience.',
  },
  {
    question: 'Is Try & Buy available for all products?',
    answer:
      'No, Try & Buy is only available for products offered by local retailers located within our serviceable trial zones. Products dispatched from distant retail partners are shipped via standard courier services and are not eligible for instant doorstep trial.',
  },
  {
    question: 'How long do I get to try the products?',
    answer:
      'For Try & Buy orders, our delivery partner will wait at your doorstep for up to 30 minutes. This gives you ample time to try the products on and decide which ones to keep and which ones to return immediately.',
  },
  {
    question: 'Can I place orders from multiple retailers together?',
    answer:
      'Yes, you can add items from multiple retailers to your cart. For Try & Buy, because orders are delivered instantly from local stores, you will check out each retailer’s cart individually. For standard courier orders, you can check out all items from different retailers together in a single transaction.',
  },
  {
    question: 'How do I know if a retailer is local or distant?',
    answer:
      'The app automatically identifies retailers as local (eligible for Try & Buy) or distant (eligible only for courier delivery) based on your location. You will see an “Instant Delivery” or “Try & Buy Available” label for local retailers and a “Standard Delivery” label for distant ones.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'We support a wide range of secure payment options, including major Credit/Debit Cards, UPI (Google Pay, PhonePe, Paytm, etc.), Net Banking, and popular digital wallets. Payment details are processed securely through our payment gateway.',
  },
  {
    question: 'Will delivery charges be refunded?',
    answer:
      'Generally, delivery charges are non-refundable once a delivery attempt has been made. However, for Try & Buy orders, if you decide to keep all ordered items (resulting in no returned items), a partial refund of the delivery charge will be deducted from the total amount of the order. For standard courier-based orders, delivery charges are completely non-refundable once the shipment is processed.',
  },  
  {
    question: 'Is FlashFits responsible for courier delays?',
    answer:
      'Distant courier-based orders are shipped and managed directly by the respective retail store. While FlashFits facilitates communication and monitors delivery timelines, the specific transit times and potential logistics delays are the responsibility of the designated courier partner.',
  },
  {
    question: 'How can I track my order?',
    answer:
      'For Try & Buy orders, you can track your delivery partner in real-time within the app once they are dispatched. For courier orders, you will receive tracking updates and a shipment tracking link as soon as the retail partner dispatches the parcel.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq((prev) => (prev === index ? null : index));
  }, []);

  const openWhatsApp = useCallback(async (category: typeof SUPPORT_CATEGORIES[0]) => {
    try {
      // Log the support trigger to backend
      const phone = await SecureStore.getItemAsync('phoneNumber');
      axiosInstance.post('/user/support/ticket', {
        category: category.key,
        phone: phone || 'N/A',
        message: `User initiated support for: ${category.label}`,
      }).catch(() => { }); // fire and forget

      const message = encodeURIComponent(
        `Hi FlashFits Support! 👋\n\nI need help with: *${category.label}*\n\nPlease assist me.`
      );
      const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${message}`;
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web whatsapp
        await Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp. Please make sure it is installed.');
    }
  }, []);

  const openGeneralWhatsApp = useCallback(async () => {
    try {
      const phone = await SecureStore.getItemAsync('phoneNumber');
      axiosInstance.post('/user/support/ticket', {
        category: 'other',
        phone: phone || 'N/A',
        message: 'User contacted general support',
      }).catch(() => { });

      const message = encodeURIComponent('Hi FlashFits Support! 👋\n\nI need assistance.');
      const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${message}`;
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: '#F8FAFC' }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.primary + '10' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Hero Banner ── */}
      <View style={[styles.heroBanner, { backgroundColor: theme.primary }]}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="headset-outline" size={36} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>How can we help?</Text>
        <Text style={styles.heroSubtitle}>
          Choose an issue below or chat with us on WhatsApp
        </Text>
      </View>

      {/* ── Quick Contact ── */}
      <TouchableOpacity
        style={[styles.whatsappBtn]}
        activeOpacity={0.85}
        onPress={openGeneralWhatsApp}
      >
        <View style={styles.whatsappInner}>
          <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.whatsappTitle}>Chat on WhatsApp</Text>
            <Text style={styles.whatsappSub}>Get instant support from our team</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#25D366" />
        </View>
      </TouchableOpacity>

      {/* ── Support Categories ── */}
      <Text style={styles.sectionTitle}>What do you need help with?</Text>
      <View style={styles.categoriesGrid}>
        {SUPPORT_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={styles.categoryCard}
            activeOpacity={0.7}
            onPress={() => openWhatsApp(cat)}
          >
            <View style={[styles.categoryIconBox, { backgroundColor: theme.primary + '0F' }]}>
              <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
            </View>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FAQs ── */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      <View style={styles.faqContainer}>
        {FAQ_DATA.map((faq, idx) => {
          const isOpen = expandedFaq === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.faqItem,
                idx < FAQ_DATA.length - 1 && styles.faqBorder,
                isOpen && { backgroundColor: theme.primary + '05' },
              ]}
              activeOpacity={0.7}
              onPress={() => toggleFaq(idx)}
            >
              <View style={styles.faqHeader}>
                <View style={[styles.faqDot, { backgroundColor: isOpen ? theme.primary : '#CBD5E1' }]} />
                <Text style={[styles.faqQuestion, isOpen && { color: theme.primary }]}>
                  {faq.question}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={isOpen ? theme.primary : '#94A3B8'}
                />
              </View>
              {isOpen && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#CBD5E1" />
        <Text style={styles.footerText}>We typically respond within 5 minutes</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },

  // Hero
  heroBanner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#fff',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  // WhatsApp
  whatsappBtn: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#25D36625',
    marginBottom: 24,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  whatsappInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  whatsappTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  whatsappSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 14,
    letterSpacing: 0.2,
  },

  // Categories
  categoriesGrid: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  categoryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold || Typography.fontFamily.bold,
    color: '#1E293B',
    flex: 1,
  },

  // FAQ
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  faqItem: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  faqBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  faqAnswer: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 10,
    marginLeft: 20,
    paddingRight: 10,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#CBD5E1',
  },
});
