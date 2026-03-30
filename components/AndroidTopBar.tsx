import React from 'react';

interface AndroidTopBarProps {
  mainView: string;
  isPremium: boolean;
  isOfflineMode: boolean;
  selectedChildName?: string;
  selectedChildAvatar?: string;
  selectedChildColor?: string;
  onPremiumClick: () => void;
  onOfflineClick: () => void;
  onExitClick: () => void;
  t: any;
  language: string;
  isScrolled: boolean;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  mainView,
  isPremium,
  isOfflineMode,
  selectedChildName,
  selectedChildAvatar,
  selectedChildColor = 'indigo',
  onPremiumClick,
  onOfflineClick,
  onExitClick,
  t,
  language,
  isScrolled,
}) => {
  const isDashboard = mainView === 'dashboard';

  const pageTitle = isDashboard
    ? '' // No title on dashboard — child chip shows instead
    : mainView === 'history' ? t.parent.tabs.history
    : mainView === 'requests' ? t.parent.tabs.requests
    : t.parent.tabs.profile;

  const bgClass = isDashboard
    ? (isScrolled
        ? 'bg-white dark:bg-slate-900 shadow-md dark:shadow-slate-800/50'
        : 'bg-transparent')
    : `bg-white dark:bg-slate-900 ${isScrolled ? 'shadow-md dark:shadow-slate-800/50' : ''}`;

  const titleColor = isDashboard && !isScrolled
    ? 'text-white'
    : 'text-slate-800 dark:text-white';

  // Build avatar src
  const avatarSrc = selectedChildAvatar
    ? (selectedChildAvatar.startsWith('data:')
        ? selectedChildAvatar
        : `https://api.dicebear.com/9.x/lorelei/svg?seed=${selectedChildAvatar}`)
    : null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgClass}`}
      style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center h-14 px-3 gap-2">
        {/* Leading: Premium crown or spacer */}
        {!isPremium ? (
          <button
            onClick={onPremiumClick}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0 active:scale-95 transition-transform"
          >
            <i className="fa-solid fa-crown text-base" />
          </button>
        ) : (
          <div className="w-10 h-10 shrink-0" />
        )}

        {/* Center: child avatar (slides in on scroll) or page title */}
        {isDashboard ? (
          <div className={`flex-1 flex items-center transition-all duration-300 ${
            isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}>
            {avatarSrc && (
              <div className={`flex items-center gap-2 ${!isPremium ? 'ml-1' : ''}`}>
                <div className={`w-8 h-8 rounded-full overflow-hidden bg-${selectedChildColor}-100 dark:bg-${selectedChildColor}-900/40 flex items-center justify-center shrink-0`}>
                  <img src={avatarSrc} alt="" className="w-full h-full object-contain scale-110 translate-y-0.5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{selectedChildName}</span>
              </div>
            )}
          </div>
        ) : (
          <h1 className={`flex-1 font-semibold text-lg truncate transition-colors duration-300 ${titleColor}`}>
            {pageTitle}
          </h1>
        )}

        {/* Trailing actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isOfflineMode && (
            <button
              onClick={onOfflineClick}
              className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-lg text-xs font-bold mr-1 active:scale-95 transition-transform"
            >
              <i className="fa-solid fa-wifi text-[10px]" />
              <span>Offline</span>
            </button>
          )}
          <button
            onClick={onExitClick}
            aria-label={language === 'fr' ? 'Déconnexion' : 'Logout'}
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all ${
              isDashboard && !isScrolled
                ? 'bg-white/20 text-white'
                : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
            }`}
          >
            <i className="fa-solid fa-power-off text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};
