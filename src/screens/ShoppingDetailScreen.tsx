import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { Button } from '../components/ui';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';
import type { ShoppingList, ShoppingListProduct } from '../types';

export default function ShoppingDetailScreen() {
  const route = useRoute<any>();
  const { t } = useTranslation();
  const listId: string = route.params?.listId;

  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add product
  const [showForm, setShowForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [productQty, setProductQty] = useState('');

  const load = async () => {
    try {
      const data = await api.getLists();
      const found = (data ?? []).find((l) => l.id === listId);
      setList(found ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [listId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const addProduct = async () => {
    if (!productName.trim() || !list) return;
    try {
      const updated = await api.addProduct(list.id, {
        name: productName.trim(),
        quantity: productQty ? Number(productQty) : null,
      });
      setList(updated);
      setProductName('');
      setProductQty('');
      setShowForm(false);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
    }
  };

  const removeProduct = (product: ShoppingListProduct) => {
    if (!list) return;
    Alert.alert(
      t('common.confirmDelete', 'Delete'),
      t('shopping.confirmDeleteProduct', 'Remove this product?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeProduct(list.id, product.id);
              setList((prev) =>
                prev
                  ? { ...prev, products: prev.products.filter((p) => p.id !== product.id) }
                  : prev,
              );
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.statusText}>{t('common.loading', 'Loading…')}</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.center}>
        <Text style={styles.statusText}>{t('shopping.notFound', 'List not found')}</Text>
      </View>
    );
  }

  const products = list.products ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{list.name}</Text>
        <TouchableOpacity onPress={() => setShowForm((s) => !s)}>
          <Text style={styles.addBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('shopping.productName', 'Product name')}
            placeholderTextColor={colors.textMuted}
            value={productName}
            onChangeText={setProductName}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder={t('shopping.quantity', 'Quantity')}
            placeholderTextColor={colors.textMuted}
            value={productQty}
            onChangeText={setProductQty}
            keyboardType="numeric"
          />
          <View style={styles.formActions}>
            <Button title={t('common.cancel', 'Cancel')} variant="secondary" size="sm" onPress={() => setShowForm(false)} />
            <Button title={t('shopping.addProduct', 'Add')} size="sm" onPress={addProduct} />
          </View>
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.productRow}>
            <Text style={[styles.productName, item.checked && styles.productChecked]}>
              {item.checked ? '☑' : '☐'} {item.name}
            </Text>
            {item.quantity != null && (
              <Text style={styles.productQty}>
                {item.quantity} {item.unit ?? ''}
              </Text>
            )}
            {item.category && (
              <Text style={styles.productCategory}>{item.category}</Text>
            )}
            <TouchableOpacity onPress={() => removeProduct(item)}>
              <Text style={styles.deleteIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.statusText}>{t('shopping.emptyProducts', 'No products yet')}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  addBtn: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '700',
  },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  productName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  productChecked: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  productQty: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  productCategory: {
    fontSize: fontSize.xs,
    color: colors.info,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  deleteIcon: {
    fontSize: 16,
  },
  statusText: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
    fontSize: fontSize.md,
  },
});
