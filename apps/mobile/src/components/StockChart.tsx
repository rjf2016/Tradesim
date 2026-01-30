import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
} from 'react-native-svg';
import { colors, spacing, borderRadius } from '@/theme';
import { formatCurrency } from '@/utils/format';

// Neutral color for scrubbing (Apple-style blue)
const SCRUB_COLOR = '#007AFF';

export type TimePeriod = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface DataPoint {
  date: string;
  price: number;
}

interface StockChartProps {
  data: DataPoint[];
  currentPrice: number;
  previousClose?: number;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  height?: number;
}

const TIME_PERIODS: TimePeriod[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];

// Attempt to get screen width, fallback for SSR/web
const getScreenWidth = () => {
  try {
    return Dimensions.get('window').width;
  } catch {
    return 400;
  }
};

export function StockChart({
  data,
  currentPrice,
  previousClose,
  selectedPeriod,
  onPeriodChange,
  onScrubStart,
  onScrubEnd,
  height = 200,
}: StockChartProps) {
  const [containerWidth, setContainerWidth] = useState(getScreenWidth() - 32);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  }, []);

  // Calculate chart metrics - compare start of period to end for color
  const chartMetrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 100,
        priceRange: 100,
        startPrice: currentPrice,
        endPrice: currentPrice,
        isPositive: true,
      };
    }

    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const startPrice = data[0].price;
    const endPrice = data[data.length - 1].price;

    // For color: compare end of period to start of period (not previousClose)
    const isPositive = endPrice >= startPrice;

    return {
      minPrice,
      maxPrice,
      priceRange,
      startPrice,
      endPrice,
      isPositive,
    };
  }, [data, currentPrice]);

  // Generate SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (!data || data.length < 2) {
      return { linePath: '', areaPath: '' };
    }

    const padding = { top: 20, bottom: 20 };
    const chartHeight = height - padding.top - padding.bottom;
    const { minPrice, priceRange } = chartMetrics;

    // Map data points to coordinates
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * containerWidth;
      const y =
        padding.top +
        chartHeight -
        ((point.price - minPrice) / priceRange) * chartHeight;
      return { x, y };
    });

    // Create smooth bezier curve path
    let linePath = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const tension = 0.3;
      let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

      if (i === 1) {
        cp1x = prev.x + (curr.x - prev.x) * tension;
        cp1y = prev.y + (curr.y - prev.y) * tension;
      } else {
        const prevPrev = points[i - 2];
        cp1x = prev.x + (curr.x - prevPrev.x) * tension;
        cp1y = prev.y + (curr.y - prevPrev.y) * tension;
      }

      if (!next) {
        cp2x = curr.x - (curr.x - prev.x) * tension;
        cp2y = curr.y - (curr.y - prev.y) * tension;
      } else {
        cp2x = curr.x - (next.x - prev.x) * tension;
        cp2y = curr.y - (next.y - prev.y) * tension;
      }

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    const areaPath =
      linePath +
      ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { linePath, areaPath };
  }, [data, containerWidth, height, chartMetrics]);

  // Get touch index from X position
  const getTouchIndex = useCallback(
    (x: number): number => {
      if (!data || data.length === 0) return 0;
      const index = Math.round((x / containerWidth) * (data.length - 1));
      return Math.max(0, Math.min(index, data.length - 1));
    },
    [data, containerWidth],
  );

  // Current touch index
  const touchIndex = useMemo(() => {
    if (touchX === null || !data || data.length === 0) return null;
    return getTouchIndex(touchX);
  }, [touchX, data, getTouchIndex]);

  // Calculate Y position for indicator
  const getYForIndex = useCallback(
    (index: number) => {
      if (!data || data.length === 0) return height / 2;

      const padding = { top: 20, bottom: 20 };
      const chartHeight = height - padding.top - padding.bottom;
      const { minPrice, priceRange } = chartMetrics;
      const price = data[index].price;

      return (
        padding.top +
        chartHeight -
        ((price - minPrice) / priceRange) * chartHeight
      );
    },
    [data, height, chartMetrics],
  );

  // Pan gesture for scrubbing - activates immediately and blocks other gestures
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          setIsTouching(true);
          setTouchX(event.x);
          onScrubStart?.();
        })
        .onUpdate((event) => {
          setTouchX(event.x);
        })
        .onFinalize(() => {
          setIsTouching(false);
          setTouchX(null);
          onScrubEnd?.();
        })
        .minDistance(0)
        .activeOffsetX([-5, 5]) // Activate with minimal horizontal movement
        .failOffsetY([-1000, 1000]) // Never fail due to vertical movement
        .hitSlop({ top: 10, bottom: 10, left: 0, right: 0 }),
    [onScrubStart, onScrubEnd],
  );

  // Displayed price and change when scrubbing
  const displayedData = useMemo(() => {
    const startPrice = data?.[0]?.price ?? currentPrice;

    if (isTouching && touchIndex !== null && data && data[touchIndex]) {
      const touchedPoint = data[touchIndex];
      const change = touchedPoint.price - startPrice;
      const changePercent = startPrice ? (change / startPrice) * 100 : 0;

      return {
        price: touchedPoint.price,
        change,
        changePercent,
        date: touchedPoint.date,
        isPositive: change >= 0,
      };
    }

    const change = currentPrice - startPrice;
    const changePercent = startPrice ? (change / startPrice) * 100 : 0;

    return {
      price: currentPrice,
      change,
      changePercent,
      date: null,
      isPositive: change >= 0,
    };
  }, [isTouching, touchIndex, data, currentPrice]);

  // Use neutral blue while scrubbing, otherwise green/red based on performance
  const chartColor = isTouching
    ? SCRUB_COLOR
    : chartMetrics.isPositive
      ? colors.success
      : colors.error;

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (selectedPeriod === '1D') {
      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year:
        selectedPeriod === 'ALL' || selectedPeriod === '1Y'
          ? 'numeric'
          : undefined,
    });
  };

  return (
    <View style={styles.container}>
      {/* Price Display */}
      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatCurrency(displayedData.price)}</Text>
        <View style={styles.changeRow}>
          <Text
            style={[
              styles.change,
              displayedData.isPositive ? styles.positive : styles.negative,
            ]}
          >
            {displayedData.isPositive ? '+' : ''}
            {formatCurrency(displayedData.change)} (
            {displayedData.isPositive ? '+' : ''}
            {displayedData.changePercent.toFixed(2)}%)
          </Text>
          {displayedData.date && (
            <Text style={styles.dateLabel}>
              {formatDisplayDate(displayedData.date)}
            </Text>
          )}
        </View>
      </View>

      {/* Chart */}
      <GestureDetector gesture={panGesture}>
        <View style={[styles.chartContainer, { height }]} onLayout={onLayout}>
          {data && data.length > 1 && (
            <Svg width={containerWidth} height={height}>
              <Defs>
                <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                  <Stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {/* Area fill */}
              <Path d={areaPath} fill="url(#gradient)" />

              {/* Line */}
              <Path
                d={linePath}
                stroke={chartColor}
                strokeWidth={2}
                fill="none"
              />

              {/* Touch indicator */}
              {isTouching && touchIndex !== null && (
                <>
                  <Line
                    x1={(touchIndex / (data.length - 1)) * containerWidth}
                    y1={0}
                    x2={(touchIndex / (data.length - 1)) * containerWidth}
                    y2={height}
                    stroke={colors.textSecondary}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  <Circle
                    cx={(touchIndex / (data.length - 1)) * containerWidth}
                    cy={getYForIndex(touchIndex)}
                    r={6}
                    fill={chartColor}
                    stroke={colors.background}
                    strokeWidth={2}
                  />
                </>
              )}
            </Svg>
          )}

          {/* Empty state */}
          {(!data || data.length < 2) && (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No chart data available</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {TIME_PERIODS.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && [
                styles.periodButtonActive,
                { backgroundColor: chartColor },
              ],
            ]}
            onPress={() => onPeriodChange(period)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period && styles.periodTextActive,
              ]}
            >
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  priceContainer: {
    marginBottom: spacing.md,
  },
  price: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  change: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  chartContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  emptyChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: colors.success,
  },
  periodText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  periodTextActive: {
    color: colors.background,
  },
});
