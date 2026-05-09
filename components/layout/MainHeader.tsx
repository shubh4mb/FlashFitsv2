import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORY_GAP = 16;
// Calculate item width to show exactly 4.3 items (4 full + peek of 5th)
const CATEGORY_ITEM_WIDTH = (SCREEN_WIDTH - 32 - (CATEGORY_GAP * 4)) / 4.3;
const LOGO_SIZE = CATEGORY_ITEM_WIDTH * 0.95; // Slightly smaller than container
import { useSafeAreaInsets } from "react-native-safe-area-context";

const KEYWORDS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets'];

import { useCart } from "@/context/CartContext";
import { useCourierCart } from "@/context/CourierCartContext";
import { fetchCategories } from "../../api/categories";
import { GenderThemes, Typography } from "../../constants/theme";
import { useAddress } from "../../context/AddressContext";
import { Gender, useGender } from "../../context/GenderContext";
import Skeleton from "../common/Skeleton";
import AddressSelectorModal from "../common/AddressSelectorModal";

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

    const instantCartCount = cart?.merchantCarts?.length || 0;
    const courierCartCount = courierCart?.items?.length || 0;
    const totalCartCount = instantCartCount + courierCartCount;

    const router = useRouter();
    const { 
        locationAddress, 
        deliveryAvailable, 
        locationLoading, 
        detectLocation, 
        locationPermission,
        selectedAddress,
        tbAvailable,
    } = useAddress();

    const insets = useSafeAreaInsets();

    const [keywordIndex, setKeywordIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const { selectedGender, setSelectedGender } = useGender();
    const genders: Gender[] = ['Men', 'Women', 'Kids'];
    const theme = GenderThemes[selectedGender] || GenderThemes.Men;

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [addressModalVisible, setAddressModalVisible] = useState(false);

    // 3D Gender Switcher animations
    const genderAnim = useRef(new Animated.Value(0)).current;
    const scaleAnims = useRef(genders.map((g) => new Animated.Value(g === selectedGender ? 1.05 : 0.98))).current;
    const activeOpacities = useRef(genders.map((g) => new Animated.Value(g === selectedGender ? 1 : 0))).current;

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
        // Animate the scale and opacity of the buttons smoothly
        genders.forEach((g, i) => {
            const isActive = selectedGender === g;
            Animated.parallel([
                Animated.spring(scaleAnims[i], {
                    toValue: isActive ? 1.05 : 0.98,
                    friction: 7,
                    tension: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(activeOpacities[i], {
                    toValue: isActive ? 1 : 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        });
    }, [selectedGender]);

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
                colors={[theme?.primary || '#011441', '#FFFFFF', '#FFFFFF',]} // Fade to white
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
                        activeOpacity={0.7}
                        onPress={() => setAddressModalVisible(true)}
                    >
                        <View style={styles.locationPin}>
                            <Ionicons name="location" size={18} color={theme.text} />
                        </View>
                        <View style={styles.addressInfo}>
                            {/* Top row: Status */}
                            <View style={styles.statusRow}>
                                {(!locationLoading && (deliveryAvailable !== null || selectedAddress)) ? (
                                    <>
                                        <View style={[styles.statusDot, { backgroundColor: deliveryAvailable ? '#10B981' : '#F59E0B' }]} />
                                        <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                            {tbAvailable ? 'Try in 60 mins' : (deliveryAvailable === false ? 'Try & Buy Unavailable' : 'FlashFits Delivery')}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                        {locationLoading ? 'Locating...' : 'FlashFits Delivery'}
                                    </Text>
                                )}
                            </View>
                            
                            {/* Bottom row: Address */}
                            <Text style={[styles.subText, { color: theme.text }]} numberOfLines={1}>
                                {selectedAddress 
                                    ? `${capitalize(selectedAddress.addressType)} - ${selectedAddress.addressLine1}`
                                    : locationLoading 
                                    ? 'Fetching your location...' 
                                    : locationPermission !== 'granted'
                                    ? 'Enable location permission'
                                    : (locationAddress || 'Tap to select delivery location')}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={16} color={theme.text} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    <View style={styles.actionIcons}>

                        <TouchableOpacity
                            style={styles.iconButton}
                            activeOpacity={0.7}
                            onPress={() => router.push("/cart" as any)}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Ionicons name="bag-handle-outline" size={24} color={theme.text} />
                            
                            {/* Instant Cart Badge (Top Right) */}
                            {instantCartCount > 0 && (
                                <View style={[styles.badge, styles.instantBadge, { backgroundColor: '#F59E0B' }]}>
                                    <View style={styles.badgeContent}>
                                        <Ionicons name="flash" size={7} color="#fff" style={{ marginRight: 1 }} />
                                        <Text style={styles.badgeText}>{instantCartCount > 9 ? '9+' : instantCartCount}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Courier Cart Badge (Bottom Right) */}
                            {courierCartCount > 0 && (
                                <View style={[styles.badge, styles.courierBadge, { backgroundColor: theme.accent }]}>
                                    <Text style={styles.badgeText}>{courierCartCount > 9 ? '9+' : courierCartCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push("/(app)/profile" as any)}
                            hitSlop={{ top: 15, bottom: 15, left: 10, right: 20 }}
                        >
                            <View style={styles.profileCircle}>
                                <Ionicons name="person-outline" size={16} color={theme.text} />
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
                        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
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
                        <View style={styles.micButton}>
                            <MaterialCommunityIcons name="microphone-outline" size={18} color="#64748B" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.genderContainer}>
                        {genders.map((g, i) => {
                            const isActive = selectedGender === g;
                            const gTheme = GenderThemes[g] || GenderThemes.Men;

                            const inactiveOpacity = activeOpacities[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0]
                            });

                            return (
                                <Animated.View
                                    key={g}
                                    style={[
                                        styles.genderButtonWrapper,
                                        { transform: [{ scale: scaleAnims[i] }] }
                                    ]}
                                >
                                    <TouchableOpacity
                                        onPress={() => setSelectedGender(g)}
                                        style={styles.genderButton}
                                        activeOpacity={0.9}
                                    >
                                        {/* Active Background Pill */}
                                        <Animated.View style={[
                                            StyleSheet.absoluteFill,
                                            {
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: 16,
                                                opacity: activeOpacities[i],
                                                ...Platform.select({
                                                    ios: {
                                                        shadowColor: gTheme.primary,
                                                        shadowOffset: { width: 0, height: 4 },
                                                        shadowOpacity: 0.2,
                                                        shadowRadius: 8,
                                                    },
                                                    android: {
                                                        elevation: 4,
                                                    },
                                                }),
                                            }
                                        ]} />

                                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                            <Animated.Text
                                                style={[
                                                    styles.genderText,
                                                    {
                                                        color: 'rgba(255,255,255,0.7)',
                                                        fontFamily: Typography.fontFamily.extraBold,
                                                        opacity: inactiveOpacity,
                                                    }
                                                ]}
                                            >
                                                {g}
                                            </Animated.Text>
                                            <Animated.Text
                                                style={[
                                                    styles.genderText,
                                                    {
                                                        position: 'absolute',
                                                        color: gTheme.primary,
                                                        fontFamily: Typography.fontFamily.extraBold,
                                                        opacity: activeOpacities[i],
                                                    }
                                                ]}
                                            >
                                                {g}
                                            </Animated.Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* ── Category List ── */}
                {!hideCategories && (
                    <Animated.ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContainer}
                        style={{ marginTop: 10 }}
                    >
                        {loading
                            ? [1, 2, 3, 4, 5].map((i) => (
                                <View key={i} style={styles.categoryItem}>
                                    <Skeleton width={LOGO_SIZE} height={LOGO_SIZE} borderRadius={16} style={{ marginBottom: 4 }} />
                                    <Skeleton width={CATEGORY_ITEM_WIDTH * 0.7} height={10} />
                                </View>
                            ))
                            : categories.map((cat) => {
                                const isActive = selectedCategoryId === cat._id;
                                const genderKey = selectedGender.toUpperCase() as 'MEN' | 'WOMEN' | 'KIDS';
                                const logoUrl = cat.logos?.[genderKey]?.url || cat.logo?.url || cat.image?.url;

                                return (
                                    <TouchableOpacity
                                        key={cat._id}
                                        style={styles.categoryItem}
                                        onPress={() => router.push({
                                            pathname: '/search-results' as any,
                                            params: {
                                                categoryId: cat._id,
                                                gender: selectedGender.toUpperCase(),
                                            }
                                        })}
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
                    </Animated.ScrollView>
                )}
            </LinearGradient>

            {/* Address Selector Modal */}
            <AddressSelectorModal 
                visible={addressModalVisible} 
                onClose={() => setAddressModalVisible(false)} 
            />
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
        gap: 14,
    },
    iconButton: {
        position: 'relative',
        padding: 4,
    },
    badge: {
        position: 'absolute',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    instantBadge: {
        top: -4,
        right: -4,
        zIndex: 2,
    },
    courierBadge: {
        bottom: -2,
        right: -4,
        zIndex: 1,
    },
    badgeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: -0.2,
    },
    profileCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.93)',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 48,
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
        fontSize: 14,
        color: '#94A3B8',
        fontFamily: Typography.fontFamily.regular,
    },
    animatedSearchText: {
        fontSize: 14,
        color: '#1E293B',
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.1,
    },
    micButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(148,163,184,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.13)',
        padding: 5,
        borderRadius: 20,
        marginTop: 10,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        
    },
    genderButtonWrapper: {
        flex: 1,
    },
    genderButton: {
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },

    genderText: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
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
