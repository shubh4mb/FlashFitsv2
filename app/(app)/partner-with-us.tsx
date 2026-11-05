import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Linking,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logo from '@/assets/images/logo/logo.png';
import { BrandColors, Typography } from '@/constants/theme';

export const MERCHANT_PARTNER_URL = 'https://www.theflashfits.com/merchant';

export default function PartnerWithUsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleOpenMerchantWeb = async () => {
        try {
            await WebBrowser.openBrowserAsync(MERCHANT_PARTNER_URL, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                toolbarColor: BrandColors.surface,
                controlsColor: BrandColors.primary,
            });
        } catch {
            Linking.openURL(MERCHANT_PARTNER_URL).catch(() => {});
        }
    };

    const highlights = [
        {
            icon: 'trending-up-outline' as const,
            title: 'Boost Local Walk-ins & Sales',
            desc: 'Connect with shoppers within 5-10 km searching for outfits right now.',
        },
        {
            icon: 'flash-outline' as const,
            title: 'Hyperlocal 30-60 Min Delivery',
            desc: 'Our delivery fleet picks up directly from your counter—zero delivery hassle.',
        },
        {
            icon: 'shirt-outline' as const,
            title: 'Doorstep Try & Buy Enabled',
            desc: 'Higher order conversions as buyers try sizes with confidence at doorstep.',
        },
        {
            icon: 'cube-outline' as const,
            title: 'Zero Extra Warehousing',
            desc: 'Sell existing rack inventory seamlessly without tying up fresh stock.',
        },
        {
            icon: 'wallet-outline' as const,
            title: 'Swift Settlement & Insights',
            desc: 'Transparent payout cycles, catalog analytics, and dedicated support.',
        },
    ];

    const steps = [
        {
            num: '01',
            title: 'Register your store',
            desc: 'Submit basic boutique details on our portal. Our onboarding team activates your store.',
        },
        {
            num: '02',
            title: 'Sync your inventory',
            desc: 'List catalog items with available sizes and colors via the merchant dashboard.',
        },
        {
            num: '03',
            title: 'Pack & dispatch',
            desc: 'Receive instant orders, pack the items, and hand over to our FlashFits rider.',
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: BrandColors.surface }]}>
            {/* ── Top Header ── */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={24} color={BrandColors.matteBlack} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Partner With Us</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* ── Hero Banner ── */}
                <View style={styles.heroCard}>
                    <View style={styles.brandRow}>
                        <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
                        <View style={styles.partnerBadge}>
                            <Ionicons name="sparkles" size={11} color={BrandColors.cyanDeep} />
                            <Text style={styles.partnerBadgeText}>MERCHANT NETWORK</Text>
                        </View>
                    </View>

                    <Text style={styles.heroHeading}>Turn Your Fashion Store into a Quick-Commerce Hub</Text>
                    <Text style={styles.heroSubheading}>
                        Join FlashFits as a retail partner. Deliver your clothes to nearby buyers in 30–60 minutes with Doorstep Try & Buy.
                    </Text>

                    <TouchableOpacity
                        style={styles.heroCtaBtn}
                        activeOpacity={0.88}
                        onPress={handleOpenMerchantWeb}
                    >
                        <Text style={styles.heroCtaText}>Become a Partner</Text>
                        <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* ── Key Highlights / Benefits ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionOverline}>WHY PARTNER WITH US</Text>
                    <Text style={styles.sectionTitle}>Built to grow local fashion retailers</Text>

                    <View style={styles.highlightList}>
                        {highlights.map((item, index) => (
                            <View key={index} style={styles.highlightCard}>
                                <View style={styles.highlightIconBox}>
                                    <Ionicons name={item.icon} size={22} color={BrandColors.primary} />
                                </View>
                                <View style={styles.highlightTextBox}>
                                    <Text style={styles.highlightTitle}>{item.title}</Text>
                                    <Text style={styles.highlightDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── How It Works Steps ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionOverline}>HOW IT WORKS</Text>
                    <Text style={styles.sectionTitle}>Start selling in 3 simple steps</Text>

                    <View style={styles.stepsContainer}>
                        {steps.map((s, idx) => (
                            <View key={idx} style={styles.stepItem}>
                                <View style={styles.stepNumBox}>
                                    <Text style={styles.stepNum}>{s.num}</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>{s.title}</Text>
                                    <Text style={styles.stepDesc}>{s.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Web Portal Redirect Teaser Card ── */}
                <View style={styles.redirectCard}>
                    <View style={styles.redirectIconPill}>
                        <Ionicons name="globe-outline" size={24} color={BrandColors.primary} />
                    </View>
                    <Text style={styles.redirectTitle}>Visit Merchant Portal Online</Text>
                    <Text style={styles.redirectDesc}>
                        View full partner perks, commission breakdown, and complete onboarding on our official website portal.
                    </Text>
                    <TouchableOpacity
                        style={styles.redirectBtn}
                        activeOpacity={0.85}
                        onPress={handleOpenMerchantWeb}
                    >
                        <Text style={styles.redirectBtnText}>Open Merchant Website</Text>
                        <Ionicons name="arrow-forward" size={16} color={BrandColors.matteBlack} />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* ── Fixed Bottom CTA Floating Bar ── */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                <View style={styles.bottomBarLeft}>
                    <Text style={styles.bottomBarLabel}>Ready to expand?</Text>
                    <Text style={styles.bottomBarSub}>Join 500+ local brands</Text>
                </View>
                <TouchableOpacity
                    style={styles.floatingCta}
                    activeOpacity={0.9}
                    onPress={handleOpenMerchantWeb}
                >
                    <Text style={styles.floatingCtaText}>Join as Partner</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
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
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: Typography.fontFamily.semiBold,
        color: BrandColors.matteBlack,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    heroCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 28,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    brandLogo: {
        width: 120,
        height: 36,
    },
    partnerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: BrandColors.softCyan,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BrandColors.softCyanBorder,
    },
    partnerBadgeText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.cyanDeep,
        letterSpacing: 0.8,
    },
    heroHeading: {
        fontSize: 22,
        fontFamily: Typography.fontFamily.extraBold,
        color: BrandColors.matteBlack,
        lineHeight: 28,
        marginBottom: 10,
    },
    heroSubheading: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.regular,
        color: '#64748B',
        lineHeight: 21,
        marginBottom: 20,
    },
    heroCtaBtn: {
        backgroundColor: BrandColors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 8,
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    heroCtaText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.bold,
        color: '#FFFFFF',
    },
    section: {
        marginBottom: 28,
    },
    sectionOverline: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.cyanDeep,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: Typography.fontFamily.extraBold,
        color: BrandColors.matteBlack,
        marginBottom: 16,
    },
    highlightList: {
        gap: 12,
    },
    highlightCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    highlightIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: BrandColors.softCyan,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: BrandColors.softCyanBorder,
    },
    highlightTextBox: {
        flex: 1,
    },
    highlightTitle: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.matteBlack,
        marginBottom: 4,
    },
    highlightDesc: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.regular,
        color: '#64748B',
        lineHeight: 18,
    },
    stepsContainer: {
        gap: 12,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 14,
    },
    stepNumBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    stepNum: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.primary,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.matteBlack,
        marginBottom: 4,
    },
    stepDesc: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.regular,
        color: '#64748B',
        lineHeight: 18,
    },
    redirectCard: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 22,
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    redirectIconPill: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    redirectTitle: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.bold,
        color: '#FFFFFF',
        marginBottom: 6,
    },
    redirectDesc: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.regular,
        color: '#94A3B8',
        lineHeight: 19,
        marginBottom: 18,
    },
    redirectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        gap: 8,
    },
    redirectBtnText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.matteBlack,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingHorizontal: 20,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    bottomBarLeft: {
        flex: 1,
        marginRight: 12,
    },
    bottomBarLabel: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        color: BrandColors.matteBlack,
    },
    bottomBarSub: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.regular,
        color: '#64748B',
    },
    floatingCta: {
        backgroundColor: BrandColors.matteBlack,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        gap: 8,
    },
    floatingCtaText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        color: '#FFFFFF',
    },
});
