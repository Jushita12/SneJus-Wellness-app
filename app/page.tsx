'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Home, 
  SquarePlus, 
  Users, 
  ChartBar, 
  Settings, 
  Droplets, 
  Zap, 
  Calendar, 
  ArrowRight,
  UserCircle,
  CircleCheck,
  ChevronRight,
  Utensils,
  Heart,
  MessageCircle,
  TrendingUp,
  Award,
  ClipboardCheck,
  Moon,
  Sun,
  Flame,
  Medal,
  Sparkles,
  Dumbbell,
  Leaf,
  Timer,
  Bell,
  CheckCircle2,
  CloudDownload,
  ShieldCheck,
  Database,
  RefreshCw,
  Pencil,
  Trash2,
  Undo2,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storage, DailyLog, Meal } from '@/lib/storage';
import { estimateCalories, getCoachFeedback, estimateBurnedCalories } from '@/lib/calorie-engine';
import toast from 'react-hot-toast';

// WhatsApp-style Notification Component
const WhatsAppNotification = ({ title, message, icon: Icon }: { title: string, message: string, icon: any }) => (
  <div className="w-[340px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 p-3 flex gap-3 animate-in slide-in-from-top-10 duration-500">
    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shadow-inner">
      <Icon size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{title}</span>
        <span className="text-[10px] text-gray-400">now</span>
      </div>
      <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
        {message}
      </p>
    </div>
  </div>
);

// Types for our self-contained data model
type UserProfile = {
  name: 'Jushita' | 'Sneha';
  focus: string;
  symptoms: string[];
};

