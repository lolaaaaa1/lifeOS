import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isSameMonth, addMonths, subMonths, isToday,
} from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import { CalendarEvent } from '@/constants/types';
import { events as store, uid } from '@/lib/store';

const { width } = Dimensions.get('window');
const DAY_SIZE = Math.floor((width - sp.lg * 2) / 7);

const EVENT_COLORS = ['#5c6650', '#9c7d3f', '#a8533f', '#6e6248', '#3f4654', '#7a8a6e'];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [eTitle, setETitle] = useState('');
  const [eDate, setEDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eStart, setEStart] = useState('');
  const [eEnd, setEEnd] = useState('');
  const [eAllDay, setEAllDay] = useState(true);
  const [eNotes, setENotes] = useState('');
  const [eColor, setEColor] = useState(EVENT_COLORS[0]);

  const load = useCallback(async () => {
    setAllEvents(await store.getAll());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setETitle('');
    setEDate(format(selected, 'yyyy-MM-dd'));
    setEStart(''); setEEnd(''); setEAllDay(true); setENotes(''); setEColor(EVENT_COLORS[0]);
    setShowModal(true);
  };

  const addEvent = async () => {
    if (!eTitle.trim()) return;
    await store.add({
      id: uid(),
      title: eTitle.trim(),
      date: eDate,
      startTime: eAllDay ? null : (eStart || null),
      endTime: eAllDay ? null : (eEnd || null),
      allDay: eAllDay,
      color: eColor,
      notes: eNotes.trim(),
      createdAt: new Date().toISOString(),
    });
    setShowModal(false);
    load();
  };

  const deleteEvent = (ev: CalendarEvent) =>
    Alert.alert('Delete event?', ev.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(ev.id); load(); } },
    ]);

  // Calendar grid
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart); // 0=Sun
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...days,
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsOnDay = (d: Date) =>
    allEvents.filter(e => e.date === format(d, 'yyyy-MM-dd'));

  const selectedDayEvents = allEvents
    .filter(e => e.date === format(selected, 'yyyy-MM-dd'))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

  const todayEventsCount = allEvents.filter(e => e.date === format(new Date(), 'yyyy-MM-dd')).length;
  const monthEventsCount = allEvents.filter(e => e.date.startsWith(format(month, 'yyyy-MM'))).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Schedule</Text>
          <Text style={styles.title}>Calendar</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { val: todayEventsCount, lbl: 'Today' },
          { val: monthEventsCount, lbl: format(month, 'MMM') },
          { val: allEvents.length, lbl: 'Total' },
        ].map(s => (
          <View key={s.lbl} style={styles.stat}>
            <Text style={styles.statVal}>{s.val}</Text>
            <Text style={styles.statLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonth(subMonths(month, 1))} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={colors.inkLight} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setMonth(addMonths(month, 1))} hitSlop={12}>
            <Ionicons name="chevron-forward" size={20} color={colors.inkLight} />
          </TouchableOpacity>
        </View>

        {/* Day names */}
        <View style={styles.dayNames}>
          {DAYS.map((d, i) => (
            <Text key={i} style={styles.dayName}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {cells.map((cell, i) => {
            if (!cell) return <View key={`empty-${i}`} style={styles.cell} />;
            const dots = eventsOnDay(cell);
            const sel = isSameDay(cell, selected);
            const today = isToday(cell);
            const inMonth = isSameMonth(cell, month);
            return (
              <TouchableOpacity
                key={cell.toISOString()}
                style={[styles.cell, sel && styles.cellSelected, today && !sel && styles.cellToday]}
                onPress={() => setSelected(cell)}
              >
                <Text style={[
                  styles.cellNum,
                  !inMonth && styles.cellNumFaint,
                  sel && styles.cellNumSel,
                  today && !sel && { color: colors.accent },
                ]}>
                  {format(cell, 'd')}
                </Text>
                <View style={styles.cellDots}>
                  {dots.slice(0, 3).map((ev, di) => (
                    <View key={di} style={[styles.cellDot, { backgroundColor: ev.color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day events */}
        <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <Text style={styles.daySectionTitle}>
              {isToday(selected) ? 'Today' : format(selected, 'EEE, d MMMM')}
            </Text>
            <TouchableOpacity onPress={openModal} style={styles.addDayBtn}>
              <Text style={styles.addDayBtnTxt}>+ Event</Text>
            </TouchableOpacity>
          </View>

          {selectedDayEvents.length === 0 && (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayTxt}>Nothing scheduled</Text>
            </View>
          )}

          {selectedDayEvents.map(ev => (
            <TouchableOpacity
              key={ev.id}
              onLongPress={() => deleteEvent(ev)}
              style={[styles.eventRow, { borderLeftColor: ev.color }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                {!ev.allDay && ev.startTime && (
                  <Text style={styles.eventTime}>
                    {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}
                  </Text>
                )}
                {ev.notes ? <Text style={styles.eventNotes} numberOfLines={1}>{ev.notes}</Text> : null}
              </View>
              {ev.allDay && (
                <View style={[styles.allDayBadge, { backgroundColor: ev.color + '22' }]}>
                  <Text style={[styles.allDayTxt, { color: ev.color }]}>All day</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>TITLE</Text>
            <TextInput style={styles.input} value={eTitle} onChangeText={setETitle}
              placeholder="Event name" placeholderTextColor={colors.muted} autoFocus />

            <Text style={styles.lbl}>DATE</Text>
            <TextInput style={styles.input} value={eDate} onChangeText={setEDate}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />

            {/* All day toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setEAllDay(!eAllDay)}
            >
              <Text style={styles.toggleLbl}>All day</Text>
              <View style={[styles.toggle, eAllDay && styles.toggleOn]}>
                <View style={[styles.toggleThumb, eAllDay && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>

            {!eAllDay && (
              <View style={{ flexDirection: 'row', gap: sp.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbl}>START</Text>
                  <TextInput style={styles.input} value={eStart} onChangeText={setEStart}
                    placeholder="09:00" placeholderTextColor={colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbl}>END</Text>
                  <TextInput style={styles.input} value={eEnd} onChangeText={setEEnd}
                    placeholder="10:00" placeholderTextColor={colors.muted} />
                </View>
              </View>
            )}

            <Text style={styles.lbl}>NOTES</Text>
            <TextInput style={[styles.input, styles.textarea]} value={eNotes} onChangeText={setENotes}
              placeholder="Location, details…" placeholderTextColor={colors.muted} multiline />

            <Text style={styles.lbl}>COLOUR</Text>
            <View style={{ flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap' }}>
              {EVENT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setEColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, eColor === c && styles.colorDotOn]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, !eTitle.trim() && { opacity: 0.45 }]}
              onPress={addEvent}
              disabled={!eTitle.trim()}
            >
              <Text style={styles.saveBtnTxt}>Add Event</Text>
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

  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: sp.sm },
  statVal: { fontFamily: fonts.serifReg, fontSize: 20, color: colors.ink },
  statLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 2 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sp.lg, paddingVertical: sp.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  monthLabel: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },

  dayNames: {
    flexDirection: 'row', paddingHorizontal: sp.lg,
    backgroundColor: colors.surface2,
  },
  dayName: {
    width: DAY_SIZE, textAlign: 'center',
    fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1,
    color: colors.muted, paddingVertical: sp.xs,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: sp.lg, backgroundColor: colors.bg,
    paddingTop: sp.xs,
  },
  cell: {
    width: DAY_SIZE, height: DAY_SIZE + 8,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: r.sm,
  },
  cellSelected: { backgroundColor: colors.accent },
  cellToday: { backgroundColor: 'rgba(92,102,80,0.1)' },
  cellNum: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.ink },
  cellNumFaint: { color: colors.border2 },
  cellNumSel: { color: colors.light },
  cellDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  cellDot: { width: 4, height: 4, borderRadius: 2 },

  daySection: { padding: sp.lg },
  daySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.sm },
  daySectionTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  addDayBtn: {
    paddingHorizontal: sp.md, paddingVertical: 6,
    borderRadius: 50, borderWidth: 1, borderColor: colors.accent,
  },
  addDayBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },

  emptyDay: { padding: sp.md, alignItems: 'center' },
  emptyDayTxt: { fontFamily: fonts.monoLight, fontSize: 11, color: colors.muted, letterSpacing: 1 },

  eventRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: r.sm,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, padding: sp.md, marginBottom: sp.xs,
  },
  eventTitle: { fontFamily: fonts.sansMed, fontSize: 14, color: colors.ink },
  eventTime: { fontFamily: fonts.monoLight, fontSize: 10, color: colors.muted, marginTop: 2 },
  eventNotes: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  allDayBadge: { paddingHorizontal: sp.sm, paddingVertical: 3, borderRadius: 50 },
  allDayTxt: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },

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
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: sp.md, paddingVertical: sp.xs,
  },
  toggleLbl: { fontFamily: fonts.sansMed, fontSize: 14, color: colors.ink },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: colors.border2, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.accent },
  toggleThumb: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.surface, alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotOn: { borderWidth: 3, borderColor: colors.ink },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center',
    marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
