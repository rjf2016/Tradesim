import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  Container,
  Card,
  Badge,
  SkeletonStockList,
  EmptyState,
} from '@/components';
import { colors, spacing } from '@/theme';

export default function HistoryScreen() {
  const {
    data: transactions,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiClient.getTransactionHistory(),
  });

  if (isLoading) {
    return (
      <Container>
        <SkeletonStockList count={5} />
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={transactions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionLeft}>
                <Badge
                  label={item.type}
                  variant={item.type === 'BUY' ? 'success' : 'error'}
                />
                <Text style={styles.symbol}>{item.symbol}</Text>
              </View>
              <Text style={styles.date}>{formatDate(item.executedAt)}</Text>
            </View>
            <View style={styles.transactionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shares</Text>
                <Text style={styles.detailValue}>{item.quantity}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(item.pricePerShare)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text
                  style={[
                    styles.totalValue,
                    item.type === 'BUY' ? styles.negative : styles.positive,
                  ]}
                >
                  {item.type === 'BUY' ? '-' : '+'}
                  {formatCurrency(item.totalAmount)}
                </Text>
              </View>
            </View>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No transactions yet"
            subtitle="Your buy and sell transactions will appear here"
          />
        }
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  transactionCard: {
    marginBottom: spacing.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  symbol: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  date: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  transactionDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
});
