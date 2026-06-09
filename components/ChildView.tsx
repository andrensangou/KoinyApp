
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChildProfile, Language, HistoryEntry, Goal } from '../types';
import TutorialOverlay, { TutorialStep } from './TutorialOverlay';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';
import { getIcon } from '../constants/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isAndroid } from '../hooks/usePlatform';
import { useDarkMode } from '../hooks/useDarkMode';
import { sounds } from '../services/sounds';
import { carryTitle } from '../services/historyTitle';

interface ChildViewProps {
  data: ChildProfile;
  language: Language;
  currency?: string;
  onCompleteMission: (id: string) => void;
  onLogout: () => void;
  onTutorialComplete: () => void;
  onSetPrimaryGoal: (goalId: string) => void;
  soundEnabled: boolean;
  onRequestGift?: () => void;
  onRequestMission?: () => void;
  onPurchaseGoal?: (goal: Goal) => void;
}

const CHILD_PAL: Record<string, { from: string; to: string; muted: string }> = {
  indigo:  { from: '#818cf8', to: '#4338ca', muted: '#c7d2fe' },
  emerald: { from: '#34d399', to: '#059669', muted: '#6ee7b7' },
  rose:    { from: '#fb7185', to: '#be123c', muted: '#fda4af' },
  amber:   { from: '#fbbf24', to: '#d97706', muted: '#fcd34d' },
  blue:    { from: '#60a5fa', to: '#2563eb', muted: '#93c5fd' },
  pink:    { from: '#f472b6', to: '#db2777', muted: '#f9a8d4' },
  violet:  { from: '#a78bfa', to: '#7c3aed', muted: '#c4b5fd' },
  purple:  { from: '#c084fc', to: '#9333ea', muted: '#d8b4fe' },
  teal:    { from: '#2dd4bf', to: '#0d9488', muted: '#5eead4' },
  cyan:    { from: '#22d3ee', to: '#0891b2', muted: '#67e8f9' },
  orange:  { from: '#fb923c', to: '#ea580c', muted: '#fdba74' },
};

const renderAvatar = (avatar: string, sizeClass: string = "w-full h-full", colorClass: string = "indigo") => {
  if (!avatar) return <i className="fa-solid fa-user text-slate-300 text-2xl"></i>;
  if (avatar.startsWith('fa-')) {
    return <i className={`${avatar} text-2xl`}></i>;
  }
  const src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${avatar}`;
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-${colorClass}-100 to-${colorClass}-300 flex items-center justify-center shadow-inner p-1 overflow-hidden`}>
      <img src={src} alt="Avatar" loading="lazy" className="w-full h-full object-contain scale-110 translate-y-1 drop-shadow-sm" />
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

  return carryTitle(title, language); // traduit "Solde reporté" sinon renvoie le titre
};

const getEntryIcon = (title: string) => {
  if (isPenalty(title)) return `${getIcon('gavel')} text-amber-500`;
  if (isPurchase(title)) return `${getIcon('cart')} text-red-500`;
  if (isGift(title)) return `${getIcon('gift')} text-purple-500`;
  return `${getIcon('star')} text-emerald-500`;
};

