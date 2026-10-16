// Storage utility for dietary profile management in localStorage

const STORAGE_KEY = 'labellens_dietary_profile_v1';

export const DEFAULT_PROFILE = {
  dietary_preference: 'none', // 'none' | 'vegetarian' | 'vegan' | 'custom'
  dietary_preferences_custom: '',
  allergens_to_avoid: ['peanut', 'tree nuts'],
  custom_allergens: [],
  dietary_restrictions: ['gluten-free'],
  ingredients_to_avoid: ['high fructose corn syrup', 'palm oil'],
  nutrition_limits: {
    sugar: { value: 15, unit: 'g', basis: 'per serving', enabled: true },
    sodium: { value: 400, unit: 'mg', basis: 'per serving', enabled: true },
    calories: { value: 300, unit: 'kcal', basis: 'per serving', enabled: false },
    fat: { value: 10, unit: 'g', basis: 'per serving', enabled: false },
    saturated_fat: { value: 3, unit: 'g', basis: 'per serving', enabled: false },
    carbohydrates: { value: 40, unit: 'g', basis: 'per serving', enabled: false },
    protein: { value: 5, unit: 'g', basis: 'per serving', enabled: false },
    fiber: { value: 2, unit: 'g', basis: 'per serving', enabled: false },
  },
};

export const COMMON_ALLERGENS = [
  { id: 'milk', label: 'Milk / Dairy', description: 'Casein, whey, milk solids' },
  { id: 'peanut', label: 'Peanuts', description: 'Groundnuts, arachis' },
  { id: 'tree nuts', label: 'Tree Nuts', description: 'Almonds, cashews, walnuts, pecans' },
  { id: 'soy', label: 'Soy / Soya', description: 'Soybeans, soy lecithin, edamame' },
  { id: 'wheat', label: 'Wheat / Gluten', description: 'Flour, semolina, spelt' },
  { id: 'egg', label: 'Eggs', description: 'Egg whites, albumin, egg yolk' },
  { id: 'fish', label: 'Fish', description: 'Salmon, tuna, cod, anchovies' },
  { id: 'shellfish', label: 'Shellfish / Crustaceans', description: 'Shrimp, crab, lobster, prawns' },
  { id: 'sesame', label: 'Sesame', description: 'Sesame seeds, tahini, sesame oil' },
];

export const COMMON_RESTRICTIONS = [
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal',
  'Low-Sodium',
  'Sugar-Conscious',
  'Keto-Friendly',
  'Non-GMO',
  'Corn-Free',
  'Sulfite-Free',
];

export function loadDietaryProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      nutrition_limits: {
        ...DEFAULT_PROFILE.nutrition_limits,
        ...(parsed.nutrition_limits || {}),
      },
    };
  } catch (err) {
    console.warn('Failed to load profile from localStorage:', err);
    return DEFAULT_PROFILE;
  }
}

export function saveDietaryProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (err) {
    console.error('Failed to save profile to localStorage:', err);
    return false;
  }
}

export function clearDietaryProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('Failed to clear profile from localStorage:', err);
    return false;
  }
}

/**
 * Format the frontend profile into the exact Pydantic schema required by the backend:
 * class DietaryProfile(BaseModel):
 *     allergens_to_avoid: list[str] = Field(default_factory=list)
 *     ingredients_to_avoid: list[str] = Field(default_factory=list)
 *     dietary_preferences: list[str] = Field(default_factory=list)
 *     nutrition_limits: dict[str, float] = Field(default_factory=dict)
 */
export function formatProfileForBackend(profile) {
  // Combine standard and custom allergens
  const allAllergens = [
    ...(profile.allergens_to_avoid || []),
    ...(profile.custom_allergens || []),
  ].map((s) => s.trim().toLowerCase()).filter(Boolean);

  // Combine ingredients to avoid and custom restrictions
  const allIngredients = [
    ...(profile.ingredients_to_avoid || []),
    ...(profile.dietary_restrictions || []),
  ].map((s) => s.trim().toLowerCase()).filter(Boolean);

  // Preferences
  const preferences = [];
  if (profile.dietary_preference && profile.dietary_preference !== 'none') {
    if (profile.dietary_preference === 'custom' && profile.dietary_preferences_custom) {
      preferences.push(profile.dietary_preferences_custom.trim().toLowerCase());
    } else {
      preferences.push(profile.dietary_preference.trim().toLowerCase());
    }
  }

  // Nutrition limits: only enabled limits formatted as numeric key-values
  const limits = {};
  if (profile.nutrition_limits) {
    Object.entries(profile.nutrition_limits).forEach(([key, config]) => {
      if (config && config.enabled && config.value !== '' && !isNaN(Number(config.value))) {
        // Map key names to standard nutrient keys (e.g., saturated_fat -> saturated fat)
        const normalizedKey = key.replace(/_/g, ' ');
        limits[normalizedKey] = Number(config.value);
      }
    });
  }

  return {
    allergens_to_avoid: Array.from(new Set(allAllergens)),
    ingredients_to_avoid: Array.from(new Set(allIngredients)),
    dietary_preferences: Array.from(new Set(preferences)),
    nutrition_limits: limits,
  };
}
