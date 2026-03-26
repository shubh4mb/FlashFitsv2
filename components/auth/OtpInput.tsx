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

interface OtpInputProps {
  phone: string;
  preFetchedToken?: string;
  preFetchedUserId?: string;
  isNewUser?: boolean;
}

const OtpInputComponent: React.FC<OtpInputProps> = ({ 
  phone, 
  preFetchedToken, 
  preFetchedUserId, 
  isNewUser = false 
}) => {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]); // 4 Digits as requested
  const [error, setError] = useState(false);
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

  // Individual OTP box animations
  const boxAnimations = useRef(otp.map(() => new Animated.Value(1))).current;

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

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

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
    // Smooth upscale transition
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

  const handleChange = (text: string, index: number) => {
    if (error) setError(false);

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

    if (text && index < otp.length - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (text && index === otp.length - 1) {
      const fullOtp = [...newOtp];
      if (fullOtp.every((digit) => digit !== "")) {
        setTimeout(() => verifyOtp(fullOtp.join("")), 300);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (otpCode?: string) => {
    try {
      setIsLoading(true);

      // Button press animation
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const enteredOtp = otpCode || otp.join("");

      if (enteredOtp.length !== 4) {
        setError(true);
        shakeInputs();
        return;
      }

      // Using props for verification
      await signIn(preFetchedToken || "mock-token", preFetchedUserId || "mock-user", isNewUser);

    } catch (err) {
      console.error("OTP verification failed:", err);
      setError(true);
      shakeInputs();
      setOtp(["", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsResending(true);
      setTimer(30);
      setOtp(["", "", "", ""]);
      setError(false);
      inputs.current[0]?.focus();
      // TODO: Add resend OTP API call here if needed
    } catch (err) {
      console.error("Resend OTP failed:", err);
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
              We've sent a 4-digit code to your phone
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
            {error && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  {
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
                  Invalid code. Please try again
                </Text>
              </Animated.View>
            )}

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
                    <Text style={styles.resendLink}>Resend</Text>
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
              onPress={() => verifyOtp()}
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
    justifyContent: "space-around", // Better spacing for 4 digits
    marginBottom: 24,
  },
  otpInputWrapper: {
    position: "relative",
  },
  otpInput: {
    width: 60, // Slightly wider for 4 digits
    height: 68,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    textAlign: "center",
    fontSize: 26,
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
    bottom: 8,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  filledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
