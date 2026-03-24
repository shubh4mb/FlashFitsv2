import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import * as SecureStore from 'expo-secure-store';
import { Address } from "../api/address";

const SELECTED_ADDRESS_KEY = 'selectedAddress';

interface AddressContextType {
    selectedAddress: Address | null;
    setSelectedAddress: (address: Address | null) => Promise<void>;
    addresses: Address[];
    setAddresses: (addresses: Address[]) => void;
    loading: boolean;
    openAddressModal: () => void;
    registerModal: (ref: any) => void;
}

const AddressContext = createContext<AddressContextType>({
    selectedAddress: null,
    setSelectedAddress: async () => { },
    addresses: [],
    setAddresses: () => { },
    loading: true,
    openAddressModal: () => { },
    registerModal: () => { },
});

export const AddressProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAddress, setSelectedAddressState] = useState<Address | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalRef, setModalRef] = useState<any>(null);

    const registerModal = (ref: any) => {
        setModalRef(ref);
    };

    const openAddressModal = () => {
        if (modalRef?.current) {
            modalRef.current.open();
        }
    };

    // Initial load from SecureStore
    useEffect(() => {
        const loadSavedAddress = async () => {
            try {
                const saved = await SecureStore.getItemAsync(SELECTED_ADDRESS_KEY);
                if (saved) {
                    setSelectedAddressState(JSON.parse(saved));
                }
            } catch (error) {
                console.error('Failed to load saved address:', error);
            } finally {
                setLoading(false);
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
                loading,
                openAddressModal,
                registerModal,
            }}
        >
            {children}
        </AddressContext.Provider>
    );
};

export const useAddress = () => {
    return useContext(AddressContext);
};
