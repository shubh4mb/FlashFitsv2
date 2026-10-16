import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    Platform,
    Linking,
    Alert,
    ScrollView,
    Keyboard,
    Animated,
} from "react-native";
import Loader from "@/components/common/Loader";
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from '@expo/vector-icons';
import { useAddress, DEFAULT_FALLBACK_COORDS } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/AlertContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const screen = Dimensions.get("window");

const QUICK_CITIES = [
    { name: "Kochi", lat: 10.0072, lng: 76.2891 },
];

// Constant static HTML to ensure the WebView NEVER reloads on React state updates
const STATIC_MAP_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      html, body {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #F8FAFC;
        touch-action: none;
      }
      #map {
        height: 100%;
        width: 100%;
      }
      .leaflet-control-attribution {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map = null;
      var isProgrammaticMove = false;

      function init(lat, lng) {
        if (map) return;
        map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          dragging: true,
          tap: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          inertia: true,
          inertiaDeceleration: 3000,
        }).setView([lat, lng], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c']
        }).addTo(map);

        map.on('movestart', function() {
          if (!isProgrammaticMove) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dragStart' }));
          }
        });

        map.on('moveend', function() {
          if (isProgrammaticMove) {
            isProgrammaticMove = false;
            return;
          }
          var c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'centerChanged',
            lat: c.lat,
            lng: c.lng
          }));
        });

        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }

      function moveTo(lat, lng, zoom) {
        if (!map) {
          init(lat, lng);
          return;
        }
        isProgrammaticMove = true;
        map.setView([lat, lng], zoom || map.getZoom() || 16, { animate: true, duration: 0.8 });
      }

      window.init = init;
      window.moveTo = moveTo;
    </script>
  </body>
