import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TryComingSoonSection = () => {
    const { selectedGender } = useGender();
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

                <Text style={styles.title}>Coming Soon</Text>
                
                <View style={styles.messageContainer}>
                    <Text style={styles.message}>
                        Try & Buy is not yet available at your location.
                    </Text>
                    <Text style={styles.subMessage}>
                        We're currently serving limited zones and expanding fast to reach you!
                    </Text>
                </View>

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
        fontSize: 28,
        fontFamily: Typography.fontFamily.bold,
        color: '#0F172A',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    messageContainer: {
        alignItems: 'center',
        marginBottom: 40,
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
});
