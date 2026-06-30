import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import { fmt, type Loan, type LoanDir } from '@/constants/financeTypes';
import { loans as store, uid } from '@/lib/financeStore';

type Tab = 'all' | 'owed_to_me' | 'i_owe';

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Loan[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [showModal, setShowModal] = useState(false);

  const [fPerson, setFPerson] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fDir, setFDir] = useState<LoanDir>('owed_to_me');
  const [fDate, setFDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fDue, setFDue] = useState('');
  const [fPaid, setFPaid] = useState('0');
  const [fNotes, setFNotes] = useState('');

  const load = useCallback(async () => setList(await store.getAll()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setFPerson(''); setFAmount(''); setFDir('owed_to_me');
    setFDate(format(new Date(), 'yyyy-MM-dd')); setFDue(''); setFPaid('0'); setFNotes('');
    setShowModal(true);
  };

  const addLoan = async () => {
    if (!fPerson.trim() || !fAmount) return;
    await store.add({
      id: uid(),
      person: fPerson.trim(),
      amount: parseFloat(fAmount),
      paid: parseFloat(fPaid) || 0,
      direction: fDir,
      date: fDate,
      dueDate: fDue || null,
      notes: fNotes.trim(),
      status: 'outstanding',
    });
    setShowModal(false);
    load();
  };

  const toggleSettle = async (loan: Loan) => {
    await store.update(loan.id, {
      status: loan.status === 'outstanding' ? 'settled' : 'outstanding',
      paid: loan.status === 'outstanding' ? loan.amount : loan.paid,
    });
    load();
  };

  const deleteLoan = (l: Loan) =>
    Alert.alert('Delete loan?', `${l.person} — ${fmt(l.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(l.id); load(); } },
    ]);

  const displayed = list.filter(l =>
    tab === 'all' ? true : l.direction === tab,
  );

  const owedToMe = list.filter(l => l.direction === 'owed_to_me' && l.status === 'outstanding')
    .reduce((s, l) => s + (l.amount - l.paid), 0);
  const iOwe = list.filter(l => l.direction === 'i_owe' && l.status === 'outstanding')
    .reduce((s, l) => s + (l.amount - l.paid), 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Finance</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Obligations</Text>
          <Text style={styles.title}>Loans</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpi, { borderRightWidth: 1, borderRightColor: colors.border }]}>
          <Text style={styles.kpiLbl}>Owed to me</Text>
          <Text style={[styles.kpiVal, { color: colors.green }]}>{fmt(owedToMe)}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLbl}>I owe</Text>
          <Text style={[styles.kpiVal, { color: colors.red }]}>{fmt(iOwe)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([['all', 'All'], ['owed_to_me', 'Owed to me'], ['i_owe', 'I owe']] as [Tab, string][]).map(([t, lbl]) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnOn]}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        {displayed.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No loans recorded</Text>
            <TouchableOpacity onPress={openModal} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnTxt}>+ Record loan</Text>
            </TouchableOpacity>
          </View>
        )}
        {displayed.map(l => {
          const outstanding = l.amount - l.paid;
          const settled = l.status === 'settled';
          return (
            <TouchableOpacity key={l.id} onLongPress={() => deleteLoan(l)}
              style={[styles.card, settled && { opacity: 0.55 }]}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{l.person[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{l.person}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.dirBadge, { backgroundColor: l.direction === 'owed_to_me' ? colors.green + '20' : colors.red + '20' }]}>
                      <Text style={[styles.dirTxt, { color: l.direction === 'owed_to_me' ? colors.green : colors.red }]}>
                        {l.direction === 'owed_to_me' ? 'Owes me' : 'I owe'}
                      </Text>
                    </View>
                    {l.dueDate && <Text style={styles.dueTxt}>Due {l.dueDate}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amount}>{fmt(outstanding)}</Text>
                  <Text style={styles.amountSub}>of {fmt(l.amount)}</Text>
                </View>
              </View>

              {l.notes ? <Text style={styles.notes} numberOfLines={1}>{l.notes}</Text> : null}

              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => toggleSettle(l)}
                  style={[styles.settleBtn, settled && { backgroundColor: colors.accent }]}>
                  <Ionicons name={settled ? 'checkmark-circle' : 'ellipse-outline'} size={14}
                    color={settled ? colors.surface : colors.muted} />
                  <Text style={[styles.settleTxt, settled && { color: colors.surface }]}>
                    {settled ? 'Settled' : 'Mark settled'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.statusBadge, { color: settled ? colors.green : colors.gold }]}>
                  {settled ? '✓ Settled' : '⏳ Outstanding'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Record Loan</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>PERSON / PARTY</Text>
            <TextInput style={styles.input} value={fPerson} onChangeText={setFPerson}
              placeholder="e.g. Ama, Bank" placeholderTextColor={colors.muted} autoFocus />

            <Text style={styles.lbl}>AMOUNT</Text>
            <TextInput style={styles.input} value={fAmount} onChangeText={setFAmount}
              placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />

            <Text style={styles.lbl}>DIRECTION</Text>
            <View style={styles.dirRow}>
              {([['owed_to_me', 'They owe me'], ['i_owe', 'I owe them']] as [LoanDir, string][]).map(([d, lbl]) => (
                <TouchableOpacity key={d} onPress={() => setFDir(d)}
                  style={[styles.dirChip, fDir === d && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[styles.dirChipTxt, fDir === d && { color: '#fff' }]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>DATE</Text>
                <TextInput style={styles.input} value={fDate} onChangeText={setFDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>DUE DATE</Text>
                <TextInput style={styles.input} value={fDue} onChangeText={setFDue}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
              </View>
            </View>

            <Text style={styles.lbl}>AMOUNT PAID BACK</Text>
            <TextInput style={styles.input} value={fPaid} onChangeText={setFPaid}
              placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />

            <Text style={styles.lbl}>NOTES</Text>
            <TextInput style={styles.input} value={fNotes} onChangeText={setFNotes}
              placeholder="Optional details…" placeholderTextColor={colors.muted} />

            <TouchableOpacity style={[styles.saveBtn, (!fPerson.trim() || !fAmount) && { opacity: 0.45 }]}
              onPress={addLoan} disabled={!fPerson.trim() || !fAmount}>
              <Text style={styles.saveBtnTxt}>Save Loan</Text>
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
  kpiRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  kpi: { flex: 1, padding: sp.md, alignItems: 'center' },
  kpiLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase' },
  kpiVal: { fontFamily: fonts.serif, fontSize: 22, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 4, padding: sp.md, backgroundColor: colors.bg },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 50, borderWidth: 1, borderColor: colors.border2 },
  tabBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabTxt: { fontFamily: fonts.sansMed, fontSize: 11, color: colors.inkLight },
  tabTxtOn: { color: colors.surface },
  list: { flex: 1 },
  empty: { alignItems: 'center', padding: sp.xl },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  emptyBtn: { marginTop: sp.sm, borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  emptyBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },
  card: {
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    padding: sp.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: fonts.serif, fontSize: 16, color: colors.surface },
  personName: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, marginTop: 3 },
  dirBadge: { paddingHorizontal: sp.sm, paddingVertical: 2, borderRadius: 50 },
  dirTxt: { fontFamily: fonts.monoLight, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' },
  dueTxt: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted },
  amount: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  amountSub: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, marginTop: 1 },
  notes: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: sp.xs },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: sp.sm },
  settleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: 50, borderWidth: 1, borderColor: colors.border2,
  },
  settleTxt: { fontFamily: fonts.sansMed, fontSize: 11, color: colors.muted },
  statusBadge: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1 },
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
  dirRow: { flexDirection: 'row', gap: sp.sm },
  dirChip: { flex: 1, paddingVertical: sp.sm, alignItems: 'center', borderRadius: 50, borderWidth: 1, borderColor: colors.border2 },
  dirChipTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center', marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
