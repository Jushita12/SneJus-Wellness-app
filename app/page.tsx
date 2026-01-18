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
    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-inner">
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
    if (!todayStr) return;
    setLoading(true);
    const [log, feedData, historyData, userProfile] = await Promise.all([
      storage.getLog(activeUser, todayStr),
      storage.getFeed(),
      storage.getHistory(activeUser, 7),
      storage.getUserProfile(activeUser)
    ]);
    
    if (log) {
      setTodayLog(log);
    } else {
      // Initialize empty log state locally
      setTodayLog({
        id: '',
        user_name: activeUser,
        date: todayStr,
        water: 0,
        steps: 0,
        mood: 'Good',
        meals: [],
        symptoms: [],
        sugar_cravings: 'None',
        created_at: null,
        updated_at: null,
        waist: null,
        weight: null,
        activities: [],
        calories_consumed: 0,
        calorie_target: 1500
      } as any);
    }
    setFeed(feedData);
    setHistory(historyData);
    setProfile(userProfile);
    setLoading(false);
  };

  useEffect(() => {
    if (mounted && todayStr) {
      fetchData();
    }
  }, [activeUser, todayStr, activeTab, mounted]);

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
    if (!todayLog) return;
    const updated = { ...todayLog, ...updates };
    setTodayLog(updated); // Optimistic update
    await storage.saveLog(activeUser, { ...updates, date: todayStr });
    
    // Trigger streak/badge logic on any meaningful update
    if (updates.water || updates.steps || updates.mood || updates.symptoms) {
      await storage.updateStreakAndBadges(activeUser, updates);
      const newProfile = await storage.getUserProfile(activeUser);
      setProfile(newProfile);
    }
    
    // Refresh history if needed
    if (activeTab === 'stats') {
      const historyData = await storage.getHistory(activeUser, 7);
      setHistory(historyData);
    }
  };

  const addMeal = async (meal: Omit<Meal, 'id' | 'log_id' | 'created_at'>) => {
    if (!todayLog) return;
    
    // Ensure log exists in DB first
    if (!todayLog.id) {
      await storage.saveLog(activeUser, { date: todayStr });
      const freshLog = await storage.getLog(activeUser, todayStr);
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
    const description = items.map(i => i.name).join(', ') || mealInput;
    
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

  const handleAddActivity = async (type: string, duration: number) => {
    if (!todayLog) return;
    
    const weight = todayLog.weight || 65; // Default weight if not logged
    const burned = estimateBurnedCalories(type, duration, weight);
    
    if (!todayLog.id) {
      await storage.saveLog(activeUser, { date: todayStr });
      const freshLog = await storage.getLog(activeUser, todayStr);
      if (freshLog) await storage.addActivity(freshLog.id, { type, duration });
    } else {
      await storage.addActivity(todayLog.id, { type, duration });
    }

    toast.success(`Great work! You burned ~${burned} kcal! 🔥`);
    await storage.updateStreakAndBadges(activeUser, {}, true);
    fetchData();
  };

  const handleDeleteMeal = async (meal: Meal) => {
    setLastDeleted({ type: 'meal', data: meal });
    await storage.deleteMeal(meal.id);
    toast.success("Meal deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          if (lastDeleted?.type === 'meal') {
            await storage.addMeal(meal.log_id!, {
              type: meal.type,
              description: meal.description,
              calories: meal.calories,
              has_rice: meal.has_rice,
              is_non_veg: meal.is_non_veg
            });
            fetchData();
          }
        }
      }
    });
    fetchData();
  };

  const handleEditMeal = async (meal: Meal) => {
    const newDesc = prompt("Edit meal description:", meal.description);
    if (newDesc !== null) {
      const { total } = estimateCalories(newDesc);
      await storage.updateMeal(meal.id, { description: newDesc, calories: total });
      fetchData();
    }
  };

  const handleDeleteActivity = async (activity: any) => {
    setLastDeleted({ type: 'activity', data: activity });
    await storage.deleteActivity(activity.id);
    toast.success("Activity deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          if (lastDeleted?.type === 'activity') {
            await storage.addActivity(activity.log_id!, {
              type: activity.type,
              duration: activity.duration
            });
            fetchData();
          }
        }
      }
    });
    fetchData();
  };

  const handleRestoreData = async () => {
    setIsSyncing(true);
    try {
      const allLogs = await storage.syncAllData(activeUser);
      setHistory(allLogs);
      // Update today's log if it exists in the synced data
      const today = allLogs.find(l => l.date === todayStr);
      if (today) setTodayLog(today);
      toast.success("Data recovered from Cloud! ☁️");
    } catch (e) {
      toast.error("Failed to sync data.");
    } finally {
      setIsSyncing(false);
    }
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

  // Weekly Stats Calculation
  const weeklyStats = useCallback(() => {
    if (!history.length) return null;
    
    const totalCalories = history.reduce((acc, log) => acc + (log.calories_consumed || 0), 0);
    const avgCalories = Math.round(totalCalories / history.length);
    
    const movementDays = history.filter(log => log.activities && log.activities.length > 0).length;
    
    const weightTrend = history
      .filter(log => log.weight)
      .map(log => ({ date: log.date, weight: log.weight }))
      .reverse();

    // Simple insight logic
    let insight = "You're building a great rhythm! Consistency is your superpower.";
    if (movementDays >= 4) insight = "Incredible movement consistency this week. Your metabolism is firing! 🔥";
    if (avgCalories < 1800 && avgCalories > 1200) insight = "Your calorie intake is in a beautiful 'Goldilocks' zone for sustainable fat loss. ⚖️";

    return {
      avgCalories,
      movementDays,
      weightTrend,
      insight,
      completionRate: 85 // Placeholder for checklist logic
    };
  }, [history]);

  const stats = weeklyStats();

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
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Good Morning,</p>
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
                        {todayLog?.activities?.reduce((acc, act) => 
                          acc + estimateBurnedCalories(act.type, act.duration || 0, todayLog.weight || 65), 0) || 0
                      } <span className="text-[10px] opacity-70">kcal</span>
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
                    <div className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#6B8E6B] transition-all duration-500" 
                        style={{ width: `${Math.min((((todayLog?.calories_consumed || 0) - (todayLog?.activities?.reduce((acc, act) => acc + estimateBurnedCalories(act.type, act.duration || 0, todayLog.weight || 65), 0) || 0)) / (todayLog?.calorie_target || 1500)) * 100, 100)}%` }}
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
                      const burned = estimateBurnedCalories(act.type, act.duration || 0, todayLog.weight || 65);
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-2xl group">
                          <div>
                            <p className="text-xs font-bold dark:text-white">{act.type}</p>
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
                      onClick={() => {
                        const type = prompt("What exercise did you do? (Gym, Walk, Yoga, HIIT)");
                        const dur = prompt("For how many minutes?");
                        if (type && dur) handleAddActivity(type, parseInt(dur));
                      }}
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
                    {todayLog?.meals.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-50 dark:border-neutral-700 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <Utensils size={14} className="text-[#6B8E6B]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{meal.type}</p>
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
                    ))}
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
                {todayLog?.activities.length === 0 && (
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
                    {profile?.unlocked_badges?.map(badgeKey => (
                      <div key={badgeKey} className="shrink-0 w-20 flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                          <Medal className="text-amber-500" size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-center dark:text-gray-400 leading-tight">
                          {badgeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                    {activeUser === 'Jushita' ? (
                      <>
                        <PriorityItem 
                          icon={<Calendar className="text-pink-500" />} 
                          title="Cycle Tracker" 
                          subtitle="Day 22 of journey" 
                          color="bg-pink-50 dark:bg-pink-900/20"
                        />
                        <PriorityItem 
                          icon={<SquarePlus className="text-purple-500" />} 
                          title="Self Care Log" 
                          subtitle="Track daily habits" 
                          color="bg-purple-50 dark:bg-purple-900/20"
                        />
                      </>
                    ) : (
                      <>
                        <PriorityItem 
                          icon={<ChartBar className="text-orange-500" />} 
                          title="Progress Check" 
                          subtitle="Weekly check-in due" 
                          color="bg-orange-50 dark:bg-orange-900/20"
                        />
                        <PriorityItem 
                          icon={<Zap className="text-yellow-600" />} 
                          title="Comfort Tracker" 
                          subtitle="Log post-meal feeling" 
                          color="bg-yellow-50 dark:bg-yellow-900/20"
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
                          {item.user[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h4>
                            <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{item.description}"</p>
                          
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
                        const meal = todayLog?.meals.find(m => m.type === type);
                        return (
                          <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-xl">
                            <div>
                              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{type}</p>
                              <p className="text-sm font-medium dark:text-gray-200">{meal ? meal.description : 'Not logged yet'}</p>
                            </div>
                            {!meal ? (
                              <button 
                                onClick={() => {
                                  const desc = prompt(`What did you have for ${type}?`);
                                  if (desc) {
                                    const hasRice = type === 'Lunch'; // Enforce rice at lunch rule
                                    addMeal({ 
                                      type: type as any, 
                                      description: desc, 
                                      hasRice, 
                                      isNonVeg: false 
                                    });
                                  }
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
                            const duration = prompt(`How many minutes of ${type} did you do?`, "30");
                            if (duration) handleAddActivity(type, parseInt(duration));
                          }}
                          className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-xl text-xs font-bold dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {todayLog?.activities.map(activity => (
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
                              todayLog?.symptoms.includes(s) 
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
                  <h2 className="text-xl font-bold dark:text-white">Weekly Review</h2>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                    <History size={12} />
                    Last 7 Days
                  </div>
                </div>

                {stats && (
                  <>
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

                    {/* Weekly Summary Grid */}
                    <section className="grid grid-cols-2 gap-4">
                      <div className="card flex flex-col items-center justify-center py-6">
                        <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-2">
                          <Flame className="text-orange-500" size={20} />
                        </div>
                        <span className="text-2xl font-bold dark:text-white">{stats.movementDays}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Active Days</span>
                      </div>
                      <div className="card flex flex-col items-center justify-center py-6">
                        <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-2">
                          <Utensils className="text-green-500" size={20} />
                        </div>
                        <span className="text-2xl font-bold dark:text-white">{stats.avgCalories}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Kcal</span>
                      </div>
                    </section>

                    {/* Weight Trend */}
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
    </div>
  );
}

function PriorityItem({ icon, title, subtitle, color }: { icon: React.ReactNode, title: string, subtitle: string, color: string }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl ${color}`}>
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
    </div>
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
