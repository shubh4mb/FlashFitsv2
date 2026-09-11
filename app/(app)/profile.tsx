import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import logo from '@/assets/images/logo/logo.png';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import Loader from '@/components/common/Loader';
import { useAlert } from '@/context/AlertContext';
import { triggerRateAppPrompt } from '@/hooks/useRateApp';

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const showAlert = useAlert();

    const [loading, setLoading] = useState(true);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const phone = await SecureStore.getItemAsync('phoneNumber');
            setPhoneNumber(phone);
        } catch (error) {
            console.error('Profile data load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        showAlert({
            title: 'Confirm Logout',
            message: 'Are you sure you want to logout?',
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ]
        });
    };

    const menuItems = [
        {
            title: 'Your Orders',
            subtitle: 'Track, return, or buy again',
            icon: 'receipt-outline' as const,
            onPress: () => router.push('/(app)/orders' as any),
        },
        {
            title: 'Saved Addresses',
            subtitle: 'Home, Office & others',
            icon: 'location-outline' as const,
            onPress: () => router.push('/(app)/addresses' as any),
        },
        {
            title: 'Refer & Earn',
            subtitle: 'Invite friends, get Free Delivery',
            icon: 'gift-outline' as const,
            onPress: () => router.push('/(app)/refer-earn' as any),
        },
        {
            title: 'Help & Support',
            subtitle: 'FAQs and customer care',
            icon: 'help-buoy-outline' as const,
            onPress: () => router.push('/(app)/help-center' as any),
        },
        {
            title: 'About Us',
            subtitle: 'Our story and vision',
            icon: 'leaf-outline' as const,
            onPress: () => router.push('/(app)/about' as any),
        },
        {
            title: 'Rate FlashFits',
            subtitle: 'Love the app? Rate us on Play Store',
            icon: 'star-outline' as const,
            onPress: () => triggerRateAppPrompt(),
        },
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Loader size={60} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: BrandColors.offWhite }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header ── */}
            <View style={styles.headerRow}>
                <TouchableOpacity 
                    style={[styles.floatingBackBtn, { backgroundColor: '#F1F5F9' }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={BrandColors.matteBlack} />
                </TouchableOpacity>
                <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
                <View style={{ width: 44 }} />
            </View>

            {/* ── User + Wallet Card ── */}
            <View style={[styles.walletCard, { borderColor: '#F1F5F9', shadowColor: '#000' }]}>
                {/* User row */}
                <View style={styles.userRow}>
                    <View style={[styles.phoneIconCircle, { backgroundColor: BrandColors.matteBlack }]}>
                        <Ionicons name="person" size={22} color="#fff" />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.phoneLabel}>ACCOUNT</Text>
                        <Text style={[styles.phoneText, { color: BrandColors.matteBlack }]}>
                            {phoneNumber ? `+91 ${phoneNumber}` : 'Not available'}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: '#F1F5F9' }]} />

                {/* Wallet row */}
                <View style={styles.walletRow}>
                    <View>
                        <Text style={styles.walletLabel}>WALLET BALANCE</Text>
                        <Text style={styles.walletAmount}>₹0.00</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.addMoneyBtn, { backgroundColor: '#cbd5e1' }]}
                        disabled={true}
                        activeOpacity={1}
                    >
                        <Ionicons name="wallet-outline" size={15} color="#94a3b8" />
                        <Text style={[styles.addMoneyText, { color: '#94a3b8' }]}>ADD MONEY</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Menu List ── */}
            <View style={[styles.menuContainer, { borderColor: '#F1F5F9', shadowColor: '#000' }]}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.menuItem,
                            index < menuItems.length - 1 && {
                                borderBottomWidth: 1,
                                borderBottomColor: '#F1F5F9',
                            },
                        ]}
                        activeOpacity={0.6}
                        onPress={item.onPress}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' }]}>
                            <Ionicons name={item.icon} size={20} color={BrandColors.matteBlack} />
                        </View>
                        <View style={styles.menuTextBox}>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Logout ── */}
            <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: '#F1F5F9', shadowColor: '#000' }]}
                activeOpacity={0.7}
                onPress={handleLogout}
            >
                <MaterialIcons name="logout" size={20} color={BrandColors.matteBlack} />
                <Text style={[styles.logoutText, { color: BrandColors.matteBlack }]}>LOG OUT</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Image source={logo} style={styles.footerLogo} blurRadius={3} resizeMode="contain" />
                <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                <Text style={styles.versionText}>MADE IN KERALA 🌴</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },

    // ── User + Wallet Card
    walletCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1.5,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    phoneIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 14,
    },
    phoneLabel: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    phoneText: {
        fontSize: 17,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        marginVertical: 18,
    },
    walletRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    walletLabel: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    walletAmount: {
        fontSize: 28,
        fontFamily: Typography.fontFamily.extraBold,
        color: '#1a1a1a',
    },
    addMoneyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    addMoneyText: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.bold,
        color: '#fff',
        letterSpacing: 0.8,
    },

    // ── Menu
    menuContainer: {
        backgroundColor: '#fff',
        marginTop: 20,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTextBox: {
        flex: 1,
        marginLeft: 14,
    },
    menuTitle: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.bold,
        color: '#1a1a1a',
    },
    menuSubtitle: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.regular,
        color: '#94a3b8',
        marginTop: 2,
    },

    // ── Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#fff',
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    logoutText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 1,
    },

    // ── Footer
    footer: {
        alignItems: 'center',
        marginTop: 28,
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
    floatingBackBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLogo: {
        width: 150,
        height: 60,
    },
});
