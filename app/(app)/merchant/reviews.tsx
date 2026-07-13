import { getReviews } from '@/api/reviews';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MerchantReviewsScreen() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchReviewsData = async (pageNum = 1) => {
    if (!merchantId) return;
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await getReviews('merchant', merchantId, pageNum);
      const newReviews = res.reviews || [];
      
      if (pageNum === 1) {
        setReviews(newReviews);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }

      setHasMore(pageNum < res.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch merchant reviews:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReviewsData(1);
  }, [merchantId]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReviewsData(page + 1);
    }
  };

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color="#94A3B8" />
          </View>
          <Text style={styles.reviewerName}>{item.userId?.name || 'Customer'}</Text>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating ? 'star' : 'star-outline'}
              size={14}
              color="#F59E0B"
            />
          ))}
        </View>
      </View>
      
      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
      
      {item.images && item.images.length > 0 && (
        <View style={styles.imageGallery}>
          {item.images.map((img: string, i: number) => (
            <Image key={i} source={{ uri: img }} style={styles.reviewImage} />
          ))}
        </View>
      )}
      
      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySub}>This store doesn't have any reviews right now.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color={theme.primary} style={{ margin: 20 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stars: {
    flexDirection: 'row',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
    lineHeight: 20,
  },
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
  },
});
