import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { verifyOtp, sendOtp } from "../../api/auth";
import * as SecureStore from 'expo-secure-store';

const OTP_LENGTH = 6;

interface OtpInputProps {
  phone: string;
}

const OtpInputComponent: React.FC<OtpInputProps> = ({ phone }) => {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { signIn } = useAuth();

  // Animation values
  const headerSlide = useRef(new Animated.Value(-100)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  // Individual OTP box animations
  const boxAnimations = useRef(Array(OTP_LENGTH).fill(0).map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Error message animation
  useEffect(() => {
    Animated.timing(errorOpacity, {
      toValue: errorMessage ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [errorMessage]);

  const shakeInputs = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateBox = (index: number) => {
    Animated.sequence([
      Animated.timing(boxAnimations[index], {
        toValue: 1.15,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(boxAnimations[index], {
        toValue: 1,
        tension: 60,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const clearError = () => {
    setError(false);
    setErrorMessage("");
  };

  const handleChange = (text: string, index: number) => {
    if (error) clearError();

    if (text.length > 1) {
      text = text.slice(-1);
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Animate the filled box
    if (text) {
      animateBox(index);
    }

    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (text && index === OTP_LENGTH - 1) {
      const fullOtp = [...newOtp];
      if (fullOtp.every((digit) => digit !== "")) {
        setTimeout(() => handleVerifyOtp(fullOtp.join("")), 300);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP against backend ────────────────────────────────────
  const handleVerifyOtp = async (otpCode?: string) => {
    try {
      setIsLoading(true);
      clearError();

      // Button press animation
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      const enteredOtp = otpCode || otp.join("");

      if (enteredOtp.length !== OTP_LENGTH) {
        setError(true);
        setErrorMessage("Please enter the full verification code");
        shakeInputs();
        return;
      }

      const fullPhone = `+91${phone}`;

      // Call the real verify API
      const response = await verifyOtp({ phone: fullPhone, otp: enteredOtp });

      // Save phone number for profile display
      await SecureStore.setItemAsync('phoneNumber', phone);

      // Sign in with the real token from the server
      await signIn(response.token, response.userId, response.refreshToken, response.isNewUser);

    } catch (err: any) {
      console.error("OTP verification failed:", err);

      const status = err?.response?.status;
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        null;

      setError(true);
      shakeInputs();

      // Handle specific error cases
      if (status === 410) {
        // Expired OTP
        setErrorMessage(apiMessage || "Code expired. Please request a new one.");
        setTimer(0); // Show resend button immediately
      } else if (status === 429) {
        // Too many attempts
        setErrorMessage(apiMessage || "Too many failed attempts. Request a new code.");
        setTimer(0);
      } else if (status === 400) {
        // Wrong OTP or validation error
        setErrorMessage(apiMessage || "Invalid verification code. Please try again.");
      } else if (!err?.response) {
        setErrorMessage("Network error. Please check your connection.");
      } else {
        setErrorMessage(apiMessage || "Verification failed. Please try again.");
      }

      // Clear OTP inputs on error
      setOtp(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    try {
      setIsResending(true);
      clearError();

      const fullPhone = `+91${phone}`;
      await sendOtp(fullPhone);

      setTimer(30);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } catch (err: any) {
      console.error("Resend OTP failed:", err);

      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        null;

      const status = err?.response?.status;

      setError(true);

      if (status === 429) {
        setErrorMessage(apiMessage || "Please wait before requesting a new code.");
      } else if (!err?.response) {
        setErrorMessage("Network error. Please check your connection.");
      } else {
        setErrorMessage(apiMessage || "Failed to resend code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleBackButtonPress = () => {
    router.replace("/(auth)" as any);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const isComplete = otp.every((digit) => digit !== "");

  return (
    <View style={styles.gradientWrapper}>
      <LinearGradient colors={["#ffffffff", "#ffffffff", "#ffffffff"]} style={styles.gradient}>
        
        {/* Header Section */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackButtonPress}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonCircle}>
              <AntDesign name="arrow-left" size={20} color="#1A1A1A" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>VERIFY DETAILS</Text>
            <Text style={styles.headerPhone}>Code sent to +91-{phone}</Text>
          </View>

          <View style={styles.phoneIllustration}>
            <MaterialCommunityIcons
              name="cellphone-message"
              size={28}
              color="#1A1A1A"
            />
          </View>
        </Animated.View>

        {/* Main Content Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a {OTP_LENGTH}-digit code to your phone
            </Text>

            {/* OTP Input */}
            <Animated.View
              style={[
                styles.otpContainer,
                { transform: [{ translateX: shakeAnimation }] },
              ]}
            >
              {otp.map((digit, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.otpInputWrapper,
                    {
                      transform: [{ scale: boxAnimations[index] }],
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                      error && styles.errorBorder,
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    ref={(ref) => { inputs.current[index] = ref; }}
                    editable={!isLoading}
                    selectTextOnFocus
                    selectionColor="#1A1A1A"
                  />
                  {digit && (
                    <Animated.View
                      style={[
                        styles.filledIndicator,
                        {
                          transform: [{ scale: boxAnimations[index] }],
                        },
                      ]}
                    >
                      <View style={styles.filledDot} />
                    </Animated.View>
                  )}
                </Animated.View>
              ))}
            </Animated.View>

            {/* Error Message */}
            {errorMessage ? (
              <Animated.View
                style={[
                  styles.errorContainer,
                  {
                    opacity: errorOpacity,
                    transform: [{ translateX: shakeAnimation }],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color="#EF4444"
                />
                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </Animated.View>
            ) : null}

            {/* Timer/Resend Section */}
            <View style={styles.timerContainer}>
              {timer > 0 ? (
                <View style={styles.timerWrapper}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color="#64748B"
                  />
                  <Text style={styles.timerText}>
                    Resend code in {formatTime(timer)}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={isResending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>
                    {isResending ? "Sending..." : "Didn't receive code? "}
                    {!isResending && <Text style={styles.resendLink}>Resend</Text>}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          {/* Verify Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isComplete || isLoading) && styles.verifyButtonDisabled,
              ]}
              onPress={() => handleVerifyOtp()}
              disabled={!isComplete || isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isComplete && !isLoading
                    ? ["#1A1A1A", "#2D2D2D"]
                    : ["#F1F5F9", "#F1F5F9"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons
                      name="loading"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.verifyButtonTextActive}>
                      Verifying...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.verifyButtonText,
                        isComplete
                          ? styles.verifyButtonTextActive
                          : styles.verifyButtonTextDisabled,
                      ]}
                    >
                      Verify & Continue
                    </Text>
                    {isComplete && (
                      <AntDesign name="arrow-right" size={20} color="#FFFFFF" />
                    )}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Change Number Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackButtonPress}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.helpContainer}>
          <MaterialCommunityIcons name="shield-check" size={16} color="#64748B" />
          <Text style={styles.helpText}>Your information is safe and secure</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

export default OtpInputComponent;

const styles = StyleSheet.create({
  gradientWrapper: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Manrope-Bold",
  },
  headerPhone: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Manrope-SemiBold",
  },
  phoneIllustration: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Manrope-Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 32,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
    lineHeight: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  otpInputWrapper: {
    position: "relative",
  },
  otpInput: {
    width: 46,
    height: 56,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    backgroundColor: "#F8FAFC",
    fontFamily: "Manrope-Bold",
  },
  otpInputFilled: {
    borderColor: "#1A1A1A",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  errorBorder: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  filledIndicator: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  filledDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#1A1A1A",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Manrope-SemiBold",
    flex: 1,
  },
  timerContainer: {
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
  },
  timerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    fontFamily: "Manrope-Medium",
  },
  resendText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Manrope-Medium",
  },
  resendLink: {
    color: "#1A1A1A",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  verifyButton: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifyButtonText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
  },
  verifyButtonTextActive: {
    color: "#FFFFFF",
  },
  verifyButtonTextDisabled: {
    color: "#94A3B8",
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    fontWeight: "500",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  helpText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Manrope-Medium",
  },
});
