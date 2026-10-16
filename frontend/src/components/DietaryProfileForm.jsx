import { useState } from 'react';
import {
  Save,
  RotateCcw,
  Plus,
  X,
  Check,
  Sliders,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import {
  COMMON_ALLERGENS,
  COMMON_RESTRICTIONS,
  DEFAULT_PROFILE,
  saveDietaryProfile,
  clearDietaryProfile,
} from '../utils/storage';
import { SAMPLE_PROFILE_FIXTURE } from '../utils/mockData';

export default function DietaryProfileForm({ profile, setProfile, onSaved }) {
  const [newCustomAllergen, setNewCustomAllergen] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [newRestriction, setNewRestriction] = useState('');
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'cleared' | null

  const handlePreferenceChange = (val) => {
    setProfile((prev) => ({ ...prev, dietary_preference: val }));
  };

  const toggleAllergen = (allergenId) => {
    setProfile((prev) => {
      const exists = (prev.allergens_to_avoid || []).includes(allergenId);
      const updated = exists
        ? prev.allergens_to_avoid.filter((a) => a !== allergenId)
        : [...(prev.allergens_to_avoid || []), allergenId];
      return { ...prev, allergens_to_avoid: updated };
    });
  };

  const addCustomAllergen = (e) => {
    e?.preventDefault();
    const clean = newCustomAllergen.trim().toLowerCase();
    if (!clean) return;
    if (!(profile.custom_allergens || []).includes(clean)) {
      setProfile((prev) => ({
        ...prev,
        custom_allergens: [...(prev.custom_allergens || []), clean],
      }));
    }
    setNewCustomAllergen('');
  };

  const removeCustomAllergen = (item) => {
    setProfile((prev) => ({
      ...prev,
      custom_allergens: (prev.custom_allergens || []).filter((a) => a !== item),
    }));
  };

  const addIngredientAvoid = (e) => {
    e?.preventDefault();
    const clean = newIngredient.trim().toLowerCase();
    if (!clean) return;
    if (!(profile.ingredients_to_avoid || []).includes(clean)) {
      setProfile((prev) => ({
        ...prev,
        ingredients_to_avoid: [...(prev.ingredients_to_avoid || []), clean],
      }));
    }
    setNewIngredient('');
  };

  const removeIngredientAvoid = (item) => {
    setProfile((prev) => ({
      ...prev,
      ingredients_to_avoid: (prev.ingredients_to_avoid || []).filter((i) => i !== item),
    }));
  };

  const toggleRestriction = (rest) => {
    setProfile((prev) => {
      const exists = (prev.dietary_restrictions || []).includes(rest);
      const updated = exists
        ? prev.dietary_restrictions.filter((r) => r !== rest)
        : [...(prev.dietary_restrictions || []), rest];
      return { ...prev, dietary_restrictions: updated };
    });
  };

  const addCustomRestriction = (e) => {
    e?.preventDefault();
    const clean = newRestriction.trim();
    if (!clean) return;
    if (!(profile.dietary_restrictions || []).includes(clean)) {
      setProfile((prev) => ({
        ...prev,
        dietary_restrictions: [...(prev.dietary_restrictions || []), clean],
      }));
    }
    setNewRestriction('');
  };

  const handleNutrientLimitChange = (key, field, value) => {
    setProfile((prev) => ({
      ...prev,
      nutrition_limits: {
        ...prev.nutrition_limits,
        [key]: {
          ...prev.nutrition_limits[key],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    const success = saveDietaryProfile(profile);
    if (success) {
      setSaveStatus('saved');
      if (onSaved) onSaved();
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  const handleClear = () => {
    if (window.confirm('Reset all dietary profile settings to empty defaults?')) {
      clearDietaryProfile();
      setProfile(DEFAULT_PROFILE);
      setSaveStatus('cleared');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleLoadSample = () => {
    setProfile(SAMPLE_PROFILE_FIXTURE);
    setSaveStatus('loaded');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="card" role="region" aria-label="Dietary Profile Configuration">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Sliders size={22} color="var(--primary-700)" />
            Personal Dietary Profile
          </h2>
          <p className="card-description">
            Define your dietary restrictions, allergens, and nutritional thresholds. Saved locally in your browser.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleLoadSample} title="Load preset profile for quick testing">
            <FileCheck size={16} />
            Load Sample Profile
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleClear} title="Clear saved profile">
            <RotateCcw size={16} />
            Reset
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <Save size={16} />
            Save Profile
          </button>
        </div>
      </div>

      {saveStatus && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.9rem',
            background: saveStatus === 'saved' || saveStatus === 'loaded' ? '#ecfdf5' : '#fef2f2',
            color: saveStatus === 'saved' || saveStatus === 'loaded' ? '#065f46' : '#991b1b',
            border: `1px solid ${saveStatus === 'saved' || saveStatus === 'loaded' ? '#a7f3d0' : '#fecaca'}`,
          }}
          role="status"
        >
          <Check size={18} />
          <span>
            {saveStatus === 'saved' && 'Dietary profile successfully saved to browser local storage.'}
            {saveStatus === 'loaded' && 'Sample test profile loaded. Click "Save Profile" to keep it.'}
            {saveStatus === 'cleared' && 'Dietary profile reset.'}
          </span>
        </div>
      )}

      {/* 1. Dietary Preference */}
      <div className="form-group">
        <label className="form-label" htmlFor="dietary-pref-select">
          Dietary Preference
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {[
            { id: 'none', label: 'None / Standard' },
            { id: 'vegetarian', label: 'Vegetarian' },
            { id: 'vegan', label: 'Vegan' },
            { id: 'custom', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${profile.dietary_preference === item.id ? 'selected' : ''}`}
              onClick={() => handlePreferenceChange(item.id)}
            >
              {profile.dietary_preference === item.id && <Check size={14} />}
              {item.label}
            </button>
          ))}
        </div>

        {profile.dietary_preference === 'custom' && (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Pescatarian, Whole Foods Plant-Based"
              value={profile.dietary_preferences_custom || ''}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  dietary_preferences_custom: e.target.value,
                }))
              }
            />
          </div>
        )}
      </div>

      {/* 2. Common Allergens */}
      <div className="form-group" style={{ marginTop: 24 }}>
        <label className="form-label">
          Major Allergens to Avoid
        </label>
        <p className="form-helper">
          Select FDA/EU regulated allergens to flag when detected in ingredients or precautionary statements.
        </p>

        <div className="chips-container" style={{ marginTop: 10 }}>
          {COMMON_ALLERGENS.map((allergen) => {
            const isSelected = (profile.allergens_to_avoid || []).includes(allergen.id);
            return (
              <button
                key={allergen.id}
                type="button"
                className={`chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleAllergen(allergen.id)}
                title={allergen.description}
                aria-pressed={isSelected}
              >
                {isSelected && <Check size={14} />}
                <span>{allergen.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Allergens */}
        <div style={{ marginTop: 14 }}>
          <form onSubmit={addCustomAllergen} style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Add other allergen (e.g. mustard, celery, lupin)..."
              value={newCustomAllergen}
              onChange={(e) => setNewCustomAllergen(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newCustomAllergen.trim()}>
              <Plus size={16} />
              Add
            </button>
          </form>

          {(profile.custom_allergens || []).length > 0 && (
            <div className="chips-container" style={{ marginTop: 10 }}>
              {profile.custom_allergens.map((item) => (
                <span key={item} className="chip selected">
                  {item}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => removeCustomAllergen(item)}
                    aria-label={`Remove ${item}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Dietary Restrictions (Gluten-Free, Kosher, Halal, etc.) */}
      <div className="form-group" style={{ marginTop: 24 }}>
        <label className="form-label">
          Dietary Restrictions & Regimens
        </label>
        <div className="chips-container" style={{ marginTop: 8 }}>
          {COMMON_RESTRICTIONS.map((res) => {
            const isSelected = (profile.dietary_restrictions || []).includes(res);
            return (
              <button
                key={res}
                type="button"
                className={`chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleRestriction(res)}
                aria-pressed={isSelected}
              >
                {isSelected && <Check size={14} />}
                {res}
              </button>
            );
          })}
        </div>

        {/* Custom Restriction input */}
        <div style={{ marginTop: 12 }}>
          <form onSubmit={addCustomRestriction} style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Add custom restriction (e.g. FODMAP-safe)..."
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newRestriction.trim()}>
              <Plus size={16} />
              Add
            </button>
          </form>
        </div>
      </div>

      {/* 4. Custom Ingredients or Phrases to Avoid */}
      <div className="form-group" style={{ marginTop: 24 }}>
        <label className="form-label">
          Specific Ingredients or Additives to Avoid
        </label>
        <p className="form-helper">
          Flag specific ingredients, sweeteners, oils, or food dyes by name.
        </p>

        <form onSubmit={addIngredientAvoid} style={{ display: 'flex', gap: 8, maxWidth: 440, marginTop: 8 }}>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. palm oil, high fructose corn syrup, red 40, aspartame..."
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={!newIngredient.trim()}>
            <Plus size={16} />
            Add
          </button>
        </form>

        {(profile.ingredients_to_avoid || []).length > 0 && (
          <div className="chips-container" style={{ marginTop: 10 }}>
            {profile.ingredients_to_avoid.map((item) => (
              <span key={item} className="chip selected">
                {item}
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => removeIngredientAvoid(item)}
                  aria-label={`Remove ${item}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. Optional Nutrition Limits */}
      <div className="form-group" style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label className="form-label" style={{ marginBottom: 0 }}>
            Nutritional Limits (Maximum Thresholds)
          </label>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Only enabled limits are evaluated
          </span>
        </div>
        <p className="form-helper" style={{ marginBottom: 14 }}>
          Set maximum allowed values. The backend compares extracted readable nutrition values against these thresholds.
        </p>

        <div className="nutrition-grid">
          {Object.entries(profile.nutrition_limits || {}).map(([key, config]) => {
            const labelMap = {
              sugar: 'Max Total Sugars',
              sodium: 'Max Sodium',
              calories: 'Max Calories',
              fat: 'Max Total Fat',
              saturated_fat: 'Max Saturated Fat',
              carbohydrates: 'Max Carbohydrates',
              protein: 'Min/Max Protein',
              fiber: 'Min/Max Fiber',
            };
            const label = labelMap[key] || key.replace(/_/g, ' ');

            return (
              <div key={key} className={`nutrient-card ${config.enabled ? 'active' : ''}`}>
                <div className="nutrient-header">
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!config.enabled}
                      onChange={(e) =>
                        handleNutrientLimitChange(key, 'enabled', e.target.checked)
                      }
                    />
                    <span>{label}</span>
                  </label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {config.unit}
                  </span>
                </div>

                <div className="nutrient-inputs">
                  <input
                    type="number"
                    className="form-control"
                    disabled={!config.enabled}
                    value={config.value}
                    onChange={(e) =>
                      handleNutrientLimitChange(key, 'value', e.target.value)
                    }
                    placeholder="Limit"
                    style={{ maxWidth: 110 }}
                  />
                  <select
                    className="form-control"
                    disabled={!config.enabled}
                    value={config.basis || 'per serving'}
                    onChange={(e) =>
                      handleNutrientLimitChange(key, 'basis', e.target.value)
                    }
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="per serving">per serving</option>
                    <option value="per 100g">per 100g</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transparency Note */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          background: 'var(--bg-subtle)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          marginTop: 28,
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          alignItems: 'flex-start',
        }}
      >
        <HelpCircle size={18} style={{ color: 'var(--primary-700)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Medical & Regulatory Transparency:</strong> Custom restrictions and ingredient avoidance entries are user-defined phrases compared against visible label text. LabelLens does not certify scientific or medical allergen-free status.
        </div>
      </div>
    </div>
  );
}
