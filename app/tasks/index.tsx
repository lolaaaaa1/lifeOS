import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import { Task } from '@/constants/types';
import { tasks as store, uid } from '@/lib/store';

type Priority = Task['priority'];
type Filter = 'active' | 'all' | 'done';

const PRI_COLOR: Record<Priority, string> = {
  low: colors.muted,
  medium: colors.gold,
  high: colors.red,
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [showModal, setShowModal] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => setList(await store.getAll()), []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setTitle(''); setProject(''); setPriority('medium'); setDueDate(''); setNotes('');
    setShowModal(true);
  };

  const addTask = async () => {
    if (!title.trim()) return;
    await store.add({
      id: uid(),
      title: title.trim(),
      project: project.trim(),
      priority,
      dueDate: dueDate.trim() || null,
      completed: false,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    setShowModal(false);
    load();
  };

  const toggle = async (task: Task) => {
    await store.update(task.id, { completed: !task.completed });
    load();
  };

  const confirmDelete = (task: Task) => {
    Alert.alert('Delete task?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(task.id); load(); } },
    ]);
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const active = list.filter(t => !t.completed);
  const todayDue = active.filter(t => t.dueDate === today).length;
  const projects = [...new Set(list.map(t => t.project).filter(Boolean))];

  const displayed = list.filter(t =>
    filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>GTD</Text>
          <Text style={styles.title}>Tasks</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        {[
          { val: active.length, lbl: 'Active' },
          { val: todayDue, lbl: 'Due today' },
          { val: projects.length, lbl: 'Projects' },
          { val: list.filter(t => t.completed).length, lbl: 'Done' },
        ].map(s => (
          <View key={s.lbl} style={styles.stat}>
            <Text style={styles.statVal}>{s.val}</Text>
            <Text style={styles.statLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      {/* ── Filter chips ── */}
      <View style={styles.chips}>
        {(['active', 'all', 'done'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipOn]}
          >
            <Text style={[styles.chipTxt, filter === f && styles.chipTxtOn]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {displayed.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTxt}>No {filter} tasks</Text>
            {filter === 'active' && (
              <Text style={styles.emptyHint}>Tap + to add your first task</Text>
            )}
          </View>
        )}

        {displayed.map(task => (
          <Pressable
            key={task.id}
            onLongPress={() => confirmDelete(task)}
            style={styles.item}
          >
            <TouchableOpacity onPress={() => toggle(task)} hitSlop={8}>
              <Ionicons
                name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={task.completed ? colors.accent : colors.border2}
              />
            </TouchableOpacity>

            <View style={styles.itemBody}>
              <View style={styles.itemTop}>
                <Text
                  style={[styles.itemTitle, task.completed && styles.itemTitleDone]}
                  numberOfLines={2}
                >
                  {task.title}
                </Text>
                <View style={[styles.priDot, { backgroundColor: PRI_COLOR[task.priority] }]} />
              </View>
              <View style={styles.itemMeta}>
                {task.project ? (
                  <View style={styles.projectTag}>
                    <Text style={styles.projectTxt}>{task.project}</Text>
                  </View>
                ) : null}
                {task.dueDate ? (
                  <Text style={[
                    styles.dueTxt,
                    task.dueDate < today && !task.completed && { color: colors.red },
                  ]}>
                    {task.dueDate === today ? 'Today' : task.dueDate}
                  </Text>
                ) : null}
              </View>
              {task.notes ? (
                <Text style={styles.itemNotes} numberOfLines={1}>{task.notes}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Add Modal ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>TASK</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.muted}
              autoFocus
            />

            <Text style={styles.lbl}>PROJECT</Text>
            <TextInput
              style={styles.input}
              value={project}
              onChangeText={setProject}
              placeholder="e.g. Work, Personal, Study"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.lbl}>PRIORITY</Text>
            <View style={styles.priRow}>
              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priChip,
                    priority === p && { backgroundColor: PRI_COLOR[p], borderColor: PRI_COLOR[p] },
                  ]}
                >
                  <Text style={[styles.priChipTxt, priority === p && { color: '#fff' }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.lbl}>DUE DATE</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.lbl}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any extra details…"
              placeholderTextColor={colors.muted}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, !title.trim() && { opacity: 0.45 }]}
              onPress={addTask}
              disabled={!title.trim()}
            >
              <Text style={styles.saveBtnTxt}>Add Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backTxt: { fontFamily: fonts.monoLight, fontSize: 11, color: colors.inkLight, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  fab: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: sp.sm },
  statVal: { fontFamily: fonts.serifReg, fontSize: 20, color: colors.ink },
  statLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 2 },

  // Chips
  chips: { flexDirection: 'row', gap: sp.xs, padding: sp.md, backgroundColor: colors.bg },
  chip: {
    paddingHorizontal: sp.md,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  chipTxtOn: { color: colors.surface },

  // List
  list: { flex: 1, paddingHorizontal: sp.lg },
  empty: { alignItems: 'center', paddingTop: sp.xl * 2 },
  emptyIcon: { fontSize: 32, color: colors.border2, marginBottom: sp.md },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted, letterSpacing: 1 },
  emptyHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: sp.xs },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.sm,
    paddingVertical: sp.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
  itemTitle: { flex: 1, fontFamily: fonts.sansMed, fontSize: 14, color: colors.ink },
  itemTitleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  priDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: 4 },
  projectTag: {
    backgroundColor: 'rgba(92,102,80,0.1)',
    borderRadius: 50,
    paddingHorizontal: sp.sm,
    paddingVertical: 2,
  },
  projectTxt: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.accentDark },
  dueTxt: { fontFamily: fonts.monoLight, fontSize: 10, color: colors.muted },
  itemNotes: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 3 },

  // Modal
  modal: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sp.lg,
    paddingBottom: sp.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  modalBody: { padding: sp.lg },
  lbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: colors.muted, marginBottom: 6, marginTop: sp.md },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: r.sm,
    padding: sp.sm + 2,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  priRow: { flexDirection: 'row', gap: sp.sm },
  priChip: {
    flex: 1,
    paddingVertical: sp.sm,
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  priChipTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 50,
    paddingVertical: sp.sm + 2,
    alignItems: 'center',
    marginTop: sp.lg,
    marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
