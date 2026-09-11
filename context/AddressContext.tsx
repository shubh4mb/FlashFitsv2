import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback, useMemo } from "react";
import * as SecureStore from 'expo-secure-store';
import { Address, getAddresses } from "../api/address";
import * as Location from 'expo-location';
import { checkDeliveryAvailability } from "../api/auth";
import { useAuth } from "./AuthContext";
import { Alert, Linking } from "react-native";

const SELECTED_ADDRESS_KEY = 'selectedAddress';

interface AddressContextType {
    selectedAddress: Address | null;
    setSelectedAddress: (address: Address | null) => Promise<void>;
    addresses: Address[];
    setAddresses: (addresses: Address[]) => void;
    
    // Location States
    userLocation: { latitude: number; longitude: number } | null;
    locationAddress: string | null;
    deliveryAvailable: boolean | null;
    tbAvailable: boolean | null;
    tbOffline: boolean | null;
    locationPermission: Location.PermissionStatus | 'undetermined';
    locationLoading: boolean;
    isLocationOff: boolean;
    detectLocation: () => Promise<void>;
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
    deliveryAvailable: null,
    tbAvailable: null,
    tbOffline: null,
    locationPermission: 'undetermined',
    locationLoading: true,
    isLocationOff: false,
    detectLocation: async () => { },
    enableLocation: async () => false,
    refreshAddresses: async () => [],
    isAddressModalVisible: false,
    openAddressModal: () => { },
    closeAddressModal: () => { },
});

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
    const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
    const [tbAvailable, setTbAvailable] = useState<boolean | null>(null);
    const [tbOffline, setTbOffline] = useState<boolean | null>(null);
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | 'undetermined'>('undetermined');
    const [locationLoading, setLocationLoading] = useState(true);
    const [isLocationOff, setIsLocationOff] = useState(false);
    const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

    const openAddressModal = useCallback(() => setIsAddressModalVisible(true), []);
    const closeAddressModal = useCallback(() => setIsAddressModalVisible(false), []);

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
            } else {
                await SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY);
            }
        } catch (error) {
            console.error('Failed to save address to SecureStore:', error);
        }
    }, []);

    const detectLocation = useCallback(async () => {
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
                // If user doesn't have a selected address, automatically show the selection modal
                if (!selectedAddress) {
                    setIsAddressModalVisible(true);
                }
                return;
            }

            // 2. Request Foreground Permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);
            
            if (status !== 'granted') {
                console.log('[AddressContext] Location permission NOT granted:', status);
                setIsLocationOff(true);
                setLocationLoading(false);
                await userAddressesPromise;
                // If user doesn't have a selected address, prompt them with the selection modal
                if (!selectedAddress) {
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
                if (!selectedAddress) {
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

            // 5. Reverse Geocode with Timeout
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                    {
                        headers: { "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)" },
                        signal: controller.signal,
                    }
                );
                clearTimeout(timeoutId);
                const json = await resp.json();
                const addressObj = json.address || {};
                const shortAddress = [
                    addressObj.suburb || addressObj.neighbourhood || addressObj.village,
                    addressObj.city || addressObj.town || addressObj.county
                ].filter(Boolean).join(', ') || json.display_name;
                
                const postcode = addressObj.postcode || '';
                setLocationAddress(postcode ? `${shortAddress}, ${postcode}` : shortAddress);
            } catch (err) {
                console.error('Reverse geocode failed or timed out:', err);
                setLocationAddress("Current Location");
            }

        } catch (error) {
            console.error('Location detection error:', error);
            setIsLocationOff(true);
        } finally {
            setLocationLoading(false);
        }
    }, [refreshAddresses, selectedAddress, setSelectedAddress]);

    const enableLocation = useCallback(async (): Promise<boolean> => {
        try {
            setLocationLoading(true);

            // Check if device location services are enabled
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setLocationLoading(false);
                Alert.alert(
                    "Location Services Disabled",
                    "Please turn on location services in your phone settings to detect your location.",
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

            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);

            if (status !== 'granted') {
                setLocationLoading(false);
                Alert.alert(
                    "Location Permission Required",
                    "FlashFits needs location permission to show nearby partner stores and 60-minute delivery in your area.",
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

            // Permission and services are active: detect coordinates
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
    }, [detectLocation, setSelectedAddress, closeAddressModal]);
    
    // Handle Logout / Auth State Changes
    useEffect(() => {
        if (!isAuthenticated) {
            // Logout case
            setSelectedAddressState(null);
            setAddresses([]);
            setUserLocation(null);
            setLocationAddress(null);
            setDeliveryAvailable(null);
            setTbAvailable(null);
            setTbOffline(null);
            setIsLocationOff(false);
            setIsAddressModalVisible(false);
            SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY).catch(e => 
                console.error('Failed to clear address on logout:', e)
            );
        } else {
            // On Login or App Start while authenticated
            if (!selectedAddress) {
                detectLocation();
            } else {
                refreshAddresses();
            }
        }
    }, [isAuthenticated]);
    
    // Auto-detect & Initial Load
    useEffect(() => {
        const initialLoad = async () => {
            const saved = await SecureStore.getItemAsync(SELECTED_ADDRESS_KEY);
            if (saved) {
                try {
                    setSelectedAddressState(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse saved address:', e);
                }
            }
            await detectLocation();
        };
        initialLoad();
    }, []);

    // ── Sync Availability When Address/Location Changes ──
    useEffect(() => {
        const updateAvailability = async () => {
            const lat = selectedAddress?.location?.coordinates?.[1] ?? 
                        (selectedAddress as any)?.latitude ?? 
                        userLocation?.latitude;
            const lng = selectedAddress?.location?.coordinates?.[0] ?? 
                        (selectedAddress as any)?.longitude ?? 
                        userLocation?.longitude;

            if (lat !== undefined && lng !== undefined) {
                try {
                    const availability = await checkDeliveryAvailability(lat, lng);
                    
                    setDeliveryAvailable(availability?.serviceable ?? true);
                    setTbAvailable(availability?.tbAvailable ?? false);
                    setTbOffline(availability?.allOffline ?? false);
                } catch (e) {
                    console.error('[AddressContext] Unified availability check failed:', e);
                    setDeliveryAvailable(true);
                    setTbAvailable(false);
                    setTbOffline(false);
                }
            } else {
                // If neither address nor location is chosen, reset availability to null
                // so the app knows location is pending rather than "not serviceable"
                setDeliveryAvailable(null);
                setTbAvailable(null);
                setTbOffline(null);
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
        deliveryAvailable,
        tbAvailable,
        tbOffline,
        locationPermission,
        locationLoading,
        isLocationOff,
        detectLocation,
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
        deliveryAvailable,
        tbAvailable,
        tbOffline,
        locationPermission,
        locationLoading,
        isLocationOff,
        detectLocation,
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
