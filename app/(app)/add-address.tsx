import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
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
    const { setSelectedAddress, setAddresses } = useAddress();
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

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
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

        const addressData = {
            name: formData.name,
            phone: formData.phone,
            addressLine1: formData.addressLine1,
            addressLine2: formData.addressLine2,
            landmark: formData.landmark,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
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
            }
            console.log("Address added and saved to SecureStore");
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
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                        onPress={handleSubmit}
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
});
