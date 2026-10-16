import React, { useState } from 'react';
import {
  List,
  AlertTriangle,
  Apple,
  FileText,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Eye,
} from 'lucide-react';
import NutritionTable from './NutritionTable';

export default function ExtractedLabelView({ extracted }) {
  const [activeTab, setActiveTab] = useState('ingredients');
  const [showRawText, setShowRawText] = useState(false);

  if (!extracted) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        No extracted label data available.
      </div>
    );
  }

  const {
    ingredients = [],
    nutrition = [],
    allergen_statements = [],
    warnings = [],
    raw_text = '',
  } = extracted;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Eye size={20} color="var(--primary-700)" />
            Extracted Label Information
          </h3>
          <p className="card-description">
            Direct data captured by Vision AI from the package photos.
          </p>
        </div>
      </div>

      {/* Warnings & Missing Sections Banner if present */}
      {warnings && warnings.length > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            color: '#92400e',
            fontSize: '0.88rem',
          }}
          role="alert"
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Legibility & Extraction Warnings:</strong>
            <ul style={{ paddingLeft: 18, marginTop: 4 }}>
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-light)',
          marginBottom: 20,
          overflowX: 'auto',
        }}
        role="tablist"
      >
        <button
          className={`nav-link ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
          role="tab"
          aria-selected={activeTab === 'ingredients'}
        >
          <List size={16} />
          Ingredients ({ingredients.length})
        </button>

        <button
          className={`nav-link ${activeTab === 'allergens' ? 'active' : ''}`}
          onClick={() => setActiveTab('allergens')}
          role="tab"
          aria-selected={activeTab === 'allergens'}
        >
          <ShieldAlert size={16} />
          Allergen Declarations ({allergen_statements.length})
        </button>

        <button
          className={`nav-link ${activeTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveTab('nutrition')}
          role="tab"
          aria-selected={activeTab === 'nutrition'}
        >
          <Apple size={16} />
          Nutrition Facts ({nutrition.length})
        </button>
      </div>

      {/* Tab 1: Ingredients */}
      {activeTab === 'ingredients' && (
        <div>
          {ingredients.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No ingredients extracted. Ensure the ingredients block is legible in your uploaded photo.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {ingredients.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    background: item.status === 'unreadable' ? '#fffdf0' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                    <span className={`status-pill ${item.status || 'observed'}`}>
                      {item.status || 'observed'}
                    </span>
                  </div>
                  {item.source_text && item.source_text !== item.name && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      "{item.source_text}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Allergen Declarations */}
      {activeTab === 'allergens' && (
        <div>
          {allergen_statements.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No explicit allergen declarations ("Contains...", "May Contain...") detected on the uploaded label.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allergen_statements.map((stmt, idx) => {
                const isPrecautionary =
                  stmt.kind === 'may_contain' || stmt.kind === 'shared_facility';

                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderLeft: `4px solid ${isPrecautionary ? '#d97706' : '#dc2626'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isPrecautionary ? '#b45309' : '#b91c1c',
                        }}
                      >
                        {stmt.kind === 'contains'
                          ? 'Contains Statement'
                          : stmt.kind === 'may_contain'
                          ? 'Precautionary: May Contain'
                          : stmt.kind === 'shared_facility'
                          ? 'Shared Facility / Equipment'
                          : 'Allergen Advisory'}
                      </span>
                      <span className={`status-pill ${stmt.status || 'observed'}`}>
                        {stmt.status || 'observed'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {stmt.text}
                    </p>

                    {stmt.source_text && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                        Source wording: "{stmt.source_text}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Nutrition */}
      {activeTab === 'nutrition' && <NutritionTable nutritionItems={nutrition} />}

      {/* Collapsible Raw Text Section */}
      {raw_text && (
        <div style={{ marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowRawText(!showRawText)}
            style={{ fontSize: '0.82rem' }}
          >
            {showRawText ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showRawText ? 'Hide Raw OCR Text' : 'View Full Extracted OCR Text'}
          </button>

          {showRawText && (
            <pre
              style={{
                marginTop: 12,
                background: 'var(--bg-subtle)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {raw_text}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
