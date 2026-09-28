import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import logo from '@/assets/images/logo/logo.png';
import BrandFooter from '@/components/common/BrandFooter';
import { useAuth } from '@/context/AuthContext';
import { BrandColors, Typography } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { triggerRateAppPrompt } from '@/hooks/useRateApp';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteUserAccount } from '@/api/auth';

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut, user, refreshUserProfile } = useAuth();
    const showAlert = useAlert();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        refreshUserProfile().catch(() => {});
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshUserProfile();
        setRefreshing(false);
    };

    const displayName = user?.name?.trim() || (user?.email ? user.email.split('@')[0] : 'FlashFits Member');
    const displayEmail = user?.email || 'No email registered';
    const displayPhone = user?.phoneNumber ? `+91 ${user.phoneNumber.replace(/^(\+91|91)/, '')}` : null;

    const getInitials = (name?: string) => {
        if (!name || !name.trim()) return 'FF';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.trim().slice(0, 2).toUpperCase();
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

    const handleDeleteAccount = () => {
        showAlert({
            title: 'Delete Account',
            message: 'Are you sure you want to permanently delete your FlashFits account? This action cannot be undone. All your saved addresses, orders, and personal data will be erased.',
            type: 'error',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUserAccount();
                            await signOut();
                        } catch (error: any) {
                            showAlert({
                                title: 'Error',
                                message: error?.response?.data?.message || 'Failed to delete account. Please try again later.',
                                type: 'error',
                                buttons: [{ text: 'OK' }]
                            });
                        }
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
            title: 'Terms of Service',
            subtitle: 'Try & Buy protocol, return rules, service terms',
            icon: 'document-text-outline' as const,
            onPress: () => WebBrowser.openBrowserAsync('https://www.theflashfits.com/terms-of-service'),
        },
        {
            title: 'Privacy Policy',
            subtitle: 'Customer data & DPDP Act 2023 notice',
            icon: 'shield-checkmark-outline' as const,
            onPress: () => WebBrowser.openBrowserAsync('https://www.theflashfits.com/privacy-policy'),
        },
        {
            title: 'Rate FlashFits',
            subtitle: Platform.OS === 'ios' ? 'Love the app? Rate us on App Store' : 'Love the app? Rate us on Play Store',
            icon: 'star-outline' as const,
            onPress: () => triggerRateAppPrompt(),
        },
    ];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: BrandColors.offWhite }]}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={BrandColors.primary}
                    colors={[BrandColors.primary]}
                />
            }
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

            {/* ── User Account Details Card ── */}
            <View style={styles.profileCard}>
                <View style={styles.profileCardTop}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {user?.profilePicture ? (
                            <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarInitialsBox}>
                                <Text style={styles.avatarInitialsText}>{getInitials(user?.name)}</Text>
                            </View>
                        )}
                        <View style={styles.avatarBadgeDot} />
                    </View>

                    {/* Name & Primary Info */}
                    <View style={styles.profileInfoBox}>
                        <View style={styles.nameRow}>
                            <Text style={styles.profileName} numberOfLines={1}>
                                {displayName}
                            </Text>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={15} color={BrandColors.primary} />
                            </View>
                        </View>

                        {/* Email Row */}
                        <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={13} color="#64748B" />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {displayEmail}
                            </Text>
                        </View>

                        {/* Phone Row (if available) */}
                        {displayPhone && (
                            <View style={styles.detailRow}>
                                <Ionicons name="call-outline" size={13} color="#64748B" />
                                <Text style={styles.detailText}>
                                    {displayPhone}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Micro Status Footer */}
                <View style={styles.profileCardFooter}>
                    <View style={styles.statusPill}>
                        <View style={styles.statusPillDot} />
                        <Text style={styles.statusPillText}>Try & Buy Active</Text>
                    </View>
                    <View style={styles.memberTag}>
                        <Ionicons name="sparkles" size={11} color={BrandColors.cyanDeep} />
                        <Text style={styles.memberTagText}>MEMBER</Text>
                    </View>
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

            {/* ── Delete Account (Apple Guideline 5.1.1(v)) ── */}
            <TouchableOpacity
                style={styles.deleteAccountBtn}
                activeOpacity={0.7}
                onPress={handleDeleteAccount}
            >
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>

            <BrandFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
    },
    // ── User Profile Card
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
        elevation: 3,
        marginBottom: 4,
    },
    profileCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatarInitialsBox: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: BrandColors.softCyan,
        borderWidth: 1.5,
        borderColor: BrandColors.softCyanBorder,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarInitialsText: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.extraBold,
        color: BrandColors.cyanDeep,
        letterSpacing: 0.5,
    },
    avatarImage: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    avatarBadgeDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    profileInfoBox: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
    },
    profileName: {
        fontSize: 17,
        fontFamily: Typography.fontFamily.extraBold,
        color: BrandColors.matteBlack,
        letterSpacing: -0.3,
    },
    verifiedBadge: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    detailText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.medium,
        color: '#64748B',
        flex: 1,
    },
    profileCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statusPillDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: BrandColors.primary,
    },
    statusPillText: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.bold,
        color: '#475569',
        letterSpacing: 0.2,
    },
    memberTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: BrandColors.softCyan,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BrandColors.softCyanBorder,
    },
    memberTagText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.extraBold,
        color: BrandColors.cyanDeep,
        letterSpacing: 0.8,
    },

    // ── Menu
    menuContainer: {
        backgroundColor: '#fff',
        marginTop: 16,
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
    // ── Delete Account
    deleteAccountBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 14,
        marginBottom: 8,
        paddingVertical: 10,
    },
    deleteAccountText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.medium,
        color: '#EF4444',
    },
});
