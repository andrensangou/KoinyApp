import React from 'react';
import { isAndroid } from '../hooks/usePlatform';

interface BottomNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onAddClick: () => void;
    pendingCount?: number;
    t: any;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    activeTab,
    onTabChange,
    onAddClick,
    pendingCount = 0,
    t
}) => {
    if (isAndroid) {
        return (
            /* ── Android MD3 Bottom Navigation ── */
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-40 flex items-center justify-around px-2"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <MD3NavButton icon="fa-border-all" label={t.parent.tabs.dashboard} isActive={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
                <MD3NavButton icon="fa-calendar-days" label={t.parent.tabs.history} isActive={activeTab === 'history'} onClick={() => onTabChange('history')} />
                {/* FAB centre */}
                <div className="flex flex-col items-center py-2">
                    <button onClick={onAddClick} aria-label="Add Mission"
                        className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/30 active:bg-indigo-700 transition-colors"
                    >
                        <i className="fa-solid fa-plus text-white text-xl" aria-hidden="true"></i>
                    </button>
                </div>
                <div className="relative">
                    <MD3NavButton icon="fa-comment-dots" label={t.parent.tabs.requests} isActive={activeTab === 'requests'} onClick={() => onTabChange('requests')} />
                    {pendingCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                </div>
                <MD3NavButton icon="fa-user" label={t.parent.tabs.profile} isActive={activeTab === 'profile'} onClick={() => onTabChange('profile')} />
            </div>
        );
    }

    return (
        /* ── iOS Bottom Navigation ── */
        <div className="fixed bottom-6 left-4 right-4 h-[4.5rem] bg-slate-900/95 dark:bg-black/90 backdrop-blur-xl rounded-[2rem] shadow-2xl flex items-center justify-between px-2 z-40 ring-1 ring-black/5">
            <div className="flex-1 flex justify-around items-center pr-8">
                <NavButton
                    icon="fa-border-all"
                    label={t.parent.tabs.dashboard}
                    isActive={activeTab === 'dashboard'}
                    onClick={() => onTabChange('dashboard')}
                />
                <NavButton
                    icon="fa-calendar-days"
                    label={t.parent.tabs.history}
                    isActive={activeTab === 'history'}
                    onClick={() => onTabChange('history')}
                />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button onClick={onAddClick}
                    aria-label="Add Mission"
                    className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all border-[4px] border-slate-50 dark:border-[#020617] group"
                >
                    <i className="fa-solid fa-plus text-white text-2xl group-hover:rotate-90 transition-transform duration-300" aria-hidden="true"></i>
                </button>
            </div>

            <div className="flex-1 flex justify-around items-center pl-8">
                <div className="relative">
                    <NavButton
                        icon="fa-comment-dots"
                        label={t.parent.tabs.requests}
                        isActive={activeTab === 'requests'}
                        onClick={() => onTabChange('requests')}
                    />
                    {pendingCount > 0 && (
                        <span className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                    )}
                </div>
                <NavButton
                    icon="fa-user"
                    label={t.parent.tabs.profile}
                    isActive={activeTab === 'profile'}
                    onClick={() => onTabChange('profile')}
                />
            </div>
        </div>
    );
};

const NavButton = ({ icon, label, isActive, onClick }: { icon: string, label: string, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick}
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
        <i className={`fa-solid ${icon} text-xl ${isActive ? '-translate-y-1' : ''} transition-transform`}></i>
        <span className={`text-[10px] font-bold transition-all duration-300 overflow-hidden ${isActive ? 'h-auto opacity-100 translate-y-0' : 'h-0 opacity-0 translate-y-2'}`}>{label}</span>
        {isActive && <div className="w-1 h-1 bg-indigo-400 rounded-full mt-1"></div>}
    </button>
);

const MD3NavButton = ({ icon, label, isActive, onClick }: { icon: string, label: string, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick}
        className="flex flex-col items-center justify-center py-2 px-3 min-w-[56px] transition-colors"
    >
        <div className={`w-16 h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}`}>
            <i className={`fa-solid ${icon} text-lg ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}></i>
        </div>
        <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
    </button>
);
