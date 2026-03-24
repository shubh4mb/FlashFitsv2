import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from "expo-constants";
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

/**
 * Basic API response structure
 */
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// Extract base URL from Expo Constants
const getBaseURL = (): string => {
  const url = Constants.expoConfig?.extra?.BACKEND_URL;
  return url ? `${url}/api/` : '/api/';
};

// Create the axios instance
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Authentication management
 */
let authToken: string | null = null;

export const updateAuthToken = (token: string | null) => {
  authToken = token;
};

// Request Interceptor: Attach bearer token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = authToken || await SecureStore.getItemAsync('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle auth failures
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clean up session
      await Promise.all([
        SecureStore.deleteItemAsync('token'),
        SecureStore.deleteItemAsync('selectedAddress'),
        SecureStore.setItemAsync("addressSelectedOnce", "false"),
      ]);
      
      updateAuthToken(null);
      DeviceEventEmitter.emit('auth_unauthorized');

      // Force navigation to auth flow
      if (router.canGoBack()) {
        router.replace('/(auth)' as any);
      } else {
        router.push('/(auth)' as any);
      }
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Unwrap data property from successful API responses
api.interceptors.response.use((response: AxiosResponse) => {
  const apiResponse = response.data as ApiResponse;
  
  // Unwrap if the response follows the standard ApiResponse format
  if (apiResponse && typeof apiResponse.success === 'boolean' && apiResponse.data !== undefined) {
    response.data = apiResponse.data;
  }
  
  return response;
});

export default api;
