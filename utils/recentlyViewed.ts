import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { addToRecentlyViewedApi, getRecentlyViewedApi } from '../api/recentlyViewed';

const GUEST_RECENTLY_VIEWED_KEY = '@flashfits_guest_recently_viewed';
const MAX_RECENTLY_VIEWED = 20;

export interface Product {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  mrp?: number;
  images?: { url: string }[];
  ratings?: number | string;
  isTriable?: boolean;
  variants?: any[];
  variant?: any;
  variantId?: string;
  subCategory?: string;
  subCategoryId?: any;
  category?: string;
  categoryId?: any;
  gender?: string | string[];
  brand?: string;
  brandId?: string;
  isNearby?: boolean;
  isOnline?: boolean;
  isInstantBuyable?: boolean;
  isWarehouseListing?: boolean;
  source?: string;
  warehouseId?: any;
  stock?: number;
  totalStock?: number;
  inStock?: boolean;
  isStoreInactive?: boolean;
  isAvailable?: boolean;
}

/**
 * Adds a product to the recently viewed list.
 * Persists locally in AsyncStorage (for guests and offline mode) and syncs to backend if authenticated.
 */
export const addToRecentlyViewed = async (product: Product) => {
  const productId = product._id || product.id;
  if (!productId) return;

  // 1. Always save to local AsyncStorage for immediate guest support
  try {
    const stored = await AsyncStorage.getItem(GUEST_RECENTLY_VIEWED_KEY);
    const existingList: Product[] = stored ? JSON.parse(stored) : [];
    const filtered = existingList.filter(p => (p._id || p.id) !== productId);
    const updated = [product, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    await AsyncStorage.setItem(GUEST_RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch (err) {
    // Silent fallback
  }

  // 2. If authenticated, also sync to backend
  try {
    const token = await SecureStore.getItemAsync('token');
    const variantId = product.variantId;
    if (token && variantId) {
      await addToRecentlyViewedApi(productId, variantId);
    }
  } catch (e: any) {
    // 401 unauthenticated errors are expected for guests - ignore silently
    if (e?.response?.status !== 401 && __DEV__) {
      console.warn('Could not sync recently viewed product to backend:', e?.message);
    }
  }
};

/**
 * Retrieves the list of recently viewed products.
 * If user is unauthenticated or backend returns 401, seamlessly falls back to local storage.
 */
export const getRecentlyViewed = async (lat?: number, lng?: number): Promise<Product[]> => {
  try {
    const token = await SecureStore.getItemAsync('token');

    // If unauthenticated guest, read directly from AsyncStorage without triggering a 401
    if (!token) {
      const stored = await AsyncStorage.getItem(GUEST_RECENTLY_VIEWED_KEY);
      return stored ? JSON.parse(stored) : [];
    }

    // Authenticated user: fetch from backend
    const response = await getRecentlyViewedApi(lat, lng);
    return response || [];
  } catch (e: any) {
    // If backend returns 401 or network error, silently fall back to local AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(GUEST_RECENTLY_VIEWED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
};

/**
 * Clears all recently viewed products locally.
 */
export const clearRecentlyViewed = async () => {
  try {
    await AsyncStorage.removeItem(GUEST_RECENTLY_VIEWED_KEY);
  } catch (e) {
    // Silent
  }
};
