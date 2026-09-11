import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { sendOtp, googleLogin } from "../../api/auth";
import logo from "../../assets/images/logo/logo.png";
import { useAuth } from "../../context/AuthContext";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isReferralFocused, setIsReferralFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [referralCode, setReferralCode] = useState("");

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
    GoogleSignin.configure({
      webClientId: "38756562066-okgjrlcfekdntca9af6cps7bgknc0dhr.apps.googleusercontent.com",
      offlineAccess: false,
    });
  }, []);

  // ── Animations ─────────────────────────────────────────────────────
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  // Entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 60, friction: 8, delay: 150, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  // Progress bar
  useEffect(() => {
    Animated.spring(progressWidth, {
      toValue: phoneNumber.length / 10,
      tension: 80,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [phoneNumber]);

  // Error animation
  useEffect(() => {
    Animated.timing(errorOpacity, {
      toValue: errorMessage ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [errorMessage]);

  // Clear error when user types
  useEffect(() => {
    if (errorMessage && phoneNumber.length > 0) {
      setErrorMessage("");
    }
  }, [phoneNumber]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      let idToken;
      const clientId: string = "38756562066-okgjrlcfekdntca9af6cps7bgknc0dhr.apps.googleusercontent.com";
      if (!clientId || clientId.includes("PLACEHOLDER")) {
        console.warn("Using mock token because GOOGLE_WEB_CLIENT_ID is a placeholder.");
        idToken = `mock-google-token-${Date.now()}-mockgoogleid-testuser@example.com`;
      } else {
        await GoogleSignin.hasPlayServices();
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
      if (res && res.token) {
        const { token, refreshToken, userId, isNewUser } = res;
        await signIn(token, userId, refreshToken, isNewUser);
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

  const handleSendOTP = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();

      // Prepend +91 country code
      const fullPhone = `+91${phoneNumber}`;

      await sendOtp(fullPhone);

      router.replace({
        pathname: "/(auth)/otpVerification",
        params: { phone: phoneNumber },
      });
    } catch (error: any) {
      console.error("Send OTP failed:", error);

      // Extract error message from API response
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        null;

      const status = error?.response?.status;

      if (apiMessage) {
        setErrorMessage(apiMessage);
      } else if (status === 429) {
        setErrorMessage("Too many requests. Please wait before trying again.");
      } else if (!error?.response) {
        setErrorMessage("Network error. Please check your connection.");
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(inputScale, { toValue: 1.015, tension: 80, friction: 7, useNativeDriver: true }).start();
  };
  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(inputScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();
  };

  const handleReferralFocus = () => {
    setIsReferralFocused(true);
  };
  const handleReferralBlur = () => {
    setIsReferralFocused(false);
  };

  const progressPct = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.centerWrapper}>
      {/* Sibling absolute background layout */}
      <LinearGradient colors={["#ffffffff", "#ffffffff", "#ffffffff"]} style={[StyleSheet.absoluteFillObject, { zIndex: -2 }]} />

      {/* Floating Assets in Background */}
      {randomAssets.map((asset, index) => (
        <MovingAsset key={index} {...asset} isLowSpec={isLowSpec} />
      ))}

      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
      >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
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
              <Image
                source={logo}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* ── CARD ── */}
            <Animated.View
              style={[
                styles.cardWrapper,
                { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
              ]}
            >
              <View style={styles.card}>
                {/* Welcome header for Google Sign-In */}
                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                <Text style={styles.welcomeSubtitle}>Sign in to continue to FlashFits</Text>

                {/* Referral Code Input */}
                <View
                  style={[
                    styles.inputBox,
                    {
                      borderColor: isReferralFocused ? "#78787cff" : "#e2e8f0",
                      backgroundColor: isReferralFocused ? "#ffffff" : "#f8fafc",
                    },
                  ]}
                >
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Referral Code (Optional)"
                    placeholderTextColor="#94a3b8"
                    value={referralCode}
                    onChangeText={setReferralCode}
                    onFocus={handleReferralFocus}
                    onBlur={handleReferralBlur}
                    editable={!isLoading}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Google Sign-In Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }], marginVertical: 12 }}>
                  <TouchableOpacity
                    style={styles.googleBtn}
                    disabled={isLoading}
                    onPress={handleGoogleSignIn}
                    activeOpacity={0.85}
                  >
                    <AntDesign name="google" size={20} color="#000000" />
                    <Text style={styles.googleBtnText}>
                      {isLoading ? "Signing in..." : "Continue with Google"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Error Message */}
                {errorMessage ? (
                  <Animated.View style={[styles.errorBox, { opacity: errorOpacity }]}>
                    <AntDesign name="exclamation-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </Animated.View>
                ) : null}

                {/* Phone Login Code preserved for future use when OTP service is ready */}
                {/* 
                <Text style={styles.label}>Phone Number</Text>

                <Animated.View
                  style={[
                    styles.inputBox,
                    {
                      transform: [{ scale: inputScale }],
                      borderColor: errorMessage
                        ? "#EF4444"
                        : isFocused
                          ? "#78787cff"
                          : "#e2e8f0",
                      backgroundColor: errorMessage
                        ? "#FEF2F2"
                        : isFocused
                          ? "#ffffff"
                          : "#f8fafc",
                    },
                  ]}
                >
                  <TouchableOpacity style={styles.countryPicker}>
                    <Image
                      source={{ uri: "https://flagcdn.com/w40/in.png" }}
                      style={styles.flag}
                    />
                    <Text style={styles.code}>+91</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Phone Number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9]/g, "");
                      if (clean.length <= 10) setPhoneNumber(clean);
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    maxLength={10}
                    editable={!isLoading}
                  />
                </Animated.View>

                <View style={styles.progressBox}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTxt}>Progress</Text>
                    <Text style={styles.progressNum}>{phoneNumber.length}/10</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: progressPct }]} />
                  </View>
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.continueBtn,
                      phoneNumber.length === 10 ? styles.continueActive : styles.continueDisabled,
                    ]}
                    disabled={phoneNumber.length !== 10 || isLoading}
                    onPress={handleSendOTP}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={
                        phoneNumber.length === 10
                          ? ["rgba(0, 0, 0, 1)", 'rgba(0, 0, 0, 0.93)', "rgba(0, 0, 0, 0.61)"]
                          : ["#eee", "#eee"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientBtn}
                    >
                      <Text
                        style={[
                          styles.continueTxt,
                          phoneNumber.length === 10 ? styles.txtActive : styles.txtDisabled,
                        ]}
                      >
                        {isLoading ? "Sending OTP..." : "Continue"}
                      </Text>
                      {phoneNumber.length === 10 && !isLoading && (
                        <AntDesign name="right" size={20} color="#fff" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
                */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
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

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── LOGO ── */
  logoWrapper: { marginBottom: 10, alignItems: "center" },
  logo: { width: width * 0.55, height: 80 },

  /* ── CARD ── */
  cardWrapper: { width: "100%", marginBottom: 32 },
  card: {
    backgroundColor: "transparent",
    borderRadius: 32,
    padding: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F0F0F",
    marginBottom: 8,
    fontFamily: "Manrope-Bold",
  },

  /* ── INPUT ── */
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  countryPicker: { flexDirection: "row", alignItems: "center", },
  flag: { width: 28, height: 20, borderRadius: 4, marginRight: 8 },
  code: { fontSize: 17, fontWeight: "700", color: "#1e293b", marginRight: 6 },
  divider: { width: 1, height: 28, backgroundColor: "#cbd5e1", marginLeft: 2 },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    marginLeft: 5,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Manrope-SemiBold",
  },

  /* ── ERROR ── */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
    fontFamily: "Manrope-Medium",
    flex: 1,
  },

  /* ── PROGRESS ── */
  progressBox: { marginBottom: 24 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressTxt: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  progressNum: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  progressTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#04002aff", borderRadius: 3 },

  /* ── BUTTON ── */
  continueBtn: { borderRadius: 20, overflow: "hidden", shadowColor: "#000" },
  continueActive: { shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  continueDisabled: { shadowOpacity: 0, elevation: 0 },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  continueTxt: { fontSize: 18, fontWeight: "700", fontFamily: "Manrope-Bold" },
  txtActive: { color: "#ffffff" },
  txtDisabled: { color: "#888" },

  /* ── GOOGLE SIGN-IN ── */
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F0F0F",
    textAlign: "center",
    marginBottom: 6,
    fontFamily: "Manrope-Bold",
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Manrope-Medium",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 18,
    gap: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F0F0F",
    fontFamily: "Manrope-Bold",
  },

  /* ── TERMS ── */
  termsBox: { alignItems: "center", paddingHorizontal: 16 },
  terms: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 19 },
  link: { color: "#1e293b", fontWeight: "700" },
});
