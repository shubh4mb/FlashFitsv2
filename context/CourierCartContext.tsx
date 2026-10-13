import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addToCourierCart as addToCourierCartApi,
  getCourierCart as getCourierCartApi,
  updateCourierCartQuantity as updateQtyApi,
  deleteCourierCartItem as removeItemApi,
  clearCourierCart as clearCourierCartApi,
  selectOfferCourier as selectOfferApi,
  deselectOfferCourier as deselectOfferApi,
  AddToCourierCartParams,
} from '../api/courier';

import { useAuth } from './AuthContext';

const GUEST_COURIER_CART_KEY = '@flashfits_guest_courier_cart';

interface CourierCartItem {
  _id: string;
  productId: any;
  variantId: string;
  size: string;
  quantity: number;
  stockQuantity: number;
  merchantId: any;
  image: string;
  price: number;
  mrp: number;
}

interface CourierCartData {
  items: CourierCartItem[];
  totalItems: number;
  totals?: {
    subtotal: number;
    mrpTotal: number;
    discount: number;
    courierDeliveryCharge: number;
    totalPayable: number;
  };
  appliedOffers?: any; // New field from backend
}

interface CourierCartContextType {
  courierCart: CourierCartData | null;
  loading: boolean;
  addToCourierCart: (params: AddToCourierCartParams) => Promise<void>;
  updateQuantity: (cartId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  applyOfferCourier: (offerId: string, targetItemIds?: string[]) => Promise<void>;
  removeOfferCourier: (offerId: string) => Promise<void>;
}

const calculateGuestCourierTotals = (items: CourierCartItem[]) => {
  let subtotal = 0;
  let mrpTotal = 0;
  items.forEach(item => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const mrp = item.mrp || price;
    subtotal += price * qty;
    mrpTotal += mrp * qty;
  });
  const discount = Math.max(0, mrpTotal - subtotal);
  const courierDeliveryCharge = subtotal > 0 ? (subtotal >= 499 ? 0 : 49) : 0;
  const totalPayable = subtotal + courierDeliveryCharge;
  return {
    subtotal,
    mrpTotal,
    discount,
    courierDeliveryCharge,
    totalPayable,
  };
};

const CourierCartContext = createContext<CourierCartContextType | undefined>(undefined);

