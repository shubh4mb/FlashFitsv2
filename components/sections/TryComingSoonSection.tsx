import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { useAddress } from '@/context/AddressContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const TryComingSoonSection = () => {
    const { selectedGender } = useGender();
    const { selectedAddress, openAddressModal } = useAddress();
    const router = useRouter();
    const theme = GenderThemes[selectedGender] || GenderThemes.Men;
    const primaryColor = '#000000';

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { borderColor: primaryColor + '20' }]}>
                    <LinearGradient
                        colors={[primaryColor + '10', 'rgba(0,0,0,0)']}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="location-outline" size={48} color={primaryColor} />
                    </LinearGradient>
                    <View style={[styles.pulseCircle, { backgroundColor: primaryColor + '10' }]} />
                </View>

                <Text style={styles.title}>Location not serviceable</Text>
                
                <View style={styles.messageContainer}>
                    <Text style={styles.message}>
                        Your current location is not serviceable for Try & Buy.
                    </Text>

                    {selectedAddress ? (
                        <View style={styles.currentAddressContainer}>
                            <Ionicons name="location-sharp" size={13} color="#64748B" />
                            <Text style={styles.currentAddressText} numberOfLines={1}>
                                {selectedAddress.addressType ? `${selectedAddress.addressType}: ` : ''}
                                {selectedAddress.addressLine1}, {selectedAddress.city}
                            </Text>
                        </View>
                    ) : null}

                    <Text style={styles.subMessage}>
                        Select another delivery address or explore standard delivery options available for your area.
                    </Text>
                </View>

                <View style={styles.buttonsContainer}>
                    {/* Option to change address */}
                    <TouchableOpacity 
                        style={[styles.changeAddressButton, { borderColor: primaryColor }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            openAddressModal();
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="location-outline" size={18} color={primaryColor} />
                        <Text style={[styles.changeAddressButtonText, { color: primaryColor }]}>
                            Change Delivery Address
                        </Text>
                    </TouchableOpacity>

                    {/* Option to explore products */}
                    <TouchableOpacity 
                        style={[styles.exploreButton, { backgroundColor: primaryColor }]}
                        onPress={() => router.push('/explore')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.exploreButtonText}>Explore Products</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default TryComingSoonSection;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    iconGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        zIndex: -1,
    },
    title: {
        fontSize: 22,
        fontFamily: Typography.fontFamily.bold,
        color: '#0F172A',
        marginBottom: 12,
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    messageContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    message: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.semiBold,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 22,
    },
    currentAddressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 10,
        maxWidth: '92%',
    },
    currentAddressText: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.medium,
        color: '#475569',
        marginLeft: 5,
    },
    subMessage: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.medium,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 19,
        paddingHorizontal: 8,
    },
    buttonsContainer: {
        width: '100%',
        gap: 12,
    },
    changeAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
        gap: 8,
        width: '100%',
    },
    changeAddressButtonText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.2,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 8,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    exploreButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.2,
    },
});
