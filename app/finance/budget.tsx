import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, sp, r } from '@/constants/theme';
import { fmt, monthKey, type BudgetType, type BudgetItem, type Transaction } from '@/constants/financeTypes';
import { budget as store, transactions as txnStore, uid } from '@/lib/financeStore';

type Tab = 'all' | BudgetType;

const TYPE_LABEL: Record<BudgetType, string> = {
  obligations: 'Obligation',
  savings: 'Saving',
  living: 'Living',
};

const TYPE_COLOR: Record<BudgetType, string> = {
  obligations: '#a8533f',
  savings: '#5c6650',
  living: '#9c7d3f',
};

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [fCat, setFCat] = useState('');
  const [fType, setFType] = useState<BudgetType>('living');
  const [fAmount, setFAmount] = useState('');

  const load = useCallback(async () => {
    const [b, t] = await Promise.all([store.getAll(), txnStore.getAll()]);
    setItems(b);
    setTxns(t);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditId(null); setFCat(''); setFType('living'); setFAmount('');
    setShowModal(true);
  };

  const openEdit = (item: BudgetItem) => {
    setEditId(item.id); setFCat(item.cat); setFType(item.type); setFAmount(item.amount.toString());
    setShowModal(true);
  };

  const save = async () => {
    if (!fCat.trim() || !fAmount) return;
    if (editId) {
      await store.update(editId, { cat: fCat.trim(), type: fType, amount: parseFloat(fAmount) });
    } else {
      await store.add({ id: uid(), cat: fCat.trim(), type: fType, amount: parseFloat(fAmount) });
    }
    setShowModal(false);
    load();
  };

  const deleteItem = (item: BudgetItem) =>
    Alert.alert('Delete budget item?', item.cat, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(item.id); load(); } },
    ]);

  const thisMonth = monthKey();
  const monthTxns = txns.filter(t => t.month === thisMonth && t.type === 'expense');

  const actualFor = (cat: string) =>
    monthTxns.filter(t => t.cat === cat).reduce((s, t) => s + t.amount + t.charges, 0);

  const displayed = tab === 'all' ? items : items.filter(i => i.type === tab);
  const totalBudget = items.reduce((s, i) => s + i.amount, 0);
  const totalActual = items.reduce((s, i) => s + actualFor(i.cat), 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Finance</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Allocation</Text>
          <Text style={styles.title}>Monthly Budget</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        {[
          { lbl: 'Budgeted', val: fmt(totalBudget), color: colors.ink },
          { lbl: 'Spent', val: fmt(totalActual), color: colors.red },
          { lbl: 'Remaining', val: fmt(totalBudget - totalActual), color: totalBudget - totalActual >= 0 ? colors.green : colors.red },
          { lbl: 'Items', val: String(items.length), color: colors.ink },
        ].map(k => (
          <View key={k.lbl} style={styles.kpi}>
            <Text style={[styles.kpiVal, { color: k.color }]}>{k.val}</Text>
            <Text style={styles.kpiLbl}>{k.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: sp.xs, padding: sp.md }}
        style={{ backgroundColor: colors.bg, maxHeight: 52 }}>
        {(['all', 'obligations', 'savings', 'living'] as Tab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tabChip, tab === t && styles.tabChipOn]}>
            <Text style={[styles.tabChipTxt, tab === t && styles.tabChipTxtOn]}>
              {t === 'all' ? 'All' : TYPE_LABEL[t as BudgetType]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        {displayed.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No budget items yet</Text>
            <TouchableOpacity onPress={openAdd} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnTxt}>+ Add item</Text>
            </TouchableOpacity>
          </View>
        )}
        {displayed.map(item => {
          const actual = actualFor(item.cat);
          const pct = item.amount > 0 ? Math.min(100, (actual / item.amount) * 100) : 0;
          const isOver = actual > item.amount;
          const barColor = pct >= 100 ? colors.red : pct >= 80 ? colors.gold : colors.accent;

          return (
            <Pressable key={item.id} onPress={() => openEdit(item)} onLongPress={() => deleteItem(item)}
              style={styles.budgetRow}>
              <View style={styles.budgetTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.budgetCat}>{item.cat}</Text>
                  <View style={styles.budgetTypeRow}>
                    <View style={[styles.typeBadge, { backgroundColor: TYPE_COLOR[item.type] + '20' }]}>
                      <Text style={[styles.typeBadgeTxt, { color: TYPE_COLOR[item.type] }]}>
                        {TYPE_LABEL[item.type]}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.budgetActual, { color: isOver ? colors.red : colors.ink }]}>
                    {fmt(actual)}
                  </Text>
                  <Text style={styles.budgetOf}>of {fmt(item.amount)}</Text>
                </View>
              </View>
              <View style={styles.progBg}>
                <View style={[styles.progFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
              </View>
              <Text style={[styles.pctTxt, { color: barColor }]}>{Math.round(pct)}%</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Item' : 'Budget Item'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.lbl}>CATEGORY NAME</Text>
            <TextInput style={styles.input} value={fCat} onChangeText={setFCat}
              placeholder="e.g. Tithe, Rent, Food" placeholderTextColor={colors.muted} autoFocus />
            <Text style={styles.lbl}>TYPE</Text>
            <View style={styles.typeRow}>
              {(['obligations', 'savings', 'living'] as BudgetType[]).map(t => (
                <TouchableOpacity key={t} onPress={() => setFType(t)}
                  style={[styles.typeChip, fType === t && { backgroundColor: TYPE_COLOR[t], borderColor: TYPE_COLOR[t] }]}>
                  <Text style={[styles.typeChipTxt, fType === t && { color: '#fff' }]}>{TYPE_LABEL[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.lbl}>MONTHLY AMOUNT</Text>
            <TextInput style={styles.input} value={fAmount} onChangeText={setFAmount}
              placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />
            <TouchableOpacity style={[styles.saveBtn, (!fCat.trim() || !fAmount) && { opacity: 0.45 }]}
              onPress={save} disabled={!fCat.trim() || !fAmount}>
              <Text style={styles.saveBtnTxt}>{editId ? 'Update' : 'Add Item'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sp.lg, paddingVertical: sp.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backTxt: { fontFamily: fonts.monoLight, fontSize: 11, color: colors.inkLight, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  fab: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  kpiRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  kpi: { flex: 1, alignItems: 'center', paddingVertical: sp.sm },
  kpiVal: { fontFamily: fonts.serifReg, fontSize: 15, color: colors.ink },
  kpiLbl: { fontFamily: fonts.monoLight, fontSize: 8, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  tabChip: { paddingHorizontal: sp.md, paddingVertical: 6, borderRadius: 50, borderWidth: 1, borderColor: colors.border2 },
  tabChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabChipTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  tabChipTxtOn: { color: colors.surface },
  list: { flex: 1 },
  empty: { alignItems: 'center', padding: sp.xl },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  emptyBtn: { marginTop: sp.sm, borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  emptyBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },
  budgetRow: {
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    padding: sp.md,
  },
  budgetTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: sp.xs + 2 },
  budgetCat: { fontFamily: fonts.sansMed, fontSize: 14, color: colors.ink },
  budgetTypeRow: { flexDirection: 'row', marginTop: 3 },
  typeBadge: { paddingHorizontal: sp.sm, paddingVertical: 2, borderRadius: 50 },
  typeBadgeTxt: { fontFamily: fonts.monoLight, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' },
  budgetActual: { fontFamily: fonts.serifReg, fontSize: 15 },
  budgetOf: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, letterSpacing: 0.5 },
  progBg: { height: 4, backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden', marginVertical: sp.xs },
  progFill: { height: '100%', borderRadius: 10 },
  pctTxt: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textAlign: 'right' },
  modal: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: sp.lg, paddingBottom: sp.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  modalBody: { padding: sp.lg },
  lbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: colors.muted, marginBottom: 6, marginTop: sp.md },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: r.sm, padding: sp.sm + 2,
    fontFamily: fonts.sans, fontSize: 14, color: colors.ink,
  },
  typeRow: { flexDirection: 'row', gap: sp.sm },
  typeChip: {
    flex: 1, paddingVertical: sp.sm, alignItems: 'center',
    borderRadius: 50, borderWidth: 1, borderColor: colors.border2,
  },
  typeChipTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center', marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
