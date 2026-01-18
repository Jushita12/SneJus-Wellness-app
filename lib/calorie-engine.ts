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

export function getCoachFeedback(consumed: number, target: number, user: 'Jushita' | 'Sneha') {
  const diff = consumed - target;
  const isJushita = user === 'Jushita';
  
  if (consumed === 0) {
    return `Ready for a fresh start, ${user}? Let's focus on a high-protein first meal to keep your energy steady today. No pressure, just one good choice at a time.`;
  }
  
  if (diff < -400) {
    return "You're fueling quite light today. Remember, sustainable fat loss requires energy for your metabolism and hormones to function. Try to add a small protein-rich snack like Greek yogurt or a few nuts.";
  }
  
  if (Math.abs(diff) <= 150) {
    return "Beautifully balanced. You're hitting that 'Goldilocks' zone where your body feels safe to release fat while keeping your hormones happy. Keep this rhythm!";
  }
  
  if (diff > 150 && diff < 500) {
    return "Today was a high-energy day, and that's perfectly normal. Our bodies aren't machines. Focus on hydration and a fiber-rich dinner to help your body process everything smoothly.";
  }
  
  return "A bit of a surplus today? Don't sweat it. One day doesn't define your journey—consistency does. Let's prioritize a gentle 20-minute walk and get back to our baseline tomorrow.";
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
