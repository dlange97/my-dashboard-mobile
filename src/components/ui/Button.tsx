import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '../../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'muted';

interface Props {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

const BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surface,
  danger: colors.danger,
  ghost: 'transparent',
  muted: colors.borderLight,
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.textInverse,
  secondary: colors.text,
  danger: colors.textInverse,
  ghost: colors.primary,
  muted: colors.textSecondary,
};

export default function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'md',
}: Props) {
  const heightMap = { sm: 36, md: 44, lg: 52 };
  const fontMap = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg };
  const label = title ?? (typeof children === 'string' ? children : undefined);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: BG[variant],
          height: heightMap[size],
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={TEXT_COLOR[variant]} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { color: TEXT_COLOR[variant], fontSize: fontMap[size] },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
