import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getReferralStats } from '@/api/auth';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';

export default function ReferAndEarnScreen() {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const showAlert = useAlert();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ referralCode: string; referredUsersCount: number } | null>(
    null
  );

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response: any = await getReferralStats();
      if (response?.referralCode) {
        setStats(response);
      } else if (response?.data?.referralCode) {
        setStats(response.data);
      } else if (response?.data) {
        setStats(response.data);
      } else if (response) {
        setStats(response);
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
      showAlert({
        title: 'Error',
        message: 'Could not load your referral details. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (stats?.referralCode) {
      await Clipboard.setStringAsync(stats.referralCode);
      showAlert({
        title: 'Copied!',
        message: 'Referral code copied to clipboard.',
        type: 'success',
      });
    }
  };

  const handleShare = async () => {
    if (stats?.referralCode) {
      try {
        await Share.share({
          message: `Hey! Try FlashFits for 15-minute fashion delivery. Use my referral code ${stats.referralCode} during signup to get FREE DELIVERY on your first order! 🛍️ Download here: https://flashfits.com/app`,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background + '08' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.primary + '10' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Refer & Earn</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.illustrationBox}>
            <Ionicons name="gift" size={80} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.primary }]}>Invite Friends</Text>
          <Text style={styles.subtitle}>
            Share your code with friends. They get Free Delivery on their first order, and you get a Free Delivery coupon when their first order is delivered!
          </Text>

          {/* Code Box */}
          <View style={[styles.codeBox, { borderColor: theme.primary + '30', shadowColor: theme.primary }]}>
            <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
            <Text style={[styles.code, { color: theme.primary }]}>{stats?.referralCode || 'N/A'}</Text>
            
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={20} color={theme.primary} />
              <Text style={[styles.copyTxt, { color: theme.primary }]}>Tap to Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.8}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareBtnTxt}>Share Code</Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={[styles.statsBox, { borderColor: theme.primary + '15' }]}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.referredUsersCount || 0}</Text>
              <Text style={styles.statLabel}>Friends Joined</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  illustrationBox: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.extraBold,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  codeBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  codeLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#94a3b8',
    letterSpacing: 2,
    marginBottom: 12,
  },
  code: {
    fontSize: 32,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 4,
    marginBottom: 20,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  copyTxt: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  shareBtnTxt: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  statsBox: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748b',
  },
});
