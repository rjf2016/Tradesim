import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';

type Percent = `${number}%`;

interface SkeletonProps {
  width?: number | 'auto' | Percent;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

// Pre-built skeleton patterns for common UI elements
export function SkeletonStockRow() {
  return (
    <View style={styles.stockRow}>
      <View style={styles.stockRowLeft}>
        <Skeleton width={60} height={20} />
        <Skeleton width={120} height={14} style={styles.mt} />
      </View>
      <View style={styles.stockRowRight}>
        <Skeleton width={70} height={18} />
        <Skeleton width={50} height={14} style={styles.mt} />
      </View>
    </View>
  );
}

export function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SkeletonPortfolio() {
  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <SkeletonCard>
        <Skeleton width={140} height={14} />
        <Skeleton width={180} height={36} style={styles.mtLg} />
        <Skeleton width={120} height={16} style={styles.mt} />
      </SkeletonCard>

      {/* Buying Power Section */}
      <View style={styles.section}>
        <Skeleton width={100} height={18} />
        <SkeletonCard>
          <Skeleton width={140} height={24} />
          <Skeleton width={100} height={14} style={styles.mt} />
        </SkeletonCard>
      </View>

      {/* Holdings Section */}
      <View style={styles.section}>
        <Skeleton width={80} height={18} />
        <SkeletonStockRow />
        <SkeletonStockRow />
      </View>
    </View>
  );
}

export function SkeletonStockList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStockRow key={i} />
      ))}
    </View>
  );
}

export function SkeletonStockDetail() {
  return (
    <View style={styles.stockDetailContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Skeleton width={80} height={32} />
          <Skeleton width={150} height={16} style={styles.mt} />
        </View>
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>

      {/* Price */}
      <View style={styles.section}>
        <Skeleton width={160} height={42} />
        <Skeleton width={120} height={18} style={styles.mt} />
      </View>

      {/* Chart placeholder */}
      <Skeleton width="100%" height={200} borderRadius={borderRadius.lg} />

      {/* Trade Section */}
      <SkeletonCard>
        <Skeleton width="100%" height={48} borderRadius={borderRadius.md} />
        <View style={styles.mtLg}>
          <Skeleton width={50} height={14} />
          <Skeleton
            width="100%"
            height={56}
            borderRadius={borderRadius.md}
            style={styles.mt}
          />
        </View>
        <View style={styles.row}>
          <Skeleton width={100} height={14} />
          <Skeleton width={80} height={20} />
        </View>
        <Skeleton
          width="100%"
          height={52}
          borderRadius={borderRadius.lg}
          style={styles.mtLg}
        />
      </SkeletonCard>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.backgroundMuted,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  stockDetailContainer: {
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stockRow: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockRowLeft: {
    gap: spacing.xs,
  },
  stockRowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  mt: {
    marginTop: spacing.sm,
  },
  mtLg: {
    marginTop: spacing.lg,
  },
});
