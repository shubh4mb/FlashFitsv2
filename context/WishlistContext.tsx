import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { 
  addToWishlist, 
  removeFromWishlist, 
  getMyWishlistIds, 
  getMyWishlist 
} from '../api/wishlist';

interface WishlistItem {
  productId: string;
  variantId: string;
  _id?: string;
}

interface WishlistContextType {
  wishlistIds: WishlistItem[];
  toggleWishlist: (productId: string, variantId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlistIds, setWishlistIds] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIds = async () => {
    try {
      const response = await getMyWishlistIds();
      console.log('Wishlist IDs response:', response);
      setWishlistIds(response?.wishlistIds || []);
    } catch (error) {
      console.error('Failed to fetch wishlist IDs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIds();
  }, []);

  const isInWishlist = (productId: string) => {
    const pId = String(productId);
    return wishlistIds.some(item => String(item.productId) === pId);
  };

  const toggleWishlist = async (productId: string, variantId: string) => {
    // 1. Haptic Feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const existingItem = wishlistIds.find(item => item.productId === productId);
    const wasInWishlist = !!existingItem;

    // 2. Optimistic Update
    if (wasInWishlist) {
      setWishlistIds(prev => prev.filter(item => item.productId !== productId));
    } else {
      setWishlistIds(prev => [...prev, { productId, variantId }]);
    }

    try {
      if (wasInWishlist) {
        const itemToRemoveId = existingItem?._id;
        console.log('Removing from wishlist. Item ID:', itemToRemoveId);
        if (itemToRemoveId) {
          await removeFromWishlist(itemToRemoveId);
        } else {
          console.warn('Cannot remove: missing item _id');
        }
      } else {
        // Ensure we are working with string IDs
        const pId = String(productId);
        const vId = String(variantId);
        
        console.log('Adding to wishlist. Product:', pId, 'Variant:', vId);
        const response = await addToWishlist(pId, vId);
        console.log('Add to wishlist response:', response);
        // response is the backend's 'data' object (the wishlistItem)
        const newItem = { 
          productId: pId, 
          variantId: vId, 
          _id: response?._id 
        };
        setWishlistIds(prev => prev.map(item => item.productId === pId ? newItem : item));
      }
    } catch (error: any) {
      console.error(`Wishlist toggle failed for Product: ${productId}, Variant: ${variantId}`);
      console.error('Reverting because of error:', error.message);
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
      }
      // 3. Revert on error
      if (wasInWishlist) {
        setWishlistIds(prev => [...prev, existingItem!]);
      } else {
        setWishlistIds(prev => prev.filter(item => item.productId !== productId));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlistIds, 
      toggleWishlist, 
      isInWishlist, 
      loading,
      refreshWishlist: fetchIds 
    }}>
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
