import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import {
  fmt, monthKey, CURRENCIES, TXN_CATEGORIES,
  type Currency, type TxnType, type Transaction,
} from '@/constants/financeTypes';
import { transactions as store, accounts as accStore, uid } from '@/lib/financeStore';
import type { Account } from '@/constants/financeTypes';

const TYPE_COLOR: Record<TxnType, string> = {
  income: colors.green,
  expense: colors.red,
  saving: colors.gold,
  transfer: colors.muted,
};

const MONTHS = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER',
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Transaction[]>([]);
  const [accList, setAccList] = useState<Account[]>([]);
  const [monthFilter, setMonthFilter] = useState(monthKey());
  const [catFilter, setCatFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);

  // Form
  const [fDesc, setFDesc] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fType, setFType] = useState<TxnType>('expense');
  const [fCat, setFCat] = useState(TXN_CATEGORIES[0]);
  const [fAcc, setFAcc] = useState('');
  const [fCur, setFCur] = useState<Currency>('GHS');
  const [fDate, setFDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fCharges, setFCharges] = useState('0');
  const [fNote, setFNote] = useState('');

  const load = useCallback(async () => {
    const [txns, accs] = await Promise.all([store.getAll(), accStore.getAll()]);
    setList(txns);
    setAccList(accs);
    if (accs.length > 0 && !fAcc) setFAcc(accs[0].id);
  }, [fAcc]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setFDesc(''); setFAmount(''); setFType('expense');
    setFCat(TXN_CATEGORIES[0]); setFCur('GHS');
    setFDate(format(new Date(), 'yyyy-MM-dd'));
    setFCharges('0'); setFNote('');
    setShowModal(true);
  };

  const addTxn = async () => {
    if (!fDesc.trim() || !fAmount) return;
    const dateMonth = new Date(fDate + 'T12:00:00').toLocaleString('en', { month: 'long' }).toUpperCase();
    await store.add({
      id: uid(),
      date: fDate,
      desc: fDesc.trim(),
      cat: fCat,
      accountId: fAcc,
      currency: fCur,
      type: fType,
      amount: parseFloat(fAmount),
      charges: parseFloat(fCharges) || 0,
      note: fNote.trim(),
      month: dateMonth,
    });
    setShowModal(false);
    load();
  };

  const deleteTxn = (t: Transaction) =>
    Alert.alert('Delete transaction?', t.desc, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(t.id); load(); } },
    ]);

  const filtered = list.filter(t => {
    const matchMonth = t.month === monthFilter;
    const matchCat = catFilter === 'All' || t.cat === catFilter;
    return matchMonth && matchCat;
  });

  const totalIn = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount + t.charges, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Finance</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Records</Text>
          <Text style={styles.title}>Transactions</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Month selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.monthScroll} contentContainerStyle={{ gap: sp.xs, padding: sp.sm }}>
        {MONTHS.map(m => (
          <TouchableOpacity key={m} onPress={() => setMonthFilter(m)}
            style={[styles.monthChip, monthFilter === m && styles.monthChipOn]}>
            <Text style={[styles.monthChipTxt, monthFilter === m && styles.monthChipTxtOn]}>
              {m.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLbl}>In</Text>
          <Text style={[styles.sumVal, { color: colors.green }]}>{fmt(totalIn)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLbl}>Out</Text>
          <Text style={[styles.sumVal, { color: colors.red }]}>{fmt(totalOut)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLbl}>Net</Text>
          <Text style={[styles.sumVal, { color: totalIn - totalOut >= 0 ? colors.ink : colors.red }]}>
            {fmt(totalIn - totalOut)}
          </Text>
        </View>
        <Text style={styles.countTxt}>{filtered.length} transactions</Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: sp.xs, paddingHorizontal: sp.md, paddingVertical: sp.xs }}>
        {['All', ...TXN_CATEGORIES].map(c => (
          <TouchableOpacity key={c} onPress={() => setCatFilter(c)}
            style={[styles.catChip, catFilter === c && styles.catChipOn]}>
            <Text style={[styles.catChipTxt, catFilter === c && styles.catChipTxtOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No transactions for {monthFilter}</Text>
            <TouchableOpacity onPress={openModal} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnTxt}>+ Add transaction</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map(t => {
          const acc = accList.find(a => a.id === t.accountId);
          return (
            <Pressable key={t.id} onLongPress={() => deleteTxn(t)} style={styles.row}>
              <View style={[styles.typeBar, { backgroundColor: TYPE_COLOR[t.type] }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowDesc}>{t.desc}</Text>
                  <Text style={[styles.rowAmt, { color: TYPE_COLOR[t.type] }]}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency)}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={styles.rowMetaTxt}>{t.cat}</Text>
                  {acc && <Text style={styles.rowMetaTxt}>{acc.name}</Text>}
                  <Text style={styles.rowMetaTxt}>{t.date}</Text>
                  {t.charges > 0 && <Text style={[styles.rowMetaTxt, { color: colors.red }]}>+{fmt(t.charges)} fees</Text>}
                </View>
                {t.note ? <Text style={styles.rowNote} numberOfLines={1}>{t.note}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>New Transaction</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>DESCRIPTION</Text>
            <TextInput style={styles.input} value={fDesc} onChangeText={setFDesc}
              placeholder="What was this for?" placeholderTextColor={colors.muted} autoFocus />

            <Text style={styles.lbl}>AMOUNT</Text>
            <TextInput style={styles.input} value={fAmount} onChangeText={setFAmount}
              placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />

            <Text style={styles.lbl}>TYPE</Text>
            <View style={styles.typeRow}>
              {(['expense','income','saving','transfer'] as TxnType[]).map(tp => (
                <TouchableOpacity key={tp} onPress={() => setFType(tp)}
                  style={[styles.typeChip, fType === tp && { backgroundColor: TYPE_COLOR[tp], borderColor: TYPE_COLOR[tp] }]}>
                  <Text style={[styles.typeChipTxt, fType === tp && { color: '#fff' }]}>
                    {tp.charAt(0).toUpperCase() + tp.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.lbl}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: sp.xs, paddingBottom: sp.xs }}>
              {TXN_CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setFCat(c)}
                  style={[styles.catChip, fCat === c && styles.catChipOn]}>
                  <Text style={[styles.catChipTxt, fCat === c && styles.catChipTxtOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {accList.length > 0 && (
              <>
                <Text style={styles.lbl}>ACCOUNT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: sp.xs, paddingBottom: sp.xs }}>
                  {accList.map(a => (
                    <TouchableOpacity key={a.id} onPress={() => setFAcc(a.id)}
                      style={[styles.catChip, fAcc === a.id && styles.catChipOn]}>
                      <Text style={[styles.catChipTxt, fAcc === a.id && styles.catChipTxtOn]}>{a.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.lbl}>CURRENCY</Text>
            <View style={styles.typeRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setFCur(c)}
                  style={[styles.typeChip, fCur === c && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[styles.typeChipTxt, fCur === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.lbl}>DATE</Text>
                <TextInput style={styles.input} value={fDate} onChangeText={setFDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>FEES</Text>
                <TextInput style={styles.input} value={fCharges} onChangeText={setFCharges}
                  placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.lbl}>NOTE</Text>
            <TextInput style={styles.input} value={fNote} onChangeText={setFNote}
              placeholder="Any extra details…" placeholderTextColor={colors.muted} />

            <TouchableOpacity style={[styles.saveBtn, (!fDesc.trim() || !fAmount) && { opacity: 0.45 }]}
              onPress={addTxn} disabled={!fDesc.trim() || !fAmount}>
              <Text style={styles.saveBtnTxt}>Save Transaction</Text>
            </TouchableOpacity>
          </ScrollView>
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
  monthScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 52 },
  monthChip: { paddingHorizontal: sp.md, paddingVertical: 6, borderRadius: 50, borderWidth: 1, borderColor: colors.border2 },
  monthChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  monthChipTxt: { fontFamily: fonts.monoLight, fontSize: 10, color: colors.inkLight, letterSpacing: 1 },
  monthChipTxtOn: { color: colors.surface },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: sp.xs,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  sumLbl: { fontFamily: fonts.monoLight, fontSize: 8, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  sumVal: { fontFamily: fonts.serifReg, fontSize: 15, marginTop: 1 },
  countTxt: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, paddingRight: sp.md },
  catChip: { paddingHorizontal: sp.sm + 2, paddingVertical: 5, borderRadius: 50, borderWidth: 1, borderColor: colors.border2 },
  catChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  catChipTxt: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.inkLight, letterSpacing: 0.5 },
  catChipTxtOn: { color: colors.surface },
  list: { flex: 1 },
  empty: { alignItems: 'center', padding: sp.xl },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  emptyBtn: { marginTop: sp.sm, borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  emptyBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },
  row: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  typeBar: { width: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: sp.md, paddingBottom: sp.xs },
  rowDesc: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.ink, flex: 1 },
  rowAmt: { fontFamily: fonts.serifReg, fontSize: 15, marginLeft: sp.sm },
  rowMeta: { flexDirection: 'row', gap: sp.sm, paddingHorizontal: sp.md, paddingBottom: sp.xs },
  rowMetaTxt: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, letterSpacing: 0.5 },
  rowNote: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, paddingHorizontal: sp.md, paddingBottom: sp.sm },
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
  typeRow: { flexDirection: 'row', gap: sp.xs, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: sp.sm + 2, paddingVertical: 7,
    borderRadius: 50, borderWidth: 1, borderColor: colors.border2, flex: 1, alignItems: 'center',
  },
  typeChipTxt: { fontFamily: fonts.sansMed, fontSize: 11, color: colors.inkLight },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center', marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
