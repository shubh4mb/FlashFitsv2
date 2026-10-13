import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { 
  addToWishlist, 
  removeFromWishlist, 
  getMyWishlistIds, 
  getMyWishlist 
} from '../api/wishlist';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { useRouter } from 'expo-router';

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
  const showAlert = useAlert();
  const router = useRouter();

  const fetchIds = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
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
    if (!pId) return false;
    if (variantId && wishlistKeySet.has(`${pId}_${String(variantId)}`)) {
      return true;
    }
    return wishlistKeySet.has(pId);
  }, [wishlistKeySet]);

  const toggleWishlist = useCallback(async (productId: string, variantId: string) => {
    // 1. Haptic Feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isAuthenticated) {
      showAlert({
        title: 'Sign In Required',
        message: 'Please sign in or create an account to save items to your wishlist.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)') },
        ],
      });
      return;
    }

    const pId = String(productId);
    const vId = String(variantId);

    // Look for existing item matching by productId (and ideally variantId if available)
    const existingItem = wishlistIds.find(item => 
      String(item.productId) === pId && (String(item.variantId) === vId || !item.variantId)
    ) || wishlistIds.find(item => String(item.productId) === pId);

    const wasInWishlist = !!existingItem;

    // 2. Optimistic Update (always remove existing entries for this productId to avoid duplicates)
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
      // 3. Revert on error
      if (wasInWishlist) {
        setWishlistIds(prev => [...prev.filter(item => String(item.productId) !== pId), existingItem!]);
      } else {
        setWishlistIds(prev => prev.filter(item => String(item.productId) !== pId));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [wishlistIds, isAuthenticated, showAlert, router]);

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
