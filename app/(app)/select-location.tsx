import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput } from "react-native";
import Loader from "@/components/common/Loader";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from '@expo/vector-icons';

const screen = Dimensions.get("window");

export default function SelectLocationScreen() {
    const webviewRef = useRef<WebView>(null);

    const [centerCoords, setCenterCoords] = useState({
        latitude: 0,
        longitude: 0,
    });
    const [mapReady, setMapReady] = useState(false);
    const [address, setAddress] = useState("Fetching Address...");
    const [paramAddress, setParamAddress] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [locating, setLocating] = useState(false);

    const requestAndFetchLocation = async () => {
        if (locating) return;

        try {
            setLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Location permission is required');
                setLocating(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;

            setCenterCoords({ latitude: lat, longitude: lng });
            reverseGeocode(lat, lng);
            sendToWebview(`moveTo(${lat}, ${lng})`);
            setMapReady(true);
        } catch (err) {
            console.error('Error fetching location:', err);
        } finally {
            setLocating(false);
        }
    };

    useEffect(() => {
        requestAndFetchLocation();
    }, []);

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                {
                    headers: {
                        "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)",
                    },
                }
            );
            const json = await resp.json();
            setAddress(json.display_name || "Unknown location");
            setParamAddress(json.address || "Unknown location");
        } catch (error) {
            console.error('Reverse geocode error:', error);
            setAddress("Unable to fetch address");
        }
    };

    const sendToWebview = (js: string) => {
        webviewRef.current?.injectJavaScript(js + "; true;");
    };

    const onMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "centerChanged") {
                const { lat, lng } = data;
                setCenterCoords({ latitude: lat, longitude: lng });
                reverseGeocode(lat, lng);
            }
        } catch (e) {
            console.error('WebView message error:', e);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`,
                {
                    headers: {
                        "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)",
                    },
                }
            );
            const results = await resp.json();

            if (results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lng = parseFloat(results[0].lon);
                sendToWebview(`moveTo(${lat}, ${lng})`);
                reverseGeocode(lat, lng);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    // ---------- WebView HTML ----------
    const mapHTML = (lat: number, lng: number) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; margin: 0; }
          .leaflet-control-zoom { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 17);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          map.on("moveend", () => {
            const c = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "centerChanged", lat: c.lat, lng: c.lng }));
          });
          function moveTo(lat, lng) { map.setView([lat, lng], 17); }
        </script>
      </body>
    </html>
    `;

    return (
        <View style={styles.container}>
            <View style={styles.topHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search Delivery location"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                    />
                </View>
            </View>

            {mapReady && (
                <WebView
                    ref={webviewRef}
                    onMessage={onMessage}
                    source={{ html: mapHTML(centerCoords.latitude, centerCoords.longitude) }}
                    style={{ flex: 1 }}
                />
            )}

            <View style={styles.markerFixed}>
                <Ionicons name="location" size={40} color="#0F0F0F" />
            </View>

            <TouchableOpacity
                style={[styles.currentLocationBtn, locating && { opacity: 0.6 }]}
                onPress={requestAndFetchLocation}
                disabled={locating}
            >
                {locating ? (
                    <Loader size={24} />
                ) : (
                    <Ionicons name="navigate-outline" size={24} color="#0F0F0F" />
                )}
            </TouchableOpacity>

            <View style={styles.addressContainer}>
                <Text style={styles.addressTitle}>Selected Location</Text>
                <Text style={styles.address} numberOfLines={2}>{address}</Text>

                <TouchableOpacity
                    style={styles.setLocationBtn}
                    onPress={() => {
                        if (!centerCoords.latitude || !centerCoords.longitude) {
                            alert("Location not ready yet");
                            return;
                        }

                        router.push({
                            pathname: "/(app)/add-address",
                            params: {
                                lat: centerCoords.latitude,
                                lng: centerCoords.longitude,
                                address: JSON.stringify(paramAddress)
                            },
                        });
                    }}
                >
                    <Text style={styles.setLocationText}>Set Location</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topHeader: {
        position: 'absolute',
        top: 60,
        left: 12,
        right: 12,
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    searchBar: {
        flex: 1,
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    markerFixed: {
        position: "absolute",
        top: screen.height / 2 - 40,
        left: screen.width / 2 - 20,
        zIndex: 10,
    },
    currentLocationBtn: {
        position: "absolute",
        bottom: 220,
        right: 20,
        backgroundColor: "#fff",
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    addressContainer: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        backgroundColor: "#fff",
        padding: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -5 },
    },
    addressTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#94A3B8",
        letterSpacing: 1,
        marginBottom: 8,
    },
    address: {
        fontSize: 16,
        color: "#0F0F0F",
        lineHeight: 22,
        fontWeight: '500',
    },
    setLocationBtn: {
        backgroundColor: "#0F0F0F",
        padding: 18,
        borderRadius: 16,
        marginTop: 20,
        alignItems: "center",
    },
    setLocationText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
