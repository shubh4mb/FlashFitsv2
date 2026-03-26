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
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';

interface CartItemProps {
  item: any;
}

const CartItem = ({ item }: CartItemProps) => {
  const { updateQuantity, removeItem } = useCart();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const handleIncrement = () => {
    if (item.quantity < (item.stockQuantity || 10)) {
      updateQuantity(item._id, item.quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item._id, item.quantity - 1);
    } else {
      removeItem(item._id);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.image} 
        contentFit="cover"
        transition={200}
      />
      
      <View style={styles.details}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{item.productId?.name}</Text>
          <TouchableOpacity onPress={() => removeItem(item._id)}>
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
              style={[styles.qtyButton, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}
            >
              <Ionicons name="add" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  image: {
    width: 90,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  variantInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  mrp: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    minWidth: 16,
    textAlign: 'center',
  },
});

export default CartItem;
