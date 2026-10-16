import React from 'react';
import { Apple, AlertCircle, Info } from 'lucide-react';

export default function NutritionTable({ nutritionItems, userLimits }) {
  if (!nutritionItems || nutritionItems.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        No nutrition facts detected or readable on this label photo.
      </div>
    );
  }

  // Find serving basis from the first item if common
  const commonServingBasis = nutritionItems.find((i) => i.serving_basis)?.serving_basis;

  return (
    <div>
      {commonServingBasis && (
        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
          <strong>Reported Serving Basis:</strong> {commonServingBasis}
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
        <table className="nutrition-table" aria-label="Extracted Nutrition Facts Table">
          <thead>
            <tr>
              <th>Nutrient</th>
              <th>Value & Unit</th>
              <th>Serving Basis</th>
              <th>Status</th>
              <th>Source Wording</th>
            </tr>
          </thead>
          <tbody>
            {nutritionItems.map((item, idx) => {
              const statusPillClass =
                item.status === 'observed'
                  ? 'observed'
                  : item.status === 'unreadable'
                  ? 'unreadable'
                  : 'not_detected';

              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    {item.value !== null && item.value !== undefined ? (
                      <span>
                        <strong>{item.value}</strong> {item.unit || ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.serving_basis || commonServingBasis || 'Per serving'}
                  </td>
                  <td>
                    <span className={`status-pill ${statusPillClass}`}>
                      {item.status || 'unknown'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {item.source_text ? `"${item.source_text}"` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
