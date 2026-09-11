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

const TryOfflineSection = ({ refreshKey = 0 }: { refreshKey?: number }) => {
    const { selectedGender } = useGender();
    const { openAddressModal } = useAddress();
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
                        <Ionicons name="time-outline" size={48} color={primaryColor} />
                    </LinearGradient>
                    <View style={[styles.pulseCircle, { backgroundColor: primaryColor + '10' }]} />
                </View>

                <Text style={styles.title}>All Offline</Text>
                
                <View style={styles.messageContainer}>
                    <Text style={styles.message}>
                        Oops! All nearby merchants are currently offline.
                    </Text>
                    <Text style={styles.subMessage}>
                        Instant delivery is not possible right now as our partner stores are closed. Try another address or explore standard delivery.
                    </Text>
                </View>

                <View style={styles.buttonsContainer}>
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

export default TryOfflineSection;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    iconGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseCircle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        zIndex: -1,
    },
    title: {
        fontSize: 28,
        fontFamily: Typography.fontFamily.bold,
        color: '#0F172A',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    messageContainer: {
        alignItems: 'center',
        // marginBottom: 40,
    },
    message: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.semiBold,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 24,
    },
    subMessage: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.medium,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        gap: 8,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 1.5,
    },
    buttonsContainer: {
        width: '100%',
        paddingHorizontal: 28,
        gap: 12,
        marginTop: 28,
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
    brandsWrapper: {
        width: width,
        marginTop: 40,
    },
});
