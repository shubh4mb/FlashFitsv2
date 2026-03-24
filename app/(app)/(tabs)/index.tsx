import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import MainHeader from '@/components/layout/MainHeader';
import GenderHero from '@/components/sections/GenderHero';
import SubCategorySection from '@/components/sections/SubCategorySection';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import NewArrivalsSection from '@/components/sections/NewArrivalsSection';
import MerchantLogosSection from '@/components/sections/MerchantLogosSection';

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <View className="flex-1 bg-white">
      <MainHeader />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <SubCategorySection />
        <MerchantLogosSection />
        <NewArrivalsSection />
        <RecentlyViewedSection />
        {/* <GenderHero /> */}
        
        <View style={{ padding: 20 }}>
          <View className="my-6 items-center">
            <Text className="text-xl font-bold text-slate-900 mb-1">Welcome to FlashFits!</Text>
            <Text className="text-sm text-slate-500">Your premium fashion destination</Text>
          </View>

          <TouchableOpacity 
            className="mt-6 bg-slate-100 py-4 rounded-2xl items-center"
            onPress={() => signOut()}
          >
            <Text className="text-slate-900 text-base font-bold">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
