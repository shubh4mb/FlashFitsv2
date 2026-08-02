import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlertInternal } from '@/context/AlertContext';
import { Palette, Typography } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GlobalAlert: React.FC = () => {
  const { alertState, toastState, hideAlert, hideToast } = useAlertInternal();
  const insets = useSafeAreaInsets();

  // Toast auto-hide
  useEffect(() => {
    if (toastState.visible) {
      Haptics.notificationAsync(
        toastState.options?.type === 'error' 
          ? Haptics.NotificationFeedbackType.Error 
          : toastState.options?.type === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
      );
      
      const timer = setTimeout(() => {
        hideToast();
      }, toastState.options?.duration || 2800);
      return () => clearTimeout(timer);
    }
  }, [toastState.visible, toastState.options?.duration, hideToast]);

  // Alert Haptics
  useEffect(() => {
    if (alertState.visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [alertState.visible]);

  const renderToast = () => {
    if (!toastState.visible || !toastState.options) return null;

    const { title, message, type = 'info', action } = toastState.options;
    
    let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';
    let iconColor = '#3B82F6';
    
    if (type === 'success') {
      iconName = 'checkmark-circle';
      iconColor = '#10B981';
    } else if (type === 'error') {
      iconName = 'alert-circle';
      iconColor = '#F43F5E';
    } else if (type === 'warning') {
      iconName = 'warning';
      iconColor = '#F59E0B';
    }

    const topPosition = (insets.top || 36) + 8;

    return (
      <Animated.View 
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        style={[styles.toastWrapper, { top: topPosition }]}
      >
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={hideToast}
          style={styles.toastCard}
        >
          <View style={[styles.toastAccentBar, { backgroundColor: iconColor }]} />
          
          <Ionicons name={iconName} size={18} color={iconColor} style={styles.toastIcon} />
          
          <View style={styles.toastTextContainer}>
            {title ? <Text style={styles.toastTitle}>{title}</Text> : null}
            <Text style={styles.toastMessage} numberOfLines={2}>{message}</Text>
          </View>

          {action ? (
            <TouchableOpacity 
              onPress={() => {
                hideToast();
                action.onPress();
              }}
              style={styles.toastActionBtn}
            >
              <Text style={[styles.toastActionText, { color: iconColor }]}>{action.label}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAlert = () => {
    if (!alertState.visible || !alertState.options) return null;

    const { title, message, buttons, type = 'info' } = alertState.options;

    return (
      <Animated.View 
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.alertOverlay}
      >
        <Pressable style={styles.alertBackdrop} onPress={hideAlert} />
        <Animated.View 
          entering={SCREEN_HEIGHT > 800 ? SlideInDown.springify() : FadeIn}
          exiting={FadeOut}
          style={styles.alertContainer}
        >
          <BlurView intensity={100} tint="light" style={styles.alertBlur}>
            <View style={styles.alertContent}>
              {title && <Text style={styles.alertTitle}>{title}</Text>}
              <Text style={styles.alertMessage}>{message}</Text>
              
              <View style={styles.buttonContainer}>
                {buttons && buttons.length > 0 ? (
                  buttons.map((button, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        index > 0 && styles.buttonBorder,
                        button.style === 'destructive' && styles.destructiveButton,
                        button.style === 'outlined' && styles.outlinedButton
                      ]}
                      onPress={() => {
                        hideAlert();
                        button.onPress?.();
                      }}
                    >
                      <Text style={[
                        styles.buttonText,
                        button.style === 'destructive' && styles.destructiveText,
                        button.style === 'cancel' && styles.cancelText,
                        button.style === 'outlined' && styles.outlinedText
                      ]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={hideAlert}
                  >
                    <Text style={styles.buttonText}>OK</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <>
      {renderToast()}
      {renderAlert()}
    </>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  toastAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
  },
  toastIcon: {
    marginLeft: 4,
    marginRight: 10,
  },
  toastTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#F8FAFC',
    lineHeight: 18,
  },
  toastActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toastActionText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
  },
  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  alertContainer: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  alertBlur: {
    padding: 24,
  },
  alertContent: {
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Palette.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
    color: Palette.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Palette.border,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: Palette.primary,
  },
  destructiveButton: {
    // Optional: add background or specific style for destructive
  },
  destructiveText: {
    color: Palette.error,
  },
  cancelText: {
    color: Palette.secondary,
    fontFamily: Typography.fontFamily.medium,
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: Palette.primary,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    flex: undefined,
    width: '90%',
    alignSelf: 'center',
  },
  outlinedText: {
    color: Palette.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
});

export default GlobalAlert;
