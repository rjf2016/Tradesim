import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';
import { formatCurrency } from '@/utils/format';

interface StockRowProps {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  onPress: () => void;
  subtitle?: string;
}

export function StockRow({
  symbol,
  name,
  price,
  changePercent,
  onPress,
  subtitle,
}: StockRowProps) {
  const isPositive = changePercent >= 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {subtitle ?? name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{formatCurrency(price)}</Text>
        <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flex: 1,
    marginRight: spacing.lg,
    gap: spacing.xs,
  },
  symbol: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  name: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  price: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
});
