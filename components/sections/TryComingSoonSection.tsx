import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TryComingSoonSection = () => {
    const { selectedGender } = useGender();
    const router = useRouter();
    const theme = GenderThemes[selectedGender] || GenderThemes.Men;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { borderColor: theme.primary.slice(0, 7) + '20' }]}>
                    <LinearGradient
                        colors={[theme.primary.slice(0, 7) + '10', 'rgba(0,0,0,0)']}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="location-outline" size={48} color={theme.primary} />
                    </LinearGradient>
                    <View style={[styles.pulseCircle, { backgroundColor: theme.primary.slice(0, 7) + '10' }]} />
                </View>

                <Text style={styles.title}>Location not serviceable</Text>
                
                <View style={styles.messageContainer}>
                    <Text style={styles.message}>
                        Your current location is not serviceable for Try & Buy.
                    </Text>
                    <Text style={styles.subMessage}>
                        Continue with normal delivery option to explore products available for your area.
                    </Text>
                </View>

                <TouchableOpacity 
                    style={[styles.exploreButton, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/explore')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.exploreButtonText}>Explore Products</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.badge}>
                    <Ionicons name="flash" size={14} color={theme.primary} />
                    <Text style={[styles.badgeText, { color: theme.primary }]}>FASHION IN A FLASH</Text>
                </View>
            </View>
        </View>
    );
};

export default TryComingSoonSection;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 30,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
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
        fontSize: 24,
        fontFamily: Typography.fontFamily.bold,
        color: '#0F172A',
        marginBottom: 16,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    messageContainer: {
        alignItems: 'center',
        marginBottom: 32,
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
        marginTop: 12,
        lineHeight: 20,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    exploreButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: Typography.fontFamily.bold,
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
});