const ChildView: React.FC<ChildViewProps> = ({ data, language, currency = '€', onCompleteMission, onLogout, onTutorialComplete, onSetPrimaryGoal, soundEnabled, onRequestGift, onRequestMission, onPurchaseGoal }) => {
  const curr = currency;
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState(false);
  const [isGoalNudging, setIsGoalNudging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [acknowledgedPenaltyId, setAcknowledgedPenaltyId] = useState<string | null>(
    () => localStorage.getItem(`koiny_ack_penalty_${data.id}`)
  );
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [histFilter, setHistFilter] = useState<'THIS_MONTH' | 'ALL'>('THIS_MONTH');
  const goalsScrollRef = useRef<HTMLDivElement>(null);

  const t = translations[language];
  const isDark = useDarkMode();
  const prevBalance = useRef(data.balance);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [balanceDiff, setBalanceDiff] = useState<{ amount: number, type: 'GAIN' | 'LOSS' | 'PENALTY' } | null>(null);

  const latestPenalty = useMemo(() => {
    if (!data.history) return null;
    const penalty = data.history.find(h => h.amount < 0 && isPenalty(h.title));
    if (penalty && penalty.id !== acknowledgedPenaltyId) return penalty;
    return null;
  }, [data.history, acknowledgedPenaltyId]);

  // Historique filtré (CE MOIS / TOUT) — comme la vue parent
  const shownHistory = useMemo(() => {
    const h = data.history || [];
    if (histFilter === 'ALL') return h;
    const monthStr = `/${String(new Date().getMonth() + 1).padStart(2, '0')}/`;
    return h.filter(e => (e.date || '').includes(monthStr));
  }, [data.history, histFilter]);

  const stats = useMemo(() => {
    return shownHistory.reduce((acc, curr) => {
      const isNeg = curr.amount < 0 || isPenalty(curr.title) || isPurchase(curr.title);
      if (isNeg) acc.totalLosses += Math.abs(curr.amount);
      else acc.totalGains += curr.amount;
      return acc;
    }, { totalGains: 0, totalLosses: 0 });
  }, [shownHistory]);

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
          sounds.penalty(soundEnabled);
        } else if (type === 'GAIN') {
          Haptics.impact({ style: ImpactStyle.Light });
          // Objectif atteint : si ce gain fait franchir la cible d'un objectif actif
          // → fanfare de célébration au lieu du simple son de gain.
          const reachedGoal = (data.goals || []).some(g =>
            g.status === 'ACTIVE' && prevBalance.current < g.target && data.balance >= g.target);
          if (reachedGoal) sounds.goal(soundEnabled);
          else sounds.gain(soundEnabled);
        }
      }

      const timer = setTimeout(() => setIsBalanceAnimating(false), 600);
      prevBalance.current = data.balance;
      return () => clearTimeout(timer);
    }
  }, [data.balance, data.history, soundEnabled]);

  const handleMissionClick = (id: string) => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    sounds.mission(soundEnabled);
    if (typeof confetti === 'function') {
      confetti({ particleCount: isAndroid ? 30 : 100, spread: isAndroid ? 50 : 70, origin: { y: 0.6 } });
    }
    setAnimatingId(id);
    setTimeout(() => {
      onCompleteMission(id);
      setAnimatingId(null);
    }, 1500);
  };

  const handlePurchase = (goal: Goal) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    sounds.purchase(soundEnabled);
    if (typeof confetti === 'function') {
      confetti({
        particleCount: isAndroid ? 40 : 150,
        spread: isAndroid ? 60 : 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#ffffff']
      });
    }
    if (onPurchaseGoal) onPurchaseGoal(goal);
  };

  const bgGradient = `from-${data.colorClass}-600 to-${data.colorClass}-400`;

  return (
    <div className={`min-h-screen flex justify-center font-sans transition-colors duration-500 ${isAndroid ? 'bg-white dark:bg-slate-950' : ''}`} style={!isAndroid ? { background: isDark ? '#0f172a' : '#f8fafc' } : undefined}>
      <div className={`w-full ${isAndroid ? 'bg-white dark:bg-slate-900 min-h-screen relative overflow-hidden pb-20' : 'max-w-lg md:max-w-7xl min-h-screen relative overflow-hidden pb-20'}`} style={!isAndroid ? { background: isDark ? '#0f172a' : '#f8fafc' } : undefined}>

        {balanceDiff && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none p-6">
            <div className={`px-8 py-5 rounded-[2rem] shadow-2xl border-4 flex flex-col items-center gap-1 animate-pop-in ${balanceDiff.type === 'GAIN' ? 'bg-emerald-500 border-emerald-300 text-white' :
              balanceDiff.type === 'PENALTY' ? 'bg-amber-500 border-amber-300 text-white' :
                'bg-red-500 border-red-300 text-white'
              }`}>
              <i className={`fa-solid ${balanceDiff.type === 'GAIN' ? 'fa-circle-plus' : 'fa-circle-minus'} text-4xl mb-1`}></i>
              <span className="text-5xl font-black tracking-tight">
                {balanceDiff.type === 'GAIN' ? '+' : '-'}{balanceDiff.amount.toFixed(2)}{curr}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                {balanceDiff.type === 'PENALTY' ? (language === 'fr' ? 'Oups !' : language === 'nl' ? 'Oeps!' : 'Oops!') : (balanceDiff.type === 'GAIN' ? (language === 'fr' ? 'Bravo !' : language === 'nl' ? 'Goed zo!' : 'Awesome!') : (language === 'fr' ? 'Achat' : language === 'nl' ? 'Aankoop' : 'Purchase'))}
              </span>
            </div>
          </div>
        )}

        {isAndroid ? (
          /* ── Android MD3 Hero ── */
          <div className="relative bg-indigo-600 p-6 pt-12 safe-pt text-white z-10 pb-20">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {renderAvatar(data.avatar, "w-full h-full", data.colorClass)}
                </div>
                <div>
                  <p className="text-white/70 text-xs font-medium">{t.child.hello}</p>
                  <h1 className="text-xl font-medium tracking-tight truncate max-w-[150px]">{data.name}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowHistory(!showHistory); if ("vibrate" in navigator) navigator.vibrate(10); }}
                  aria-label={t.child.historyHeader}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showHistory ? 'bg-white text-indigo-600' : 'bg-white/20 text-white active:bg-white/30'}`}
                >
                  <i className="fa-solid fa-clock-rotate-left text-base" aria-hidden="true"></i>
                </button>
                <button onClick={onLogout} aria-label={language === 'fr' ? 'Déconnexion' : language === 'nl' ? 'Uitloggen' : 'Logout'} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:bg-white/30 transition-colors">
                  <i className="fa-solid fa-power-off text-base" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <div className="mt-6 mb-4 text-center">
              <p className="text-white/70 mb-2 text-xs font-medium">
                {language === 'fr' ? 'Ma fortune' : language === 'nl' ? 'Mijn fortuin' : 'My fortune'}
              </p>
              <div className={`flex items-baseline justify-center transition-all duration-300 ${isBalanceAnimating ? 'animate-balance-pop' : ''}`}>
                <span className="text-6xl font-bold tracking-tight tabular-nums">
                  {data.balance.toFixed(2)}
                </span>
                <span className="text-2xl font-medium ml-2 opacity-50">{curr}</span>
              </div>

              <div className="flex justify-center gap-8 mt-8 pb-2">
                <div className="transform -rotate-12 animate-bounce-short">
                  <i className="fa-solid fa-coins text-2xl text-yellow-400"></i>
                </div>
                <div className="transform translate-y-1 scale-110">
                  <i className="fa-solid fa-sack-dollar text-3xl text-yellow-500"></i>
                </div>
                <div className="transform rotate-12 animate-bounce-short animation-delay-500">
                  <i className="fa-solid fa-coins text-2xl text-yellow-400"></i>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── iOS Hero ── */
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
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 overflow-hidden shadow-2xl ring-1 ring-white/10">
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
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${showHistory ? 'bg-white text-slate-800 shadow-md shadow-black/10' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  <i className="fa-solid fa-clock-rotate-left text-lg" aria-hidden="true"></i>
                </button>

                <button onClick={onLogout} aria-label={language === 'fr' ? 'Déconnexion' : language === 'nl' ? 'Uitloggen' : 'Logout'} className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all active:scale-90">
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
                <span className="text-3xl font-black ml-3 opacity-40">{curr}</span>
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
        )}

        <div className={`relative z-20 max-w-7xl mx-auto w-full ${isAndroid ? 'px-4 sm:px-6 -mt-10 bg-white dark:bg-slate-900 rounded-t-3xl pt-6' : 'px-[18px]'}`} style={!isAndroid ? { background: isDark ? '#1e293b' : '#ffffff', borderRadius: '30px 30px 0 0', marginTop: -30, paddingTop: 24, minHeight: '60vh' } : undefined}>
          {latestPenalty && (
            isAndroid ? (
              /* ── Android MD3 Penalty Alert ── */
              <div className="mb-5 animate-scale-in max-w-2xl mx-auto">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-gavel text-amber-600 dark:text-amber-400 text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-0.5">{t.child.penaltyAlertTitle}</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      {getTranslatedTitle(latestPenalty.title, language)} : -{Math.abs(latestPenalty.amount)}{curr}.
                      {latestPenalty.note ? ` "${latestPenalty.note}"` : ` ${t.child.penaltyAlertDefaultNote}`}
                    </p>
                  </div>
                  <button onClick={() => { setAcknowledgedPenaltyId(latestPenalty.id); localStorage.setItem(`koiny_ack_penalty_${data.id}`, latestPenalty.id); }} aria-label={language === 'fr' ? 'Fermer l\'alerte' : 'Dismiss alert'} className="w-8 h-8 rounded-full flex items-center justify-center text-amber-500 active:bg-amber-100 dark:active:bg-amber-900/30 shrink-0">
                    <i className="fa-solid fa-xmark text-sm" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            ) : (
              /* ── iOS Penalty Alert — dark theme ── */
              <div className="mb-6 animate-pop-in max-w-2xl mx-auto">
                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1.5px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, padding: 10 }}>
                    <button onClick={() => { setAcknowledgedPenaltyId(latestPenalty.id); localStorage.setItem(`koiny_ack_penalty_${data.id}`, latestPenalty.id); }} aria-label={language === 'fr' ? 'Fermer l\'alerte' : 'Dismiss alert'} style={{ width: 28, height: 28, background: 'rgba(251,191,36,0.15)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fbbf24' }}>
                      <i className="fa-solid fa-check" style={{ fontSize: 11 }} aria-hidden="true"></i>
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(245,158,11,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-gavel" style={{ fontSize: 18, color: '#fbbf24' }}></i>
                    </div>
                    <div style={{ flex: 1, paddingRight: 24 }}>
                      <h4 style={{ fontWeight: 800, color: '#fbbf24', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t.child.penaltyAlertTitle}</h4>
                      <p style={{ color: 'rgba(251,191,36,0.8)', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
                        {getTranslatedTitle(latestPenalty.title, language)} : <span style={{ textDecoration: 'underline' }}>-{Math.abs(latestPenalty.amount)}{curr}</span>.
                        {latestPenalty.note ? ` "${latestPenalty.note}"` : ` ${t.child.penaltyAlertDefaultNote}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {showHistory && (
            isAndroid ? (
              /* ── Android MD3 History Bottom Sheet ── */
              <div className="fixed inset-0 bg-black/40 z-[200] flex items-end animate-fade-in" onClick={() => setShowHistory(false)}>
                <div
                  className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl animate-slide-up flex flex-col max-h-[85vh] relative z-10"
                  onClick={e => e.stopPropagation()}
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  {/* Handle bar */}
                  <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                        <i className="fa-solid fa-receipt text-indigo-500 text-sm"></i>
                      </div>
                      <h4 className="text-xl font-medium text-slate-900 dark:text-white">{t.child.historyHeader}</h4>
                    </div>
                    <button onClick={() => setShowHistory(false)} aria-label={language === 'fr' ? 'Fermer' : 'Close'} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors">
                      <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 px-6 mb-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 text-center">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">{t.child.totalGains}</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">+{stats.totalGains.toFixed(2)}{curr}</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-3 text-center">
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mb-0.5">{t.child.totalLosses}</p>
                      <p className="text-lg font-bold text-rose-700 dark:text-rose-300">-{stats.totalLosses.toFixed(2)}{curr}</p>
                    </div>
                  </div>

                  {/* Transaction list */}
                  <div className="px-6 pb-4 overflow-y-auto flex-grow">
                    {shownHistory.length > 0 ? shownHistory.map(entry => {
                      const neg = entry.amount < 0 || isPenalty(entry.title) || isPurchase(entry.title);
                      return (
                        <div key={entry.id} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center ${neg ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                            <i className={`fa-solid ${getEntryIcon(entry.title)} text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{getTranslatedTitle(entry.title, language)}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{entry.date}</p>
                          </div>
                          <span className={`text-sm font-bold tabular-nums shrink-0 ${neg ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {neg ? '-' : '+'}{Math.abs(entry.amount).toFixed(2)}{curr}
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-10 text-slate-300 dark:text-slate-600">
                        <i className="fa-solid fa-moon text-3xl mb-2"></i>
                        <p className="text-xs font-medium">{t.child.emptyHistory}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── iOS History — fixed overlay (prevents scroll-to-top bug) ── */
              <div className="fixed inset-0 z-[200] flex items-end animate-fade-in" style={{ backdropFilter: 'blur(4px)', background: 'rgba(15,23,42,0.5)' }} onClick={() => setShowHistory(false)}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: isDark ? '#1e293b' : '#ffffff', borderRadius: '28px 28px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}>
                  {/* Handle */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0' }} />
                  </div>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-receipt" style={{ fontSize: 12, color: '#818cf8' }}></i>
                      </div>
                      <h4 style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: isDark ? 'rgba(148,163,184,0.7)' : '#94a3b8' }}>{t.child.historyHeader}</h4>
                    </div>
                    <button onClick={() => setShowHistory(false)} aria-label={language === 'fr' ? 'Fermer l\'historique' : 'Close history'} style={{ width: 28, height: 28, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8, color: isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-xmark" style={{ fontSize: 11 }} aria-hidden="true"></i></button>
                  </div>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 20px 14px', flexShrink: 0 }}>
                    <div style={{ background: 'rgba(52,211,153,0.12)', borderRadius: 14, padding: '10px 14px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, opacity: 0.7 }}>{t.child.totalGains}</p>
                      <p style={{ fontSize: 17, fontWeight: 900, color: '#34d399' }}>+{stats.totalGains.toFixed(2)}{curr}</p>
                    </div>
                    <div style={{ background: 'rgba(244,63,94,0.12)', borderRadius: 14, padding: '10px 14px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, opacity: 0.7 }}>{t.child.totalLosses}</p>
                      <p style={{ fontSize: 17, fontWeight: 900, color: '#f43f5e' }}>-{stats.totalLosses.toFixed(2)}{curr}</p>
                    </div>
                  </div>
                  {/* Filtre CE MOIS / TOUT */}
                  <div style={{ display: 'flex', gap: 8, margin: '0 20px 12px', flexShrink: 0 }}>
                    {([['THIS_MONTH', t.parent.history.thisMonth], ['ALL', t.parent.history.all]] as const).map(([k, lb]) => (
                      <button key={k} onClick={() => setHistFilter(k)}
                        style={{ padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', textTransform: 'uppercase', letterSpacing: '0.05em', background: histFilter === k ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'), color: histFilter === k ? '#fff' : (isDark ? 'rgba(148,163,184,0.7)' : '#94a3b8') }}>
                        {lb}
                      </button>
                    ))}
                  </div>
                  {/* List */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }} className="no-scrollbar">
                    {shownHistory.length > 0 ? shownHistory.map(entry => {
                      const neg = entry.amount < 0 || isPenalty(entry.title) || isPurchase(entry.title);
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: neg ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`fa-solid ${getEntryIcon(entry.title)}`} style={{ fontSize: 12, color: neg ? (isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8') : '#34d399' }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? 'rgba(226,232,240,0.9)' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTranslatedTitle(entry.title, language)}</p>
                            <p style={{ fontSize: 10, color: isDark ? 'rgba(148,163,184,0.4)' : '#94a3b8', fontWeight: 600, marginTop: 1 }}>{entry.date}</p>
                            {entry.note && !isPenalty(entry.title) && (
                              <div style={{ marginTop: 4, background: 'rgba(251,191,36,0.08)', borderRadius: 8, padding: '3px 8px', display: 'inline-flex', gap: 4, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 10 }}>💬</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(251,191,36,0.7)', lineHeight: 1.4 }}>{entry.note}</span>
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, flexShrink: 0, color: neg ? '#f87171' : '#34d399' }}>
                            {neg ? '-' : '+'}{Math.abs(entry.amount).toFixed(2)}{curr}
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-10 opacity-30">
                        <i className="fa-solid fa-moon text-4xl mb-2"></i>
                        <p className="text-xs font-bold uppercase tracking-widest">{t.child.emptyHistory}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          <div className={isAndroid ? 'mb-8' : 'mb-10'}>
            {data.goals && data.goals.filter(g => g.status !== 'ARCHIVED').length > 0 ? (
              isAndroid ? (
                /* ── Android MD3 Goal Cards ── */
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
                    className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 no-scrollbar"
                  >
                    {data.goals.filter(g => g.status !== 'ARCHIVED').map((goal, index) => {
                      const percentage = Math.min(100, Math.round((data.balance / goal.target) * 100));
                      const isReached = data.balance >= goal.target && goal.status !== 'COMPLETED';
                      const isCompleted = goal.status === 'COMPLETED';
                      return (
                        <div key={goal.id} className={`snap-start shrink-0 w-full rounded-2xl p-4 flex flex-col justify-between ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20' : isReached ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : isReached ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'}`}>
                              <i className={isCompleted ? 'fa-solid fa-trophy' : isReached ? 'fa-solid fa-star' : getIcon(goal.icon, 'fa-solid fa-bullseye')}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className={`font-medium text-sm truncate ${isCompleted ? 'text-emerald-900 dark:text-emerald-200' : isReached ? 'text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-white'}`}>{goal.name}</h3>
                                {index === 0 && <i className="fa-solid fa-star text-yellow-400 text-[10px]"></i>}
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{t.child.goalObjective}</p>
                            </div>
                            <span className={`text-lg font-bold tabular-nums ${isCompleted ? 'text-emerald-600' : isReached ? 'text-amber-600' : 'text-indigo-600'}`}>{goal.target}{curr}</span>
                          </div>

                          {isCompleted ? (
                            <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 py-2 px-3 rounded-xl text-xs font-medium justify-center">
                              <i className="fa-solid fa-circle-check"></i>
                              {language === 'fr' ? 'Obtenu !' : language === 'nl' ? 'Behaald!' : 'Purchased!'}
                            </div>
                          ) : isReached ? (
                            <button onClick={() => handlePurchase(goal)}
                              aria-label={`${t.child.reached} ${goal.name}`}
                              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <i className={`${getIcon('gift')} text-yellow-300`} aria-hidden="true"></i>
                              {t.child.reached}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 tabular-nums">{t.child.remaining} {(goal.target - data.balance).toFixed(2)}{curr}</span>
                                <span className="text-xs font-medium text-indigo-600 tabular-nums">{percentage}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-orange-500 transition-all duration-1000 ease-out"
                                  style={{ width: `${Math.max(percentage, 2)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {data.goals.filter(g => g.status !== 'ARCHIVED').length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-2">
                      {data.goals.filter(g => g.status !== 'ARCHIVED').map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-300 ${i === activeGoalIndex ? 'w-4 h-1.5 bg-indigo-500' : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* ── iOS Goal Cards — dark theme ── */
                (() => {
                  const pal = CHILD_PAL[data.colorClass] || CHILD_PAL.indigo;
                  return (
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
                        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar"
                      >
                        {data.goals.filter(g => g.status !== 'ARCHIVED').map((goal, index) => {
                          const percentage = Math.min(100, Math.round((data.balance / goal.target) * 100));
                          const isReached = data.balance >= goal.target && goal.status !== 'COMPLETED';
                          const isCompleted = goal.status === 'COMPLETED';
                          const progressBg = (() => {
                            if (percentage >= 100) return 'linear-gradient(to right,#fbbf24,#f59e0b)';
                            if (percentage >= 75) return 'linear-gradient(to right,#34d399,#10b981)';
                            if (percentage >= 50) return 'linear-gradient(to right,#a3e635,#fde047)';
                            if (percentage >= 25) return 'linear-gradient(to right,#fb923c,#f97316)';
                            return 'linear-gradient(to right,#f87171,#fb7185)';
                          })();
                          return (
                            <div key={goal.id} className="snap-start shrink-0 w-full animate-scale-in" style={{ background: isDark ? '#0f172a' : '#ffffff', borderRadius: 24, padding: '18px 18px 16px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: isDark ? 'rgba(148,163,184,0.7)' : '#94a3b8', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                                  {t.child.goalObjective}
                                  {index === 0 && <i className="fa-solid fa-star ml-1" style={{ fontSize: 9, color: '#fbbf24' }}></i>}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: pal.muted }}>{percentage}%</div>
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? 'white' : '#1e293b', marginBottom: 12, letterSpacing: '-0.3px' }}>{goal.name}</div>
                              {isCompleted ? (
                                <div style={{ background: 'rgba(52,211,153,0.12)', borderRadius: 12, padding: '8px 12px', fontSize: 11, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                                  <i className="fa-solid fa-circle-check mr-2"></i>
                                  {language === 'fr' ? 'Obtenu !' : language === 'nl' ? 'Behaald!' : 'Purchased!'}
                                </div>
                              ) : isReached ? (
                                <button onClick={() => handlePurchase(goal)} style={{ width: '100%', background: `linear-gradient(135deg,${pal.from},${pal.to})`, border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 11, fontWeight: 800, color: 'white', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                  <i className="fa-solid fa-gift mr-2 text-yellow-300"></i>
                                  {t.child.reached}
                                </button>
                              ) : (
                                <div>
                                  <div style={{ width: '100%', height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
                                    <div style={{ height: '100%', borderRadius: 100, background: progressBg, width: `${Math.max(percentage, 2)}%`, transition: 'width 1s ease-out' }} />
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(148,163,184,0.55)' : '#94a3b8' }}>{t.child.remaining} {(goal.target - data.balance).toFixed(2)}{curr}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(148,163,184,0.55)' : '#94a3b8' }}>/ {goal.target}{curr}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {data.goals.filter(g => g.status !== 'ARCHIVED').length > 1 && (
                        <div className="flex justify-center gap-1.5 mt-1">
                          {data.goals.filter(g => g.status !== 'ARCHIVED').map((_, i) => (
                            <div key={i} style={{ borderRadius: 100, transition: 'all 0.3s', width: i === activeGoalIndex ? 16 : 6, height: 6, background: i === activeGoalIndex ? pal.muted : 'rgba(255,255,255,0.2)' }} />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()
              )
            ) : (
              isAndroid ? (
                /* ── Android MD3 Empty Goal ── */
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl text-center max-w-lg mx-auto">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${isGoalNudging ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <i className={`fa-solid fa-bullseye text-xl ${isGoalNudging ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-500'}`}></i>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{isGoalNudging ? t.child.nudgeSent : t.child.askParentsGoal}</p>
                  <button onClick={() => { setIsGoalNudging(true); if (onRequestGift) onRequestGift(); setTimeout(() => setIsGoalNudging(false), 3000); }}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium active:bg-indigo-700 transition-colors"
                  >
                    {t.child.addGoalAction}
                  </button>
                </div>
              ) : (
                /* ── iOS Empty Goal — dark theme ── */
                <div style={{ background: isDark ? '#0f172a' : '#ffffff', borderRadius: 20, padding: '28px 20px', textAlign: 'center', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <i className={`fa-solid fa-bullseye text-4xl mb-3 ${isGoalNudging ? 'text-emerald-400 animate-bounce' : ''}`} style={{ color: isGoalNudging ? '#34d399' : isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0', display: 'block', marginBottom: 12 }}></i>
                  <p style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#94a3b8', fontWeight: 600, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{isGoalNudging ? t.child.nudgeSent : t.child.askParentsGoal}</p>
                  <button onClick={() => { setIsGoalNudging(true); if (onRequestGift) onRequestGift(); setTimeout(() => setIsGoalNudging(false), 3000); }} style={{ width: '100%', background: `${CHILD_PAL[data.colorClass]?.from || '#818cf8'}22`, border: 'none', borderRadius: 14, padding: '12px', fontSize: 11, fontWeight: 800, color: CHILD_PAL[data.colorClass]?.muted || '#c7d2fe', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {t.child.addGoalAction}
                  </button>
                </div>
              )
            )}
          </div>

          <div className="pb-10">
            {isAndroid ? (
              /* ── Android MD3 Mission Section ── */
              <>
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                    <i className="fa-solid fa-list-check text-sm"></i>
                  </div>
                  <h2 className="text-base font-medium text-slate-900 dark:text-white">
                    {t.child.myMissions}
                  </h2>
                </div>

                <div className="space-y-3 px-1">
                  {data.missions && data.missions.filter(m => m.status !== 'COMPLETED').length > 0 ? (
                    data.missions.filter(m => m.status !== 'COMPLETED').map(mission => (
                      <button
                        key={mission.id}
                        disabled={mission.status === 'PENDING'}
                        onClick={() => handleMissionClick(mission.id)}
                        className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-colors text-left ${mission.status === 'PENDING'
                          ? 'bg-slate-50 dark:bg-slate-800 cursor-default'
                          : 'bg-white dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'
                          }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${mission.status === 'PENDING' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'}`}>
                          <i className={mission.status === 'PENDING' ? 'fa-solid fa-hourglass-half' : getIcon(mission.icon)}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${mission.status === 'PENDING' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{getTranslatedTitle(mission.title, language)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${mission.status === 'PENDING'
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              }`}>
                              {mission.status === 'PENDING' ? t.child.pending : t.child.todo}
                            </span>
                          </div>
                          {mission.feedback && mission.status === 'ACTIVE' && (
                            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg">
                              {mission.feedback}
                            </p>
                          )}
                        </div>
                        <span className={`text-sm font-bold tabular-nums shrink-0 ${mission.status === 'PENDING' ? 'text-indigo-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          +{mission.reward}{curr}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 text-center">
                      <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-slate-100 dark:bg-slate-700 ${isNudging ? 'animate-bounce' : ''}`}>
                        <i className="fa-solid fa-rocket text-xl text-slate-300 dark:text-slate-500"></i>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{t.child.noMissions}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mb-4">{isNudging ? t.child.nudgeSent : t.child.askNewMission}</p>
                      <button onClick={() => { setIsNudging(true); if (onRequestMission) onRequestMission(); setTimeout(() => setIsNudging(false), 3000); }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium active:bg-indigo-700 transition-colors"
                      >
                        {t.child.askButton}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── iOS Mission Section — dark theme ── */
              (() => {
                const pal = CHILD_PAL[data.colorClass] || CHILD_PAL.indigo;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${pal.from}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-list-check" style={{ fontSize: 13, color: pal.muted }}></i>
                      </div>
                      <h2 style={{ fontSize: 10, fontWeight: 800, color: isDark ? 'rgba(148,163,184,0.5)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                        {t.child.myMissions}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {data.missions && data.missions.filter(m => m.status !== 'COMPLETED').length > 0 ? (
                        data.missions.filter(m => m.status !== 'COMPLETED').map(mission => {
                          const isPending = mission.status === 'PENDING';
                          return (
                            <button
                              key={mission.id}
                              disabled={isPending}
                              onClick={() => handleMissionClick(mission.id)}
                              style={{ width: '100%', background: isDark ? '#0f172a' : '#ffffff', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${isPending ? 'rgba(250,204,21,0.15)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`, cursor: isPending ? 'default' : 'pointer', textAlign: 'left', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}
                            >
                              <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: isPending ? 'rgba(250,204,21,0.15)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className={isPending ? 'fa-solid fa-hourglass-half' : getIcon(mission.icon)} style={{ color: isPending ? '#fbbf24' : isDark ? 'rgba(226,232,240,0.8)' : '#64748b' }}></i>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? 'rgba(226,232,240,0.9)' : '#334155', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTranslatedTitle(mission.title, language)}</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isPending ? 'rgba(250,204,21,0.1)' : 'rgba(52,211,153,0.1)', borderRadius: 8, padding: '3px 8px' }}>
                                  <i className={`fa-solid ${isPending ? 'fa-hourglass-half' : 'fa-circle-dot'}`} style={{ fontSize: 8, color: isPending ? '#fbbf24' : '#34d399' }} />
                                  <span style={{ fontSize: 9, fontWeight: 800, color: isPending ? '#fbbf24' : '#34d399', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                    {isPending ? t.child.pending : t.child.todo}
                                  </span>
                                </div>
                                {mission.feedback && !isPending && (
                                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 6, background: 'rgba(251,191,36,0.08)', borderRadius: 10, padding: '4px 8px' }}>
                                    <span style={{ fontSize: 11 }}>💬</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24', lineHeight: 1.4 }}>{mission.feedback}</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: isPending ? '#fbbf24' : pal.muted, flexShrink: 0 }}>+{mission.reward}{curr}</div>
                            </button>
                          );
                        })
                      ) : (
                        <div style={{ background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, borderRadius: 20, padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-rocket" style={{ fontSize: 22, color: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }}></i>
                          </div>
                          <div>
                            <p style={{ color: isDark ? 'rgba(226,232,240,0.5)' : '#64748b', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t.child.noMissions}</p>
                            <p style={{ color: isDark ? 'rgba(148,163,184,0.4)' : '#94a3b8', fontSize: 11, fontWeight: 500 }}>{isNudging ? t.child.nudgeSent : t.child.askNewMission}</p>
                          </div>
                          <button onClick={() => { setIsNudging(true); if (onRequestMission) onRequestMission(); setTimeout(() => setIsNudging(false), 3000); }} style={{ background: `${pal.from}22`, border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 11, fontWeight: 800, color: pal.muted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {t.child.askButton}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()
            )}
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
