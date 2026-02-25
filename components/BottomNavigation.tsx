import React from 'react';

interface BottomNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onAddClick: () => void;
    pendingCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    activeTab,
    onTabChange,
    onAddClick,
    pendingCount = 0
}) => {
    return (
        <div className="fixed bottom-6 left-4 right-4 h-[4.5rem] bg-slate-900/95 dark:bg-black/90 backdrop-blur-xl rounded-[2rem] shadow-2xl flex items-center justify-between px-2 z-40 border border-white/10 ring-1 ring-black/5">
            <div className="flex-1 flex justify-around items-center pr-8">
                <NavButton
                    icon="fa-border-all"
                    label="Dashboard"
                    isActive={activeTab === 'dashboard'}
                    onClick={() => onTabChange('dashboard')}
                />
                <NavButton
                    icon="fa-calendar-days"
                    label="Historique"
                    isActive={activeTab === 'history'}
                    onClick={() => onTabChange('history')}
                />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button                     onClick={onAddClick}
                    className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all border-[6px] border-slate-50 dark:border-[#020617] group"
                >
                    <i className="fa-solid fa-plus text-white text-2xl group-hover:rotate-90 transition-transform duration-300"></i>
                </button>
            </div>

            <div className="flex-1 flex justify-around items-center pl-8">
                <div className="relative">
                    <NavButton
                        icon="fa-comment-dots"
                        label="Demandes"
                        isActive={activeTab === 'requests'}
                        onClick={() => onTabChange('requests')}
                    />
                    {pendingCount > 0 && (
                        <span className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                    )}
                </div>
                <NavButton
                    icon="fa-user"
                    label="Profil"
                    isActive={activeTab === 'profile'}
                    onClick={() => onTabChange('profile')}
                />
            </div>
        </div>
    );
};

const NavButton = ({ icon, label, isActive, onClick }: { icon: string, label: string, isActive: boolean, onClick: () => void }) => (
    <button         onClick={onClick}
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
        <i className={`fa-solid ${icon} text-xl ${isActive ? '-translate-y-1' : ''} transition-transform`}></i>
        <span className={`text-[10px] font-bold transition-all duration-300 overflow-hidden ${isActive ? 'h-auto opacity-100 translate-y-0' : 'h-0 opacity-0 translate-y-2'}`}>{label}</span>
        {isActive && <div className="w-1 h-1 bg-indigo-400 rounded-full mt-1"></div>}
    </button>
);
