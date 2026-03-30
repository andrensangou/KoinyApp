import React from 'react';

interface AndroidBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
  t: any;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
  t
}) => {
  const tabs = [
    { id: 'dashboard', icon: 'fa-border-all', label: t.parent.tabs.dashboard },
    { id: 'history', icon: 'fa-calendar-days', label: t.parent.tabs.history },
    { id: 'requests', icon: 'fa-comment-dots', label: t.parent.tabs.requests },
    { id: 'profile', icon: 'fa-user', label: t.parent.tabs.profile },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 shadow-[0_-1px_3px_rgba(0,0,0,0.08)] dark:shadow-none dark:border-t dark:border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-20">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const hasBadge = tab.id === 'requests' && pendingCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative active:bg-indigo-50 dark:active:bg-indigo-900/20 active:rounded-2xl transition-all duration-150"
            >
              {/* MD3 active pill indicator */}
              <div className={`flex items-center justify-center w-16 h-8 rounded-full transition-all duration-200 ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}`}>
                <i className={`fa-solid ${tab.icon} text-xl transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {hasBadge && (
                  <span className="absolute top-2 ml-8 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors leading-none ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
