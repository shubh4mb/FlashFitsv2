import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Keyboard,
  Text,
  Dimensions,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/common/themed-text';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import { fetchSearchSuggestions } from '@/api/products';

const RECENT_SEARCHES_KEY = '@flashfits_recent_searches';
const POPULAR_TAGS = ['Sneakers', 'Jeans', 'Summer Wear', 'Accessories', 'T-Shirts', 'Jackets', 'Perfumes', 'Belts'];
const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ text: string; type: string; id?: string; city?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();
  
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<any>(null);

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

  const handleSearchNavigation = (term: string, merchantId?: string) => {
    if (!term.trim()) return;
    saveSearch(term.trim());
    setShowSuggestions(false);
    setSuggestions([]);
    
    // If it's a merchant suggestion, clear the query so we show all their products
    // and don't conflict with the merchant filter logic.
    const params: any = { 
        query: merchantId ? '' : term.trim(),
        title: merchantId ? term.trim() : undefined,
        merchantId: merchantId || undefined
    };

    router.push({
      pathname: '/(app)/search-results',
      params
    } as any);
  };

  const onSearchSubmit = () => {
    handleSearchNavigation(query);
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Debounced suggestions fetch
  const handleTextChange = (text: string) => {
    setQuery(text);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetchSearchSuggestions(text.trim());
        setSuggestions(res.suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Suggestion error:', error);
      }
    }, DEBOUNCE_MS);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return 'pricetag-outline';
      case 'brand': return 'diamond-outline';
      case 'category': return 'grid-outline';
      case 'merchant': return 'storefront-outline';
      default: return 'search-outline';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Search Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
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
            onChangeText={handleTextChange}
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

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.text}-${index}`}
              style={styles.suggestionItem}
              onPress={() => handleSearchNavigation(item.text, item.id)}
            >
              <Ionicons 
                name={getTypeIcon(item.type) as any} 
                size={16} 
                color="#94A3B8" 
                style={{ marginRight: 12 }} 
              />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.suggestionText} numberOfLines={1}>{item.text}</Text>
                {item.city && (
                  <Text style={[styles.suggestionCity, { color: '#94A3B8' }]}>
                    {` (${item.city})`}
                  </Text>
                )}
              </View>
              <View style={[styles.suggestionBadge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.suggestionBadgeText, { color: theme.primary }]}>
                  {item.type === 'merchant' ? 'shop' : item.type}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
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
                    onPress={() => handleSearchNavigation(item)}
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
                  onPress={() => handleSearchNavigation(tag)}
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
      )}
    </View>
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
  suggestionsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  suggestionText: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.medium,
  },
  suggestionCity: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    marginLeft: 2,
  },
  suggestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  suggestionBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
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
});
