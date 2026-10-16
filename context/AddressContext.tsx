import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as SecureStore from 'expo-secure-store';
import { Address, getAddresses } from "../api/address";
import * as Location from 'expo-location';
import { checkDeliveryAvailability } from "../api/auth";
import { useAuth } from "./AuthContext";
import { Alert, Linking, Platform, AppState } from "react-native";

const SELECTED_ADDRESS_KEY = 'selectedAddress';
const MANUAL_LOCATION_KEY = 'manualLocation';

interface AddressContextType {
    selectedAddress: Address | null;
    setSelectedAddress: (address: Address | null) => Promise<void>;
    addresses: Address[];
    setAddresses: (addresses: Address[]) => void;
    
    // Location States
    userLocation: { latitude: number; longitude: number } | null;
    locationAddress: string | null;
    isManualLocation: boolean;
    setManualLocation: (coords: { latitude: number; longitude: number }, addressText: string) => Promise<void>;
    clearManualLocation: () => Promise<void>;
    deliveryAvailable: boolean | null;
    tbAvailable: boolean | null;
    tbOffline: boolean | null;
    locationPermission: Location.PermissionStatus | 'undetermined';
    locationLoading: boolean;
    isLocationOff: boolean;
    detectLocation: (showModalOnDecision?: boolean, requestPermissionIfUndetermined?: boolean) => Promise<void>;
    requestInitialLocation: () => Promise<void>;
    enableLocation: () => Promise<boolean>;
    refreshAddresses: () => Promise<Address[]>;

    // Address / Location Modal State
    isAddressModalVisible: boolean;
    openAddressModal: () => void;
    closeAddressModal: () => void;
}

const AddressContext = createContext<AddressContextType>({
    selectedAddress: null,
    setSelectedAddress: async () => { },
    addresses: [],
    setAddresses: () => { },
    userLocation: null,
    locationAddress: null,
    isManualLocation: false,
    setManualLocation: async () => { },
    clearManualLocation: async () => { },
    deliveryAvailable: null,
    tbAvailable: null,
    tbOffline: null,
    locationPermission: 'undetermined',
    locationLoading: true,
    isLocationOff: false,
    detectLocation: async () => { },
    requestInitialLocation: async () => { },
    enableLocation: async () => false,
    refreshAddresses: async () => [],
    isAddressModalVisible: false,
    openAddressModal: () => { },
    closeAddressModal: () => { },
});

export const DEFAULT_FALLBACK_COORDS = { latitude: 10.0072, longitude: 76.2891 };

