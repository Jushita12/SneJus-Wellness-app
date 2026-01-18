import { createClient } from './supabase/client';
import { Database } from '@/database.types';

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

// Helper to get YYYY-MM-DD in local time
export const getLocalDateString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const storage = {
  saveLog: async (user: 'Jushita' | 'Sneha', log: Partial<Database['public']['Tables']['daily_logs']['Update']>) => {
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_name', user)
      .eq('date', log.date!)
      .single();

    if (existingLog) {
      const { error } = await supabase
        .from('daily_logs')
        .update({ ...log, updated_at: new Date().toISOString() })
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
          weight: log.weight
        });
      if (error) console.error('Error inserting log:', error);
    }
  },

  getLog: async (user: 'Jushita' | 'Sneha', date: string): Promise<DailyLog | null> => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        *,
        meals (*),
        activities (*)
      `)
      .eq('user_name', user)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching log:', error);
      return null;
    }
    return data as DailyLog | null;
  },

  addMeal: async (logId: string, meal: Omit<Database['public']['Tables']['meals']['Insert'], 'id' | 'log_id' | 'created_at'>) => {
    const { error: mealError } = await supabase
      .from('meals')
      .insert({
        ...meal,
        log_id: logId
      });
    
    if (mealError) {
      console.error('Error adding meal:', mealError);
      return;
    }

    // Update total calories in the daily log
    const { data: logData } = await supabase
      .from('daily_logs')
      .select('calories_consumed')
      .eq('id', logId)
      .single();

    if (logData) {
      const newTotal = (logData.calories_consumed || 0) + (meal.calories || 0);
      await supabase
        .from('daily_logs')
        .update({ calories_consumed: newTotal })
        .eq('id', logId);
    }
  },

  addActivity: async (logId: string, activity: Omit<Database['public']['Tables']['activities']['Insert'], 'id' | 'log_id' | 'created_at'>) => {
    const { error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        log_id: logId
      });
    
    if (error) console.error('Error adding activity:', error);
  },

  updateMeal: async (mealId: string, updates: Partial<Database['public']['Tables']['meals']['Update']>) => {
    const { error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId);
    if (error) console.error('Error updating meal:', error);
  },

  deleteMeal: async (mealId: string) => {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId);
    if (error) console.error('Error deleting meal:', error);
  },

  updateActivity: async (activityId: string, updates: Partial<Database['public']['Tables']['activities']['Update']>) => {
    const { error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', activityId);
    if (error) console.error('Error updating activity:', error);
  },

  deleteActivity: async (activityId: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);
    if (error) console.error('Error deleting activity:', error);
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

    return data.map(meal => ({
      id: meal.id,
      user: (meal.daily_logs as any).user_name,
      type: 'meal',
      title: `${(meal.daily_logs as any).user_name} logged ${meal.type}`,
      description: meal.description,
      timestamp: new Date(meal.created_at!).getTime(),
      date: (meal.daily_logs as any).date
    }));
  },

  getUserProfile: async (user: 'Jushita' | 'Sneha'): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_name', user)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({ user_name: user, streak_count: 0, movement_streak: 0, unlocked_badges: [] })
        .select()
        .single();
      if (createError) return null;
      return newProfile;
    }
    return data;
  },

  updateStreakAndBadges: async (user: 'Jushita' | 'Sneha', log: Partial<Database['public']['Tables']['daily_logs']['Row']>, isMovement: boolean = false) => {
    const profile = await storage.getUserProfile(user);
    if (!profile) return;

    const today = getLocalDateString();
    const lastActive = profile.last_active_date;
    
    let newStreak = profile.streak_count || 0;
    let newMovementStreak = profile.movement_streak || 0;
    let newMealStreak = profile.meal_streak || 0;
    let newWaterStreak = profile.water_streak || 0;
    let shouldUpdate = false;

    // Date Logic for Streaks
    if (!lastActive) {
      newStreak = 1;
      shouldUpdate = true;
    } else {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(today);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
        shouldUpdate = true;
      } else if (diffDays === 2) {
        // GRACE PERIOD: One missed day does NOT break streak
        newStreak += 1; 
        shouldUpdate = true;
      } else if (diffDays > 2) {
        newStreak = 1;
        shouldUpdate = true;
      }
    }

    // Specific Activity Streaks
    if (isMovement) {
      newMovementStreak += 1;
      shouldUpdate = true;
    }

    if (log.calories_consumed && log.calories_consumed > 0) {
      newMealStreak += 1;
      shouldUpdate = true;
    }

    if (log.water && log.water >= 8) {
      newWaterStreak += 1;
      shouldUpdate = true;
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
        })
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
