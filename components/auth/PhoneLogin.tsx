import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import {
  emailLogin,
  registerSendOtp,
  googleLogin,
  appleLogin,
  forgotPasswordSendOtp,
  resetPasswordWithOtp
} from "../../api/auth";
import logo from "../../assets/images/logo/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useAddress } from "../../context/AddressContext";
import { BrandColors } from "../../constants/theme";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { GOOGLE_AUTH_CONFIG } from "../../config/auth";

// Safe import of expo-device — native module may not be available in Expo Go or Web
let Device: { isDevice: boolean; totalMemory?: number } = { isDevice: Platform.OS !== 'web' };
try {
  Device = require('expo-device');
} catch (e) {
  console.warn('expo-device native module not available, using fallback');
}

const isLowSpec = !Device.isDevice || (Device.totalMemory ? Device.totalMemory < 3 * 1024 * 1024 * 1024 : false);

const { width, height } = Dimensions.get("window");

// Floating background assets
const FLOATING_ASSETS_RESOURCES = [
  require("../../assets/splashScreenAssests/24.png"),
  require("../../assets/splashScreenAssests/25.png"),
  require("../../assets/splashScreenAssests/26.png"),
  require("../../assets/splashScreenAssests/27.png"),
  require("../../assets/splashScreenAssests/28.png"),
  require("../../assets/splashScreenAssests/29.png"),
  require("../../assets/splashScreenAssests/30.png"),
  require("../../assets/splashScreenAssests/31.png"),
  require("../../assets/splashScreenAssests/32.png"),
  require("../../assets/splashScreenAssests/33.png"),
  require("../../assets/splashScreenAssests/34.png"),
];

interface MovingAssetProps {
  source: any;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  baseScale: number;
  isLowSpec?: boolean;
}

