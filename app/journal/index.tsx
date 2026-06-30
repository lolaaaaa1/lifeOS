import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, addDays, startOfDay, isSameDay } from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import { JournalEntry } from '@/constants/types';
import { journal as store, uid } from '@/lib/store';

const MOODS: { val: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { val: 1, emoji: '😞', label: 'Hard' },
  { val: 2, emoji: '😐', label: 'Meh' },
  { val: 3, emoji: '🙂', label: 'Good' },
  { val: 4, emoji: '😊', label: 'Great' },
  { val: 5, emoji: '🤩', label: 'Amazing' },
];

function DateStrip({
  selected,
  onChange,
}: {
  selected: Date;
  onChange: (d: Date) => void;
}) {
  const days = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {days.map(d => {
        const isSelected = isSameDay(d, selected);
        const isToday = isSameDay(d, new Date());
        return (
          <TouchableOpacity
            key={d.toISOString()}
            onPress={() => onChange(startOfDay(d))}
            style={[styles.dayBtn, isSelected && styles.dayBtnOn]}
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameOn]}>
              {format(d, 'EEE').toUpperCase()}
            </Text>
            <Text style={[styles.dayNum, isSelected && styles.dayNumOn]}>{format(d, 'd')}</Text>
            {isToday && <View style={[styles.todayDot, isSelected && { backgroundColor: colors.surface }]} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'write' | 'entries'>('write');
  const inputRef = useRef<TextInput>(null);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  const load = useCallback(async () => {
    const entries = await store.getAll();
    setAllEntries(entries);
    const existing = entries.find(e => e.date === dateKey) ?? null;
    setActiveEntry(existing);
    setContent(existing?.content ?? '');
    setMood(existing?.mood ?? null);
  }, [dateKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDateChange = (d: Date) => {
    setSelectedDate(d);
  };

  const saveEntry = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: activeEntry?.id ?? uid(),
      date: dateKey,
      content: content.trim(),
      mood,
      tags: [],
      createdAt: activeEntry?.createdAt ?? now,
      updatedAt: now,
    };
    await store.upsert(entry);
    setSaving(false);
    load();
  };

  const deleteEntry = () => {
    if (!activeEntry) return;
    Alert.alert('Delete entry?', format(selectedDate, 'd MMMM yyyy'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await store.remove(activeEntry.id);
          setContent(''); setMood(null); setActiveEntry(null);
          load();
        },
      },
    ]);
  };

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Daily</Text>
          <Text style={styles.title}>Journal</Text>
        </View>
        <View style={{ minWidth: 64, alignItems: 'flex-end' }}>
          <Text style={styles.entryCount}>{allEntries.length} entries</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['write', 'entries'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnOn]}
          >
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>
              {t === 'write' ? 'Write' : 'All Entries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'write' ? (
        <>
          {/* Date strip */}
          <View style={styles.stripWrap}>
            <DateStrip selected={selectedDate} onChange={onDateChange} />
          </View>

          {/* Selected date label */}
          <View style={styles.dateLabelRow}>
            <Text style={styles.dateLabel}>
              {isToday ? 'Today' : format(selectedDate, 'EEEE')},&nbsp;
              <Text style={styles.dateLabelAccent}>{format(selectedDate, 'd MMMM yyyy')}</Text>
            </Text>
            {activeEntry && (
              <TouchableOpacity onPress={deleteEntry}>
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.writeArea}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mood row */}
            <View style={styles.moodRow}>
              <Text style={styles.moodLabel}>How's today?</Text>
              <View style={styles.moodBtns}>
                {MOODS.map(m => (
                  <TouchableOpacity
                    key={m.val}
                    onPress={() => setMood(mood === m.val ? null : m.val)}
                    style={[styles.moodBtn, mood === m.val && styles.moodBtnOn]}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodBtnLbl, mood === m.val && { color: colors.accent }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={styles.editor}
              value={content}
              onChangeText={setContent}
              placeholder={isToday
                ? "What's on your mind today?"
                : `Write an entry for ${format(selectedDate, 'd MMMM')}…`}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />

            <TouchableOpacity
              style={[styles.saveBtn, (!content.trim() || saving) && { opacity: 0.45 }]}
              onPress={saveEntry}
              disabled={!content.trim() || saving}
            >
              <Ionicons name="checkmark" size={18} color={colors.surface} />
              <Text style={styles.saveBtnTxt}>
                {activeEntry ? 'Update Entry' : 'Save Entry'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + 24, gap: sp.sm }}
          showsVerticalScrollIndicator={false}
        >
          {allEntries.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✍</Text>
              <Text style={styles.emptyTxt}>No entries yet</Text>
              <Text style={styles.emptyHint}>Switch to Write to start your journal</Text>
            </View>
          )}
          {allEntries
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => {
                  setSelectedDate(startOfDay(new Date(entry.date + 'T12:00:00')));
                  setTab('write');
                }}
              >
                <View style={styles.entryCardTop}>
                  <Text style={styles.entryDate}>
                    {format(new Date(entry.date + 'T12:00:00'), 'd MMMM yyyy')}
                  </Text>
                  {entry.mood && (
                    <Text style={styles.entryMoodEmoji}>
                      {MOODS.find(m => m.val === entry.mood)?.emoji}
                    </Text>
                  )}
                </View>
                <Text style={styles.entryPreview} numberOfLines={3}>{entry.content}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
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
  entryCount: { fontFamily: fonts.monoLight, fontSize: 10, color: colors.muted },

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

  stripWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  strip: { paddingHorizontal: sp.md, paddingVertical: sp.sm, gap: sp.xs },
  dayBtn: {
    alignItems: 'center', paddingHorizontal: sp.sm,
    paddingVertical: 8, borderRadius: r.sm, minWidth: 44,
  },
  dayBtnOn: { backgroundColor: colors.accent },
  dayName: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, letterSpacing: 1 },
  dayNameOn: { color: 'rgba(241,237,228,0.7)' },
  dayNum: { fontFamily: fonts.serifReg, fontSize: 18, color: colors.ink, lineHeight: 22 },
  dayNumOn: { color: colors.light },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 2 },

  dateLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sp.lg, paddingVertical: sp.sm,
  },
  dateLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkLight },
  dateLabelAccent: { fontFamily: fonts.serif, fontSize: 15, color: colors.ink },

  writeArea: { flex: 1 },

  moodRow: { paddingHorizontal: sp.lg, paddingTop: sp.sm, paddingBottom: sp.xs },
  moodLabel: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: colors.muted, marginBottom: sp.sm },
  moodBtns: { flexDirection: 'row', gap: sp.xs },
  moodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: sp.xs,
    borderRadius: r.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moodBtnOn: { borderColor: colors.accent, backgroundColor: 'rgba(92,102,80,0.07)' },
  moodEmoji: { fontSize: 18 },
  moodBtnLbl: { fontFamily: fonts.monoLight, fontSize: 8, color: colors.muted, marginTop: 2 },

  editor: {
    fontFamily: fonts.serifReg,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 26,
    padding: sp.lg,
    minHeight: 200,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.xs,
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, marginHorizontal: sp.lg, marginTop: sp.xs,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },

  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: sp.xl * 2 },
  emptyIcon: { fontSize: 32, color: colors.border2, marginBottom: sp.md },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted, letterSpacing: 1 },
  emptyHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: sp.xs },

  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: r.md, borderWidth: 1, borderColor: colors.border,
    padding: sp.md, marginBottom: sp.xs,
  },
  entryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryDate: { fontFamily: fonts.mono, fontSize: 10, color: colors.accent, letterSpacing: 0.5 },
  entryMoodEmoji: { fontSize: 16 },
  entryPreview: { fontFamily: fonts.serifReg, fontSize: 14, color: colors.inkLight, lineHeight: 22 },
});
