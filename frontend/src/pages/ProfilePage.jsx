import React from 'react';
import DietaryProfileForm from '../components/DietaryProfileForm';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function ProfilePage({ profile, setProfile, onNavigate }) {
  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('analyze')}>
          <ArrowLeft size={16} />
          Go to Analysis
        </button>

        <button className="btn btn-primary btn-sm" onClick={() => onNavigate('analyze')}>
          <Sparkles size={16} />
          Analyze a Product
        </button>
      </div>

      <DietaryProfileForm
        profile={profile}
        setProfile={setProfile}
        onSaved={() => {}}
      />
    </div>
  );
}
