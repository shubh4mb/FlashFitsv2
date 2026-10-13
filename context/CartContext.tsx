import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  addToCart as addToCartApi, 
  getCart as getCartApi, 
  getCartCount as getCartCountApi,
  updateCartQuantity as updateQtyApi,
  deleteCartItem as removeItemApi,
  clearCart as clearCartApi,
  moveToCourier as moveToCourierApi,
  selectOffer as selectOfferApi,
  deselectOffer as deselectOfferApi,
  AddToCartParams
} from '../api/cart';
import { useAddress } from './AddressContext';
import { useAuth } from './AuthContext';

const GUEST_CART_KEY = '@flashfits_guest_cart';

const calculateGuestMerchantCarts = (items: CartItem[]): MerchantCart[] => {
  const map: Record<string, CartItem[]> = {};
  items.forEach(item => {
    const mId = String(item.merchantId?._id || item.merchantId || 'flashmart');
    if (!map[mId]) map[mId] = [];
    map[mId].push(item);
  });

  return Object.keys(map).map(mId => {
    const mItems = map[mId];
    const firstItem = mItems[0];
    const shopName = firstItem?.productId?.shopName || firstItem?.productId?.name || 'Store';
    const subtotal = mItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const mrpTotal = mItems.reduce((acc, i) => acc + (Number(i.mrp) || Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const discount = Math.max(0, mrpTotal - subtotal);

    return {
      merchantId: mId,
      merchantDetails: {
        _id: mId,
        shopName,
        isOnline: true,
      },
      items: mItems,
      deliveryDetails: {
        isEligibleForTryBuy: true,
      },
      totals: {
        subtotal,
        mrpTotal,
        discount,
        totalDeliveryCharge: 0,
        totalReturnCharge: 0,
        deliveryTip: 0,
        serviceGST: 0,
        totalUpfrontPayable: 0,
        finalTotal: subtotal,
      },
      appliedOffers: [],
    };
  });
};

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

interface MerchantCartTotals {
  subtotal: number;
  mrpTotal: number;
  discount: number;
  totalDeliveryCharge: number;
  totalReturnCharge: number;
  deliveryTip: number;
  serviceGST: number;
  totalUpfrontPayable: number;
  finalTotal: number;
}

interface MerchantCart {
  merchantId: string;
  merchantDetails: {
    _id: string;
    shopName: string;
    isOnline: boolean;
    reopenTime?: string;
  };
  items: CartItem[];
  deliveryDetails: any;
  totals: MerchantCartTotals;
  appliedOffers: any;
}

interface CartData {
  merchantCarts: MerchantCart[];
  // Legacy flat fields for backward compat (header badge, etc.)
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
  clearCart: (merchantId?: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  moveToCourier: (params: { merchantId?: string; itemId?: string }) => Promise<void>;
  deliveryTip: number;
  setDeliveryTip: (tip: number) => void;
  applyOffer: (offerId: string, targetItemIds?: string[]) => Promise<void>;
  removeOffer: (offerId: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { selectedAddress, userLocation } = useAddress();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryTip, setDeliveryTip] = useState(0);
  const { isAuthenticated } = useAuth();

  const inFlightRef = useRef(false);

  const fetchCart = useCallback(async (isSilent = false) => {
    if (!isAuthenticated) {
      try {
        const stored = await AsyncStorage.getItem(GUEST_CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setCart(parsed);
        } else {
          setCart({ items: [], totalItems: 0, merchantCarts: [] });
        }
      } catch (e) {
        console.warn('Error reading guest cart:', e);
        setCart({ items: [], totalItems: 0, merchantCarts: [] });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (!isSilent) setLoading(true);
      const addressId = selectedAddress?._id || (selectedAddress as any)?.id;
      
      const latitude = selectedAddress?.location?.coordinates?.[1] || 
                       (selectedAddress as any)?.latitude || 
                       userLocation?.latitude;
                       
      const longitude = selectedAddress?.location?.coordinates?.[0] || 
                        (selectedAddress as any)?.longitude || 
                        userLocation?.longitude;
      
      const serviceable = !!selectedAddress ? 
                         (selectedAddress?.addressType !== 'Non-serviceable' && (selectedAddress as any)?.isServiceable !== false) : 
                         !!userLocation;
      
      const response = await getCartApi(addressId, serviceable, deliveryTip, latitude, longitude);
      setCart(response);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      inFlightRef.current = false;
      if (!isSilent) setLoading(false);
    }
  }, [isAuthenticated, selectedAddress, userLocation, deliveryTip]);

  // Sync Guest Cart on Login, or fetch on mount
  useEffect(() => {
    if (isAuthenticated) {
      const syncGuestCart = async () => {
        try {
          const stored = await AsyncStorage.getItem(GUEST_CART_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.items?.length) {
              for (const item of parsed.items) {
                try {
                  await addToCartApi({
                    productId: item.productId?._id || item.productId,
                    variantId: item.variantId,
                    size: item.size,
                    quantity: item.quantity || 1,
                    merchantId: String(item.merchantId?._id || item.merchantId),
                    image: item.image,
                    source: (item as any).source || 'shop',
                  });
                } catch (err) {
                  console.warn('Failed to sync guest cart item on login:', err);
                }
              }
            }
            await AsyncStorage.removeItem(GUEST_CART_KEY);
          }
        } catch (e) {
          console.error('Error syncing guest cart on login:', e);
        } finally {
          fetchCart();
        }
      };
      syncGuestCart();
    } else {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const addToCart = useCallback(async (params: AddToCartParams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isAuthenticated) {
      try {
        const stored = await AsyncStorage.getItem(GUEST_CART_KEY);
        const currentCart: CartData = stored ? JSON.parse(stored) : { items: [], totalItems: 0, merchantCarts: [] };
        const currentItems = currentCart.items || [];

        const targetMerchantId = String(params.merchantId || 'flashmart');
        const imgUrl = typeof params.image === 'string' ? params.image : (params.image?.url || '');

        const existingIndex = currentItems.findIndex(i =>
          String(i.productId?._id || i.productId) === String(params.productId) &&
          i.size === params.size &&
          (i.variantId === params.variantId || !params.variantId)
        );

        let newItems: CartItem[];
        if (existingIndex > -1) {
          newItems = [...currentItems];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: (newItems[existingIndex].quantity || 1) + (params.quantity || 1),
          };
        } else {
          const newItem: CartItem = {
            _id: `${params.variantId || params.productId}_${params.size}_${Date.now()}`,
            productId: params.product || {
              _id: params.productId,
              name: params.productName || 'Product',
              images: [{ url: imgUrl }],
              price: params.price,
              mrp: params.mrp,
              shopName: params.shopName,
            },
            variantId: params.variantId,
            size: params.size,
            quantity: params.quantity || 1,
            stockQuantity: 10,
            merchantId: targetMerchantId,
            image: imgUrl,
            price: params.price ?? 0,
            mrp: params.mrp ?? (params.price ?? 0),
          };
          (newItem as any).source = params.source || 'shop';
          newItems = [...currentItems, newItem];
        }

        const newMerchantCarts = calculateGuestMerchantCarts(newItems);
        const newCart: CartData = {
          items: newItems,
          totalItems: newItems.reduce((acc, i) => acc + (i.quantity || 1), 0),
          merchantCarts: newMerchantCarts,
        };

        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
        setCart(newCart);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error('Guest add to cart failed:', e);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      await addToCartApi(params);
      await fetchCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Add to cart failed:', error?.response?.data?.message || error?.message || error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  }, [isAuthenticated, fetchCart]);

  const updateQuantity = useCallback(async (cartId: string, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isAuthenticated) {
      if (!cart) return;
      let newItems = cart.items.map(item => item._id === cartId ? { ...item, quantity } : item);
      if (quantity <= 0) {
        newItems = newItems.filter(item => item._id !== cartId);
      }
      const newMerchantCarts = calculateGuestMerchantCarts(newItems);
      const newCart: CartData = {
        items: newItems,
        totalItems: newItems.reduce((acc, i) => acc + (i.quantity || 1), 0),
        merchantCarts: newMerchantCarts,
      };
      await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
      setCart(newCart);
      return;
    }

    let previousCart: CartData | null = null;
    
    setCart(prevCart => {
      previousCart = prevCart;
      if (!prevCart) return null;
      return {
        ...prevCart,
        items: prevCart.items.map(item => 
          item._id === cartId ? { ...item, quantity } : item
        ),
        merchantCarts: prevCart.merchantCarts.map(mc => ({
          ...mc,
          items: mc.items.map(item =>
            item._id === cartId ? { ...item, quantity } : item
          ),
        })),
      };
    });

    try {
      await updateQtyApi(cartId, quantity);
      await fetchCart(true); // Silent background fetch without loader overlay
    } catch (error) {
      console.error('Update quantity failed:', error);
      if (previousCart) {
        setCart(previousCart);
      }
      await fetchCart(true);
      throw error;
    }
  }, [isAuthenticated, cart, fetchCart]);

  const removeItem = useCallback(async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isAuthenticated) {
      if (!cart) return;
      const newItems = cart.items.filter(item => item._id !== itemId);
      const newMerchantCarts = calculateGuestMerchantCarts(newItems);
      const newCart: CartData = {
        items: newItems,
        totalItems: newItems.reduce((acc, i) => acc + (i.quantity || 1), 0),
        merchantCarts: newMerchantCarts,
      };
      await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
      setCart(newCart);
      return;
    }

    let previousCart: CartData | null = null;

    setCart(prevCart => {
      previousCart = prevCart;
      if (!prevCart) return null;
      return {
        ...prevCart,
        items: prevCart.items.filter(item => item._id !== itemId),
        merchantCarts: prevCart.merchantCarts
          .map(mc => ({
            ...mc,
            items: mc.items.filter(item => item._id !== itemId),
          }))
          .filter(mc => mc.items.length > 0),
      };
    });

    try {
      await removeItemApi(itemId);
      await fetchCart(true); // Silent background fetch
    } catch (error) {
      console.error('Remove item failed:', error);
      if (previousCart) {
        setCart(previousCart);
      }
      await fetchCart(true);
      throw error;
    }
  }, [isAuthenticated, cart, fetchCart]);

  const clearCart = useCallback(async (merchantId?: string) => {
    if (!isAuthenticated) {
      if (merchantId && cart) {
        const newItems = cart.items.filter(item => String(item.merchantId?._id || item.merchantId) !== String(merchantId));
        const newMerchantCarts = calculateGuestMerchantCarts(newItems);
        const newCart: CartData = {
          items: newItems,
          totalItems: newItems.reduce((acc, i) => acc + (i.quantity || 1), 0),
          merchantCarts: newMerchantCarts,
        };
        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
        setCart(newCart);
      } else {
        await AsyncStorage.removeItem(GUEST_CART_KEY);
        setCart({ items: [], totalItems: 0, merchantCarts: [] });
      }
      return;
    }

    try {
      await clearCartApi(merchantId);
      if (merchantId) {
        if (cart) {
          setCart({
            ...cart,
            items: cart.items.filter(item => item.merchantId.toString() !== merchantId.toString()),
            merchantCarts: cart.merchantCarts.filter(mc => mc.merchantId.toString() !== merchantId.toString()),
          });
        }
      } else {
        setCart({ items: [], totalItems: 0, merchantCarts: [] });
      }
      await fetchCart();
    } catch (error) {
      console.error('Clear cart failed:', error);
      await fetchCart();
    }
  }, [isAuthenticated, cart, fetchCart]);

  const moveToCourier = useCallback(async (params: { merchantId?: string; itemId?: string }) => {
    try {
      setLoading(true);
      await moveToCourierApi(params);
      await fetchCart();
    } catch (error) {
      console.error('Move to courier failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  const applyOffer = useCallback(async (offerId: string, targetItemIds?: string[]) => {
    try {
      setLoading(true);
      await selectOfferApi(offerId, targetItemIds);
      await fetchCart();
    } catch (error) {
      console.error('Apply offer failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  const removeOffer = useCallback(async (offerId: string) => {
    try {
      setLoading(true);
      await deselectOfferApi(offerId);
      await fetchCart();
    } catch (error) {
      console.error('Remove offer failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  const contextValue = useMemo(() => ({
    cart, 
    loading, 
    addToCart, 
    updateQuantity, 
    removeItem, 
    clearCart,
    refreshCart: fetchCart,
    moveToCourier,
    deliveryTip,
    setDeliveryTip,
    applyOffer,
    removeOffer,
  }), [
    cart, 
    loading, 
    addToCart, 
    updateQuantity, 
    removeItem, 
    clearCart,
    fetchCart,
    moveToCourier,
    deliveryTip,
    setDeliveryTip,
    applyOffer,
    removeOffer,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
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
