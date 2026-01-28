import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';

interface InputProps extends TextInputProps {
  variant?: 'default' | 'large';
}

export function Input({ style, variant = 'default', ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, variant === 'large' && styles.large, style]}
      placeholderTextColor={colors.textTertiary}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  large: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: colors.background,
    borderWidth: 0,
  },
});