export const CourierCartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [courierCart, setCourierCart] = useState<CourierCartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async (isSilent = false) => {
    if (!isAuthenticated) {
      try {
        const stored = await AsyncStorage.getItem(GUEST_COURIER_CART_KEY);
        if (stored) {
          setCourierCart(JSON.parse(stored));
        } else {
          setCourierCart({ items: [], totalItems: 0, totals: calculateGuestCourierTotals([]) });
        }
      } catch (e) {
        console.warn('Error reading guest courier cart:', e);
        setCourierCart({ items: [], totalItems: 0, totals: calculateGuestCourierTotals([]) });
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      if (!isSilent) setLoading(true);
      const response = await getCourierCartApi();
      setCourierCart(response);
    } catch (error) {
      console.error('Failed to fetch courier cart:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [isAuthenticated]);

  // Sync guest courier cart upon login
  useEffect(() => {
    if (isAuthenticated) {
      const syncGuestCourierCart = async () => {
        try {
          const stored = await AsyncStorage.getItem(GUEST_COURIER_CART_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.items?.length) {
              for (const item of parsed.items) {
                try {
                  await addToCourierCartApi({
                    productId: item.productId?._id || item.productId,
                    variantId: item.variantId,
                    size: item.size,
                    quantity: item.quantity || 1,
                    merchantId: String(item.merchantId?._id || item.merchantId),
                    image: item.image,
                  });
                } catch (err) {
                  console.warn('Failed to sync guest courier cart item on login:', err);
                }
              }
            }
            await AsyncStorage.removeItem(GUEST_COURIER_CART_KEY);
          }
        } catch (e) {
          console.error('Error syncing guest courier cart on login:', e);
        } finally {
          fetchCart();
        }
      };
      syncGuestCourierCart();
    } else {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const addToCourierCart = useCallback(async (params: AddToCourierCartParams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isAuthenticated) {
      try {
        const stored = await AsyncStorage.getItem(GUEST_COURIER_CART_KEY);
        const currentCart: CourierCartData = stored ? JSON.parse(stored) : { items: [], totalItems: 0 };
        const currentItems = currentCart.items || [];
        const imgUrl = typeof params.image === 'string' ? params.image : (params.image?.url || '');

        const existingIndex = currentItems.findIndex(i =>
          String(i.productId?._id || i.productId) === String(params.productId) &&
          i.size === params.size &&
          (i.variantId === params.variantId || !params.variantId)
        );

        let newItems: CourierCartItem[];
        if (existingIndex > -1) {
          newItems = [...currentItems];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: (newItems[existingIndex].quantity || 1) + (params.quantity || 1),
          };
        } else {
          const newItem: CourierCartItem = {
            _id: `${params.variantId || params.productId}_${params.size}_${Date.now()}`,
            productId: params.product || {
              _id: params.productId,
              name: params.productName || 'Product',
              images: [{ url: imgUrl }],
              price: params.price,
              mrp: params.mrp,
              shopName: params.shopName,
            },
            variantId: params.variantId || '',
            size: params.size,
            quantity: params.quantity || 1,
            stockQuantity: 99,
            merchantId: params.merchantId || '',
            image: imgUrl,
            price: params.price || 0,
            mrp: params.mrp || params.price || 0,
          };
          newItems = [...currentItems, newItem];
        }

        const totalItems = newItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
        const totals = calculateGuestCourierTotals(newItems);
        const newCart: CourierCartData = {
          items: newItems,
          totalItems,
          totals,
        };

        await AsyncStorage.setItem(GUEST_COURIER_CART_KEY, JSON.stringify(newCart));
        setCourierCart(newCart);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error('Guest add to courier cart failed:', e);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      await addToCourierCartApi(params);
      await fetchCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Add to courier cart failed:', error?.response?.data?.message || error?.message || error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  }, [isAuthenticated, fetchCart]);

  const updateQuantity = useCallback(async (cartId: string, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isAuthenticated) {
      try {
        const stored = await AsyncStorage.getItem(GUEST_COURIER_CART_KEY);
        if (stored) {
          const currentCart: CourierCartData = JSON.parse(stored);
          const newItems = (currentCart.items || []).map(item =>
            item._id === cartId ? { ...item, quantity } : item
          );
          const totalItems = newItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
          const totals = calculateGuestCourierTotals(newItems);
          const newCart: CourierCartData = {
            items: newItems,
            totalItems,
            totals,
          };
          await AsyncStorage.setItem(GUEST_COURIER_CART_KEY, JSON.stringify(newCart));
          setCourierCart(newCart);
        }
      } catch (e) {
        console.error('Guest courier cart update quantity failed:', e);
      }
      return;
    }

    let previousCart: CourierCartData | null = null;

    setCourierCart(prevCart => {
      previousCart = prevCart;
      if (!prevCart) return null;
      return {
        ...prevCart,
        items: prevCart.items.map(item =>
          item._id === cartId ? { ...item, quantity } : item
        ),
      };
    });

    try {
      await updateQtyApi(cartId, quantity);
      await fetchCart(true); // Silent fetch without full page overlay
    } catch (error) {
      console.error('Update courier cart quantity failed:', error);
      if (previousCart) {
        setCourierCart(previousCart);
      }
      await fetchCart(true);
      throw error;
    }
  }, [isAuthenticated, fetchCart]);

  const removeItem = useCallback(async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isAuthenticated) {
      try {
        const stored = await AsyncStorage.getItem(GUEST_COURIER_CART_KEY);
        if (stored) {
          const currentCart: CourierCartData = JSON.parse(stored);
          const newItems = (currentCart.items || []).filter(item => item._id !== itemId);
          const totalItems = newItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
          const totals = calculateGuestCourierTotals(newItems);
          const newCart: CourierCartData = {
            items: newItems,
            totalItems,
            totals,
          };
          await AsyncStorage.setItem(GUEST_COURIER_CART_KEY, JSON.stringify(newCart));
          setCourierCart(newCart);
        }
      } catch (e) {
        console.error('Guest courier cart remove item failed:', e);
      }
      return;
    }

    let previousCart: CourierCartData | null = null;

    setCourierCart(prevCart => {
      previousCart = prevCart;
      if (!prevCart) return null;
      return {
        ...prevCart,
        items: prevCart.items.filter(item => item._id !== itemId),
      };
    });

    try {
      await removeItemApi(itemId);
      await fetchCart(true);
    } catch (error) {
      console.error('Remove courier cart item failed:', error);
      if (previousCart) {
        setCourierCart(previousCart);
      }
      await fetchCart(true);
      throw error;
    }
  }, [isAuthenticated, fetchCart]);

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      try {
        await AsyncStorage.removeItem(GUEST_COURIER_CART_KEY);
        setCourierCart({ items: [], totalItems: 0, totals: calculateGuestCourierTotals([]) });
      } catch (e) {
        console.error('Guest courier clear cart failed:', e);
      }
      return;
    }

    try {
      await clearCourierCartApi();
      setCourierCart({ items: [], totalItems: 0 });
    } catch (error) {
      console.error('Clear courier cart failed:', error);
      await fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const applyOfferCourier = useCallback(async (offerId: string, targetItemIds?: string[]) => {
    try {
      setLoading(true);
      await selectOfferApi(offerId, targetItemIds);
      await fetchCart();
    } catch (error) {
      console.error('Apply offer to courier cart failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  const removeOfferCourier = useCallback(async (offerId: string) => {
    try {
      setLoading(true);
      await deselectOfferApi(offerId);
      await fetchCart();
    } catch (error) {
      console.error('Remove offer from courier cart failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  const contextValue = useMemo(() => ({
    courierCart,
    loading,
    addToCourierCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: fetchCart,
    applyOfferCourier,
    removeOfferCourier,
  }), [
    courierCart,
    loading,
    addToCourierCart,
    updateQuantity,
    removeItem,
    clearCart,
    fetchCart,
    applyOfferCourier,
    removeOfferCourier,
  ]);

  return (
    <CourierCartContext.Provider value={contextValue}>
      {children}
    </CourierCartContext.Provider>
  );
};

export const useCourierCart = () => {
  const context = useContext(CourierCartContext);
  if (!context) {
    throw new Error('useCourierCart must be used within a CourierCartProvider');
  }
  return context;
};
