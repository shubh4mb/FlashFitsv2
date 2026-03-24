import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useGender } from '../../context/GenderContext';
import { GenderThemes } from '../../constants/Theme';
import { fetchBanners } from '../../api/products';

const { width } = Dimensions.get('window');

const GenderHero = () => {
    const { selectedGender } = useGender();
    const [banners, setBanners] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const theme = GenderThemes[selectedGender] || GenderThemes.Men;

    useEffect(() => {
        const loadBanners = async () => {
            try {
                const data = await fetchBanners();
                setBanners(data?.banners || data || {});
            } catch (error) {
                console.error('Failed to fetch banners:', error);
            } finally {
                setLoading(false);
            }
        };
        loadBanners();
    }, []);

    const currentBanner = useMemo(() => {
        if (!banners) return null;
        const genderKey = selectedGender.toLowerCase();
        // Look for a banner that matches the gender, or use a default one
        const genderBanners = banners[`${genderKey}_banner`] || banners['hero_banner'] || Object.values(banners)[0];
        return Array.isArray(genderBanners) ? genderBanners[0] : genderBanners;
    }, [banners, selectedGender]);

    if (loading) {
        return (
            <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={theme.primary} />
            </View>
        );
    }

    return (
        <Animated.View 
            entering={FadeInUp.duration(600)}
            style={{ margin: 16, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }}
        >
            <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent']}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', zIndex: 1 }}
            />
            
            <Image
                source={currentBanner?.imageUrl || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80'}
                style={{ width: '100%', height: 240 }}
                contentFit="cover"
                transition={400}
            />

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, zIndex: 2 }}>
                <Animated.View entering={FadeInRight.delay(300).duration(500)}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4, opacity: 0.9 }}>
                        New Collection
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 12, lineHeight: 32 }}>
                        Style for {selectedGender}
                    </Text>
                </Animated.View>

                <TouchableOpacity 
                    activeOpacity={0.8}
                    style={{ backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}
                >
                    <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '800' }}>
                        Shop Now
                    </Text>
                </TouchableOpacity>
            </View>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', zIndex: 0 }}
            />
        </Animated.View>
    );
};

export default GenderHero;
