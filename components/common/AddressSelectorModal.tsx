import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Address } from '@/api/address';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';

interface AddressSelectorModalProps {
  visible?: boolean;
  onClose?: () => void;
}

const AddressSelectorModal = ({ visible, onClose }: AddressSelectorModalProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const {
    selectedAddress,
    setSelectedAddress,
    addresses,
    refreshAddresses,
    userLocation,
    locationAddress,
    locationLoading,
    locationPermission,
    isLocationOff,
    enableLocation,
    isAddressModalVisible,
    closeAddressModal,
  } = useAddress();

  // Support both local controlled props and global AddressContext state
  const isVisible = visible !== undefined ? visible : isAddressModalVisible;
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeAddressModal();
    }
  };

  const [loading, setLoading] = useState(false);
  const [enablingLocation, setEnablingLocation] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadAddresses();
    }
  }, [isVisible]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      await refreshAddresses();
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const capitalize = (str?: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleSelectSavedAddress = async (addr: Address) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setSelectedAddress(addr);
    handleClose();
  };

  const handleEnableLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setEnablingLocation(true);
      const success = await enableLocation();
      if (success) {
        handleClose();
      }
    } catch (err) {
      console.error('Failed to enable location:', err);
    } finally {
      setEnablingLocation(false);
    }
  };

  const handleSelectCurrentLocation = async () => {
    if (isLocationOff || locationPermission !== 'granted' || !userLocation) {
      handleEnableLocation();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setSelectedAddress(null);
    handleClose();
  };

  const handleAddNewAddress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleClose();
    setTimeout(() => {
      router.push('/(app)/select-location' as any);
    }, 300);
  };

  const isCurrentLocationSelected = !selectedAddress && !!userLocation && !isLocationOff;

  const renderAddressItem = ({ item }: { item: Address }) => {
    const isSelected = selectedAddress?._id === item._id;
    const isHome = item.addressType?.toLowerCase() === 'home';
    const isWork = item.addressType?.toLowerCase() === 'work';
    const iconName = isHome ? 'home' : isWork ? 'briefcase' : 'location';

    return (
      <TouchableOpacity
        style={[
          styles.addressCard,
          isSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '08' },
        ]}
        activeOpacity={0.7}
        onPress={() => handleSelectSavedAddress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name={iconName} size={20} color={theme.primary} />
        </View>
        <View style={styles.addressInfo}>
          <View style={styles.addressTypeBadgeRow}>
            <Text style={styles.addressType}>{capitalize(item.addressType || 'Address')}</Text>
            {item.isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.defaultBadgeText, { color: theme.primary }]}>DEFAULT</Text>
              </View>
            )}
          </View>
          {item.name ? <Text style={styles.contactDetails}>{item.name} • {item.phone}</Text> : null}
          <Text style={styles.addressLine} numberOfLines={1}>
            {item.addressLine1}
            {item.addressLine2 ? `, ${item.addressLine2}` : ''}
          </Text>
          <Text style={styles.cityLine} numberOfLines={1}>
            {[item.area, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={[styles.selectionCircle, isSelected && { borderColor: theme.primary }]}>
          {isSelected && <View style={[styles.selectionDot, { backgroundColor: theme.primary }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Modal Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Select Delivery Location</Text>
                  <Text style={styles.headerSubtitle}>
                    {isLocationOff 
                      ? 'Location is off. Choose an address or enable GPS.'
                      : 'Choose your delivery location'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* ── Option 1: Current Location Card with Enable Button ── */}
              <TouchableOpacity
                style={[
                  styles.currentLocationCard,
                  isCurrentLocationSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '08' },
                  isLocationOff && styles.currentLocationCardOff,
                ]}
                activeOpacity={0.8}
                onPress={handleSelectCurrentLocation}
              >
                <View style={styles.currentLocationContent}>
                  <View style={[
                    styles.currentLocationIconBox, 
                    { backgroundColor: isLocationOff ? '#FEE2E2' : theme.primary + '15' }
                  ]}>
                    <Ionicons 
                      name={isLocationOff ? "location-outline" : "navigate"} 
                      size={20} 
                      color={isLocationOff ? '#EF4444' : theme.primary} 
                    />
                  </View>
                  <View style={styles.currentLocationTextWrapper}>
                    <Text style={[styles.currentLocationTitle, { color: theme.primary }]}>
                      Use my current location
                    </Text>
                    <Text style={styles.currentLocationDesc} numberOfLines={1}>
                      {locationLoading || enablingLocation
                        ? 'Detecting your location...'
                        : isLocationOff || locationPermission !== 'granted'
                          ? 'Location is turned off on your device'
                          : locationAddress || 'Current device location'}
                    </Text>
                  </View>
                </View>

                {/* Enable Button if location is off / not granted */}
                {(isLocationOff || locationPermission !== 'granted' || !userLocation) ? (
                  <TouchableOpacity
                    style={[styles.enableButton, { backgroundColor: theme.primary }]}
                    activeOpacity={0.8}
                    onPress={handleEnableLocation}
                    disabled={enablingLocation || locationLoading}
                  >
                    {enablingLocation || locationLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="flash-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.enableButtonText}>Enable</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.selectionCircle, isCurrentLocationSelected && { borderColor: theme.primary }]}>
                    {isCurrentLocationSelected && <View style={[styles.selectionDot, { backgroundColor: theme.primary }]} />}
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Option 2: Saved Addresses List ── */}
              <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                  <Text style={styles.sectionTitle}>
                    Saved Addresses {addresses.length > 0 ? `(${addresses.length})` : ''}
                  </Text>
                </View>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={styles.loadingText}>Fetching your addresses...</Text>
                  </View>
                ) : addresses.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="home-outline" size={28} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No saved addresses found</Text>
                    <Text style={styles.emptySubText}>Add an address below to receive fast delivery</Text>
                  </View>
                ) : (
                  <FlatList
                    data={addresses}
                    keyExtractor={(item) => item._id}
                    renderItem={renderAddressItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.flatListContent}
                    style={styles.flatList}
                  />
                )}
              </View>

              {/* ── Option 3: Add New Address Button ── */}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.85}
                onPress={handleAddNewAddress}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add a new address</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  currentLocationCardOff: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFB',
  },
  currentLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  currentLocationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 2,
  },
  currentLocationDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.2,
  },
  listContainer: {
    maxHeight: 280,
  },
  listHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
    fontFamily: Typography.fontFamily.bold,
  },
  emptySubText: {
    marginTop: 2,
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.regular,
  },
  flatList: {
    marginBottom: 8,
  },
  flatListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  addressType: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  contactDetails: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
    marginBottom: 2,
  },
  cityLine: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  selectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});

export default AddressSelectorModal;
