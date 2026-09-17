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

export default function PhoneLogin() {
  const router = useRouter();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

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
        });
      } else {
        setErrorMessage("Sign-in failed. Please check your credentials.");
      }
    } catch (error: any) {
      console.error("Email sign-in failed:", error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Invalid email or password.";
      setErrorMessage(apiMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
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
        },
      });
    } catch (error: any) {
      console.error("Email registration send OTP failed:", error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Failed to send verification code. Please try again.";
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

      const res = await googleLogin(idToken, referralCode);
      const authData = (res && (res as any).token) ? res : ((res as any)?.data?.token ? (res as any).data : res);
      if (authData && authData.token) {
        const { token, refreshToken, userId, isNewUser, user } = authData;
        await signIn(token, userId, refreshToken, isNewUser, {
          name: user?.name,
          email: user?.email,
          phoneNumber: user?.phoneNumber,
        });
      } else {
        setErrorMessage("Google Sign-in failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Google Sign-In failed:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setErrorMessage("Sign-in cancelled by user.");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMessage("Sign-in already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage("Google Play Services not available.");
      } else {
        setErrorMessage(error?.response?.data?.message || error.message || "Google Authentication failed.");
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
        referralCode,
      });

      const authData = (res && (res as any).token) ? res : ((res as any)?.data?.token ? (res as any).data : res);
      if (authData && authData.token) {
        const { token, refreshToken, userId, isNewUser, user } = authData;
        await signIn(token, userId, refreshToken, isNewUser, {
          name: user?.name,
          email: user?.email,
          phoneNumber: user?.phoneNumber,
        });
      } else {
        setErrorMessage("Apple Sign-in failed. Please try again.");
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.error("Apple Sign-In error:", error);
      setErrorMessage(error?.response?.data?.message || error.message || "Apple Authentication failed.");
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
      {randomAssets.map((asset, index) => (
        <MovingAsset key={index} {...asset} isLowSpec={isLowSpec} />
      ))}

      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 24) + 24,
            }
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
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
                  <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
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
                  />
                </View>
              )}

              <View
                style={[
                  styles.inputBox,
                  focusedInput === 'email' && styles.inputBoxFocused,
                ]}
              >
                <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
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
                  autoCorrect={false}
                />
              </View>

              <View
                style={[
                  styles.inputBox,
                  focusedInput === 'password' && styles.inputBoxFocused,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
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
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color="#64748B"
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
                  <Ionicons name="gift-outline" size={18} color="#64748B" style={styles.inputIcon} />
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
                  />
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
                    colors={["#0F172A", "#1E293B"]}
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
            </View>
          </Animated.View>

          {/* ── Terms ── */}
          <View style={styles.termsBox}>
            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text style={styles.link}>Terms of Service</Text> and{" "}
              <Text style={styles.link}>Privacy Policy</Text>
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
                  >
                    {forgotLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalActionBtnText}>Send Reset Code</Text>
                    )}
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
                  >
                    {forgotLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalActionBtnText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
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
    justifyContent: "center",
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
    marginBottom: 20,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "47%",
    backgroundColor: "#0F172A",
    borderRadius: 13,
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
    borderColor: "#0F172A",
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
    color: "#475569",
    fontWeight: "600",
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
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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

  /* ── TERMS ── */
  termsBox: { alignItems: "center", paddingHorizontal: 16 },
  terms: { fontSize: 12, color: "#64748B", textAlign: "center", lineHeight: 18 },
  link: { color: "#0F172A", fontWeight: "700" },

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
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
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
});
