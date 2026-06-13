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

/**
 * Authenticate user using Google ID Token
 * Returns { token, refreshToken, userId, isNewUser } on success
 */
export const googleLogin = async (idToken: string) => {
    const response = await api.post('/auth/google-login', { idToken });
    return response.data;
};

/**
 * Get current user profile details
 */
export const getUserProfile = async () => {
    const response = await api.get('/user/profile');
    return response.data;
};

/**
 * Update user phone number
 */
export const updateUserProfilePhone = async (phoneNumber: string) => {
    const response = await api.put('/user/profile/phone', { phoneNumber });
    return response.data;
};

