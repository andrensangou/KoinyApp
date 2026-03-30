import React from 'react';

interface AndroidFABProps {
  onClick: () => void;
  label: string;
}

export const AndroidFAB: React.FC<AndroidFABProps> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="fixed right-4 z-40 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-90 transition-all flex items-center justify-center"
    style={{ bottom: 'calc(80px + env(safe-area-inset-bottom) + 16px)' }}
    aria-label={label}
  >
    <i className="fa-solid fa-plus text-xl" />
  </button>
);
