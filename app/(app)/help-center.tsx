import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  Platform,
  UIManager,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GenderThemes, Typography } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { createSupportTicket, getMySupportTickets, SupportTicket } from '@/api/support';
import { getOrderById } from '@/api/orders';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WHATSAPP_NUMBER = '918383823813';

export const SUPPORT_CATEGORIES = [
  { key: 'damaged_product', label: 'Damaged / Torn Product', icon: 'flash-outline', emoji: '💥' },
  { key: 'wrong_product', label: 'Wrong Product / Size', icon: 'alert-circle-outline', emoji: '⚠️' },
  { key: 'misplaced_product', label: 'Missing / Misplaced Item', icon: 'help-circle-outline', emoji: '📦' },
  { key: 'return_issue', label: 'Return Issue', icon: 'arrow-undo-outline', emoji: '🔄' },
  { key: 'try_buy_issue', label: 'Try & Buy Issue', icon: 'shirt-outline', emoji: '👔' },
  { key: 'refund_issue', label: 'Refund Issue', icon: 'wallet-outline', emoji: '💰' },
  { key: 'order_delayed', label: 'Order Delayed', icon: 'time-outline', emoji: '⏰' },
  { key: 'size_exchange', label: 'Size Exchange', icon: 'resize-outline', emoji: '📐' },
  { key: 'merchant_issue', label: 'Merchant Issue', icon: 'storefront-outline', emoji: '🏪' },
  { key: 'report_bug', label: 'Report a Bug', icon: 'bug-outline', emoji: '🐞' },
  { key: 'other', label: 'Other Concern', icon: 'ellipsis-horizontal-circle-outline', emoji: '💬' },
];

