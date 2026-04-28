import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  FadeIn, 
  FadeOut, 
  SlideInUp, 
  SlideOutUp,
  SlideInDown,
  SlideOutDown,
  runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAlertInternal } from '@/context/AlertContext';
import { Palette, Typography } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GlobalAlert: React.FC = () => {
  const { alertState, toastState, hideAlert, hideToast } = useAlertInternal();

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
      }, toastState.options?.duration || 3000);
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

    const { message, type = 'info' } = toastState.options;
    
    let icon: any = 'information-circle';
    let color = Palette.primary;
    
    if (type === 'success') {
      icon = 'checkmark-circle';
      color = Palette.success;
    } else if (type === 'error') {
      icon = 'alert-circle';
      color = Palette.error;
    } else if (type === 'warning') {
      icon = 'warning';
      color = Palette.warning;
    }

    return (
      <Animated.View 
        entering={SlideInUp.springify().damping(15)}
        exiting={SlideOutUp}
        style={[styles.toastContainer, { top: 60 }]}
      >
        <BlurView intensity={80} tint="light" style={styles.toastBlur}>
          <View style={[styles.toastContent, { borderLeftColor: color }]}>
            <Ionicons name={icon} size={24} color={color} />
            <Text style={styles.toastText}>{message}</Text>
          </View>
        </BlurView>
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
          entering={withSpring(SCREEN_HEIGHT > 800 ? SlideInDown : FadeIn)}
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
                        button.style === 'destructive' && styles.destructiveButton
                      ]}
                      onPress={() => {
                        hideAlert();
                        button.onPress?.();
                      }}
                    >
                      <Text style={[
                        styles.buttonText,
                        button.style === 'destructive' && styles.destructiveText,
                        button.style === 'cancel' && styles.cancelText
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
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  toastBlur: {
    padding: 16,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingLeft: 12,
  },
  toastText: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Palette.text.primary,
    flex: 1,
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
});

export default GlobalAlert;
