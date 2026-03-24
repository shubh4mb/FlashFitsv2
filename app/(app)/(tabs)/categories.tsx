import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { Image } from 'expo-image';
import { useGender } from '@/context/GenderContext';
import { fetchCategories } from '@/api/categories';
import MainHeader from '@/components/layout/MainHeader';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { GenderThemes } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.25;

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  allowedGenders: string[];
  allowedGender?: string[];
  logo?: { url: string };
  logos?: {
    MEN?: { url: string };
    WOMEN?: { url: string };
    KIDS?: { url: string };
  };
  image?: { url: string };
}

export default function CategoriesScreen() {
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchCategories();
      console.log('Categories API response:', response);
      
      // AxiosConfig unwraps the response data if success=true, 
      // so response is expected to be { categories: [...] }
      const categoriesList = response?.categories || response?.data?.categories || [];
      setAllCategories(categoriesList);

      const backendGender = selectedGender.toUpperCase();
      const initialMain = categoriesList.find(
        (c: Category) => c.level === 0 && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
      );
      if (initialMain) {
        setSelectedMainId(initialMain._id);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter main categories based on gender
  const mainCategories = useMemo(() => {
    const backendGender = selectedGender.toUpperCase();
    return allCategories.filter(
      c => c.level === 0 && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
    );
  }, [allCategories, selectedGender]);

  // Filter subcategories based on parent and gender
  const subCategories = useMemo(() => {
    if (!selectedMainId) return [];
    const backendGender = selectedGender.toUpperCase();
    return allCategories.filter(
      c => c.parentId === selectedMainId && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
    );
  }, [allCategories, selectedMainId, selectedGender]);

  // Auto-update selection if gender changes and current selection is no longer valid
  useEffect(() => {
    const isCurrentValid = mainCategories.some(c => c._id === selectedMainId);
    if (!isCurrentValid && mainCategories.length > 0) {
      setSelectedMainId(mainCategories[0]._id);
    }
  }, [selectedGender, mainCategories]);

  const handleSidebarPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMainId(id);
  };

  const getLogoUrl = (item: Category) => {
    const backendGender = selectedGender.toUpperCase() as keyof NonNullable<Category['logos']>;
    // Priority: Gender-specific logo > Default logo > Image
    return item.logos?.[backendGender]?.url || item.logo?.url || item.image?.url;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MainHeader hideCategories={true} />
      
      <View style={styles.contentContainer}>
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {mainCategories.map((cat) => {
              const isActive = selectedMainId === cat._id;
              return (
                <TouchableOpacity
                  key={cat._id}
                  style={[
                    styles.sidebarItem,
                    isActive && { backgroundColor: '#FFFFFF', borderLeftColor: theme.primary, borderLeftWidth: 4 }
                  ]}
                  onPress={() => handleSidebarPress(cat._id)}
                >
                  <View style={[styles.sidebarIconContainer, isActive && styles.activeIconContainer]}>
                    <Image
                      source={{ uri: getLogoUrl(cat) }}
                      style={styles.sidebarIcon}
                      contentFit="contain"
                    />
                  </View>
                  <Text 
                    style={[
                      styles.sidebarText, 
                      isActive && { color: theme.primary, fontWeight: '700' }
                    ]}
                    numberOfLines={2}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Right Content */}
        <View style={styles.mainArea}>
          <ScrollView 
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {mainCategories.find(c => c._id === selectedMainId)?.name || 'Categories'}
              </ThemedText>
            </View>

            <View style={styles.grid}>
              {subCategories.length > 0 ? (
                subCategories.map((sub) => (
                  <TouchableOpacity 
                    key={sub._id} 
                    style={styles.subCategoryCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.subIconContainer}>
                      <Image
                        source={{ uri: getLogoUrl(sub) }}
                        style={styles.subIcon}
                        contentFit="contain"
                      />
                    </View>
                    <Text style={styles.subText} numberOfLines={2}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No subcategories found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  sidebarIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Soft shadow for transparent PNGs
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeIconContainer: {
    backgroundColor: '#F1F5F9',
  },
  sidebarIcon: {
    width: 30,
    height: 30,
  },
  sidebarText: {
    fontSize: 11,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '500',
  },
  mainArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 100, // Extra space for tabs
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subCategoryCard: {
    width: (width - SIDEBAR_WIDTH - 32 - 24) / 3, // 3 column grid
    alignItems: 'center',
    marginBottom: 16,
  },
  subIconContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Floating effect for transparent PNGs
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  subIcon: {
    width: '70%',
    height: '70%',
  },
  subText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#334155',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  }
});
