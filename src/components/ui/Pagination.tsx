import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '../../theme';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, page <= 1 && styles.btnDisabled]}
        onPress={() => page > 1 && onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <Text style={[styles.btnText, page <= 1 && styles.btnTextDisabled]}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        {page} / {totalPages}
      </Text>

      <TouchableOpacity
        style={[styles.btn, page >= totalPages && styles.btnDisabled]}
        onPress={() => page < totalPages && onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        <Text style={[styles.btnText, page >= totalPages && styles.btnTextDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: fontSize.xl,
    color: colors.text,
    fontWeight: '600',
  },
  btnTextDisabled: {
    color: colors.textMuted,
  },
  info: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
