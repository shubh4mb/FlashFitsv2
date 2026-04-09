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

import { Address, getAddresses } from '@/api/address';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';

interface AddressSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddressSelectorModal = ({ visible, onClose }: AddressSelectorModalProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const {
    selectedAddress,
    setSelectedAddress,
    userLocation,
    locationAddress,
    locationLoading,
  } = useAddress();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchAddresses();
    }
  }, [visible]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await getAddresses();
      // axiosConfig already unwraps response.data if properly structured
      // But if it returns { addresses: [...] } it might be res.addresses
      setAddresses(res?.addresses || res?.data?.addresses || []);
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
    await setSelectedAddress(addr);
    onClose();
  };

  const handleSaveCurrentLocation = () => {
    if (userLocation && locationAddress) {
      onClose();
      setTimeout(() => {
        router.push({
          pathname: '/(app)/add-address' as any,
          params: {
            lat: userLocation.latitude,
            lng: userLocation.longitude,
            address: JSON.stringify({ display_name: locationAddress }), // Simple mock for add-address parser
          },
        });
      }, 300);
    } else {
      // Fallback: just use GPS if they can't save for some reason, or alert
      handleSelectCurrentLocation();
    }
  };

  const handleSelectCurrentLocation = async () => {
    await setSelectedAddress(null);
    onClose();
  };

  const handleAddNewAddress = () => {
    onClose();
    // Small delay to allow modal to close before navigating
    setTimeout(() => {
      router.push('/(app)/select-location' as any);
    }, 300);
  };

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
          <Text style={styles.addressType}>{capitalize(item.addressType)}</Text>
          <Text style={styles.addressLine} numberOfLines={1}>
            {item.addressLine1}
            {item.addressLine2 ? `, ${item.addressLine2}` : ''}
          </Text>
          <Text style={styles.cityLine} numberOfLines={1}>
            {item.city}, {item.state} - {item.pincode}
          </Text>
        </View>
        <View style={styles.selectionCircle}>
          {isSelected && <View style={[styles.selectionDot, { backgroundColor: theme.primary }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Delivery Location</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Current Location Option */}
              <TouchableOpacity
                style={[
                  styles.currentLocationCard,
                  !selectedAddress && { borderColor: theme.primary, backgroundColor: theme.primary + '08' },
                ]}
                activeOpacity={0.7}
                onPress={handleSaveCurrentLocation}
              >
                <View style={styles.currentLocationContent}>
                  <Ionicons name="locate" size={22} color={theme.primary} />
                  <View style={styles.currentLocationTextWrapper}>
                    <Text style={[styles.currentLocationTitle, { color: theme.primary }]}>
                      Save address at current location
                    </Text>
                    <Text style={styles.currentLocationDesc} numberOfLines={1}>
                      {locationLoading ? 'Detecting...' : locationAddress || 'Tap to enable location'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Saved Addresses List */}
              <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                  <Text style={styles.sectionTitle}>Existing address</Text>
                </View>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={styles.loadingText}>Fetching addresses...</Text>
                  </View>
                ) : addresses.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="location-outline" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No saved addresses found</Text>
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

              {/* Add New Address Button */}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
                onPress={handleAddNewAddress}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add another address</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.serifExtraBold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  currentLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentLocationTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 2,
  },
  currentLocationDesc: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  listContainer: {
    maxHeight: 300,
  },
  listHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  flatList: {
    marginBottom: 16,
  },
  flatListContent: {
    gap: 12,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressType: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
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
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});

export default AddressSelectorModal;
