import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logo from '@/assets/images/logo/logo.png';
import { getAddresses, deleteAddress, Address } from '@/api/address';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import Loader from '@/components/common/Loader';

const AddressesScreen = () => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await getAddresses();
      setAddresses(res?.addresses || []);
    } catch (error) {
      console.log('Address fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(id);
              setAddresses(prev => prev.filter(addr => addr._id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address');
            }
          }
        },
      ]
    );
  };

  const capitalize = (str?: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <Loader size={60} />
            <Text style={styles.loadingText}>Loading your addresses...</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="location-outline" size={60} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyTitle}>No Addresses Saved</Text>
            <Text style={styles.emptySubtitle}>You haven't saved any addresses yet. Add one to speed up your checkout!</Text>
          </View>
        ) : (
          addresses.map((item) => (
            <View style={[styles.addressCard, { borderColor: selectedGender === 'Men' ? '#F1F5F9' : theme.primary + '12', shadowColor: theme.primary }]} key={item._id}>
              <View style={styles.cardHeader}>
                <View style={styles.typeWrapper}>
                  <View style={[styles.typeIconBox, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons 
                      name={item.addressType?.toLowerCase() === 'home' ? 'home' : item.addressType?.toLowerCase() === 'work' ? 'briefcase' : 'location'} 
                      size={18} 
                      color={theme.primary} 
                    />
                  </View>
                  <View>
                    <Text style={styles.typeText}>{capitalize(item.addressType)}</Text>
                    {item.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.defaultText, { color: theme.primary }]}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
                    <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.addressLine}>
                {capitalize(item.addressLine1)}{item.addressLine2 ? `, ${capitalize(item.addressLine2)}` : ''}
              </Text>
              <Text style={styles.cityLine}>
                {`${capitalize(item.city)}, ${item.state} - `}
                <Text style={styles.pincode}>{item.pincode}</Text>
              </Text>

              {/* Edit button (optional mock for now) */}
              <TouchableOpacity 
                style={[styles.editBtn, { borderColor: theme.primary + '20' }]}
                onPress={() => {
                   // Navigate to add-address with edit flag if supported
                   console.log('Edit pressed');
                }}
              >
                <Text style={[styles.editBtnText, { color: theme.primary }]}>Edit Details</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(app)/select-location' as any)}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
            <Image source={logo} style={styles.footerLogo} blurRadius={3} resizeMode="contain" />
            <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
            <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 4,
  },
  headerLogo: {
    width: 100,
    height: 30,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  defaultText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressLine: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
    lineHeight: 22,
  },
  cityLine: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 4,
  },
  pincode: {
    fontFamily: Typography.fontFamily.bold,
  },
  editBtn: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    marginTop: 24,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  // ── Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
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

export default AddressesScreen;
