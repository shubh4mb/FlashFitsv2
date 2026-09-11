import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/theme';

const GUARANTEES = [
  {
    icon: 'flash-outline',
    title: '60-Min Blitz',
    sub: 'Fast doorstep drop',
  },
  {
    icon: 'shirt-outline',
    title: '10-Min Trial',
    sub: 'Try in your room',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Instant Return',
    sub: 'Handback to rider',
  },
  {
    icon: 'shield-checkmark-outline',
    title: '100% Genuine',
    sub: 'Verified stores',
  },
];

export default function TryGuaranteeBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.shieldBg}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            </View>
            <Text style={styles.title}>The FlashFits Try & Buy Promise</Text>
          </View>
          <Text style={styles.tag}>₹0 RETURN HASSLE</Text>
        </View>

        <View style={styles.grid}>
          {GUARANTEES.map((g, idx) => (
            <View key={idx} style={styles.item}>
              <View style={styles.iconCircle}>
                <Ionicons name={g.icon as any} size={16} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.itemTitle}>{g.title}</Text>
                <Text style={styles.itemSub}>{g.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  tag: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 10,
  },
  item: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
});
