// Skeleton Loader Component for smooth loading states
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import { COLORS } from '../utils/constants';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton patterns
export function MatchCardSkeleton() {
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchCardHeader}>
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={80} height={20} />
      </View>
      <View style={styles.matchCardBody}>
        <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={16} />
      </View>
      <View style={styles.matchCardFooter}>
        <Skeleton width={100} height={32} borderRadius={16} />
        <Skeleton width={80} height={24} />
      </View>
    </View>
  );
}

export function RatingCardSkeleton() {
  return (
    <View style={styles.ratingCard}>
      <Skeleton width={48} height={48} borderRadius={24} style={{ marginBottom: 8 }} />
      <Skeleton width={60} height={14} style={{ marginBottom: 4 }} />
      <Skeleton width={50} height={28} style={{ marginBottom: 4 }} />
      <Skeleton width={40} height={12} />
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profileSkeleton}>
      <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 16 }} />
      <Skeleton width={150} height={24} style={{ marginBottom: 8 }} />
      <Skeleton width={200} height={16} style={{ marginBottom: 24 }} />
      <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={80} borderRadius={12} />
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <MatchCardSkeleton key={index} />
      ))}
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.dashboardSkeleton}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <Skeleton width="30%" height={80} borderRadius={12} />
        <Skeleton width="30%" height={80} borderRadius={12} />
        <Skeleton width="30%" height={80} borderRadius={12} />
      </View>
      {/* Chart area */}
      <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 16 }} />
      {/* List items */}
      <Skeleton width="100%" height={60} borderRadius={12} style={{ marginTop: 16 }} />
      <Skeleton width="100%" height={60} borderRadius={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.surface,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchCardBody: {
    marginBottom: 12,
  },
  matchCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  profileSkeleton: {
    alignItems: 'center',
    padding: 16,
  },
  dashboardSkeleton: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
