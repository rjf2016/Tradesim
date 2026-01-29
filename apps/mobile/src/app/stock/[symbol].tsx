import { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { apiClient } from '@/services/api';
import { formatCurrency } from '@/utils/format';
import { Container, Card, Button, Input, SkeletonStockDetail } from '@/components';
import { colors, spacing, borderRadius } from '@/theme';

type TradeType = 'buy' | 'sell';

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [quantity, setQuantity] = useState('');

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
        [{ text: 'OK', onPress: () => router.back() }],
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
  const chartData =
    history?.map((point) => ({
      value: point.price,
      label: point.date,
    })) ?? [];

  if (quoteLoading) {
    return (
      <Container>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonStockDetail />
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxxl + (keyboardHeight || 0) },
        ]}
        contentInset={
          Platform.OS === 'ios' ? { bottom: keyboardHeight } : undefined
        }
        scrollIndicatorInsets={
          Platform.OS === 'ios' ? { bottom: keyboardHeight } : undefined
        }
        keyboardShouldPersistTaps="handled"
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
            onPress={() => watchlistMutation.mutate(isInWatchlist ? 'remove' : 'add')}
          >
            <Ionicons
              name={isInWatchlist ? 'star' : 'star-outline'}
              size={28}
              color={isInWatchlist ? colors.warning : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatCurrency(quote?.price ?? 0)}</Text>
          <Text
            style={[
              styles.change,
              (quote?.changePercent ?? 0) >= 0
                ? styles.positive
                : styles.negative,
            ]}
          >
            {(quote?.changePercent ?? 0) >= 0 ? '+' : ''}
            {formatCurrency(quote?.change ?? 0)} (
            {(quote?.changePercent ?? 0).toFixed(2)}%)
          </Text>
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={320}
              height={200}
              color={colors.primary}
              thickness={2}
              hideDataPoints
              hideYAxisText
              hideAxesAndRules
              curved
              areaChart
              startFillColor={colors.primary}
              startOpacity={0.4}
              endFillColor={colors.primary}
              endOpacity={0.1}
            />
          </View>
        )}

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
                {holding.gainLossPercent.toFixed(2)}
                %)
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
              onPress={() => setTradeType('buy')}
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
              onPress={() => setTradeType('sell')}
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
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
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
            <Text style={styles.totalValue}>{formatCurrency(totalCost)}</Text>
          </View>

          {tradeType === 'buy' && (
            <Text style={styles.buyingPower}>
              Buying Power: {formatCurrency(portfolio?.cashBalance ?? 0)}
            </Text>
          )}

          <Button
            title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
            variant={tradeType === 'buy' ? 'primary' : 'danger'}
            size="lg"
            onPress={handleTrade}
            loading={tradeMutation.isPending}
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
    marginBottom: spacing.lg,
  },
  symbol: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  companyName: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  watchlistButton: {
    padding: spacing.sm,
  },
  priceSection: {
    marginBottom: spacing.xl,
  },
  price: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '700',
  },
  change: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  chartContainer: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  holdingCard: {
    marginBottom: spacing.xl,
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
    padding: spacing.lg,
  },
  tradeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
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
    padding: spacing.lg,
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
  },
  totalValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  buyingPower: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  tradeButton: {
    marginTop: spacing.sm,
  },
});
