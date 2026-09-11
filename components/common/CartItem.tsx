import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { useRouter } from 'expo-router';
import { useToast, useAlert } from '@/context/AlertContext';

interface CartItemProps {
  item: any;
  isCourier?: boolean;
}

const CartItem = ({ item, isCourier = false }: CartItemProps) => {
  const { updateQuantity: updateTBQuantity, removeItem: removeTBItem, cart } = useCart();
  const { updateQuantity: updateCourierQuantity, removeItem: removeCourierItem } = useCourierCart();
  const showToast = useToast();
  const showAlert = useAlert();
  
  const updateQuantity = isCourier ? updateCourierQuantity : updateTBQuantity;
  const removeItem = isCourier ? removeCourierItem : removeTBItem;

  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const router = useRouter();

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
            Size: {item.size} • Store: {item.merchantId?.shopName}
          </Text>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 0,
    marginBottom: 8,
    overflow: 'hidden',
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
    flex: 1,
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
});

export default React.memo(CartItem);
