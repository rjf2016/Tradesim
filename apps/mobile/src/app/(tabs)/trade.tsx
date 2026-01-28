import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Container, Input, StockRow, SkeletonStockList, EmptyState } from '@/components';
import { colors, spacing, borderRadius } from '@/theme';

export default function TradeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['stockSearch', debouncedQuery],
    queryFn: () => apiClient.searchStocks(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
  });

  const { data: popularStocks, isLoading: isLoadingPopular } = useQuery({
    queryKey: ['popularStocks'],
    queryFn: () => apiClient.getPopularStocks(),
    enabled: debouncedQuery.length === 0,
  });

  const displayData = debouncedQuery.length > 0 ? searchResults : popularStocks;
  const isLoading = debouncedQuery.length > 0 ? isSearching : isLoadingPopular;

  return (
    <Container>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textTertiary}
          style={styles.searchIcon}
        />
        <Input
          style={styles.searchInput}
          placeholder="Search stocks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
        {debouncedQuery.length > 0 ? 'Search Results' : 'Popular Stocks'}
      </Text>

      {/* Results */}
      {isLoading ? (
        <SkeletonStockList count={6} />
      ) : (
        <FlatList
          data={displayData ?? []}
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
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={
                debouncedQuery.length > 0
                  ? 'No stocks found'
                  : 'Search for a stock to trade'
              }
            />
          }
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  rowWrapper: {
    marginBottom: spacing.sm,
  },
});
