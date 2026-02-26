
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChildProfile, Language, HistoryEntry, Goal } from '../types';
import TutorialOverlay, { TutorialStep } from './TutorialOverlay';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';
import { getIcon } from '../constants/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ChildViewProps {
  data: ChildProfile;
  language: Language;
  onCompleteMission: (id: string) => void;
  onLogout: () => void;
  onTutorialComplete: () => void;
  onSetPrimaryGoal: (goalId: string) => void;
  soundEnabled: boolean;
  onRequestGift?: () => void;
  onRequestMission?: () => void;
  onPurchaseGoal?: (goal: Goal) => void;
}

const renderAvatar = (avatar: string, sizeClass: string = "w-full h-full", colorClass: string = "indigo") => {
  if (!avatar) return <i className="fa-solid fa-user text-slate-300 text-2xl"></i>;
  if (avatar.startsWith('fa-')) {
    return <i className={`${avatar} text-2xl`}></i>;
  }
  const src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${avatar}`;
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-${colorClass}-100 to-${colorClass}-300 flex items-center justify-center shadow-inner p-1 overflow-hidden`}>
      <img src={src} alt="Avatar" className="w-full h-full object-contain scale-110 translate-y-1 drop-shadow-sm" />
    </div>
  );
};

// --- Helpers de catégorisation et Traduction Dynamique ---
const isPenalty = (title: string) => title.toLowerCase().includes('amende') || title.toLowerCase().includes('boete') || title.toLowerCase().includes('penalty') || title.toLowerCase().includes('fine') || title.toLowerCase().includes('punition');
const isPurchase = (title: string) => title.toLowerCase().includes('achat') || title.toLowerCase().includes('purchase') || title.toLowerCase().includes('retrait') || title.toLowerCase().includes('opname') || title.toLowerCase().includes('aankoop');
const isGift = (title: string) => title.toLowerCase().includes('cadeau') || title.toLowerCase().includes('bonus') || title.toLowerCase().includes('gift');

const getTranslatedTitle = (title: string, language: Language) => {
  const parts = title.split(' : ');
  const category = parts[0];
  const reason = parts[1] ? ` : ${parts[1]}` : '';

  if (isPenalty(category)) return translations[language].parent.transactions.labels.penalty + reason;
  if (isPurchase(category)) return translations[language].parent.transactions.labels.purchase + reason;
  if (isGift(category)) return translations[language].parent.transactions.labels.deposit + reason;

  // Pour les missions, on essaie de traduire les titres standards
  if (title.includes('Ranger') || title.includes('opruimen') || title.includes('Clean')) return translations[language].parent.templates.room;
  if (title.includes('table')) return translations[language].parent.templates.table;

  return title;
};

const getEntryIcon = (title: string) => {
  if (isPenalty(title)) return `${getIcon('gavel')} text-amber-500`;
  if (isPurchase(title)) return `${getIcon('cart')} text-red-500`;
  if (isGift(title)) return `${getIcon('gift')} text-purple-500`;
  return `${getIcon('star')} text-emerald-500`;
};

const playSound = (enabled: boolean, url: string, volume: number = 0.5) => {
  if (!enabled) return;
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => { });
  } catch (e) { }
};

