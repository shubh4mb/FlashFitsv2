import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
import logo from '@/assets/images/logo/logo.png';
import BrandFooter from '@/components/common/BrandFooter';
import { useAuth } from '@/context/AuthContext';
import { BrandColors, Typography } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { triggerRateAppPrompt } from '@/hooks/useRateApp';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const showAlert = useAlert();
    const insets = useSafeAreaInsets();

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

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: BrandColors.offWhite }]}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }
            ]}
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
});
