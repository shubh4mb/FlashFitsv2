import api from './axiosConfig';

export interface Address {
    _id: string;
    addressType: string;
    addressLine1: string;
    addressLine2?: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    location?: {
        type: string;
        coordinates: [number, number]; // [lng, lat]
    };
    isDefault?: boolean;
}

export const getAddresses = async () => {
    try {
        // Corrected endpoint to match legacy FlashFits backend
        const response = await api.get('user/address/getAllAddress');
        return response.data;
    } catch (error) {
        console.error('Error fetching addresses:', error);
        throw error;
    }
};

export const addAddress = async (addressData: Omit<Address, '_id'>) => {
    try {
        // Corrected endpoint to match legacy FlashFits backend
        const response = await api.post('user/address/add', addressData);
        return response.data;
    } catch (error) {
        console.error('Error adding address:', error);
        throw error;
    }
};

export const deleteAddress = async (addressId: string) => {
    try {
        // Assuming this endpoint exists based on pattern, but FlashFits didn't explicitly show it in cartProduct.ts
        const response = await api.delete(`user/address/delete/${addressId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting address:', error);
        throw error;
    }
};
