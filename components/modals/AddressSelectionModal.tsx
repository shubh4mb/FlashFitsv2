import React, { forwardRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Modalize } from 'react-native-modalize';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAddress } from '../../context/AddressContext';
import { Address } from '../../api/address';

const AddressSelectionModal = forwardRef((props, ref: any) => {
    const { addresses, selectedAddress, setSelectedAddress } = useAddress();

    const handleAddNewAddress = () => {
        ref.current?.close();
        router.push('/(app)/select-location');
    };

    const renderAddressItem = ({ item }: { item: Address }) => {
        const isSelected = selectedAddress?._id === item._id;

        return (
            <TouchableOpacity
                style={[styles.addressItem, isSelected && styles.selectedItem]}
                onPress={() => {
                    setSelectedAddress(item);
                    ref.current?.close();
                }}
            >
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={item.addressType === 'Home' ? 'home-outline' : item.addressType === 'Work' ? 'briefcase-outline' : 'location-outline'}
                        size={24}
                        color={isSelected ? '#0F0F0F' : '#64748B'}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.addressType, isSelected && styles.selectedText]}>{item.addressType}</Text>
                    <Text style={styles.addressLine} numberOfLines={1}>{item.addressLine1}</Text>
                    <Text style={styles.areaCity}>{item.area}, {item.city}</Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#0F0F0F" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modalize
            ref={ref}
            adjustToContentHeight
            handlePosition="inside"
            modalStyle={styles.modal}
            closeOnOverlayTap={!!selectedAddress}
            panGestureEnabled={!!selectedAddress}
            HeaderComponent={
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Select Delivery Address</Text>
                </View>
            }
            FooterComponent={
                <TouchableOpacity style={styles.addAddressButton} onPress={handleAddNewAddress}>
                    <Ionicons name="add" size={24} color="#0F0F0F" />
                    <Text style={styles.addAddressText}>Add New Address</Text>
                </TouchableOpacity>
            }
        >
            <View style={styles.container}>
                <TouchableOpacity style={styles.currentLocationButton}>
                    <Ionicons name="navigate-outline" size={24} color="#0F0F0F" />
                    <View style={styles.currentLocationTextContainer}>
                        <Text style={styles.currentLocationTitle}>Use Current Location</Text>
                        <Text style={styles.currentLocationSubtitle}>Enable location to find your address</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>

                <FlatList
                    data={addresses}
                    renderItem={renderAddressItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No saved addresses found</Text>
                        </View>
                    }
                />
            </View>
        </Modalize>
    );
});

const styles = StyleSheet.create({
    modal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F0F0F',
        textAlign: 'center',
    },
    container: {
        padding: 20,
    },
    currentLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    currentLocationTextContainer: {
        marginLeft: 16,
    },
    currentLocationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F0F0F',
    },
    currentLocationSubtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 16,
    },
    addressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    selectedItem: {
        backgroundColor: '#F8FAFC',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 16,
    },
    addressType: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
        marginBottom: 2,
    },
    selectedText: {
        color: '#0F0F0F',
    },
    addressLine: {
        fontSize: 15,
        color: '#0F0F0F',
        fontWeight: '500',
    },
    areaCity: {
        fontSize: 13,
        color: '#64748B',
    },
    addAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    addAddressText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#0F0F0F',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
    },
});

export default AddressSelectionModal;
