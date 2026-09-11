import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORY_GAP = 16;
// Calculate item width to show exactly 4.3 items (4 full + peek of 5th)
const CATEGORY_ITEM_WIDTH = (SCREEN_WIDTH - 32 - (CATEGORY_GAP * 4)) / 4.3;
const LOGO_SIZE = CATEGORY_ITEM_WIDTH * 0.95; // Slightly smaller than container

const KEYWORDS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets'];

import { useCart } from "@/context/CartContext";
import { useCampaign } from "@/context/CampaignContext";
import { useCourierCart } from "@/context/CourierCartContext";
import { useWishlist } from "@/context/WishlistContext";
import { fetchCategories } from "../../api/categories";
import { BrandColors, GenderThemes, Typography } from "../../constants/theme";
import { useAddress } from "../../context/AddressContext";
import { Gender, useGender } from "../../context/GenderContext";
import Skeleton from "../common/Skeleton";

const GENDER_CONFIG: Record<Gender, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
    Men: { icon: 'male', label: 'Men' },
    Women: { icon: 'female', label: 'Women' },
    Kids: { icon: 'sparkles', label: 'Kids' },
};

interface MainHeaderProps {
    cartCount?: number;
    wishlistCount?: number;
    hideCategories?: boolean;
    scrollY?: Animated.Value;
    onHeaderLayout?: (height: number) => void;
    refreshKey?: number;
}

const SCROLL_DISTANCE = 75;