</html>
`;

export default function SelectLocationScreen() {
    const insets = useSafeAreaInsets();
    const webviewRef = useRef<WebView>(null);
    const { userLocation, setManualLocation } = useAddress();
    const { isAuthenticated } = useAuth();
    const params = useLocalSearchParams<{ mode?: string }>();
    const isAddAddressMode = params.mode === 'add_address';
    const showToast = useToast();

    const initialCoords = useRef({
        latitude: userLocation?.latitude || DEFAULT_FALLBACK_COORDS.latitude,
        longitude: userLocation?.longitude || DEFAULT_FALLBACK_COORDS.longitude,
    });

    const [centerCoords, setCenterCoords] = useState(initialCoords.current);
    const centerCoordsRef = useRef(initialCoords.current);
    const [address, setAddress] = useState("Fetching location details...");
    const [paramAddress, setParamAddress] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [locating, setLocating] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [saving, setSaving] = useState(false);

    // Marker lift-and-drop animation when dragging
    const pinLiftAnim = useRef(new Animated.Value(0)).current;
    const shadowScaleAnim = useRef(new Animated.Value(1)).current;

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const sendToWebview = useCallback((js: string) => {
        webviewRef.current?.injectJavaScript(js + "; true;");
    }, []);

    // Format address into a clean, human-readable line
    const formatNativeAddress = (addr: Location.LocationGeocodedAddress) => {
        const area = addr.district || addr.subregion || addr.street || addr.name || addr.city;
        const city = addr.city || addr.region || '';
        const postcode = addr.postalCode || '';
        const parts = [area, city].filter(Boolean);
        if (parts.length === 0) return addr.formattedAddress || null;
        return postcode ? `${parts.join(', ')} - ${postcode}` : parts.join(', ');
    };

    const formatShortAddress = (addr: any) => {
        if (!addr) return null;
        const area = addr.suburb || addr.neighbourhood || addr.road || addr.quarter || addr.subdivision;
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.district;
        const state = addr.state || '';
        const postcode = addr.postcode || '';
        const parts = [area, city, state].filter(Boolean);
        if (parts.length === 0) return null;
        return postcode ? `${parts.join(', ')} - ${postcode}` : parts.join(', ');
    };

    // Safe reverse geocoding: native-first with strict protection against HTML error pages
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        try {
            setGeocoding(true);

            // 1. Native on-device geocoding (fast, free, zero rate limit, no HTML crash)
            const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (results && results.length > 0) {
                const formatted = formatNativeAddress(results[0]);
                if (formatted) {
                    setAddress(formatted);
                    setParamAddress(results[0]);
                    setGeocoding(false);
                    return;
                }
            }
        } catch {
            // Native geocode skipped or unavailable, proceed to safe fallback
        }

        // 2. Fallback to OpenStreetMap with safe text validation before JSON.parse
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
                {
                    headers: {
                        "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)",
                    },
                }
            );

            if (resp.ok) {
                const text = await resp.text();
                // Ensure response is actually JSON and not an HTML error page (e.g. <!DOCTYPE html>)
                if (text && text.trim().startsWith('{')) {
                    const json = JSON.parse(text);
                    const formatted = formatShortAddress(json.address);
                    setAddress(formatted || json.display_name || "Selected Location");
                    setParamAddress(json.address || null);
                    setGeocoding(false);
                    return;
                }
            }
        } catch {
            // Silently swallow fetch errors to prevent unhandled rejection
        }

        setAddress("Selected Location");
        setGeocoding(false);
    }, []);

    // Initial load: geocode initial coordinates and check GPS silently
    useEffect(() => {
        reverseGeocode(initialCoords.current.latitude, initialCoords.current.longitude);

        (async () => {
            try {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (servicesEnabled) {
                    const perm = await Location.getForegroundPermissionsAsync();
                    if (perm.status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc) {
                            const lat = loc.coords.latitude;
                            const lng = loc.coords.longitude;
                            centerCoordsRef.current = { latitude: lat, longitude: lng };
                            setCenterCoords({ latitude: lat, longitude: lng });
                            reverseGeocode(lat, lng);
                            sendToWebview(`moveTo(${lat}, ${lng}, 16)`);
                        }
                    }
                }
            } catch (e) {
                console.warn('[SelectLocation] Silent GPS check:', e);
            }
        })();
    }, [reverseGeocode, sendToWebview]);

    // Explicit GPS button press
    const requestAndFetchLocation = async () => {
        if (locating) return;

        try {
            setLocating(true);

            let servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                if (Platform.OS === 'android') {
                    try {
                        await Location.enableNetworkProviderAsync();
                        servicesEnabled = await Location.hasServicesEnabledAsync();
                    } catch {}
                }

                if (!servicesEnabled) {
                    setLocating(false);
                    Alert.alert(
                        "Location Services Disabled",
                        "Please turn on location in your device settings to detect your current position.",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Settings",
                                onPress: () => {
                                    if (Platform.OS === 'android') {
                                        Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
                                            Linking.openSettings().catch(() => {});
                                        });
                                    } else {
                                        Linking.openSettings().catch(() => {});
                                    }
                                }
                            }
                        ]
                    );
                    return;
                }
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast({ message: 'Location permission was not granted', type: 'warning' });
                setLocating(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;

            centerCoordsRef.current = { latitude: lat, longitude: lng };
            setCenterCoords({ latitude: lat, longitude: lng });
            reverseGeocode(lat, lng);
            sendToWebview(`moveTo(${lat}, ${lng}, 16)`);
        } catch (err) {
            console.error('[SelectLocation] Error fetching location:', err);
        } finally {
            setLocating(false);
        }
    };

    // Handle messages sent from Leaflet inside the WebView
    const onMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === "dragStart") {
                // Pin lifts up when user begins dragging
                Animated.parallel([
                    Animated.spring(pinLiftAnim, { toValue: -14, useNativeDriver: true, tension: 120 }),
                    Animated.timing(shadowScaleAnim, { toValue: 0.6, duration: 150, useNativeDriver: true }),
                ]).start();
            } else if (data.type === "centerChanged") {
                // Pin drops back down when movement stops
                Animated.parallel([
                    Animated.spring(pinLiftAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
                    Animated.timing(shadowScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]).start();

                const { lat, lng } = data;
                centerCoordsRef.current = { latitude: lat, longitude: lng };
                setCenterCoords({ latitude: lat, longitude: lng });

                // Debounce reverse geocoding
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(() => {
                    reverseGeocode(lat, lng);
                }, 500);
            }
        } catch (e) {
            console.error('[SelectLocation] WebView message error:', e);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        Keyboard.dismiss();

        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
                {
                    headers: {
                        "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)",
                    },
                }
            );

            if (resp.ok) {
                const text = await resp.text();
                if (text && text.trim().startsWith('[')) {
                    const results = JSON.parse(text);
                    if (results && results.length > 0) {
                        const lat = parseFloat(results[0].lat);
                        const lng = parseFloat(results[0].lon);
                        centerCoordsRef.current = { latitude: lat, longitude: lng };
                        setCenterCoords({ latitude: lat, longitude: lng });
                        sendToWebview(`moveTo(${lat}, ${lng}, 16)`);
                        reverseGeocode(lat, lng);
                        return;
                    }
                }
            }
            showToast({ message: "No matching location found", type: "warning" });
        } catch (error) {
            console.error('[SelectLocation] Search error:', error);
        }
    };

    const handleSelectCityChip = (city: typeof QUICK_CITIES[0]) => {
        Keyboard.dismiss();
        centerCoordsRef.current = { latitude: city.lat, longitude: city.lng };
        setCenterCoords({ latitude: city.lat, longitude: city.lng });
        sendToWebview(`moveTo(${city.lat}, ${city.lng}, 16)`);
        reverseGeocode(city.lat, city.lng);
    };

    const handleConfirmLocation = async () => {
        const coords = centerCoordsRef.current;
        if (!coords.latitude || !coords.longitude) {
            showToast({ message: "Location coordinates not ready yet", type: 'warning' });
            return;
        }

        if (isAddAddressMode) {
            // Forward to add-address form
            router.push({
                pathname: "/(app)/add-address",
                params: {
                    lat: coords.latitude,
                    lng: coords.longitude,
                    address: JSON.stringify(paramAddress)
                },
            });
            return;
        }

        // Set manual delivery location for guest or authenticated shopping
        try {
            setSaving(true);
            const cleanAddr = address && address !== "Fetching location details..." ? address : "Selected Location";
            await setManualLocation(coords, cleanAddr);
            showToast({ message: "Delivery location updated!", type: 'success' });
            router.back();
        } catch (e) {
            console.error('[SelectLocation] Failed to set delivery location:', e);
            showToast({ message: "Could not set delivery location", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header: Back & Search Bar */}
            <View style={[styles.topHeader, { top: insets.top + 8 }]}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={24} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search area, city or landmark"
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Quick City Suggestion Chip */}
            <View style={[styles.chipsContainer, { top: insets.top + 64 }]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                >
                    {QUICK_CITIES.map((city) => (
                        <TouchableOpacity
                            key={city.name}
                            style={styles.chip}
                            activeOpacity={0.7}
                            onPress={() => handleSelectCityChip(city)}
                        >
                            <Ionicons name="location-sharp" size={12} color="#0F172A" style={{ marginRight: 4 }} />
                            <Text style={styles.chipText}>{city.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Map WebView with disabled native scroll for buttery smooth dragging */}
            <WebView
                ref={webviewRef}
                onMessage={onMessage}
                source={{ html: STATIC_MAP_HTML }}
                onLoadEnd={() => {
                    sendToWebview(`init(${initialCoords.current.latitude}, ${initialCoords.current.longitude})`);
                }}
                style={{ flex: 1 }}
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />

            {/* Center Fixed Marker with Lift Animation */}
            <View style={styles.markerContainer} pointerEvents="none">
                <Animated.View style={{ transform: [{ translateY: pinLiftAnim }], alignItems: 'center' }}>
                    <Ionicons name="location" size={44} color="#0F172A" />
                </Animated.View>
                <Animated.View style={[styles.markerShadow, { transform: [{ scale: shadowScaleAnim }] }]} />
            </View>

            {/* Current GPS Location Button */}
            <TouchableOpacity
                style={[
                    styles.currentLocationBtn,
                    { bottom: Math.max(insets.bottom, 16) + 215 },
                    locating && { opacity: 0.7 }
                ]}
                onPress={requestAndFetchLocation}
                disabled={locating}
                activeOpacity={0.8}
            >
                {locating ? (
                    <Loader size={20} />
                ) : (
                    <Ionicons name="navigate" size={22} color="#0F172A" />
                )}
            </TouchableOpacity>

            {/* Bottom Address Container */}
            <View style={[styles.addressContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                <View style={styles.addressHeaderRow}>
                    <View style={styles.addressIconBox}>
                        <Ionicons name="location-outline" size={18} color="#0F172A" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressTitle}>
                            {isAddAddressMode ? 'PINNED LOCATION' : 'DELIVERY LOCATION'}
                        </Text>
                        <Text style={styles.address} numberOfLines={2}>
                            {geocoding ? "Updating location..." : address}
                        </Text>
                    </View>
                </View>

                {/* Why we need location note */}
                <View style={styles.rationaleContainer}>
                    <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.rationaleText}>
                        Used to check Try at Home & 30-min delivery in your area
                    </Text>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                    style={[styles.setLocationBtn, saving && { opacity: 0.7 }]}
                    onPress={handleConfirmLocation}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <Loader size={20} />
                    ) : (
                        <View style={styles.btnContent}>
                            <Ionicons 
                                name={isAddAddressMode ? "arrow-forward-circle-outline" : "checkmark-circle-outline"} 
                                size={20} 
                                color="#FFFFFF" 
                                style={{ marginRight: 8 }} 
                            />
                            <Text style={styles.setLocationText}>
                                {isAddAddressMode ? 'Enter Complete Address' : 'Confirm Delivery Location'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Secondary Option for Authenticated Users */}
                {!isAddAddressMode && isAuthenticated && (
                    <TouchableOpacity
                        style={styles.saveAsAddressLink}
                        activeOpacity={0.7}
                        onPress={() => {
                            const coords = centerCoordsRef.current;
                            router.push({
                                pathname: "/(app)/add-address",
                                params: {
                                    lat: coords.latitude,
                                    lng: coords.longitude,
                                    address: JSON.stringify(paramAddress)
                                },
                            });
                        }}
                    >
                        <Text style={styles.saveAsAddressText}>
                            Save as permanent address with flat / door no. →
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    topHeader: {
        position: 'absolute',
        left: 14,
        right: 14,
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 44,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
        paddingVertical: 0,
    },
    chipsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 19,
    },
    chipsScroll: {
        paddingHorizontal: 14,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
            },
            android: {
                elevation: 3,
            },
        }),
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    markerContainer: {
        position: "absolute",
        top: screen.height / 2 - 42,
        left: screen.width / 2 - 22,
        zIndex: 10,
        alignItems: 'center',
    },
    markerShadow: {
        width: 14,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(15, 23, 42, 0.25)',
        marginTop: -3,
    },
    currentLocationBtn: {
        position: "absolute",
        right: 18,
        backgroundColor: "#FFFFFF",
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
            },
            android: {
                elevation: 6,
            },
        }),
    },
    addressContainer: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -4 },
            },
            android: {
                elevation: 16,
            },
        }),
    },
    addressHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    addressIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    addressTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748B",
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    address: {
        fontSize: 15,
        color: "#0F172A",
        lineHeight: 21,
        fontWeight: '600',
    },
    rationaleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    rationaleText: {
        flex: 1,
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        lineHeight: 16,
    },
    setLocationBtn: {
        backgroundColor: "#0F172A",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    setLocationText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    saveAsAddressLink: {
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 6,
    },
    saveAsAddressText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
});
