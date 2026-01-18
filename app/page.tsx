'use client';

import { useState, useEffect } from 'react';
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
  Timer
} from 'lucide-react';
import { storage, DailyLog, Meal } from '@/lib/storage';

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

  const todayStr = new Date().toISOString().split('T')[0];

  // Initialize Theme
  useEffect(() => {
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
        activities: []
      });
    }
    setFeed(feedData);
    setHistory(historyData);
    setProfile(userProfile);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeUser, todayStr, activeTab]);

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

  const addActivity = async (type: string, duration: number) => {
    if (!todayLog) return;
    if (!todayLog.id) {
      await storage.saveLog(activeUser, { date: todayStr });
      const freshLog = await storage.getLog(activeUser, todayStr);
      if (freshLog) await storage.addActivity(freshLog.id, { type, duration });
    } else {
      await storage.addActivity(todayLog.id, { type, duration });
    }
    await storage.updateStreakAndBadges(activeUser, {}, true);
    fetchData();
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

  return (
    <div className="mobile-container">
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
                            if (duration) addActivity(type, parseInt(duration));
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
                <section>
                  <h2 className="text-xl font-bold mb-4 dark:text-white">Progress Analytics</h2>
                  
                  {/* Trend Graph (Custom Bar Chart) */}
                  <div className="card">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h3 className="font-bold text-sm dark:text-white">7-Day Consistency</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activeUser === 'Jushita' ? 'Habit tracking frequency' : 'Metric consistency'}
                        </p>
                      </div>
                      <TrendingUp size={20} className="text-[#6B8E6B]" />
                    </div>
                    
                    <div className="flex items-end justify-between h-32 gap-2 px-2">
                      {[...Array(7)].map((_, i) => {
                        const dayLog = history[6 - i];
                        const height = dayLog ? (dayLog.water / 3) * 100 : 10;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className={`w-full rounded-t-lg transition-all duration-500 ${dayLog ? 'bg-[#6B8E6B]' : 'bg-gray-100 dark:bg-neutral-700'}`}
                              style={{ height: `${Math.min(height, 100)}%` }}
                            ></div>
                            <span className="text-[8px] font-bold text-gray-400">
                              {new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString([], { weekday: 'short' })[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Monthly Review Workflow */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="text-yellow-500" size={20} />
                    <h3 className="font-bold dark:text-white">Monthly Review</h3>
                  </div>
                  
                  <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border-2 border-dashed border-gray-100 dark:border-neutral-700">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                        <ClipboardCheck className="text-[#6B8E6B]" size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold dark:text-white">March Reflection</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You've logged 18 days this month. Ready to review your hormone balance trends?</p>
                      </div>
                      <button className="w-full py-3 bg-[#6B8E6B] text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-transform">
                        Start Monthly Review
                      </button>
                    </div>
                  </div>
                </section>

                {/* Key Insights */}
                <section className="grid grid-cols-2 gap-4">
                  <div className="card bg-blue-50 dark:bg-blue-900/20 border-none">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Avg Water</p>
                    <p className="text-xl font-bold mt-1 dark:text-white">2.4L</p>
                    <p className="text-[10px] text-blue-400 mt-1">+12% from last week</p>
                  </div>
                  <div className="card bg-purple-50 dark:bg-purple-900/20 border-none">
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Mood Peak</p>
                    <p className="text-xl font-bold mt-1 dark:text-white">Ovulatory</p>
                    <p className="text-[10px] text-purple-400 mt-1">Highest energy days</p>
                  </div>
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
