import { getReviewableItems, createReview } from "@/api/reviews";
import { GenderThemes, Typography } from "@/constants/theme";
import { useGender } from "@/context/GenderContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReviewableItem {
  orderId: string;
  targetId: string;
  targetType: "merchant" | "rider" | "product";
  name?: string;
  image?: string;
}

export default function RateOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ReviewableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Form State
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviewable();
  }, [orderId]);

  const fetchReviewable = async () => {
    try {
      setLoading(true);
      const res = await getReviewableItems();
      const reviewable = res.reviewable || [];
      // Filter by current order
      const currentOrderItems = reviewable.filter(
        (item: ReviewableItem) => item.orderId === orderId
      );
      setItems(currentOrderItems);
    } catch (error) {
      console.error("Error fetching reviewable items", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const currentItem = items[currentIndex];

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Wait", "Please provide a star rating.");
      return;
    }
    if (!currentItem) return;

    try {
      setSubmitting(true);
      await createReview({
        targetId: currentItem.targetId,
        targetType: currentItem.targetType,
        orderId: currentItem.orderId,
        rating,
        title,
        comment,
      }, images);

      // Reset form
      setRating(0);
      setTitle("");
      setComment("");
      setImages([]);

      if (currentIndex < items.length - 1) {
        // Move to next item
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Done rating all items
        Alert.alert("Success", "Thank you for your feedback!");
        router.back();
      }
    } catch (error: any) {
      console.error("Review Submit Error:", error?.response?.data || error);
      Alert.alert("Error", error?.response?.data?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.doneText}>You have already rated this order!</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary, marginTop: 20 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderStars = () => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={40}
              color={star <= rating ? "#FFC107" : "#E0E0E0"}
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Experience</Text>
        <Text style={styles.headerSubtitle}>
          {currentIndex + 1} of {items.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.itemHeader}>
          {currentItem.targetType === "product" ? (
            <Ionicons name="shirt-outline" size={32} color={theme.primary} />
          ) : currentItem.targetType === "merchant" ? (
            <Ionicons name="storefront-outline" size={32} color={theme.primary} />
          ) : (
            <Ionicons name="bicycle-outline" size={32} color={theme.primary} />
          )}
          <Text style={styles.itemType}>
            Rate the {currentItem.targetType.charAt(0).toUpperCase() + currentItem.targetType.slice(1)}
          </Text>
          {currentItem.name && <Text style={styles.itemName}>{currentItem.name}</Text>}
        </View>

        <View style={styles.formContainer}>
          {renderStars()}

          <Text style={styles.label}>Review Title (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Sum up your experience"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Detailed Feedback (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us more about it..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />

          <View style={styles.photoSection}>
            <Text style={styles.label}>Add Photos (Max 3)</Text>
            <View style={styles.photoRow}>
              {images.map((uri, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 3 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={28} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {currentIndex < items.length - 1 ? "Submit & Next" : "Submit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  doneText: { fontSize: 18, fontFamily: Typography.fontFamily.semiBold, color: "#1F2937" },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: "#fff", fontFamily: Typography.fontFamily.semiBold },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: "#111827" },
  headerSubtitle: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: "#6B7280" },
  scroll: { flexGrow: 1, padding: 20 },
  itemHeader: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  itemType: { fontSize: 20, fontFamily: Typography.fontFamily.bold, color: "#111827", marginTop: 10 },
  itemName: { fontSize: 15, fontFamily: Typography.fontFamily.medium, color: "#6B7280", marginTop: 4, textAlign: "center" },
  formContainer: {},
  starsRow: { flexDirection: "row", justifyContent: "center", marginBottom: 30, gap: 10 },
  starIcon: { marginHorizontal: 4 },
  label: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
    color: "#111827",
    marginBottom: 20,
  },
  textArea: { height: 100 },
  photoSection: { marginBottom: 20 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoContainer: { position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 12 },
  removePhoto: { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 12 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontFamily: Typography.fontFamily.bold },
});
