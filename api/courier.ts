import api from './axiosConfig';

export interface AddToCourierCartParams {
  productId: string;
  variantId: string;
  size: string;
  quantity: number;
  merchantId: string;
  image: string | { url: string };
}

/**
 * Add item to courier cart
 */
export const addToCourierCart = async (params: AddToCourierCartParams) => {
  try {
    const res = await api.post('user/courier-cart/add', params);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Get courier cart with product details and totals
 */
export const getCourierCart = async () => {
  try {
    const res = await api.get('user/courier-cart');
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Get courier cart item count
 */
export const getCourierCartCount = async () => {
  try {
    const res = await api.get('user/courier-cart/count');
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Update courier cart item quantity
 */
export const updateCourierCartQuantity = async (cartId: string, quantity: number) => {
  try {
    const res = await api.put('user/courier-cart/updatequantity', { cartId, quantity });
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Remove specific item from courier cart
 */
export const deleteCourierCartItem = async (itemId: string) => {
  try {
    const res = await api.delete(`user/courier-cart/delete/${itemId}`);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Clear entire courier cart
 */
export const clearCourierCart = async () => {
  try {
    const res = await api.delete('user/courier-cart/clear');
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

// ── Courier Orders ──

export interface CourierOrderAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addressType?: string;
  deliveryInstructions?: string;
  coordinates?: number[];
}

/**
 * Place a courier order for a specific merchant's items
 */
export const createCourierOrder = async (merchantId: string, address: CourierOrderAddress) => {
  try {
    const res = await api.post('courier/orders', { merchantId, address });
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Get all courier orders for the logged-in user
 */
export const getCourierOrders = async () => {
  try {
    const res = await api.get('courier/orders');
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Get a single courier order by ID
 */
export const getCourierOrderById = async (orderId: string) => {
  try {
    const res = await api.get(`courier/orders/${orderId}`);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Cancel a courier order
 */
export const cancelCourierOrder = async (orderId: string) => {
  try {
    const res = await api.post(`courier/orders/cancel/${orderId}`);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};
