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
} from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        icon: 'bag-handle-outline',
        title: 'Order Your Style',
        description:
            'Browse & order multiple styles and sizes — no upfront product cost, just a small delivery fee.',
        gradient: ['#0F0F0F', '#1A1A2E'] as const,
        accentColor: '#00F5A0',
    },
    {
        id: '2',
        icon: 'shirt-outline',
        title: 'Try at Home',
        description:
            'A rider delivers your picks in ~60 minutes. Try everything on in the comfort of your home.',
        gradient: ['#0F0F0F', '#1E1B2E'] as const,
        accentColor: '#00D4FF',
    },
    {
        id: '3',
        icon: 'heart-outline',
        title: 'Keep What You Love',
        description:
            "Love it? Keep it and pay only for what you want. Discounts auto-applied.",
        gradient: ['#0F0F0F', '#2E1A24'] as const,
        accentColor: '#FF6B9D',
    },
    {
        id: '4',
        icon: 'refresh-circle-outline',
        title: 'Return the Rest',
        description:
            "Don't love it? Hand it back to the rider instantly — zero hassle, zero cost.",
        gradient: ['#0F0F0F', '#1A2E1F'] as const,
        accentColor: '#00F5A0',
    },
];

interface OnboardingSwiperProps {
    onComplete: () => void;
}

export default function OnboardingSwiper({ onComplete }: OnboardingSwiperProps) {
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);

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
            <View style={{ width }} className="items-center justify-center px-8 pb-[120px]">
                <Animated.View
                    style={{ transform: [{ scale: iconScaleInterp }], opacity: iconOpacity }}
                    className="mb-10"
                >
                    <View style={{ backgroundColor: item.accentColor + '15' }} className="w-[180px] h-[180px] rounded-full items-center justify-center">
                        <View style={{ backgroundColor: item.accentColor + '25' }} className="w-[140px] h-[140px] rounded-full items-center justify-center">
                            <Ionicons name={item.icon as any} size={72} color={item.accentColor} />
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={{ opacity: textOpacity, backgroundColor: item.accentColor + '20' }} className="px-3.5 py-1.5 rounded-xl mb-5">
                    <Text style={{ color: item.accentColor }} className="text-[11px] font-bold tracking-[1.5px]">
                        STEP {index + 1} OF {SLIDES.length}
                    </Text>
                </Animated.View>

                <Animated.Text style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }} className="text-4xl text-white font-bold text-center mb-4 leading-[40px]">
                    {item.title}
                </Animated.Text>

                <Animated.Text style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }} className="text-base text-white/60 font-medium text-center leading-6 max-w-[300px]">
                    {item.description}
                </Animated.Text>
            </View>
        );
    };

    return (
        <LinearGradient colors={currentSlide.gradient} className="flex-1">
            <StatusBar barStyle="light-content" />

            {!isLastSlide && (
                <TouchableOpacity 
                    className="absolute top-14 right-6 z-10 px-4 py-2 rounded-full border border-white/20 bg-white/10" 
                    onPress={onComplete} 
                    activeOpacity={0.7}
                >
                    <Text className="text-white/70 text-sm tracking-widest">Skip</Text>
                </TouchableOpacity>
            )}

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

            <View className="absolute bottom-0 left-0 right-0 pb-12 px-8 items-center">
                <View className="flex-row items-center mb-8 gap-2">
                    {SLIDES.map((slide, index) => {
                        const dotWidth = scrollX.interpolate({
                            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                            outputRange: [8, 28, 8],
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
                    className="flex-row items-center justify-center w-full py-4 rounded-2xl gap-2"
                    onPress={isLastSlide ? onComplete : handleNext}
                    activeOpacity={0.85}
                >
                    <Text className="text-[17px] font-bold text-black tracking-tight">
                        {isLastSlide ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons name={isLastSlide ? 'arrow-forward' : 'chevron-forward'} size={22} color="#0F0F0F" />
                </TouchableOpacity>

                {isLastSlide && (
                    <TouchableOpacity className="mt-4 py-2" onPress={onComplete} activeOpacity={0.7}>
                        <Text className="text-white/50 text-sm font-medium tracking-tight">Explore FlashFits →</Text>
                    </TouchableOpacity>
                )}
            </View>
        </LinearGradient>
    );
}
