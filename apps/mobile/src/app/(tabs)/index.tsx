import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { formatCurrency, formatPercent } from '@/utils/format';
import {
  ScrollContainer,
  Card,
  StockRow,
  SkeletonPortfolio,
  EmptyState,
} from '@/components';
import { colors, spacing } from '@/theme';

export default function PortfolioScreen() {
  const {
    data: portfolio,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiClient.getPortfolio(),
  });

  const totalValue = portfolio
    ? portfolio.cashBalance +
      portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0)
    : 0;

  const totalGainLoss = portfolio
    ? portfolio.holdings.reduce((sum, h) => sum + h.gainLoss, 0)
    : 0;

  const totalGainLossPercent = portfolio
    ? (totalGainLoss / (totalValue - totalGainLoss)) * 100
    : 0;

  if (isLoading) {
    return (
      <ScrollContainer>
        <SkeletonPortfolio />
      </ScrollContainer>
    );
  }

  return (
    <ScrollContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Portfolio Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
        <View style={styles.gainLossRow}>
          <Text
            style={[
              styles.gainLoss,
              totalGainLoss >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {totalGainLoss >= 0 ? '+' : ''}
            {formatCurrency(totalGainLoss)} ({formatPercent(totalGainLossPercent)})
          </Text>
          <Text style={styles.allTime}>All Time</Text>
        </View>
      </Card>

      {/* Cash Balance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buying Power</Text>
        <Card>
          <Text style={styles.cashValue}>
            {formatCurrency(portfolio?.cashBalance ?? 0)}
          </Text>
          <Text style={styles.cashLabel}>Available Cash</Text>
        </Card>
      </View>

      {/* Holdings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Holdings</Text>
        {portfolio?.holdings.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="No holdings yet"
            actionLabel="Start Trading"
            onAction={() => router.push('/(tabs)/trade')}
          />
        ) : (
          <View style={styles.holdingsList}>
            {portfolio?.holdings.map((holding) => (
              <StockRow
                key={holding.symbol}
                symbol={holding.symbol}
                name={holding.symbol}
                subtitle={`${holding.quantity} shares`}
                price={holding.currentValue}
                changePercent={holding.gainLossPercent}
                onPress={() => router.push(`/stock/${holding.symbol}`)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
  summaryCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  gainLossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gainLoss: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  allTime: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  cashValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cashLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  holdingsList: {
    gap: spacing.sm,
  },
});
