import React from 'react';

interface AndroidListItemProps {
  icon: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  divider?: boolean;
}

export const AndroidListItem: React.FC<AndroidListItemProps> = ({
  icon,
  iconColor = 'text-slate-500',
  label,
  sublabel,
  trailing,
  onClick,
  divider = true,
}) => (
  <div
    className={`flex items-center gap-4 px-4 py-3 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800 transition-colors ${
      divider ? 'border-b border-slate-100 dark:border-slate-800' : ''
    } ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <i className={`fa-solid ${icon} w-6 text-center text-base ${iconColor} shrink-0`} />
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{label}</p>
      {sublabel && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </div>
);
