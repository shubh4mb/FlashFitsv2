import logo from '@/assets/images/logo/logo.png';
import { GenderThemes, Typography } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
    const router = useRouter();
    const { selectedGender } = useGender();
    const theme = GenderThemes[selectedGender] || GenderThemes.Men;
    const insets = useSafeAreaInsets();

    const visionItems = [
        {
            title: 'Empower Retailers',
            desc: 'Turning local retailers into smart fulfillment centers',
            icon: 'storefront-outline' as const,
        },
        {
            title: 'Instant Delivery',
            desc: 'Eliminating the long wait times of traditional eCommerce',
            icon: 'flash-outline' as const,
        },
        {
            title: 'Hybrid Trust',
            desc: 'Online convenience combined with offline confidence',
            icon: 'home-outline' as const,
        },
        {
            title: 'Customer-First',
            desc: 'A future where fashion is instant and personalized',
            icon: 'people-outline' as const,
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: '#fff' }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: theme.primary + '10' }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={theme.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About us</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            >
                {/* Branding Hero */}
                <View style={styles.heroSection}>
                    <Image source={logo} style={styles.heroLogo} resizeMode="contain" />
                    <View style={[styles.taglineBox, { backgroundColor: theme.primary + '0A' }]}>
                        <Text style={[styles.tagline, { color: theme.primary }]}>FASHION IN A FLASH</Text>
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Our Story</Text>
                    <Text style={styles.paragraph}>
                        FlashFits is a next-generation quick commerce platform designed to transform the way people shop for fashion. In a world where speed and convenience define modern lifestyles, FlashFits bridges the gap between instant delivery and personalized fashion experiences.
                    </Text>
                    <Text style={styles.paragraph}>
                        Our platform is built on a simple yet powerful idea — fashion should be fast, accessible, and risk-free. By leveraging a network of local retail stores as fulfillment hubs, FlashFits ensures that customers can receive their favorite outfits within hours, rather than days.
                    </Text>
                    <View style={[styles.highlightBox, { backgroundColor: theme.primary + '05', borderColor: theme.primary + '10' }]}>
                        <Ionicons name="flash" size={20} color={theme.primary} />
                        <Text style={[styles.highlightText, { color: theme.primary }]}>
                            Our "Try & Buy" experience lets you try products at your doorstep before you pay. No uncertainty, just trust.
                        </Text>
                    </View>
                </View>

                {/* Vision Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Our Vision</Text>
                    <Text style={styles.paragraph}>
                        To become the leading quick commerce fashion platform, redefining how people discover, try, and purchase clothing.
                    </Text>
                    <View style={styles.visionGrid}>
                        {visionItems.map((item, index) => (
                            <View key={index} style={styles.visionCard}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.primary + '10' }]}>
                                    <Ionicons name={item.icon} size={20} color={theme.primary} />
                                </View>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardDesc}>{item.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Founders Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Meet the Founders</Text>
                    <View style={styles.foundersContainer}>
                        <View style={[styles.founderCard, { backgroundColor: theme.primary + '05' }]}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                                <Text style={styles.avatarText}>AK</Text>
                            </View>
                            <Text style={styles.founderName}>Antony Efron K M</Text>
                            <Text style={styles.founderRole}>Co-Founder</Text>
                        </View>
                        <View style={[styles.founderCard, { backgroundColor: theme.primary + '05' }]}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                                <Text style={styles.avatarText}>SB</Text>
                            </View>
                            <Text style={styles.founderName}>Shubham Biswas</Text>
                            <Text style={styles.founderRole}>Co-Founder</Text>
                        </View>
                    </View>
                    <Text style={[styles.footerText, { color: theme.primary }]}>
                        Together, they bring a strong vision of combining technology, speed, and user-centric design to reshape the future of fashion.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.bold,
        color: '#1a1a1a',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroLogo: {
        width: 180,
        height: 70,
    },
    taglineBox: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagline: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.extraBold,
        letterSpacing: 2,
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: Typography.fontFamily.extraBold,
        color: '#1a1a1a',
        marginBottom: 16,
    },
    paragraph: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.medium,
        color: '#64748b',
        lineHeight: 24,
        marginBottom: 16,
    },
    highlightBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 12,
        alignItems: 'center',
    },
    highlightText: {
        flex: 1,
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        lineHeight: 20,
    },
    visionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 8,
    },
    visionCard: {
        width: '47%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        color: '#1a1a1a',
        marginBottom: 6,
    },
    cardDesc: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.medium,
        color: '#94a3b8',
        lineHeight: 18,
    },
    foundersContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    founderCard: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.extraBold,
        color: '#fff',
    },
    founderName: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 4,
    },
    founderRole: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.medium,
        color: '#64748b',
    },
    footerText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
        marginTop: 8,
    },
});
