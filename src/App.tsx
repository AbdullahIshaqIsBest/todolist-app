import React, { useState, useEffect, useMemo } from "react";
import { 
  Check, 
  Trash2, 
  Plus, 
  Search, 
  Calendar, 
  AlertCircle, 
  Database, 
  Wifi, 
  WifiOff, 
  Info, 
  X, 
  Tag, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Edit3, 
  Clock, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  ListTodo,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Todo, DbStatus, PriorityFilter, DateFilter } from "./types";

export default function App() {
  // Application State
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>({
    connected: false,
    usingFallback: true,
    databaseName: null,
    errorMessage: null
  });

  // Form State for creating a new todo
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("Personal");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>("medium");
  const [dueDate, setDueDate] = useState("");
  const [expandDetails, setExpandDetails] = useState(false);

  // Editing State
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>("all");
  const [filterDate, setFilterDate] = useState<DateFilter>("all");
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'active' | 'completed'>("all");
  
  // Sort State
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");

  // Show Atlas Info modal
  const [showGuide, setShowGuide] = useState(false);
  const [refreshingDb, setRefreshingDb] = useState(false);

  // List of pre-defined categories
  const categories = useMemo(() => ["all", "Personal", "Work", "Technical", "Shopping", "Health", "Urgent"], []);
  const formCategories = useMemo(() => ["Personal", "Work", "Technical", "Shopping", "Health", "Urgent"], []);

  // Fetch Database Status and Todos on Mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch status first
      const statusRes = await fetch("/api/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDbStatus(statusData);
      }

      // Fetch todos
      const todosRes = await fetch("/api/todos");
      if (todosRes.ok) {
        const todosData = await todosRes.json();
        setTodos(todosData);
      }
    } catch (err) {
      console.error("Error loading application state:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    setRefreshingDb(true);
    try {
      const statusRes = await fetch("/api/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDbStatus(statusData);
      }
    } catch (err) {
      console.error("Failed to refresh db connection status:", err);
    } finally {
      setTimeout(() => setRefreshingDb(false), 800);
    }
  };

  // Add Todo Handler
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    const newTodoPayload = {
      text: text.trim(),
      completed: false,
      category,
      priority,
      dueDate,
      notes: notes.trim(),
      id: Date.now().toString()
    };

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTodoPayload)
      });

      if (response.ok) {
        const savedTodo = await response.json();
        setTodos((prev) => [savedTodo, ...prev]);
        
        // Reset Creator Form
        setText("");
        setNotes("");
        setDueDate("");
        setPriority("medium");
        setCategory("Personal");
        setExpandDetails(false);
      }
    } catch (err) {
      console.error("Error creating todo:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Completed Handler
  const handleToggleComplete = async (todo: Todo) => {
    const updatedCompleted = !todo.completed;
    
    // Optimistic Update
    setTodos((prev) => prev.map(t => t.id === todo.id ? { ...t, completed: updatedCompleted } : t));

    try {
      await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: updatedCompleted })
      });
    } catch (err) {
      console.error("Failed to toggle completion:", err);
      // Rollback
      setTodos((prev) => prev.map(t => t.id === todo.id ? { ...t, completed: !updatedCompleted } : t));
    }
  };

  // Edit Todo Handler
  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !editingTodo.text.trim()) return;

    try {
      const response = await fetch(`/api/todos/${editingTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editingTodo.text,
          notes: editingTodo.notes,
          category: editingTodo.category,
          priority: editingTodo.priority,
          dueDate: editingTodo.dueDate
        })
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos((prev) => prev.map(t => t.id === updatedTodo.id ? updatedTodo : t));
        setEditingTodo(null);
      }
    } catch (err) {
      console.error("Error updating todo:", err);
    }
  };

  // Delete Todo Handler
  const handleDeleteTodo = async (todoId: string) => {
    // Optimistic update
    const previousTodos = [...todos];
    setTodos((prev) => prev.filter(t => t.id !== todoId));

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Delete failed server-side");
      }
    } catch (err) {
      console.error("Error deleting todo:", err);
      // Rollback
      setTodos(previousTodos);
    }
  };

  // Clean all filters
  const handleClearFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setFilterPriority("all");
    setFilterDate("all");
    setFilterCompleted("all");
  };

  // Filter & Sort Logic
  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos];

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(t => 
        t.text.toLowerCase().includes(term) || 
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter(t => t.category === filterCategory);
    }

    // Priority filter
    if (filterPriority !== "all") {
      result = result.filter(t => t.priority === filterPriority);
    }

    // Date range filter
    if (filterDate !== "all") {
      const today = new Date().toISOString().split('T')[0];
      const todayDate = new Date(today);
      
      result = result.filter(t => {
        if (!t.dueDate) return false;
        const taskDate = new Date(t.dueDate);
        
        if (filterDate === "today") {
          return t.dueDate === today;
        } else if (filterDate === "week") {
          const nextWeek = new Date(todayDate.getTime() + 7 * 86400000);
          return taskDate >= todayDate && taskDate <= nextWeek;
        } else if (filterDate === "overdue") {
          return taskDate < todayDate && !t.completed;
        }
        return true;
      });
    }

    // Completion filter
    if (filterCompleted !== "all") {
      result = result.filter(t => 
        filterCompleted === "completed" ? t.completed : !t.completed
      );
    }

    // Sort sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === "priority") {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        comparison = priorityWeight[a.priority] - priorityWeight[b.priority];
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [todos, search, filterCategory, filterPriority, filterDate, filterCompleted, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = todos.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, percent };
  }, [todos]);

  // Determine Priority styling
  const getPriorityStyle = (p: Todo['priority']) => {
    switch (p) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "low":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
    }
  };

  // Determine Category color accents
  const getCategoryColor = (cat: string) => {
    const defaultPalette = "bg-slate-100 text-slate-800 border-slate-200";
    const colors: Record<string, string> = {
      Personal: "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20",
      Work: "bg-indigo-50 text-indigo-700 border-indigo-200/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/20",
      Technical: "bg-purple-50 text-purple-700 border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20",
      Shopping: "bg-pink-50 text-pink-700 border-pink-200/50 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/20",
      Health: "bg-teal-50 text-teal-700 border-teal-200/50 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/20",
      Urgent: "bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/20"
    };
    return colors[cat] || defaultPalette;
  };

  // Human friendly Date labels
  const getDueDateLabel = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return "Today";
    
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === tomorrow) return "Tomorrow";

    // Format prettily
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-800 font-sans transition-colors duration-300">
      
      {/* Dynamic Header */}
      <header className="border-b border-gray-200/50 bg-[#F3F4F6]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
              <ListTodo className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display tracking-tight text-gray-900">TaskFlow</h1>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Database Connectivity Status Indicator */}
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => setShowGuide(true)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs cursor-pointer transition-all duration-200 hover:shadow-xs active:scale-97 ${
                dbStatus.connected 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" 
                  : "bg-amber-50 text-amber-800 border-amber-200/60"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbStatus.connected ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dbStatus.connected ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              </span>
              
              <div className="flex items-center gap-1">
                {dbStatus.connected ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-600" /> 
                    <span className="font-bold tracking-wide">Atlas Connected</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold">Local Session</span>
                  </>
                )}
              </div>
              <Info className="w-3.5 h-3.5 ml-0.5 text-slate-500/70" />
            </div>

            <button 
              onClick={fetchInitialData} 
              title="Refresh lists and connection status"
              className="p-2.5 rounded-2xl border border-gray-200 hover:bg-white text-gray-600 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Warning Toast if Fallback active */}
        {!dbStatus.connected && (
          <div className="mb-6 bg-amber-50/70 border border-amber-200/50 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-5.5 h-5.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-sm font-bold text-amber-900">Running with Local Memory Storage Fallback</span>
              <p className="text-xs text-amber-700/90 mt-1.5 leading-relaxed font-medium">
                Your activities are being preserved locally this session. To store permanently in your MongoDB Atlas cloud database, configure your connection secret.
              </p>
              <button 
                onClick={() => setShowGuide(true)}
                className="mt-3 text-xs font-bold text-indigo-800 hover:text-indigo-900 inline-flex items-center gap-1.5 outline-hidden border-b border-indigo-200 hover:border-indigo-900 transition-colors cursor-pointer"
              >
                Set up MongoDB Atlas Secrets <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Metric Dashboard Ribbons */}
        <div id="stats-dashboard" className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
          <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Total Tasks</span>
            <span className="text-4xl font-extrabold font-display text-gray-900 tracking-tight">{stats.total}</span>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Completed</span>
            <span className="text-4xl font-extrabold font-display text-indigo-600 tracking-tight">{stats.completed}</span>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Pending</span>
            <span className="text-4xl font-extrabold font-display text-gray-700 tracking-tight">{stats.pending}</span>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Overdue</span>
            <span className={`text-4xl font-extrabold font-display tracking-tight ${stats.overdue > 0 ? "text-rose-600" : "text-gray-300"}`}>
              {stats.overdue}
            </span>
          </div>

          <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-sm col-span-2 md:col-span-1 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest block mb-1">Progress</span>
                <span className="text-3xl font-extrabold font-display text-white tracking-tight">{stats.percent}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden mt-4">
                <motion.div 
                  className="bg-white h-full rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.percent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-indigo-500/30 group-hover:scale-110 transition-transform duration-300"></div>
          </div>
        </div>

        {/* Bento Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEPANEL: Filter Deck, Settings Card */}
          <section className="lg:col-span-4 space-y-6">
            
            {/* Filter Deck */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Active Filters</h3>
                </div>
                {(search || filterCategory !== "all" || filterPriority !== "all" || filterDate !== "all" || filterCompleted !== "all") && (
                  <button 
                    onClick={handleClearFilters}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-500 px-2.5 py-1 rounded-xl hover:bg-rose-50 transition-all active:scale-95 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Text Search BAR */}
              <div className="relative mb-5">
                <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Query tasks or notes..."
                  className="w-full text-sm pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter By Status Tab buttons */}
              <div className="mb-5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Completion</label>
                <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1.5 rounded-2xl">
                  {['all', 'active', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterCompleted(status as any)}
                      className={`text-xs py-2 font-bold rounded-xl capitalize transition-all cursor-pointer ${
                        filterCompleted === status
                          ? "bg-white text-gray-900 shadow-xs"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="mb-5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const count = cat === "all" 
                      ? todos.length 
                      : todos.filter(t => t.category === cat).length;
                    
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          filterCategory === cat
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="capitalize">{cat}</span>
                        <span className={`text-[9px] font-bold items-center justify-center px-1.5 py-0.5 rounded-md ${
                          filterCategory === cat ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 border border-gray-150"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Filter Selection */}
              <div className="mb-5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Due Date Range</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: 'Due Today' },
                    { id: 'week', label: 'Next 7 Days' },
                    { id: 'overdue', label: 'Overdue Only' }
                  ].map((df) => (
                    <button
                      key={df.id}
                      onClick={() => setFilterDate(df.id as any)}
                      className={`text-xs py-2 px-3.5 border rounded-2xl font-bold text-left transition-all cursor-pointer ${
                        filterDate === df.id
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs font-bold"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Selection Filter */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Priority</label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'high', label: 'High' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'low', label: 'Low' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setFilterPriority(p.id as any)}
                      className={`text-xs px-2.5 py-2 border rounded-xl flex-1 justify-center text-center font-bold transition-all cursor-pointer ${
                        filterPriority === p.id 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300 text-gray-650"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick MongoDB Atlas Status Mini Card */}
            <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 border border-gray-800 shadow-md relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5">
                <Database className="w-36 h-36" />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-indigo-400" />
                <h4 className="font-extrabold text-sm tracking-tight text-white">MongoDB Atlas Database</h4>
              </div>

              {dbStatus.connected ? (
                <>
                  <p className="text-xs text-gray-300 mb-4 font-medium leading-relaxed">
                    Your tasks list is synchronized with your Atlas Cloud Database <span className="font-mono text-indigo-300 bg-indigo-950/45 px-1.5 py-0.5 rounded">"{dbStatus.databaseName}"</span>.
                  </p>
                  <div className="text-xs flex gap-2">
                    <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-3 py-1 rounded-xl flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5" /> Persistent Active
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-300 mb-4 leading-relaxed font-semibold">
                    Local preview mode. Connect your premium cluster string to safely persist tasks across any deployment.
                  </p>
                  <button 
                    onClick={() => setShowGuide(true)}
                    className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/15"
                  >
                    Setup MongoDB Credentials <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

          </section>

          {/* RIGHT PANELS: Add Todo Form & List view */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Creator Form */}
            <form onSubmit={handleAddTodo} className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">
              
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What is your next goal?" 
                  className="flex-1 font-sans text-sm md:text-base text-slate-900 placeholder:text-slate-400 border-none px-0 focus:outline-none focus:ring-0 outline-hidden"
                  required
                />

                <div className="flex items-center gap-1.5">
                  {/* Expand notes & details toggler */}
                  <button
                    type="button"
                    onClick={() => setExpandDetails(!expandDetails)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      expandDetails || notes.trim() || dueDate 
                        ? "bg-slate-950 border-slate-900 text-white" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Options</span>
                  </button>

                  <button 
                    type="submit"
                    disabled={submitting || !text.trim()}
                    className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:hover:bg-teal-600 px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-97"
                  >
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                </div>
              </div>

              {/* Expanded details drawers (smooth height animation) */}
              <AnimatePresence>
                {(expandDetails || notes.trim() || dueDate) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-gray-100 pt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Priority Selector */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Priority</label>
                        <div className="flex gap-1.5">
                          {(['low', 'medium', 'high'] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPriority(p)}
                              className={`flex-1 text-[11px] font-bold py-1.5 px-2 border rounded-xl capitalize select-none text-center transition-all cursor-pointer ${
                                priority === p 
                                  ? p === "high" 
                                    ? "bg-rose-50 border-rose-500 text-rose-700"
                                    : p === "medium"
                                      ? "bg-amber-50 border-amber-500 text-amber-700"
                                      : "bg-emerald-50 border-emerald-500 text-emerald-700"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category Selector */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full text-xs py-1.5 px-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer font-semibold text-gray-700"
                        >
                          {formCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Due Date Picker */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Due Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full text-xs py-1.5 pr-2 pl-8 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer font-semibold text-gray-700"
                          />
                          <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                    </div>

                    {/* Expand notes text editor */}
                    <div className="mt-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Supplementary Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add additional task specifics or comments..."
                        rows={2}
                        className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none resize-none placeholder:text-gray-450 font-medium"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </form>

            {/* main Todo lists holder */}
            <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">
              
              {/* Filter feedback, Sort deck & Headings */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5 mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-sm tracking-tight text-gray-900 font-display">Task List</h2>
                  <span className="text-xs text-gray-400 font-bold font-mono">({filteredAndSortedTodos.length})</span>
                </div>

                {/* Sorter toggles */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpDown className="w-3 h-3" /> Sort:
                  </span>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-1.5 text-gray-600 focus:outline-none cursor-pointer font-bold hover:bg-white transition-all shadow-2xs"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority weight</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 text-gray-500 transition-all cursor-pointer font-bold font-mono text-xs shadow-2xs px-2.5 py-1.5"
                    title={sortOrder === "asc" ? "Sort Ascending" : "Sort Descending"}
                  >
                    <span>{sortOrder}</span>
                  </button>
                </div>
              </div>

              {/* Lists cards rendering */}
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2.5">
                  <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                  <p className="text-sm font-bold text-gray-500">Retrieving synchronized records...</p>
                </div>
              ) : filteredAndSortedTodos.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-gray-200 rounded-[2rem] px-5">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-900 font-display">No matching activities found</h3>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-sm mx-auto font-medium">
                    {todos.length === 0 
                      ? "Create your first task using the goal input form above! Your list is empty."
                      : "Try clearing search keywords or active categorical tags to view locked records."
                    }
                  </p>
                  {todos.length > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-5 text-xs font-bold px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 text-gray-600 transition-all cursor-pointer shadow-2xs"
                    >
                      Reset Filter deck
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {filteredAndSortedTodos.map((todo) => {
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = todo.dueDate && todo.dueDate < today && !todo.completed;

                      return (
                        <motion.div
                          key={todo.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          id={`todo-card-${todo.id}`}
                          className={`p-5 border rounded-[2rem] flex items-start gap-4 group/card transition-all relative ${
                            todo.completed 
                              ? "bg-gray-50/40 border-gray-250/50 opacity-60" 
                              : "bg-white border-gray-200 hover:border-gray-250 hover:shadow-md duration-200"
                          }`}
                        >
                          {/* Checked box selector button */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(todo)}
                            id={`check-button-${todo.id}`}
                            className={`w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              todo.completed
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-gray-300 hover:border-indigo-500 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </button>

                          {/* Task Text & notes, tags column */}
                          <div className="flex-1 min-w-0">
                            
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              
                              {/* Category tag */}
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md border ${getCategoryColor(todo.category)}`}>
                                {todo.category}
                              </span>

                              {/* Priority pill */}
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md border ${getPriorityStyle(todo.priority)}`}>
                                {todo.priority}
                              </span>

                              {/* Due Date Indicator */}
                              {todo.dueDate && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md border inline-flex items-center gap-1 font-bold ${
                                  isOverdue 
                                    ? "bg-rose-55 text-rose-700 animate-pulse border-rose-200" 
                                    : "bg-gray-100 border-gray-200 text-gray-500"
                                }`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{getDueDateLabel(todo.dueDate)}</span>
                                  {isOverdue && <span className="font-extrabold text-[8px] uppercase tracking-wider ml-0.5">Overdue</span>}
                                </span>
                              )}

                            </div>

                            <p className={`text-sm sm:text-base select-none break-words font-extrabold transition-all tracking-tight ${
                              todo.completed 
                                ? "text-gray-400 line-through decoration-indigo-600/40 decoration-2 decoration-solid" 
                                : "text-gray-900"
                            }`}>
                              {todo.text}
                            </p>

                            {todo.notes && (
                              <p className={`text-xs mt-1 leading-relaxed font-medium ${
                                todo.completed ? "text-gray-400/80 line-through" : "text-gray-500"
                              }`}>
                                {todo.notes}
                              </p>
                            )}

                            {/* Relative creation time (visible on hover) */}
                            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-gray-300 group-hover/card:text-gray-400 transition-colors">
                              <span>Added: {new Date(todo.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                            </div>

                          </div>

                          {/* Quick editing & deleting tool button lists */}
                          <div className="flex items-center gap-1 shrink-0 self-start">
                            
                            <button
                              type="button"
                              onClick={() => setEditingTodo(todo)}
                              id={`edit-button-${todo.id}`}
                              className="p-2 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 text-gray-400 hover:text-gray-755 transition-all cursor-pointer shadow-2xs"
                              title="Edit task details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTodo(todo.id)}
                              id={`delete-button-${todo.id}`}
                              className="p-2 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-rose-100 text-gray-400 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
                              title="Delete task permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>

                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

            </div>

          </section>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200/50 bg-[#F3F4F6] mt-16 py-12 text-center text-gray-400 text-xs font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-bold tracking-tight">&copy; {new Date().getFullYear()} TaskFlow Dashboard. Server + Client MongoDB integration.</p>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowGuide(true)}
              className="text-gray-500 hover:text-indigo-600 transition-colors outline-hidden font-bold inline-flex items-center gap-1.5 cursor-pointer bg-white px-4 py-2 border border-gray-200 rounded-xl shadow-2xs"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500/70" /> Help & Configuration
            </button>
          </div>
        </div>
      </footer>

      {/* SLIDE-OVER DRAWER MODAL: MongoDB Atlas connection instructions and credentials configuration */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            
            {/* Overlay backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuide(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide over sheet */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl h-full"
              >
                
                {/* Header inside slide-over */}
                <div className="px-5 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4.5 h-4.5 text-indigo-600" />
                    <h3 className="font-extrabold text-gray-950 font-display">MongoDB Atlas Connection Guide</h3>
                  </div>
                  <button 
                    onClick={() => setShowGuide(false)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content body inside slide-over */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  
                  {/* Status Indicator inside Panel */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    dbStatus.connected 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" 
                      : "bg-amber-50 text-amber-800 border-amber-200/60"
                  }`}>
                    {dbStatus.connected ? (
                      <Wifi className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide block">Current Service Mode</span>
                      <strong className="text-sm font-bold block mt-0.5">
                        {dbStatus.connected ? "Atlas Cloud Active" : "Local Memory Storage Fallback"}
                      </strong>
                      <p className="text-xs mt-1 opacity-90 leading-relaxed font-semibold">
                        {dbStatus.connected 
                          ? `Synchronizing securely on cluster Database: "${dbStatus.databaseName}". Work is saved permanently.` 
                          : dbStatus.errorMessage && !dbStatus.errorMessage.includes("MONGODB_URI is not set")
                            ? "Database URL was successfully loaded from Secrets, but the connection could not be established. Reverting to local fallback."
                            : "Connection URL not found in environment secrets. App reverted to in-memory mode to ensure uptime."
                        }
                      </p>
                      {dbStatus.errorMessage && (
                        <div className="mt-2 text-[11px] font-mono p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200/50 break-words">
                          <span className="font-bold block mb-1">Diagnostic Log:</span>
                          {dbStatus.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Setup Instructions</h4>
                    
                    <div className="space-y-4 text-xs leading-relaxed text-gray-650">
                      
                      <div className="flex gap-2.5">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 flex items-center justify-center font-bold">1</span>
                        <div className="font-semibold">
                          <p className="font-bold text-gray-900 mb-0.5">Generate your Cluster</p>
                          Log in to the <a href="https://cloud.mongodb.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5">MongoDB Atlas Dashboard <ExternalLink className="w-2.5 h-2.5" /></a> and spawn a free Shared Cluster.
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 flex items-center justify-center font-bold">2</span>
                        <div className="font-semibold">
                          <p className="font-bold text-gray-900 mb-0.5">Allow IP Access</p>
                          In Atlas sidebar, click <strong className="text-gray-800 font-bold">Network Access</strong> and click <strong className="text-gray-800 font-bold">Add IP Address</strong>. Choose <strong className="text-gray-800 font-bold">"Allow Access From Anywhere" (0.0.0.0/0)</strong> so Cloud Run containers can connect.
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 flex items-center justify-center font-bold">3</span>
                        <div className="font-semibold">
                          <p className="font-bold text-gray-900 mb-0.5">Create Database User</p>
                          Navigate to <strong className="text-gray-800 font-bold">Database Access</strong> and assign a user with password-based authentication permissions.
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 flex items-center justify-center font-bold">4</span>
                        <div className="font-semibold">
                          <p className="font-bold text-gray-900 mb-0.5">Get Connection String</p>
                          Click <strong className="text-gray-800 font-bold">Database</strong> &gt; <strong className="text-gray-800 font-bold">Connect</strong>. Choose <strong className="text-gray-800 font-bold">"Drivers" (Node.js)</strong>. Copy the connection string format:
                          <div className="mt-1.5 p-2 bg-gray-50 rounded-lg text-[10.5px] font-mono text-gray-800 overflow-x-auto select-all border border-gray-150">
                            mongodb+srv://&lt;username&gt;:&lt;password&gt;@&lt;cluster&gt;.mongodb.net/taskflow?retryWrites=true&amp;w=majority
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 flex-none">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 flex items-center justify-center font-bold">5</span>
                        <div className="flex-1 font-semibold">
                          <p className="font-bold text-gray-900 mb-0.5">Define environment variable secret</p>
                          Open the <strong className="text-gray-800 font-bold">Secrets</strong> panel in Google AI Studio, add a secret named:
                          <div className="my-1.5 p-1 px-2.5 bg-gray-900 text-white inline-block rounded-lg font-mono text-[11px] uppercase tracking-wide">
                            MONGODB_URI
                          </div>
                          Paste your string, substituting <code className="text-gray-950 font-bold">&lt;password&gt;</code> with your actual user password.
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <button 
                      onClick={() => {
                        setShowGuide(false);
                        checkConnectionStatus();
                      }}
                      className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/15"
                    >
                      <span>Reset and Test Connection State</span>
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingDb ? "animate-spin" : ""}`} />
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-2 font-medium">
                      After adding environment variables, AI Studio may take a brief moment to cycle the services container.
                    </p>
                  </div>

                </div>

              </motion.div>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* INLINE EDIT MODAL POPUP */}
      <AnimatePresence>
        {editingTodo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTodo(null)}
              className="absolute inset-0 bg-[#111827]/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 shadow-2xl rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 space-y-4"
            >
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-extrabold font-display text-gray-950 flex items-center gap-1.5">
                  <Edit3 className="w-4.5 h-4.5 text-indigo-600" /> Edit Task Details
                </h3>
                <button 
                  onClick={() => setEditingTodo(null)}
                  className="p-1 px-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTodo} className="space-y-4 text-left">
                
                {/* Text task description */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Task description</label>
                  <input
                    type="text"
                    value={editingTodo.text}
                    onChange={(e) => setEditingTodo({ ...editingTodo, text: e.target.value })}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-gray-50/50 focus:bg-white outline-none font-bold text-gray-800"
                    required
                  />
                </div>

                {/* Grid inputs for tags, priorities, dates */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Category select tag */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Category</label>
                    <select
                      value={editingTodo.category}
                      onChange={(e) => setEditingTodo({ ...editingTodo, category: e.target.value })}
                      className="w-full text-xs p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-gray-750 cursor-pointer"
                    >
                      {formCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority selector */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Priority</label>
                    <select
                      value={editingTodo.priority}
                      onChange={(e) => setEditingTodo({ ...editingTodo, priority: e.target.value as any })}
                      className="w-full text-xs p-2.5 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-gray-750 cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Due Date picker input */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Due Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={editingTodo.dueDate || ""}
                        onChange={(e) => setEditingTodo({ ...editingTodo, dueDate: e.target.value })}
                        className="w-full text-xs pr-2 pl-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-gray-750 cursor-pointer"
                      />
                      <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                </div>

                {/* Inner Notes description content */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Notes</label>
                  <textarea
                    value={editingTodo.notes || ""}
                    onChange={(e) => setEditingTodo({ ...editingTodo, notes: e.target.value })}
                    placeholder="Add extra tasks details..."
                    rows={3}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none resize-none font-medium text-gray-700"
                  />
                </div>

                {/* Submission action buttons */}
                <div className="flex gap-2 border-t border-gray-100 pt-5 flex-none justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingTodo(null)}
                    className="text-xs font-bold px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-650 cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold rounded-xl transition-all select-none active:scale-97 cursor-pointer shadow-sm shadow-indigo-500/15"
                  >
                    Save Changes
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
