import React from 'react';

interface AlertBannerProps {
  type: 'error' | 'warning' | 'maintenance';
  message: string;
  onClose?: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ type, message, onClose }) => {
  const bgColor = type === 'error' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#dbeafe';
  const borderColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
  const textColor = type === 'error' ? '#7f1d1d' : type === 'warning' ? '#78350f' : '#1e40af';
  const icon = type === 'error' ? '⚠️' : type === 'warning' ? '🔔' : 'ℹ️';

  return (
    <div
      style={{
        background: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        padding: '12px 16px',
        marginBottom: '16px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '0.9rem',
        color: textColor,
        fontWeight: 500
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: 0,
            flexShrink: 0
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
