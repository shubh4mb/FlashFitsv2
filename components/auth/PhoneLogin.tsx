import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { phoneLogin } from "../../api/auth";

const { width } = Dimensions.get("window");

export default function PhoneLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Animations ─────────────────────────────────────────────────────
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

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

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    try {
      setIsLoading(true);
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();

      // Call real phoneLogin API which returns the token immediately
      const response = await phoneLogin({ phoneNumber: phoneNumber });
      
      router.replace({
        pathname: "/(auth)/otpVerification",
        params: { 
          phone: phoneNumber,
          token: response.token,
          userId: response.userId,
          isNewUser: response.isNewUser ? "true" : "false"
        },
      });
    } catch (error) {
       console.error("Phone login failed:", error);
       alert("Failed to connect to backend. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(inputScale, { toValue: 1.02, tension: 80, friction: 7, useNativeDriver: true }).start();
  };
  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(inputScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();
  };

  const progressPct = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="flex-1 items-center justify-center">
      <LinearGradient colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]} className="flex-1 w-full">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48, alignItems: "center", justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── LOGO ── */}
            <Animated.View
              style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}
              className="mb-6 items-center"
            >
              <View style={{ width: width * 0.6, height: 80 }} className="items-center justify-center">
                  <Text className="text-4xl font-black text-black tracking-tighter">FlashFits</Text>
              </View>
            </Animated.View>

            {/* ── CARD ── */}
            <Animated.View
              style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}
              className="w-full mb-8"
            >
              <View className="bg-white rounded-[32px] p-7 shadow-2xl shadow-black/5 elevation-5">
                {/* Label */}
                <Text className="text-sm font-bold text-black mb-2 px-1">Phone Number</Text>

                {/* Input */}
                <Animated.View
                  style={{ transform: [{ scale: inputScale }] }}
                  className={`flex-row items-center border-[1.5px] rounded-2xl px-4 py-4 mb-5 ${isFocused ? 'border-primary bg-white' : 'border-slate-100 bg-slate-50'}`}
                >
                  <TouchableOpacity className="flex-row items-center">
                    <Text className="text-[17px] font-bold text-slate-800 mr-1.5">+91</Text>
                  </TouchableOpacity>

                  <View className="w-[1px] h-7 bg-slate-200 ml-0.5 mr-2" />

                  <TextInput
                    className="flex-1 text-[17px] ml-1 font-semibold text-slate-900"
                    placeholder="Phone Number"
                    placeholderTextColor="#94A3B8"
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

                {/* Progress */}
                <View className="mb-6">
                  <View className="flex-row justify-between mb-2 px-1">
                    <Text className="text-xs text-slate-500 font-medium">Progress</Text>
                    <Text className="text-xs text-slate-500 font-bold">{phoneNumber.length}/10</Text>
                  </View>
                  <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <Animated.View style={{ width: progressPct }} className="h-full bg-primary rounded-full" />
                  </View>
                </View>

                {/* Continue button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    className={`rounded-2xl overflow-hidden ${phoneNumber.length === 10 ? 'opacity-100' : 'opacity-40'}`}
                    disabled={phoneNumber.length !== 10 || isLoading}
                    onPress={handleSendOTP}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={phoneNumber.length === 10 ? ["#1A1A1A", "#2D2D2D"] : ["#E2E8F0", "#E2E8F0"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="flex-row items-center justify-center py-[18px] gap-2"
                    >
                      <Text className={`text-[18px] font-bold ${phoneNumber.length === 10 ? 'text-white' : 'text-slate-500'}`}>
                        {isLoading ? "Sending..." : "Continue"}
                      </Text>
                      {phoneNumber.length === 10 && !isLoading && (
                        <AntDesign name="arrow-right" size={20} color="#FFF" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

            {/* ── Terms ── */}
            <View className="items-center px-4">
              <Text className="text-[13px] text-slate-400 text-center leading-5">
                By continuing, you agree to our{" "}
                <Text className="text-slate-800 font-bold">Terms of Service</Text> and{" "}
                <Text className="text-slate-800 font-bold">Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}
