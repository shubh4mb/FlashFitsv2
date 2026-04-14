import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import * as SecureStore from 'expo-secure-store'; // Note: SecureStore is imported but used later if needed
import { Address, getAddresses } from "../api/address";
import * as Location from 'expo-location';
import { checkDeliveryAvailability } from "../api/auth";
import { useAuth } from "./AuthContext";

const SELECTED_ADDRESS_KEY = 'selectedAddress';

interface AddressContextType {
    selectedAddress: Address | null;
    setSelectedAddress: (address: Address | null) => Promise<void>;
    addresses: Address[];
    setAddresses: (addresses: Address[]) => void;
    
    // New Location States
    userLocation: { latitude: number; longitude: number } | null;
    locationAddress: string | null;
    deliveryAvailable: boolean | null;
    tbAvailable: boolean | null;
    tbOffline: boolean | null;
    locationPermission: Location.PermissionStatus | 'undetermined';
    locationLoading: boolean;
    detectLocation: () => Promise<void>;
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
    detectLocation: async () => { },
});

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const { isAuthenticated } = useAuth();
    
    // New States
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationAddress, setLocationAddress] = useState<string | null>(null);
    const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
    const [tbAvailable, setTbAvailable] = useState<boolean | null>(null);
    const [tbOffline, setTbOffline] = useState<boolean | null>(null);
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | 'undetermined'>('undetermined');
    const [locationLoading, setLocationLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);

    const distanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

    const detectLocation = async () => {
        try {
            setLocationLoading(true);
            
            // 1. Request Permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);
            
            if (status !== 'granted') {
                setLocationLoading(false);
                return;
            }

            // 2. Get Coordinates
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            setUserLocation({ latitude: lat, longitude: lng });

            // 3. Fetch Saved Addresses
            let userAddresses: Address[] = [];
            if (isAuthenticated) {
                try {
                    const addressesRes = await getAddresses();
                    userAddresses = addressesRes?.addresses || (Array.isArray(addressesRes) ? addressesRes : []);
                    setAddresses(userAddresses);
                } catch (e) {
                    console.log('Skipping saved addresses fetch (not authenticated or error)');
                }
            }

            // 4. Proximity Match
            let bestMatch: Address | null = null;
            let minFoundDist = 100; // 100m threshold

            userAddresses.forEach((addr: any) => {
                if (addr.location?.coordinates && Array.isArray(addr.location.coordinates)) {
                    const [c1, c2] = addr.location.coordinates;
                    const d1 = distanceInMeters(lat, lng, Number(c2), Number(c1));
                    const d2 = distanceInMeters(lat, lng, Number(c1), Number(c2)); // rotated check
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
                
                // Still check availability for the matched address context to get TB status
                try {
                    const availability = await checkDeliveryAvailability(lat, lng);
                    setDeliveryAvailable(availability?.serviceable || false);
                    setTbAvailable(availability?.tbAvailable || false);
                    setTbOffline(availability?.allOffline || false);
                } catch (e) {
                    console.log('Availability check failed for match, defaulting to false');
                    setDeliveryAvailable(false);
                }
                
                setLocationLoading(false);
                return;
            }

            // 5. Fallback: Check Availability and Reverse Geocode
            try {
                const availability = await checkDeliveryAvailability(lat, lng);
                setDeliveryAvailable(availability?.serviceable || false);
                setTbAvailable(availability?.tbAvailable || false);
                setTbOffline(availability?.allOffline || false);

                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                    { headers: { "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)" } }
                );
                const json = await resp.json();
                const addressObj = json.address || {};
                const shortAddress = [
                    addressObj.suburb || addressObj.neighbourhood || addressObj.village,
                    addressObj.city || addressObj.town || addressObj.county
                ].filter(Boolean).join(', ') || json.display_name;
                
                const postcode = addressObj.postcode || '';
                setLocationAddress(postcode ? `${shortAddress}, ${postcode}` : shortAddress);
            } catch (err) {
                console.error('Reverse geocode / availability failed:', err);
                setLocationAddress("Location found");
            }

        } catch (error) {
            console.error('Location detection error:', error);
        } finally {
            setLocationLoading(false);
        }
    };
    
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
            SecureStore.deleteItemAsync(SELECTED_ADDRESS_KEY).catch(e => 
                console.error('Failed to clear address on logout:', e)
            );
        } else {
            // On Login or App Start while authenticated
            // We only trigger detectLocation if we don't have a selection yet
            // Or if we specifically want to refresh
            if (!selectedAddress) {
                detectLocation();
            }
        }
    }, [isAuthenticated]);
    
    // Auto-detect & Initial Load
    useEffect(() => {
        const initialLoad = async () => {
            const saved = await SecureStore.getItemAsync(SELECTED_ADDRESS_KEY);
            if (saved) {
                setSelectedAddressState(JSON.parse(saved));
            }
            await detectLocation();
        };
        initialLoad();
    }, []);

    // ── Sync Availability When Address/Location Changes ──
    useEffect(() => {
        const updateAvailability = async () => {
            const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
            const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

            if (lat !== undefined && lng !== undefined) {
                try {
                    // Set to null while fetching to avoid stale UI flashes
                    setTbAvailable(null);
                    setDeliveryAvailable(null);
                    
                    const availability = await checkDeliveryAvailability(lat, lng);
                    
                    setDeliveryAvailable(availability?.serviceable || false);
                    setTbAvailable(availability?.tbAvailable || false);
                    setTbOffline(availability?.allOffline || false);
                } catch (e) {
                    console.error('[AddressContext] Unified availability check failed:', e);
                    setDeliveryAvailable(false);
                    setTbAvailable(false);
                    setTbOffline(false);
                }
            }
        };

        updateAvailability();
    }, [selectedAddress, userLocation]);

    const setSelectedAddress = async (address: Address | null) => {
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
    };

    return (
        <AddressContext.Provider
            value={{
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
                detectLocation,
            }}
        >
            {children}
        </AddressContext.Provider>
    );
};

export const useAddress = () => {
    return useContext(AddressContext);
};
