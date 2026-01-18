import { createClient } from './supabase/client';
import { Database } from '@/database.types';

export type Meal = Database['public']['Tables']['meals']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type DailyLog = Database['public']['Tables']['daily_logs']['Row'] & {
  meals: Meal[];
  activities: Activity[];
};
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

const supabase = createClient();

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
    const { error } = await supabase
      .from('meals')
      .insert({
        ...meal,
        log_id: logId
      });
    if (error) console.error('Error adding meal:', error);
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
    if (error) return null;
    return data;
  },

  updateStreakAndBadges: async (user: 'Jushita' | 'Sneha', log: Partial<Database['public']['Tables']['daily_logs']['Row']>, isMovement: boolean = false) => {
    const profile = await storage.getUserProfile(user);
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = profile.last_active_date;
    
    let newStreak = profile.streak_count || 0;
    let newMovementStreak = profile.movement_streak || 0;
    let shouldUpdate = false;

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
      } else if (diffDays > 2) {
        // Streak breaks only after 2 consecutive inactive days
        newStreak = 1;
        shouldUpdate = true;
      } else if (diffDays === 2) {
        // Grace period: streak continues if they log on the 2nd day
        newStreak += 1;
        shouldUpdate = true;
      }
      // If diffDays === 0, they already logged today, no streak change
    }

    // Movement Streak Logic
    if (isMovement) {
      // Similar forgiving logic for movement
      newMovementStreak += 1;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const unlockedBadges = [...(profile.unlocked_badges || [])];
      
      // Consistency Badge Logic
      const consistencyMilestones = [
        { days: 3, key: '3-day-start', label: '3-Day Start' },
        { days: 7, key: '7-day-rhythm', label: '7-Day Rhythm' },
        { days: 14, key: '14-day-balance', label: '14-Day Balance' },
        { days: 30, key: '30-day-lifestyle', label: '30-Day Lifestyle' }
      ];

      consistencyMilestones.forEach(m => {
        if (newStreak >= m.days && !unlockedBadges.includes(m.key)) {
          unlockedBadges.push(m.key);
        }
      });

      // Movement Badge Logic
      if (isMovement && !unlockedBadges.includes('first-workout')) {
        unlockedBadges.push('first-workout');
      }
      if (newMovementStreak >= 7 && !unlockedBadges.includes('7-day-movement')) {
        unlockedBadges.push('7-day-movement');
      }

      await supabase
        .from('user_profiles')
        .update({
          streak_count: newStreak,
          movement_streak: newMovementStreak,
          last_active_date: today,
          unlocked_badges: unlockedBadges,
          updated_at: new Date().toISOString()
        })
        .eq('user_name', user);
    }
  }
};
