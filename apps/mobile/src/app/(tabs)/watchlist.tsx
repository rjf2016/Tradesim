import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { Container, StockRow, SkeletonStockList, EmptyState } from '@/components';
import { colors, spacing } from '@/theme';

export default function WatchlistScreen() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: watchlist,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => apiClient.getWatchlist(),
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <Container>
        <SkeletonStockList count={4} />
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={watchlist ?? []}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <View style={styles.rowWrapper}>
            <StockRow
              symbol={item.symbol}
              name={item.name}
              price={item.price}
              changePercent={item.changePercent}
              onPress={() => router.push(`/stock/${item.symbol}`)}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="No stocks in watchlist"
            subtitle="Add stocks to your watchlist to track them here"
            actionLabel="Add Stocks"
            onAction={() => router.push('/(tabs)/trade')}
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
  rowWrapper: {
    marginBottom: spacing.sm,
  },
});
