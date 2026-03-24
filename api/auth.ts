import api from './axiosConfig';

/**
 * In the legacy FlashFits backend, this endpoint handles the complete login
 * It creates the user if they don't exist and returns a JWT immediately.
 * No separate OTP verification is enforced by this particular endpoint.
 */
export const phoneLogin = async (data: { phoneNumber: string }) => {
    // Corrected route to match legacy backend and user preference for testing
    const response = await api.post('/user/phoneLogin', data);
    return response.data;
};

// Kept for future use when real OTP system is implemented
export const verifyOtpToken = async (data: {
  phoneNumber: string,
  otp: string
}) => {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
};

export const checkDeliveryAvailability = async (lat: number, lng: number) => {
    const response = await api.post('/user/checkDeliveryAvailability', { lat, lng });
    return response.data;
}
