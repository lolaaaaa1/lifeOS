import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import { Goal, Habit } from '@/constants/types';
import { goals as gStore, habits as hStore, uid } from '@/lib/store';

type Tab = 'goals' | 'habits';

const ACCENT_COLORS = ['#5c6650', '#9c7d3f', '#a8533f', '#6e6248', '#7a8a6e', '#8a6a5e'];

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: Goal;
  onUpdate: (patch: Partial<Goal>) => void;
  onDelete: () => void;
}) {
  const pct = Math.min(100, goal.target > 0 ? (goal.current / goal.target) * 100 : 0);
  return (
    <View style={[styles.card, { borderLeftColor: goal.color, borderLeftWidth: 3 }]}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <Text style={styles.cardMeta}>
            {goal.current} / {goal.target} {goal.unit}
          </Text>
        </View>
        <Text style={[styles.pctText, { color: goal.color }]}>{Math.round(pct)}%</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: sp.sm }}>
          <Ionicons name="trash-outline" size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
      </View>
      {/* Quick increment */}
      <View style={styles.cardActions}>
        {[1, 5, 10, 25].map(n => (
          <TouchableOpacity
            key={n}
            style={styles.incBtn}
            onPress={() => onUpdate({ current: Math.min(goal.target, goal.current + n) })}
          >
            <Text style={styles.incBtnTxt}>+{n}</Text>
          </TouchableOpacity>
        ))}
        {goal.notes ? <Text style={styles.goalNotes} numberOfLines={1}>{goal.notes}</Text> : null}
      </View>
    </View>
  );
}

