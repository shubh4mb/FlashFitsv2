import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
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

const CourierCartContext = createContext<CourierCartContextType | undefined>(undefined);

export const CourierCartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [courierCart, setCourierCart] = useState<CourierCartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async (isSilent = false) => {
    if (!isAuthenticated) {
      setLoading(false);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCourierCart({ items: [], totalItems: 0 });
    }
  }, [isAuthenticated]);

  const addToCourierCart = async (params: AddToCourierCartParams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addToCourierCartApi(params);
      await fetchCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Add to courier cart failed:', error?.response?.data?.message || error?.message || error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  const updateQuantity = async (cartId: string, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  };

  const removeItem = async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
  };

  const clearCart = async () => {
    try {
      await clearCourierCartApi();
      setCourierCart({ items: [], totalItems: 0 });
    } catch (error) {
      console.error('Clear courier cart failed:', error);
      await fetchCart();
    }
  };

  const applyOfferCourier = async (offerId: string, targetItemIds?: string[]) => {
    try {
      setLoading(true);
      await selectOfferApi(offerId, targetItemIds);
      await fetchCart();
    } catch (error) {
      console.error('Apply offer to courier cart failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeOfferCourier = async (offerId: string) => {
    try {
      setLoading(true);
      await deselectOfferApi(offerId);
      await fetchCart();
    } catch (error) {
      console.error('Remove offer from courier cart failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CourierCartContext.Provider
      value={{
        courierCart,
        loading,
        addToCourierCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart: fetchCart,
        applyOfferCourier,
        removeOfferCourier,
      }}
    >
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
