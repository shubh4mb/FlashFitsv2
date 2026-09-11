import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { listenRiderLocation, removeRiderLocationListener } from '@/sockets/order.socket';

interface LiveOrderMapProps {
  orderId?: string;
  orderStatus?: string;
  deliveryRiderStatus?: string;
  pickupCoordinates?: [number, number]; // [lng, lat]
  deliveryCoordinates?: [number, number]; // [lng, lat]
  merchantName?: string;
  riderName?: string;
  estimatedMinutes?: number | string;
}

export default function LiveOrderMap({
  orderId,
  orderStatus,
  deliveryRiderStatus,
  pickupCoordinates,
  deliveryCoordinates,
  merchantName = 'Merchant Store',
  riderName = 'Rider',
  estimatedMinutes,
}: LiveOrderMapProps) {
  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Normalize coordinates: [lng, lat] -> { lat, lng }
  const storeLat = pickupCoordinates?.[1] || 10.8505;
  const storeLng = pickupCoordinates?.[0] || 76.2711;

  const custLat = deliveryCoordinates?.[1] || 10.8505;
  const custLng = deliveryCoordinates?.[0] || 76.2711;

  // Listen to live rider location via WebSocket
  useEffect(() => {
    let isMounted = true;

    listenRiderLocation((data) => {
      if (!isMounted || !data || !data.lat || !data.lng) return;

      setRiderCoords({ lat: data.lat, lng: data.lng });

      // Smoothly update marker and route line in Leaflet without reloading WebView
      const script = `
        if (typeof updateRiderLocation === 'function') {
          updateRiderLocation(${data.lat}, ${data.lng});
        }
        true;
      `;
      webviewRef.current?.injectJavaScript(script);
    });

    return () => {
      isMounted = false;
      removeRiderLocationListener();
    };
  }, [orderId]);

  // Status message
  const statusInfo = useMemo(() => {
    switch (deliveryRiderStatus) {
      case 'assigned':
      case 'en_route_pickup':
        return { text: 'Rider heading to store', color: '#f59e0b', icon: 'bike-fast' };
      case 'at_pickup':
        return { text: 'Rider picking up items', color: '#f59e0b', icon: 'storefront' };
      case 'picked_up':
      case 'en_route_delivery':
        return { text: 'Rider on the way to you', color: '#10b981', icon: 'moped' };
      case 'at_delivery':
        return { text: 'Rider at your location!', color: '#3b82f6', icon: 'home-variant' };
      default:
        return { text: 'Live Delivery Tracking', color: '#6366f1', icon: 'map-marker-path' };
    }
  }, [deliveryRiderStatus]);

  // Initial rider position: use live riderCoords or store coordinates
  const initialRiderLat = riderCoords?.lat || storeLat;
  const initialRiderLng = riderCoords?.lng || storeLng;

  // Leaflet + OpenStreetMap HTML
  const leafletHTML = useMemo(() => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f8fafc; }
          .leaflet-control-attribution { font-size: 8px !important; opacity: 0.7; }
          .leaflet-control-zoom { display: none; }

          /* Custom Marker Pins */
          .marker-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s ease;
          }

          .store-marker {
            width: 36px;
            height: 36px;
            background: #ffffff;
            border: 2.5px solid #f59e0b;
          }

          .customer-marker {
            width: 36px;
            height: 36px;
            background: #ffffff;
            border: 2.5px solid #3b82f6;
            position: relative;
          }

          /* Pulsing destination ring */
          .pulse-ring {
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.3);
            animation: pulsate 2s infinite ease-out;
            z-index: -1;
          }

          @keyframes pulsate {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }

          .rider-marker {
            width: 40px;
            height: 40px;
            background: #0f172a;
            border: 2.5px solid #10b981;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
          }

          .marker-label {
            position: absolute;
            bottom: -18px;
            background: rgba(15, 23, 42, 0.85);
            color: #ffffff;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 6px;
            white-space: nowrap;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let storeMarker, customerMarker, riderMarker;
          let routeLine;

          const storePos = [${storeLat}, ${storeLng}];
          const custPos = [${custLat}, ${custLng}];
          let riderPos = [${initialRiderLat}, ${initialRiderLng}];

          function initMap() {
            // CartoDB Voyager tiles (OpenStreetMap data, beautiful light e-commerce styling)
            map = L.map('map', { 
              zoomControl: false, 
              attributionControl: false 
            }).setView(riderPos, 14);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              subdomains: 'abcd',
            }).addTo(map);

            // Store Marker
            const storeIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="marker-pin store-marker">🏪<div class="marker-label">${merchantName.replace(/'/g, "\\'")}</div></div>',
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            });
            storeMarker = L.marker(storePos, { icon: storeIcon }).addTo(map);

            // Customer Marker
            const customerIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="pulse-ring"></div><div class="marker-pin customer-marker">🏠<div class="marker-label">Your Place</div></div>',
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            });
            customerMarker = L.marker(custPos, { icon: customerIcon }).addTo(map);

            // Rider Marker
            const riderIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="marker-pin rider-marker">🛵<div class="marker-label" style="background:#10b981; color:#0f172a;">${riderName.replace(/'/g, "\\'")}</div></div>',
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            });
            riderMarker = L.marker(riderPos, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);

            // Dashed route line
            drawRoute();

            // Fit all markers in view with padding
            fitAllBounds();

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
            }
          }

          function drawRoute() {
            if (routeLine) {
              map.removeLayer(routeLine);
            }
            routeLine = L.polyline([storePos, riderPos, custPos], {
              color: '#3b82f6',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8',
              lineCap: 'round',
            }).addTo(map);
          }

          function fitAllBounds() {
            const bounds = L.latLngBounds([storePos, custPos, riderPos]);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          }

          function updateRiderLocation(lat, lng) {
            riderPos = [lat, lng];
            if (riderMarker) {
              riderMarker.setLatLng(riderPos);
            }
            drawRoute();
          }

          function recenterOnRider() {
            if (riderMarker) {
              map.setView(riderPos, 16, { animate: true, duration: 0.8 });
            }
          }

          window.onload = initMap;
        </script>
      </body>
    </html>
    `;
  }, [storeLat, storeLng, custLat, custLng, merchantName, riderName]);

  const handleRecenter = () => {
    webviewRef.current?.injectJavaScript(`
      if (typeof recenterOnRider === 'function') recenterOnRider();
      true;
    `);
  };

  const handleFitBounds = () => {
    webviewRef.current?.injectJavaScript(`
      if (typeof fitAllBounds === 'function') fitAllBounds();
      true;
    `);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Top Floating Status Pill */}
      <View style={styles.statusHeader}>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons name={statusInfo.icon as any} size={18} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>

        {estimatedMinutes ? (
          <View style={styles.etaBadge}>
            <Ionicons name="flash" size={12} color="#f59e0b" />
            <Text style={styles.etaText}>~{estimatedMinutes}m</Text>
          </View>
        ) : null}
      </View>

      {/* Map Canvas */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          style={styles.webview}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'MAP_READY') {
                setMapReady(true);
              }
            } catch (e) {}
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={false}
          scrollEnabled={false}
        />

        {!mapReady && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loaderText}>Loading live map...</Text>
          </View>
        )}

        {/* Floating Controls: Recenter & Zoom Extents */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleRecenter} activeOpacity={0.8}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleFitBounds} activeOpacity={0.8}>
            <MaterialCommunityIcons name="arrow-expand-all" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Footer Info */}
      <View style={styles.footerRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Store</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>{riderName}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  mapWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 8,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#fafaf9',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});
