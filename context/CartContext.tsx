import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { 
  addToCart as addToCartApi, 
  getCart as getCartApi, 
  getCartCount as getCartCountApi,
  updateCartQuantity as updateQtyApi,
  deleteCartItem as removeItemApi,
  clearCart as clearCartApi,
  AddToCartParams
} from '../api/cart';
import { useAddress } from './AddressContext';

interface CartItem {
  _id: string; // The ID in the items array
  productId: any;
  variantId: string;
  size: string;
  quantity: number;
  stockQuantity: number;
  merchantId: any;
  image: string;
  price: number;
  mrp: number;
  merchantDelivery?: any;
}

interface CartData {
  items: CartItem[];
  totalItems: number;
  deliveryDetails?: any;
}

interface CartContextType {
  cart: CartData | null;
  loading: boolean;
  addToCart: (params: AddToCartParams) => Promise<void>;
  updateQuantity: (cartId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedAddress } = useAddress();

  const fetchCart = async () => {
    try {
      setLoading(true);
      const addressId = selectedAddress?._id;
      const response = await getCartApi(addressId);
      setCart(response);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [selectedAddress?._id]);

  const addToCart = async (params: AddToCartParams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addToCartApi(params);
      await fetchCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Add to cart failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  const updateQuantity = async (cartId: string, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Optimistic update
      if (cart) {
        setCart({
          ...cart,
          items: cart.items.map(item => 
            item._id === cartId ? { ...item, quantity } : item
          )
        });
      }

      await updateQtyApi(cartId, quantity);
      await fetchCart(); // Re-fetch to get accurate delivery/totals
    } catch (error) {
      console.error('Update quantity failed:', error);
      await fetchCart(); // Revert on error
    }
  };

  const removeItem = async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Optimistic update
      if (cart) {
        setCart({
          ...cart,
          items: cart.items.filter(item => item._id !== itemId)
        });
      }

      await removeItemApi(itemId);
      await fetchCart();
    } catch (error) {
      console.error('Remove item failed:', error);
      await fetchCart();
    }
  };

  const clearCart = async () => {
    try {
      await clearCartApi();
      setCart({ items: [], totalItems: 0 });
    } catch (error) {
      console.error('Clear cart failed:', error);
      await fetchCart();
    }
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      loading, 
      addToCart, 
      updateQuantity, 
      removeItem, 
      clearCart,
      refreshCart: fetchCart 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
