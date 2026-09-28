import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Loader from '@/components/common/Loader';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { addAddress } from '../../api/address';
import { useAddress } from '../../context/AddressContext';
import { useToast } from '@/context/AlertContext';

export default function AddAddressScreen() {
    const { setSelectedAddress, refreshAddresses } = useAddress();
    const params = useLocalSearchParams();
    const showToast = useToast();
    
    const rawAddress = params.address ? JSON.parse(params.address as string) : null;
    const latitude = params.lat ? Number(params.lat) : null;
    const longitude = params.lng ? Number(params.lng) : null;

    const [submitting, setSubmitting] = useState(false);
    const [orderingFor, setOrderingFor] = useState('myself');
    const [addressType, setAddressType] = useState('Home');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        city: rawAddress?.city || rawAddress?.town || rawAddress?.suburb || rawAddress?.village || rawAddress?.municipality || '',
        state: rawAddress?.state || '',
        pincode: rawAddress?.postcode || rawAddress?.postal_code || '',
        latitude: latitude,
        longitude: longitude,
    });

    // Phone confirmation modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmPhone, setConfirmPhone] = useState('');
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneError, setPhoneError] = useState('');

    const handleInputChange = (field: string, value: string) => {
        if (field === 'phone') {
            const cleaned = value.replace(/[^0-9]/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [field]: cleaned }));
            return;
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenConfirmModal = () => {
        const errors: string[] = [];

        if (!formData.name.trim()) errors.push("Full name is required");
        if (!formData.phone.trim()) errors.push("Phone number is required");
        if (!/^[0-9]{10}$/.test(formData.phone)) errors.push("Enter valid 10-digit phone number");
        if (!formData.addressLine1.trim()) errors.push("Flat/House number is required");
        if (!formData.pincode.trim()) errors.push("Pincode is required");
    
        if (!formData.latitude || !formData.longitude)
          errors.push("Please select your location on the map");
    
        if (errors.length > 0) {
          showToast({ message: errors[0], type: 'warning' });
          return;
        }

        setConfirmPhone(formData.phone);
        setIsEditingPhone(false);
        setPhoneError('');
        setShowConfirmModal(true);
    };

    const handleCloseModal = () => {
        if (submitting) return;
        Keyboard.dismiss();
        setShowConfirmModal(false);
        setIsEditingPhone(false);
        setPhoneError('');
    };

    const handlePhoneChangeInModal = (val: string) => {
        const cleaned = val.replace(/[^0-9]/g, '').slice(0, 10);
        setConfirmPhone(cleaned);
        if (phoneError) setPhoneError('');
    };

    const handleSaveAddress = async (phoneToSave: string) => {
        const cleanedPhone = phoneToSave.trim();
        if (!/^[0-9]{10}$/.test(cleanedPhone)) {
            setPhoneError("Enter a valid 10-digit phone number");
            return;
        }

        setFormData(prev => ({ ...prev, phone: cleanedPhone }));

        const addressData = {
            name: formData.name.trim(),
            phone: cleanedPhone,
            addressLine1: formData.addressLine1.trim(),
            addressLine2: formData.addressLine2 ? formData.addressLine2.trim() : '',
            landmark: formData.landmark ? formData.landmark.trim() : '',
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
            addressType,
            location: {
                type: "Point",
                coordinates: [formData.longitude, formData.latitude],
            },
        };

        try {
            setSubmitting(true);
            const response = await addAddress(addressData as any);
            console.log(response, 'responseresponser4434esponseresponse');
            
            if (response?.address) {
                await SecureStore.setItemAsync('selectedAddress', JSON.stringify(response.address));
                setSelectedAddress(response.address);
                if (refreshAddresses) {
                    await refreshAddresses();
                }
            }
            setShowConfirmModal(false);
            showToast({ message: "Address saved successfully!", type: 'success' });
            router.replace("/(app)/(tabs)");
        } catch (error) {
            console.error("Error saving address:", error);
            showToast({ message: "Error saving address", type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#0F0F0F" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Address Details</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <Text style={styles.sectionLabel}>Who are you ordering for?</Text>
                    <View style={styles.radioGroup}>
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setOrderingFor('myself')}
                        >
                            <View style={styles.radioOuter}>
                                {orderingFor === 'myself' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.radioText}>Myself</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setOrderingFor('someone')}
                        >
                            <View style={styles.radioOuter}>
                                {orderingFor === 'someone' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.radioText}>Someone else</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>Save Address As</Text>
                    <View style={styles.typeContainer}>
                        {['Home', 'Work', 'Other'].map((type) => {
                            const label = type === 'Work' ? 'Office' : type === 'Other' ? 'Others' : type;
                            return (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeButton, addressType === type && styles.activeTypeButton]}
                                    onPress={() => setAddressType(type)}
                                >
                                    <Ionicons 
                                        name={type === 'Home' ? 'home-outline' : type === 'Work' ? 'briefcase-outline' : 'location-outline'} 
                                        size={20} 
                                        color={addressType === type ? '#fff' : '#64748B'} 
                                    />
                                    <Text style={[styles.typeText, addressType === type && styles.activeTypeText]}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.sectionLabel}>Address details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="*Flat / House number"
                        placeholderTextColor="#999"
                        value={formData.addressLine1}
                        onChangeText={(t) => handleInputChange('addressLine1', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Street / Building name (optional)"
                        placeholderTextColor="#999"
                        value={formData.addressLine2}
                        onChangeText={(t) => handleInputChange('addressLine2', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="*City"
                        placeholderTextColor="#999"
                        value={formData.city}
                        onChangeText={(t) => handleInputChange('city', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="*State"
                        placeholderTextColor="#999"
                        value={formData.state}
                        onChangeText={(t) => handleInputChange('state', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="*Pincode"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        value={formData.pincode}
                        onChangeText={(t) => handleInputChange('pincode', t)}
                    />

                    <Text style={styles.sectionLabel}>Contact details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="*Phone number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={formData.phone}
                        onChangeText={(t) => handleInputChange('phone', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="*Full name"
                        placeholderTextColor="#999"
                        value={formData.name}
                        onChangeText={(t) => handleInputChange('name', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Landmark (optional)"
                        placeholderTextColor="#999"
                        value={formData.landmark}
                        onChangeText={(t) => handleInputChange('landmark', t)}
                    />

                    <TouchableOpacity
                        style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                        onPress={handleOpenConfirmModal}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <Loader size={24} />
                        ) : (
                            <Text style={styles.submitText}>Save Address</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Phone Confirmation & Quick Edit Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={handleCloseModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={handleCloseModal}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>

                    <View style={styles.modalSheet}>
                        <View style={styles.dragHandle} />

                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBadge}>
                                <Ionicons name="call" size={20} color="#0F0F0F" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Confirm Phone Number</Text>
                                <Text style={styles.modalSubtitle}>
                                    Riders will call this number for delivery and doorstep coordination.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCloseModal}
                                disabled={submitting}
                                style={styles.modalCloseBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Confirmation Display or Inline Edit Card */}
                        {!isEditingPhone ? (
                            <View style={styles.phoneConfirmCard}>
                                <View style={styles.phoneConfirmTop}>
                                    <View style={styles.phoneBadgeRow}>
                                        <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                                        <Text style={styles.phoneConfirmBadge}>DELIVERY CONTACT</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.editPillBtn}
                                        onPress={() => {
                                            setIsEditingPhone(true);
                                            setPhoneError('');
                                        }}
                                        disabled={submitting}
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="edit-2" size={12} color="#0F0F0F" />
                                        <Text style={styles.editPillText}>Edit</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setIsEditingPhone(true);
                                        setPhoneError('');
                                    }}
                                    style={styles.phoneDisplayRow}
                                >
                                    <Text style={styles.phoneCountryCode}>+91</Text>
                                    <Text style={styles.phoneNumberLarge}>
                                        {confirmPhone.length === 10
                                            ? `${confirmPhone.slice(0, 5)} ${confirmPhone.slice(5)}`
                                            : confirmPhone || '—'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.phoneConfirmNotice}>
                                    <Ionicons name="information-circle-outline" size={15} color="#64748B" />
                                    <Text style={styles.phoneNoticeText}>
                                        Not your number? Tap <Text style={{ fontWeight: '700', color: '#0F0F0F' }}>Edit</Text> to correct it right here.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.phoneEditCard}>
                                <View style={styles.phoneEditHeader}>
                                    <Text style={styles.phoneEditLabel}>Enter Correct Phone Number</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setConfirmPhone(formData.phone);
                                            setIsEditingPhone(false);
                                            setPhoneError('');
                                        }}
                                        disabled={submitting}
                                    >
                                        <Text style={styles.phoneCancelEditText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.phoneInputRow, phoneError ? styles.phoneInputError : null]}>
                                    <View style={styles.phoneInputPrefix}>
                                        <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
                                    </View>
                                    <View style={styles.phoneInputDivider} />
                                    <TextInput
                                        style={styles.phoneTextInput}
                                        value={confirmPhone}
                                        onChangeText={handlePhoneChangeInModal}
                                        placeholder="10-digit number"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        autoFocus={true}
                                        returnKeyType="done"
                                    />
                                    {confirmPhone.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setConfirmPhone('');
                                                setPhoneError('');
                                            }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={styles.clearBtn}
                                        >
                                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.phoneMetaRow}>
                                    {phoneError ? (
                                        <Text style={styles.phoneErrorText}>{phoneError}</Text>
                                    ) : (
                                        <Text style={styles.phoneHintText}>10-digit mobile number</Text>
                                    )}
                                    <Text
                                        style={[
                                            styles.charCountText,
                                            confirmPhone.length === 10 && styles.charCountValid,
                                        ]}
                                    >
                                        {confirmPhone.length}/10
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Modal Action Buttons */}
                        <View style={styles.modalActions}>
                            {!isEditingPhone ? (
                                <>
                                    <TouchableOpacity
                                        style={[styles.modalConfirmBtn, submitting && { opacity: 0.7 }]}
                                        onPress={() => handleSaveAddress(confirmPhone)}
                                        disabled={submitting}
                                        activeOpacity={0.8}
                                    >
                                        {submitting ? (
                                            <Loader size={22} />
                                        ) : (
                                            <View style={styles.btnContentRow}>
                                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                                <Text style={styles.modalConfirmBtnText}>Confirm & Save Address</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.modalSecondaryBtn}
                                        onPress={() => {
                                            setIsEditingPhone(true);
                                            setPhoneError('');
                                        }}
                                        disabled={submitting}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.btnContentRow}>
                                            <Feather name="edit-3" size={15} color="#475569" />
                                            <Text style={styles.modalSecondaryBtnText}>Change Number</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalConfirmBtn,
                                            (confirmPhone.length !== 10 || submitting) && { opacity: 0.7 },
                                        ]}
                                        onPress={() => {
                                            if (!/^[0-9]{10}$/.test(confirmPhone)) {
                                                setPhoneError('Please enter a valid 10-digit phone number');
                                                return;
                                            }
                                            handleSaveAddress(confirmPhone);
                                        }}
                                        disabled={submitting}
                                        activeOpacity={0.8}
                                    >
                                        {submitting ? (
                                            <Loader size={22} />
                                        ) : (
                                            <View style={styles.btnContentRow}>
                                                <Ionicons name="checkmark" size={18} color="#fff" />
                                                <Text style={styles.modalConfirmBtnText}>Save Address</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.modalSecondaryBtn}
                                        onPress={() => {
                                            setConfirmPhone(formData.phone);
                                            setIsEditingPhone(false);
                                            setPhoneError('');
                                        }}
                                        disabled={submitting}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F0F0F',
    },
    scrollContent: {
        padding: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        marginTop: 24,
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    radioGroup: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 32,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0F0F0F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#0F0F0F',
    },
    radioText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#0F0F0F',
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        backgroundColor: '#F8FAFC',
        gap: 8,
    },
    activeTypeButton: {
        backgroundColor: '#0F0F0F',
        borderColor: '#0F0F0F',
    },
    typeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    activeTypeText: {
        color: '#fff',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#0F0F0F',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    submitButton: {
        backgroundColor: '#0F0F0F',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 40,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 24,
    },
    dragHandle: {
        width: 38,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F0F0F',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        marginLeft: 8,
    },

    /* Confirmation Card */
    phoneConfirmCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 18,
        marginBottom: 20,
    },
    phoneConfirmTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    phoneBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    phoneConfirmBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.8,
    },
    editPillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    editPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F0F0F',
    },
    phoneDisplayRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginVertical: 4,
    },
    phoneCountryCode: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748B',
    },
    phoneNumberLarge: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F0F0F',
        letterSpacing: 1,
    },
    phoneConfirmNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 10,
    },
    phoneNoticeText: {
        fontSize: 12,
        color: '#64748B',
        flex: 1,
    },

    /* Edit Phone Card */
    phoneEditCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        padding: 18,
        marginBottom: 20,
    },
    phoneEditHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    phoneEditLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F0F0F',
    },
    phoneCancelEditText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#0F0F0F',
        paddingHorizontal: 12,
        height: 52,
    },
    phoneInputError: {
        borderColor: '#EF4444',
    },
    phoneInputPrefix: {
        paddingRight: 10,
    },
    phonePrefixText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F0F0F',
    },
    phoneInputDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
        marginRight: 10,
    },
    phoneTextInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#0F0F0F',
        letterSpacing: 1,
        paddingVertical: 0,
    },
    clearBtn: {
        padding: 4,
    },
    phoneMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    phoneErrorText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444',
    },
    phoneHintText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    charCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    charCountValid: {
        color: '#16A34A',
    },

    /* Action Buttons */
    modalActions: {
        gap: 10,
    },
    modalConfirmBtn: {
        backgroundColor: '#0F0F0F',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalConfirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    modalSecondaryBtn: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modalSecondaryBtnText: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '600',
    },
});
