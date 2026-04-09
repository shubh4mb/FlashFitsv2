import api from './axiosConfig';

/**
 * Send OTP to user's phone number via Twilio SMS
 * @param phone - Full phone number with country code (e.g. +91XXXXXXXXXX)
 */
export const sendOtp = async (phone: string) => {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
};

/**
 * Verify OTP and authenticate user
 * Returns { token, userId, isNewUser } on success
 */
export const verifyOtp = async (data: {
  phone: string;
  otp: string;
}) => {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
};

export const checkDeliveryAvailability = async (lat: number, lng: number) => {
    const response = await api.post('/user/checkDeliveryAvailability', { lat, lng });
    console.log(response.data, "response.data");
    return response.data;
}
