import { View, ScrollView, StyleSheet, ViewProps, ScrollViewProps } from 'react-native';
import { colors } from '@/theme';

const MAX_WIDTH = 512;

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
}

interface ScrollContainerProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function Container({ children, style, ...props }: ContainerProps) {
  return (
    <View style={styles.outer} {...props}>
      <View style={[styles.inner, style]}>{children}</View>
    </View>
  );
}

export function ScrollContainer({
  children,
  contentContainerStyle,
  ...props
}: ScrollContainerProps) {
  return (
    <View style={styles.outer}>
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
