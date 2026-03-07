import React, { useState } from 'react';

interface OfflineIndicatorProps {
  language: 'fr' | 'en' | 'nl';
  onRetry: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language, onRetry }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const messages = {
    fr: {
      title: '📴 Mode hors ligne',
      subtitle: 'Vos modifications sont sauvegardées localement',
      works: 'Ce qui fonctionne :',
      worksList: ['Valider des missions', 'Ajouter des missions', 'Transactions manuelles', 'Éditer les profils enfants'],
      notWorks: 'Ce qui ne fonctionne pas :',
      notWorksList: ['Créer un nouvel enfant', 'Supprimer un enfant', 'Charger de nouvelles données'],
      retry: 'Réessayer maintenant',
      autoSync: 'Les données se synchroniseront automatiquement quand la connexion revient.'
    },
    en: {
      title: '📴 Offline mode',
      subtitle: 'Your changes are saved locally',
      works: 'What works:',
      worksList: ['Approve missions', 'Add missions', 'Manual transactions', 'Edit child profiles'],
      notWorks: 'What doesn\'t work:',
      notWorksList: ['Create a new child', 'Delete a child', 'Load new data'],
      retry: 'Retry now',
      autoSync: 'Data will sync automatically when connection returns.'
    },
    nl: {
      title: '📴 Offline-modus',
      subtitle: 'Je wijzigingen worden lokaal opgeslagen',
      works: 'Wat werkt:',
      worksList: ['Missies goedkeuren', 'Missies toevoegen', 'Handmatige transacties', 'Kinderprofielen bewerken'],
      notWorks: 'Wat werkt niet:',
      notWorksList: ['Nieuw kind toevoegen', 'Kind verwijderen', 'Nieuwe gegevens laden'],
      retry: 'Nu opnieuw proberen',
      autoSync: 'Gegevens worden automatisch gesynchroniseerd wanneer de verbinding hersteld is.'
    }
  };

  const msg = messages[language];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#fff7ed',
        borderBottom: '2px solid #f97316',
        padding: isExpanded ? '16px 20px' : '12px 20px',
        boxShadow: '0 4px 12px rgba(0,0,0,.08)',
        transition: 'all .3s ease',
        maxHeight: isExpanded ? '400px' : '52px',
        overflowY: isExpanded ? 'auto' : 'hidden'
      }}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c2d12', marginBottom: '2px' }}>
            {msg.title}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500 }}>
            {msg.subtitle}
          </div>
        </div>
        <div style={{ fontSize: '1.2rem', marginLeft: '12px', transition: 'transform .2s' }}>
          {isExpanded ? '✕' : '▼'}
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #fed7aa' }}>
          {/* Ce qui fonctionne */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c2d12', marginBottom: '8px' }}>
              ✅ {msg.works}
            </div>
            <ul style={{ marginLeft: '20px', color: '#92400e', fontSize: '0.8rem' }}>
              {msg.worksList.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Ce qui ne fonctionne pas */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c2d12', marginBottom: '8px' }}>
              ❌ {msg.notWorks}
            </div>
            <ul style={{ marginLeft: '20px', color: '#92400e', fontSize: '0.8rem' }}>
              {msg.notWorksList.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Message auto-sync */}
          <div style={{ fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic', marginBottom: '12px' }}>
            {msg.autoSync}
          </div>

          {/* Bouton Réessayer */}
          <button
            onClick={onRetry}
            style={{
              background: '#f97316',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background .2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#ea580c')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f97316')}
          >
            {msg.retry}
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
