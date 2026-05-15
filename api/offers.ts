import api from './axiosConfig';

/**
 * ── Offers API ──
 * Customer-facing offer endpoints.
 */

export interface Offer {
  _id: string;
  title: string;
  description: string;
  badgeText: string;
  bannerImage?: { public_id: string; url: string };
  type: string;
  scope: 'admin' | 'merchant';
  merchantId?: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  maxDiscount?: number;
  conditions: {
    minCartValue?: number;
    categoryIds?: string[];
    genders?: string[];
    firstTimeUserOnly?: boolean;
    minOrderValue?: number;
    collectionId?: string;
  };
  startDate: string;
  endDate: string;
  isFlashSale: boolean;
  couponCode?: string;
  requiresCoupon: boolean;
  freeDelivery: boolean;
  priority: number;
  isActive: boolean;
  applicableTo?: 'try_and_buy' | 'courier' | 'both';
  // Added by API
  eligible?: boolean;
  reason?: string;
  discountAmount?: number;
}

export interface AppliedOffers {
  appliedOffers: (Offer & { discountAmount: number })[];
  totalDiscount: number;
  freeDelivery?: boolean;
}

/**
 * Get all available offers for the current user.
 */
export const getAvailableOffers = async (subtotal?: number, merchantId?: string): Promise<Offer[]> => {
  try {
    const params: any = {};
    if (subtotal !== undefined) params.subtotal = subtotal;
    if (merchantId) params.merchantId = merchantId;
    const res = await api.get('user/offers', { params });
    return res.data?.offers || [];
  } catch (error) {
    console.error('Get offers error:', error);
    return [];
  }
};

/**
 * Apply a coupon code. Returns the offer and discount amount.
 */
export const applyCoupon = async (
  couponCode: string,
  cartContext?: { items: any[]; subtotal: number; merchantTotals?: Record<string, number> }
) => {
  try {
    const res = await api.post('user/offers/apply', { couponCode, cartContext });
    return res.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Invalid coupon code';
    throw new Error(message);
  }
};

/**
 * Get best offers for current cart (for auto-apply logic).
 */
export const getBestOffersForCart = async (
  cartContext: { items: any[]; subtotal: number; merchantTotals?: Record<string, number> },
  couponCode?: string
): Promise<AppliedOffers> => {
  try {
    const res = await api.post('user/offers/best-for-cart', { cartContext, couponCode });
    return res.data;
  } catch (error) {
    console.error('Get best offers error:', error);
    return { appliedOffers: [], totalDiscount: 0 };
  }
};

/**
 * Get offers for a specific merchant's store page.
 */
export const getMerchantOffers = async (merchantId: string): Promise<Offer[]> => {
  try {
    const res = await api.get(`user/offers/merchant/${merchantId}`);
    return res.data?.offers || [];
  } catch (error) {
    console.error('Get merchant offers error:', error);
    return [];
  }
};

/**
 * Get active flash sales.
 */
export const getFlashSales = async (): Promise<Offer[]> => {
  try {
    const res = await api.get('user/offers/flash-sales');
    return res.data?.offers || [];
  } catch (error) {
    console.error('Get flash sales error:', error);
    return [];
  }
};

/**
 * Get active promotional banners for the homepage.
 */
export const getPromotionalBanners = async (): Promise<Offer[]> => {
  try {
    const res = await api.get('user/offers/promotional-banners');
    return res.data?.banners || [];
  } catch (error) {
    console.error('Get promotional banners error:', error);
    return [];
  }
};