function MovingAsset({ source, minX, maxX, minY, maxY, baseScale, isLowSpec }: MovingAssetProps) {
  const floatAnimX = useRef(new Animated.Value(0)).current;
  const floatAnimY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0.75)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(baseScale)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 0.75,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Constant non-linear movements (only on high-spec devices)
    const move = () => {
      const targetX = minX + Math.random() * (maxX - minX);
      const targetY = minY + Math.random() * (maxY - minY);
      const targetRotate = (Math.random() - 0.5) * 60;
      const targetScale = baseScale * (0.8 + Math.random() * 0.4);
      const duration = 8000 + Math.random() * 6000;

      Animated.parallel([
        Animated.timing(floatAnimX, {
          toValue: targetX,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimY, {
          toValue: targetY,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: targetRotate,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: targetScale,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => move());
    };

    // Set initial position immediately without transition
    const startX = minX + Math.random() * (maxX - minX);
    const startY = minY + Math.random() * (maxY - minY);
    floatAnimX.setValue(startX);
    floatAnimY.setValue(startY);

    // Delay start of movement slightly if not low spec
    if (!isLowSpec) {
      const timer = setTimeout(move, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  const interpolatedRotate = rotateAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ["-180deg", "180deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingAsset,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: floatAnimX },
            { translateY: floatAnimY },
            { scale: scaleAnim },
            { rotate: interpolatedRotate },
          ],
        },
      ]}
    >
      <Image source={source} style={styles.floatingAssetImage} resizeMode="contain" />
    </Animated.View>
  );
}

interface PhoneLoginProps {
  returnUrl?: string;
}

export default function PhoneLogin({ returnUrl }: PhoneLoginProps = {}) {
  const router = useRouter();
  const { signIn, returnUrl: contextReturnUrl, setReturnUrl } = useAuth();
  const { openAddressModal, selectedAddress, userLocation } = useAddress();
  const effectiveReturnUrl = returnUrl || contextReturnUrl;
  const insets = useSafeAreaInsets();

  const handleExitAuth = () => {
    // If user has not selected an address and has no location yet, present the location modal after navigation
    const shouldPromptLocation = !selectedAddress && !userLocation;

    if (effectiveReturnUrl) {
      setReturnUrl(null);
      if (effectiveReturnUrl.includes('?')) {
        const [path, queryString] = effectiveReturnUrl.split('?');
        const params: Record<string, string> = {};
        queryString.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
        router.replace({ pathname: path as any, params });
      } else {
        router.replace(effectiveReturnUrl as any);
      }
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)');
    }

    if (shouldPromptLocation) {
      setTimeout(() => {
        openAddressModal();
      }, 450);
    }
  };

  // Mode: 'signin' or 'register'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Input states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Focus states
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Legal & Agreement state
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  // Forgot Password Modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Tab switch animation
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable).catch(() => {});
    }
  }, []);

  const randomAssets = useRef(
    (() => {
      const shuffled = [...FLOATING_ASSETS_RESOURCES].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, isLowSpec ? 2 : 4);
      return selected.map((source, index) => {
        let minX = 0;
        let maxX = 0;
        let minY = 0;
        let maxY = 0;
        const baseScale = 0.45;

        if (index === 0) {
          minX = -30;
          maxX = width * 0.35;
          minY = height * 0.02;
          maxY = height * 0.18;
        } else if (index === 1) {
          minX = width * 0.55;
          maxX = width - 50;
          minY = height * 0.02;
          maxY = height * 0.18;
        } else if (index === 2) {
          minX = -30;
          maxX = width * 0.35;
          minY = height * 0.78;
          maxY = height * 0.90;
        } else {
          minX = width * 0.55;
          maxX = width - 50;
          minY = height * 0.78;
          maxY = height * 0.90;
        }

        return {
          source,
          minX,
          maxX,
          minY,
          maxY,
          baseScale,
        };
      });
    })()
  ).current;

  // Google Sign-In setup
  useEffect(() => {
    GoogleSignin.configure(GOOGLE_AUTH_CONFIG);
  }, []);

  // ── Entrance Animations ─────────────────────────────────────────────
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 60, friction: 8, delay: 150, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  // Error animation
  useEffect(() => {
    Animated.timing(errorOpacity, {
      toValue: errorMessage ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [errorMessage]);

  const switchAuthMode = (mode: 'signin' | 'register') => {
    setAuthMode(mode);
    setErrorMessage("");
    Animated.spring(tabSlideAnim, {
      toValue: mode === 'signin' ? 0 : 1,
      tension: 65,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  // ── Submit Handlers ────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage("");

      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();

      const res = await emailLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      const authData = (res && (res as any).token) ? res : ((res as any)?.data?.token ? (res as any).data : res);
      if (authData && authData.token) {
        const { token, refreshToken, userId, isNewUser, user } = authData;
        await signIn(token, userId, refreshToken, isNewUser, {
          name: user?.name,
          email: user?.email || email.trim().toLowerCase(),
          phoneNumber: user?.phoneNumber,
        }, effectiveReturnUrl || undefined);
      } else {
        setErrorMessage("Sign-in failed. Please check your credentials.");
      }
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Invalid email or password.";
      if (__DEV__) {
        console.warn("[Auth] Email sign-in failed:", apiMessage);
      }
      setErrorMessage(apiMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (!agreeToTerms) {
      setErrorMessage("Please accept the Terms of Service & Try-on Policy to continue.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();

      const cleanEmail = email.trim().toLowerCase();

      await registerSendOtp({
        name: name.trim(),
        email: cleanEmail,
        password,
        referralCode: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
      });

      // Route to OTP verification screen with email mode
      router.push({
        pathname: "/(auth)/otpVerification",
        params: {
          email: cleanEmail,
          mode: "email",
          returnUrl: effectiveReturnUrl || undefined,
        },
      });
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Failed to send verification code. Please try again.";
      if (__DEV__) {
        console.warn("[Auth] Email registration failed:", apiMessage);
      }
      setErrorMessage(apiMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot Password Handlers ───────────────────────────────────────
  const handleForgotPasswordSend = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    try {
      setForgotLoading(true);
      setForgotError("");
      await forgotPasswordSendOtp(forgotEmail.trim().toLowerCase());
      setForgotStep(2);
      setForgotMessage("Verification code sent! Check your inbox.");
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || "Failed to send reset code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setForgotError("Please enter the 6-digit reset code.");
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }
    try {
      setForgotLoading(true);
      setForgotError("");
      await resetPasswordWithOtp({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotOtp("");
      setForgotNewPassword("");
      setAuthMode('signin');
      setErrorMessage("Password reset successfully! Please sign in with your new password.");
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Social Sign-In ────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      let idToken;
      const clientId: string = GOOGLE_AUTH_CONFIG.webClientId;
      if (!clientId || clientId.includes("PLACEHOLDER")) {
        console.warn("Using mock token because GOOGLE_WEB_CLIENT_ID is a placeholder.");
        idToken = `mock-google-token-${Date.now()}-mockgoogleid-testuser@example.com`;
      } else {
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices();
        }
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          // Ignore if user is not signed in
        }
        const userInfo = await GoogleSignin.signIn();
        idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      }

      if (!idToken) {
        throw new Error("No ID Token received from Google");
      }

      const cleanReferral = referralCode.trim() ? referralCode.trim().toUpperCase() : undefined;
      const res = await googleLogin(idToken, cleanReferral);
      const authData = (res && (res as any).token) ? res : ((res as any)?.data?.token ? (res as any).data : res);
      if (authData && authData.token) {
        const { token, refreshToken, userId, isNewUser, user } = authData;
        await signIn(token, userId, refreshToken, isNewUser, {
          name: user?.name,
          email: user?.email,
          phoneNumber: user?.phoneNumber,
        }, effectiveReturnUrl || undefined);
      } else {
        setErrorMessage("Google Sign-in failed. Please try again.");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setErrorMessage("Sign-in cancelled by user.");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMessage("Sign-in already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage(Platform.OS === 'ios' ? "Google Sign-in service not available on this device." : "Google Play Services not available.");
      } else {
        const apiMsg = error?.response?.data?.message || error.message || "Google Authentication failed.";
        if (__DEV__) {
          console.warn("[Auth] Google Sign-In failed:", apiMsg);
        }
        setErrorMessage(apiMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple.");
      }

      const res = await appleLogin({
        identityToken: credential.identityToken,
        user: credential.user,
        fullName: credential.fullName,
        referralCode: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
      });

      const authData = (res && (res as any).token) ? res : ((res as any)?.data?.token ? (res as any).data : res);
      if (authData && authData.token) {
        const { token, refreshToken, userId, isNewUser, user } = authData;
        await signIn(token, userId, refreshToken, isNewUser, {
          name: user?.name,
          email: user?.email,
          phoneNumber: user?.phoneNumber,
        }, effectiveReturnUrl || undefined);
      } else {
        setErrorMessage("Apple Sign-in failed. Please try again.");
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      const apiMsg = error?.response?.data?.message || error.message || "Apple Authentication failed.";
      if (__DEV__) {
        console.warn("[Auth] Apple Sign-In error:", apiMsg);
      }
      setErrorMessage(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const tabPillLeft = tabSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "51%"],
  });

  return (
    <View style={styles.centerWrapper}>
      {/* Absolute background */}
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFC", "#F1F5F9"]}
        style={[StyleSheet.absoluteFillObject, { zIndex: -2 }]}
      />

      {/* Floating Assets */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {randomAssets.map((asset, index) => (
          <MovingAsset key={index} {...asset} isLowSpec={isLowSpec} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingTop: Math.max(insets.top + 8, 24),
              paddingBottom: Math.max(insets.bottom, 24) + 40,
            }
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top Guest Action ── */}
          <View style={styles.topSkipRow}>
            <TouchableOpacity
              style={styles.topSkipBtn}
              onPress={handleExitAuth}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.topSkipText}>Skip</Text>
              <Ionicons name="chevron-forward" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── LOGO ── */}
          <Animated.View
            style={[
              styles.logoWrapper,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </Animated.View>

          {/* ── CARD ── */}
          <Animated.View
            style={[
              styles.cardWrapper,
              { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
            ]}
          >
            <View style={styles.card}>
              {/* Mode Toggle Switcher */}
              <View style={styles.tabContainer}>
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    { left: tabPillLeft },
                  ]}
                />
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => switchAuthMode('signin')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      authMode === 'signin' && styles.tabTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => switchAuthMode('register')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      authMode === 'register' && styles.tabTextActive,
                    ]}
                  >
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Brand Proposition Badge */}
              <View style={styles.brandBadge}>
                <View style={styles.brandBadgeDot} />
                <Text style={styles.brandBadgeText}>30-MIN TRY AT HOME</Text>
              </View>

              <Text style={styles.welcomeTitle}>
                {authMode === 'signin' ? "Welcome Back" : "Join FlashFits"}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {authMode === 'signin'
                  ? "Enter your email & password to sign in"
                  : "Create an account to get fast doorstep delivery"}
              </Text>

              {/* Error Message */}
              {errorMessage ? (
                <Animated.View style={[styles.errorBox, { opacity: errorOpacity }]}>
                  <AntDesign name="exclamation-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Animated.View>
              ) : null}

              {/* ── Form Inputs ── */}
              {authMode === 'register' && (
                <View
                  style={[
                    styles.inputBox,
                    focusedInput === 'name' && styles.inputBoxFocused,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={focusedInput === 'name' ? BrandColors.primaryDark : "#64748B"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full Name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    editable={!isLoading}
                    autoCapitalize="words"
                    textContentType="name"
                    selectionColor={BrandColors.primary}
                  />
                </View>
              )}

              <View
                style={[
                  styles.inputBox,
                  focusedInput === 'email' && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedInput === 'email' ? BrandColors.primaryDark : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!isLoading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  selectionColor={BrandColors.primary}
                />
              </View>

              <View
                style={[
                  styles.inputBox,
                  focusedInput === 'password' && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedInput === 'password' ? BrandColors.primaryDark : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={authMode === 'signin' ? "Password" : "Password (min. 6 characters)"}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!isLoading}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType={authMode === 'signin' ? "password" : "newPassword"}
                  selectionColor={BrandColors.primary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color={showPassword ? BrandColors.primary : "#64748B"}
                  />
                </TouchableOpacity>
              </View>

              {authMode === 'signin' ? (
                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotStep(1);
                    setForgotError("");
                    setForgotMessage("");
                    setShowForgotModal(true);
                  }}
                  style={styles.forgotBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.inputBox,
                    focusedInput === 'referral' && styles.inputBoxFocused,
                  ]}
                >
                  <Ionicons
                    name="gift-outline"
                    size={18}
                    color={focusedInput === 'referral' ? BrandColors.primaryDark : "#64748B"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Referral Code (Optional)"
                    placeholderTextColor="#94A3B8"
                    value={referralCode}
                    onChangeText={setReferralCode}
                    onFocus={() => setFocusedInput('referral')}
                    onBlur={() => setFocusedInput(null)}
                    editable={!isLoading}
                    autoCapitalize="characters"
                    textContentType="none"
                    selectionColor={BrandColors.primary}
                  />
                </View>
              )}

              {/* Registration Terms & Agreement Checkbox */}
              {authMode === 'register' && (
                <View style={styles.agreementRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkboxBox,
                      agreeToTerms && styles.checkboxBoxChecked,
                    ]}
                    onPress={() => {
                      setAgreeToTerms((prev) => !prev);
                      if (errorMessage) setErrorMessage("");
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {agreeToTerms && (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.agreementTextContainer}>
                    <Text style={styles.agreementText}>
                      I accept FlashFits'{" "}
                      <Text
                        style={styles.agreementLink}
                        onPress={() => setShowTermsModal(true)}
                      >
                        Terms of Service, Doorstep Try-on Rules
                      </Text>{" "}
                      and{" "}
                      <Text
                        style={styles.agreementLink}
                        onPress={() => WebBrowser.openBrowserAsync('https://www.theflashfits.com/privacy-policy')}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 6 }}>
                <TouchableOpacity
                  style={styles.mainBtn}
                  disabled={isLoading}
                  onPress={authMode === 'signin' ? handleEmailLogin : handleEmailRegister}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={BrandColors.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mainBtnGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.mainBtnText}>
                          {authMode === 'signin' ? "Sign In" : "Send Verification Code"}
                        </Text>
                        <AntDesign name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {authMode === 'register' && (
                <Text style={styles.registerOtpNotice}>
                  We'll send a 6-digit verification code to your email.
                </Text>
              )}

              {/* ── Social Login Divider ── */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Apple Sign-In Button (iOS Only) */}
              {Platform.OS === 'ios' && isAppleAuthAvailable && (
                <View style={{ marginBottom: 10 }}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16}
                    style={{ width: "100%", height: 50 }}
                    onPress={handleAppleSignIn}
                  />
                </View>
              )}

              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                disabled={isLoading}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}
              >
                <AntDesign name="google" size={19} color="#0F172A" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Continue as Guest Button */}
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleExitAuth}
                activeOpacity={0.85}
              >
                <Ionicons name="bag-handle-outline" size={19} color="#475569" />
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Terms ── */}
          <View style={styles.termsBox}>
            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text
                style={styles.link}
                onPress={() => WebBrowser.openBrowserAsync('https://www.theflashfits.com/terms-of-service')}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={styles.link}
                onPress={() => WebBrowser.openBrowserAsync('https://www.theflashfits.com/privacy-policy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContentWrapper}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity
                  onPress={() => setShowForgotModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {forgotError ? (
                <View style={styles.modalErrorBox}>
                  <AntDesign name="exclamation-circle" size={14} color="#EF4444" />
                  <Text style={styles.modalErrorText}>{forgotError}</Text>
                </View>
              ) : null}

              {forgotMessage ? (
                <View style={styles.modalSuccessBox}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.modalSuccessText}>{forgotMessage}</Text>
                </View>
              ) : null}

              {forgotStep === 1 ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    Enter your account email to receive a 6-digit password reset code.
                  </Text>
                  <View style={styles.modalInputBox}>
                    <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email Address"
                      placeholderTextColor="#94A3B8"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    disabled={forgotLoading}
                    onPress={handleForgotPasswordSend}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={BrandColors.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalActionBtnGradient}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalActionBtnText}>Send Reset Code</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalSubtitle}>
                    Enter the 6-digit code sent to <Text style={{ fontWeight: '700', color: '#0F172A' }}>{forgotEmail}</Text> and your new password.
                  </Text>
                  <View style={styles.modalInputBox}>
                    <Ionicons name="key-outline" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="6-Digit Reset Code"
                      placeholderTextColor="#94A3B8"
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  <View style={styles.modalInputBox}>
                    <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="New Password (min. 6 chars)"
                      placeholderTextColor="#94A3B8"
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    disabled={forgotLoading}
                    onPress={handleResetPasswordSubmit}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={BrandColors.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalActionBtnGradient}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalActionBtnText}>Update Password</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Terms & Doorstep Try-on Policy Modal ── */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.termsModalBackdrop}>
          <View style={styles.termsModalCard}>
            {/* Header */}
            <View style={styles.termsModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.termsModalBadge}>
                  <View style={styles.termsModalBadgeDot} />
                  <Text style={styles.termsModalBadgeText}>CUSTOMER AGREEMENT</Text>
                </View>
                <Text style={styles.termsModalTitle}>Terms & Doorstep Try-on Policy</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Rules Content */}
            <ScrollView
              style={styles.termsModalScroll}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={styles.termsIntro}>
                Welcome to FlashFits! By registering, you agree to our service terms and doorstep trial protocol designed to keep fashion fast, fair, and seamless.
              </Text>

              {/* Rule Card 1 */}
              <View style={styles.ruleCard}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="timer-outline" size={20} color={BrandColors.primaryDark} />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleTitle}>1. Doorstep Fitting Window</Text>
                  <Text style={styles.ruleDesc}>
                    Our delivery partner brings your selected styles directly to your door. You can try on garments in private comfort while the partner waits outside. Items cannot be taken away from the delivery address.
                  </Text>
                </View>
              </View>

              {/* Rule Card 2 */}
              <View style={styles.ruleCard}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="pricetag-outline" size={20} color={BrandColors.primaryDark} />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleTitle}>2. Tags & Garment Care</Text>
                  <Text style={styles.ruleDesc}>
                    All original brand tags, barcode stickers, and hygiene seals must remain intact. Clothes must be tried on carefully and kept clean—free from perfume, deodorant marks, makeup, tears, or stretching.
                  </Text>
                </View>
              </View>

              {/* Rule Card 3 */}
              <View style={styles.ruleCard}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="card-outline" size={20} color={BrandColors.primaryDark} />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleTitle}>3. Pay Only For What You Keep</Text>
                  <Text style={styles.ruleDesc}>
                    Unwanted items are handed right back to the delivery partner immediately after your trial. For the garments you love and keep, settle payment on the spot via UPI, Card, or Cash.
                  </Text>
                </View>
              </View>

              {/* Rule Card 4 */}
              <View style={styles.ruleCard}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="alert-circle-outline" size={20} color={BrandColors.primaryDark} />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleTitle}>4. Damaged or Non-Returned Items</Text>
                  <Text style={styles.ruleDesc}>
                    Items with removed/cut tags, stains, or physical damage, as well as any item not handed back to the partner, are deemed purchased and will be billed to your registered account.
                  </Text>
                </View>
              </View>

              {/* Rule Card 5: Courier Orders */}
              <View style={styles.ruleCard}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="cube-outline" size={20} color={BrandColors.primaryDark} />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleTitle}>5. Courier Orders: 3-Day Return Window</Text>
                  <Text style={styles.ruleDesc}>
                    For distant merchant orders shipped via courier, customers can request a return within 3 days of delivery via the in-app tracking screen. Returned garments must be unworn with all brand tags intact.
                  </Text>
                </View>
              </View>

              {/* Rule Card 6 */}
              <View style={styles.ruleCard}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name="lock-closed-outline" size={20} color={BrandColors.primaryDark} />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleTitle}>6. Privacy & DPDP Act 2023</Text>
                  <Text style={styles.ruleDesc}>
                    Your personal information, phone number, and location are protected under India's Digital Personal Data Protection Act (DPDP Act 2023) and used solely for fulfilling orders and tracking delivery.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.fullWebLink}
                onPress={() => WebBrowser.openBrowserAsync('https://www.theflashfits.com/terms-of-service')}
              >
                <Ionicons name="open-outline" size={14} color={BrandColors.primaryDark} />
                <Text style={styles.fullWebLinkText}>Read Full Terms of Service</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fullWebLink, { marginTop: 0 }]}
                onPress={() => WebBrowser.openBrowserAsync('https://www.theflashfits.com/privacy-policy')}
              >
                <Ionicons name="shield-checkmark-outline" size={14} color={BrandColors.primaryDark} />
                <Text style={styles.fullWebLinkText}>Read Privacy Policy</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Bottom CTA */}
            <View style={styles.termsModalFooter}>
              <TouchableOpacity
                style={styles.modalAcceptBtn}
                onPress={() => {
                  setAgreeToTerms(true);
                  setErrorMessage("");
                  setShowTermsModal(false);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={BrandColors.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalAcceptBtnGradient}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalAcceptBtnText}>I Understand & Agree</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingAsset: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  floatingAssetImage: {
    width: "100%",
    height: "100%",
  },

  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 40,
    alignItems: "center",
  },
  topSkipRow: {
    width: "100%",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingBottom: 8,
  },
  topSkipBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  topSkipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    fontFamily: "Manrope-Bold",
  },

  /* ── LOGO ── */
  logoWrapper: { marginBottom: 12, alignItems: "center" },
  logo: { width: width * 0.52, height: 75 },

  /* ── CARD ── */
  cardWrapper: { width: "100%", marginBottom: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  /* ── TAB SWITCHER ── */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    height: 44,
    padding: 3,
    marginBottom: 16,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "47%",
    backgroundColor: "#0F172A",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(0, 194, 232, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    fontFamily: "Manrope-SemiBold",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
  },

  /* ── BRAND PROPOSITION BADGE ── */
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: BrandColors.softCyan,
    borderWidth: 1,
    borderColor: BrandColors.softCyanBorder,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
    gap: 6,
  },
  brandBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primary,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: BrandColors.cyanDeep,
    letterSpacing: 1.2,
    fontFamily: "Manrope-Bold",
  },

  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Manrope-Bold",
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Manrope-Medium",
    lineHeight: 19,
  },

  /* ── INPUT BOX ── */
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputBoxFocused: {
    borderColor: BrandColors.primary,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    fontFamily: "Manrope-Medium",
  },
  eyeButton: {
    padding: 4,
  },

  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 12,
    marginTop: -4,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    color: BrandColors.primaryDark,
    fontWeight: "700",
    fontFamily: "Manrope-SemiBold",
  },

  /* ── ERROR ── */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
    fontFamily: "Manrope-Medium",
    flex: 1,
  },

  /* ── PRIMARY BUTTON ── */
  mainBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mainBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Manrope-Bold",
  },
  registerOtpNotice: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Manrope-Medium",
  },

  /* ── DIVIDER ── */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    fontFamily: "Manrope-SemiBold",
  },

  /* ── GOOGLE BUTTON ── */
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "Manrope-Bold",
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: "#F8FAFC",
    marginTop: 10,
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    fontFamily: "Manrope-Bold",
  },

  /* ── TERMS ── */
  termsBox: { alignItems: "center", paddingHorizontal: 16 },
  terms: { fontSize: 12, color: "#64748B", textAlign: "center", lineHeight: 18 },
  link: { color: BrandColors.primaryDark, fontWeight: "700" },

  /* ── MODAL STYLES ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContentWrapper: {
    width: "100%",
    maxWidth: 400,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: "Manrope-Bold",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  modalActionBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  modalActionBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
  },
  modalErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    marginBottom: 12,
  },
  modalErrorText: {
    color: "#EF4444",
    fontSize: 13,
    flex: 1,
  },
  modalSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    marginBottom: 12,
  },
  modalSuccessText: {
    color: "#065F46",
    fontSize: 13,
    flex: 1,
  },

  /* ── REGISTRATION AGREEMENT CHECKBOX ── */
  agreementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    marginTop: 2,
    paddingHorizontal: 2,
    gap: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: BrandColors.primaryDark,
    borderColor: BrandColors.primaryDark,
  },
  agreementTextContainer: {
    flex: 1,
  },
  agreementText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    fontFamily: "Manrope-Medium",
  },
  agreementLink: {
    color: BrandColors.primaryDark,
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
    textDecorationLine: "underline",
  },

  /* ── TERMS MODAL ── */
  termsModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  termsModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: height * 0.85,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  termsModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  termsModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.softCyan,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.softCyanBorder,
    marginBottom: 6,
    gap: 5,
  },
  termsModalBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primary,
  },
  termsModalBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: BrandColors.cyanDeep,
    letterSpacing: 1,
    fontFamily: "Manrope-Bold",
  },
  termsModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: "Manrope-Bold",
  },
  termsModalScroll: {
    maxHeight: height * 0.55,
  },
  termsIntro: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 16,
    fontFamily: "Manrope-Medium",
  },
  ruleCard: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  ruleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.softCyan,
    borderWidth: 1,
    borderColor: BrandColors.softCyanBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
    fontFamily: "Manrope-Bold",
  },
  ruleDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    fontFamily: "Manrope-Regular",
  },
  fullWebLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    marginTop: 6,
  },
  fullWebLinkText: {
    fontSize: 13,
    color: BrandColors.primaryDark,
    fontWeight: "700",
    fontFamily: "Manrope-SemiBold",
    textDecorationLine: "underline",
  },
  termsModalFooter: {
    marginTop: 12,
    paddingTop: 8,
  },
  modalAcceptBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalAcceptBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  modalAcceptBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
  },
});
