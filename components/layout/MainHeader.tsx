import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const KEYWORDS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets'];

import { fetchCategories } from "../../api/categories";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { GenderThemes } from "../../constants/Theme";
import { useAddress } from "../../context/AddressContext";
import { Gender, useGender } from "../../context/GenderContext";

interface MainHeaderProps {
    cartCount?: number;
    wishlistCount?: number;
    hideCategories?: boolean;
}

export default function MainHeader({ hideCategories = false }: MainHeaderProps) {
    const { cart } = useCart();
    const { wishlistIds } = useWishlist();
    
    const cartCount = cart?.totalItems || 0;
    const wishlistCount = wishlistIds.length;
    const router = useRouter();
    const { selectedAddress, openAddressModal } = useAddress();
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

    // 3D Gender Switcher animations
    const genderAnim = useRef(new Animated.Value(0)).current;
    const scaleAnims = useRef(genders.map(() => new Animated.Value(1))).current;

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
    }, []);

    useEffect(() => {
        // Animate the scale of the buttons
        genders.forEach((g, i) => {
            Animated.spring(scaleAnims[i], {
                toValue: selectedGender === g ? 1.1 : 0.95,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }).start();
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

    return (
        <LinearGradient
            colors={[theme.primary, '#FFFFFF', '#FFFFFF']} // Fade to white
            locations={[0, 0.7, 1]} // Reaches white by approx 40% height (gender switcher area)
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.container, { paddingTop: insets.top + 10 }]}
        >
            {/* Decorative blurred orb */}
            {/* <View style={styles.decorativeOrb} /> */}

            {/* ── Top Row: Location & Icons ── */}
            <View style={styles.topRow}>
                <TouchableOpacity
                    style={styles.locationContainer}
                    activeOpacity={0.7}
                    onPress={openAddressModal}
                >
                    <View style={styles.locationPin}>
                        <Ionicons name="location" size={18} color={theme.text} />
                    </View>
                    <View style={styles.addressInfo}>
                        <View style={styles.addressRow}>
                            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                {selectedAddress ? selectedAddress.addressLine1 : 'Select Address'}
                            </Text>
                            <AntDesign name="down" size={9} color={theme.text} style={{ opacity: 0.7, marginLeft: 2 }} />
                        </View>
                        <Text style={[styles.subText, { color: theme.text }]} numberOfLines={1}>
                            {selectedAddress
                                ? `${selectedAddress.area}, ${selectedAddress.city}`
                                : 'Tap to select delivery location'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionIcons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        onPress={() => router.push("/(app)/(tabs)/wishlist" as any)}
                    >
                        <Ionicons name="heart-outline" size={22} color={theme.text} />
                        {wishlistCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                <Text style={styles.badgeText}>{wishlistCount > 9 ? '9+' : wishlistCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        onPress={() => router.push("/cart" as any)}
                    >
                        <Ionicons name="bag-handle-outline" size={22} color={theme.text} />
                        {cartCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/(app)/(tabs)" as any)}
                    >
                        <View style={styles.profileCircle}>
                            <Ionicons name="person-outline" size={16} color={theme.text} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Search Bar ── */}
            <TouchableOpacity
                style={styles.searchBar}
                activeOpacity={0.85}
                onPress={() => router.push("/search" as any)}
            >
                <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <View style={styles.searchTextContainer}>
                    <Text style={styles.staticSearchText}>Search </Text>
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
                </View>
                <View style={styles.micButton}>
                    <MaterialCommunityIcons name="microphone-outline" size={18} color="#64748B" />
                </View>
            </TouchableOpacity>

            {/* ── Gender Switcher ── */}
            <View style={styles.genderContainer}>
                {genders.map((g, i) => {
                    const isActive = selectedGender === g;
                    const gTheme = GenderThemes[g] || GenderThemes.Men;
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
                                style={[
                                    styles.genderButton,
                                    isActive && {
                                        backgroundColor: '#FFFFFF',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: gTheme.primary,
                                                shadowOffset: { width: 0, height: 6 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 10,
                                            },
                                            android: {
                                                elevation: 10,
                                            },
                                        }),
                                    },
                                ]}
                                activeOpacity={0.9}
                            >
                                <Text
                                    style={[
                                        styles.genderText,
                                        {
                                            color: isActive ? gTheme.primary : 'rgba(255,255,255,0.6)',
                                            fontWeight: isActive ? '900' : '600',
                                            textShadowColor: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                                            textShadowOffset: { width: 0, height: 1 },
                                            textShadowRadius: 1,
                                        },
                                    ]}
                                >
                                    {g}
                                </Text>
                                {isActive && (
                                    <View style={[styles.activeIndicator, { backgroundColor: gTheme.primary }]} />
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>

            {/* ── Category List ── */}
            {!hideCategories && (
                <Animated.ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                    style={{ marginTop: 16 }}
                >
                    {!loading && categories.map((cat) => {
                        const isActive = selectedCategoryId === cat._id;
                        const genderKey = selectedGender.toUpperCase() as 'MEN' | 'WOMEN' | 'KIDS';
                        const logoUrl = cat.logos?.[genderKey]?.url || cat.logo?.url || cat.image?.url;

                        return (
                            <TouchableOpacity
                                key={cat._id}
                                style={styles.categoryItem}
                                onPress={() => setSelectedCategoryId(cat._id)}
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
                                <Text style={[styles.categoryName, { color: theme.text }, isActive && styles.categoryNameActive]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.ScrollView>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 6,
            },
        }),
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
        flex: 1,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressText: {
        fontSize: 14,
        fontWeight: '700',
        marginRight: 3,
        letterSpacing: 0.1,
    },
    subText: {
        fontSize: 10.5,
        fontWeight: '500',
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
        top: -3,
        right: -3,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '800',
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
        fontWeight: '400',
    },
    animatedSearchText: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '700',
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
        backgroundColor: 'rgba(0,0,0,0.18)',
        padding: 6,
        borderRadius: 20,
        marginTop: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    genderButtonWrapper: {
        flex: 1,
    },
    genderButton: {
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        opacity: 0.6,
    },
    genderText: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    categoriesContainer: {
        paddingRight: 16,
        gap: 12,
        // paddingBottom: 4,
    },
    categoryItem: {
        alignItems: 'center',
        gap: 2,
        width: 90,
    },
    logoWrapper: {
        width: 100,
        height: 100,
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
        width: '120%',
        height: '120%',
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
        fontWeight: 'bold',
        color: '#fff',
        opacity: 0.5,
    },
    categoryName: {
        fontSize: 10.5,
        fontWeight: '600',
        textAlign: 'center',
        opacity: 0.85,
        // marginTop: 4,
    },
    categoryNameActive: {
        fontWeight: '800',
        opacity: 1,
    },
});