export default function App() {
  const [activeUser, setActiveUser] = useState<'Jushita' | 'Sneha'>('Jushita');
  const [activeTab, setActiveTab] = useState('home');
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [mealInput, setMealInput] = useState('');
  const [reminder, setReminder] = useState<{ icon: any, text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleSettings, setCycleSettings] = useState<any>(null);
  const [isCycleOnboarding, setIsCycleOnboarding] = useState(false);
  
  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    defaultValue: string;
    type: 'text' | 'number';
    onConfirm: (value: string) => void;
  } | null>(null);

  // Undo State
  const [lastDeleted, setLastDeleted] = useState<{ type: 'meal' | 'activity', data: any } | null>(null);

  // Use a stable date string that won't change between server and client render
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    setMounted(true);
    setTodayStr(new Date().toISOString().split('T')[0]);
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const fetchData = async () => {
    if (!selectedDate) return;
    setLoading(true);
    
    try {
      const settings = await storage.getCycleSettings(activeUser);
      setCycleSettings(settings);
      
      const log = await storage.getLog(activeUser, selectedDate);
      
      // SYNC LOGIC: If log exists but cycle_day is missing, calculate it from settings
      if (log && !log.cycle_day && settings?.last_period_start) {
        const start = new Date(settings.last_period_start);
        const current = new Date(selectedDate);
        const diffTime = Math.abs(current.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) % (settings.cycle_length || 28);
        log.cycle_day = diffDays === 0 ? settings.cycle_length : diffDays;
      }
      
      setTodayLog(log); 
      setLastUpdated(new Date());
      
      if (!settings && activeTab === 'home') setIsCycleOnboarding(true);

      // Fetch 30 days of history for the stats and archive
      const historyData = await storage.getHistory(activeUser, 30);
      setHistory(historyData);

      Promise.all([
        storage.getFeed().then(setFeed).catch(console.error),
        storage.getUserProfile(activeUser).then(setProfile).catch(console.error)
      ]);

    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && selectedDate) {
      fetchData();

      // Set up Realtime Subscriptions for instant sync across devices
      const supabase = storage.getClient(); // I'll add this helper to storage.ts
      
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_logs' },
          () => fetchData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meals' },
          () => fetchData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activities' },
          () => fetchData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeUser, selectedDate, mounted]); // Removed activeTab to prevent redundant fetches on tab switch

  useEffect(() => {
    const checkReminders = () => {
      if (!todayLog) return;

      const hour = new Date().getHours();
      const meals = todayLog.meals || [];
      const hasMovement = (todayLog.activities?.length || 0) > 0;
      const water = todayLog.water || 0;

      // Breakfast (7-10 AM)
      if (hour >= 7 && hour < 10 && !meals.some(m => m.type === 'Breakfast')) {
        setReminder({ icon: Utensils, text: "Time for a protein-rich breakfast, sister! 🍳" });
      }
      // Lunch (12-2 PM)
      else if (hour >= 12 && hour < 14 && !meals.some(m => m.type === 'Lunch')) {
        setReminder({ icon: Utensils, text: "Lunch time! Remember, rice is okay now. 🍚" });
      }
      // Movement (4-7 PM)
      else if (hour >= 16 && hour < 19 && !hasMovement) {
        setReminder({ icon: Dumbbell, text: "How about a quick 15-min walk or gym session? 💪" });
      }
      // Water (Anytime if low)
      else if (water < 4) {
        setReminder({ icon: Droplets, text: "You're a bit low on water. Take a sip! 💧" });
      }
      // Dinner (7-9 PM)
      else if (hour >= 19 && hour < 21 && !meals.some(m => m.type === 'Dinner')) {
        setReminder({ icon: Utensils, text: "Dinner time. Let's keep it light and grain-free. 🥗" });
      }
      else {
        setReminder(null);
      }
    };

    const timer = setInterval(checkReminders, 60000); // Check every minute
    checkReminders();
    return () => clearInterval(timer);
  }, [todayLog]);

  // Trainer Notification Logic
  useEffect(() => {
    const sendNotification = (title: string, message: string, icon: any) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <WhatsAppNotification title={title} message={message} icon={icon} />
        </div>
      ));
    };

    const checkTrainerNudges = () => {
      if (!todayLog) return;

      const hour = new Date().getHours();
      const meals = todayLog.meals || [];
      const water = todayLog.water || 0;
      const steps = todayLog.steps || 0;

      // 1. Water Reminders (Trainer Logic: Supportive & Educational)
      if (hour >= 9 && hour <= 21 && hour % 3 === 0) {
        if (water < 8) {
          sendNotification(
            "Hydration Check-in 💧",
            `How's your energy, ${activeUser}? A glass of water now can help clear any brain fog and keep your metabolism steady. Your body will thank you!`,
            Droplets
          );
        }
      }

      // 2. Meal Reminders (Trainer Logic: Focus on Hormones & Satiety)
      if (hour === 9 && !meals.some(m => m.type === 'Breakfast')) {
        sendNotification(
          "Morning Fuel 🍳",
          "Time to break the fast? Prioritizing protein now will help prevent those afternoon sugar cravings. Listen to your hunger cues.",
          Utensils
        );
      }

      if (hour === 13 && !meals.some(m => m.type === 'Lunch')) {
        sendNotification(
          "Mid-day Balance 🍚",
          "Lunch is your main energy source. Enjoy your meal—if you're having rice, pair it with plenty of fiber and protein for a steady energy release.",
          Utensils
        );
      }

      // 3. Movement Nudge (Trainer Logic: Low Pressure, High Support)
      if (hour === 17 && steps < 5000) {
        sendNotification(
          "Gentle Movement 🏃‍♀️",
          "Feeling a bit stagnant? A short, 10-minute stroll can do wonders for your stress hormones and digestion. No need for a heavy session if you're not feeling it.",
          Flame
        );
      }
    };

    // Initial check and then every hour
    checkTrainerNudges();
    const interval = setInterval(checkTrainerNudges, 3600000);
    return () => clearInterval(interval);
  }, [todayLog]);

  const updateLog = async (updates: Partial<DailyLog>) => {
    if (!todayLog) {
      // If no log exists for today yet, create one first
      await storage.saveLog(activeUser, { ...updates, date: selectedDate });
      const freshLog = await storage.getLog(activeUser, selectedDate);
      setTodayLog(freshLog);
    } else {
      const updated = { ...todayLog, ...updates };
      setTodayLog(updated); // Optimistic update
      await storage.saveLog(activeUser, { ...updates, date: selectedDate });
    }
    
    // Trigger streak/badge logic on any meaningful update
    if (updates.water || updates.steps || updates.mood || updates.symptoms) {
      await storage.updateStreakAndBadges(activeUser, updates);
      const newProfile = await storage.getUserProfile(activeUser);
      setProfile(newProfile);
    }
    
    // Refresh history if needed
    if (activeTab === 'stats') {
      const historyData = await storage.getHistory(activeUser, 30);
      setHistory(historyData);
    }
  };

  const addMeal = async (meal: Omit<Meal, 'id' | 'log_id' | 'created_at'>) => {
    if (!todayLog) return;
    
    // Ensure log exists in DB first
    if (!todayLog.id) {
      await storage.saveLog(activeUser, { date: selectedDate });
      const freshLog = await storage.getLog(activeUser, selectedDate);
      if (freshLog) {
        await storage.addMeal(freshLog.id, meal);
      }
    } else {
      await storage.addMeal(todayLog.id, meal);
    }
    fetchData(); // Refresh to get the new meal and ID
  };

  const handleAddMeal = async (type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack') => {
    if (!mealInput) return;
    
    const { total, items } = estimateCalories(mealInput);
    
    await addMeal({
      type,
      description: mealInput,
      calories: total,
      has_rice: mealInput.toLowerCase().includes('rice') && type === 'Lunch',
      is_non_veg: mealInput.toLowerCase().includes('chicken') || mealInput.toLowerCase().includes('fish') || mealInput.toLowerCase().includes('egg')
    });
    
    setMealInput('');
    setIsLoggingMeal(false);
  };

  const handleAddActivityFlow = () => {
    setModalConfig({
      isOpen: true,
      title: "What exercise?",
      placeholder: "Gym, Walk, Yoga, HIIT...",
      defaultValue: "",
      type: 'text',
      onConfirm: (type) => {
        if (!type) return setModalConfig(null);
        setModalConfig({
          isOpen: true,
          title: "How many minutes?",
          placeholder: "30",
          defaultValue: "30",
          type: 'number',
          onConfirm: (dur) => {
            if (!dur) return setModalConfig(null);
            handleAddActivity(type, parseInt(dur));
            setModalConfig(null);
          }
        });
      }
    });
  };

  const handleAddActivity = async (type: string, duration: number) => {
    if (!todayLog) return;
    
    const weight = todayLog.weight || 65;
    const estimatedBurned = estimateBurnedCalories(type, duration, weight);
    
    setModalConfig({
      isOpen: true,
      title: "Calories Burned",
      placeholder: `Estimate: ${estimatedBurned} kcal`,
      defaultValue: estimatedBurned.toString(),
      type: 'number',
      onConfirm: async (manualBurned) => {
        const finalBurned = manualBurned ? parseInt(manualBurned) : estimatedBurned;
        
        if (!todayLog.id) {
          await storage.saveLog(activeUser, { date: selectedDate });
          const freshLog = await storage.getLog(activeUser, selectedDate);
          if (freshLog) await storage.addActivity(freshLog.id, { type, duration, calories_burned: finalBurned });
        } else {
          await storage.addActivity(todayLog.id, { type, duration, calories_burned: finalBurned });
        }

        toast.success(`Great work! You burned ~${finalBurned} kcal! 🔥`);
        await storage.updateStreakAndBadges(activeUser, {}, true);
        fetchData();
        setModalConfig(null);
      }
    });
  };

  const handleDeleteMeal = async (meal: Meal) => {
    setLastDeleted({ type: 'meal', data: meal });
    await storage.deleteMeal(meal.id);
    toast.success("Meal deleted");
    fetchData();
  };

  const handleEditMeal = async (meal: Meal) => {
    setModalConfig({
      isOpen: true,
      title: "Edit Meal",
      placeholder: "What did you eat?",
      defaultValue: meal.description,
      type: 'text',
      onConfirm: async (newDesc) => {
        if (newDesc) {
          const { total } = estimateCalories(newDesc);
          await storage.updateMeal(meal.id, { description: newDesc, calories: total });
          fetchData();
        }
        setModalConfig(null);
      }
    });
  };

  const handleDeleteActivity = async (activity: any) => {
    setLastDeleted({ type: 'activity', data: activity });
    await storage.deleteActivity(activity.id);
    toast.success("Activity deleted");
    fetchData();
  };

  const handleRestoreData = async () => {
    setIsSyncing(true);
    try {
      const allLogs = await storage.syncAllData(activeUser);
      setHistory(allLogs);
      // Update today's log if it exists in the synced data
      const today = allLogs.find(l => l.date === selectedDate);
      if (today) setTodayLog(today);
      toast.success("Data recovered from Cloud! ☁️");
    } catch (e) {
      toast.error("Failed to sync data.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePriorityClick = (title: string) => {
    if (title === "Cycle Tracker") {
      setModalConfig({
        isOpen: true,
        title: "Cycle Update",
        placeholder: "Cycle Day (e.g. 1, 14, 28)",
        defaultValue: todayLog?.cycle_day?.toString() || "",
        type: 'number',
        onConfirm: (day) => {
          const isPeriod = confirm("Is your period active today? 🩸");
          updateLog({ cycle_day: day ? parseInt(day) : null, is_period: isPeriod });
          setModalConfig(null);
        }
      });
    } else if (title === "Sick Day Log") {
      setModalConfig({
        isOpen: true,
        title: "How are you feeling?",
        placeholder: "Cold, Cough, Tired, Fever...",
        defaultValue: todayLog?.sick_notes || "",
        type: 'text',
        onConfirm: (notes) => {
          updateLog({ is_sick: !!notes, sick_notes: notes });
          if (notes) toast.success("Rest up, sister! Health first. 🍵");
          setModalConfig(null);
        }
      });
    } else if (title === "Self Care Log" || title === "Comfort Tracker") {
      setModalConfig({
        isOpen: true,
        title: "How are you feeling?",
        placeholder: "Any cravings? (e.g. Cake, Sweets, Salty)",
        defaultValue: todayLog?.sugar_cravings || "",
        type: 'text',
        onConfirm: (craving) => {
          updateLog({ sugar_cravings: craving });
          setModalConfig(null);
        }
      });
    }
  };

  const handleCycleOnboarding = async (data: any) => {
    await storage.saveCycleSettings(activeUser, data);
    setCycleSettings(data);
    setIsCycleOnboarding(false);
    toast.success("Cycle settings saved. We'll use these to provide gentle estimates.");
  };

  const openCycleLogger = () => {
    setModalConfig({
      isOpen: true,
      title: "Daily Cycle Log",
      placeholder: "Would you like to log anything today?",
      defaultValue: "",
      type: 'text',
      onConfirm: () => {
        // This is a trigger for a more complex flow
        setModalConfig(null);
        showCycleFlow();
      }
    });
  };

  const showCycleFlow = () => {
    const options = [
      { label: "Period Started", value: "start" },
      { label: "Period Ended", value: "end" },
      { label: "Flow Level", value: "flow" },
      { label: "Symptoms", value: "symptoms" },
      { label: "Mood", value: "mood" },
      { label: "Nothing today", value: "none" }
    ];

    setModalConfig({
      isOpen: true,
      title: "What would you like to log?",
      placeholder: "Select an option...",
      defaultValue: "",
      type: 'text',
      onConfirm: async (val) => {
        const choice = val.toLowerCase();
        if (choice.includes("start")) {
          // SYNC: Update both the daily log AND the master cycle settings
          await updateLog({ is_period: true, cycle_day: 1 });
          await storage.saveCycleSettings(activeUser, { 
            ...cycleSettings, 
            last_period_start: selectedDate 
          });
          toast.success("Period started! Cycle settings updated. 🩸");
        } 
        else if (choice.includes("end")) {
          await updateLog({ is_period: false });
        }
        else if (choice.includes("flow")) {
          const level = prompt("Flow level: Light, Medium, Heavy, or Spotting?");
          if (level) updateLog({ flow_level: level });
        }
        else if (choice.includes("symptom")) {
          const list = ["Cramps", "Headache", "Bloating", "Fatigue", "Breast tenderness", "Acne", "Nausea", "Back pain"];
          const selected = prompt(`Select symptoms (comma separated): ${list.join(", ")}`);
          if (selected) updateLog({ symptoms: selected.split(",").map(s => s.trim()) });
        }
        else if (choice.includes("mood")) {
          const m = prompt("How is your mood today?");
          if (m) updateLog({ mood: m });
        }
        setModalConfig(null);
      }
    });
  };

  const users: Record<'Jushita' | 'Sneha', UserProfile> = {
    Jushita: {
      name: 'Jushita',
      focus: 'Wellness Journey',
      symptoms: ['Routine Check', 'Skin Check', 'Cravings'],
    },
    Sneha: {
      name: 'Sneha',
      focus: 'Daily Balance',
      symptoms: ['Comfort Check', 'Energy Level', 'Habit Check'],
    }
  };

  const currentUser = users[activeUser];

  // Enhanced Progress Calculation
  const progressStats = useCallback(() => {
    if (!history.length) return null;
    
    // Weekly (Last 7 logs)
    const weeklyLogs = history.slice(0, 7);
    const avgCaloriesWeekly = Math.round(weeklyLogs.reduce((acc, log) => acc + (log.calories_consumed || 0), 0) / weeklyLogs.length);
    
    // Monthly (Last 30 logs)
    const totalCaloriesMonthly = history.reduce((acc, log) => acc + (log.calories_consumed || 0), 0);
    const avgCaloriesMonthly = Math.round(totalCaloriesMonthly / history.length);
    
    const movementDays = history.filter(log => log.activities && log.activities.length > 0).length;
    
    // Weight Loss Calculation
    const weightEntries = history
      .filter(log => log.weight && log.weight > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let weightLoss = 0;
    let startingWeight = 0;
    let currentWeight = 0;

    if (weightEntries.length >= 2) {
      startingWeight = weightEntries[0].weight || 0;
      currentWeight = weightEntries[weightEntries.length - 1].weight || 0;
      weightLoss = Number((startingWeight - currentWeight).toFixed(1));
    }

    const weightTrend = [...weightEntries].reverse().slice(0, 7);

    let insight = "You're building a great rhythm! Consistency is your superpower.";
    if (weightLoss > 0) insight = `You've lost ${weightLoss}kg since your first log this month! Your dedication is paying off. 🌟`;
    else if (movementDays >= 15) insight = "15+ days of movement this month! You're building incredible metabolic health. 🔥";

    return {
      avgCaloriesWeekly,
      avgCaloriesMonthly,
      movementDays,
      weightTrend,
      weightLoss,
      startingWeight,
      currentWeight,
      insight,
      totalLogs: history.length
    };
  }, [history]);

  const stats = progressStats();

  // Prevent hydration mismatch by not rendering the dynamic parts until mounted
  if (!mounted) return <div className="mobile-container bg-white dark:bg-neutral-900" />;

  return (
    <div className="mobile-container">
      {/* Smart Reminder Banner */}
      <AnimatePresence>
        {reminder && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#6B8E6B]/10 border-b border-[#6B8E6B]/10 overflow-hidden"
          >
            <div className="px-6 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm">
                <reminder.icon size={16} className="text-[#6B8E6B]" />
              </div>
              <p className="text-xs font-medium text-[#4A634A] dark:text-[#8FB38F]">
                {reminder.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-6 pb-2 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#6B8E6B] border-none p-0 focus:ring-0 cursor-pointer"
            />
            {lastUpdated && (
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                • Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentUser.name}</h1>
          {profile && profile.streak_count! > 0 && (
            <div className="flex items-center gap-1.5 mt-1 text-[#6B8E6B] dark:text-[#8FB38F] font-semibold text-sm">
              <Sparkles size={14} />
              <span>{profile.streak_count} day wellness rhythm</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-full text-gray-600 dark:text-gray-300"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={() => setActiveUser(activeUser === 'Jushita' ? 'Sneha' : 'Jushita')}
            className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300"
          >
            <UserCircle size={16} />
            {activeUser === 'Jushita' ? 'Sneha' : 'Jushita'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B8E6B]"></div>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <div className="space-y-6 mt-4">
                {/* Cycle Onboarding Overlay */}
                {isCycleOnboarding && (
                  <section className="card border-2 border-pink-200 bg-pink-50/50 dark:bg-pink-900/10">
                    <h3 className="font-bold text-pink-700 dark:text-pink-300 mb-2">Set up Cycle Tracker</h3>
                    <p className="text-xs text-pink-600 dark:text-pink-400 mb-4 leading-relaxed">
                      To provide supportive estimates, we'll ask a few gentle questions. You can skip any of these.
                    </p>
                    <button 
                      onClick={() => {
                        const start = prompt("What was the first day of your most recent period? (YYYY-MM-DD)");
                        const dur = prompt("How many days does your period usually last?", "5");
                        const cycle = prompt("About how long is your typical cycle?", "28");
                        const reg = prompt("Are your cycles generally regular? (Yes / Somewhat / No)", "Somewhat");
                        handleCycleOnboarding({
                          last_period_start: start,
                          period_duration: parseInt(dur || "5"),
                          cycle_length: parseInt(cycle || "28"),
                          is_regular: reg || "Somewhat"
                        });
                      }}
                      className="w-full py-3 bg-pink-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-pink-500/20"
                    >
                      Start Onboarding
                    </button>
                  </section>
                )}

                {/* AI Coach Insight Card - Prominent at the top */}
                <section className="bg-gradient-to-br from-[#4A634A] to-[#2D3436] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-white/10">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#6B8E6B] flex items-center justify-center shadow-lg">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FB38F]">AI Wellness Coach</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed italic">
                      "{getCoachFeedback(todayLog, activeUser)}"
                    </p>
                  </div>
                  <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
                    <Leaf size={140} />
                  </div>
                </section>

                {/* Enhanced Calorie Progress Card */}
                <section className="card bg-neutral-50 dark:bg-neutral-800/50 border-none">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Nourishment</p>
                      <h3 className="text-xl font-bold dark:text-white">
                        {todayLog?.calories_consumed || 0} <span className="text-[10px] text-gray-400">kcal</span>
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#E9967A] uppercase tracking-widest">Active Burn</p>
                      <h3 className="text-xl font-bold text-[#E9967A]">
                        {todayLog?.calories_burned || 0} <span className="text-[10px] opacity-70">kcal</span>
                      </h3>
                    </div>
                  </div>
                  
                  {/* Net Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-gray-400">Energy Balance</span>
                      <span className="text-[#6B8E6B]">
                        Target: ~{todayLog?.calorie_target || 1500} kcal
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#6B8E6B] transition-all duration-500" 
                        style={{ width: `${Math.min((((todayLog?.calories_consumed || 0) - (todayLog?.calories_burned || 0)) / (todayLog?.calorie_target || 1500)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </section>

                {/* Movement Logging UI */}
                <section className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm dark:text-white">Movement Log</h3>
                    <Flame size={18} className="text-[#E9967A]" />
                  </div>
                  
                  <div className="space-y-3">
                    {todayLog?.activities?.map((act, idx) => {
                      const burned = act.calories_burned || estimateBurnedCalories(act.type, act.duration || 0, todayLog.weight || 65);
                      const time = act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-2xl group">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold dark:text-white">{act.type}</p>
                              <span className="text-[9px] text-gray-400 font-medium">{time}</span>
                            </div>
                            <p className="text-[10px] text-gray-500">{act.duration} mins</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs font-bold text-[#E9967A]">-{burned} kcal</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteActivity(act)}
                              className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={handleAddActivityFlow}
                      className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-2xl text-[10px] font-bold text-gray-400 uppercase hover:border-[#6B8E6B] hover:text-[#6B8E6B] transition-colors"
                    >
                      + Add Movement
                    </button>
                  </div>
                </section>

                {/* Quick Log Section */}
                <section className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm dark:text-white">Log a Meal</h3>
                    <button 
                      onClick={() => setIsLoggingMeal(!isLoggingMeal)}
                      className="text-[10px] font-bold text-[#6B8E6B] uppercase"
                    >
                      {isLoggingMeal ? 'Cancel' : 'Quick Add'}
                    </button>
                  </div>
                  
                  {isLoggingMeal && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <textarea
                        value={mealInput}
                        onChange={(e) => setMealInput(e.target.value)}
                        placeholder="Example: 2 idli with sambar and coffee"
                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none text-sm focus:ring-2 focus:ring-[#6B8E6B]/20 resize-none"
                        rows={2}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => handleAddMeal(type)}
                            className="py-2 rounded-xl bg-[#6B8E6B] text-white text-[10px] font-bold uppercase"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* List of today's meals with edit/delete */}
                  <div className="space-y-2">
                    {todayLog?.meals?.map((meal) => {
                      const time = meal.created_at ? new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={meal.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-50 dark:border-neutral-700 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                              <Utensils size={14} className="text-[#6B8E6B]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{meal.type}</p>
                                <span className="text-[9px] text-gray-300 font-medium">{time}</span>
                              </div>
                              <p className="text-xs font-medium dark:text-gray-200">{meal.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditMeal(meal)} className="p-1.5 text-gray-400 hover:text-[#6B8E6B]">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDeleteMeal(meal)} className="p-1.5 text-gray-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Streak Message */}
                {profile && profile.streak_count! > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/20">
                    <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                      "You've been showing up for yourself for {profile.streak_count} days 💚"
                    </p>
                  </div>
                )}

                {/* Smart Movement Reminder */}
                {(todayLog?.activities?.length || 0) === 0 && (
                  <div className="bg-sage-50 dark:bg-[#6B8E6B]/10 p-4 rounded-2xl border border-[#6B8E6B]/20 flex items-center gap-3">
                    <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
                      <Leaf className="text-[#6B8E6B]" size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#6B8E6B] dark:text-[#8FB38F] uppercase">Gentle Reminder</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {new Date().getHours() < 12 
                          ? "A 20-min stretch or walk can boost your energy today 🌿"
                          : "A light walk or gym session will help your rhythm 💚"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Focus Card */}
                <div className="bg-gradient-to-br from-[#6B8E6B] to-[#4A634A] rounded-3xl p-6 text-white shadow-lg">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Current Focus</span>
                  <h2 className="text-xl font-bold mt-1">{currentUser.focus}</h2>
                  <div className="mt-4 flex gap-2">
                    {currentUser.symptoms.map(s => (
                      <span key={s} className="text-[10px] bg-white/20 px-2 py-1 rounded-md backdrop-blur-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Daily Progress Quick View */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="card flex flex-col items-center justify-center py-6">
                    <Droplets className="text-blue-400 mb-2" size={24} />
                    <span className="text-2xl font-bold dark:text-white">{todayLog?.water || 0}L</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Water Intake</span>
                  </div>
                  <div className="card flex flex-col items-center justify-center py-6">
                    <Zap className="text-yellow-500 mb-2" size={24} />
                    <span className="text-2xl font-bold dark:text-white">{todayLog?.steps || 0}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Steps Taken</span>
                  </div>
                </div>

                {/* Badges Preview */}
                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold dark:text-white">Your Achievements</h3>
                    <button onClick={() => setActiveTab('stats')} className="text-xs text-[#6B8E6B] font-bold">View All</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {profile?.unlocked_badges?.map((badgeKey: string) => (
                      <div key={badgeKey} className="shrink-0 w-20 flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                          <Medal className="text-amber-500" size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-center dark:text-gray-400 leading-tight">
                          {badgeKey.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      </div>
                    ))}
                    {(!profile?.unlocked_badges || profile.unlocked_badges.length === 0) && (
                      <p className="text-xs text-gray-400 italic">Log your first activity to unlock a badge!</p>
                    )}
                  </div>
                </section>

                {/* Tailored Widgets */}
                <section>
                  <h3 className="text-lg font-bold mb-3 dark:text-white">Today's Priorities</h3>
                  <div className="space-y-3">
                    {/* Sick Day Card - Only shows if sick or as an option */}
                    <PriorityItem 
                      icon={<Heart className={todayLog?.is_sick ? "text-red-500" : "text-blue-400"} />} 
                      title="Sick Day Log" 
                      subtitle={todayLog?.is_sick ? `Feeling: ${todayLog.sick_notes}` : "Log if you're feeling unwell"} 
                      color={todayLog?.is_sick ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20"}
                      onClick={() => handlePriorityClick("Sick Day Log")}
                    />

                    {activeUser === 'Jushita' ? (
                      <>
                        <PriorityItem 
                          icon={<Calendar className="text-pink-500" />} 
                          title="Cycle Tracker" 
                          subtitle={todayLog?.is_period ? `Period Day ${todayLog.cycle_day || 'Active'} 🩸` : "Log your cycle today"} 
                          color="bg-pink-50 dark:bg-pink-900/20"
                          onClick={openCycleLogger}
                        />
                        <PriorityItem 
                          icon={<SquarePlus className="text-purple-500" />} 
                          title="Self Care Log" 
                          subtitle={todayLog?.sugar_cravings ? `Craving: ${todayLog.sugar_cravings}` : "Track daily habits"} 
                          color="bg-purple-50 dark:bg-purple-900/20"
                          onClick={() => handlePriorityClick("Self Care Log")}
                        />
                      </>
                    ) : (
                      <>
                        <PriorityItem 
                          icon={<ChartBar className="text-orange-500" />} 
                          title="Progress Check" 
                          subtitle="Weekly check-in due" 
                          color="bg-orange-50 dark:bg-orange-900/20"
                          onClick={() => setActiveTab('stats')}
                        />
                        <PriorityItem 
                          icon={<Zap className="text-yellow-600" />} 
                          title="Comfort Tracker" 
                          subtitle={todayLog?.sugar_cravings ? `Feeling: ${todayLog.sugar_cravings}` : "Log post-meal feeling"} 
                          color="bg-yellow-50 dark:bg-yellow-900/20"
                          onClick={() => handlePriorityClick("Comfort Tracker")}
                        />
                      </>
                    )}
                  </div>
                </section>

                {/* Sister Feed Preview */}
                <section className="card bg-gray-50 dark:bg-neutral-800/50 border-none">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold dark:text-white">Sister Update</h3>
                    <Users size={18} className="text-gray-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E9967A] flex items-center justify-center text-white font-bold">
                      {activeUser === 'Jushita' ? 'S' : 'J'}
                    </div>
                    <div>
                      <p className="text-sm font-medium dark:text-gray-200">
                        {activeUser === 'Jushita' ? 'Sneha' : 'Jushita'} just logged lunch!
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">"Rice with sambar & cabbage poriyal"</p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'feed' && (
              <div className="space-y-6 mt-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold dark:text-white">Sister Feed</h2>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-bold">Live Updates</span>
                </div>

                <div className="space-y-4">
                  {feed.length > 0 ? feed.map((item) => (
                    <div key={item.id} className="card border-l-4 border-l-[#6B8E6B] dark:bg-neutral-800">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${item.user === 'Jushita' ? 'bg-purple-400' : 'bg-orange-400'}`}>
                          {item.user ? item.user[0] : '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.title || 'Activity Logged'}</h4>
                            <span className="text-[10px] text-gray-400">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{item.description || 'No description'}"</p>
                          
                          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-neutral-700">
                            <button className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-pink-500 transition-colors">
                              <Heart size={14} /> Cheer
                            </button>
                            <button className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors">
                              <MessageCircle size={14} /> Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12">
                      <Users size={48} className="mx-auto text-gray-200 dark:text-neutral-700 mb-4" />
                      <p className="text-gray-400 text-sm">No updates yet. Start logging to see each other's progress!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'log' && (
              <div className="space-y-8 mt-4">
                <section>
                  <h2 className="text-xl font-bold mb-4 dark:text-white">Daily Tracker</h2>
                  
                  {/* Water Tracker */}
                  <div className="card mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Droplets className="text-blue-500" size={20} />
                        <span className="font-bold dark:text-white">Water Intake</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{todayLog?.water || 0} / 3.0L</span>
                    </div>
                    <div className="flex gap-2">
                      {[0.25, 0.5, 0.75, 1.0].map(amt => (
                        <button 
                          key={amt}
                          onClick={() => updateLog({ water: (todayLog?.water || 0) + amt })}
                          className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-bold active:bg-blue-100"
                        >
                          +{amt}L
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meal Logger */}
                  <div className="card mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Utensils className="text-green-600" size={20} />
                      <span className="font-bold dark:text-white">Meal Log</span>
                    </div>
                    
                    <div className="space-y-3">
                      {['Breakfast', 'Lunch', 'Dinner'].map((type) => {
                        const meal = todayLog?.meals?.find(m => m.type === type);
                        return (
                          <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-xl">
                            <div>
                              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{type}</p>
                              <p className="text-sm font-medium dark:text-gray-200">{meal ? meal.description : 'Not logged yet'}</p>
                            </div>
                            {!meal ? (
                              <button 
                                onClick={() => {
                                  setModalConfig({
                                    isOpen: true,
                                    title: `Log ${type}`,
                                    placeholder: "What did you have?",
                                    defaultValue: "",
                                    type: 'text',
                                    onConfirm: (desc) => {
                                      if (desc) {
                                        addMeal({ 
                                          type: type as any, 
                                          description: desc, 
                                          has_rice: type === 'Lunch', 
                                          is_non_veg: false 
                                        });
                                      }
                                      setModalConfig(null);
                                    }
                                  });
                                }}
                                className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm text-[#6B8E6B]"
                              >
                                <SquarePlus size={20} />
                              </button>
                            ) : (
                              <CircleCheck className="text-green-500" size={20} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">Pro Tip</p>
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        {activeUser === 'Jushita' 
                          ? "Rice is for lunch only. Dinner should be light (e.g. soup or salad)."
                          : "Focus on protein for dinner to reduce morning bloating."}
                      </p>
                    </div>
                  </div>

                  {/* Movement Logger */}
                  <div className="card mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="text-[#6B8E6B]" size={20} />
                        <span className="font-bold dark:text-white">Movement Log</span>
                      </div>
                      {profile?.movement_streak! > 0 && (
                        <span className="text-[10px] font-bold text-[#6B8E6B] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                          {profile?.movement_streak} Day Streak
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {['Gym', 'Walk', 'Yoga', 'Home'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setModalConfig({
                              isOpen: true,
                              title: `${type} Duration`,
                              placeholder: "Minutes",
                              defaultValue: "30",
                              type: 'number',
                              onConfirm: (dur) => {
                                if (dur) handleAddActivity(type, parseInt(dur));
                                else setModalConfig(null);
                              }
                            });
                          }}
                          className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-xl text-xs font-bold dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {todayLog?.activities?.map(activity => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border-t border-gray-50 dark:border-neutral-700">
                        <div className="flex items-center gap-2">
                          <Timer size={14} className="text-gray-400" />
                          <span className="text-sm dark:text-gray-300">{activity.type}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400">{activity.duration} mins</span>
                      </div>
                    ))}
                  </div>

                  {/* User Specific Metrics */}
                  <div className="card">
                    <h3 className="font-bold mb-4 dark:text-white">{activeUser === 'Jushita' ? 'Daily Check' : 'Measurements'}</h3>
                    {activeUser === 'Jushita' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {['Routine', 'Skin', 'Cravings', 'Energy'].map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              const current = todayLog?.symptoms || [];
                              const next = current.includes(s) ? current.filter(i => i !== s) : [...current, s];
                              console.log(`Symptom toggle: ${s}`);
                              updateLog({ symptoms: next });
                            }}
                            className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                              todayLog?.symptoms?.includes(s) 
                                ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' 
                                : 'bg-white dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Waist (cm)</label>
                            <input 
                              type="number" 
                              value={todayLog?.waist || ''}
                              onChange={(e) => updateLog({ waist: Number(e.target.value) })}
                              className="w-full p-2 bg-gray-50 dark:bg-neutral-700/50 rounded-lg text-sm border-none focus:ring-2 focus:ring-orange-200 dark:text-white"
                              placeholder="0.0"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Weight (kg)</label>
                            <input 
                              type="number" 
                              value={todayLog?.weight || ''}
                              onChange={(e) => updateLog({ weight: Number(e.target.value) })}
                              className="w-full p-2 bg-gray-50 dark:bg-neutral-700/50 rounded-lg text-sm border-none focus:ring-2 focus:ring-orange-200 dark:text-white"
                              placeholder="0.0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6 mt-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold dark:text-white">Progress Journey</h2>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                    <History size={12} />
                    Last 30 Days
                  </div>
                </div>

                {stats && (
                  <>
                    {/* Weight Loss Highlight Card */}
                    {stats.weightLoss !== 0 && (
                      <section className="bg-gradient-to-br from-orange-400 to-pink-500 rounded-3xl p-6 text-white shadow-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Weight Progress</p>
                            <h3 className="text-3xl font-bold mt-1">
                              {stats.weightLoss > 0 ? `-${stats.weightLoss}` : `+${Math.abs(stats.weightLoss)}`} <span className="text-sm font-normal">kg</span>
                            </h3>
                            <p className="text-xs mt-2 opacity-90">
                              From {stats.startingWeight}kg to {stats.currentWeight}kg
                            </p>
                          </div>
                          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                            <TrendingUp size={24} />
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Coach Insight Card */}
                    <section className="bg-[#6B8E6B] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={18} className="text-yellow-300" />
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Coach Insight</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed italic">
                          "{stats.insight}"
                        </p>
                      </div>
                      <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Leaf size={120} />
                      </div>
                    </section>

                    {/* Monthly Summary Grid */}
                    <section className="grid grid-cols-2 gap-4">
                      <div className="card flex flex-col items-center justify-center py-6">
                        <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-2">
                          <Flame className="text-orange-500" size={20} />
                        </div>
                        <span className="text-2xl font-bold dark:text-white">{stats.movementDays}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Active Days (Month)</span>
                      </div>
                      <div className="card flex flex-col items-center justify-center py-6">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2">
                          <Utensils className="text-blue-500" size={20} />
                        </div>
                        <span className="text-2xl font-bold dark:text-white">{stats.avgCaloriesMonthly}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Kcal (Month)</span>
                      </div>
                    </section>

                    {/* Weight Trend Chart (Last 7 entries) */}
                    {stats.weightTrend.length > 0 && (
                      <section className="card">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-sm dark:text-white">Weight Trend</h3>
                          <TrendingUp size={18} className="text-[#6B8E6B]" />
                        </div>
                        <div className="space-y-3">
                          {stats.weightTrend.map((entry, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</span>
                              <div className="flex-1 mx-4 h-px bg-gray-100 dark:bg-neutral-700" />
                              <span className="text-sm font-bold dark:text-white">{entry.weight} kg</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
                
                {/* Streak Dashboard */}
                <section className="grid grid-cols-2 gap-3">
                  <div className="card bg-white dark:bg-neutral-800 p-4 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                      <Flame className="text-orange-500" size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Wellness Streak</p>
                    <p className="text-xl font-bold dark:text-white">{profile?.streak_count || 0} Days</p>
                  </div>
                  <div className="card bg-white dark:bg-neutral-800 p-4 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                      <Droplets className="text-blue-500" size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Water Streak</p>
                    <p className="text-xl font-bold dark:text-white">{profile?.water_streak || 0} Days</p>
                  </div>
                  <div className="card bg-white dark:bg-neutral-800 p-4 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                      <Utensils className="text-green-500" size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Meal Streak</p>
                    <p className="text-xl font-bold dark:text-white">{profile?.meal_streak || 0} Days</p>
                  </div>
                  <div className="card bg-white dark:bg-neutral-800 p-4 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-2">
                      <Dumbbell className="text-purple-500" size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Gym Streak</p>
                    <p className="text-xl font-bold dark:text-white">{profile?.movement_streak || 0} Days</p>
                  </div>
                </section>

                {/* Badges Section */}
                <section className="card">
                  <h3 className="font-bold text-sm mb-4 dark:text-white">Milestone Badges</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {profile?.unlocked_badges?.map((badge: string) => (
                      <div key={badge} className="shrink-0 flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center border-2 border-amber-100 shadow-sm">
                          <Medal className="text-amber-500" size={24} />
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase text-center w-16 leading-tight">
                          {badge.replace(/-/g, ' ')}
                        </span>
                      </div>
                    ))}
                    {(!profile?.unlocked_badges || profile.unlocked_badges.length === 0) && (
                      <div className="w-full py-8 text-center">
                        <p className="text-xs text-gray-400 italic">Log your first activity to unlock a badge! 🚀</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Monthly Archive Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold dark:text-white">Monthly Archive</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{history.length} Logs Found</span>
                  </div>
                  
                  <div className="space-y-3">
                    {history.map((log) => (
                      <button 
                        key={log.id}
                        onClick={() => {
                          setSelectedDate(log.date);
                          setActiveTab('home');
                        }}
                        className="w-full text-left card hover:border-[#6B8E6B] transition-colors group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold dark:text-white">
                              {new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <div className="flex gap-3 mt-1">
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Utensils size={10} /> {log.calories_consumed || 0} kcal
                              </span>
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Droplets size={10} /> {log.water || 0}L
                              </span>
                              {log.weight && (
                                <span className="text-[10px] text-[#6B8E6B] font-bold">
                                  {log.weight}kg
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#6B8E6B]" />
                        </div>
                        
                        {/* Quick Meal Preview */}
                        {log.meals && log.meals.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-50 dark:border-neutral-700">
                            <p className="text-[9px] text-gray-400 truncate italic">
                              {log.meals.map(m => m.description).join(' • ')}
                            </p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6 mt-4">
                <h2 className="text-xl font-bold dark:text-white">Account & Safety</h2>
                
                {/* Cloud Sync Card */}
                <section className="card border-2 border-[#6B8E6B]/20 bg-[#6B8E6B]/5">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="text-[#6B8E6B]" size={24} />
                    <div>
                      <h3 className="font-bold text-sm dark:text-white">Cloud Protection Active</h3>
                      <p className="text-[10px] text-gray-500">Your data is synced with your sister's device</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={handleRestoreData}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <RefreshCw size={18} className={`text-[#6B8E6B] ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-medium dark:text-white">Restore from Cloud</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>

                    <button 
                      onClick={() => storage.exportBackup(activeUser)}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CloudDownload size={18} className="text-blue-500" />
                        <span className="text-sm font-medium dark:text-white">Download Offline Backup</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  </div>
                </section>

                <section className="card">
                  <h3 className="font-bold text-sm mb-2 dark:text-white">How it works</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    1. <b>Real-time Sync:</b> Every time you log a meal or water, it's saved to our secure database.<br/><br/>
                    2. <b>Multi-Device:</b> You can use the app on your phone and your sister can use it on hers. You'll both see each other's updates in the feed.<br/><br/>
                    3. <b>Recovery:</b> If you delete the app or clear your browser, just click "Restore from Cloud" to get everything back instantly.
                  </p>
                </section>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 px-6 py-3 flex justify-between items-center pb-8">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="Home" />
        <NavButton active={activeTab === 'log'} onClick={() => setActiveTab('log')} icon={<SquarePlus size={24} />} label="Log" />
        <NavButton active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} icon={<Users size={24} />} label="Feed" />
        <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<ChartBar size={24} />} label="Stats" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} label="More" />
      </nav>

      {/* Custom Modal Component */}
      <AnimatePresence>
        {modalConfig?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalConfig(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-neutral-800"
            >
              <h3 className="text-xl font-bold mb-2 dark:text-white">{modalConfig.title}</h3>
              <p className="text-xs text-gray-500 mb-6">Please enter the details below</p>
              
              <div className="space-y-6">
                <input
                  autoFocus
                  type={modalConfig.type}
                  placeholder={modalConfig.placeholder}
                  defaultValue={modalConfig.defaultValue}
                  id="modal-input"
                  className="w-full p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border-none text-sm focus:ring-2 focus:ring-[#6B8E6B]/20 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      modalConfig.onConfirm((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setModalConfig(null)}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const val = (document.getElementById('modal-input') as HTMLInputElement).value;
                      modalConfig.onConfirm(val);
                    }}
                    className="flex-1 py-4 bg-[#6B8E6B] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#6B8E6B]/20 active:scale-95 transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityItem({ icon, title, subtitle, color, onClick }: { icon: React.ReactNode, title: string, subtitle: string, color: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl ${color} text-left transition-transform active:scale-[0.98]`}
    >
      <div className="flex items-center gap-4">
        <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-sm dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <ArrowRight size={16} className="text-gray-400" />
    </button>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}
