import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import logo from '@/assets/images/logo/logo.png';
import { Typography } from '@/constants/theme';

interface BrandFooterProps {
  style?: StyleProp<ViewStyle>;
}

export default function BrandFooter({ style }: BrandFooterProps) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={logo}
        style={styles.footerLogo}
        contentFit="contain"
      />
      <Text style={styles.taglineText}>JUST MINUTES, JUST FASHION</Text>
      <Text style={styles.versionText}>MADE IN KERALA 🌴</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  footerLogo: {
    width: 140,
    height: 52,
    opacity: 0.32,
  },
  taglineText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    letterSpacing: 2.2,
    marginTop: 6,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 8.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
});