const FAQ_DATA = [
  {
    question: 'What if an item I kept turns out to be damaged or defective?',
    answer:
      'If any item you decided to keep has a defect, torn fabric, stain, or wrong size tag, you can report it right here. Select "Damaged Product", pick the specific kept item, take multiple clear photos of the damaged area using your camera, and submit. Our customer protection team will review the photos and arrange a replacement or refund.',
  },
  {
    question: 'Can I take multiple photos of the damaged item?',
    answer:
      'Yes! You can attach up to 5 photos per issue report. We recommend clicking photos from different angles: the overall product, a close-up of the damage or defect, and the brand tag.',
  },
  {
    question: 'How does Try & Buy work?',
    answer:
      'Try & Buy allows you to try fashion products at your doorstep before deciding to keep them. You only pay for what you keep, and unwanted items are handed back immediately to the delivery partner.',
  },
  {
    question: 'What is the refund policy for Try & Buy?',
    answer:
      'Items retained and confirmed during the trial session are considered final, except in cases of damaged, defective, or incorrect products. Approved refunds for damaged items are credited back to your original payment method.',
  },
  {
    question: 'How long do I get to try the products?',
    answer:
      'For Try & Buy orders, our delivery partner will wait at your doorstep for up to 30 minutes, giving you ample time to check fits and examine product quality.',
  },
  {
    question: 'What is the return policy for Courier Orders?',
    answer:
      'For standard courier orders, you have a 3-day return window from the date of delivery. Open your Courier Tracking screen, tap "Return Items", select the items, specify the reason, and upload clear photos. Return shipping is free for defective or incorrect items.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const params = useLocalSearchParams<{ orderId?: string; category?: string; itemsJson?: string }>();

  const [activeTab, setActiveTab] = useState<'help' | 'my_tickets'>('help');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Ticket creation modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof SUPPORT_CATEGORIES[0]>(SUPPORT_CATEGORIES[0]);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Order items selection state (which item was damaged)
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // My tickets state
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Auto-open modal if params provided (e.g. from Order Tracking or Orders screen)
  useEffect(() => {
    if (params.orderId || params.category) {
      if (params.orderId) setOrderIdInput(params.orderId);
      if (params.category) {
        const found = SUPPORT_CATEGORIES.find((c) => c.key === params.category);
        if (found) setSelectedCategory(found);
      }
      setModalVisible(true);
    }
  }, [params.orderId, params.category]);

  // Load items from order if passed or when orderId changes
  useEffect(() => {
    if (params.itemsJson) {
      try {
        const parsed = JSON.parse(params.itemsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrderItems(parsed);
          // auto-select first kept item if any
          const firstKept = parsed.find((i: any) => i.tryStatus === 'keep' || i.tryStatus === 'accepted');
          if (firstKept) setSelectedItem(firstKept);
          else setSelectedItem(parsed[0]);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse itemsJson param:', e);
      }
    }

    if (orderIdInput.trim()) {
      const cleanId = orderIdInput.trim().replace(/^["']|["']$/g, '');
      setLoadingOrderItems(true);
      getOrderById(cleanId)
        .then((orderData: any) => {
          if (orderData?.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
            setOrderItems(orderData.items);
            const firstKept = orderData.items.find((i: any) => i.tryStatus === 'keep' || i.tryStatus === 'accepted');
            if (firstKept) setSelectedItem(firstKept);
            else setSelectedItem(orderData.items[0]);
          }
        })
        .catch(() => {
          // silently handle if order not found
        })
        .finally(() => {
          setLoadingOrderItems(false);
        });
    } else {
      setOrderItems([]);
      setSelectedItem(null);
    }
  }, [params.itemsJson, orderIdInput]);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await getMySupportTickets();
      if (res?.success && Array.isArray(res.tickets)) {
        setMyTickets(res.tickets);
      }
    } catch (e) {
      console.warn('Failed to load tickets:', e);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'my_tickets') {
      loadTickets();
    }
  }, [activeTab, loadTickets]);

  const toggleFaq = (index: number) => {
    setExpandedFaq((prev) => (prev === index ? null : index));
  };

  const handleOpenTicketModal = (category: typeof SUPPORT_CATEGORIES[0]) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  // ── Camera and Gallery Handlers (Multiple Images) ──
  const handleTakePhoto = async () => {
    if (attachedImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos per issue report.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please enable camera access in your phone settings to click photos of the damaged or wrong product.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAttachedImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    if (attachedImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos per issue report.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Gallery Permission Required', 'Please allow photo gallery access to select proof photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - attachedImages.length,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.map((a) => a.uri);
        setAttachedImages((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      Alert.alert('Error', 'Could not select images.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ── Submit Ticket Handler ──
  const handleSubmitTicket = async () => {
    if (!messageInput.trim() && attachedImages.length === 0) {
      Alert.alert('Details Required', 'Please describe the issue or attach a photo before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const phone = (await SecureStore.getItemAsync('phoneNumber')) || 'N/A';
      const cleanOrder = orderIdInput.trim() || undefined;

      const res = await createSupportTicket({
        category: selectedCategory.key,
        orderId: cleanOrder,
        itemId: selectedItem?._id || undefined,
        itemDetails: selectedItem
          ? {
              name: selectedItem.name,
              size: selectedItem.size,
              image: selectedItem.image,
              price: selectedItem.price,
            }
          : undefined,
        message: messageInput.trim(),
        phone,
        images: attachedImages,
      });

      const ticketId = res?.ticket?._id?.slice(-6)?.toUpperCase() || 'SUPPORT';

      Alert.alert(
        '✓ Issue Ticket Submitted',
        `Ticket #${ticketId} created with ${attachedImages.length} photo(s)${selectedItem ? ` for "${selectedItem.name}"` : ''}. Our team will review the photos and contact you soon.`,
        [
          {
            text: 'View My Tickets',
            onPress: () => {
              setModalVisible(false);
              setAttachedImages([]);
              setMessageInput('');
              setActiveTab('my_tickets');
              loadTickets();
            },
          },
          {
            text: 'Chat on WhatsApp',
            onPress: () => {
              setModalVisible(false);
              setAttachedImages([]);
              setMessageInput('');
              openWhatsAppWithTicket(ticketId, selectedCategory.label, selectedItem?.name);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting support ticket:', error);
      Alert.alert('Submission Failed', error?.response?.data?.message || 'Could not submit issue ticket. Please check your network and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsAppWithTicket = async (ticketId: string, label: string, itemName?: string) => {
    try {
      const text = encodeURIComponent(
        `Hi FlashFits Support! 👋\n\nI have submitted Ticket #FF_${ticketId}\nIssue: *${label}*\n${orderIdInput ? `Order ID: #${orderIdInput}\n` : ''}${itemName ? `Affected Item: ${itemName}\n` : ''}Please check my uploaded photos and assist me.`
      );
      const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${text}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`);
      }
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  const openGeneralWhatsApp = useCallback(async () => {
    try {
      const message = encodeURIComponent('Hi FlashFits Support! 👋\n\nI need assistance with my order.');
      const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${message}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`);
      }
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs: Get Help vs My Tickets */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'help' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('help')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'help' && styles.tabTextActive]}>Get Help</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'my_tickets' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('my_tickets')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'my_tickets' && styles.tabTextActive]}>My Tickets</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'help' ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={[styles.heroBanner, { backgroundColor: theme.primary }]}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="help-buoy" size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSubtitle}>
              Damaged, wrong, or misplaced item? Click photos and submit a claim below.
            </Text>
          </View>

          {/* WhatsApp Direct Bar */}
          <TouchableOpacity style={styles.whatsappBtn} activeOpacity={0.85} onPress={openGeneralWhatsApp}>
            <View style={styles.whatsappInner}>
              <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.whatsappTitle}>Live Chat on WhatsApp</Text>
                <Text style={styles.whatsappSub}>Connect with a support agent instantly</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#25D366" />
            </View>
          </TouchableOpacity>

          {/* Categories Grid */}
          <Text style={styles.sectionTitle}>Select Issue to Report (Attach Photos)</Text>
          <View style={styles.categoriesGrid}>
            {SUPPORT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.categoryCard}
                activeOpacity={0.7}
                onPress={() => handleOpenTicketModal(cat)}
              >
                <View style={[styles.categoryIconBox, { backgroundColor: theme.primary + '12' }]}>
                  <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  {cat.key === 'damaged_product' || cat.key === 'wrong_product' || cat.key === 'misplaced_product' ? (
                    <Text style={styles.categoryCameraHint}>📷 Multi-photo evidence & item selection</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>

          {/* FAQs */}
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
                    isOpen && { backgroundColor: theme.primary + '06' },
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
                  {isOpen && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" />
            <Text style={styles.footerText}>FlashFits Buyer Protection Guarantee</Text>
          </View>
        </ScrollView>
      ) : (
        /* ── MY TICKETS TAB ── */
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {loadingTickets ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading your tickets...</Text>
            </View>
          ) : myTickets.length === 0 ? (
            <View style={styles.emptyTicketsBox}>
              <Ionicons name="ticket-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTicketsTitle}>No Support Tickets Yet</Text>
              <Text style={styles.emptyTicketsSub}>When you report damaged or wrong products, your tickets will appear here.</Text>
              <TouchableOpacity
                style={[styles.startReportBtn, { backgroundColor: theme.primary }]}
                onPress={() => setActiveTab('help')}
              >
                <Text style={styles.startReportBtnText}>Report an Issue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myTickets.map((t) => (
              <View key={t._id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketIdText}>Ticket #{t._id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.ticketDate}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.ticketStatusBadge,
                      t.status === 'resolved'
                        ? styles.statusResolved
                        : t.status === 'in_progress'
                        ? styles.statusInProgress
                        : styles.statusOpen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ticketStatusText,
                        t.status === 'resolved'
                          ? { color: '#059669' }
                          : t.status === 'in_progress'
                          ? { color: '#D97706' }
                          : { color: '#2563EB' },
                      ]}
                    >
                      {t.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.ticketCategoryRow}>
                  <Text style={styles.ticketCategoryLabel}>Category:</Text>
                  <Text style={styles.ticketCategoryValue}>
                    {SUPPORT_CATEGORIES.find((c) => c.key === t.category)?.label || t.category}
                  </Text>
                </View>

                {t.orderId ? (
                  <View style={styles.ticketCategoryRow}>
                    <Text style={styles.ticketCategoryLabel}>Order ID:</Text>
                    <Text style={styles.ticketCategoryValue}>#{String(t.orderId?._id || t.orderId).slice(-6).toUpperCase()}</Text>
                  </View>
                ) : null}

                {/* Affected Item Details */}
                {t.itemDetails ? (
                  <View style={styles.ticketItemInfoRow}>
                    {t.itemDetails.image ? (
                      <Image source={{ uri: t.itemDetails.image }} style={styles.ticketItemThumb} />
                    ) : (
                      <View style={[styles.ticketItemThumb, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="shirt-outline" size={16} color="#94A3B8" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketItemName} numberOfLines={1}>{t.itemDetails.name}</Text>
                      <Text style={styles.ticketItemMeta}>
                        {t.itemDetails.size ? `Size: ${t.itemDetails.size} • ` : ''}
                        {t.itemDetails.price ? `₹${t.itemDetails.price}` : ''}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {t.message ? <Text style={styles.ticketMessage}>{t.message}</Text> : null}

                {t.images && t.images.length > 0 && (
                  <View style={styles.ticketImagesRow}>
                    <Text style={styles.ticketPhotosLabel}>Photo Proof ({t.images.length} photos):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {t.images.map((img, i) => (
                        <Image key={i} source={{ uri: img.url }} style={styles.ticketThumb} />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ─── TICKET SUBMISSION MODAL ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => !submitting && setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalWrapper, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => !submitting && setModalVisible(false)}
              style={styles.modalCloseBtn}
              disabled={submitting}
            >
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Selected Category Pill */}
            <View style={styles.selectedCategoryBox}>
              <Text style={{ fontSize: 24, marginRight: 10 }}>{selectedCategory.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedCategoryTitle}>{selectedCategory.label}</Text>
                <Text style={styles.selectedCategorySub}>Select the affected kept item and upload photo evidence</Text>
              </View>
            </View>

            {/* Order ID Input (Optional/Pre-filled) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Order ID</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 64f7b2a9e1..."
                placeholderTextColor="#94A3B8"
                value={orderIdInput}
                onChangeText={setOrderIdInput}
                editable={!submitting}
              />
            </View>

            {/* ── KEPT ITEM PICKER ── */}
            {loadingOrderItems ? (
              <View style={styles.loadingItemsRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.loadingItemsText}>Loading items from order...</Text>
              </View>
            ) : orderItems.length > 0 ? (
              <View style={styles.itemsSelectionBox}>
                <View style={styles.itemsHeaderRow}>
                  <Text style={styles.inputLabel}>Which item is damaged or has an issue?</Text>
                  <Text style={styles.itemsSubtitle}>Tap the kept product with the issue</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
                  {orderItems.map((item, idx) => {
                    const isKept = item.tryStatus === 'keep' || item.tryStatus === 'accepted';
                    const isSelected =
                      (selectedItem?._id && selectedItem._id === item._id) ||
                      (selectedItem?.name === item.name && selectedItem?.size === item.size);

                    return (
                      <TouchableOpacity
                        key={item._id || idx}
                        style={[
                          styles.itemSelectCard,
                          isSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '0A' },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedItem(item)}
                      >
                        <View style={styles.itemCardImgWrap}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.itemCardImg} />
                          ) : (
                            <View style={[styles.itemCardImg, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                              <Ionicons name="shirt-outline" size={22} color="#94A3B8" />
                            </View>
                          )}
                          {isSelected && (
                            <View style={[styles.itemSelectedBadge, { backgroundColor: theme.primary }]}>
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            </View>
                          )}
                        </View>

                        <Text style={styles.itemSelectName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemSelectMeta}>
                          {item.size ? `Size: ${item.size} • ` : ''}₹{item.price}
                        </Text>

                        {isKept && (
                          <View style={styles.keptTag}>
                            <Text style={styles.keptTagText}>✓ KEPT ITEM</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Issue Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Describe the Problem</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the defect, tear, stain, or wrong size received..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={messageInput}
                onChangeText={setMessageInput}
                editable={!submitting}
              />
            </View>

            {/* ── MULTIPLE PHOTO ATTACHMENT SECTION ── */}
            <View style={styles.photoSection}>
              <View style={styles.photoSectionHeader}>
                <View>
                  <Text style={styles.inputLabel}>Attach Defect Photos (Multiple Allowed)</Text>
                  <Text style={styles.photoHint}>Take photos of damage, tear, tags, or wrong product</Text>
                </View>
                <View style={styles.photoCountBadge}>
                  <Ionicons name="camera" size={14} color={theme.primary} />
                  <Text style={[styles.photoCountText, { color: theme.primary }]}>{attachedImages.length}/5</Text>
                </View>
              </View>

              {/* Photos Previews Strip */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewsScroll}>
                {attachedImages.map((uri, index) => (
                  <View key={uri} style={styles.photoPreviewWrapper}>
                    <Image source={{ uri }} style={styles.photoPreviewImg} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => handleRemoveImage(index)}
                      disabled={submitting}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Action Buttons: Camera & Gallery */}
              {attachedImages.length < 5 && (
                <View style={styles.photoBtnsRow}>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { borderColor: theme.primary, backgroundColor: theme.primary + '0A' }]}
                    onPress={handleTakePhoto}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={20} color={theme.primary} />
                    <Text style={[styles.photoActionBtnText, { color: theme.primary }]}>Take Photo (Camera)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={handlePickFromGallery}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={20} color="#475569" />
                    <Text style={[styles.photoActionBtnText, { color: '#475569' }]}>Choose Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Guarantee Note */}
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              <Text style={styles.securityNoteText}>
                Your photos will be reviewed directly by the FlashFits quality inspection team to issue instant replacements or refunds.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmitTicket}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Issue Report</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20 },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
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

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#fff',
  },

  // Hero
  heroBanner: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#fff',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // WhatsApp
  whatsappBtn: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#25D36625',
    marginBottom: 20,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  whatsappInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // Categories
  categoriesGrid: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  categoryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  categoryCameraHint: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#10B981',
    marginTop: 2,
  },

  // FAQs
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  faqItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  faqAnswer: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
    marginLeft: 17,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
  },

  // Modal styles
  modalWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  selectedCategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  selectedCategoryTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  selectedCategorySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    marginBottom: 6,
  },
  photoHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },

  // Item Picker Styles
  itemsSelectionBox: {
    marginBottom: 18,
  },
  itemsHeaderRow: {
    marginBottom: 8,
  },
  itemsSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: -2,
  },
  loadingItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingItemsText: {
    fontSize: 12,
    color: '#64748B',
  },
  itemsScroll: {
    paddingVertical: 4,
  },
  itemSelectCard: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  itemCardImgWrap: {
    position: 'relative',
    marginBottom: 8,
    alignItems: 'center',
  },
  itemCardImg: {
    width: 110,
    height: 100,
    borderRadius: 10,
  },
  itemSelectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelectName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  itemSelectMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  keptTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  keptTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },

  // Photo Section
  photoSection: {
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  photoPreviewsScroll: {
    marginBottom: 12,
  },
  photoPreviewWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  photoPreviewImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
  },
  photoBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  photoActionBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
  },

  submitBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },

  // Tickets List styles
  emptyTicketsBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTicketsTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    marginTop: 14,
  },
  emptyTicketsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  startReportBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startReportBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ticketIdText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  ticketDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  ticketStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusOpen: { backgroundColor: '#DBEAFE' },
  statusInProgress: { backgroundColor: '#FEF3C7' },
  statusResolved: { backgroundColor: '#D1FAE5' },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ticketCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticketCategoryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  ticketCategoryValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  ticketItemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketItemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  ticketItemName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  ticketItemMeta: {
    fontSize: 10,
    color: '#64748B',
  },
  ticketMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
  },
  ticketImagesRow: {
    marginTop: 10,
  },
  ticketPhotosLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  ticketThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
});
