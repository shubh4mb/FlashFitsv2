import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Text,
    TouchableOpacity,
    View,
    Image,
    StyleSheet,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/theme';

// Safe import of expo-device — native module may not be available in Expo Go or Web
let Device: { isDevice: boolean; totalMemory?: number } = { isDevice: Platform.OS !== 'web' };
try {
  Device = require('expo-device');
} catch (e) {
  console.warn('expo-device native module not available, using fallback');
}

const isLowSpec = !Device.isDevice || (Device.totalMemory ? Device.totalMemory < 3 * 1024 * 1024 * 1024 : false);

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        icon: 'bag-handle-outline',
        title: 'Style, Delivered.',
        description:
            'Order multiple sizes and styles to your doorstep. No upfront payment—just a tiny delivery fee.',
        gradient: ['#FFFFFF', '#F8FAFC'] as const,
        accentColor: BrandColors.primary,
    },
    {
        id: '2',
        icon: 'shirt-outline',
        title: 'Try Before You Buy',
        description:
            'Your room is the fitting room. Our rider brings your picks in 30 minutes for a relaxed home try-on.',
        gradient: ['#FFFFFF', '#F8FAFC'] as const,
        accentColor: BrandColors.primary,
    },
    {
        id: '3',
        icon: 'heart-outline',
        title: 'Keep What Fits',
        description:
            "Found your perfect match? Keep it and pay securely. Smart discounts are applied instantly.",
        gradient: ['#FFFFFF', '#F8FAFC'] as const,
        accentColor: BrandColors.primary,
    },
    {
        id: '4',
        icon: 'refresh-circle-outline',
        title: 'Instant Returns',
        description:
            "Not your vibe? Hand it back to the rider right away. Zero return hassle, zero extra cost.",
        gradient: ['#FFFFFF', '#F8FAFC'] as const,
        accentColor: BrandColors.primary,
    },
];

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
});

interface OnboardingSwiperProps {
    onComplete: () => void;
}

