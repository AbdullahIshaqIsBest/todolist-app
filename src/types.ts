export interface Todo {
  _id?: string; // MongoDB Document ID
  id: string; // Client-side fallback unique ID
  text: string;
  completed: boolean;
  createdAt: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  notes?: string;
}

export type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
export type DateFilter = 'all' | 'today' | 'week' | 'overdue';

export interface DbStatus {
  connected: boolean;
  usingFallback: boolean;
  databaseName: string | null;
  errorMessage: string | null;
}
