import { View, ScrollView, StyleSheet, ViewProps, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

const MAX_WIDTH = 512;

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
}

interface ScrollContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
}

export function Container({ children, style, safeArea = true, ...props }: ContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, safeArea && { paddingTop: insets.top }]} {...props}>
      <View style={[styles.inner, style]}>{children}</View>
    </View>
  );
}

export function ScrollContainer({
  children,
  contentContainerStyle,
  safeArea = true,
  ...props
}: ScrollContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, safeArea && { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.inner}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
