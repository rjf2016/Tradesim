import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';

interface BadgeProps {
  label: string;
  variant: 'success' | 'error';
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  success: {
    backgroundColor: 'rgba(0, 214, 50, 0.2)',
  },
  error: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.error,
  },
});