export const distanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371e3;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const { isAuthenticated } = useAuth();
    
    // States
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationAddress, setLocationAddress] = useState<string | null>(null);
    const [isManualLocation, setIsManualLocation] = useState(false);
    const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
    const [tbAvailable, setTbAvailable] = useState<boolean | null>(null);
    const [tbOffline, setTbOffline] = useState<boolean | null>(null);
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | 'undetermined'>('undetermined');
    const [locationLoading, setLocationLoading] = useState(true);
    const [isLocationOff, setIsLocationOff] = useState(false);
    const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
    const initialMounted = useRef(false);
    const lastCheckedCoords = useRef<string>('');

    const openAddressModal = useCallback(() => setIsAddressModalVisible(true), []);
    const closeAddressModal = useCallback(() => setIsAddressModalVisible(false), []);

    const clearManualLocation = useCallback(async () => {
        try {
            setIsManualLocation(false);
            await SecureStore.deleteItemAsync(MANUAL_LOCATION_KEY);
        } catch (e) {
            console.error('[AddressContext] Failed to clear manual location:', e);
        }
    }, []);

    const setManualLocation = useCallback(async (coords: { latitude: number; longitude: number }, addressText: string) => {
        try {
            setUserLocation(coords);
            setLocationAddress(addressText);
            setIsManualLocation(true);
            setIsLocationOff(false);
            setSelectedAddressState(null);

            await SecureStore.setItemAsync(MANUAL_LOCATION_KEY, JSON.stringify({ coords, addressText }));
            await SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY);
        } catch (e) {
            console.error('[AddressContext] Failed to save manual location:', e);
        }
    }, []);

    const refreshAddresses = useCallback(async (): Promise<Address[]> => {
        if (!isAuthenticated) return [];
        try {
            const addressesRes = await getAddresses();
            const userAddresses = addressesRes?.addresses || (Array.isArray(addressesRes) ? addressesRes : []);
            setAddresses(userAddresses);
            return userAddresses;
        } catch {
            console.log('Skipping saved addresses fetch (not authenticated or error)');
            return [];
        }
    }, [isAuthenticated]);

    const setSelectedAddress = useCallback(async (address: Address | null) => {
        try {
            setSelectedAddressState(address);
            if (address) {
                await SecureStore.setItemAsync(SELECTED_ADDRESS_KEY, JSON.stringify(address));
                await clearManualLocation();
            } else {
                await SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY);
            }
        } catch (error) {
            console.error('Failed to save address to SecureStore:', error);
        }
    }, [clearManualLocation]);

    const hasPromptedLocationRef = useRef(false);

    const detectLocation = useCallback(async (showModalOnDecision = false, requestPermissionIfUndetermined = false) => {
        try {
            setLocationLoading(true);

            // Always fetch saved addresses in parallel so user can pick one immediately
            const userAddressesPromise = refreshAddresses();

            // 1. Check if location services are enabled on device
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                console.log('[AddressContext] Device location services are turned OFF');
                setIsLocationOff(true);
                setLocationLoading(false);
                await userAddressesPromise;
                // Only show modal if user explicitly triggered an address selection action (or authenticated user)
                if (showModalOnDecision && isAuthenticated) {
                    setIsAddressModalVisible(true);
                }
                return;
            }

            // 2. Check permission status first without blindly requesting
            const currentPerm = await Location.getForegroundPermissionsAsync();
            let status = currentPerm.status;

            if (status !== 'granted') {
                if (requestPermissionIfUndetermined && currentPerm.canAskAgain) {
                    const req = await Location.requestForegroundPermissionsAsync();
                    status = req.status;
                }
            }
            setLocationPermission(status);
            
            if (status !== 'granted') {
                console.log('[AddressContext] Location permission NOT granted:', status);
                setIsLocationOff(true);
                setLocationLoading(false);
                await userAddressesPromise;
                // Never force-pop address modal for guests who denied permission or are browsing
                if (showModalOnDecision && isAuthenticated) {
                    setIsAddressModalVisible(true);
                }
                return;
            }

            // 3. Get Coordinates with Timeout & Last Known Fallback
            let location: Location.LocationObject | null = null;
            try {
                location = await Promise.race([
                    Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    }),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500)),
                ]);
            } catch (posErr) {
                console.warn('getCurrentPositionAsync error, will attempt last known:', posErr);
            }

            if (!location) {
                try {
                    location = await Location.getLastKnownPositionAsync();
                } catch (lastErr) {
                    console.warn('getLastKnownPositionAsync error:', lastErr);
                }
            }

            if (!location) {
                console.log('[AddressContext] Could not retrieve location coordinates');
                setIsLocationOff(true);
                setLocationLoading(false);
                await userAddressesPromise;
                if (showModalOnDecision && isAuthenticated) {
                    setIsAddressModalVisible(true);
                }
                return;
            }

            // Location obtained successfully
            setIsLocationOff(false);
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            setUserLocation({ latitude: lat, longitude: lng });

            // 4. Proximity Match with saved addresses
            const userAddresses = await userAddressesPromise;
            let bestMatch: Address | null = null;
            let minFoundDist = 100; // 100m threshold

            userAddresses.forEach((addr: any) => {
                if (addr.location?.coordinates && Array.isArray(addr.location.coordinates)) {
                    const [c1, c2] = addr.location.coordinates;
                    const d1 = distanceInMeters(lat, lng, Number(c2), Number(c1));
                    const d2 = distanceInMeters(lat, lng, Number(c1), Number(c2));
                    const dist = Math.min(d1, d2);
                    if (dist < minFoundDist) {
                        minFoundDist = dist;
                        bestMatch = addr;
                    }
                } else if (addr.latitude !== undefined && addr.longitude !== undefined) {
                    const dist = distanceInMeters(lat, lng, Number(addr.latitude), Number(addr.longitude));
                    if (dist < minFoundDist) {
                        minFoundDist = dist;
                        bestMatch = addr;
                    }
                }
            });

            if (bestMatch) {
                console.log(`Proximity Match Found: ${(bestMatch as any).addressType} (${Math.round(minFoundDist)}m)`);
                setSelectedAddress(bestMatch);
                setLocationLoading(false);
                return;
            }

            // 5. Native On-Device Reverse Geocode (0 external network requests, instant)
            try {
                const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (results && results.length > 0) {
                    const addr = results[0];
                    const area = addr.district || addr.subregion || addr.name || addr.street;
                    const city = addr.city || addr.region || '';
                    const shortAddress = [area, city].filter(Boolean).join(', ');
                    const postcode = addr.postalCode || '';
                    setLocationAddress(postcode ? `${shortAddress || 'Current Location'}, ${postcode}` : (shortAddress || 'Current Location'));
                } else {
                    setLocationAddress("Current Location");
                }
            } catch (err) {
                console.warn('Native reverse geocode fallback:', err);
                setLocationAddress("Current Location");
            }

            // If user is authenticated without a saved address and showModalOnDecision is true, show modal
            if (isAuthenticated && showModalOnDecision) {
                setIsAddressModalVisible(true);
            }

        } catch (error) {
            console.error('Location detection error:', error);
            setIsLocationOff(true);
            if (showModalOnDecision && isAuthenticated) {
                setIsAddressModalVisible(true);
            }
        } finally {
            setLocationLoading(false);
        }
    }, [refreshAddresses, selectedAddress, setSelectedAddress, isAuthenticated]);

    const requestInitialLocation = useCallback(async () => {
        if (hasPromptedLocationRef.current) return;
        hasPromptedLocationRef.current = true;
        
        // If a saved address or manual location is already active, don't auto-request GPS
        const savedManual = await SecureStore.getItemAsync(MANUAL_LOCATION_KEY).catch(() => null);
        if (savedManual || selectedAddress) {
            return;
        }

        try {
            const currentPerm = await Location.getForegroundPermissionsAsync();
            if (currentPerm.status === 'granted') {
                // Silently fetch GPS since user previously granted permission
                await detectLocation(false, false);
            } else {
                // Never prompt system permissions unprompted on startup/skip
                setLocationPermission(currentPerm.status);
                setIsLocationOff(true);
                setLocationLoading(false);
            }
        } catch (e) {
            console.warn('[AddressContext] requestInitialLocation check error:', e);
            setLocationLoading(false);
        }
    }, [detectLocation, selectedAddress]);

    const enableLocation = useCallback(async (): Promise<boolean> => {
        try {
            setLocationLoading(true);

            // 1. Check if device location services (GPS) are enabled
            let servicesEnabled = await Location.hasServicesEnabledAsync();

            if (!servicesEnabled) {
                // On Android: Attempt 1-tap Google Play Services dialog without leaving app
                if (Platform.OS === 'android') {
                    try {
                        await Location.enableNetworkProviderAsync();
                        servicesEnabled = await Location.hasServicesEnabledAsync();
                    } catch {
                        // User cancelled/dismissed 1-tap dialog or device lacks Google Play Services
                    }
                }

                // If still disabled after prompt attempt (or on iOS):
                if (!servicesEnabled) {
                    setLocationLoading(false);

                    if (Platform.OS === 'android') {
                        Alert.alert(
                            "Location Services Disabled",
                            "Please turn on location in your device settings to detect nearby stores and available items.",
                            [
                                { text: "Cancel", style: "cancel" },
                                { 
                                    text: "Open Location Settings", 
                                    onPress: () => {
                                        Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
                                            Linking.openSettings().catch(() => {});
                                        });
                                    }
                                }
                            ]
                        );
                    } else {
                        // iOS: Guide user clearly since iOS routes through Settings
                        Alert.alert(
                            "Location Services Disabled",
                            "Please enable Location Services in your phone's Settings > Privacy & Security > Location Services.",
                            [
                                { text: "Cancel", style: "cancel" },
                                { 
                                    text: "Open Settings", 
                                    onPress: () => {
                                        Linking.openSettings().catch(() => {});
                                    }
                                }
                            ]
                        );
                    }
                    return false;
                }
            }

            // 2. Request permission (App-level)
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);

            if (status !== 'granted') {
                setLocationLoading(false);
                Alert.alert(
                    "Location Permission Required",
                    "FlashFits needs location permission to show nearby partner stores and 30-minute Try at Home in your area.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { 
                            text: "Open Settings", 
                            onPress: () => {
                                Linking.openSettings().catch(() => {});
                            }
                        }
                    ]
                );
                return false;
            }

            // 3. Permission and services are active: clear manual location & detect coordinates
            await clearManualLocation();
            setIsLocationOff(false);
            await detectLocation();
            
            // Switch to current location by clearing selectedAddress if user specifically pressed Enable Location
            await setSelectedAddress(null);
            closeAddressModal();
            return true;
        } catch (err) {
            console.error('enableLocation error:', err);
            setLocationLoading(false);
            return false;
        }
    }, [detectLocation, setSelectedAddress, closeAddressModal, clearManualLocation]);
    
    // Handle Logout / Auth State Changes (Only after initial mount)
    useEffect(() => {
        if (!initialMounted.current) return;
        if (!isAuthenticated) {
            // Logout case: clear user account addresses, but keep device/manual location for guest browsing
            setSelectedAddressState(null);
            setAddresses([]);
            setIsAddressModalVisible(false);
            lastCheckedCoords.current = '';
            SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY).catch(e => 
                console.error('Failed to clear address on logout:', e)
            );
        } else {
            // Only fire if user logged in AFTER initial mount has already run
            if (!selectedAddress) {
                detectLocation(true, false);
            } else {
                refreshAddresses();
            }
        }
    }, [isAuthenticated, selectedAddress, detectLocation, refreshAddresses]);
    
    // Auto-detect & Initial Load (Single Guaranteed Boot Execution)
    useEffect(() => {
        const initialLoad = async () => {
            try {
                const saved = await SecureStore.getItemAsync(SELECTED_ADDRESS_KEY);
                if (saved) {
                    try {
                        setSelectedAddressState(JSON.parse(saved));
                    } catch (e) {
                        console.error('Failed to parse saved address:', e);
                    }
                } else {
                    const savedManual = await SecureStore.getItemAsync(MANUAL_LOCATION_KEY);
                    if (savedManual) {
                        try {
                            const parsed = JSON.parse(savedManual);
                            if (parsed?.coords) {
                                setUserLocation(parsed.coords);
                                setLocationAddress(parsed.addressText || 'Selected Location');
                                setIsManualLocation(true);
                                setIsLocationOff(false);
                            }
                        } catch (e) {
                            console.error('Failed to parse saved manual location:', e);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load saved address on boot:', e);
            } finally {
                initialMounted.current = true;
                setLocationLoading(false);
            }
        };
        initialLoad();
    }, []);

    // Re-detect location automatically when user returns from Settings / Background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextState) => {
            if (nextState === 'active') {
                try {
                    const servicesEnabled = await Location.hasServicesEnabledAsync();
                    const perm = await Location.getForegroundPermissionsAsync();
                    if (servicesEnabled && perm.status === 'granted' && isLocationOff) {
                        setIsLocationOff(false);
                        detectLocation();
                    }
                } catch (e) {
                    console.warn('[AddressContext] AppState resume check error:', e);
                }
            }
        });

        return () => subscription.remove();
    }, [detectLocation, isLocationOff]);

    // ── Sync Availability When Address/Location Changes (Deduplicated) ──
    useEffect(() => {
        const updateAvailability = async () => {
            const lat = selectedAddress?.location?.coordinates?.[1] ?? 
                        (selectedAddress as any)?.latitude ?? 
                        userLocation?.latitude;
            const lng = selectedAddress?.location?.coordinates?.[0] ?? 
                        (selectedAddress as any)?.longitude ?? 
                        userLocation?.longitude;

            const effectiveLat = lat !== undefined ? lat : DEFAULT_FALLBACK_COORDS.latitude;
            const effectiveLng = lng !== undefined ? lng : DEFAULT_FALLBACK_COORDS.longitude;

            const coordsKey = `${Number(effectiveLat).toFixed(4)}_${Number(effectiveLng).toFixed(4)}`;
            if (lastCheckedCoords.current === coordsKey) {
                return; // Coordinates haven't meaningfully changed, skip duplicate network call
            }
            lastCheckedCoords.current = coordsKey;

            try {
                const availability = await checkDeliveryAvailability(effectiveLat, effectiveLng);
                
                setDeliveryAvailable(availability?.serviceable ?? true);
                setTbAvailable(availability?.tbAvailable ?? true);
                setTbOffline(availability?.allOffline ?? false);
            } catch (e) {
                console.error('[AddressContext] Unified availability check failed:', e);
                setDeliveryAvailable(true);
                setTbAvailable(true);
                setTbOffline(false);
            }
        };

        updateAvailability();
    }, [selectedAddress, userLocation]);

    const contextValue = useMemo(() => ({
        selectedAddress,
        setSelectedAddress,
        addresses,
        setAddresses,
        userLocation,
        locationAddress,
        isManualLocation,
        setManualLocation,
        clearManualLocation,
        deliveryAvailable,
        tbAvailable,
        tbOffline,
        locationPermission,
        locationLoading,
        isLocationOff,
        detectLocation,
        requestInitialLocation,
        enableLocation,
        refreshAddresses,
        isAddressModalVisible,
        openAddressModal,
        closeAddressModal,
    }), [
        selectedAddress,
        setSelectedAddress,
        addresses,
        userLocation,
        locationAddress,
        isManualLocation,
        setManualLocation,
        clearManualLocation,
        deliveryAvailable,
        tbAvailable,
        tbOffline,
        locationPermission,
        locationLoading,
        isLocationOff,
        detectLocation,
        requestInitialLocation,
        enableLocation,
        refreshAddresses,
        isAddressModalVisible,
        openAddressModal,
        closeAddressModal,
    ]);

    return (
        <AddressContext.Provider value={contextValue}>
            {children}
        </AddressContext.Provider>
    );
};

export const useAddress = () => {
    return useContext(AddressContext);
};
