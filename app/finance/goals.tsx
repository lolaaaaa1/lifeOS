import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, sp, r } from '@/constants/theme';
import { fmt, type SavingsGoal } from '@/constants/financeTypes';
import { finGoals as store, uid } from '@/lib/financeStore';

const GOAL_COLORS = ['#5c6650','#9c7d3f','#a8533f','#6b7c5e','#8a6a5e','#7a8a6e'];

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<SavingsGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAdd, setShowAdd] = useState(false); // add to saved modal
  const [addTarget, setAddTarget] = useState<SavingsGoal | null>(null);
  const [addAmt, setAddAmt] = useState('');

  const [fName, setFName] = useState('');
  const [fTarget, setFTarget] = useState('');
  const [fMonthly, setFMonthly] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fColor, setFColor] = useState(GOAL_COLORS[0]);

  const load = useCallback(async () => setList(await store.getAll()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addGoal = async () => {
    if (!fName.trim() || !fTarget) return;
    await store.add({
      id: uid(),
      name: fName.trim(),
      target: parseFloat(fTarget),
      saved: 0,
      monthlyAmount: parseFloat(fMonthly) || 0,
      color: fColor,
      notes: fNotes.trim(),
      createdAt: new Date().toISOString(),
    });
    setFName(''); setFTarget(''); setFMonthly(''); setFNotes(''); setFColor(GOAL_COLORS[0]);
    setShowModal(false);
    load();
  };

  const openAddSaved = (g: SavingsGoal) => {
    setAddTarget(g); setAddAmt(''); setShowAdd(true);
  };

  const saveAddSaved = async () => {
    if (!addTarget || !addAmt) return;
    const newSaved = Math.min(addTarget.target, addTarget.saved + parseFloat(addAmt));
    await store.update(addTarget.id, { saved: newSaved });
    setShowAdd(false);
    load();
  };

  const deleteGoal = (g: SavingsGoal) =>
    Alert.alert('Delete goal?', g.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(g.id); load(); } },
    ]);

  const totalTarget = list.reduce((s, g) => s + g.target, 0);
  const totalSaved = list.reduce((s, g) => s + g.saved, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Finance</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Savings</Text>
          <Text style={styles.title}>Goals</Text>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.kpiRow}>
        {[
          { lbl: 'Total target', val: fmt(totalTarget) },
          { lbl: 'Total saved', val: fmt(totalSaved) },
          { lbl: 'Remaining', val: fmt(totalTarget - totalSaved) },
          { lbl: 'Goals', val: String(list.length) },
        ].map(k => (
          <View key={k.lbl} style={styles.kpi}>
            <Text style={styles.kpiVal}>{k.val}</Text>
            <Text style={styles.kpiLbl}>{k.lbl}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        {list.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No savings goals yet</Text>
            <TouchableOpacity onPress={() => setShowModal(true)} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnTxt}>+ New goal</Text>
            </TouchableOpacity>
          </View>
        )}
        {list.map(g => {
          const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
          const done = g.saved >= g.target;
          return (
            <TouchableOpacity key={g.id} onLongPress={() => deleteGoal(g)}
              style={[styles.card, { borderLeftColor: g.color, borderLeftWidth: 3 }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{g.name}</Text>
                  {g.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{g.notes}</Text> : null}
                </View>
                {done && <View style={styles.doneBadge}><Text style={styles.doneTxt}>✓ Done</Text></View>}
                <Text style={[styles.pct, { color: g.color }]}>{Math.round(pct)}%</Text>
              </View>

              <View style={styles.progBg}>
                <View style={[styles.progFill, { width: `${pct}%` as any, backgroundColor: g.color }]} />
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.savedVal}>{fmt(g.saved)}</Text>
                  <Text style={styles.savedLbl}>saved of {fmt(g.target)}</Text>
                </View>
                {g.monthlyAmount > 0 && (
                  <View>
                    <Text style={styles.savedVal}>{fmt(g.monthlyAmount)}/mo</Text>
                    <Text style={styles.savedLbl}>monthly</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => openAddSaved(g)} style={styles.addBtn}>
                  <Text style={styles.addBtnTxt}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* New goal modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>GOAL NAME</Text>
            <TextInput style={styles.input} value={fName} onChangeText={setFName}
              placeholder="e.g. Emergency Fund, MSc Fees" placeholderTextColor={colors.muted} autoFocus />
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>TARGET (GH₵)</Text>
                <TextInput style={styles.input} value={fTarget} onChangeText={setFTarget}
                  placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>MONTHLY</Text>
                <TextInput style={styles.input} value={fMonthly} onChangeText={setFMonthly}
                  placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />
              </View>
            </View>
            <Text style={styles.lbl}>NOTES</Text>
            <TextInput style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
              value={fNotes} onChangeText={setFNotes}
              placeholder="Why this goal matters…" placeholderTextColor={colors.muted} multiline />
            <Text style={styles.lbl}>COLOUR</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setFColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, fColor === c && styles.colorDotOn]} />
              ))}
            </View>
            <TouchableOpacity style={[styles.saveBtn, (!fName.trim() || !fTarget) && { opacity: 0.45 }]}
              onPress={addGoal} disabled={!fName.trim() || !fTarget}>
              <Text style={styles.saveBtnTxt}>Add Goal</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add to saved modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Add to {addTarget?.name}</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.lbl}>AMOUNT TO ADD (GH₵)</Text>
            <TextInput style={styles.input} value={addAmt} onChangeText={setAddAmt}
              placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" autoFocus />
            <TouchableOpacity style={[styles.saveBtn, !addAmt && { opacity: 0.45 }]}
              onPress={saveAddSaved} disabled={!addAmt}>
              <Text style={styles.saveBtnTxt}>Add to Savings</Text>
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
  kpiVal: { fontFamily: fonts.serifReg, fontSize: 14, color: colors.ink },
  kpiLbl: { fontFamily: fonts.monoLight, fontSize: 8, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  listContent: { padding: sp.md, gap: sp.sm },
  empty: { alignItems: 'center', padding: sp.xl },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  emptyBtn: { marginTop: sp.sm, borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  emptyBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },
  card: {
    backgroundColor: colors.surface, borderRadius: r.md,
    borderWidth: 1, borderColor: colors.border, padding: sp.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: sp.xs },
  cardName: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  cardNotes: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  doneBadge: { backgroundColor: 'rgba(92,102,80,0.15)', borderRadius: 50, paddingHorizontal: sp.sm, paddingVertical: 3, marginRight: sp.xs },
  doneTxt: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.accent, letterSpacing: 1 },
  pct: { fontFamily: fonts.serifReg, fontSize: 20 },
  progBg: { height: 5, backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden', marginVertical: sp.sm },
  progFill: { height: '100%', borderRadius: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  savedVal: { fontFamily: fonts.serifReg, fontSize: 15, color: colors.ink },
  savedLbl: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, marginTop: 1, letterSpacing: 0.5 },
  addBtn: { borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  addBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },
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
  colorRow: { flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap', marginTop: sp.xs },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotOn: { borderWidth: 3, borderColor: colors.ink },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center', marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
