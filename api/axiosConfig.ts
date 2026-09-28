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
  const url = Constants.expoConfig?.extra?.BACKEND_URL || 'https://api.theflashfits.com';
  return `${url}/api/`;
};

// Create the axios instance
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

/**
 * Authentication management
 */
let authToken: string | null = null;

export const updateAuthToken = (token: string | null) => {
  authToken = token;
};

/**
 * App-Instance Device Identifier
 * Privacy-compliant installation UUID (no hardware serials, MAC, or IMEI)
 */
let cachedDeviceId: string | null = null;
export const getAppDeviceId = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await SecureStore.getItemAsync('flashfits_device_id');
    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      await SecureStore.setItemAsync('flashfits_device_id', id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    return 'flashfits-client-device';
  }
};

// Request Interceptor: Attach bearer token and device ID
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const [token, deviceId] = await Promise.all([
      authToken || SecureStore.getItemAsync('token'),
      getAppDeviceId(),
    ]);

    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (deviceId) {
        config.headers['x-device-id'] = deviceId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle auth failures
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Do not trigger token refresh for public / auth endpoints
    const isPublicEndpoint = originalRequest.url?.includes('auth/') || 
                             originalRequest.url?.includes('user/checkDeliveryAvailability');

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(`${getBaseURL()}auth/refresh`, { refreshToken });
        // Assuming API sends back data inside response.data.data or response.data straight
        const token = res.data?.token || res.data?.data?.token;
        const newRefreshToken = res.data?.refreshToken || res.data?.data?.refreshToken;

        if (token) {
          await SecureStore.setItemAsync('token', token);
          if (newRefreshToken) await SecureStore.setItemAsync('refreshToken', newRefreshToken);
          updateAuthToken(token);
          
          processQueue(null, token);
          isRefreshing = false;
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } else {
           throw new Error("Invalid token refresh response");
        }
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;

        // Clean up session
        await Promise.all([
          SecureStore.deleteItemAsync('token'),
          SecureStore.deleteItemAsync('refreshToken'),
          SecureStore.deleteItemAsync('selectedAddress'),
          SecureStore.setItemAsync("addressSelectedOnce", "false"),
        ]);
        
        updateAuthToken(null);
        DeviceEventEmitter.emit('auth_unauthorized');

        // Navigation to auth flow is handled by RootLayout listening to 'auth_unauthorized' event
        error.isAuthError = true;
        return Promise.reject(error);
      }
    }
    // Handle 429 Rate Limiting with backoff retry
    if (error.response?.status === 429 && !originalRequest._retry429) {
      originalRequest._retry429 = true;
      const retryAfterSec = Number(error.response.headers?.['retry-after']) || 2;
      console.warn(`[Axios] 429 Rate Limit hit for ${originalRequest.url}. Retrying after ${retryAfterSec}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfterSec * 1000));
      return api(originalRequest);
    }

    if (error.response?.status === 401) {
      error.isAuthError = true;
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
