import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Habit, Goal, JournalEntry, CalendarEvent } from '@/constants/types';

const K = {
  tasks:   'ledgr:tasks',
  habits:  'ledgr:habits',
  goals:   'ledgr:goals',
  journal: 'ledgr:journal',
  events:  'ledgr:events',
};

async function load<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

async function save<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Tasks ───────────────────────────────────────────────
export const tasks = {
  getAll: () => load<Task>(K.tasks),
  add: async (t: Task) => {
    const all = await tasks.getAll();
    await save(K.tasks, [t, ...all]);
  },
  update: async (id: string, patch: Partial<Task>) => {
    const all = await tasks.getAll();
    await save(K.tasks, all.map(t => (t.id === id ? { ...t, ...patch } : t)));
  },
  remove: async (id: string) => {
    const all = await tasks.getAll();
    await save(K.tasks, all.filter(t => t.id !== id));
  },
};

// ── Habits ──────────────────────────────────────────────
export const habits = {
  getAll: () => load<Habit>(K.habits),
  add: async (h: Habit) => {
    const all = await habits.getAll();
    await save(K.habits, [h, ...all]);
  },
  update: async (id: string, patch: Partial<Habit>) => {
    const all = await habits.getAll();
    await save(K.habits, all.map(h => (h.id === id ? { ...h, ...patch } : h)));
  },
  remove: async (id: string) => {
    const all = await habits.getAll();
    await save(K.habits, all.filter(h => h.id !== id));
  },
};

// ── Goals ───────────────────────────────────────────────
export const goals = {
  getAll: () => load<Goal>(K.goals),
  add: async (g: Goal) => {
    const all = await goals.getAll();
    await save(K.goals, [g, ...all]);
  },
  update: async (id: string, patch: Partial<Goal>) => {
    const all = await goals.getAll();
    await save(K.goals, all.map(g => (g.id === id ? { ...g, ...patch } : g)));
  },
  remove: async (id: string) => {
    const all = await goals.getAll();
    await save(K.goals, all.filter(g => g.id !== id));
  },
};

// ── Journal ─────────────────────────────────────────────
export const journal = {
  getAll: () => load<JournalEntry>(K.journal),
  getByDate: async (date: string): Promise<JournalEntry | null> => {
    const all = await journal.getAll();
    return all.find(e => e.date === date) ?? null;
  },
  upsert: async (entry: JournalEntry) => {
    const all = await journal.getAll();
    const idx = all.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      all[idx] = entry;
      await save(K.journal, all);
    } else {
      await save(K.journal, [entry, ...all]);
    }
  },
  remove: async (id: string) => {
    const all = await journal.getAll();
    await save(K.journal, all.filter(e => e.id !== id));
  },
};

// ── Events ──────────────────────────────────────────────
export const events = {
  getAll: () => load<CalendarEvent>(K.events),
  getByDate: async (date: string): Promise<CalendarEvent[]> => {
    const all = await events.getAll();
    return all.filter(e => e.date === date);
  },
  add: async (e: CalendarEvent) => {
    const all = await events.getAll();
    await save(K.events, [e, ...all]);
  },
  update: async (id: string, patch: Partial<CalendarEvent>) => {
    const all = await events.getAll();
    await save(K.events, all.map(e => (e.id === id ? { ...e, ...patch } : e)));
  },
  remove: async (id: string) => {
    const all = await events.getAll();
    await save(K.events, all.filter(e => e.id !== id));
  },
};
