import api from './axiosConfig';

export interface AddToCartParams {
  productId: string;
  variantId: string;
  size: string;
  quantity: number;
  merchantId: string;
  image: string | { url: string };
}

/**
 * Adds an item to the user's cart.
 */
export const addToCart = async (params: AddToCartParams) => {
  try {
    const res = await api.post('user/cart/add', params);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Fetches the user's cart details.
 * Optionally includes addressId for delivery calculation.
 */
export const getCart = async (addressId?: string, serviceable?: boolean, deliveryTip?: number, latitude?: number, longitude?: number) => {
  try {
    const res = await api.post('user/cart', { addressId, serviceable, deliveryTip, latitude, longitude });
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Fetches the quick cart summary/count.
 */
export const getCartCount = async () => {
  try {
    const res = await api.get('user/cartCount');
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Updates the quantity of a specific item in the cart.
 * cartId is the _id of the item in the items array.
 */
export const updateCartQuantity = async (cartId: string, quantity: number) => {
  try {
    const res = await api.put('user/cart/updatequantity', { cartId, quantity });
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Removes a specific item from the cart.
 */
export const deleteCartItem = async (itemId: string) => {
  try {
    const res = await api.delete(`user/cart/delete/${itemId}`);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Clears the entire cart for the logged-in user.
 */
export const clearCart = async () => {
  try {
    const res = await api.delete('user/cart/clear');
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};

/**
 * Moves item(s) from regular cart (T&B) to courier cart.
 */
export const moveToCourier = async (params: { merchantId?: string; itemId?: string }) => {
  try {
    const res = await api.post('user/cart/move-to-courier', params);
    return res.data;
  } catch (error) {
    // Auth errors are ignored gracefully
    throw error;
  }
};