const capitalize = (str?: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function MainHeader({ hideCategories = false, scrollY, onHeaderLayout, refreshKey }: MainHeaderProps) {
    const { cart } = useCart();
    const { courierCart } = useCourierCart();
    const { wishlistIds } = useWishlist();

    const instantCartCount = cart?.merchantCarts?.length || 0;
    const courierCartCount = courierCart?.items?.length || 0;
    const totalCartCount = instantCartCount + courierCartCount;
    const totalWishlistCount = wishlistIds?.length || 0;

    const router = useRouter();
    const {
        locationAddress,
        deliveryAvailable,
        locationLoading,
        detectLocation,
        locationPermission,
        selectedAddress,
        tbAvailable,
        isLocationOff,
        openAddressModal,
    } = useAddress();

    const insets = useSafeAreaInsets();

    const [keywordIndex, setKeywordIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const { selectedGender, setSelectedGender, selectedSubGender, setSelectedSubGender } = useGender();
    const { activeCampaign, hasCampaign, campaignTheme } = useCampaign();
    const genders: Gender[] = ['Men', 'Women', 'Kids'];
    const theme = GenderThemes[selectedGender] || GenderThemes.Men;

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Category Continuous Glide + Manual Swipe
    const categoryScrollRef = useRef<ScrollView>(null);
    const scrollPosRef = useRef(0);
    const isInteractingRef = useRef(false);
    const resumeTimeoutRef = useRef<any>(null);
    const categoryFadeAnim = useRef(new Animated.Value(1)).current;

    const visibleCategories = categories.filter((cat) => {
        const genderKey = selectedGender.toUpperCase();
        return cat.allowedGenders ? cat.allowedGenders.includes(genderKey) : true;
    });

    const scheduleResume = (delay = 1500) => {
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
            isInteractingRef.current = false;
        }, delay);
    };

    const handleUserInteractionStart = () => {
        isInteractingRef.current = true;
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };

    useEffect(() => {
        const loadCategories = async () => {
            try {
                setLoading(true);
                const response = await fetchCategories();
                // Based on axiosConfig's response unwrapper, response is already the data object
                const allCategories = response?.categories || [];
                // Filter only level 0 (top-level) and active categories
                const topLevel = allCategories.filter((cat: any) => cat.level === 0 && cat.isActive);
                setCategories(topLevel);
                if (topLevel.length > 0) {
                    setSelectedCategoryId(topLevel[0]._id);
                }
            } catch (error) {
                console.error("Failed to load categories:", error);
            } finally {
                setLoading(false);
            }
        };

        loadCategories();
    }, [refreshKey]);

    useEffect(() => {
        // Reset scroll position on gender switch
        scrollPosRef.current = 0;
        categoryScrollRef.current?.scrollTo({ x: 0, animated: false });

        categoryFadeAnim.setValue(0);
        Animated.timing(categoryFadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
        }).start();
    }, [selectedGender]);

    // Continuous auto-glide that seamlessly pauses during manual swipe and resumes
    useEffect(() => {
        if (loading || visibleCategories.length === 0) return;

        const singleSetWidth = visibleCategories.length * (CATEGORY_ITEM_WIDTH + CATEGORY_GAP);
        if (singleSetWidth <= 0) return;

        const interval = setInterval(() => {
            if (isInteractingRef.current) return;

            let nextX = scrollPosRef.current + 0.65; // ~26px per second smooth flow
            if (nextX >= singleSetWidth * 2) {
                nextX = nextX - singleSetWidth;
            } else if (nextX < 0) {
                nextX = nextX + singleSetWidth;
            }
            scrollPosRef.current = nextX;
            categoryScrollRef.current?.scrollTo({ x: nextX, animated: false });
        }, 25);

        return () => {
            clearInterval(interval);
            if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        };
    }, [loading, visibleCategories.length, selectedGender]);

    // Gradient transition
    const gradientAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(gradientAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
        }).start();
    }, [selectedGender]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Slide out + fade out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -12,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setKeywordIndex((prev) => (prev + 1) % KEYWORDS.length);
                // Reset position below
                slideAnim.setValue(12);
                // Slide in + fade in
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        tension: 80,
                        friction: 12,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [fadeAnim, slideAnim]);

    const TOP_OFFSET = 54;

    const headerTranslate = scrollY ? scrollY.interpolate({
        inputRange: [0, 10000],
        outputRange: [0, -10000],
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
    }) : 0;

    const topRowOpacity = scrollY ? scrollY.interpolate({
        inputRange: [0, TOP_OFFSET * 0.7],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    }) : 1;

    const stickyCounterY = scrollY ? scrollY.interpolate({
        inputRange: [0, TOP_OFFSET, TOP_OFFSET + 1],
        outputRange: [0, 0, 1],
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend'
    }) : 0;

    const stickyBgOpacity = scrollY ? scrollY.interpolate({
        inputRange: [TOP_OFFSET, TOP_OFFSET + 20],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    }) : 0;



    return (
        <Animated.View
            style={[
                styles.stickyWrapper,
                {
                    transform: [{ translateY: headerTranslate }],
                    zIndex: 100,
                }
            ]}
            onLayout={(e) => onHeaderLayout?.(e.nativeEvent.layout.height)}
        >
            <LinearGradient
                colors={[theme?.primary || '#011441', '#FFFFFF', '#FFFFFF']} // Fade to white
                locations={[0, 0.7, 1]} // Reaches white by approx 70% height
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.container, { paddingTop: insets.top + 10 }]}
            >
                {/* Decorative blurred orb */}
                {/* <View style={styles.decorativeOrb} /> */}

                {/* ── Top Row: Location & Icons ── */}
                <Animated.View style={[styles.topRow, { opacity: topRowOpacity, elevation: 12, zIndex: 20 }]}>
                    <TouchableOpacity
                        style={styles.locationContainer}
                        activeOpacity={0.6}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            openAddressModal();
                        }}
                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    >
                        <View style={styles.locationPin} pointerEvents="none">
                            <Ionicons name="location" size={18} color={theme.text} />
                        </View>
                        <View style={styles.addressInfo} pointerEvents="none">
                            {/* Top row: Status */}
                            <View style={styles.statusRow} pointerEvents="none">
                                {(!locationLoading && (deliveryAvailable !== null || selectedAddress)) ? (
                                    <>
                                        <View style={[styles.statusDot, { backgroundColor: deliveryAvailable ? '#10B981' : '#F59E0B' }]} pointerEvents="none" />
                                        <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1} pointerEvents="none">
                                            {tbAvailable ? 'Try in 60 mins' : (deliveryAvailable === false ? 'Try & Buy Unavailable' : 'FlashFits Delivery')}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1} pointerEvents="none">
                                        {locationLoading ? 'Locating...' : 'FlashFits Delivery'}
                                    </Text>
                                )}
                            </View>

                            {/* Bottom row: Address */}
                            <Text style={[styles.subText, { color: theme.text }]} numberOfLines={1} pointerEvents="none">
                                {selectedAddress
                                    ? `${capitalize(selectedAddress.addressType)} - ${selectedAddress.addressLine1}`
                                    : locationLoading
                                        ? 'Fetching your location...'
                                        : isLocationOff || locationPermission !== 'granted'
                                            ? 'Select delivery location'
                                            : (locationAddress || 'Tap to select delivery location')}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={16} color={theme.text} style={{ marginLeft: 6 }} pointerEvents="none" />
                    </TouchableOpacity>

                    <View style={styles.actionIcons}>

                        {/* Wishlist Button */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push("/(app)/wishlist" as any);
                            }}
                            hitSlop={{ top: 18, bottom: 18, left: 10, right: 10 }}
                        >
                            <View style={styles.iconWrapper} pointerEvents="none">
                                <MaterialCommunityIcons name="heart-outline" size={20} color={theme.text} />
                                {totalWishlistCount > 0 && (
                                    <View style={[styles.badgeContainer, styles.topRightBadge]} pointerEvents="none">
                                        <Text style={[styles.badgeText, { color: theme.text }]}>
                                            {totalWishlistCount > 99 ? '99+' : totalWishlistCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Cart Button */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push("/cart" as any);
                            }}
                            hitSlop={{ top: 18, bottom: 18, left: 10, right: 10 }}
                        >
                            <View style={styles.iconWrapper} pointerEvents="none">
                                <MaterialCommunityIcons name="shopping-outline" size={20} color={theme.text} />

                                {/* Instant Cart Badge (Top Right) */}
                                {instantCartCount > 0 && (
                                    <View style={[styles.badgeContainer, styles.topRightBadge, { right: -8, paddingLeft: 2 }]} pointerEvents="none">
                                        <Text style={[styles.badgeText, { color: theme.text }]}>
                                            {instantCartCount > 99 ? '99+' : instantCartCount}
                                        </Text>
                                        <Ionicons name="flash" size={8} color={theme.text} style={{ marginLeft: 0.5 }} />
                                    </View>
                                )}

                                {/* Courier Cart Badge (Top Right if instant is 0, Bottom Right if both exist) */}
                                {courierCartCount > 0 && (
                                    <View
                                        style={[
                                            styles.badgeContainer,
                                            instantCartCount > 0 ? styles.bottomRightBadge : styles.topRightBadge,
                                        ]}
                                        pointerEvents="none"
                                    >
                                        <Text style={[styles.badgeText, { color: theme.text }]}>
                                            {courierCartCount > 99 ? '99+' : courierCartCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Menu / Profile Button */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push("/(app)/profile" as any);
                            }}
                            hitSlop={{ top: 18, bottom: 18, left: 10, right: 14 }}
                        >
                            <View style={styles.iconWrapper} pointerEvents="none">
                                <MaterialCommunityIcons name="menu" size={22} color={theme.text} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Sticky Section Header ── */}
                <Animated.View
                    style={{ transform: [{ translateY: stickyCounterY }], zIndex: 10, elevation: 10 }}
                    pointerEvents="box-none"
                >
                    {/* Opaque Background for Sticky Section */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: -insets.top - 10,
                            bottom: -15,
                            left: -16,
                            right: -16,
                            opacity: stickyBgOpacity,
                            ...Platform.select({
                                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
                                android: { elevation: 8 }
                            }),
                        }}
                        pointerEvents="none"
                    >
                        <LinearGradient
                            colors={[theme?.primary || '#011441', '#FFFFFF', '#FFFFFF']}
                            locations={[0, 0.7, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    </Animated.View>

                    {/* ── Search Bar ── */}
                    <TouchableOpacity
                        style={styles.searchBar}
                        activeOpacity={0.85}
                        onPress={() => router.push("/search" as any)}
                    >
                        <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                        <View style={styles.searchTextContainer}>
                            <Text style={styles.staticSearchText}>Try </Text>
                            <Animated.Text
                                style={[
                                    styles.animatedSearchText,
                                    {
                                        opacity: fadeAnim,
                                        transform: [{ translateY: slideAnim }],
                                    },
                                ]}
                            >
                                "{KEYWORDS[keywordIndex]}"
                            </Animated.Text>
                            <Text style={styles.staticSearchText}> at your Home! </Text>

                        </View>
                        {hasCampaign && activeCampaign?.badgeText ? (
                            <View style={[styles.campaignSearchBadge, { backgroundColor: campaignTheme?.bgGradientEnd || '#FEF3C7' }]}>
                                <Text style={[styles.campaignSearchBadgeText, { color: campaignTheme?.textColor || '#78350F' }]}>
                                    {activeCampaign.badgeText}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.micButton}>
                                <MaterialCommunityIcons name="microphone-outline" size={16} color="#64748B" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* ── Compact & Professional Gender Switcher ── */}
                    <View style={styles.genderContainer}>
                        {/* Primary Segments: MEN | WOMEN | KIDS */}
                        <View style={styles.mainGenderTrack}>
                            {genders.map((g) => {
                                const isActive = selectedGender === g;
                                return (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedGender(g);
                                        }}
                                        style={[
                                            styles.genderButton,
                                            isActive && styles.genderButtonActive,
                                        ]}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                styles.genderText,
                                                isActive ? styles.genderTextActive : styles.genderTextInactive,
                                            ]}
                                        >
                                            {g.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Integrated Sub-Selector for Kids: ALL | BOYS | GIRLS */}
                        {selectedGender === 'Kids' && (
                            <View style={styles.subGenderTrack}>
                                <View style={styles.subGenderDivider} />
                                <View style={styles.subGenderPillRow}>
                                    {(['All', 'Boys', 'Girls'] as const).map((sg) => {
                                        const isSgActive = selectedSubGender === sg;
                                        return (
                                            <TouchableOpacity
                                                key={sg}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedSubGender(sg);
                                                }}
                                                style={[
                                                    styles.subGenderPill,
                                                    isSgActive && styles.subGenderPillActive,
                                                ]}
                                                activeOpacity={0.7}
                                            >
                                                <Text
                                                    style={[
                                                        styles.subGenderText,
                                                        isSgActive && styles.subGenderTextActive,
                                                    ]}
                                                >
                                                    {sg === 'All' ? 'ALL KIDS' : sg.toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* ── Category List with Smooth Continuous Glide + Manual Swipe ── */}
                {!hideCategories && (
                    <Animated.View
                        style={{
                            opacity: categoryFadeAnim,
                            marginTop: 10,
                        }}
                    >
                        <ScrollView
                            ref={categoryScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoriesContainer}
                            scrollEventThrottle={16}
                            onScroll={(e) => {
                                scrollPosRef.current = e.nativeEvent.contentOffset.x;
                            }}
                            onTouchStart={handleUserInteractionStart}
                            onTouchEnd={() => scheduleResume(1500)}
                            onTouchCancel={() => scheduleResume(1500)}
                            onScrollBeginDrag={handleUserInteractionStart}
                            onScrollEndDrag={(e) => {
                                scrollPosRef.current = e.nativeEvent.contentOffset.x;
                                scheduleResume(1500);
                            }}
                            onMomentumScrollBegin={handleUserInteractionStart}
                            onMomentumScrollEnd={(e) => {
                                scrollPosRef.current = e.nativeEvent.contentOffset.x;
                                scheduleResume(1500);
                            }}
                        >
                            {loading
                                ? [1, 2, 3, 4, 5].map((i) => (
                                    <View key={i} style={styles.categoryItem}>
                                        <Skeleton width={LOGO_SIZE} height={LOGO_SIZE} borderRadius={16} style={{ marginBottom: 4 }} />
                                        <Skeleton width={CATEGORY_ITEM_WIDTH * 0.7} height={10} />
                                    </View>
                                ))
                                : [...visibleCategories, ...visibleCategories, ...visibleCategories].map((cat, idx) => {
                                    const isActive = selectedCategoryId === cat._id;
                                    const genderKey = selectedGender.toUpperCase() as 'MEN' | 'WOMEN' | 'KIDS';
                                    const logoUrl = cat.logos?.[genderKey]?.url || cat.logo?.url || cat.image?.url;

                                    return (
                                        <TouchableOpacity
                                            key={`${cat._id}-${idx}`}
                                            style={styles.categoryItem}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                router.push({
                                                    pathname: '/search-results' as any,
                                                    params: {
                                                        categoryId: cat._id,
                                                        gender: selectedGender.toUpperCase(),
                                                    }
                                                });
                                            }}
                                        >
                                            <View style={[styles.logoWrapper, isActive && styles.logoWrapperActive]}>
                                                {logoUrl ? (
                                                    <Animated.Image
                                                        source={{ uri: logoUrl }}
                                                        style={styles.categoryLogo}
                                                        resizeMode="contain"
                                                    />
                                                ) : (
                                                    <View style={styles.placeholderLogo}>
                                                        <Text style={styles.placeholderText}>{cat.name[0]}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.categoryName, { color: 'grey' }]} numberOfLines={1}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })
                            }
                        </ScrollView>
                    </Animated.View>
                )}
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    stickyWrapper: {
        position: 'absolute',
        top: -4,
        left: 0,
        right: 0,

    },
    container: {
        paddingHorizontal: 16,
        // paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    decorativeOrb: {
        position: 'absolute',
        right: 20,
        top: 30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.04)',
        ...Platform.select({
            ios: {
                shadowColor: '#fff',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.05,
                shadowRadius: 40,
            },
        }),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    locationPin: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    addressInfo: {
        marginRight: 4,
        flexShrink: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.1,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 6,
    },
    subText: {
        fontSize: 10.5,
        fontFamily: Typography.fontFamily.medium,
        opacity: 0.6,
        marginTop: 1,
        letterSpacing: 0.1,
    },
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        padding: 2,
    },
    iconWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    badgeContainer: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.extraBold,
        letterSpacing: -0.3,
        lineHeight: 11,
    },
    topRightBadge: {
        top: -3,
        right: -6,
    },
    bottomRightBadge: {
        bottom: -3,
        right: -6,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.93)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    searchTextContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    staticSearchText: {
        fontSize: 13,
        color: '#94A3B8',
        fontFamily: Typography.fontFamily.regular,
    },
    animatedSearchText: {
        fontSize: 13,
        color: '#1E293B',
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.1,
    },
    micButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(148,163,184,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    campaignSearchBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    campaignSearchBadgeText: {
        fontSize: 8,
        fontFamily: Typography.fontFamily.extraBold,
        letterSpacing: 0.3,
    },
    genderContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 3,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
            },
            android: {
                elevation: 1.5,
            },
        }),
    },
    mainGenderTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    genderButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
    },
    genderButtonActive: {
        backgroundColor: BrandColors.matteBlack,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    genderText: {
        fontSize: 11.5,
        letterSpacing: 0.8,
    },
    genderTextActive: {
        color: '#FFFFFF',
        fontFamily: Typography.fontFamily.extraBold,
    },
    genderTextInactive: {
        color: '#64748B',
        fontFamily: Typography.fontFamily.semiBold,
    },
    subGenderTrack: {
        paddingTop: 4,
        paddingBottom: 2,
    },
    subGenderDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 4,
        marginHorizontal: 2,
    },
    subGenderPillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 2,
    },
    subGenderPill: {
        flex: 1,
        paddingVertical: 4.5,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    subGenderPillActive: {
        backgroundColor: BrandColors.matteBlack,
        borderColor: BrandColors.matteBlack,
    },
    subGenderText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        color: '#64748B',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    subGenderTextActive: {
        color: '#FFFFFF',
    },
    categoriesContainer: {
        paddingRight: 16,
        gap: CATEGORY_GAP,
    },
    categoryItem: {
        alignItems: 'center',
        gap: 2,
        width: CATEGORY_ITEM_WIDTH,
    },
    logoWrapper: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: 16,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    logoWrapperActive: {
        // No border or background for active state as per request
    },
    categoryLogo: {
        width: '100%',
        height: '100%',
        zIndex: 2,
    },
    placeholderLogo: {
        width: '150%',
        height: '150%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderRadius: 16,
    },
    placeholderText: {
        fontSize: 24,
        fontFamily: Typography.fontFamily.bold,
        color: '#fff',
        opacity: 0.5,
    },
    categoryName: {
        fontSize: 8.5,
        fontFamily: Typography.fontFamily.serifSemiBold,
        textAlign: 'center',
        opacity: 0.85,
        marginBottom: 8,
    },
    categoryNameActive: {
        fontFamily: Typography.fontFamily.serifBold,
        opacity: 1,
    },
});
