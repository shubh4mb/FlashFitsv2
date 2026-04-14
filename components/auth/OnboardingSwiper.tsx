import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        icon: 'bag-handle-outline',
        title: 'Style, Delivered.',
        description:
            'Order multiple sizes and styles to your doorstep. No upfront payment—just a tiny delivery fee.',
        gradient: ['#FFFFFF', '#FAFAFA'] as const,
        accentColor: '#000000',
    },
    {
        id: '2',
        icon: 'shirt-outline',
        title: 'Try Before You Buy',
        description:
            'Your room is the fitting room. Our rider brings your picks in 60 minutes for a relaxed home try-on.',
        gradient: ['#FFFFFF', '#F5F5F5'] as const,
        accentColor: '#000000',
    },
    {
        id: '3',
        icon: 'heart-outline',
        title: 'Keep What Fits',
        description:
            "Found your perfect match? Keep it and pay securely. Smart discounts are applied instantly.",
        gradient: ['#FFFFFF', '#FAFAFA'] as const,
        accentColor: '#000000',
    },
    {
        id: '4',
        icon: 'refresh-circle-outline',
        title: 'Instant Returns',
        description:
            "Not your vibe? Hand it back to the rider right away. Zero return hassle, zero extra cost.",
        gradient: ['#FFFFFF', '#F5F5F5'] as const,
        accentColor: '#000000',
    },
];

interface OnboardingSwiperProps {
    onComplete: () => void;
}

export default function OnboardingSwiper({ onComplete }: OnboardingSwiperProps) {
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);
    const { top, bottom } = useSafeAreaInsets();

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setCurrentIndex(nextIndex);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
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
                    className="mb-12"
                >
                    <View style={{ backgroundColor: '#00000008', shadowColor: item.accentColor, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 }} className="w-[200px] h-[200px] rounded-full items-center justify-center border border-black/5">
                        <View style={{ backgroundColor: '#00000005' }} className="w-[150px] h-[150px] rounded-full items-center justify-center border border-black/5">
                            <Ionicons name={item.icon as any} size={76} color={item.accentColor} />
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={{ opacity: textOpacity, backgroundColor: '#00000008', borderWidth: 1, borderColor: '#00000015' }} className="px-4 py-1.5 rounded-full mb-6">
                    <Text style={{ color: item.accentColor }} className="text-[10px] font-black tracking-[2px] uppercase">
                        STEP {index + 1} OF {SLIDES.length}
                    </Text>
                </Animated.View>

                <Animated.Text style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }} className="text-[34px] text-black font-extrabold text-center mb-5 tracking-tight leading-[42px]">
                    {item.title}
                </Animated.Text>

                <Animated.Text style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }} className="text-[16px] text-black/60 font-medium text-center leading-[26px] px-2">
                    {item.description}
                </Animated.Text>
            </View>
        );
    };

    return (
        <LinearGradient colors={currentSlide.gradient} className="flex-1">
            <StatusBar barStyle="dark-content" />

            <View style={{ top: Math.max(top, 20) + 12 }} className="absolute left-6 z-10">
                <Image source={logoSource} style={{ width: 110, height: 28 }} resizeMode="contain" />
            </View>

            {!isLastSlide && (
                <TouchableOpacity 
                    style={{ top: Math.max(top, 20) + 10 }}
                    className="absolute right-6 z-10 px-5 py-2 rounded-full border border-black/5 bg-black/5" 
                    onPress={onComplete} 
                    activeOpacity={0.7}
                >
                    <Text className="text-black/80 text-[13px] font-bold tracking-widest uppercase">Skip</Text>
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
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    scrollEventThrottle={16}
                />
            </View>

            <View style={{ paddingBottom: Math.max(bottom, 20) + 10 }} className="px-8 pt-4 w-full items-center bg-transparent">
                <View className="flex-row items-center mb-10 gap-2.5">
                    {SLIDES.map((slide, index) => {
                        const dotWidth = scrollX.interpolate({
                            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                            outputRange: [8, 32, 8],
                            extrapolate: 'clamp',
                        });

                        const dotOpacity = scrollX.interpolate({
                            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={slide.id}
                                style={{ width: dotWidth, opacity: dotOpacity, backgroundColor: currentSlide.accentColor }}
                                className="h-2 rounded-full"
                            />
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={{ backgroundColor: currentSlide.accentColor }}
                    className="flex-row items-center justify-center w-full py-4 rounded-2xl gap-2 shadow-sm"
                    onPress={isLastSlide ? onComplete : handleNext}
                    activeOpacity={0.85}
                >
                    <Text className="text-[17px] font-bold text-white tracking-tight">
                        {isLastSlide ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons name={isLastSlide ? 'arrow-forward' : 'chevron-forward'} size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View className="h-4 mt-4 w-full items-center justify-center">
                    {isLastSlide && (
                        <TouchableOpacity onPress={onComplete} activeOpacity={0.7} className="py-2">
                            <Text className="text-black/50 text-sm font-semibold tracking-tight">Explore FlashFits →</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </LinearGradient>
    );
}
