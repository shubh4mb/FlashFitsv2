import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors, Typography } from '@/constants/theme';
import { AppUpdateType } from '@/utils/versionCompare';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AppUpdateModalProps {
  visible: boolean;
  type: AppUpdateType;
  currentVersion: string;
  latestVersion: string;
  storeUrl?: string;
  webUrl?: string;
  title?: string;
  message?: string;
  releaseNotes?: string[];
  onDismiss?: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  type,
  currentVersion,
  latestVersion,
  storeUrl = 'market://details?id=com.flashfits.app',
  webUrl = 'https://play.google.com/store/apps/details?id=com.flashfits.app',
  title,
  message,
  releaseNotes = [],
  onDismiss,
}) => {
  const isMandatory = type === 'MANDATORY';

  // Android Hardware Back Button trap for Mandatory updates
  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      if (isMandatory) {
        // Block hardware back button for mandatory updates
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return true;
      }
      if (onDismiss) {
        onDismiss();
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => backSubscription.remove();
  }, [visible, isMandatory, onDismiss]);

  if (!visible || type === 'UP_TO_DATE') {
    return null;
  }

  const handleUpdatePress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (storeUrl) {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
          return;
        }
      }
      if (webUrl) {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.warn('Failed to open app store link:', error);
      if (webUrl) {
        await Linking.openURL(webUrl);
      }
    }
  };

  const handleDismissPress = () => {
    if (isMandatory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onDismiss) onDismiss();
  };

  const displayTitle =
    title ||
    (isMandatory ? 'Mandatory Update Required' : 'New Version Available');

  const displayMessage =
    message ||
    (isMandatory
      ? 'A critical update is required to continue shopping and tracking orders on FlashFits.'
      : 'Upgrade to the latest version to enjoy faster checkout, fresh collections, and stability improvements.');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isMandatory ? () => {} : handleDismissPress}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Top Decorative Icon */}
          <View
            style={[
              styles.iconWrapper,
              isMandatory ? styles.mandatoryIconBg : styles.optionalIconBg,
            ]}
          >
            <Ionicons
              name={isMandatory ? 'alert-circle' : 'cloud-download'}
              size={36}
              color={isMandatory ? '#EF4444' : BrandColors.cyanDeep}
            />
          </View>

          {/* Badge */}
          <View
            style={[
              styles.badgePill,
              isMandatory ? styles.mandatoryBadge : styles.optionalBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isMandatory ? styles.mandatoryBadgeText : styles.optionalBadgeText,
              ]}
            >
              {isMandatory ? 'ACTION REQUIRED' : 'UPDATE AVAILABLE'}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.titleText}>{displayTitle}</Text>

          {/* Version Diff Pill */}
          <View style={styles.versionPill}>
            <Text style={styles.versionOld}>v{currentVersion || '1.0.0'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#71717A" style={{ marginHorizontal: 6 }} />
            <Text style={styles.versionNew}>v{latestVersion || '1.1.0'}</Text>
          </View>

          {/* Message Description */}
          <Text style={styles.messageText}>{displayMessage}</Text>

          {/* Optional Release Notes */}
          {releaseNotes && releaseNotes.length > 0 && (
            <View style={styles.releaseNotesContainer}>
              <Text style={styles.releaseNotesHeader}>{"What's New:"}</Text>
              {releaseNotes.slice(0, 3).map((note, index) => (
                <View key={index} style={styles.noteRow}>
                  <Ionicons name="checkmark-circle" size={14} color={BrandColors.cyanDeep} style={styles.noteIcon} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.primaryButton}
              onPress={handleUpdatePress}
            >
              <Text style={styles.primaryButtonText}>Update Now</Text>
              <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {!isMandatory && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.secondaryButton}
                onPress={handleDismissPress}
              >
                <Text style={styles.secondaryButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            )}

            {isMandatory && (
              <Text style={styles.mandatoryNoticeText}>
                You must update to the latest version to proceed.
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  mandatoryIconBg: {
    backgroundColor: '#FEE2E2', // soft red
  },
  optionalIconBg: {
    backgroundColor: '#EBFDFF', // soft cyan
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  mandatoryBadge: {
    backgroundColor: '#FEE2E2',
  },
  optionalBadge: {
    backgroundColor: '#E0F2FE',
  },
  badgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  mandatoryBadgeText: {
    color: '#DC2626',
  },
  optionalBadgeText: {
    color: '#0284C7',
  },
  titleText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: '#121212',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 12,
  },
  versionOld: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#71717A',
  },
  versionNew: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#0891B2',
  },
  messageText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    color: '#52525B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  releaseNotesContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  releaseNotesHeader: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#121212',
    marginBottom: 6,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  noteIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  noteText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    lineHeight: 17,
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
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: '#71717A',
  },
  mandatoryNoticeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
});