export default function OnboardingSwiper({ onComplete }: OnboardingSwiperProps) {
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);
    const { top, bottom } = useSafeAreaInsets();

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

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            flatListRef.current?.scrollToOffset({
                offset: nextIndex * width,
                animated: true,
            });
        } else {
            onComplete();
        }
    };

    const getItemLayout = (_: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    });

    const onScrollToIndexFailed = (info: { index: number }) => {
        setTimeout(() => {
            flatListRef.current?.scrollToOffset({
                offset: info.index * width,
                animated: true,
            });
        }, 50);
    };

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
        if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0 && viewableItems[0].index != null) {
            const newIndex = viewableItems[0].index;
            setCurrentIndex(newIndex);
        }
    }).current;

    const viewabilityConfig = useRef({
        viewAreaCoveragePercentThreshold: 50,
    }).current;

    const isLastSlide = currentIndex === SLIDES.length - 1;
    const currentSlide = SLIDES[currentIndex];

    // Attempting to resolve the logo
    const logoSource = require('../../assets/images/logo/logo.png');

    const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

        const iconScaleInterp = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
        });

        const iconOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
        });

        const textTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [40, 0, 40],
            extrapolate: 'clamp',
        });

        const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={{ width }} className="flex-1 items-center justify-center px-8">
                <Animated.View
                    style={{ transform: [{ scale: iconScaleInterp }], opacity: iconOpacity }}
                    className="mb-10"
                >
                    <View
                        style={{
                            backgroundColor: BrandColors.softCyan,
                            borderColor: BrandColors.softCyanBorder,
                            borderWidth: 1.5,
                            shadowColor: BrandColors.primary,
                            shadowOpacity: 0.22,
                            shadowRadius: 24,
                            shadowOffset: { width: 0, height: 8 },
                            elevation: 6,
                        }}
                        className="w-[200px] h-[200px] rounded-full items-center justify-center border"
                    >
                        <View
                            style={{
                                backgroundColor: 'rgba(0, 194, 232, 0.12)',
                                borderColor: 'rgba(0, 194, 232, 0.25)',
                            }}
                            className="w-[148px] h-[148px] rounded-full items-center justify-center border"
                        >
                            <Ionicons name={item.icon as any} size={76} color={BrandColors.primary} />
                        </View>
                    </View>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: textOpacity,
                        backgroundColor: BrandColors.softCyan,
                        borderWidth: 1,
                        borderColor: BrandColors.softCyanBorder,
                    }}
                    className="px-4 py-1.5 rounded-full mb-6"
                >
                    <Text
                        style={{ color: BrandColors.cyanDeep }}
                        className="text-[10px] font-black tracking-[2px] uppercase"
                    >
                        STEP {index + 1} OF {SLIDES.length}
                    </Text>
                </Animated.View>

                <Animated.Text
                    style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}
                    className="text-[34px] text-[#111418] font-extrabold text-center mb-4 tracking-tight leading-[42px]"
                >
                    {item.title}
                </Animated.Text>

                <Animated.Text
                    style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}
                    className="text-[16px] text-[#4B5563] font-medium text-center leading-[26px] px-2"
                >
                    {item.description}
                </Animated.Text>
            </View>
        );
    };

    return (
        <View className="flex-1">
            <StatusBar style="dark" />

            {/* Sibling absolute background layout */}
            <LinearGradient colors={currentSlide.gradient} style={[StyleSheet.absoluteFillObject, { zIndex: -2 }]} />

            {/* Floating Assets in Background */}
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                {randomAssets.map((asset, index) => (
                    <MovingAsset key={index} {...asset} isLowSpec={isLowSpec} />
                ))}
            </View>

            <View style={{ top: Math.max(top, 20) + 12 }} className="absolute left-6 z-10">
                <Image source={logoSource} style={{ width: 110, height: 28 }} resizeMode="contain" />
            </View>

            {!isLastSlide && (
                <TouchableOpacity 
                    style={{ top: Math.max(top, 20) + 10 }}
                    className="absolute right-6 z-10 px-4 py-1.5 rounded-full border border-slate-200 bg-white/90 shadow-sm" 
                    onPress={onComplete} 
                    activeOpacity={0.7}
                >
                    <Text className="text-slate-700 text-[12px] font-bold tracking-widest uppercase">Skip</Text>
                </TouchableOpacity>
            )}

            <View className="flex-1">
                <Animated.FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    scrollEventThrottle={16}
                />
            </View>

            <View
                style={{
                    paddingBottom: Math.max(bottom, 20) + 10,
                    zIndex: 50,
                    elevation: 10,
                }}
                className="px-8 pt-4 w-full items-center bg-transparent"
            >
                <View className="flex-row items-center mb-8 gap-2.5">
                    {SLIDES.map((slide, index) => {
                        const dotWidth = scrollX.interpolate({
                            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                            outputRange: [8, 32, 8],
                            extrapolate: 'clamp',
                        });

                        const dotOpacity = scrollX.interpolate({
                            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                            outputRange: [0.35, 1, 0.35],
                            extrapolate: 'clamp',
                        });

                        const dotBg = scrollX.interpolate({
                            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                            outputRange: ['#CBD5E1', BrandColors.primary, '#CBD5E1'],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={slide.id}
                                style={{
                                    width: dotWidth,
                                    opacity: dotOpacity,
                                    backgroundColor: dotBg,
                                }}
                                className="h-2 rounded-full"
                            />
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={{
                        width: '100%',
                        borderRadius: 16,
                        overflow: 'hidden',
                        shadowColor: BrandColors.primary,
                        shadowOpacity: 0.35,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 5,
                    }}
                    onPress={handleNext}
                    activeOpacity={0.8}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <LinearGradient
                        colors={BrandColors.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        pointerEvents="none"
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            paddingVertical: 16,
                            gap: 8,
                        }}
                    >
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 }}>
                            {isLastSlide ? 'Get Started' : 'Next'}
                        </Text>
                        <Ionicons name={isLastSlide ? 'arrow-forward' : 'chevron-forward'} size={20} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>

                <View className="h-6 mt-3 w-full items-center justify-center">
                    {isLastSlide ? (
                        <TouchableOpacity onPress={onComplete} activeOpacity={0.7} className="py-1">
                            <Text style={{ color: BrandColors.primaryDark }} className="text-sm font-bold tracking-tight">
                                Explore FlashFits →
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        </View>
    );
}
