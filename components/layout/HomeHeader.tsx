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

const KEYWORDS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets'];

interface HomeHeaderProps {
  address?: string;
  cartCount?: number;
  wishlistCount?: number;
}

export default function HomeHeader({ 
  address = "Select Location", 
  cartCount = 0, 
  wishlistCount = 0 
}: HomeHeaderProps) {
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
          activeOpacity={0.7}
          onPress={() => {/* TODO: Open Address Picker */}}
        >
          <View style={styles.locationPin}>
            <Ionicons name="location" size={20} color="#000" />
          </View>
          <View style={styles.addressInfo}>
            <View style={styles.addressRow}>
              <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
              <AntDesign name="down" size={12} color="#666" style={styles.chevron} />
            </View>
            <Text style={styles.subText}>Delivering to your doorstep</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/(app)/(tabs)/wishlist" as any)}>
            <Ionicons name="heart-outline" size={24} color="#000" />
            {wishlistCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{wishlistCount}</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => {/* TODO: Cart Screen */}}>
            <Ionicons name="bag-handle-outline" size={24} color="#000" />
            {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/(app)/(tabs)" as any)}>
             <View style={styles.profileCircle}>
                <Ionicons name="person-outline" size={18} color="#000" />
             </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bottom Row: Search Bar ── */}
      <TouchableOpacity 
        style={styles.searchBar}
        activeOpacity={0.9}
        onPress={() => {/* TODO: Search Screen */}}
      >
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <View style={styles.searchTextContainer}>
          <Text style={styles.staticSearchText}>Search </Text>
          <Animated.Text style={[styles.animatedSearchText, { opacity: fadeAnim }]}>
            "{KEYWORDS[keywordIndex]}"
          </Animated.Text>
        </View>
        <View style={styles.micButton}>
            <MaterialCommunityIcons name="microphone-outline" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
    backgroundColor: "#f0f0f0",
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
    color: "#000",
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  subText: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#ff3b30",
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: 'center',
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  profileButton: {
    marginLeft: 4,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 48,
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
    fontSize: 14,
    color: "#999",
  },
  animatedSearchText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  micButton: {
    padding: 4,
  },
});
