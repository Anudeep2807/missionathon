// Realistic sample products and responses conforming to backend AnalyzeResponse schema
// Used for UI testing, interactive live demos, and edge-case verification

export const SAMPLE_PRODUCTS = [
  {
    id: 'granola',
    name: 'Nature’s Crunch Honey Almond Granola',
    category: 'Cereals & Snacks',
    badge: 'Contains Nuts & Soy',
    badgeType: 'conflict',
    summary: '2 confirmed allergen conflicts (Tree Nuts, Milk) & exceeded sugar threshold (16g vs 15g limit).',
    response: {
      request_id: 'demo-granola-8f12a',
      extracted: {
        product_name: 'Nature’s Crunch Honey Almond Granola Bar',
        ingredients: [
          { name: 'Whole grain rolled oats', source_text: 'Whole Grain Rolled Oats', status: 'observed' },
          { name: 'Cane sugar', source_text: 'Cane Sugar', status: 'observed' },
          { name: 'Almonds', source_text: 'Roasted Almonds (Almonds, Sunflower Oil)', status: 'observed' },
          { name: 'Palm oil', source_text: 'Sustainable Palm Kernel Oil', status: 'observed' },
          { name: 'Honey', source_text: 'Pure Clover Honey', status: 'observed' },
          { name: 'Whey powder', source_text: 'Whey Protein Concentrate (Milk)', status: 'observed' },
          { name: 'Soy lecithin', source_text: 'Soy Lecithin (Emulsifier)', status: 'observed' },
          { name: 'Natural flavor', source_text: 'Natural Vanilla Flavoring', status: 'observed' },
          { name: 'Sea salt', source_text: 'Sea Salt', status: 'observed' },
          { name: 'Preservatives', source_text: null, status: 'not_detected' },
          { name: 'Trace vitamins', source_text: '...[unreadable fold near seam]...', status: 'unreadable' }
        ],
        nutrition: [
          { name: 'Calories', value: 210, unit: 'kcal', serving_basis: '1 bar (45g)', source_text: 'Calories 210', status: 'observed' },
          { name: 'Total Fat', value: 9, unit: 'g', serving_basis: '1 bar (45g)', source_text: 'Total Fat 9g', status: 'observed' },
          { name: 'Saturated Fat', value: 3.5, unit: 'g', serving_basis: '1 bar (45g)', source_text: 'Saturated Fat 3.5g', status: 'observed' },
          { name: 'Sodium', value: 140, unit: 'mg', serving_basis: '1 bar (45g)', source_text: 'Sodium 140mg', status: 'observed' },
          { name: 'Total Carbohydrates', value: 28, unit: 'g', serving_basis: '1 bar (45g)', source_text: 'Total Carb. 28g', status: 'observed' },
          { name: 'Dietary Fiber', value: 3, unit: 'g', serving_basis: '1 bar (45g)', source_text: 'Dietary Fiber 3g', status: 'observed' },
          { name: 'Total Sugars', value: 16, unit: 'g', serving_basis: '1 bar (45g)', source_text: 'Total Sugars 16g (Includes 14g Added Sugars)', status: 'observed' },
          { name: 'Protein', value: 5, unit: 'g', serving_basis: '1 bar (45g)', source_text: 'Protein 5g', status: 'observed' },
          { name: 'Potassium', value: null, unit: 'mg', serving_basis: '1 bar (45g)', source_text: 'Potassium --', status: 'unreadable' }
        ],
        allergen_statements: [
          {
            text: 'Contains Almonds, Milk, and Soy.',
            source_text: 'CONTAINS: ALMONDS, MILK, SOY.',
            kind: 'contains',
            status: 'observed'
          },
          {
            text: 'May contain traces of peanuts, wheat, and sesame.',
            source_text: 'MAY CONTAIN: PEANUTS, WHEAT, AND SESAME SEEDS.',
            kind: 'may_contain',
            status: 'observed'
          },
          {
            text: 'Manufactured in a facility that processes egg and other tree nuts.',
            source_text: 'PROCESSED IN A FACILITY THAT ALSO HANDLES EGGS AND CASHEWS.',
            kind: 'shared_facility',
            status: 'observed'
          }
        ],
        warnings: [
          'The lower right portion of the ingredient list has glare, resulting in 1 unreadable item.',
          'Package curvature near the seam slightly warped text in the vitamin breakdown.'
        ],
        raw_text: 'INGREDIENTS: Whole Grain Rolled Oats, Cane Sugar, Roasted Almonds (Almonds, Sunflower Oil), Sustainable Palm Kernel Oil, Pure Clover Honey, Whey Protein Concentrate (Milk), Soy Lecithin (Emulsifier), Natural Vanilla Flavoring, Sea Salt. CONTAINS: ALMONDS, MILK, SOY. MAY CONTAIN: PEANUTS, WHEAT, AND SESAME SEEDS.'
      },
      findings: [
        {
          rule: 'allergen:peanut',
          status: 'conflict',
          message: 'The label has a precautionary allergen statement: "MAY CONTAIN: PEANUTS, WHEAT, AND SESAME SEEDS."',
          evidence: ['MAY CONTAIN: PEANUTS, WHEAT, AND SESAME SEEDS.']
        },
        {
          rule: 'allergen:tree nuts',
          status: 'conflict',
          message: 'Matching allergen term found in the ingredient list: "Roasted Almonds (Almonds, Sunflower Oil)".',
          evidence: ['Roasted Almonds (Almonds, Sunflower Oil)', 'CONTAINS: ALMONDS, MILK, SOY.']
        },
        {
          rule: 'ingredient:palm oil',
          status: 'conflict',
          message: 'The ingredient "palm oil" appears in extracted ingredients ("Sustainable Palm Kernel Oil").',
          evidence: ['Sustainable Palm Kernel Oil']
        },
        {
          rule: 'nutrition:sugar',
          status: 'conflict',
          message: 'Extracted sugar is 16g, exceeding user threshold limit of 15g.',
          evidence: ['Total Sugars 16g (Includes 14g Added Sugars)']
        },
        {
          rule: 'nutrition:sodium',
          status: 'no_conflict_found',
          message: 'Extracted sodium (140mg) is safely below the configured threshold of 400mg.',
          evidence: ['Sodium 140mg']
        },
        {
          rule: 'allergen:fish',
          status: 'unknown',
          message: 'No matching mention was detected in readable text. (Absence does not guarantee clinical absence).',
          evidence: []
        }
      ]
    }
  },
  {
    id: 'chocolate',
    name: 'Artisan 72% Single-Origin Dark Chocolate',
    category: 'Confectionery',
    badge: 'Precautionary Warning',
    badgeType: 'unknown',
    summary: 'No milk in ingredients, but label contains explicit advisory: "May contain traces of milk and hazelnuts".',
    response: {
      request_id: 'demo-choco-9e33b',
      extracted: {
        product_name: 'Artisan 72% Single-Origin Dark Chocolate Bar',
        ingredients: [
          { name: 'Organic cacao beans', source_text: 'Fair Trade Organic Cacao Beans', status: 'observed' },
          { name: 'Organic cane sugar', source_text: 'Organic Evaporated Cane Juice', status: 'observed' },
          { name: 'Cacao butter', source_text: 'Pure Cocoa Butter', status: 'observed' },
          { name: 'Vanilla bean', source_text: 'Madagascar Bourbon Vanilla Bean', status: 'observed' }
        ],
        nutrition: [
          { name: 'Calories', value: 180, unit: 'kcal', serving_basis: '30g (3 squares)', source_text: 'Calories 180', status: 'observed' },
          { name: 'Total Fat', value: 14, unit: 'g', serving_basis: '30g', source_text: 'Total Fat 14g', status: 'observed' },
          { name: 'Saturated Fat', value: 8, unit: 'g', serving_basis: '30g', source_text: 'Saturated Fat 8g', status: 'observed' },
          { name: 'Sodium', value: 5, unit: 'mg', serving_basis: '30g', source_text: 'Sodium 5mg', status: 'observed' },
          { name: 'Total Sugars', value: 9, unit: 'g', serving_basis: '30g', source_text: 'Total Sugars 9g', status: 'observed' },
          { name: 'Protein', value: 3, unit: 'g', serving_basis: '30g', source_text: 'Protein 3g', status: 'observed' }
        ],
        allergen_statements: [
          {
            text: 'May contain traces of milk, hazelnuts, and almonds due to shared processing equipment.',
            source_text: 'MAY CONTAIN TRACES OF MILK, HAZELNUTS, AND ALMONDS.',
            kind: 'may_contain',
            status: 'observed'
          }
        ],
        warnings: [
          'Saturated fat is 8g per 30g serving. Review nutritional goals.'
        ],
        raw_text: 'INGREDIENTS: Fair Trade Organic Cacao Beans, Organic Evaporated Cane Juice, Pure Cocoa Butter, Madagascar Bourbon Vanilla Bean. MAY CONTAIN TRACES OF MILK, HAZELNUTS, AND ALMONDS.'
      },
      findings: [
        {
          rule: 'allergen:milk',
          status: 'unknown',
          message: 'Advisory notice: "MAY CONTAIN TRACES OF MILK". Not an active ingredient, but risk of cross-contact.',
          evidence: ['MAY CONTAIN TRACES OF MILK, HAZELNUTS, AND ALMONDS.']
        },
        {
          rule: 'allergen:tree nuts',
          status: 'unknown',
          message: 'Advisory notice mentions "HAZELNUTS, AND ALMONDS". Review sensitivity level.',
          evidence: ['MAY CONTAIN TRACES OF MILK, HAZELNUTS, AND ALMONDS.']
        },
        {
          rule: 'ingredient:palm oil',
          status: 'no_conflict_found',
          message: 'Palm oil not detected in extracted ingredient list.',
          evidence: []
        },
        {
          rule: 'nutrition:sugar',
          status: 'no_conflict_found',
          message: 'Total Sugars is 9g, well below 15g threshold.',
          evidence: ['Total Sugars 9g']
        }
      ]
    }
  },
  {
    id: 'crispbread',
    name: 'Superfood Chia & Flaxseed Artisan Crispbread',
    category: 'Crackers & Bakery',
    badge: 'Evaluated: No Conflicts',
    badgeType: 'no_conflict_found',
    summary: 'All evaluated checks passed. No gluten, dairy, nuts, or excess sodium detected in legible sections.',
    response: {
      request_id: 'demo-crisp-4a11c',
      extracted: {
        product_name: 'Superfood Chia & Flaxseed Artisan Crispbread',
        ingredients: [
          { name: 'Brown rice flour', source_text: 'Certified Gluten-Free Brown Rice Flour', status: 'observed' },
          { name: 'Chia seeds', source_text: 'Organic Black Chia Seeds', status: 'observed' },
          { name: 'Flaxseeds', source_text: 'Golden Flaxseed Meal', status: 'observed' },
          { name: 'Quinoa flour', source_text: 'Organic Whole Grain Quinoa Flour', status: 'observed' },
          { name: 'Sunflower oil', source_text: 'Cold-Pressed High-Oleic Sunflower Oil', status: 'observed' },
          { name: 'Himalayan pink salt', source_text: 'Himalayan Pink Salt', status: 'observed' },
          { name: 'Rosemary extract', source_text: 'Organic Rosemary Extract (Antioxidant)', status: 'observed' }
        ],
        nutrition: [
          { name: 'Calories', value: 110, unit: 'kcal', serving_basis: '4 crisps (28g)', source_text: 'Calories 110', status: 'observed' },
          { name: 'Total Fat', value: 4, unit: 'g', serving_basis: '28g', source_text: 'Total Fat 4g', status: 'observed' },
          { name: 'Saturated Fat', value: 0.5, unit: 'g', serving_basis: '28g', source_text: 'Saturated Fat 0.5g', status: 'observed' },
          { name: 'Sodium', value: 115, unit: 'mg', serving_basis: '28g', source_text: 'Sodium 115mg', status: 'observed' },
          { name: 'Total Carbohydrates', value: 18, unit: 'g', serving_basis: '28g', source_text: 'Total Carbohydrates 18g', status: 'observed' },
          { name: 'Dietary Fiber', value: 4, unit: 'g', serving_basis: '28g', source_text: 'Dietary Fiber 4g', status: 'observed' },
          { name: 'Total Sugars', value: 0, unit: 'g', serving_basis: '28g', source_text: 'Total Sugars 0g', status: 'observed' },
          { name: 'Protein', value: 3, unit: 'g', serving_basis: '28g', source_text: 'Protein 3g', status: 'observed' }
        ],
        allergen_statements: [
          {
            text: 'Certified Gluten-Free. Produced in a dedicated peanut-free and tree nut-free bakery.',
            source_text: 'CERTIFIED GLUTEN-FREE. DEDICATED NUT-FREE FACILITY.',
            kind: 'facility_guarantee',
            status: 'observed'
          }
        ],
        warnings: [],
        raw_text: 'INGREDIENTS: Certified Gluten-Free Brown Rice Flour, Organic Black Chia Seeds, Golden Flaxseed Meal, Organic Whole Grain Quinoa Flour, Cold-Pressed High-Oleic Sunflower Oil, Himalayan Pink Salt, Organic Rosemary Extract. CERTIFIED GLUTEN-FREE. DEDICATED NUT-FREE FACILITY.'
      },
      findings: [
        {
          rule: 'allergen:peanut',
          status: 'no_conflict_found',
          message: 'Produced in a dedicated nut-free facility. No peanut mention detected.',
          evidence: ['DEDICATED NUT-FREE FACILITY.']
        },
        {
          rule: 'allergen:tree nuts',
          status: 'no_conflict_found',
          message: 'No tree nut terms observed in ingredients or allergen boxes.',
          evidence: ['DEDICATED NUT-FREE FACILITY.']
        },
        {
          rule: 'restriction:gluten-free',
          status: 'no_conflict_found',
          message: 'Label displays explicit third-party certification: "CERTIFIED GLUTEN-FREE".',
          evidence: ['CERTIFIED GLUTEN-FREE.']
        },
        {
          rule: 'nutrition:sodium',
          status: 'no_conflict_found',
          message: 'Sodium is 115mg per serving, well within recommended guidelines.',
          evidence: ['Sodium 115mg']
        },
        {
          rule: 'nutrition:sugar',
          status: 'no_conflict_found',
          message: 'Sugar content is 0g.',
          evidence: ['Total Sugars 0g']
        }
      ]
    }
  },
  {
    id: 'protein_shake',
    name: 'Vanilla Ultra Whey Isolate Protein Powder',
    category: 'Sports Nutrition',
    badge: 'Contains Dairy & Soy',
    badgeType: 'conflict',
    summary: 'Contains Milk Whey & Soy Lecithin. 25g Protein, low sugar (2g), within nutritional bounds.',
    response: {
      request_id: 'demo-protein-1b88e',
      extracted: {
        product_name: 'Vanilla Ultra Whey Isolate Protein Powder',
        ingredients: [
          { name: 'Cross-flow microfiltered whey protein isolate', source_text: 'Whey Protein Isolate (Milk)', status: 'observed' },
          { name: 'Natural vanilla bean flavor', source_text: 'Natural Vanilla Bean Extract', status: 'observed' },
          { name: 'Sunflower lecithin', source_text: 'Sunflower Lecithin (Emulsifier)', status: 'observed' },
          { name: 'Stevia leaf extract', source_text: 'Stevia Leaf Extract (Rebaudioside A)', status: 'observed' },
          { name: 'Sea salt', source_text: 'Fine Sea Salt', status: 'observed' }
        ],
        nutrition: [
          { name: 'Calories', value: 120, unit: 'kcal', serving_basis: '1 scoop (32g)', source_text: 'Calories 120', status: 'observed' },
          { name: 'Total Fat', value: 0.5, unit: 'g', serving_basis: '32g', source_text: 'Total Fat 0.5g', status: 'observed' },
          { name: 'Sodium', value: 90, unit: 'mg', serving_basis: '32g', source_text: 'Sodium 90mg', status: 'observed' },
          { name: 'Total Carbohydrates', value: 2, unit: 'g', serving_basis: '32g', source_text: 'Total Carb 2g', status: 'observed' },
          { name: 'Total Sugars', value: 1, unit: 'g', serving_basis: '32g', source_text: 'Total Sugars 1g', status: 'observed' },
          { name: 'Protein', value: 26, unit: 'g', serving_basis: '32g', source_text: 'Protein 26g', status: 'observed' }
        ],
        allergen_statements: [
          {
            text: 'Contains: Milk (Whey). Manufactured in a facility that also processes soy and eggs.',
            source_text: 'CONTAINS: MILK. FACILITY PROCESSES SOY, EGGS.',
            kind: 'contains',
            status: 'observed'
          }
        ],
        warnings: [],
        raw_text: 'INGREDIENTS: Whey Protein Isolate (Milk), Natural Vanilla Bean Extract, Sunflower Lecithin, Stevia Leaf Extract, Fine Sea Salt. CONTAINS: MILK. FACILITY PROCESSES SOY, EGGS.'
      },
      findings: [
        {
          rule: 'allergen:milk',
          status: 'conflict',
          message: 'Confirmed allergen declaration: product contains Milk (Whey Protein Isolate).',
          evidence: ['Whey Protein Isolate (Milk)', 'CONTAINS: MILK.']
        },
        {
          rule: 'allergen:soy',
          status: 'unknown',
          message: 'Facility advisory: "FACILITY PROCESSES SOY". Potential trace cross-contact.',
          evidence: ['FACILITY PROCESSES SOY, EGGS.']
        },
        {
          rule: 'nutrition:protein',
          status: 'no_conflict_found',
          message: 'High protein content of 26g per scoop.',
          evidence: ['Protein 26g']
        },
        {
          rule: 'nutrition:sugar',
          status: 'no_conflict_found',
          message: 'Low sugar: 1g per serving.',
          evidence: ['Total Sugars 1g']
        }
      ]
    }
  },
  {
    id: 'contradiction_snack',
    name: 'Gluten-Free Energy Bar (Contradiction & Ambiguity Showcase)',
    category: 'Snack Bars & Clusters',
    badge: 'Packaging Contradiction Detected',
    badgeType: 'contradiction',
    summary: 'Direct contradiction: Package claims "Gluten-Free", but ingredients list "Malt Extract (Barley)". Also contains ambiguous Mono- and diglycerides.',
    response: {
      request_id: 'demo-contradiction-9c44b',
      extracted: {
        product_name: 'SuperBoost Gluten-Free Energy Crunch Bar',
        brand: 'PureBite Labs',
        serving_size: '1 bar (45g)',
        servings_per_container: '1',
        dietary_claims: [
          {
            claim: 'Gluten-Free',
            evidence: [{ source_image_index: 0, text: 'Certified 100% Gluten-Free', field_name: 'claims' }]
          },
          {
            claim: 'Sugar-Free',
            evidence: [{ source_image_index: 0, text: 'Zero Sugar Added', field_name: 'claims' }]
          }
        ],
        ingredients: [
          {
            name: 'Whole grain oats',
            original_text: 'Rolled Oats (Gluten-Free Certified)',
            evidence: [{ source_image_index: 0, text: 'Rolled Oats (Gluten-Free Certified)', field_name: 'ingredients' }]
          },
          {
            name: 'Malt extract',
            original_text: 'Malt extract (barley malt)',
            evidence: [{ source_image_index: 0, text: 'Malt extract (barley malt)', field_name: 'ingredients' }]
          },
          {
            name: 'Mono- and diglycerides',
            original_text: 'Mono- and diglycerides (emulsifier)',
            evidence: [{ source_image_index: 0, text: 'Mono- and diglycerides (emulsifier)', field_name: 'ingredients' }]
          },
          {
            name: 'Peanut butter',
            original_text: 'Creamy roasted peanut butter',
            evidence: [{ source_image_index: 0, text: 'Creamy roasted peanut butter', field_name: 'ingredients' }]
          }
        ],
        nutrition: [
          {
            name: 'Calories',
            amount: 180,
            unit: 'kcal',
            serving_basis: 'per serving',
            evidence: [{ source_image_index: 0, text: 'Calories 180', field_name: 'nutrition' }]
          },
          {
            name: 'Total Sugars',
            amount: 6.5,
            unit: 'g',
            serving_basis: 'per serving',
            evidence: [{ source_image_index: 0, text: 'Total Sugars 6.5g', field_name: 'nutrition' }]
          },
          {
            name: 'Sodium',
            amount: 110,
            unit: 'mg',
            serving_basis: 'per serving',
            evidence: [{ source_image_index: 0, text: 'Sodium 110mg', field_name: 'nutrition' }]
          }
        ],
        allergen_statements: [
          {
            statement_type: 'contains',
            text: 'Contains: Peanuts, Barley (Gluten).',
            allergens: ['peanuts', 'gluten'],
            evidence: [{ source_image_index: 0, text: 'CONTAINS: PEANUTS, BARLEY.', field_name: 'allergen_statement' }]
          }
        ],
        warnings: [
          {
            text: 'Corner fold obscured distributor address and manufacturing lot number.',
            is_unreadable: true,
            evidence: [{ source_image_index: 0, text: 'Fold near seal obscured text', field_name: 'warnings' }]
          }
        ],
        extraction_status: 'partially_readable'
      },
      findings: [
        {
          category: 'contradiction',
          status: 'contradiction',
          resolution_state: 'contradiction',
          contradiction_type: 'claim_vs_ingredient',
          title: 'Package Contradiction: Gluten-Free Claim vs. Ingredients',
          message: 'The package prominently claims "Gluten-Free", but the ingredient list contains "Malt extract" (derived from barley). This represents an unresolved packaging contradiction posing high risk for celiac or gluten-allergic consumers.',
          matched_value: 'Malt extract',
          profile_rule: 'gluten',
          confidence: 0.99,
          evidence: [{ source_image_index: 0, text: 'Malt extract (barley malt)', field_name: 'ingredients' }],
          conflicting_evidence: [{ source_image_index: 0, text: 'Certified 100% Gluten-Free', field_name: 'claims' }],
          requires_user_confirmation: true,
          user_confirmation_prompt: 'Package claims "Gluten-Free", but "Malt extract (barley)" was detected in ingredients. How would you like this classified?',
          user_confirmation_options: ['Treat as Severe Hazardous Conflict', 'Trust Packaging Claim', 'Inspect Physical Label Directly']
        },
        {
          category: 'contradiction',
          status: 'contradiction',
          resolution_state: 'contradiction',
          contradiction_type: 'claim_vs_nutrition',
          title: 'Nutritional Contradiction: Sugar-Free Claim vs. Nutrition Panel',
          message: 'Package marketing claims "Zero Sugar Added / Sugar-Free", but the nutrition table explicitly lists Total Sugars as 6.5g per serving (exceeding FDA 0.5g limit).',
          matched_value: 'Total Sugars: 6.5g',
          profile_rule: 'Claim: Sugar-Free',
          confidence: 0.98,
          evidence: [{ source_image_index: 0, text: 'Total Sugars 6.5g', field_name: 'nutrition' }],
          conflicting_evidence: [{ source_image_index: 0, text: 'Zero Sugar Added', field_name: 'claims' }],
          requires_user_confirmation: true,
          user_confirmation_prompt: 'Product claims "Sugar-Free", but nutrition facts list 6.5g sugars. How should we record this?',
          user_confirmation_options: ['Flag as Nutritional Conflict', 'Accept Nutrition Panel Value', 'Verify Serving Size']
        },
        {
          category: 'allergen',
          status: 'conflict',
          resolution_state: 'confirmed',
          title: 'Confirmed Allergen Conflict: Peanuts',
          message: 'The ingredient list and allergen statement explicitly declare roasted peanut butter ("Contains: Peanuts").',
          matched_value: 'Creamy roasted peanut butter',
          profile_rule: 'peanut',
          confidence: 1.0,
          evidence: [{ source_image_index: 0, text: 'Creamy roasted peanut butter', field_name: 'ingredients' }]
        },
        {
          category: 'dietary_preference',
          status: 'unknown',
          resolution_state: 'uncertain',
          title: 'Ambiguous Ingredient Source for Vegan Diet',
          message: 'The ingredient "Mono- and diglycerides" can be manufactured from either plant or animal lipids. The packaging does not specify origin.',
          matched_value: 'Mono- and diglycerides',
          profile_rule: 'vegan',
          confidence: 0.75,
          evidence: [{ source_image_index: 0, text: 'Mono- and diglycerides (emulsifier)', field_name: 'ingredients' }],
          requires_user_confirmation: true,
          user_confirmation_prompt: 'Mono- and diglycerides may be plant or animal derived. How should this be evaluated for your profile?',
          user_confirmation_options: ['Treat as Animal Origin (Conflict)', 'Treat as Plant Origin (Safe)', 'Request Manufacturer Clarification']
        },
        {
          category: 'nutrition',
          status: 'no_conflict_found',
          resolution_state: 'confirmed',
          title: 'Nutrition Limit Satisfied: Sodium',
          message: 'Sodium (110mg) is comfortably within your configured limit of 400mg.',
          matched_value: '110mg',
          profile_rule: 'sodium: 400.0',
          confidence: 0.98,
          evidence: [{ source_image_index: 0, text: 'Sodium 110mg', field_name: 'nutrition' }]
        },
        {
          category: 'label_quality',
          status: 'missing_information',
          resolution_state: 'missing',
          title: 'Label Legibility Warning: Seal Crease',
          message: 'Corner fold obscured manufacturer lot and distributor details.',
          evidence: [{ source_image_index: 0, text: 'Fold near seal obscured text', field_name: 'warnings' }]
        }
      ]
    }
  }
];

export const SAMPLE_ANALYSIS_RESPONSE = SAMPLE_PRODUCTS[0].response;

export const SAMPLE_PROFILE_FIXTURE = {
  dietary_preference: 'none',
  dietary_preferences_custom: '',
  allergens_to_avoid: ['peanut', 'tree nuts', 'fish', 'shellfish'],
  custom_allergens: [],
  dietary_restrictions: ['Gluten-Free'],
  ingredients_to_avoid: ['palm oil', 'high fructose corn syrup'],
  nutrition_limits: {
    sugar: { value: 15, unit: 'g', basis: 'per serving', enabled: true },
    sodium: { value: 400, unit: 'mg', basis: 'per serving', enabled: true },
    calories: { value: 250, unit: 'kcal', basis: 'per serving', enabled: false },
    fat: { value: 10, unit: 'g', basis: 'per serving', enabled: false },
    saturated_fat: { value: 3, unit: 'g', basis: 'per serving', enabled: false },
    carbohydrates: { value: 30, unit: 'g', basis: 'per serving', enabled: false },
    protein: { value: 10, unit: 'g', basis: 'per serving', enabled: false },
    fiber: { value: 3, unit: 'g', basis: 'per serving', enabled: false },
  }
};
