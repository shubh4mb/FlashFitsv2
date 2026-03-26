import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import * as SecureStore from 'expo-secure-store'; // Note: SecureStore is imported but used later if needed
import { Address, getAddresses } from "../api/address";
import * as Location from 'expo-location';
import { checkDeliveryAvailability } from "../api/auth";

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
    locationPermission: 'undetermined',
    locationLoading: true,
    detectLocation: async () => { },
});

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    
    // New States
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationAddress, setLocationAddress] = useState<string | null>(null);
    const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | 'undetermined'>('undetermined');
    const [locationLoading, setLocationLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);

    const detectLocation = async () => {
        try {
            setLocationLoading(true);
            
            // 1. Request Permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);
            
            if (status !== 'granted') {
                console.warn('Location permission denied. Exploring app with generic content.');
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

            let fetchedPostcode = '';

            // 3. Reverse Geocode via OpenStreetMap (Nominatim)
            try {
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                    {
                        headers: { "User-Agent": "FlashFitsApp/1.0 (contact@flashfits.com)" },
                    }
                );
                const json = await resp.json();
                console.log("StreetMap Fetch Response:", json);
                
                // Format a short display address
                const addressObj = json.address || {};
                fetchedPostcode = addressObj.postcode || '';
                const shortAddress = [
                    addressObj.suburb || addressObj.neighbourhood || addressObj.village,
                    addressObj.city || addressObj.town || addressObj.county
                ].filter(Boolean).join(', ') || json.display_name;
                
                setLocationAddress(fetchedPostcode ? `${shortAddress}, ${fetchedPostcode}` : shortAddress);
            } catch (geocodeErr) {
                console.error('Reverse geocode failed:', geocodeErr);
                setLocationAddress("Location found");
            }

            // 4. Check Delivery Availability
            try {
                const availability = await checkDeliveryAvailability(lat, lng);
                setDeliveryAvailable(availability?.serviceable || false);
                
                if (availability?.zone?.zoneName && availability?.zone?.city) {
                    const zoneStr = `${availability.zone.zoneName}, ${availability.zone.city}`;
                    setLocationAddress(fetchedPostcode ? `${zoneStr}, ${fetchedPostcode}` : zoneStr);
                }
            } catch (availErr) {
                console.error('Delivery check failed:', availErr);
                setDeliveryAvailable(null); // Unknown state
            }

        } catch (error) {
            console.error('Location detection error:', error);
        } finally {
            setLocationLoading(false);
        }
    };
    
    // Retry availability check if it failed (e.g. backend inactive)
    useEffect(() => {
        if (userLocation && deliveryAvailable === null && retryCount < 3) {
            const timer = setTimeout(async () => {
                try {
                    console.log(`Retrying availability check (Attempt ${retryCount + 1})...`);
                    const availability = await checkDeliveryAvailability(userLocation.latitude, userLocation.longitude);
                    if (availability) {
                        setDeliveryAvailable(availability.serviceable || false);
                        if (availability.zone?.zoneName && availability.zone?.city) {
                            const zoneStr = `${availability.zone.zoneName}, ${availability.zone.city}`;
                            setLocationAddress(prev => prev?.includes(',') ? prev : zoneStr);
                        }
                    } else {
                        setRetryCount(prev => prev + 1);
                    }
                } catch (err) {
                    console.error('Retry failed:', err);
                    setRetryCount(prev => prev + 1);
                }
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [userLocation, deliveryAvailable, retryCount]);

    // Auto-detect on mount
    useEffect(() => {
        detectLocation();
        
        // Load Addresses (Fallback / Background)
        const loadSavedAddress = async () => {
            try {
                /*
                const saved = await SecureStore.getItemAsync(SELECTED_ADDRESS_KEY);
                if (saved) {
                    setSelectedAddressState(JSON.parse(saved));
                }
                const res = await getAddresses();
                setAddresses(res?.addresses || []);
                */
            } catch (error) {
                console.error('Failed to load saved address:', error);
            }
        };
        loadSavedAddress();
    }, []);

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
