import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { 
  addToWishlist, 
  removeFromWishlist, 
  getMyWishlistIds, 
  getMyWishlist 
} from '../api/wishlist';
import { useAuth } from './AuthContext';

interface WishlistItem {
  productId: string;
  variantId: string;
  _id?: string;
}

interface WishlistContextType {
  wishlistIds: WishlistItem[];
  toggleWishlist: (productId: string, variantId: string) => Promise<void>;
  isInWishlist: (productId: string, variantId?: string) => boolean;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlistIds, setWishlistIds] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchIds = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await getMyWishlistIds();
      setWishlistIds(response?.wishlistIds || []);
    } catch (error) {
      console.error('Failed to fetch wishlist IDs:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistIds([]);
      setLoading(false);
    } else {
      fetchIds();
    }
  }, [isAuthenticated, fetchIds]);

  // Fast O(1) lookup set for ProductCards
  const wishlistKeySet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < wishlistIds.length; i++) {
      const item = wishlistIds[i];
      const p = String(item.productId);
      set.add(p);
      if (item.variantId) {
        set.add(`${p}_${String(item.variantId)}`);
      }
    }
    return set;
  }, [wishlistIds]);

  const isInWishlist = useCallback((productId: string, variantId?: string) => {
    const pId = String(productId);
    if (variantId) {
      return wishlistKeySet.has(`${pId}_${String(variantId)}`);
    }
    return wishlistKeySet.has(pId);
  }, [wishlistKeySet]);

  const toggleWishlist = useCallback(async (productId: string, variantId: string) => {
    // 1. Haptic Feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const existingItem = wishlistIds.find(item => item.productId === productId && item.variantId === variantId);
    const wasInWishlist = !!existingItem;

    // 2. Optimistic Update
    if (wasInWishlist) {
      setWishlistIds(prev => prev.filter(item => !(item.productId === productId && item.variantId === variantId)));
    } else {
      setWishlistIds(prev => [...prev, { productId, variantId }]);
    }

    try {
      if (wasInWishlist) {
        const itemToRemoveId = existingItem?._id;
        if (itemToRemoveId) {
          await removeFromWishlist(itemToRemoveId);
        } else {
          console.warn('Cannot remove: missing item _id');
        }
      } else {
        const pId = String(productId);
        const vId = String(variantId);
        const response = await addToWishlist(pId, vId);
        const newItem = { 
          productId: pId, 
          variantId: vId, 
          _id: response?._id 
        };
        setWishlistIds(prev => prev.map(item => (item.productId === pId && item.variantId === vId) ? newItem : item));
      }
    } catch (error: any) {
      console.error(`Wishlist toggle failed for Product: ${productId}, Variant: ${variantId}`);
      // 3. Revert on error
      if (wasInWishlist) {
        setWishlistIds(prev => [...prev, existingItem!]);
      } else {
        setWishlistIds(prev => prev.filter(item => !(item.productId === productId && item.variantId === variantId)));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [wishlistIds]);

  const contextValue = useMemo(() => ({
    wishlistIds,
    toggleWishlist,
    isInWishlist,
    loading,
    refreshWishlist: fetchIds,
  }), [wishlistIds, toggleWishlist, isInWishlist, loading, fetchIds]);

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
