import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BrandColors, Typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_STORE_URL = Platform.select({
  ios: 'itms-apps://itunes.apple.com/app/com.flashfits.app',
  android: 'market://details?id=com.flashfits.app',
  default: 'https://theflashfits.com',
});

const DEFAULT_WEB_URL = Platform.select({
  ios: 'https://apps.apple.com/app/com.flashfits.app',
  android: 'https://play.google.com/store/apps/details?id=com.flashfits.app',
  default: 'https://theflashfits.com',
});

export interface RateAppModalProps {
  visible: boolean;
  onClose: () => void;
  onRateSuccess?: () => void;
  storeUrl?: string;
  webUrl?: string;
}

export const RateAppModal: React.FC<RateAppModalProps> = ({
  visible,
  onClose,
  onRateSuccess,
  storeUrl,
  webUrl,
}) => {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const isIos = Platform.OS === 'ios';
  const storeName = isIos ? 'App Store' : 'Google Play';

  const effectiveStoreUrl = (isIos && storeUrl?.startsWith('market://')) 
    ? DEFAULT_STORE_URL 
    : (storeUrl || DEFAULT_STORE_URL);

  const effectiveWebUrl = (isIos && webUrl?.includes('play.google.com')) 
    ? DEFAULT_WEB_URL 
    : (webUrl || DEFAULT_WEB_URL);

  if (!visible) return null;

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleOpenStore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      if (effectiveStoreUrl) {
        const canOpen = await Linking.canOpenURL(effectiveStoreUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(effectiveStoreUrl);
          onRateSuccess?.();
          onClose();
          return;
        }
      }
      if (effectiveWebUrl) {
        await Linking.openURL(effectiveWebUrl);
      }
    } catch (error) {
      console.warn('Failed to open store for rating:', error);
      if (effectiveWebUrl) {
        await Linking.openURL(effectiveWebUrl);
      }
    }
    onRateSuccess?.();
    onClose();
  };

  const handleFeedbackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push('/(app)/help-center' as any);
  };

  const isHighRating = selectedRating >= 4;
  const isLowRating = selectedRating > 0 && selectedRating < 4;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color="#71717A" />
          </TouchableOpacity>

          {/* Top Emoji/Icon */}
          <View style={styles.iconCircle}>
            <Ionicons
              name={isHighRating ? 'heart' : isLowRating ? 'chatbox-ellipses' : 'sparkles'}
              size={34}
              color={isHighRating ? '#EF4444' : isLowRating ? '#F59E0B' : BrandColors.cyanDeep}
            />
          </View>

          {/* Title */}
          <Text style={styles.titleText}>
            {isHighRating
              ? 'Thrilled to hear it!'
              : isLowRating
              ? 'Help Us Do Better'
              : 'Enjoying FlashFits?'}
          </Text>

          {/* Subtitle / Description */}
          <Text style={styles.subtitleText}>
            {isHighRating
              ? `Your support means everything to us. Would you mind taking a moment to rate us on ${storeName}?`
              : isLowRating
              ? "We're sorry your experience wasn't 5-star worthy. Let us know how we can make it right for you."
              : 'Tap a star below to rate your shopping and delivery experience.'}
          </Text>

          {/* 5 Star Rating Row */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= selectedRating;
              return (
                <TouchableOpacity
                  key={star}
                  activeOpacity={0.7}
                  onPress={() => handleStarPress(star)}
                  style={styles.starTouchable}
                >
                  <Ionicons
                    name={isFilled ? 'star' : 'star-outline'}
                    size={36}
                    color={isFilled ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions depending on rating */}
          <View style={styles.actionsContainer}>
            {isLowRating ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.primaryButton}
                  onPress={handleFeedbackPress}
                >
                  <Text style={styles.primaryButtonText}>Send Feedback</Text>
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.secondaryButton}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.primaryButton}
                  onPress={handleOpenStore}
                >
                  <Text style={styles.primaryButtonText}>
                    {selectedRating >= 4 ? `Rate on ${storeName} ⭐` : `Rate on ${storeName}`}
                  </Text>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.secondaryButton}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH - 48, 370),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBFDFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: '#121212',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    color: '#52525B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  starTouchable: {
    padding: 4,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#121212',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#121212',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: '#71717A',
  },
});
