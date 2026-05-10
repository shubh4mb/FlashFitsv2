import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
import { sendOtp } from "../../api/auth";
import logo from "../../assets/images/logo/logo.png";

const { width, height } = Dimensions.get("window");

export default function PhoneLogin() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const progressPct = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.centerWrapper}>
      <LinearGradient colors={["#ffffffff", "#ffffffff", "#ffffffff"]} style={styles.gradient}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
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
                {/* Label */}
                <Text style={styles.label}>Phone Number</Text>

                {/* Input */}
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

                {/* Error Message */}
                {errorMessage ? (
                  <Animated.View style={[styles.errorBox, { opacity: errorOpacity }]}>
                    <AntDesign name="exclamationcircleo" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </Animated.View>
                ) : null}

                {/* Progress */}
                <View style={styles.progressBox}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTxt}>Progress</Text>
                    <Text style={styles.progressNum}>{phoneNumber.length}/10</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: progressPct }]} />
                  </View>
                </View>

                {/* Continue button */}
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

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

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
    backgroundColor: "#ffffff",
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

  /* ── TERMS ── */
  termsBox: { alignItems: "center", paddingHorizontal: 16 },
  terms: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 19 },
  link: { color: "#1e293b", fontWeight: "700" },
});
