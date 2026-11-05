import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Platform 
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { useRouter } from 'expo-router';
import { useToast, useAlert } from '@/context/AlertContext';
import * as Haptics from 'expo-haptics';
import { productDetailPage } from '@/api/products';

interface CartItemProps {
  item: any;
  isCourier?: boolean;
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', 'FREE', 'ONESIZE'];
const sortSizes = (a: any, b: any) => {
  const sizeA = String(a.size || a).toUpperCase().trim();
  const sizeB = String(b.size || b).toUpperCase().trim();
  const numA = parseFloat(sizeA);
  const numB = parseFloat(sizeB);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  const idxA = SIZE_ORDER.indexOf(sizeA);
  const idxB = SIZE_ORDER.indexOf(sizeB);
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return sizeA.localeCompare(sizeB);
};

const CartItem = ({ item, isCourier = false }: CartItemProps) => {
  const { updateQuantity: updateTBQuantity, removeItem: removeTBItem, addToCart: addTBItem, cart } = useCart();
  const { updateQuantity: updateCourierQuantity, removeItem: removeCourierItem, addToCourierCart: addCourierItem, courierCart } = useCourierCart();
  const showToast = useToast();
  const showAlert = useAlert();
  
  const updateQuantity = isCourier ? updateCourierQuantity : updateTBQuantity;
  const removeItem = isCourier ? removeCourierItem : removeTBItem;

  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const router = useRouter();

  const [sizes, setSizes] = useState<any[]>(item.availableSizes || []);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [addingSize, setAddingSize] = useState<string | null>(null);

  // Sync available sizes from item or fetch as fallback
  useEffect(() => {
    if (item.availableSizes && item.availableSizes.length > 0) {
      setSizes(item.availableSizes);
      return;
    }

    let isMounted = true;
    const fetchSizes = async () => {
      const pid = item.productId?._id || item.productId;
      if (!pid) return;
      try {
        setLoadingSizes(true);
        const data = await productDetailPage(pid);
        if (!isMounted) return;
        if (data?.variants?.length) {
          const currentColor = item.productId?.color?.name || item.color?.name;
          const matchedVariants = currentColor 
            ? data.variants.filter((v: any) => (v.color?.name || 'Default') === currentColor)
            : data.variants;
          const variantsToUse = matchedVariants.length > 0 ? matchedVariants : data.variants;
          
          const mapped = variantsToUse.map((v: any) => ({
            variantId: v._id,
            size: v.size,
            stock: v.stock ?? 0,
            price: v.price || item.price,
            mrp: v.mrp || item.mrp,
            image: v.images?.[0]?.url || (typeof item.image === 'string' ? item.image : item.image?.url),
            isCurrentSize: v.size === item.size,
          }));
          setSizes(mapped);
        }
      } catch (e) {
        // silently fail - fallback to empty
      } finally {
        if (isMounted) setLoadingSizes(false);
      }
    };

    fetchSizes();
    return () => { isMounted = false; };
  }, [item._id, item.availableSizes, item.productId]);

  const handleProductPress = () => {
    const productId = item.productId?._id || item.productId;
    if (productId) {
      router.push({
        pathname: `/(app)/product/${productId}`,
        params: { 
          variantId: item.variantId,
          size: item.size,
          fromExplore: isCourier ? 'true' : 'false'
        }
      } as any);
    }
  };

  const handleIncrement = async () => {
    if (!isCourier) {
      const targetMid = String(item.merchantId?._id || item.merchantId);
      const itemSource = item.source || 'shop';
      const merchantCart = cart?.merchantCarts?.find((mc: any) => String(mc.merchantId) === targetMid);
      
      // Only count items with the same source type (warehouse vs shop)
      const totalMerchantSlots = merchantCart ? merchantCart.items
        .filter((i: any) => (i.source || 'shop') === itemSource)
        .reduce((acc: any, i: any) => {
          const catName = (i.productId?.categoryId?.name || i.productId?.category?.name || '').toLowerCase();
          const mult = (catName === 'footwear') ? 2 : 1;
          return acc + (i.quantity * mult);
        }, 0) : 0;
      
      const itemCatName = (item.productId?.categoryId?.name || item.productId?.category?.name || '').toLowerCase();
      const itemMult = (itemCatName === 'footwear') ? 2 : 1;

      if (totalMerchantSlots + itemMult > 6) {
        showAlert({ 
          title: "Cart Limit Reached",
          message: "You can only have up to 6 Try & Buy item slots per merchant (Footwear items count as 2 slots). Please remove some items to add more.", 
          type: 'warning',
          buttons: [{ text: "Got it", style: "outlined" }]
        });
        return;
      }
    }

    if (item.quantity < (item.stockQuantity || 10)) {
      try {
        await updateQuantity(item._id, item.quantity + 1);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Could not update item quantity.';
        showToast({ 
          title: "Update Failed",
          message: msg, 
          type: 'error',
        });
      }
    } else {
      showToast({
        title: "Stock Limit",
        message: `Only ${item.stockQuantity || 10} items available in stock.`,
        type: 'warning',
      });
    }
  };

  const handleDecrement = async () => {
    if (item.quantity > 1) {
      try {
        await updateQuantity(item._id, item.quantity - 1);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Could not update item quantity.';
        showToast({ 
          title: "Update Failed",
          message: msg, 
          type: 'error',
        });
      }
    } else {
      try {
        await removeItem(item._id);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Could not remove item.';
        showToast({ 
          title: "Remove Failed",
          message: msg, 
          type: 'error',
        });
      }
    }
  };

  // Check if a size is already in the cart (for same product and merchant)
  const isSizeInCart = useCallback((targetSize: string) => {
    const targetPid = String(item.productId?._id || item.productId);
    const targetMid = String(item.merchantId?._id || item.merchantId);
    const itemSource = item.source || 'shop';

    const cartList = isCourier ? (courierCart?.items || []) : (cart?.items || []);
    return cartList.some((cartItem: any) => {
      const cPid = String(cartItem.productId?._id || cartItem.productId);
      const cMid = String(cartItem.merchantId?._id || cartItem.merchantId);
      const cSource = cartItem.source || 'shop';

      return (
        cPid === targetPid &&
        String(cartItem.size || '').toLowerCase() === String(targetSize || '').toLowerCase() &&
        (isCourier ? true : (cMid === targetMid && cSource === itemSource))
      );
    });
  }, [item.productId, item.merchantId, item.source, isCourier, courierCart?.items, cart?.items]);

  // Compute other available sizes (excluding the current item's size)
  const otherSizes = useMemo(() => {
    if (!sizes || sizes.length === 0) return [];
    const currentSizeStr = String(item.size || '').toLowerCase().trim();
    const others = sizes.filter((s: any) => String(s.size || '').toLowerCase().trim() !== currentSizeStr);
    
    // Deduplicate by size name
    const seen = new Set<string>();
    const unique = others.filter((s: any) => {
      const key = String(s.size || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort(sortSizes);
  }, [sizes, item.size]);

  // Handle adding another size to the cart
  const handleAddOtherSize = async (sizeObj: any) => {
    const sizeName = sizeObj.size;

    if (isSizeInCart(sizeName)) {
      showToast({
        title: "Already in Bag",
        message: `Size ${sizeName} is already added to your bag.`,
        type: 'info',
      });
      return;
    }

    if (sizeObj.stock !== undefined && sizeObj.stock <= 0) {
      showToast({
        title: "Out of Stock",
        message: `Size ${sizeName} is currently out of stock.`,
        type: 'warning',
      });
      return;
    }

    // Check Try & Buy 6-slot limit for direct merchant store items
    if (!isCourier) {
      const targetMid = String(item.merchantId?._id || item.merchantId);
      const itemSource = item.source || 'shop';
      const merchantCart = cart?.merchantCarts?.find((mc: any) => String(mc.merchantId) === targetMid);

      const totalMerchantSlots = merchantCart ? merchantCart.items
        .filter((i: any) => (i.source || 'shop') === itemSource)
        .reduce((acc: any, i: any) => {
          const catName = (i.productId?.categoryId?.name || i.productId?.category?.name || '').toLowerCase();
          const mult = (catName === 'footwear') ? 2 : 1;
          return acc + (i.quantity * mult);
        }, 0) : 0;

      const itemCatName = (item.productId?.categoryId?.name || item.productId?.category?.name || '').toLowerCase();
      const itemMult = (itemCatName === 'footwear') ? 2 : 1;

      if (totalMerchantSlots + itemMult > 6) {
        showAlert({
          title: "Cart Limit Reached",
          message: "You can only have up to 6 Try & Buy item slots per merchant (Footwear items count as 2 slots). Please remove some items to add more.",
          type: 'warning',
          buttons: [{ text: "Got it", style: "outlined" }]
        });
        return;
      }
    }

    try {
      setAddingSize(sizeName);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const targetMid = String(item.merchantId?._id || item.merchantId || 'flashmart');
      const imgUrl = sizeObj.image || (typeof item.image === 'string' ? item.image : item.image?.url) || '';

      if (isCourier) {
        await addCourierItem({
          productId: item.productId?._id || item.productId,
          variantId: sizeObj.variantId || item.variantId,
          size: sizeName,
          quantity: 1,
          merchantId: targetMid,
          image: imgUrl,
          product: item.productId,
          productName: item.productId?.name,
          price: sizeObj.price ?? item.price,
          mrp: sizeObj.mrp ?? item.mrp,
          shopName: item.shopName || item.merchantId?.shopName,
        });
      } else {
        await addTBItem({
          productId: item.productId?._id || item.productId,
          variantId: sizeObj.variantId || item.variantId,
          size: sizeName,
          quantity: 1,
          merchantId: targetMid,
          image: imgUrl,
          source: item.source || 'shop',
          product: item.productId,
          productName: item.productId?.name,
          price: sizeObj.price ?? item.price,
          mrp: sizeObj.mrp ?? item.mrp,
          shopName: item.shopName || item.merchantId?.shopName,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: "Size Added",
        message: `Size ${sizeName} added to your bag for Try & Buy`,
        type: 'success',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not add size to bag.';
      showToast({
        title: "Could Not Add Size",
        message: msg,
        type: 'error',
      });
    } finally {
      setAddingSize(null);
    }
  };

  // Robust image URL extraction handling strings and objects
  const imageUrl = 
    (typeof item.image === 'string' ? item.image : item.image?.url) || 
    (item.productId?.images?.[0]?.url || item.productId?.images?.[0]) ||
    (item.productId?.image?.url || item.productId?.image) ||
    'https://via.placeholder.com/300';

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.productTouchable} 
        onPress={handleProductPress}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image} 
          contentFit="cover"
          transition={200}
        />
        
        <View style={styles.details}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{item.productId?.name}</Text>
            <TouchableOpacity 
              onPress={() => removeItem(item._id)}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.variantInfo}>
            Size: <Text style={styles.variantSizeHighlight}>{item.size}</Text> • Store: {item.merchantId?.shopName || (item as any).shopName || item.productId?.shopMerchantName || item.productId?.merchantId?.shopName || item.productId?.shopName || 'Store'}
          </Text>

          {item.isOutOfStock || (item.stockQuantity !== undefined && item.stockQuantity <= 0) ? (
            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
              ⚠️ Out of stock - please remove
            </Text>
          ) : (item.stockQuantity !== undefined && item.stockQuantity <= 3) ? (
            <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
              Only {item.stockQuantity} left in stock
            </Text>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{item.price}</Text>
              {item.mrp > item.price && (
                <Text style={styles.mrp}>₹{item.mrp}</Text>
              )}
            </View>

            <View style={styles.qtyContainer}>
              <TouchableOpacity 
                onPress={handleDecrement}
                style={[styles.qtyButton, { borderColor: '#E2E8F0' }]}
              >
                <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={16} color={item.quantity === 1 ? "#EF4444" : "#1E293B"} />
              </TouchableOpacity>
              
              <Text style={styles.qtyText}>{item.quantity}</Text>
              
              <TouchableOpacity 
                onPress={handleIncrement}
                style={[styles.qtyButton, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}
              >
                <Ionicons name="add" size={16} color="#1E293B" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Other Available Sizes Section */}
      {otherSizes.length > 0 && (
        <View style={styles.otherSizesContainer}>
          <View style={styles.otherSizesHeaderRow}>
            <View style={styles.otherSizesTitleWrap}>
              <Ionicons name="resize-outline" size={13} color="#0284C7" />
              <Text style={styles.otherSizesLabel}>Other available sizes:</Text>
            </View>
            <View style={styles.otherSizesTipBadge}>
              <Ionicons name="sparkles" size={10} color="#0369A1" />
              <Text style={styles.otherSizesSubHint}>Add multiple sizes to try</Text>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sizesScrollContent}
            style={styles.sizesScrollView}
          >
            {otherSizes.map((sizeObj: any) => {
              const inCart = isSizeInCart(sizeObj.size);
              const isOut = sizeObj.stock !== undefined && sizeObj.stock <= 0;
              const isAdding = addingSize === sizeObj.size;
              const isLowStock = !isOut && !inCart && sizeObj.stock !== undefined && sizeObj.stock <= 3;

              return (
                <TouchableOpacity
                  key={`other-size-${sizeObj.size}`}
                  style={[
                    styles.sizeChip,
                    inCart && styles.sizeChipInCart,
                    isOut && styles.sizeChipOutOfStock,
                    !inCart && !isOut && styles.sizeChipAvailable,
                  ]}
                  onPress={() => handleAddOtherSize(sizeObj)}
                  activeOpacity={0.7}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator size={12} color="#0F172A" style={{ marginRight: 4 }} />
                  ) : inCart ? (
                    <Ionicons name="checkmark-circle" size={13} color="#16A34A" style={{ marginRight: 3 }} />
                  ) : !isOut ? (
                    <Ionicons name="add" size={13} color="#0F172A" style={{ marginRight: 1 }} />
                  ) : null}

                  <Text
                    style={[
                      styles.sizeChipText,
                      inCart && styles.sizeChipTextInCart,
                      isOut && styles.sizeChipTextOutOfStock,
                      !inCart && !isOut && styles.sizeChipTextAvailable,
                    ]}
                  >
                    {sizeObj.size}
                  </Text>

                  {inCart && (
                    <Text style={styles.sizeChipSubBadgeInCart}>in bag</Text>
                  )}

                  {isOut && (
                    <Text style={styles.sizeChipSubBadgeOut}>Out</Text>
                  )}

                  {isLowStock && (
                    <View style={styles.lowStockBadge}>
                      <Text style={styles.lowStockBadgeText}>{sizeObj.stock} left</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 0,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  image: {
    width: 70,
    height: 86,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  details: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingRight: 4,
  },
  productTouchable: {
    flexDirection: 'row',
    padding: 8,
  },
  removeButton: {
    padding: 2,
    marginRight: -2,
    marginTop: -2,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  variantInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  variantSizeHighlight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mrp: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    minWidth: 14,
    textAlign: 'center',
  },
  otherSizesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  otherSizesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  otherSizesTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  otherSizesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    fontFamily: Typography.fontFamily.semiBold,
  },
  otherSizesTipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  otherSizesSubHint: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0369A1',
    fontFamily: Typography.fontFamily.bold,
  },
  sizesScrollView: {
    flexGrow: 0,
  },
  sizesScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  sizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sizeChipAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sizeChipInCart: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  sizeChipOutOfStock: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sizeChipTextAvailable: {
    color: '#0F172A',
  },
  sizeChipTextInCart: {
    color: '#065F46',
  },
  sizeChipTextOutOfStock: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  sizeChipSubBadgeInCart: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 3,
  },
  sizeChipSubBadgeOut: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 3,
  },
  lowStockBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginLeft: 4,
  },
  lowStockBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#D97706',
  },
});

export default React.memo(CartItem);
