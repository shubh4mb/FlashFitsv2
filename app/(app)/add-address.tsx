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

export default function AddAddressScreen() {
    const { setSelectedAddress, setAddresses } = useAddress();
    const params = useLocalSearchParams();
    
    const rawAddress = params.address ? JSON.parse(params.address as string) : null;
    const latitude = params.lat ? Number(params.lat) : null;
    const longitude = params.lng ? Number(params.lng) : null;

    const [submitting, setSubmitting] = useState(false);
    const [addressType, setAddressType] = useState('Home');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        city: rawAddress?.town || rawAddress?.suburb || rawAddress?.city || '',
        state: rawAddress?.state || '',
        pincode: rawAddress?.postcode || '',
        latitude: latitude,
        longitude: longitude,
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.phone.trim() || !formData.addressLine1.trim()) {
            alert("Please fill in all required fields");
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
                coordinates: [formData.longitude || 0, formData.latitude || 0],
            },
        };

        try {
            setSubmitting(true);
            const response = await addAddress(addressData as any);
            
            // In a real app, response would contain the new address list or the new address object
            // For now we just update selected address and go back
            if (response.address) {
                await SecureStore.setItemAsync('selectedAddress', JSON.stringify(response.address));
                setSelectedAddress(response.address);
            }
            
            router.replace("/(app)/(tabs)");
        } catch (error) {
            console.error("Error saving address:", error);
            alert("Error saving address");
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
                    <Text style={styles.sectionLabel}>Save Address As</Text>
                    <View style={styles.typeContainer}>
                        {['Home', 'Work', 'Other'].map((type) => (
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
                                <Text style={[styles.typeText, addressType === type && styles.activeTypeText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>Contact Details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name *"
                        value={formData.name}
                        onChangeText={(t) => handleInputChange('name', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number *"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(t) => handleInputChange('phone', t)}
                    />

                    <Text style={styles.sectionLabel}>Address Details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Flat / House / Office No *"
                        value={formData.addressLine1}
                        onChangeText={(t) => handleInputChange('addressLine1', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Street / Landmark (Optional)"
                        value={formData.landmark}
                        onChangeText={(t) => handleInputChange('landmark', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="City *"
                        value={formData.city}
                        onChangeText={(t) => handleInputChange('city', t)}
                    />
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                            placeholder="State *"
                            value={formData.state}
                            onChangeText={(t) => handleInputChange('state', t)}
                        />
                        <TextInput
                            style={[styles.input, { flex: 1, marginLeft: 8 }]}
                            placeholder="Pincode *"
                            keyboardType="number-pad"
                            value={formData.pincode}
                            onChangeText={(t) => handleInputChange('pincode', t)}
                        />
                    </View>

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
