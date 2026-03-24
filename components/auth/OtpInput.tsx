import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
  const [otp, setOtp] = useState(["", "", "", "", ""]);
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
      Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 50, friction: 8, delay: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
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
    Animated.sequence([
      Animated.timing(boxAnimations[index], { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(boxAnimations[index], { toValue: 1, tension: 60, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const handleChange = (text: string, index: number) => {
    if (error) setError(false);
    if (text.length > 1) text = text.slice(-1);

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text) animateBox(index);
    if (text && index < otp.length - 1) inputs.current[index + 1]?.focus();
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
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      const enteredOtp = otpCode || otp.join("");
      if (enteredOtp.length !== 5) {
        setError(true);
        shakeInputs();
        return;
      }

      await signIn(preFetchedToken || "mock-token", preFetchedUserId || "mock-user", isNewUser);

    } catch (err) {
      console.error("OTP verification failed:", err);
      setError(true);
      shakeInputs();
      setOtp(["", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setTimer(30);
    setOtp(["", "", "", "", ""]);
    setError(false);
    inputs.current[0]?.focus();
    setIsResending(false);
  };

  const handleBackButtonPress = () => {
    router.replace("/(auth)" as any);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isComplete = otp.every((digit) => digit !== "");

  return (
    <LinearGradient colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]} className="flex-1">
      <Animated.View 
        style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}
        className="flex-row items-center justify-between px-6 pt-14 pb-6"
      >
        <TouchableOpacity className="mr-4" onPress={handleBackButtonPress}>
          <View className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-md shadow-black/10 elevation-3">
            <AntDesign name="arrow-left" size={20} color="#1A1A1A" />
          </View>
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">VERIFY DETAILS</Text>
          <Text className="text-[14px] font-semibold text-slate-900">Code sent to +91-{phone}</Text>
        </View>
      </Animated.View>

      <Animated.View 
        style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}
        className="px-6 mt-4 flex-1"
      >
        <View className="bg-white rounded-[32px] p-7 shadow-2xl shadow-black/5 elevation-5">
          <Text className="text-2xl font-bold text-slate-900 mb-2 text-center">Enter Code</Text>
          <Text className="text-sm text-slate-500 mb-8 text-center leading-5">We've sent a 5-digit code to your phone</Text>

          <Animated.View 
            style={{ transform: [{ translateX: shakeAnimation }] }}
            className="flex-row justify-between mb-6"
          >
            {otp.map((digit, index) => (
              <Animated.View key={index} style={{ transform: [{ scale: boxAnimations[index] }] }}>
                <TextInput
                  className={`w-14 h-16 border-2 rounded-2xl text-center text-2xl font-bold ${digit ? 'border-primary bg-white text-slate-900' : 'border-slate-100 bg-slate-50 text-slate-400'} ${error ? 'border-accent bg-red-50' : ''}`}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  ref={(ref) => { inputs.current[index] = ref; }}
                  editable={!isLoading}
                  selectTextOnFocus
                />
              </Animated.View>
            ))}
          </Animated.View>

          {error && (
            <Animated.View 
              style={{ transform: [{ translateX: shakeAnimation }] }}
              className="flex-row items-center justify-center bg-red-50 rounded-xl py-3 px-4 mb-5 gap-1.5"
            >
              <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
              <Text className="text-red-500 text-xs font-bold uppercase tracking-tight">Invalid verification code</Text>
            </Animated.View>
          )}

          <View className="items-center justify-center min-h-[40px]">
            {timer > 0 ? (
              <View className="flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="clock-outline" size={14} color="#64748B" />
                <Text className="text-sm text-slate-500 font-medium tracking-tight">Resend code in {formatTime(timer)}</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                <Text className="text-sm text-slate-500">
                  {isResending ? "Sending..." : "Didn't receive code? "}
                  <Text className="text-primary font-bold underline">Resend</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      <View className="px-6 pb-12 gap-3">
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            className={`rounded-2xl overflow-hidden ${(!isComplete || isLoading) ? 'opacity-40' : 'opacity-100'}`}
            onPress={() => verifyOtp()}
            disabled={!isComplete || isLoading}
          >
            <LinearGradient
              colors={isComplete && !isLoading ? ["#1A1A1A", "#2D2D2D"] : ["#E2E8F0", "#E2E8F0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center justify-center py-[18px] gap-2"
            >
              {isLoading ? (
                <Text className="text-white text-[17px] font-bold">Verifying...</Text>
              ) : (
                <>
                  <Text className={`text-[17px] font-bold ${isComplete ? 'text-white' : 'text-slate-500'}`}>
                    Verify & Continue
                  </Text>
                  {isComplete && <AntDesign name="arrow-right" size={20} color="#FFFFFF" />}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity className="py-4 items-center" onPress={handleBackButtonPress}>
           <Text className="text-slate-500 font-semibold tracking-tight">Change Phone Number</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default OtpInputComponent;
