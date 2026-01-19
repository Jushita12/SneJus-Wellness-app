import { createClient } from './supabase/client'; // Ensure this is the browser client
import { Database } from '@/database.types';
import toast from 'react-hot-toast';

export type Meal = Database['public']['Tables']['meals']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  category: 'meal' | 'activity' | 'health';
};

export type DailyLog = Database['public']['Tables']['daily_logs']['Row'] & {
  meals: Meal[];
  activities: Activity[];
  checklist?: ChecklistItem[]; // We'll store this in a JSON column or derive it
};
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

const supabase = createClient();

// Add a helper to handle potential query timeouts
const wrapQuery = async <T>(query: Promise<{ data: T | null; error: any }>): Promise<T | null> => {
  const timeout = new Promise<null>((_, reject) => 
    setTimeout(() => reject(new Error('Database query timeout')), 5000)
  );

  try {
    const { data, error } = await Promise.race([query, timeout as any]);
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("Supabase Query Error:", e);
    return null;
  }
};

// Helper to get YYYY-MM-DD in local time
export const getLocalDateString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const storage = {
  // Add this to allow the page to use the same supabase instance for subscriptions
  getClient: () => supabase,

  saveLog: async (user: 'Jushita' | 'Sneha', log: Partial<Database['public']['Tables']['daily_logs']['Update']>) => {
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id, calories_consumed, calorie_target')
      .eq('user_name', user)
      .eq('date', log.date!)
      .maybeSingle();

    if (existingLog) {
      const { error } = await supabase
        .from('daily_logs')
        .update({ 
          ...log, 
          updated_at: new Date().toISOString() 
        } as Database['public']['Tables']['daily_logs']['Update'])
        .eq('id', existingLog.id);
      if (error) console.error('Error updating log:', error);
    } else {
      const { error } = await supabase
        .from('daily_logs')
        .insert({
          user_name: user,
          date: log.date!,
          water: log.water || 0,
          steps: log.steps || 0,
          mood: log.mood || 'Good',
          symptoms: log.symptoms || [],
          sugar_cravings: log.sugar_cravings || 'None',
          waist: log.waist,
          weight: log.weight,
          calories_consumed: log.calories_consumed || 0,
          calorie_target: log.calorie_target || 1500
        } as Database['public']['Tables']['daily_logs']['Insert']);
      if (error) console.error('Error inserting log:', error);
    }
  },

  getLog: async (user: 'Jushita' | 'Sneha', date: string): Promise<DailyLog | null> => {
    const data = await wrapQuery(
      supabase
        .from('daily_logs')
        .select(`*, meals (*), activities (*)`)
        .eq('user_name', user)
        .eq('date', date)
        .maybeSingle()
    );
    
    if (!data) return null;

    return {
      ...data,
      meals: (data as any).meals || [],
      activities: (data as any).activities || []
    } as DailyLog;
  },

  addMeal: async (logId: string, meal: Omit<Database['public']['Tables']['meals']['Insert'], 'id' | 'log_id' | 'created_at'>) => {
    const { error: mealError } = await supabase
      .from('meals')
      .insert({
        ...meal,
        log_id: logId
      } as Database['public']['Tables']['meals']['Insert']);
    
    if (mealError) {
      console.error('Error adding meal:', mealError);
      return;
    }

    // Update total calories in the daily log
    const { data: logData } = await supabase
      .from('daily_logs')
      .select('calories_consumed')
      .eq('id', logId)
      .maybeSingle();

    if (logData) {
      const newTotal = (logData.calories_consumed || 0) + (meal.calories || 0);
      await supabase
        .from('daily_logs')
        .update({ calories_consumed: newTotal } as Database['public']['Tables']['daily_logs']['Update'])
        .eq('id', logId);
    }
  },

  addActivity: async (logId: string, activity: Omit<Database['public']['Tables']['activities']['Insert'], 'id' | 'log_id' | 'created_at'>) => {
    const { error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        log_id: logId
      } as Database['public']['Tables']['activities']['Insert']);
    
    if (error) {
      console.error('Error adding activity:', error);
      return;
    }

    // Update total calories burned in the daily log
    const { data: activities } = await supabase
      .from('activities')
      .select('calories_burned, type, duration')
      .eq('log_id', logId);

    if (activities) {
      const totalBurned = activities.reduce((acc, act) => acc + (act.calories_burned || 0), 0);
      await supabase
        .from('daily_logs')
        .update({ calories_burned: totalBurned } as Database['public']['Tables']['daily_logs']['Update'])
        .eq('id', logId);
    }
  },

  updateMeal: async (mealId: string, updates: Partial<Database['public']['Tables']['meals']['Update']>) => {
    const { error } = await supabase
      .from('meals')
      .update(updates as Database['public']['Tables']['meals']['Update'])
      .eq('id', mealId);
    if (error) console.error('Error updating meal:', error);
  },

  updateActivity: async (activityId: string, updates: Partial<Database['public']['Tables']['activities']['Update']>) => {
    const { data: activity } = await supabase
      .from('activities')
      .select('log_id')
      .eq('id', activityId)
      .single();

    const { error } = await supabase
      .from('activities')
      .update(updates as Database['public']['Tables']['activities']['Update'])
      .eq('id', activityId);
    
    if (error) {
      console.error('Error updating activity:', error);
      return;
    }

    if (activity?.log_id) {
      const { data: activities } = await supabase
        .from('activities')
        .select('calories_burned')
        .eq('log_id', activity.log_id);
      
      const totalBurned = activities?.reduce((acc, act) => acc + (act.calories_burned || 0), 0) || 0;
      await supabase
        .from('daily_logs')
        .update({ calories_burned: totalBurned } as Database['public']['Tables']['daily_logs']['Update'])
        .eq('id', activity.log_id);
    }
  },

  deleteMeal: async (mealId: string) => {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId);
    if (error) console.error('Error deleting meal:', error);
  },

  deleteActivity: async (activityId: string) => {
    const { data: activity } = await supabase
      .from('activities')
      .select('log_id')
      .eq('id', activityId)
      .single();

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);
    
    if (error) {
      console.error('Error deleting activity:', error);
      return;
    }

    if (activity?.log_id) {
      const { data: activities } = await supabase
        .from('activities')
        .select('calories_burned')
        .eq('log_id', activity.log_id);
      
      const totalBurned = activities?.reduce((acc, act) => acc + (act.calories_burned || 0), 0) || 0;
      await supabase
        .from('daily_logs')
        .update({ calories_burned: totalBurned } as Database['public']['Tables']['daily_logs']['Update'])
        .eq('id', activity.log_id);
    }
  },

  getHistory: async (user: 'Jushita' | 'Sneha', days: number = 7): Promise<DailyLog[]> => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        *,
        meals (*),
        activities (*)
      `)
      .eq('user_name', user)
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }
    return data as DailyLog[];
  },

  getFeed: async () => {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        daily_logs (user_name, date)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching feed:', error);
      return [];
    }

    return (data as any[]).map(meal => ({
      id: meal.id,
      user: meal.daily_logs?.user_name,
      type: 'meal',
      title: `${meal.daily_logs?.user_name} logged ${meal.type}`,
      description: meal.description,
      timestamp: new Date(meal.created_at!).getTime(),
      date: meal.daily_logs?.date
    }));
  },

  getUserProfile: async (user: 'Jushita' | 'Sneha'): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_name', user)
      .maybeSingle();
    
    if (!data && !error) {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({ user_name: user, streak_count: 0, movement_streak: 0, unlocked_badges: [] } as Database['public']['Tables']['user_profiles']['Insert'])
        .select()
        .single();
      if (createError) return null;
      return newProfile as UserProfile;
    }
    return data as UserProfile;
  },

  getCycleSettings: async (user: 'Jushita' | 'Sneha') => {
    const { data } = await supabase
      .from('cycle_settings')
      .select('*')
      .eq('user_name', user)
      .maybeSingle();
    return data;
  },

  saveCycleSettings: async (user: 'Jushita' | 'Sneha', settings: any) => {
    const { error } = await supabase
      .from('cycle_settings')
      .upsert({ user_name: user, ...settings, updated_at: new Date().toISOString() });
    if (error) console.error('Error saving cycle settings:', error);
  },

  updateStreakAndBadges: async (user: 'Jushita' | 'Sneha', logUpdates: Partial<Database['public']['Tables']['daily_logs']['Row']>, isMovement: boolean = false) => {
    const profile = await storage.getUserProfile(user);
    if (!profile) return;

    const today = getLocalDateString();
    const lastActive = profile.last_active_date;
    
    // Fetch current log to get accurate calorie/water counts
    const currentLog = await storage.getLog(user, today);
    
    let newStreak = profile.streak_count || 0;
    let newMovementStreak = profile.movement_streak || 0;
    let newMealStreak = profile.meal_streak || 0;
    let newWaterStreak = profile.water_streak || 0;
    let shouldUpdate = false;

    // Date Logic for Streaks
    if (!lastActive) {
      newStreak = 1;
      shouldUpdate = true;
    } else if (lastActive !== today) {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(today);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1 || diffDays === 2) {
        // GRACE PERIOD: Up to 2 days difference keeps/increments streak
        newStreak += 1;
        shouldUpdate = true;
      } else if (diffDays > 2) {
        newStreak = 1;
        shouldUpdate = true;
      }
    }

    // Specific Activity Streaks (only increment once per day)
    if (lastActive !== today) {
      if (isMovement || (currentLog?.activities && currentLog.activities.length > 0)) {
        newMovementStreak += 1;
        shouldUpdate = true;
      }

      if (currentLog?.calories_consumed && currentLog.calories_consumed > 0) {
        newMealStreak += 1;
        shouldUpdate = true;
      }

      if (currentLog?.water && currentLog.water >= 2.5) {
        newWaterStreak += 1;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      const unlockedBadges = [...(profile.unlocked_badges || [])];
      
      // Milestone Badge Logic
      const milestones = [
        { days: 7, key: '7-day-rhythm', label: '7-Day Wellness Streak' },
        { days: 14, key: '14-day-balance', label: '14-Day Balance' },
        { days: 30, key: '30-day-lifestyle', label: '30-Day Lifestyle' }
      ];

      milestones.forEach(m => {
        if (newStreak >= m.days && !unlockedBadges.includes(m.key)) {
          unlockedBadges.push(m.key);
          toast.success(`New Badge Unlocked: ${m.label}! 🏆`);
        }
      });

      // First Workout Badge
      if (isMovement && !unlockedBadges.includes('first-workout')) {
        unlockedBadges.push('first-workout');
        toast.success("Badge Unlocked: First Workout Logged! 💪");
      }

      await supabase
        .from('user_profiles')
        .update({
          streak_count: newStreak,
          movement_streak: newMovementStreak,
          meal_streak: newMealStreak,
          water_streak: newWaterStreak,
          last_active_date: today,
          unlocked_badges: unlockedBadges,
          updated_at: new Date().toISOString()
        } as Database['public']['Tables']['user_profiles']['Update'])
        .eq('user_name', user);
    }
  },

  // NEW: Force sync from cloud to recover data
  syncAllData: async (user: 'Jushita' | 'Sneha'): Promise<DailyLog[]> => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        *,
        meals (*),
        activities (*)
      `)
      .eq('user_name', user)
      .order('date', { ascending: false });

    if (error) {
      console.error('Sync Error:', error);
      return [];
    }
    return data as DailyLog[];
  },

  // NEW: Export entire database for safety
  exportBackup: async (user: 'Jushita' | 'Sneha') => {
    const { data } = await supabase
      .from('daily_logs')
      .select('*, meals(*), activities(*)')
      .eq('user_name', user);
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user}_wellness_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }
};