const ChildView: React.FC<ChildViewProps> = ({ data, language, onCompleteMission, onLogout, onTutorialComplete, onSetPrimaryGoal, soundEnabled, onRequestGift, onRequestMission, onPurchaseGoal }) => {
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState(false);
  const [isGoalNudging, setIsGoalNudging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [acknowledgedPenaltyId, setAcknowledgedPenaltyId] = useState<string | null>(null);
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const goalsScrollRef = useRef<HTMLDivElement>(null);

  const t = translations[language];
  const prevBalance = useRef(data.balance);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [balanceDiff, setBalanceDiff] = useState<{ amount: number, type: 'GAIN' | 'LOSS' | 'PENALTY' } | null>(null);

  const latestPenalty = useMemo(() => {
    if (!data.history) return null;
    const penalty = data.history.find(h => h.amount < 0 && isPenalty(h.title));
    if (penalty && penalty.id !== acknowledgedPenaltyId) return penalty;
    return null;
  }, [data.history, acknowledgedPenaltyId]);

  const stats = useMemo(() => {
    if (!data.history) return { totalGains: 0, totalLosses: 0 };
    return data.history.reduce((acc, curr) => {
      const isNeg = curr.amount < 0 || isPenalty(curr.title) || isPurchase(curr.title);
      if (isNeg) acc.totalLosses += Math.abs(curr.amount);
      else acc.totalGains += curr.amount;
      return acc;
    }, { totalGains: 0, totalLosses: 0 });
  }, [data.history]);

  useEffect(() => {
    if (data.balance !== prevBalance.current) {
      setIsBalanceAnimating(true);
      const diff = Number((data.balance - prevBalance.current).toFixed(2));

      if (Math.abs(diff) > 0.001) {
        const lastEntry = data.history?.[0];
        const type = diff > 0 ? 'GAIN' : (lastEntry && (lastEntry.amount < 0 && isPenalty(lastEntry.title)) ? 'PENALTY' : 'LOSS');

        setBalanceDiff({ amount: Math.abs(diff), type });
        setTimeout(() => setBalanceDiff(null), 3000);

        if (type === 'PENALTY') {
          Haptics.impact({ style: ImpactStyle.Heavy });
          playSound(soundEnabled, '/sounds/penalty.mp3', 0.4);
        } else if (type === 'GAIN') {
          Haptics.impact({ style: ImpactStyle.Light });
          playSound(soundEnabled, '/sounds/gain.mp3', 0.4);
        }
      }

      const timer = setTimeout(() => setIsBalanceAnimating(false), 600);
      prevBalance.current = data.balance;
      return () => clearTimeout(timer);
    }
  }, [data.balance, data.history, soundEnabled]);

  const handleMissionClick = (id: string) => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    playSound(soundEnabled, '/sounds/mission.mp3');
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    setAnimatingId(id);
    setTimeout(() => {
      onCompleteMission(id);
      setAnimatingId(null);
    }, 1500);
  };

  const handlePurchase = (goal: Goal) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    playSound(soundEnabled, '/sounds/purchase.mp3');
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#ffffff']
      });
    }
    if (onPurchaseGoal) onPurchaseGoal(goal);
  };

  const bgGradient = `from-${data.colorClass}-600 to-${data.colorClass}-400`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center font-sans transition-colors duration-500">
      <div className="w-full max-w-lg md:max-w-7xl bg-slate-50 dark:bg-slate-900 min-h-screen relative shadow-2xl sm:my-4 sm:rounded-[40px] sm:min-h-[calc(100vh-2rem)] sm:h-fit overflow-hidden pb-20 border border-slate-200 dark:border-slate-800 transition-colors duration-500">

        {balanceDiff && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none p-6">
            <div className={`px-8 py-5 rounded-[2rem] shadow-2xl border-4 flex flex-col items-center gap-1 animate-pop-in ${balanceDiff.type === 'GAIN' ? 'bg-emerald-500 border-emerald-300 text-white' :
              balanceDiff.type === 'PENALTY' ? 'bg-amber-500 border-amber-300 text-white' :
                'bg-red-500 border-red-300 text-white'
              }`}>
              <i className={`fa-solid ${balanceDiff.type === 'GAIN' ? 'fa-circle-plus' : 'fa-circle-minus'} text-4xl mb-1`}></i>
              <span className="text-5xl font-black tracking-tight">
                {balanceDiff.type === 'GAIN' ? '+' : '-'}{balanceDiff.amount.toFixed(2)}€
              </span>
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                {balanceDiff.type === 'PENALTY' ? (language === 'fr' ? 'Oups !' : language === 'nl' ? 'Oeps!' : 'Oops!') : (balanceDiff.type === 'GAIN' ? (language === 'fr' ? 'Bravo !' : language === 'nl' ? 'Goed zo!' : 'Awesome!') : (language === 'fr' ? 'Achat' : language === 'nl' ? 'Aankoop' : 'Purchase'))}
              </span>
            </div>
          </div>
        )}

        <div className={`relative bg-gradient-to-br ${bgGradient} rounded-b-[3.5rem] p-6 pt-12 safe-pt shadow-2xl text-white z-10 transition-colors duration-500 pb-20 overflow-hidden`}>
          {/* Magic Stardust Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-700"></div>
            <div className="absolute bottom-10 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-40 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-300"></div>
            <div className="absolute top-10 right-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-30"></div>
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="stardust" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="white" opacity="0.3" />
                  <circle cx="50" cy="50" r="0.5" fill="white" opacity="0.2" />
                  <circle cx="80" cy="20" r="1" fill="white" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stardust)" />
            </svg>
          </div>

          <div className="flex justify-between items-start relative z-10 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden shadow-2xl ring-1 ring-white/10">
                {renderAvatar(data.avatar, "w-full h-full", data.colorClass)}
              </div>
              <div className="space-y-0.5">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">{t.child.hello}</p>
                <h1 className="text-2xl font-black tracking-tight truncate max-w-[150px]">{data.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowHistory(!showHistory); if ("vibrate" in navigator) navigator.vibrate(10); }}
                aria-label={showHistory ? t.child.historyHeader : t.child.historyHeader}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-xl border ${showHistory ? 'bg-white dark:bg-slate-100 text-slate-800 border-white dark:border-slate-100' : 'bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/20'}`}
              >
                <i className="fa-solid fa-clock-rotate-left text-lg" aria-hidden="true"></i>
              </button>

              <button onClick={onLogout} aria-label={language === 'fr' ? 'Déconnexion' : language === 'nl' ? 'Uitloggen' : 'Logout'} className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/20 hover:border-white/20 transition-all">
                <i className="fa-solid fa-power-off text-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div className="mt-8 mb-4 text-center relative z-10">
            <p className="text-white/80 mb-3 text-[10px] font-black uppercase tracking-[0.3em]">{t.child.myBalance}</p>
            <div className={`flex items-baseline justify-center transform transition-all duration-300 ${isBalanceAnimating ? 'animate-balance-pop' : 'hover:scale-105'}`}>
              <span className="text-7xl sm:text-8xl font-black tracking-tighter tabular-nums drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                {data.balance.toFixed(2)}
              </span>
              <span className="text-3xl font-black ml-3 opacity-40">€</span>
            </div>

            <div className="flex justify-center gap-8 mt-10 pb-2">
              <div className="transform -rotate-12 animate-bounce-short">
                <i className="fa-solid fa-coins text-3xl text-yellow-400 drop-shadow-md"></i>
              </div>
              <div className="transform translate-y-2 scale-110">
                <i className="fa-solid fa-sack-dollar text-4xl text-yellow-500 drop-shadow-lg"></i>
              </div>
              <div className="transform rotate-12 animate-bounce-short animation-delay-500">
                <i className="fa-solid fa-coins text-3xl text-yellow-400 drop-shadow-md"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="-mt-12 relative z-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          {latestPenalty && (
            <div className="mb-6 animate-pop-in max-w-2xl mx-auto">
              <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/50 rounded-[2.5rem] p-5 shadow-xl relative overflow-hidden transition-colors duration-500">
                <div className="absolute top-0 right-0 p-3">
                  <button onClick={() => setAcknowledgedPenaltyId(latestPenalty.id)} aria-label={language === 'fr' ? 'Fermer l\'alerte' : 'Dismiss alert'} className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                    <i className="fa-solid fa-check" aria-hidden="true"></i>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-bounce-short">
                    <i className="fa-solid fa-gavel"></i>
                  </div>
                  <div className="flex-1 pr-6">
                    <h4 className="font-black text-amber-800 dark:text-amber-400 text-sm uppercase tracking-wider mb-1">{t.child.penaltyAlertTitle}</h4>
                    <p className="text-amber-700 dark:text-amber-500 text-xs font-bold leading-relaxed">
                      {getTranslatedTitle(latestPenalty.title, language)} : <span className="underline">-{Math.abs(latestPenalty.amount)}€</span>.
                      {latestPenalty.note ? ` "${latestPenalty.note}"` : ` ${t.child.penaltyAlertDefaultNote}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showHistory && (
            <div className="mb-6 animate-fade-in-up max-w-2xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-500">
                <div className="flex justify-between items-center mb-6 px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                      <i className="fa-solid fa-receipt text-sm"></i>
                    </div>
                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-800 dark:text-white">{t.child.historyHeader}</h4>
                  </div>
                  <button onClick={() => setShowHistory(false)} aria-label={language === 'fr' ? 'Fermer l\'historique' : 'Close history'} className="w-8 h-8 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-emerald-500 rounded-2xl p-4 text-center shadow-lg shadow-emerald-100 dark:shadow-none">
                    <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">{t.child.totalGains}</p>
                    <p className="text-xl font-black text-white">+{stats.totalGains.toFixed(2)}€</p>
                  </div>
                  <div className="bg-rose-500 rounded-2xl p-4 text-center shadow-lg shadow-rose-100 dark:shadow-none">
                    <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">{t.child.totalLosses}</p>
                    <p className="text-xl font-black text-white">-{stats.totalLosses.toFixed(2)}€</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
                  {data.history && data.history.length > 0 ? data.history.map(entry => {
                    const neg = entry.amount < 0 || isPenalty(entry.title) || isPurchase(entry.title);
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-sm transition-transform group-hover:scale-110 ${neg ? 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                            <i className={`fa-solid ${getEntryIcon(entry.title)}`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{getTranslatedTitle(entry.title, language)}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{entry.date}</p>
                          </div>
                        </div>
                        <span className={`font-black text-sm tabular-nums ${neg ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {neg ? '-' : '+'}{Math.abs(entry.amount).toFixed(2)}€
                        </span>
                      </div>
                    )
                  }) : (
                    <div className="text-center py-10 opacity-30">
                      <i className="fa-solid fa-moon text-4xl mb-2"></i>
                      <p className="text-xs font-bold uppercase tracking-widest">{t.child.emptyHistory}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-10">
            {data.goals && data.goals.filter(g => g.status !== 'ARCHIVED').length > 0 ? (
              <>
                <div
                  ref={goalsScrollRef}
                  onScroll={() => {
                    if (!goalsScrollRef.current) return;
                    const el = goalsScrollRef.current;
                    const firstCard = el.children[0] as HTMLElement;
                    if (!firstCard) return;
                    const cardWidth = firstCard.offsetWidth + 16;
                    setActiveGoalIndex(Math.round(el.scrollLeft / cardWidth));
                  }}
                  className={`flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none md:justify-items-center md:gap-6`}
                >
                  {data.goals.filter(g => g.status !== 'ARCHIVED').map((goal, index) => {
                    const percentage = Math.min(100, Math.round((data.balance / goal.target) * 100));
                    const isReached = data.balance >= goal.target && goal.status !== 'COMPLETED';
                    const isCompleted = goal.status === 'COMPLETED';
                    return (
                      <div key={goal.id} className={`snap-start shrink-0 w-full rounded-3xl p-5 shadow-lg flex flex-col justify-between relative transition-all animate-scale-in overflow-hidden ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/30' : isReached ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-slate-800'}`}>
                        <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20 ${isReached ? 'bg-yellow-400' : `bg-${data.colorClass}-400`}`}></div>

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md ${isCompleted ? 'bg-emerald-500 text-white' : isReached ? 'bg-yellow-400 text-white animate-bounce-short' : 'bg-indigo-100 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400'}`}>
                              <i className={isCompleted ? 'fa-solid fa-trophy' : isReached ? 'fa-solid fa-star' : getIcon(goal.icon, 'fa-solid fa-bullseye')}></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className={`font-black text-base leading-none tracking-tight ${isCompleted ? 'text-emerald-800 dark:text-emerald-100' : isReached ? 'text-yellow-800 dark:text-yellow-100' : 'text-slate-800 dark:text-white'}`}>{goal.name}</h3>
                                {index === 0 && <i className="fa-solid fa-star text-yellow-400 text-[10px] animate-pulse"></i>}
                              </div>
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-0.5">{t.child.goalObjective}</p>
                            </div>
                          </div>
                          <span className={`text-xl font-black tabular-nums leading-none ${isCompleted ? 'text-emerald-600' : isReached ? 'text-yellow-600' : `text-${data.colorClass}-600`}`}>{goal.target}€</span>
                        </div>

                        <div className="relative z-10 mt-4">
                          {isCompleted ? (
                            <div className="w-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-emerald-500/20">
                              <i className="fa-solid fa-circle-check"></i>
                              {language === 'fr' ? 'Obtenu !' : language === 'nl' ? 'Behaald!' : 'Purchased!'}
                            </div>
                          ) : isReached ? (
                            <button onClick={() => handlePurchase(goal)}
                              aria-label={`${t.child.reached} ${goal.name}`}
                              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all animate-bounce-short flex items-center justify-center gap-2"
                            >
                              <i className={`${getIcon('gift')} text-yellow-400`} aria-hidden="true"></i>
                              {t.child.reached}
                            </button>
                          ) : (
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-400 tabular-nums">{t.child.remaining} {(goal.target - data.balance).toFixed(2)}€</span>
                                <span className={`text-xs font-black text-${data.colorClass}-500 tabular-nums`}>{percentage}%</span>
                              </div>
                              <div className="w-full h-3 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                                <div
                                  className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-1"
                                  style={{
                                    width: `${Math.max(percentage, 2)}%`,
                                    background: (() => {
                                      if (percentage >= 100) return 'linear-gradient(to right, #fbbf24, #f59e0b)';
                                      if (percentage >= 75) return 'linear-gradient(to right, #34d399, #10b981)';
                                      if (percentage >= 50) return 'linear-gradient(to right, #a3e635, #fde047)';
                                      if (percentage >= 25) return 'linear-gradient(to right, #fb923c, #f97316)';
                                      return 'linear-gradient(to right, #f87171, #fb7185)';
                                    })()
                                  }}
                                >
                                  {percentage > 15 && <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Dot pagination */}
                {data.goals.filter(g => g.status !== 'ARCHIVED').length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-1 md:hidden">
                    {data.goals.filter(g => g.status !== 'ARCHIVED').map((_, i) => (
                      <div key={i} className={`rounded-full transition-all duration-300 ${i === activeGoalIndex ? `w-4 h-1.5 bg-${data.colorClass}-500` : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 text-center shadow-lg group hover:scale-[1.02] transition-transform mx-1 max-w-lg mx-auto">
                <i className={`fa-solid fa-bullseye text-4xl mb-3 transition-transform ${isGoalNudging ? 'text-emerald-500 animate-bounce' : 'text-slate-200'}`}></i>
                <p className="text-slate-500 font-bold text-sm mb-4 leading-relaxed">{isGoalNudging ? t.child.nudgeSent : t.child.askParentsGoal}</p>
                <button onClick={() => { setIsGoalNudging(true); if (onRequestGift) onRequestGift(); setTimeout(() => setIsGoalNudging(false), 3000); }} className="w-full bg-slate-50 text-slate-600 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                  {t.child.addGoalAction}
                </button>
              </div>
            )}
          </div>

          <div className="pb-10">
            <div className="flex items-center gap-3 mb-6 px-1">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-500">
                <i className="fa-solid fa-list-check text-sm"></i>
              </div>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">
                {t.child.myMissions}
              </h2>
            </div>

            <div className="space-y-4 px-1 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
              {data.missions && data.missions.filter(m => m.status !== 'COMPLETED').length > 0 ? (
                data.missions.filter(m => m.status !== 'COMPLETED').map(mission => (
                  <button
                    key={mission.id}
                    disabled={mission.status === 'PENDING'}
                    onClick={() => handleMissionClick(mission.id)}
                    className={`w-full p-5 rounded-[2.5rem] shadow-sm border-2 flex items-center justify-between transition-all relative overflow-hidden group transition-colors duration-500 ${mission.status === 'PENDING'
                      ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100/50 dark:border-indigo-900/30 cursor-default'
                      : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 active:scale-95 hover:border-emerald-100 dark:hover:border-emerald-900 hover:shadow-lg transition-all duration-300'
                      }`}
                  >
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 shadow-sm ${mission.status === 'PENDING' ? 'bg-white dark:bg-slate-800 text-indigo-400 dark:text-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20' : `bg-${data.colorClass}-50 dark:bg-${data.colorClass}-900/20 text-${data.colorClass}-500 dark:text-${data.colorClass}-400 border border-${data.colorClass}-100 dark:border-${data.colorClass}-900/30`}`}>
                        <i className={mission.status === 'PENDING' ? 'fa-solid fa-hourglass-half animate-spin-slow' : getIcon(mission.icon)}></i>
                      </div>
                      <div className="text-left">
                        <div className={`font-black text-base sm:text-lg tracking-tight ${mission.status === 'PENDING' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>{getTranslatedTitle(mission.title, language)}</div>
                        <div className={`text-[10px] font-black uppercase tracking-[0.15em] mt-1 flex items-center gap-2 ${mission.status === 'PENDING' ? 'text-indigo-400 dark:text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}>
                          {mission.status === 'PENDING' ? (
                            <><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-pulse"></span> {t.child.pending}</>
                          ) : (
                            <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500"></span> {t.child.todo}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-black text-sm px-5 py-2.5 rounded-2xl shadow-sm ${mission.status === 'PENDING' ? 'bg-white dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 border border-indigo-50 dark:border-indigo-900/30' : `bg-${data.colorClass}-50 dark:bg-${data.colorClass}-900/20 text-${data.colorClass}-600 dark:text-${data.colorClass}-400 border border-${data.colorClass}-100 dark:border-${data.colorClass}-900/30`}`}>
                      +{mission.reward}€
                    </div>
                  </button>
                ))
              ) : (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center flex flex-col items-center gap-4 col-span-full">
                  <div className={`w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-4xl shadow-inner ${isNudging ? 'animate-bounce' : ''}`}>
                    <i className={`fa-solid fa-rocket text-slate-200`}></i>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 font-black text-sm uppercase tracking-widest">{t.child.noMissions}</p>
                    <p className="text-slate-400 text-xs font-medium">{isNudging ? t.child.nudgeSent : t.child.askNewMission}</p>
                  </div>
                  <button onClick={() => { setIsNudging(true); if (onRequestMission) onRequestMission(); setTimeout(() => setIsNudging(false), 3000); }} className="mt-4 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                    {t.child.askButton}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!data.tutorialSeen && (
          <TutorialOverlay
            steps={[
              { title: t.child.tutorial.welcome_title, description: t.child.tutorial.welcome_desc, icon: 'fa-solid fa-hand-wave' },
              { title: t.child.tutorial.balance_title, description: t.child.tutorial.balance_desc, icon: 'fa-solid fa-piggy-bank' },
              { title: t.child.tutorial.goal_title, description: t.child.tutorial.goal_desc, icon: getIcon('gift') },
              { title: t.child.tutorial.missions_title, description: t.child.tutorial.missions_desc, icon: 'fa-solid fa-list-check' }
            ]}
            onComplete={onTutorialComplete}
            colorClass={data.colorClass}
            labels={{ skip: t.common.skip, next: t.common.next, start: t.common.start }}
          />
        )}
      </div>
    </div>
  );
};

export default ChildView;
