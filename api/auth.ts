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

/**
 * Send OTP for email registration
 */
export const registerSendOtp = async (data: {
    name?: string;
    email: string;
    password: string;
    referralCode?: string;
}) => {
    const response = await api.post('/auth/register-send-otp', data);
    return response.data;
};

/**
 * Verify OTP and complete email registration
 */
export const registerVerifyOtp = async (data: {
    email: string;
    otp: string;
}) => {
    const response = await api.post('/auth/register-verify-otp', data);
    return response.data;
};

/**
 * Email and password login for customers
 */
export const emailLogin = async (data: {
    email: string;
    password: string;
}) => {
    const response = await api.post('/auth/login', data);
    return response.data;
};

/**
 * Resend OTP for email registration or password reset
 */
export const resendEmailOtp = async (data: {
    email: string;
    purpose?: 'email_register' | 'password_reset';
}) => {
    const response = await api.post('/auth/resend-email-otp', data);
    return response.data;
};

/**
 * Send password reset OTP to email
 */
export const forgotPasswordSendOtp = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
};

/**
 * Reset password using email OTP
 */
export const resetPasswordWithOtp = async (data: {
    email: string;
    otp: string;
    newPassword: string;
}) => {
    const response = await api.post('/auth/reset-password', data);
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
export const googleLogin = async (idToken: string, referralCode?: string) => {
    const payload: any = { idToken };
    if (referralCode) {
        payload.referralCode = referralCode;
    }
    const response = await api.post('/auth/google-login', payload);
    return response.data;
};

/**
 * Authenticate user using Apple Sign In credentials
 * Returns { token, refreshToken, userId, isNewUser } on success
 */
export const appleLogin = async (payload: {
    identityToken: string;
    user?: string;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
    referralCode?: string;
}) => {
    const response = await api.post('/auth/apple-login', payload);
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

/**
 * Get User Referral Stats
 */
export const getReferralStats = async () => {
    const response = await api.get('/user/referral-stats');
    return response.data;
};

/**
 * Permanently delete user account and associated data
 * (Apple App Store Guideline 5.1.1(v) compliance)
 */
export const deleteUserAccount = async () => {
    const response = await api.delete('/user/account');
    return response.data;
};

