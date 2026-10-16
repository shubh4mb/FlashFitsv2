import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  addToWishlist, 
  removeFromWishlist, 
  getMyWishlistIds, 
  getMyWishlist,
  syncWishlistApi
} from '../api/wishlist';
import { useAuth } from './AuthContext';

const GUEST_WISHLIST_KEY = '@flashfits_guest_wishlist';

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

  const loadGuestWishlist = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(GUEST_WISHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlistIds(parsed);
          return;
        }
      }
      setWishlistIds([]);
    } catch (e) {
      console.warn('Failed to load guest wishlist:', e);
      setWishlistIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIds = useCallback(async () => {
    if (!isAuthenticated) {
      await loadGuestWishlist();
      return;
    }
    try {
      const response = await getMyWishlistIds();
      const rawIds = response?.wishlistIds || [];
      const seenPids = new Set<string>();
      const dedupedIds: WishlistItem[] = [];
      for (const item of rawIds) {
        const pid = String(item.productId);
        if (pid && !seenPids.has(pid)) {
          seenPids.add(pid);
          dedupedIds.push(item);
        }
      }
      setWishlistIds(dedupedIds);
    } catch (error) {
      console.error('Failed to fetch wishlist IDs:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadGuestWishlist]);

  // Sync Guest Wishlist on Login, or fetch on mount / auth change
  useEffect(() => {
    if (isAuthenticated) {
      const syncGuestWishlist = async () => {
        try {
          const stored = await AsyncStorage.getItem(GUEST_WISHLIST_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const itemsToSync = parsed.map(item => ({
                productId: String(item.productId),
                variantId: String(item.variantId)
              })).filter(i => i.productId && i.variantId);

              if (itemsToSync.length > 0) {
                try {
                  await syncWishlistApi(itemsToSync);
                } catch (err) {
                  // Fallback: sync one by one if batch sync endpoint fails
                  for (const itm of itemsToSync) {
                    try {
                      await addToWishlist(itm.productId, itm.variantId);
                    } catch (e) {
                      // Ignore duplicate / individual errors
                    }
                  }
                }
              }
              await AsyncStorage.removeItem(GUEST_WISHLIST_KEY);
            }
          }
        } catch (e) {
          console.error('Error syncing guest wishlist on login:', e);
        } finally {
          fetchIds();
        }
      };
      syncGuestWishlist();
    } else {
      loadGuestWishlist();
    }
  }, [isAuthenticated, fetchIds, loadGuestWishlist]);

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
    if (!pId) return false;
    if (variantId && wishlistKeySet.has(`${pId}_${String(variantId)}`)) {
      return true;
    }
    return wishlistKeySet.has(pId);
  }, [wishlistKeySet]);

  const toggleWishlist = useCallback(async (productId: string, variantId: string) => {
    // 1. Haptic Feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const pId = String(productId);
    const vId = String(variantId);

    // Look for existing item matching by productId (and ideally variantId if available)
    const existingItem = wishlistIds.find(item => 
      String(item.productId) === pId && (String(item.variantId) === vId || !item.variantId)
    ) || wishlistIds.find(item => String(item.productId) === pId);

    const wasInWishlist = !!existingItem;

    // 2. Guest User Flow: Save to AsyncStorage
    if (!isAuthenticated) {
      let updatedList: WishlistItem[];
      if (wasInWishlist) {
        updatedList = wishlistIds.filter(item => String(item.productId) !== pId);
      } else {
        updatedList = [...wishlistIds.filter(item => String(item.productId) !== pId), { productId: pId, variantId: vId }];
      }
      setWishlistIds(updatedList);
      try {
        await AsyncStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to save guest wishlist item:', err);
      }
      return;
    }

    // 3. Authenticated User Flow: Optimistic Update + API Call
    if (wasInWishlist) {
      setWishlistIds(prev => prev.filter(item => String(item.productId) !== pId));
    } else {
      setWishlistIds(prev => [...prev.filter(item => String(item.productId) !== pId), { productId: pId, variantId: vId }]);
    }

    try {
      if (wasInWishlist) {
        const itemToRemoveId = existingItem?._id || pId;
        if (itemToRemoveId) {
          await removeFromWishlist(itemToRemoveId);
        } else {
          console.warn('Cannot remove: missing item _id');
        }
      } else {
        const response = await addToWishlist(pId, vId);
        const newItem = { 
          productId: pId, 
          variantId: vId, 
          _id: response?._id || response?.data?._id 
        };
        setWishlistIds(prev => prev.map(item => String(item.productId) === pId ? newItem : item));
      }
    } catch (error: any) {
      console.error(`Wishlist toggle failed for Product: ${productId}, Variant: ${variantId}`, error);
      // Revert on error
      if (wasInWishlist) {
        setWishlistIds(prev => [...prev.filter(item => String(item.productId) !== pId), existingItem!]);
      } else {
        setWishlistIds(prev => prev.filter(item => String(item.productId) !== pId));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [wishlistIds, isAuthenticated]);


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
