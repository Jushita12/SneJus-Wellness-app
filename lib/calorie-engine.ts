export type PortionSize = 'small' | 'medium' | 'large' | 'piece' | 'cup' | 'bowl' | 'spoon';

const FOOD_DATABASE: Record<string, number> = {
  // South Indian Staples
  'idli': 65,
  'dosa': 120,
  'masala dosa': 250,
  'sambar': 150, // per bowl
  'chutney': 50,
  'upma': 200, // per cup
  'poha': 180,
  'vada': 120,
  'pongal': 300,
  
  // Rice & Grains
  'rice': 200, // per cup cooked
  'brown rice': 190,
  'roti': 85,
  'chapati': 85,
  'paratha': 180,
  'quinoa': 170,
  
  // Proteins
  'chicken curry': 250, // per bowl
  'fish curry': 200,
  'dal': 150,
  'paneer': 200,
  'egg': 75,
  'boiled egg': 75,
  'omelette': 150,
  'curd': 100, // per cup
  'greek yogurt': 120,
  
  // Snacks/Others
  'coffee': 40,
  'tea': 40,
  'sugar': 20, // per spoon
  'biscuit': 50,
  'fruit': 80,
  'nuts': 150, // handful
};

export function estimateCalories(input: string): { total: number; items: { name: string; cal: number }[] } {
  const text = input.toLowerCase();
  let total = 0;
  const items: { name: string; cal: number }[] = [];

  // Simple heuristic parser
  Object.keys(FOOD_DATABASE).forEach(food => {
    if (text.includes(food)) {
      let multiplier = 1;
      
      // Check for quantities (1-9)
      const match = text.match(new RegExp(`(\\d+)\\s*${food}`));
      if (match) multiplier = parseInt(match[1]);
      
      // Check for portion keywords
      if (text.includes(`large ${food}`)) multiplier *= 1.5;
      if (text.includes(`small ${food}`)) multiplier *= 0.7;
      if (text.includes(`bowl of ${food}`)) multiplier *= 1.2;

      const cal = Math.round(FOOD_DATABASE[food] * multiplier);
      total += cal;
      items.push({ name: food, cal });
    }
  });

  // If no match found, provide a safe average based on word count
  if (total === 0 && text.length > 3) {
    total = 250; // Default "average meal"
    items.push({ name: 'Estimated Meal', cal: 250 });
  }

  return { total, items };
}

export function getCoachFeedback(log: any, user: 'Jushita' | 'Sneha') {
  const consumed = log?.calories_consumed || 0;
  const burned = log?.calories_burned || 0;
  const target = log?.calorie_target || 1500;
  const water = log?.water || 0;
  const steps = log?.steps || 0;
  const isPeriod = log?.is_period;
  const isSick = log?.is_sick;
  const sickNotes = log?.sick_notes;
  const cravings = log?.sugar_cravings;
  
  const netCalories = consumed - burned;
  const diff = netCalories - target;

  // 0. Sickness Context (Absolute Highest Priority)
  if (isSick) {
    return `Health is the priority today, ${user}. Since you're feeling ${sickNotes || 'unwell'}, please skip the gym and focus on 100% recovery. Drink plenty of warm fluids, prioritize sleep, and eat nourishing, easy-to-digest meals. We'll get back to the goals once you're 100%. 🍵✨`;
  }

  // 1. Period/Cycle Context (Highest Priority)
  if (isPeriod) {
    return `Listen to your body today, ${user}. During your period, your basal metabolic rate actually increases slightly, but so does inflammation. Focus on iron-rich foods and gentle movement. If you're craving ${cravings || 'something sweet'}, try dark chocolate or fruit first, but don't stress a small treat.`;
  }

  // 2. Hydration Check
  if (water < 1.5 && new Date().getHours() > 14) {
    return `Hey ${user}, your hydration is a bit low for this time of day (only ${water}L). Low water often masquerades as hunger or fatigue. Drink a large glass now before your next meal!`;
  }

  // 3. Calorie & Energy Balance
  if (consumed === 0) {
    return `Ready for a fresh start, ${user}? Let's focus on a high-protein first meal to stabilize your blood sugar for the day.`;
  }

  if (diff < -500 && steps > 8000) {
    return `You've been very active but your intake is quite low. To prevent a metabolic slowdown or a binge later, ensure your next meal has healthy fats and complex carbs. Fuel the fire! 🔥`;
  }

  if (Math.abs(diff) <= 200) {
    return `Spot on, ${user}! You're in the 'Optimal Zone'. Your energy intake perfectly matches your goals. This consistency is exactly how long-term body composition changes happen.`;
  }

  if (diff > 300) {
    return `A bit of a surplus today? No problem. Use that extra energy for a strong workout tomorrow. Remember, one day doesn't break progress—it's the 80/20 rule. Focus on fiber and protein for your next meal.`;
  }

  // 4. Movement Nudge
  if (steps < 3000 && new Date().getHours() > 17) {
    return `Your movement is a bit low today. Even a 15-minute 'digestive walk' after dinner can significantly improve your insulin sensitivity and sleep quality.`;
  }

  return `You're doing great, ${user}. Keep logging your meals and movement. Consistency is the only 'secret' to wellness.`;
}

export function getCalorieTarget(age: number, weight: number, activity: 'low' | 'medium' | 'high'): number {
  // Simplified TDEE for fat loss (approx 20% deficit)
  let base = weight * 22;
  if (activity === 'medium') base *= 1.2;
  if (activity === 'high') base *= 1.4;
  return Math.round(base * 0.8);
}

// MET values for common activities
const ACTIVITY_MET: Record<string, number> = {
  'walk': 3.5,
  'brisk walk': 4.5,
  'gym': 6.0,
  'weight lifting': 5.0,
  'yoga': 3.0,
  'cardio': 8.0,
  'hiit': 10.0,
  'home workout': 5.0,
  'cycling': 6.0,
  'swimming': 7.0
};

export function estimateBurnedCalories(type: string, durationMins: number, weightKg: number = 65): number {
  const activity = type.toLowerCase();
  let met = 5.0; // Default moderate intensity

  // Find the closest MET value
  Object.keys(ACTIVITY_MET).forEach(key => {
    if (activity.includes(key)) met = ACTIVITY_MET[key];
  });

  // Formula: (MET * 3.5 * weightKg / 200) * duration
  const burned = (met * 3.5 * weightKg / 200) * durationMins;
  return Math.round(burned);
}
