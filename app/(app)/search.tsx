import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Keyboard,
  Text,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { fetchFilteredProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard';
import { useGender } from '@/context/GenderContext';
import { GenderThemes } from '@/constants/Theme';
import { ThemedText } from '@/components/common/themed-text';
import { BlurView } from 'expo-blur';

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
        setResults(response.products || []);
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

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.recentItem}
      onPress={() => handleSearch(item)}
    >
      <Ionicons name="time-outline" size={18} color="#94A3B8" />
      <Text style={styles.recentText}>{item}</Text>
      <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
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
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Searching for "{query}"...</Text>
        </View>
      ) : query.length === 0 ? (
        <View style={styles.content}>
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
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearch}
                keyExtractor={item => item}
                scrollEnabled={false}
              />
            </View>
          )}

          <View style={[styles.section, { marginTop: 24 }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Popular Searches</ThemedText>
            <View style={styles.tagGrid}>
              {POPULAR_TAGS.map(tag => (
                <TouchableOpacity 
                  key={tag} 
                  style={[styles.tag, { borderColor: '#E2E8F0' }]}
                  onPress={() => {
                    handleSearch(tag);
                    saveSearch(tag);
                  }}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={({ item }) => <ProductCard product={item} containerStyle={styles.cardContainer} />}
          keyExtractor={item => `${item._id}-${item.variantId}`}
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
          <ThemedText type="subtitle">No results found</ThemedText>
          <Text style={styles.emptyText}>
            We couldn't find anything for "{query}". Try searching for something else.
          </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  clearAllText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  resultsList: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
