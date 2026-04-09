import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import {
  addToCourierCart as addToCourierCartApi,
  getCourierCart as getCourierCartApi,
  updateCourierCartQuantity as updateQtyApi,
  deleteCourierCartItem as removeItemApi,
  clearCourierCart as clearCourierCartApi,
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
}

interface CourierCartContextType {
  courierCart: CourierCartData | null;
  loading: boolean;
  addToCourierCart: (params: AddToCourierCartParams) => Promise<void>;
  updateQuantity: (cartId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CourierCartContext = createContext<CourierCartContextType | undefined>(undefined);

export const CourierCartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [courierCart, setCourierCart] = useState<CourierCartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getCourierCartApi();
      setCourierCart(response);
    } catch (error) {
      console.error('Failed to fetch courier cart:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Add to courier cart failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  const updateQuantity = async (cartId: string, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (courierCart) {
        setCourierCart({
          ...courierCart,
          items: courierCart.items.map(item =>
            item._id === cartId ? { ...item, quantity } : item
          ),
        });
      }
      await updateQtyApi(cartId, quantity);
      await fetchCart();
    } catch (error) {
      console.error('Update courier cart quantity failed:', error);
      await fetchCart();
    }
  };

  const removeItem = async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (courierCart) {
        setCourierCart({
          ...courierCart,
          items: courierCart.items.filter(item => item._id !== itemId),
        });
      }
      await removeItemApi(itemId);
      await fetchCart();
    } catch (error) {
      console.error('Remove courier cart item failed:', error);
      await fetchCart();
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
