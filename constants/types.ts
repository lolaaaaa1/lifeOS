export interface Task {
  id: string;
  title: string;
  project: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  completed: boolean;
  notes: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  emoji: string;
  title: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[];
  color: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string | null;
  color: string;
  notes: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: 1 | 2 | 3 | 4 | 5 | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  color: string;
  notes: string;
  createdAt: string;
}
