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
    question: 'What is the refund policy?',
    answer:
      'If you return all items during a Try & Buy order, a full refund of the deposit is initiated within 3-5 business days to your original payment method. If you keep some items, the deposit is adjusted against the kept items and any remaining balance is refunded. For cancelled orders before dispatch, refunds are instant.',
  },
  {
    question: 'How does Try & Buy work?',
    answer:
      'Try & Buy lets you order clothes, try them at home for up to 30 minutes, and only pay for what you keep. A refundable deposit is charged upfront. Our delivery partner will wait while you try the items. Select what you want to keep, return the rest, and you will only be charged for items you keep.',
  },
  {
    question: 'What is the return window?',
    answer:
      'For Try & Buy orders, returns happen on the spot — our delivery partner collects returned items during the same visit. There is no separate return window. For standard courier orders, please check the specific product return policy, generally items can be returned within 7 days of delivery if unused and in original packaging.',
  },
  {
    question: 'How does delivery work?',
    answer:
      'For Try & Buy orders: A delivery rider picks up your order from the nearby merchant, delivers it to your doorstep, and waits while you try items. The entire process typically takes 20-40 minutes from order placement. For standard courier orders, delivery takes 3-7 business days depending on your location.',
  },
  {
    question: 'How are merchants verified?',
    answer:
      'All merchants on FlashFits go through a rigorous verification process including GST verification, business license validation, product quality checks, and on-ground store inspections. We only onboard trusted local retailers and boutiques to ensure you receive authentic products every time.',
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
      }).catch(() => {}); // fire and forget

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
      }).catch(() => {});

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
