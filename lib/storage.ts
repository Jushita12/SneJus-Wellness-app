export type Meal = {
  id: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  description: string;
  hasRice: boolean;
  isNonVeg: boolean;
  timestamp: number;
};

export type DailyLog = {
  date: string; // YYYY-MM-DD
  water: number;
  steps: number;
  mood: string;
  meals: Meal[];
  symptoms: string[];
  sugarCravings: 'None' | 'Low' | 'Medium' | 'High';
  waist?: number;
  weight?: number;
};

const STORAGE_KEY = 'sister_cycle_sync_data';

export const storage = {
  saveLog: (user: 'Jushita' | 'Sneha', log: DailyLog) => {
    if (typeof window === 'undefined') return;
    const data = storage.getAllData();
    if (!data[user]) data[user] = {};
    data[user][log.date] = log;
    console.log(`Saving log for ${user}. date: ${log.date}`);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  getLog: (user: 'Jushita' | 'Sneha', date: string): DailyLog | null => {
    if (typeof window === 'undefined') return null;
    const data = storage.getAllData();
    const log = data[user]?.[date] || null;
    console.log(`Getting log for ${user} on ${date}:`, log);
    return log;
  },

  getHistory: (user: 'Jushita' | 'Sneha', days: number = 7): DailyLog[] => {
    if (typeof window === 'undefined') return [];
    const data = storage.getAllData();
    const userLogs = data[user] || {};
    
    return Object.keys(userLogs)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, days)
      .map(date => userLogs[date]);
  },

  getFeed: () => {
    if (typeof window === 'undefined') return [];
    const data = storage.getAllData();
    const feedItems: any[] = [];

    Object.entries(data).forEach(([user, logs]: [string, any]) => {
      Object.entries(logs).forEach(([date, log]: [string, any]) => {
        // Add meal activities
        log.meals?.forEach((meal: any) => {
          feedItems.push({
            id: meal.id,
            user,
            type: 'meal',
            title: `${user} logged ${meal.type}`,
            description: meal.description,
            timestamp: meal.timestamp,
            date
          });
        });
        // Add water milestones
        if (log.water >= 2) {
          feedItems.push({
            id: `water-${user}-${date}`,
            user,
            type: 'milestone',
            title: `${user} hit 2L water!`,
            description: 'Hydration goal achieved 💧',
            timestamp: new Date(date).getTime(),
            date
          });
        }
      });
    });

    return feedItems.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  },

  getAllData: () => {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }
};
