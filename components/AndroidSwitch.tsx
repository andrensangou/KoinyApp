import React from 'react';

interface AndroidSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const AndroidSwitch: React.FC<AndroidSwitchProps> = ({ checked, onChange, disabled }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    role="switch"
    aria-checked={checked}
    className={`relative w-14 h-8 rounded-full transition-all duration-200 shrink-0 ${
      checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
    } ${disabled ? 'opacity-40' : ''}`}
  >
    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-200 flex items-center justify-center ${
      checked ? 'right-1' : 'left-1'
    }`}>
      {checked && <i className="fa-solid fa-check text-indigo-600 text-[10px]" />}
    </div>
  </button>
);
