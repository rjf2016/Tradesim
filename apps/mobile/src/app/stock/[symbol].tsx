import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { formatCurrency } from '@/utils/format';
import {
  Container,
  Card,
  Button,
  Input,
  SkeletonStockDetail,
  StockChart,
  TimePeriod,
} from '@/components';
import { colors, spacing, borderRadius } from '@/theme';

type TradeType = 'buy' | 'sell';

// Filter data based on selected time period
function filterDataByPeriod(
  data: Array<{ date: string; price: number }>,
  period: TimePeriod,
): Array<{ date: string; price: number }> {
  if (!data || data.length === 0) return [];

  const now = new Date();
  let cutoffDate: Date;

  switch (period) {
    case '1D':
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '1W':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1M':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3M':
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6M':
      cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1Y':
      cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'ALL':
    default:
      return data;
  }

  const filtered = data.filter((point) => new Date(point.date) >= cutoffDate);

  // If we have very few points after filtering, return more data for a better chart
  if (filtered.length < 5 && data.length >= 5) {
    return data.slice(-Math.min(30, data.length));
  }

  return filtered.length > 0 ? filtered : data;
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [quantity, setQuantity] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [isChartScrubbing, setIsChartScrubbing] = useState(false);

  // Disable modal gesture while scrubbing the chart
  const handleScrubStart = useCallback(() => {
    setIsChartScrubbing(true);
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  const handleScrubEnd = useCallback(() => {
    setIsChartScrubbing(false);
    navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(0);
  const [tradeSectionLayout, setTradeSectionLayout] = useState<{
    y: number;
    height: number;
  } | null>(null);
  const [isQuantityFocused, setIsQuantityFocused] = useState(false);

  const scrollTradeSectionFullyIntoView = (kbHeight?: number) => {
    if (!tradeSectionLayout || scrollViewHeight <= 0) return;

    const padding = spacing.lg;
    const effectiveKeyboardHeight = kbHeight ?? keyboardHeightRef.current;
    const visibleHeight = Math.max(
      0,
      scrollViewHeight - effectiveKeyboardHeight,
    );
    if (visibleHeight <= 0) return;

    const tradeSectionBottom = tradeSectionLayout.y + tradeSectionLayout.height;
    const targetY = Math.max(0, tradeSectionBottom - visibleHeight + padding);
    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const update = (height: number) => {
      if (keyboardHeightRef.current === height) return;
      keyboardHeightRef.current = height;
      setKeyboardHeight(height);
    };

    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height ?? 0;
      update(height);
      if (isQuantityFocused) {
        requestAnimationFrame(() => scrollTradeSectionFullyIntoView(height));
      }
    };

    const onHide = () => update(0);

    const showSub = Keyboard.addListener(showEvent as any, onShow);
    const hideSub = Keyboard.addListener(hideEvent as any, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isQuantityFocused, tradeSectionLayout, scrollViewHeight]);

  useEffect(() => {
    if (!isQuantityFocused) return;
    requestAnimationFrame(() => scrollTradeSectionFullyIntoView());
  }, [isQuantityFocused, tradeSectionLayout, scrollViewHeight]);

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => apiClient.getQuote(symbol!),
    enabled: !!symbol,
    refetchInterval: 60000,
  });

  const { data: history } = useQuery({
    queryKey: ['stockHistory', symbol],
    queryFn: () => apiClient.getStockHistory(symbol!),
    enabled: !!symbol,
  });

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiClient.getPortfolio(),
  });

  const { data: watchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => apiClient.getWatchlist(),
  });

  const isInWatchlist = watchlist?.some((w) => w.symbol === symbol);
  const holding = portfolio?.holdings.find((h) => h.symbol === symbol);

  // Transform and filter chart data
  const chartData = useMemo(() => {
    if (!history) return [];
    const transformed = history.map((point) => ({
      date: point.date,
      price: point.price,
    }));
    return filterDataByPeriod(transformed, selectedPeriod);
  }, [history, selectedPeriod]);

  const tradeMutation = useMutation({
    mutationFn: (data: {
      type: TradeType;
      symbol: string;
      quantity: number;
    }) =>
      tradeType === 'buy'
        ? apiClient.buyStock(data.symbol, data.quantity)
        : apiClient.sellStock(data.symbol, data.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setQuantity('');
      Alert.alert(
        'Success',
        `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${quantity} shares of ${symbol}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const watchlistMutation = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      return action === 'remove'
        ? apiClient.removeFromWatchlist(symbol!)
        : apiClient.addToWatchlist(symbol!);
    },
    onMutate: async (action) => {
      if (!symbol) return;
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });
      const previous = queryClient.getQueryData<any[]>(['watchlist']);

      queryClient.setQueryData<any[]>(['watchlist'], (current) => {
        const list = current ?? [];

        if (action === 'remove') {
          return list.filter((w) => w.symbol !== symbol);
        }

        return [
          ...list,
          {
            symbol,
            name: quote?.name ?? symbol,
            price: quote?.price ?? 0,
            changePercent: quote?.changePercent ?? 0,
            change: quote?.change ?? 0,
          },
        ];
      });

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['watchlist'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const handleTrade = () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (tradeType === 'buy') {
      const totalCost = qty * (quote?.price ?? 0);
      if (totalCost > (portfolio?.cashBalance ?? 0)) {
        Alert.alert('Error', 'Insufficient funds');
        return;
      }
    } else {
      if (qty > (holding?.quantity ?? 0)) {
        Alert.alert('Error', 'Not enough shares to sell');
        return;
      }
    }

    tradeMutation.mutate({ type: tradeType, symbol: symbol!, quantity: qty });
  };

  const totalCost = (parseInt(quantity, 10) || 0) * (quote?.price ?? 0);
  const parsedQuantity = parseInt(quantity, 10) || 0;

  // Validation states
  const exceedsBuyingPower =
    tradeType === 'buy' &&
    totalCost > (portfolio?.cashBalance ?? 0) &&
    parsedQuantity > 0;
  const exceedsShares =
    tradeType === 'sell' &&
    parsedQuantity > (holding?.quantity ?? 0) &&
    parsedQuantity > 0;
  const hasValidationError = exceedsBuyingPower || exceedsShares;

  if (quoteLoading) {
    return (
      <Container safeArea={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonStockDetail />
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container safeArea={false} style={{ paddingTop: 12 }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xl + (keyboardHeight || 0) },
        ]}
        contentInset={
          Platform.OS === 'ios' ? { bottom: keyboardHeight } : undefined
        }
        scrollIndicatorInsets={
          Platform.OS === 'ios' ? { bottom: keyboardHeight } : undefined
        }
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isChartScrubbing}
        onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.symbol}>{symbol}</Text>
            <Text style={styles.companyName}>{quote?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.watchlistButton}
            onPress={() =>
              watchlistMutation.mutate(isInWatchlist ? 'remove' : 'add')
            }
          >
            <Ionicons
              name={isInWatchlist ? 'star' : 'star-outline'}
              size={28}
              color={isInWatchlist ? colors.warning : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Interactive Chart with Price Display */}
        <StockChart
          data={chartData}
          currentPrice={quote?.price ?? 0}
          previousClose={quote?.previousClose}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          height={220}
        />

        {/* Holdings Info */}
        {holding && (
          <Card style={styles.holdingCard}>
            <Text style={styles.holdingTitle}>Your Position</Text>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Shares</Text>
              <Text style={styles.holdingValue}>{holding.quantity}</Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Avg Cost</Text>
              <Text style={styles.holdingValue}>
                {formatCurrency(holding.avgCostBasis)}
              </Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Total Value</Text>
              <Text style={styles.holdingValue}>
                {formatCurrency(holding.currentValue)}
              </Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>P&L</Text>
              <Text
                style={[
                  styles.holdingValue,
                  holding.gainLoss >= 0 ? styles.positive : styles.negative,
                ]}
              >
                {holding.gainLoss >= 0 ? '+' : ''}
                {formatCurrency(holding.gainLoss)} (
                {holding.gainLossPercent.toFixed(2)}%)
              </Text>
            </View>
          </Card>
        )}

        {/* Trade Section */}
        <Card
          style={styles.tradeSection}
          onLayout={(e) =>
            setTradeSectionLayout({
              y: e.nativeEvent.layout.y,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <View style={styles.tradeToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                tradeType === 'buy' && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setTradeType('buy');
                setQuantity('');
              }}
            >
              <Text
                style={[
                  styles.toggleText,
                  tradeType === 'buy' && styles.toggleTextActive,
                ]}
              >
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                tradeType === 'sell' && styles.toggleButtonActiveSell,
              ]}
              onPress={() => {
                setTradeType('sell');
                setQuantity('');
              }}
              disabled={!holding}
            >
              <Text
                style={[
                  styles.toggleText,
                  tradeType === 'sell' && styles.toggleTextActive,
                  !holding && styles.toggleTextDisabled,
                ]}
              >
                Sell
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Shares</Text>
            <Input
              style={styles.quantityInput}
              variant="large"
              value={quantity}
              onChangeText={(text) => {
                const numeric = text.replace(/[^0-9]/g, '');
                if (numeric === '' || parseInt(numeric, 10) <= 9999999) {
                  setQuantity(numeric);
                }
              }}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={7}
              onFocus={() => {
                setIsQuantityFocused(true);
                requestAnimationFrame(() => scrollTradeSectionFullyIntoView());
              }}
              onBlur={() => setIsQuantityFocused(false)}
            />
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>
              Estimated {tradeType === 'buy' ? 'Cost' : 'Credit'}
            </Text>
            <Text
              style={[styles.totalValue]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCurrency(totalCost)}
            </Text>
          </View>

          {/* Buying power (only show when no error) */}
          {tradeType === 'buy' && (
            <Text
              style={[
                styles.buyingPower,
                hasValidationError && styles.validationError,
              ]}
            >
              Buying Power: {formatCurrency(portfolio?.cashBalance ?? 0)}
            </Text>
          )}

          {/* Available shares for selling */}
          {tradeType === 'sell' && holding && (
            <Text
              style={[
                styles.buyingPower,
                hasValidationError && styles.validationError,
              ]}
            >
              Available: {holding.quantity} shares
            </Text>
          )}

          <Button
            title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
            variant={tradeType === 'buy' ? 'primary' : 'danger'}
            size="lg"
            onPress={handleTrade}
            loading={tradeMutation.isPending}
            disabled={hasValidationError || parsedQuantity === 0}
            style={styles.tradeButton}
          />
        </Card>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  symbol: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  companyName: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  watchlistButton: {
    padding: spacing.sm,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  holdingCard: {
    marginTop: spacing.lg,
  },
  holdingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  holdingLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  holdingValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  tradeSection: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  tradeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 2,
    marginBottom: spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonActiveSell: {
    backgroundColor: colors.error,
  },
  toggleText: {
    color: colors.textTertiary,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#000',
  },
  toggleTextDisabled: {
    color: colors.border,
  },
  quantitySection: {
    marginBottom: spacing.lg,
  },
  quantityLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  quantityInput: {
    padding: spacing.md,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    flexShrink: 0,
  },
  totalValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  totalValueError: {
    color: colors.error,
  },
  buyingPower: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  validationError: {
    color: colors.error,
  },
  tradeButton: {
    marginTop: spacing.sm,
  },
});