function HabitCard({ habit, onToggleToday, onDelete }: {
  habit: Habit;
  onToggleToday: () => void;
  onDelete: () => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const doneToday = habit.completedDates.includes(today);

  // Last 7 days for streak display
  const last7 = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
  );

  // Streak count (consecutive days ending today)
  let streak = 0;
  const sorted = [...habit.completedDates].sort().reverse();
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (sorted.includes(d)) streak++;
    else break;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.habitEmoji}>{habit.emoji}</Text>
        <View style={{ flex: 1, marginLeft: sp.sm }}>
          <Text style={styles.cardTitle}>{habit.title}</Text>
          <Text style={styles.cardMeta}>{streak} day streak</Text>
        </View>
        <TouchableOpacity onPress={onToggleToday} style={[styles.doneBtn, doneToday && { backgroundColor: habit.color }]}>
          <Ionicons
            name={doneToday ? 'checkmark' : 'ellipse-outline'}
            size={18}
            color={doneToday ? '#fff' : colors.border2}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: sp.xs }}>
          <Ionicons name="trash-outline" size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>
      {/* 7-day dots */}
      <View style={styles.dots}>
        {last7.map(d => (
          <View
            key={d}
            style={[styles.dot, habit.completedDates.includes(d) && { backgroundColor: habit.color }]}
          />
        ))}
      </View>
    </View>
  );
}

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('goals');
  const [goalList, setGoalList] = useState<Goal[]>([]);
  const [habitList, setHabitList] = useState<Habit[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Goal form
  const [gTitle, setGTitle] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gUnit, setGUnit] = useState('');
  const [gDeadline, setGDeadline] = useState('');
  const [gNotes, setGNotes] = useState('');
  const [gColor, setGColor] = useState(ACCENT_COLORS[0]);

  // Habit form
  const [hEmoji, setHEmoji] = useState('✦');
  const [hTitle, setHTitle] = useState('');
  const [hColor, setHColor] = useState(ACCENT_COLORS[0]);

  const load = useCallback(async () => {
    setGoalList(await gStore.getAll());
    setHabitList(await hStore.getAll());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForm = () => {
    setGTitle(''); setGTarget(''); setGUnit(''); setGDeadline(''); setGNotes('');
    setGColor(ACCENT_COLORS[0]);
    setHEmoji('✦'); setHTitle(''); setHColor(ACCENT_COLORS[0]);
  };

  const addGoal = async () => {
    if (!gTitle.trim() || !gTarget) return;
    await gStore.add({
      id: uid(), title: gTitle.trim(), target: parseFloat(gTarget),
      current: 0, unit: gUnit.trim() || 'units', deadline: gDeadline || null,
      color: gColor, notes: gNotes.trim(), createdAt: new Date().toISOString(),
    });
    setShowModal(false); resetForm(); load();
  };

  const addHabit = async () => {
    if (!hTitle.trim()) return;
    await hStore.add({
      id: uid(), emoji: hEmoji, title: hTitle.trim(),
      frequency: 'daily', completedDates: [], color: hColor,
      createdAt: new Date().toISOString(),
    });
    setShowModal(false); resetForm(); load();
  };

  const toggleHabitToday = async (habit: Habit) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const dates = habit.completedDates.includes(today)
      ? habit.completedDates.filter(d => d !== today)
      : [...habit.completedDates, today];
    await hStore.update(habit.id, { completedDates: dates });
    load();
  };

  const deleteGoal = (id: string) =>
    Alert.alert('Delete goal?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await gStore.remove(id); load(); } },
    ]);

  const deleteHabit = (id: string) =>
    Alert.alert('Delete habit?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await hStore.remove(id); load(); } },
    ]);

  const habitsDoneToday = habitList.filter(h =>
    h.completedDates.includes(format(new Date(), 'yyyy-MM-dd')),
  ).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Growth</Text>
          <Text style={styles.title}>Goals & Habits</Text>
        </View>
        <TouchableOpacity onPress={() => { resetForm(); setShowModal(true); }} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { val: goalList.length, lbl: 'Goals' },
          { val: goalList.filter(g => g.current >= g.target).length, lbl: 'Complete' },
          { val: habitList.length, lbl: 'Habits' },
          { val: `${habitsDoneToday}/${habitList.length}`, lbl: 'Today' },
        ].map(s => (
          <View key={s.lbl} style={styles.stat}>
            <Text style={styles.statVal}>{s.val}</Text>
            <Text style={styles.statLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['goals', 'habits'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnOn]}
          >
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: sp.sm }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'goals' && (
          <>
            {goalList.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>◎</Text>
                <Text style={styles.emptyTxt}>No goals yet</Text>
                <Text style={styles.emptyHint}>Tap + to set your first goal</Text>
              </View>
            )}
            {goalList.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onUpdate={async patch => { await gStore.update(g.id, patch); load(); }}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </>
        )}

        {tab === 'habits' && (
          <>
            {habitList.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>◎</Text>
                <Text style={styles.emptyTxt}>No habits yet</Text>
                <Text style={styles.emptyHint}>Tap + to track a daily habit</Text>
              </View>
            )}
            {habitList.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                onToggleToday={() => toggleHabitToday(h)}
                onDelete={() => deleteHabit(h.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>
              {tab === 'goals' ? 'New Goal' : 'New Habit'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Toggle inside modal */}
            <View style={[styles.tabs, { marginBottom: sp.md }]}>
              {(['goals', 'habits'] as Tab[]).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tabBtn, tab === t && styles.tabBtnOn]}
                >
                  <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'goals' ? (
              <>
                <Text style={styles.lbl}>GOAL NAME</Text>
                <TextInput style={styles.input} value={gTitle} onChangeText={setGTitle}
                  placeholder="e.g. Save for holiday" placeholderTextColor={colors.muted} autoFocus />

                <View style={{ flexDirection: 'row', gap: sp.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbl}>TARGET</Text>
                    <TextInput style={styles.input} value={gTarget} onChangeText={setGTarget}
                      placeholder="1000" placeholderTextColor={colors.muted} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbl}>UNIT</Text>
                    <TextInput style={styles.input} value={gUnit} onChangeText={setGUnit}
                      placeholder="GHS, pages, km…" placeholderTextColor={colors.muted} />
                  </View>
                </View>

                <Text style={styles.lbl}>DEADLINE (optional)</Text>
                <TextInput style={styles.input} value={gDeadline} onChangeText={setGDeadline}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />

                <Text style={styles.lbl}>NOTES</Text>
                <TextInput style={[styles.input, styles.textarea]} value={gNotes} onChangeText={setGNotes}
                  placeholder="Why this goal matters…" placeholderTextColor={colors.muted} multiline />

                <Text style={styles.lbl}>COLOUR</Text>
                <View style={{ flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap' }}>
                  {ACCENT_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setGColor(c)}
                      style={[styles.colorDot, { backgroundColor: c }, gColor === c && styles.colorDotOn]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, (!gTitle.trim() || !gTarget) && { opacity: 0.45 }]}
                  onPress={addGoal}
                  disabled={!gTitle.trim() || !gTarget}
                >
                  <Text style={styles.saveBtnTxt}>Add Goal</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: sp.sm }}>
                  <View style={{ width: 72 }}>
                    <Text style={styles.lbl}>EMOJI</Text>
                    <TextInput style={[styles.input, { textAlign: 'center', fontSize: 22 }]}
                      value={hEmoji} onChangeText={setHEmoji} maxLength={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbl}>HABIT NAME</Text>
                    <TextInput style={styles.input} value={hTitle} onChangeText={setHTitle}
                      placeholder="e.g. Morning workout" placeholderTextColor={colors.muted} autoFocus />
                  </View>
                </View>

                <Text style={styles.lbl}>COLOUR</Text>
                <View style={{ flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap' }}>
                  {ACCENT_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setHColor(c)}
                      style={[styles.colorDot, { backgroundColor: c }, hColor === c && styles.colorDotOn]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, !hTitle.trim() && { opacity: 0.45 }]}
                  onPress={addHabit}
                  disabled={!hTitle.trim()}
                >
                  <Text style={styles.saveBtnTxt}>Add Habit</Text>
                </TouchableOpacity>
              </>
            )}
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

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: sp.sm },
  statVal: { fontFamily: fonts.serifReg, fontSize: 20, color: colors.ink },
  statLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 2 },

  tabs: {
    flexDirection: 'row', gap: 4,
    padding: sp.md, backgroundColor: colors.bg,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 50, borderWidth: 1, borderColor: colors.border2,
  },
  tabBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabTxt: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.inkLight },
  tabTxtOn: { color: colors.surface },

  list: { flex: 1, paddingHorizontal: sp.md },
  empty: { alignItems: 'center', paddingTop: sp.xl * 2 },
  emptyIcon: { fontSize: 32, color: colors.border2, marginBottom: sp.md },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted, letterSpacing: 1 },
  emptyHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: sp.xs },

  card: {
    backgroundColor: colors.surface,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: sp.md,
    marginBottom: sp.xs,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontFamily: fonts.sansMed, fontSize: 14, color: colors.ink },
  cardMeta: { fontFamily: fonts.monoLight, fontSize: 10, color: colors.muted, marginTop: 2 },
  pctText: { fontFamily: fonts.serifReg, fontSize: 18 },
  progressBg: { height: 4, backgroundColor: colors.border, borderRadius: 10, marginTop: sp.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, marginTop: sp.sm },
  incBtn: {
    paddingHorizontal: sp.sm, paddingVertical: 4,
    backgroundColor: colors.bg2, borderRadius: 50,
    borderWidth: 1, borderColor: colors.border,
  },
  incBtnTxt: { fontFamily: fonts.monoLight, fontSize: 11, color: colors.inkLight },
  goalNotes: { flex: 1, fontFamily: fonts.sans, fontSize: 11, color: colors.muted, marginLeft: sp.sm },

  habitEmoji: { fontSize: 26 },
  doneBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 5, marginTop: sp.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },

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
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotOn: { borderWidth: 3, borderColor: colors.ink },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center',
    marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
