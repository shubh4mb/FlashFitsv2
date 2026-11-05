import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as SecureStore from 'expo-secure-store';
import { Address, getAddresses } from "../api/address";
import * as Location from 'expo-location';
import { checkDeliveryAvailability } from "../api/auth";
import { useAuth } from "./AuthContext";
import { Platform, AppState } from "react-native";

const SELECTED_ADDRESS_KEY = 'selectedAddress';
const MANUAL_LOCATION_KEY = 'manualLocation';

export interface DetectLocationOptions {
    isSilent?: boolean;
    requestPermissionIfUndetermined?: boolean;
}

export type EnableLocationFailureReason = 'services-disabled' | 'permission-denied' | 'error' | 'no-context';
export interface EnableLocationResult {
    success: boolean;
    failureReason?: EnableLocationFailureReason;
}

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
    detectLocation: (options?: boolean | DetectLocationOptions, legacyRequestPermission?: boolean) => Promise<void>;
    requestInitialLocation: () => Promise<void>;
    enableLocation: () => Promise<EnableLocationResult>;
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
    locationLoading: false,
    isLocationOff: false,
    detectLocation: async () => { },
    requestInitialLocation: async () => { },
    enableLocation: async () => ({ success: false, failureReason: 'no-context' as const }),
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
    const [locationLoading, setLocationLoading] = useState(false);
    const [isLocationOff, setIsLocationOff] = useState(false);
    const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

    // Synchronous state refs to prevent circular callback dependencies and re-renders
    const initialMounted = useRef(false);
    const selectedAddressRef = useRef<Address | null>(null);
    const isManualLocationRef = useRef(false);
    const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const lastCheckedCoords = useRef<string>('');
    const isDetectingRef = useRef(false);
    const prevAuthRef = useRef(isAuthenticated);
    const hasPromptedLocationRef = useRef(false);
    const detectLocationRef = useRef<(options?: boolean | DetectLocationOptions, legacyRequestPermission?: boolean) => Promise<void>>(async () => {});

    // Sync refs with latest state
    selectedAddressRef.current = selectedAddress;
    isManualLocationRef.current = isManualLocation;
    userLocationRef.current = userLocation;

    const openAddressModal = useCallback(() => setIsAddressModalVisible(true), []);
    const closeAddressModal = useCallback(() => setIsAddressModalVisible(false), []);

    const clearManualLocation = useCallback(async () => {
        try {
            setIsManualLocation(false);
            isManualLocationRef.current = false;
            await SecureStore.deleteItemAsync(MANUAL_LOCATION_KEY);
        } catch (e) {
            console.error('[AddressContext] Failed to clear manual location:', e);
        }
    }, []);

    const setManualLocation = useCallback(async (coords: { latitude: number; longitude: number }, addressText: string) => {
        try {
            setUserLocation(coords);
            userLocationRef.current = coords;
            setLocationAddress(addressText);
            setIsManualLocation(true);
            isManualLocationRef.current = true;
            setIsLocationOff(false);
            setSelectedAddressState(null);
            selectedAddressRef.current = null;

            await SecureStore.setItemAsync(MANUAL_LOCATION_KEY, JSON.stringify({ coords, addressText }));
            await SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY);
        } catch (e) {
            console.error('[AddressContext] Failed to save manual location:', e);
        }
    }, []);

    const refreshAddresses = useCallback(async (): Promise<Address[]> => {
        try {
            const token = await SecureStore.getItemAsync('token');
            if (!token && !isAuthenticated) return [];
            const addressesRes = await getAddresses();
            const userAddresses = addressesRes?.addresses || (Array.isArray(addressesRes) ? addressesRes : []);
            setAddresses(userAddresses);
            return userAddresses;
        } catch (e) {
            console.log('Skipping saved addresses fetch (not authenticated or error):', e);
            return [];
        }
    }, [isAuthenticated]);

    const setSelectedAddress = useCallback(async (address: Address | null) => {
        try {
            setSelectedAddressState(address);
            selectedAddressRef.current = address;
            if (address) {
                await SecureStore.setItemAsync(SELECTED_ADDRESS_KEY, JSON.stringify(address));
                await clearManualLocation();
            } else {
                await SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY);
                await clearManualLocation();
            }
        } catch (error) {
            console.error('Failed to save address to SecureStore:', error);
        }
    }, [clearManualLocation]);

    // Helper to safely extract { lat, lng } from various address schema representations
    const getAddressCoords = useCallback((addr: any): { lat: number; lng: number } | null => {
        if (!addr) return null;
        if (addr.location?.coordinates && Array.isArray(addr.location.coordinates) && addr.location.coordinates.length >= 2) {
            const c0 = Number(addr.location.coordinates[0]);
            const c1 = Number(addr.location.coordinates[1]);
            if (!isNaN(c0) && !isNaN(c1)) {
                // In GeoJSON: [lng, lat]. In India, lat is 8-37 and lng is 68-97
                if (c0 > 60 && c1 < 40) {
                    return { lat: c1, lng: c0 };
                } else if (c1 > 60 && c0 < 40) {
                    return { lat: c0, lng: c1 };
                }
                return { lat: c1, lng: c0 };
            }
        }
        const lat = Number(addr.latitude ?? addr.lat ?? addr.location?.latitude ?? addr.location?.lat);
        const lng = Number(addr.longitude ?? addr.lng ?? addr.location?.longitude ?? addr.location?.lng);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            return { lat, lng };
        }
        return null;
    }, []);

    const detectLocation = useCallback(async (
        opts?: boolean | DetectLocationOptions,
        legacyRequestPermission?: boolean
    ) => {
        const isSilent = typeof opts === 'object' ? !!opts?.isSilent : false;
        const requestPermissionIfUndetermined = typeof opts === 'object' 
            ? !!opts?.requestPermissionIfUndetermined 
            : !!legacyRequestPermission;

        if (isDetectingRef.current) return;
        isDetectingRef.current = true;

        try {
            // Only set locationLoading if NOT running in silent background mode
            // AND if the user doesn't already have an address or pinned location
            if (!isSilent && !selectedAddressRef.current && !isManualLocationRef.current) {
                setLocationLoading(true);
            }

            // Always fetch saved addresses in parallel so user can pick one immediately
            const userAddressesPromise = refreshAddresses();

            // 1. Check if location services (GPS) are enabled on device
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                console.log('[AddressContext] Device location services are turned OFF');
                setIsLocationOff(true);
                setLocationLoading(false);
                await userAddressesPromise;
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
                return;
            }

            // Services & permission are confirmed active
            setIsLocationOff(false);

            // 3. Fast Position: Try instant last-known first, then balanced GPS fix
            let location: Location.LocationObject | null = null;
            try {
                location = await Location.getLastKnownPositionAsync();
            } catch (lastErr) {
                console.warn('[AddressContext] getLastKnownPositionAsync error:', lastErr);
            }

            if (!location) {
                try {
                    location = await Promise.race([
                        Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        }),
                        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
                    ]);
                } catch (posErr) {
                    console.warn('[AddressContext] getCurrentPositionAsync error:', posErr);
                }
            }

            // Fallback: low accuracy if balanced timed out
            if (!location) {
                try {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Lowest,
                    });
                } catch (lowErr) {
                    console.warn('[AddressContext] Lowest accuracy position error:', lowErr);
                }
            }

            if (!location) {
                console.log('[AddressContext] Could not retrieve location coordinates');
                setLocationLoading(false);
                await userAddressesPromise;
                return;
            }

            // Location obtained successfully
            setIsLocationOff(false);
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            setUserLocation({ latitude: lat, longitude: lng });
            userLocationRef.current = { latitude: lat, longitude: lng };

            // 4. Proximity Match with saved addresses (500m geofence for indoor/cell GPS drift)
            const userAddresses = await userAddressesPromise;
            let bestMatch: Address | null = null;
            let minFoundDist = 500; // 500m threshold

            userAddresses.forEach((addr: any) => {
                const coords = getAddressCoords(addr);
                if (coords) {
                    const dist = distanceInMeters(lat, lng, coords.lat, coords.lng);
                    if (dist < minFoundDist) {
                        minFoundDist = dist;
                        bestMatch = addr;
                    }
                }
            });

            // Proximity Stability Guard:
            // Only switch address if:
            // a) No address is currently selected, OR
            // b) The user is significantly far (>1000m) from their current selected address
            const currentSelected = selectedAddressRef.current;
            if (bestMatch) {
                let shouldSwitch = false;
                if (!currentSelected) {
                    shouldSwitch = true;
                } else if (currentSelected._id === (bestMatch as Address)._id) {
                    shouldSwitch = false; // Already selected, keep it without state churn
                } else {
                    const currentCoords = getAddressCoords(currentSelected);
                    if (currentCoords) {
                        const distToCurrent = distanceInMeters(lat, lng, currentCoords.lat, currentCoords.lng);
                        if (distToCurrent > 1000) {
                            shouldSwitch = true;
                        }
                    } else {
                        shouldSwitch = true;
                    }
                }

                if (shouldSwitch) {
                    console.log(`[AddressContext] Proximity Match Found: ${(bestMatch as any).addressType} (${Math.round(minFoundDist)}m)`);
                    setSelectedAddressState(bestMatch);
                    selectedAddressRef.current = bestMatch;
                    SecureStore.setItemAsync(SELECTED_ADDRESS_KEY, JSON.stringify(bestMatch)).catch(() => {});
                    clearManualLocation();
                }
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
                console.warn('[AddressContext] Native reverse geocode fallback:', err);
                setLocationAddress("Current Location");
            }

        } catch (error) {
            console.error('[AddressContext] Location detection error:', error);
        } finally {
            isDetectingRef.current = false;
            setLocationLoading(false);
        }
    }, [refreshAddresses, clearManualLocation, getAddressCoords]);

    // Keep detectLocationRef synchronized
    detectLocationRef.current = detectLocation;

    const requestInitialLocation = useCallback(async () => {
        if (hasPromptedLocationRef.current || initialMounted.current) return;
        hasPromptedLocationRef.current = true;
    }, []);

    const enableLocation = useCallback(async (): Promise<EnableLocationResult> => {
        try {
            // 1. Check if device location services (GPS) are enabled
            let servicesEnabled = await Location.hasServicesEnabledAsync();

            if (!servicesEnabled) {
                // On Android: Attempt 1-tap Google Play Services dialog without leaving app
                if (Platform.OS === 'android') {
                    try {
                        await Location.enableNetworkProviderAsync();
                        servicesEnabled = await Location.hasServicesEnabledAsync();
                    } catch {
                        // User cancelled/dismissed dialog
                    }
                }

                if (!servicesEnabled) {
                    setIsLocationOff(true);
                    return { success: false, failureReason: 'services-disabled' };
                }
            }

            // 2. Request permission (App-level)
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);

            if (status !== 'granted') {
                setIsLocationOff(true);
                return { success: false, failureReason: 'permission-denied' };
            }

            // 3. Permission and services are active: clear manual pin & switch to live GPS
            await clearManualLocation();
            setIsLocationOff(false);
            await setSelectedAddress(null);
            
            // Detect coordinates with user-facing loading since user explicitly clicked Enable
            await detectLocation({ isSilent: false });
            
            closeAddressModal();
            return { success: true };
        } catch (err) {
            console.error('enableLocation error:', err);
            return { success: false, failureReason: 'error' };
        }
    }, [detectLocation, setSelectedAddress, closeAddressModal, clearManualLocation]);
    
    // Handle Logout / Auth State Changes (Only fires when auth actually changes, never loops)
    useEffect(() => {
        if (!initialMounted.current) return;
        if (prevAuthRef.current !== isAuthenticated) {
            prevAuthRef.current = isAuthenticated;
            if (!isAuthenticated) {
                // Logout case: clear user account addresses, but preserve device/manual location for guest browsing
                setSelectedAddressState(null);
                selectedAddressRef.current = null;
                setAddresses([]);
                setIsAddressModalVisible(false);
                lastCheckedCoords.current = '';
                SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY).catch(e => 
                    console.error('Failed to clear address on logout:', e)
                );
            } else {
                refreshAddresses().then(userAddrs => {
                    // When user logs in, if we have current GPS coordinates, check if user is at one of their saved addresses!
                    if (userAddrs && userAddrs.length > 0 && userLocationRef.current && !isManualLocationRef.current) {
                        const { latitude, longitude } = userLocationRef.current;
                        let bestMatch: Address | null = null;
                        let minDist = 500;
                        userAddrs.forEach((addr: any) => {
                            const coords = getAddressCoords(addr);
                            if (coords) {
                                const dist = distanceInMeters(latitude, longitude, coords.lat, coords.lng);
                                if (dist < minDist) {
                                    minDist = dist;
                                    bestMatch = addr;
                                }
                            }
                        });
                        if (bestMatch) {
                            setSelectedAddress(bestMatch);
                        }
                    }
                });
            }
        }
    }, [isAuthenticated, refreshAddresses, setSelectedAddress, getAddressCoords]);
    
    // Auto-detect & Initial Load (Single Guaranteed Boot Execution - Never re-runs!)
    useEffect(() => {
        let isMounted = true;

        const initialLoad = async () => {
            // Safety timeout: guaranteed to dismiss locationLoading within 3.5s
            const safetyTimeout = setTimeout(() => {
                if (isMounted) {
                    setLocationLoading(false);
                }
            }, 3500);

            try {
                // 1. Restore persisted selected address FIRST (frame 1 instant render)
                const saved = await SecureStore.getItemAsync(SELECTED_ADDRESS_KEY);
                let restoredAddress: Address | null = null;
                if (saved) {
                    try {
                        restoredAddress = JSON.parse(saved);
                        if (isMounted && restoredAddress) {
                            setSelectedAddressState(restoredAddress);
                            selectedAddressRef.current = restoredAddress;
                            // Immediately stop loading because we already have the user's address!
                            setLocationLoading(false);
                        }
                    } catch (e) {
                        console.error('Failed to parse saved address:', e);
                    }
                }
                
                // 2. Restore persisted manual location
                const savedManual = await SecureStore.getItemAsync(MANUAL_LOCATION_KEY);
                let hasManual = false;
                if (savedManual) {
                    try {
                        const parsed = JSON.parse(savedManual);
                        if (parsed?.coords && isMounted) {
                            hasManual = true;
                            setUserLocation(parsed.coords);
                            userLocationRef.current = parsed.coords;
                            setLocationAddress(parsed.addressText || 'Selected Location');
                            setIsManualLocation(true);
                            isManualLocationRef.current = true;
                            setIsLocationOff(false);
                            setLocationLoading(false);
                        }
                    } catch (e) {
                        console.error('Failed to parse saved manual location:', e);
                    }
                }

                // 3. Parallel fetch of saved addresses if logged in
                refreshAddresses().catch(() => {});

                // 4. Background GPS check (if not locked to manual location)
                if (!hasManual) {
                    try {
                        const perm = await Location.getForegroundPermissionsAsync();
                        if (isMounted) setLocationPermission(perm.status);

                        if (perm.status === 'granted') {
                            const services = await Location.hasServicesEnabledAsync();
                            if (services) {
                                if (isMounted) setIsLocationOff(false);
                                // If we already have a restored address, keep background check silent!
                                // If no address yet, show subtle loading while GPS resolves
                                await detectLocationRef.current({ isSilent: !!restoredAddress });
                            } else {
                                if (isMounted) setIsLocationOff(true);
                            }
                        } else {
                            if (isMounted) setIsLocationOff(true);
                        }
                    } catch (locErr) {
                        console.warn('[AddressContext] Initial GPS check error:', locErr);
                    }
                }
            } catch (e) {
                console.error('Failed to load saved address on boot:', e);
            } finally {
                clearTimeout(safetyTimeout);
                if (isMounted) {
                    initialMounted.current = true;
                    setLocationLoading(false);
                }
            }
        };

        initialLoad();

        return () => {
            isMounted = false;
        };
    }, [refreshAddresses]);

    // Re-detect location automatically when user returns from Settings / Background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextState) => {
            if (nextState === 'active') {
                try {
                    // Do not override user's manual pinned location
                    if (isManualLocationRef.current) return;
                    if (isDetectingRef.current) return;

                    const servicesEnabled = await Location.hasServicesEnabledAsync();
                    const perm = await Location.getForegroundPermissionsAsync();
                    
                    setLocationPermission(perm.status);
                    const isOff = !servicesEnabled || perm.status !== 'granted';
                    setIsLocationOff(isOff);

                    if (servicesEnabled && perm.status === 'granted') {
                        // Silent background detect - never flash "Locating..."
                        await detectLocationRef.current({ isSilent: true });
                    }
                } catch (e) {
                    console.warn('[AddressContext] AppState resume check error:', e);
                }
            }
        });

        return () => subscription.remove();
    }, []);

    // ── Sync Availability When Address/Location Changes (Deduplicated) ──
    useEffect(() => {
        let isCancelled = false;

        const updateAvailability = async () => {
            const addrCoords = selectedAddress ? getAddressCoords(selectedAddress) : null;
            const lat = addrCoords?.lat ?? userLocation?.latitude;
            const lng = addrCoords?.lng ?? userLocation?.longitude;

            const effectiveLat = lat !== undefined ? lat : DEFAULT_FALLBACK_COORDS.latitude;
            const effectiveLng = lng !== undefined ? lng : DEFAULT_FALLBACK_COORDS.longitude;

            const coordsKey = `${Number(effectiveLat).toFixed(4)}_${Number(effectiveLng).toFixed(4)}`;
            if (lastCheckedCoords.current === coordsKey && deliveryAvailable !== null) {
                return; // Coordinates haven't meaningfully changed and already evaluated
            }

            try {
                const availability = await checkDeliveryAvailability(effectiveLat, effectiveLng);
                if (isCancelled) return;
                lastCheckedCoords.current = coordsKey;
                const resData = availability?.data ?? availability;
                setDeliveryAvailable(resData?.serviceable ?? true);
                setTbAvailable(resData?.tbAvailable ?? true);
                setTbOffline(resData?.allOffline ?? false);
            } catch (e) {
                if (isCancelled) return;
                console.error('[AddressContext] Unified availability check failed:', e);
                lastCheckedCoords.current = coordsKey;
                setDeliveryAvailable(true);
                setTbAvailable(true);
                setTbOffline(false);
            }
        };

        updateAvailability();

        return () => {
            isCancelled = true;
        };
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
