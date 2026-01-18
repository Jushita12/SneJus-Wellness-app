export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  category: 'meal' | 'activity' | 'health';
};

export type DailyData = {
  checklist: ChecklistItem[];
  water: number;
  steps?: number;
  weight?: number;
  waist?: number;
  notes: string;
  symptoms: string[];
};

export type UserProfile = {
  name: 'Jushita' | 'Sneha';
  streak: number;
  gymStreak: number;
  lastActive: string | null;
  badges: string[];
  history: Record<string, DailyData>; // date string YYYY-MM-DD -> data
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'bf', label: 'Breakfast done', checked: false, category: 'meal' },
  { id: 'ln', label: 'Lunch done (Rice allowed)', checked: false, category: 'meal' },
  { id: 'dn', label: 'Dinner done (No Rice)', checked: false, category: 'meal' },
  { id: 'sn', label: 'Healthy snack', checked: false, category: 'meal' },
  { id: 'mv', label: 'Gym / Movement', checked: false, category: 'activity' },
  { id: 'st', label: 'Steps / Walk (10k goal)', checked: false, category: 'activity' },
  { id: 'sy', label: 'Symptom update', checked: false, category: 'health' },
];

const STORAGE_KEY = 'sister_goals_data';

export const localStore = {
  getData: (): Record<string, UserProfile> => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const initial: Record<string, UserProfile> = {
        Jushita: { name: 'Jushita', streak: 0, gymStreak: 0, lastActive: null, badges: [], history: {} },
        Sneha: { name: 'Sneha', streak: 0, gymStreak: 0, lastActive: null, badges: [], history: {} },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },

  saveData: (data: Record<string, UserProfile>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  getTodayData: (userName: string, dateStr: string): DailyData => {
    const allData = localStore.getData();
    const user = allData[userName];
    if (user.history[dateStr]) return user.history[dateStr];
    
    return {
      checklist: [...DEFAULT_CHECKLIST],
      water: 0,
      notes: '',
      symptoms: []
    };
  },

  updateToday: (userName: string, dateStr: string, updates: Partial<DailyData>) => {
    const allData = localStore.getData();
    const user = allData[userName];
    const current = user.history[dateStr] || { checklist: [...DEFAULT_CHECKLIST], water: 0, notes: '', symptoms: [] };
    
    user.history[dateStr] = { ...current, ...updates };
    
    // Update Streaks
    const completedCount = user.history[dateStr].checklist.filter(i => i.checked).length;
    if (completedCount >= 4 && user.lastActive !== dateStr) {
      const lastDate = user.lastActive ? new Date(user.lastActive) : null;
      const today = new Date(dateStr);
      
      if (!lastDate) {
        user.streak = 1;
      } else {
        const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1 || diff === 2) { // 1 day grace period
          user.streak += 1;
        } else if (diff > 2) {
          user.streak = 1;
        }
      }
      user.lastActive = dateStr;
      
      // Badge Logic
      const milestones = [7, 14, 30];
      milestones.forEach(m => {
        const badge = `${m}-day-streak`;
        if (user.streak >= m && !user.badges.includes(badge)) {
          user.badges.push(badge);
        }
      });
    }

    localStore.saveData(allData);
  },

  exportData: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    const blob = new Blob([data || '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sister-goals-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }
};
