import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useCourierCart } from "@/context/CourierCartContext";
import * as Haptics from "expo-haptics";
import { BrandColors } from "@/constants/theme";

const KEYWORDS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets'];

interface HomeHeaderProps {
  address?: string;
  cartCount?: number;
  wishlistCount?: number;
}

export default function HomeHeader({
  address = "Select Location",
  wishlistCount = 0
}: HomeHeaderProps) {
  const { cart } = useCart();
  const { courierCart } = useCourierCart();

  const instantCartCount = cart?.merchantCarts?.length || 0;
  const courierCartCount = courierCart?.items?.length || 0;
  const insets = useSafeAreaInsets();

  // Search bar animation
  const [keywordIndex, setKeywordIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setKeywordIndex((prev) => (prev + 1) % KEYWORDS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* ── Top Row: Location & Icons ── */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.locationContainer}
          activeOpacity={0.6}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/select-location" as any);
          }}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <View style={styles.locationPin} pointerEvents="none">
            <Ionicons name="location" size={18} color={BrandColors.primary} />
          </View>
          <View style={styles.addressInfo} pointerEvents="none">
            <View style={styles.addressRow} pointerEvents="none">
              <Text style={styles.addressText} numberOfLines={1} pointerEvents="none">{address}</Text>
              <AntDesign name="down" size={12} color="#666" style={styles.chevron} pointerEvents="none" />
            </View>
            <Text style={styles.subText} pointerEvents="none">Try in 60 mins</Text>
          </View>
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
              <MaterialCommunityIcons name="heart-outline" size={22} color={BrandColors.matteBlack} />
              {wishlistCount > 0 && (
                <View style={[styles.badgeContainer, styles.topRightBadge]} pointerEvents="none">
                  <Text style={styles.badgeText}>
                    {wishlistCount > 99 ? '99+' : wishlistCount}
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
              <MaterialCommunityIcons name="shopping-outline" size={22} color={BrandColors.matteBlack} />

              {/* Instant Cart Badge (Top Right) */}
              {instantCartCount > 0 && (
                <View style={[styles.badgeContainer, styles.topRightBadge, { right:-8, paddingHorizontal: 4 }]} pointerEvents="none">
                  <Text style={styles.badgeText}>
                    {instantCartCount > 99 ? '99+' : instantCartCount}
                  </Text>
                  <Ionicons name="flash" size={8} color="#FFFFFF" style={{ marginLeft: 0.5 }} />
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
                  <Text style={styles.badgeText}>
                    {courierCartCount > 99 ? '99+' : courierCartCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Menu Button */}
          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(app)/profile" as any);
            }}
            hitSlop={{ top: 18, bottom: 18, left: 10, right: 14 }}
          >
            <View style={styles.iconWrapper} pointerEvents="none">
              <MaterialCommunityIcons name="menu" size={24} color={BrandColors.matteBlack} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bottom Row: Search Bar ── */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.9}
        onPress={() => {/* TODO: Search Screen */ }}
      >
        <Ionicons name="search" size={17} color="#94A3B8" style={styles.searchIcon} />
        <View style={styles.searchTextContainer}>
          <Text style={styles.staticSearchText}>Search </Text>
          <Animated.Text style={[styles.animatedSearchText, { opacity: fadeAnim }]}>
            "{KEYWORDS[keywordIndex]}"
          </Animated.Text>
        </View>
        <View style={styles.micButton}>
          <MaterialCommunityIcons name="microphone-outline" size={17} color={BrandColors.matteBlack} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  locationPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.softCyan,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  addressInfo: {
    flex: 1,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.matteBlack,
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  subText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    marginTop: 1,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    padding: 2,
  },
  profileButton: {
    padding: 2,
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  badgeContainer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 11,
  },
  topRightBadge: {
    top: -4,
    right: -6,
  },
  bottomRightBadge: {
    bottom: -4,
    right: -6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.offWhiteAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchTextContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  staticSearchText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  animatedSearchText: {
    fontSize: 13,
    color: BrandColors.matteBlack,
    fontWeight: "600",
  },
  micButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.softCyan,
    alignItems: "center",
    justifyContent: "center",
  },
});
