import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Keyboard,
  Text,
  SafeAreaView,
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import Loader from '@/components/common/Loader';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { fetchFilteredProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/common/themed-text';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';

const { width } = Dimensions.get('window');
const RECENT_SEARCHES_KEY = '@flashfits_recent_searches';
const POPULAR_TAGS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets', 'Perfumes', 'Belts'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const inputRef = useRef<TextInput>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    loadRecentSearches();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load recent searches');
    }
  };

  const saveSearch = async (term: string) => {
    if (!term.trim()) return;
    const newSearches = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(newSearches);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!text.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetchFilteredProducts({ search: text });
        setResults(response.products || response.data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const onSearchSubmit = () => {
    if (query.trim()) {
      saveSearch(query.trim());
      Keyboard.dismiss();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };


  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.primary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search products, brands..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={handleSearch}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Loader size={60} />
          <Text style={styles.loadingText}>Searching for "{query}"...</Text>
        </View>
      ) : query.length === 0 ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Searches</ThemedText>
                <TouchableOpacity onPress={() => {
                  setRecentSearches([]);
                  AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                }}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagScrollContent}
                style={styles.tagScrollView}
              >
                {recentSearches.map((item) => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.tag, { backgroundColor: '#F1F5F9' }]}
                    onPress={() => handleSearch(item)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.tagText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <RecentlyViewedSection />

          <View style={[styles.section, { marginTop: 24 }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Popular Searches</ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagScrollContent}
              style={styles.tagScrollView}
            >
              {POPULAR_TAGS.map(tag => (
                <TouchableOpacity 
                  key={tag} 
                  style={[styles.tag, { backgroundColor: '#F8FAFC' }]}
                  onPress={() => {
                    handleSearch(tag);
                    saveSearch(tag);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.trendingBanner}>
             <LinearGradient
               colors={['#F8FAFC', '#F1F5F9']}
               style={styles.bannerContent}
             >
               <View>
                 <Text style={styles.bannerLabel}>TRENDING NOW</Text>
                 <Text style={styles.bannerTitle}>Summer Essentials</Text>
               </View>
               <Ionicons name="flash" size={24} color={theme.primary} />
             </LinearGradient>
          </View>
        </ScrollView>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={({ item }) => <ProductCard product={item} containerStyle={styles.cardContainer} />}
          keyExtractor={(item, index) => `${item._id || index}-${item.variantId || index}`}
          numColumns={2}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.centered}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
            <Ionicons name="search-outline" size={60} color={theme.primary} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>No results found</ThemedText>
          <Text style={styles.emptyText}>
            We couldn't find anything for "{query}". Try searching for categories like "Shoes" or "Jackets".
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={clearSearch}
          >
            <Text style={styles.retryButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.medium,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 15,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.serifBold,
    color: '#0F172A',
  },
  clearAllText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: Typography.fontFamily.bold,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  recentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    fontFamily: Typography.fontFamily.medium,
  },
  tagScrollView: {
    marginHorizontal: -20,
    marginTop: 12,
  },
  tagScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tag: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  trendingBanner: {
    marginTop: 40,
    marginBottom: 40,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
  },
  bannerLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.serifBold,
    color: '#0F172A',
  },
  resultsList: {
    padding: 16,
    paddingTop: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 16,
  },
  cardContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
    marginRight: 0,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.serifBold,
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    fontFamily: Typography.fontFamily.medium,
  },
  retryButton: {
    marginTop: 30,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
});
