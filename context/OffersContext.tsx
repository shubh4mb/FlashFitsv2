import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getAvailableOffers,
  getFlashSales,
  getBestOffersForCart,
  applyCoupon as applyCouponApi,
  Offer,
  AppliedOffers,
} from '../api/offers';
import { useAuth } from './AuthContext';

interface OffersContextType {
  offers: Offer[];
  flashSales: Offer[];
  appliedOffers: AppliedOffers | null;
  couponCode: string | null;
  loading: boolean;
  couponLoading: boolean;
  couponError: string | null;
  refreshOffers: () => Promise<void>;
  refreshFlashSales: () => Promise<void>;
  computeBestOffers: (cartContext: any, couponCode?: string) => Promise<void>;
  applyCoupon: (code: string, cartContext: any) => Promise<boolean>;
  removeCoupon: () => void;
  clearAppliedOffers: () => void;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

export const OffersProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [flashSales, setFlashSales] = useState<Offer[]>([]);
  const [appliedOffers, setAppliedOffers] = useState<AppliedOffers | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const refreshOffers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const data = await getAvailableOffers();
      setOffers(data);
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refreshFlashSales = useCallback(async () => {
    try {
      const data = await getFlashSales();
      setFlashSales(data);
    } catch (error) {
      console.error('Failed to fetch flash sales:', error);
    }
  }, []);

  const computeBestOffers = useCallback(async (cartContext: any, code?: string) => {
    if (!isAuthenticated) return;
    try {
      const result = await getBestOffersForCart(cartContext, code || couponCode || undefined);
      setAppliedOffers(result);
    } catch (error) {
      console.error('Failed to compute best offers:', error);
    }
  }, [isAuthenticated, couponCode]);

  const applyCoupon = useCallback(async (code: string, cartContext: any): Promise<boolean> => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      await applyCouponApi(code, cartContext);
      setCouponCode(code.toUpperCase());
      // Recompute offers with coupon applied
      const result = await getBestOffersForCart(cartContext, code);
      setAppliedOffers(result);
      setCouponLoading(false);
      return true;
    } catch (error: any) {
      setCouponError(error.message || 'Invalid coupon');
      setCouponLoading(false);
      return false;
    }
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponCode(null);
    setCouponError(null);
    setAppliedOffers(null);
  }, []);

  const clearAppliedOffers = useCallback(() => {
    setAppliedOffers(null);
    setCouponCode(null);
    setCouponError(null);
  }, []);

  // Fetch flash sales on mount (public)
  useEffect(() => {
    refreshFlashSales();
  }, []);

  // Fetch offers when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshOffers();
    } else {
      setOffers([]);
      setAppliedOffers(null);
      setCouponCode(null);
    }
  }, [isAuthenticated]);

  return (
    <OffersContext.Provider
      value={{
        offers,
        flashSales,
        appliedOffers,
        couponCode,
        loading,
        couponLoading,
        couponError,
        refreshOffers,
        refreshFlashSales,
        computeBestOffers,
        applyCoupon,
        removeCoupon,
        clearAppliedOffers,
      }}
    >
      {children}
    </OffersContext.Provider>
  );
};

export const useOffers = () => {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error('useOffers must be used within an OffersProvider');
  }
  return context;
};
