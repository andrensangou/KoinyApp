import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChildProfile, Goal, Mission, HistoryEntry, Language } from '../types';

// ── M3 Color tokens ──────────────────────────────────────────────────────────
const M3 = {
  light: {
    primary: '#5B5FE8', onPrimary: '#FFFFFF',
    primaryContainer: '#E1E0FF', onPrimaryContainer: '#090069',
    secondary: '#F97316', onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE5D4', onSecondaryContainer: '#5A1B00',
    tertiary: '#10B981', onTertiary: '#FFFFFF',
    tertiaryContainer: '#CCFBF1', onTertiaryContainer: '#003829',
    surface: '#FEFBFF', onSurface: '#1B1B1F',
    surfaceVariant: '#E4E1EC', onSurfaceVariant: '#47464F',
    surfaceContainerLowest: '#FFFFFF', surfaceContainerLow: '#F5F3FA',
    surfaceContainer: '#EFEDF5', surfaceContainerHigh: '#E9E7F0',
    surfaceContainerHighest: '#E4E1EB',
    outline: '#787579', outlineVariant: '#C9C5D0',
    background: '#FEFBFF', onBackground: '#1B1B1F',
    error: '#B3261E', onError: '#FFFFFF', errorContainer: '#F9DEDC',
    shadow: 'rgba(0,0,0,0.2)', scrim: 'rgba(0,0,0,0.32)',
    inverseSurface: '#313033', inverseOnSurface: '#F4EFF4',
  },
  dark: {
    primary: '#C0C1FF', onPrimary: '#1E00A5',
    primaryContainer: '#3B00C8', onPrimaryContainer: '#E1E0FF',
    secondary: '#FFB690', onSecondary: '#5A1B00',
    secondaryContainer: '#7D3800', onSecondaryContainer: '#FFE5D4',
    tertiary: '#6BDBBB', onTertiary: '#003829',
    tertiaryContainer: '#005140', onTertiaryContainer: '#CCFBF1',
    surface: '#131318', onSurface: '#E5E1E6',
    surfaceVariant: '#47464F', onSurfaceVariant: '#C9C5D0',
    surfaceContainerLowest: '#0E0E12', surfaceContainerLow: '#1B1B1F',
    surfaceContainer: '#1F1F27', surfaceContainerHigh: '#292931',
    surfaceContainerHighest: '#34343C',
    outline: '#928F9A', outlineVariant: '#47464F',
    background: '#131318', onBackground: '#E5E1E6',
    error: '#F2B8B5', onError: '#601410', errorContainer: '#8C1D18',
    shadow: 'rgba(0,0,0,0.5)', scrim: 'rgba(0,0,0,0.5)',
    inverseSurface: '#E5E1E6', inverseOnSurface: '#313033',
  },
};

type M3Colors = typeof M3.light;

// ── Easing tokens ─────────────────────────────────────────────────────────────
const EASING = {
  standard:   'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// ── Rarity glow ───────────────────────────────────────────────────────────────
const RARITY_GLOW: Record<string, string> = {
  commun:     '0 2px 8px rgba(91,95,232,0.3)',
  rare:       '0 4px 16px rgba(249,115,22,0.4)',
  épique:     '0 6px 20px rgba(251,191,36,0.5)',
  légendaire: '0 8px 28px rgba(168,85,247,0.6)',
};

// ── Font shorthand ─────────────────────────────────────────────────────────────
const pp = "'Poppins', sans-serif";

// ── Avatar helper ─────────────────────────────────────────────────────────────
const cAvatar = (seed: string) =>
  seed
    ? `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`
    : `https://api.dicebear.com/9.x/lorelei/svg?seed=default`;

// ── Icon helpers ──────────────────────────────────────────────────────────────
const CHILD_ICONS: Record<string, string> = {
  broom: 'fa-broom', utensils: 'fa-utensils', book: 'fa-book', dog: 'fa-dog',
  trash: 'fa-trash-can', shirt: 'fa-shirt', bed: 'fa-bed', bike: 'fa-person-biking',
  trophy: 'fa-trophy', gamepad: 'fa-gamepad', rocket: 'fa-rocket', star: 'fa-star',
  gift: 'fa-gift', gavel: 'fa-gavel', cart: 'fa-cart-shopping', plane: 'fa-plane',
  music: 'fa-music', futbol: 'fa-futbol', wand: 'fa-wand-magic-sparkles',
  'fa-broom': 'fa-broom', 'fa-utensils': 'fa-utensils', 'fa-book': 'fa-book',
  'fa-dog': 'fa-dog', 'fa-trash-can': 'fa-trash-can', 'fa-shirt': 'fa-shirt',
  'fa-bed': 'fa-bed', 'fa-person-biking': 'fa-person-biking', 'fa-trophy': 'fa-trophy',
  'fa-gamepad': 'fa-gamepad', 'fa-rocket': 'fa-rocket', 'fa-star': 'fa-star',
  'fa-gift': 'fa-gift', 'fa-gavel': 'fa-gavel', 'fa-cart-shopping': 'fa-cart-shopping',
  'fa-plane': 'fa-plane', 'fa-music': 'fa-music', 'fa-futbol': 'fa-futbol',
  'fa-wand-magic-sparkles': 'fa-wand-magic-sparkles', 'fa-fire': 'fa-fire',
  'fa-piggy-bank': 'fa-piggy-bank', 'fa-fire-flame-curved': 'fa-fire-flame-curved',
  'fa-bullseye': 'fa-bullseye', 'fa-bolt': 'fa-bolt', 'fa-sack-dollar': 'fa-sack-dollar',
  'fa-crown': 'fa-crown',
};
const cIcon = (id: string, fb = 'fa-star') => {
  if (!id) return fb;
  if (id.startsWith('fa-')) return id;
  return CHILD_ICONS[id] || fb;
};

const cPenalty  = (t: string) => /amende|penalty|punition|fine/i.test(t);
const cPurchase = (t: string) => /achat|purchase|retrait/i.test(t);

// ── Age from birthday ─────────────────────────────────────────────────────────
function computeAge(birthday?: string): number | null {
  if (!birthday) return null;
  const age = Math.floor((Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return age >= 0 && age <= 18 ? age : null;
}

// ── Streak ────────────────────────────────────────────────────────────────────
function computeStreak(history: HistoryEntry[]): number {
  const positiveDays = [...new Set(
    history.filter(h => h.amount > 0).map(h => {
      const parts = h.date.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      return h.date;
    })
  )].sort().reverse();
  if (!positiveDays.length) return 0;
  let streak = 1;
  for (let i = 1; i < positiveDays.length; i++) {
    const d1 = new Date(positiveDays[i - 1]);
    const d2 = new Date(positiveDays[i]);
    const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── XP / Level ────────────────────────────────────────────────────────────────
function computeXP(history: HistoryEntry[]): { xp: number; level: number; xpToNextLevel: number } {
  const earned = history.filter(h => h.amount > 0 && !cPenalty(h.title)).length;
  const totalXP = earned * 25;
  const xpToNextLevel = 500;
  const level = Math.floor(totalXP / xpToNextLevel) + 1;
  const xp = totalXP % xpToNextLevel;
  return { xp, level, xpToNextLevel };
}

// ── Badge type ────────────────────────────────────────────────────────────────
type Badge = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  rarity: 'commun' | 'rare' | 'épique' | 'légendaire';
  unlocked: boolean;
  unlockedAt?: string;
};

function deriveBadges(data: ChildProfile): Badge[] {
  const completedCount = data.history.filter(h => h.amount > 0 && !cPenalty(h.title)).length;
  const totalEarned = data.history.filter(h => h.amount > 0).reduce((a, h) => a + h.amount, 0);
  const streak = computeStreak(data.history);
  const minGoalTarget = data.goals.length > 0 ? Math.min(...data.goals.map(g => g.target)) : Infinity;
  const hasCompletedGoal = data.goals.length > 0 && data.balance >= minGoalTarget;
  const firstPos = data.history.find(h => h.amount > 0);

  return [
    { id: 'b1', name: 'Démarrage',   desc: 'Première mission terminée',   icon: 'fa-rocket',           color: '#5B5FE8', rarity: 'commun',     unlocked: completedCount >= 1, unlockedAt: completedCount >= 1 && firstPos ? firstPos.date : undefined },
    { id: 'b2', name: 'Épargnant',   desc: "Atteins 20€ d'économies",     icon: 'fa-piggy-bank',        color: '#10B981', rarity: 'commun',     unlocked: data.balance >= 20 },
    { id: 'b3', name: 'Flamme 3J',   desc: "3 jours d'affilée",           icon: 'fa-fire',              color: '#F97316', rarity: 'rare',       unlocked: streak >= 3 },
    { id: 'b4', name: 'Super Héros', desc: '5 missions en une semaine',   icon: 'fa-star',              color: '#fbbf24', rarity: 'épique',     unlocked: completedCount >= 5 },
    { id: 'b5', name: 'Flamme 7J',   desc: "7 jours d'affilée",           icon: 'fa-fire-flame-curved', color: '#F97316', rarity: 'épique',     unlocked: streak >= 7 },
    { id: 'b6', name: 'Objectif',    desc: 'Atteins ton 1er objectif',    icon: 'fa-bullseye',          color: '#ec4899', rarity: 'rare',       unlocked: data.goals.length > 0 && hasCompletedGoal },
    { id: 'b7', name: 'Éclair',      desc: '3 missions en 1 heure',       icon: 'fa-bolt',              color: '#fbbf24', rarity: 'légendaire', unlocked: false },
    { id: 'b8', name: 'Riche',       desc: 'Cumule 100€ au total',        icon: 'fa-sack-dollar',       color: '#10B981', rarity: 'légendaire', unlocked: totalEarned >= 100 },
    { id: 'b9', name: 'Maître',      desc: 'Atteins le niveau 5',         icon: 'fa-crown',             color: '#a855f7', rarity: 'légendaire', unlocked: completedCount >= 100 },
  ];
}

// ── i18n ──────────────────────────────────────────────────────────────────────
type TKeys = {
  fortune: string; goals: string; missions: string; toDo: string; pending: string;
  validating: string; noMissions: string; noMissionsDesc: string; askMission: string;
  totalGains: string; totalOut: string; transactions: string; collection: string;
  settings: string; hello: string; logout: string; darkMode: string; sounds: string;
  language: string; goalReady: string; requestSent: string; totalEarned: string;
  currentBalance: string; tabHome: string; tabMissions: string; tabHistory: string;
  tabBadges: string; tabProfile: string; level: string; age: (n: number) => string;
  missionDone: (n: string, cur: string) => string;
  askGoal: string; noGoals: string; goalSent: string;
};

const T: Record<Language, TKeys> = {
  fr: {
    fortune: 'MA FORTUNE', goals: 'MES OBJECTIFS', missions: 'MISSIONS EN COURS',
    toDo: 'À FAIRE', pending: 'EN ATTENTE', validating: '⏳ Validation en cours…',
    noMissions: 'Toutes les missions sont faites !',
    noMissionsDesc: 'Demande de nouvelles missions à tes parents',
    askMission: 'DEMANDER', totalGains: 'TOTAL GAINS', totalOut: 'TOTAL SORTIES',
    transactions: 'TRANSACTIONS', collection: 'COLLECTION', settings: 'PARAMÈTRES',
    hello: 'BONJOUR 👋', logout: 'Déconnexion', darkMode: 'Mode sombre',
    sounds: 'Sons', language: 'Langue',
    goalReady: '🎉 Demande à tes parents !',
    requestSent: 'Demande envoyée à tes parents ! 📬',
    totalEarned: 'TOTAL GAGNÉ', currentBalance: 'SOLDE ACTUEL',
    tabHome: 'Accueil', tabMissions: 'Missions', tabHistory: 'Historique',
    tabBadges: 'Badges', tabProfile: 'Profil',
    level: 'Niveau',
    age: (n: number) => `${n} ans`,
    missionDone: (n: string, cur: string) => `Mission terminée ! +${n}${cur} en attente 🎉`,
    askGoal: 'Demander un objectif', noGoals: 'Pas encore d\'objectif', goalSent: 'Objectif demandé à tes parents ! 🎁',
  },
  nl: {
    fortune: 'MIJN SPAARGELD', goals: 'MIJN DOELEN', missions: 'LOPENDE MISSIES',
    toDo: 'TE DOEN', pending: 'IN AFWACHTING', validating: '⏳ Wordt gevalideerd…',
    noMissions: 'Alle missies gedaan!',
    noMissionsDesc: 'Vraag nieuwe missies aan je ouders',
    askMission: 'VRAGEN', totalGains: 'TOTAAL VERDIENSTEN', totalOut: 'TOTAAL UITGAVEN',
    transactions: 'TRANSACTIES', collection: 'COLLECTIE', settings: 'INSTELLINGEN',
    hello: 'HALLO 👋', logout: 'Uitloggen', darkMode: 'Donkere modus',
    sounds: 'Geluiden', language: 'Taal',
    goalReady: '🎉 Vraag het aan je ouders!',
    requestSent: 'Verzoek verstuurd aan je ouders! 📬',
    totalEarned: 'TOTAAL VERDIEND', currentBalance: 'HUIDIG SALDO',
    tabHome: 'Thuis', tabMissions: 'Missies', tabHistory: 'Geschiedenis',
    tabBadges: 'Badges', tabProfile: 'Profiel',
    level: 'Niveau',
    age: (n: number) => `${n} jaar`,
    missionDone: (n: string, cur: string) => `Missie klaar! +${n}${cur} in afwachting 🎉`,
    askGoal: 'Doel aanvragen', noGoals: 'Nog geen doel', goalSent: 'Doel aangevraagd bij je ouders! 🎁',
  },
  en: {
    fortune: 'MY SAVINGS', goals: 'MY GOALS', missions: 'ACTIVE MISSIONS',
    toDo: 'TO DO', pending: 'PENDING', validating: '⏳ Validating…',
    noMissions: 'All missions done!',
    noMissionsDesc: 'Ask your parents for new missions',
    askMission: 'REQUEST', totalGains: 'TOTAL EARNINGS', totalOut: 'TOTAL OUT',
    transactions: 'TRANSACTIONS', collection: 'COLLECTION', settings: 'SETTINGS',
    hello: 'HELLO 👋', logout: 'Log out', darkMode: 'Dark mode',
    sounds: 'Sounds', language: 'Language',
    goalReady: '🎉 Ask your parents!',
    requestSent: 'Request sent to your parents! 📬',
    totalEarned: 'TOTAL EARNED', currentBalance: 'CURRENT BALANCE',
    tabHome: 'Home', tabMissions: 'Missions', tabHistory: 'History',
    tabBadges: 'Badges', tabProfile: 'Profile',
    level: 'Level',
    age: (n: number) => `${n} yrs`,
    missionDone: (n: string, cur: string) => `Mission done! +${n}${cur} pending 🎉`,
    askGoal: 'Request a goal', noGoals: 'No goal yet', goalSent: 'Goal requested from your parents! 🎁',
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface AndroidChildViewProps {
  data: ChildProfile;
  language: Language;
  currency?: string;
  onCompleteMission: (id: string) => void;
  onLogout: () => void;
  onTutorialComplete?: () => void;
  onSetPrimaryGoal?: (goalId: string) => void;
  soundEnabled?: boolean;
  onRequestGift?: () => void;
  onRequestMission?: () => void;
  onPurchaseGoal?: (goal: Goal) => void;
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'home' | 'missions' | 'history';

// ════════════════════════════════════════════════════════════════════════════
// Ripple component
// ════════════════════════════════════════════════════════════════════════════
interface RippleProps {
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
  disabled?: boolean;
}

function Ripple({ onClick, style, children, disabled }: RippleProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const addRipple = (e: React.MouseEvent) => {
    if (disabled) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 600);
    onClick?.(e);
  };

  return (
    <div
      onClick={addRipple}
      style={{ position: 'relative', overflow: 'hidden', cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
    >
      {children}
      {ripples.map(r => (
        <span
          key={r.id}
          style={{
            position: 'absolute', left: r.x, top: r.y, width: 4, height: 4,
            borderRadius: '50%', background: 'rgba(255,255,255,0.35)',
            transform: 'scale(0)', animation: 'kcv-ripple 0.6s ease-out forwards',
            marginLeft: -2, marginTop: -2, pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Snackbar
// ════════════════════════════════════════════════════════════════════════════
interface SnackbarProps {
  C: M3Colors;
  msg: string;
  action?: { label: string; fn: () => void };
}

function Snackbar({ C, msg, action }: SnackbarProps) {
  return (
    <div style={{
      position: 'absolute', bottom: 72, left: 12, right: 12, zIndex: 200,
      background: C.inverseSurface, borderRadius: 4, padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      boxShadow: '0 3px 5px rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.14)',
      animation: 'kcv-toast-in 0.25s ease forwards, kcv-toast-out 0.25s ease 2.5s forwards',
    }}>
      <span style={{ fontFamily: pp, fontSize: 14, fontWeight: 500, color: C.inverseOnSurface }}>{msg}</span>
      {action && (
        <button
          onClick={action.fn}
          style={{ fontFamily: pp, fontSize: 14, fontWeight: 700, color: C.primary, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SecLabel helper
// ════════════════════════════════════════════════════════════════════════════
interface SecLabelProps {
  C: M3Colors;
  text: string;
  right?: React.ReactNode;
}

function SecLabel({ C, text, right }: SecLabelProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontFamily: pp, fontSize: 11, fontWeight: 700, color: C.onSurfaceVariant, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {text}
      </span>
      {right}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ChildTopBar
// ════════════════════════════════════════════════════════════════════════════
interface ChildTopBarProps {
  C: M3Colors;
  tab: Tab;
  data: ChildProfile;
  language: Language;
  onLogout: () => void;
}

function ChildTopBar({ C, tab, data, language, onLogout }: ChildTopBarProps) {
  const t = T[language] || T.fr;
  const isHome = tab === 'home';
  const age = computeAge(data.birthday);

  const TAB_TITLES: Record<Tab, string> = {
    home:     t.tabHome,
    missions: t.tabMissions,
    history:  t.tabHistory,
  };

  if (isHome) {
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 16px 10px',
        paddingTop: 'env(safe-area-inset-top)',
        minHeight: 'calc(56px + env(safe-area-inset-top))',
        background: 'transparent',
        flexShrink: 0,
      }}>
        {/* Left: avatar + greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            <img src={cAvatar(data.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: pp, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}>
              {t.hello}
            </span>
            <span style={{ fontFamily: pp, fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>
              {data.name}{age !== null ? `, ${t.age(age)}` : ''}
            </span>
          </div>
        </div>
        {/* Right: power/exit button */}
        <button onClick={onLogout} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fa-solid fa-power-off" style={{ color: '#FFFFFF', fontSize: 13 }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 16px 10px',
      paddingTop: 'env(safe-area-inset-top)',
      minHeight: 'calc(56px + env(safe-area-inset-top))',
      background: C.surface,
      borderBottom: `1px solid ${C.outlineVariant}`,
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: pp, fontSize: 16, fontWeight: 700, color: C.onSurface }}>
        {TAB_TITLES[tab]}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ChildBottomNav
// ════════════════════════════════════════════════════════════════════════════
interface ChildBottomNavProps {
  C: M3Colors;
  active: Tab;
  onChange: (tab: Tab) => void;
  pendingMissions: number;
  language: Language;
}

function ChildBottomNav({ C, active, onChange, pendingMissions, language }: ChildBottomNavProps) {
  const t = T[language] || T.fr;

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'home',     icon: 'fa-house',              label: t.tabHome },
    { id: 'missions', icon: 'fa-list-check',          label: t.tabMissions },
    { id: 'history',  icon: 'fa-clock-rotate-left',   label: t.tabHistory },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.surfaceContainer,
      borderTop: `1px solid ${C.outlineVariant}`,
      display: 'flex', alignItems: 'flex-start',
      paddingTop: 4,
      paddingBottom: 'env(safe-area-inset-bottom)',
      height: 'calc(62px + env(safe-area-inset-bottom))',
      zIndex: 50,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1, height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              position: 'relative', gap: 4,
            }}
          >
            {/* Indicator pill */}
            <div style={{
              width: 54, height: 28, borderRadius: 14,
              background: isActive ? C.secondaryContainer : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `background 0.2s ${EASING.standard}`,
              position: 'relative',
            }}>
              <i
                className={`fa-solid ${tab.icon}`}
                style={{
                  fontSize: 17,
                  color: isActive ? C.onSecondaryContainer : C.onSurfaceVariant,
                  transition: `color 0.2s ${EASING.standard}`,
                }}
              />
            </div>
            <span style={{
              fontFamily: pp,
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? C.onSecondaryContainer : C.onSurfaceVariant,
              transition: `color 0.2s ${EASING.standard}`,
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HomeScreen
// ════════════════════════════════════════════════════════════════════════════
interface HomeScreenProps {
  C: M3Colors;
  data: ChildProfile;
  language: Language;
  currency: string;
  isDark: boolean;
  onComplete: (id: string) => void;
  onRequestGift?: () => void;
}

function HomeScreen({ C, data, language, currency, isDark, onComplete, onRequestGift }: HomeScreenProps) {
  const t = T[language] || T.fr;
  const [goalPage, setGoalPage] = useState(0);
  const goalsRef = useRef<HTMLDivElement>(null);

  const activeGoals = data.goals.filter(g => !g.status || g.status === 'ACTIVE');
  const activeMissions = data.missions.filter(m => m.status === 'ACTIVE');
  const previewMissions = activeMissions.slice(0, 2);
  const extraCount = activeMissions.length - 2;

  // Progress bar color
  const progressColor = (pct: number) => {
    if (pct >= 75) return '#10B981';
    if (pct >= 50) return '#F59E0B';
    return '#F97316';
  };

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Balance hero card */}
      <div style={{
        borderRadius: 28,
        background: 'linear-gradient(150deg,#4338CA 0%,#5B5FE8 55%,#7C3AED 100%)',
        boxShadow: '0 4px 16px rgba(67,56,202,0.45)',
        padding: '24px 24px 28px',
        position: 'relative', overflow: 'hidden',
        marginBottom: 20,
        animation: 'kcv-card-in 300ms ease-out both',
      }}>
        {/* Deco circles */}
        <div style={{
          position: 'absolute', right: -32, top: -32,
          width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 16, bottom: -48,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />
        <span style={{
          fontFamily: pp, fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'block', marginBottom: 6,
        }}>
          {t.fortune}
        </span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontFamily: pp, fontSize: 52, fontWeight: 900,
            color: '#FFFFFF', lineHeight: 1,
          }}>
            {data.balance.toFixed(2)}
          </span>
          <span style={{
            fontFamily: pp, fontSize: 24, fontWeight: 700,
            color: 'rgba(255,255,255,0.55)', marginBottom: 6,
          }}>
            {currency}
          </span>
        </div>
      </div>

      {/* White sheet */}
      <div style={{
        background: isDark ? C.surfaceContainerLow : '#FFFFFF',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        padding: '20px 0 0',
        marginLeft: -16, marginRight: -16,
        paddingLeft: 16, paddingRight: 16,
      }}>
        {/* Goals section */}
        <div style={{ marginBottom: 24, animation: 'kcv-card-in 300ms ease-out 100ms both' }}>
          <SecLabel C={C} text={t.goals} right={activeGoals.length > 0 ? (
            <button
              onClick={onRequestGift}
              style={{
                fontFamily: pp, fontSize: 12, fontWeight: 700, color: C.primary,
                background: C.primaryContainer, border: 'none', borderRadius: 20,
                padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.02em',
              }}
            >
              + {t.askGoal}
            </button>
          ) : undefined} />
          {activeGoals.length > 0 ? (
            <>
              {/* Carousel snap : une carte plein écran par swipe (pas d'aperçu de la suivante) */}
              <div
                ref={goalsRef}
                className="no-scrollbar"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setGoalPage(Math.round(el.scrollLeft / el.clientWidth));
                }}
                style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' }}
              >
                {activeGoals.map((goal, idx) => {
                  const pct = Math.min(100, (data.balance / goal.target) * 100);
                  const isReady = data.balance >= goal.target;
                  return (
                    <div key={goal.id} style={{
                      minWidth: '100%', width: '100%',
                      scrollSnapAlign: 'center',
                      background: C.surfaceContainerLow,
                      borderRadius: 18, padding: 16,
                      flexShrink: 0,
                      display: 'flex', flexDirection: 'column',
                      height: 112,
                    }}>
                      {/* Icon + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: C.primaryContainer,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <i className={`fa-solid ${cIcon(goal.icon, 'fa-bullseye')}`} style={{ fontSize: 16, color: C.primary }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: pp, fontSize: 13, fontWeight: 600, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {goal.name}
                          </div>
                          <div style={{ fontFamily: pp, fontSize: 11, color: C.onSurfaceVariant }}>
                            {data.balance.toFixed(2)}{currency} / {goal.target.toFixed(2)}{currency}
                          </div>
                        </div>
                      </div>
                      {/* Spacer pousse la barre tout en bas — cartes de hauteur identique */}
                      <div style={{ flex: 1 }} />
                      {/* Progress bar (verte si objectif atteint) */}
                      <div style={{ height: 7, borderRadius: 4, background: C.surfaceVariant, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: isReady ? '#10B981' : progressColor(pct),
                          width: `${pct}%`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      {isReady && (
                        <div style={{
                          marginTop: 4, fontFamily: pp, fontSize: 10, fontWeight: 700,
                          color: '#10B981', letterSpacing: '0.02em',
                        }}>
                          {t.goalReady}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Pagination dots */}
              {activeGoals.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                  {activeGoals.map((_, i) => (
                    <div key={i} style={{
                      width: i === goalPage ? 16 : 6, height: 6, borderRadius: 3,
                      background: i === goalPage ? C.primary : C.outlineVariant,
                      transition: 'all 0.2s ease',
                    }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Empty goals state */
            <div style={{
              background: C.surfaceContainerLow, borderRadius: 18,
              padding: '20px 16px', textAlign: 'center',
            }}>
              <i className="fa-solid fa-bullseye" style={{ fontSize: 28, color: C.primary, marginBottom: 10, display: 'block', opacity: 0.5 }} />
              <div style={{ fontFamily: pp, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 14 }}>
                {t.noGoals}
              </div>
              <button
                onClick={onRequestGift}
                style={{
                  fontFamily: pp, fontSize: 13, fontWeight: 700, color: '#FFFFFF',
                  background: C.primary, border: 'none', borderRadius: 20,
                  padding: '10px 20px', cursor: 'pointer', width: '100%',
                }}
              >
                🎁 {t.askGoal}
              </button>
            </div>
          )}
        </div>

        {/* Active missions preview */}
        {activeMissions.length > 0 && (
          <div style={{ marginBottom: 24, animation: 'kcv-card-in 300ms ease-out 200ms both' }}>
            <SecLabel C={C} text={t.missions} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {previewMissions.map((m, idx) => (
                <div key={m.id} style={{
                  background: C.surfaceContainerLow,
                  borderRadius: 16, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: C.primaryContainer, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`fa-solid ${cIcon(m.icon)}`} style={{ fontSize: 16, color: C.primary }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: pp, fontSize: 14, fontWeight: 600, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </div>
                    <div style={{
                      display: 'inline-block', marginTop: 3,
                      background: C.secondaryContainer, borderRadius: 8,
                      padding: '2px 8px',
                      fontFamily: pp, fontSize: 11, fontWeight: 700, color: C.onSecondaryContainer,
                    }}>
                      +{m.reward.toFixed(2)}{currency}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: C.primaryContainer,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <i className="fa-solid fa-check" style={{ fontSize: 14, color: C.primary }} />
                  </div>
                </div>
              ))}
              {extraCount > 0 && (
                <div style={{ fontFamily: pp, fontSize: 12, fontWeight: 600, color: C.primary, paddingLeft: 4 }}>
                  +{extraCount} autres missions →
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty home state */}
        {activeGoals.length === 0 && activeMissions.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            animation: 'kcv-card-in 300ms ease-out both',
          }}>
            <i className="fa-solid fa-star" style={{ fontSize: 48, color: C.primary, marginBottom: 16, display: 'block' }} />
            <div style={{ fontFamily: pp, fontSize: 16, fontWeight: 700, color: C.onSurface, marginBottom: 8 }}>
              {t.noMissions}
            </div>
            <div style={{ fontFamily: pp, fontSize: 13, color: C.onSurfaceVariant }}>
              {t.noMissionsDesc}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MissionsScreen
// ════════════════════════════════════════════════════════════════════════════
interface MissionsScreenProps {
  C: M3Colors;
  data: ChildProfile;
  language: Language;
  currency: string;
  onComplete: (id: string) => void;
  onRequestMission: () => void;
}

function MissionsScreen({ C, data, language, currency, onComplete, onRequestMission }: MissionsScreenProps) {
  const t = T[language] || T.fr;

  const activeMissions = data.missions.filter(m => m.status === 'ACTIVE');
  const pendingMissions = data.missions.filter(m => m.status === 'PENDING');

  const isEmpty = activeMissions.length === 0 && pendingMissions.length === 0;

  return (
    <div style={{ paddingTop: 16, paddingBottom: 80, position: 'relative' }}>
      {isEmpty && (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          animation: 'kcv-scale-in 0.25s ease',
        }}>
          <i className="fa-solid fa-trophy" style={{ fontSize: 56, color: C.primary, marginBottom: 16, display: 'block' }} />
          <div style={{ fontFamily: pp, fontSize: 17, fontWeight: 700, color: C.onSurface, marginBottom: 8 }}>
            {t.noMissions}
          </div>
          <div style={{ fontFamily: pp, fontSize: 13, color: C.onSurfaceVariant }}>
            {t.noMissionsDesc}
          </div>
        </div>
      )}

      {/* À FAIRE */}
      {activeMissions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SecLabel C={C} text={t.toDo} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeMissions.map((m, idx) => (
              <div key={m.id} style={{
                background: C.surfaceContainerLow,
                borderRadius: 18,
                boxShadow: `0 1px 3px ${C.shadow}`,
                padding: '14px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                animation: 'kcv-slide-right 300ms ease-out both',
                animationDelay: `${idx * 60}ms`,
              }}>
                {/* Icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: C.primaryContainer, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`fa-solid ${cIcon(m.icon)}`} style={{ fontSize: 20, color: C.primary }} />
                </div>
                {/* Title + reward + parent feedback */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: pp, fontSize: 14, fontWeight: 600, color: C.onSurface, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    background: C.secondaryContainer, borderRadius: 8,
                    padding: '2px 8px',
                    fontFamily: pp, fontSize: 11, fontWeight: 700, color: C.onSecondaryContainer,
                  }}>
                    +{m.reward.toFixed(2)}{currency}
                  </div>
                  {/* Parent rejection comment */}
                  {m.feedback && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 5,
                      marginTop: 6,
                      background: '#FEF3C7', borderRadius: 8, padding: '4px 8px',
                    }}>
                      <i className="fa-solid fa-comment-dots" style={{ fontSize: 10, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontFamily: pp, fontSize: 11, fontWeight: 500, color: '#92400E', lineHeight: 1.4 }}>
                        {m.feedback}
                      </span>
                    </div>
                  )}
                </div>
                {/* Check button */}
                <Ripple
                  onClick={() => onComplete(m.id)}
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: C.tertiary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="fa-solid fa-check" style={{ fontSize: 18, color: C.onTertiary }} />
                </Ripple>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EN ATTENTE */}
      {pendingMissions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SecLabel C={C} text={t.pending} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.7 }}>
            {pendingMissions.map((m, idx) => (
              <div key={m.id} style={{
                background: C.surfaceContainerLow,
                borderRadius: 18,
                boxShadow: `0 1px 3px ${C.shadow}`,
                padding: '14px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                animation: 'kcv-slide-right 300ms ease-out both',
                animationDelay: `${(activeMissions.length + idx) * 60}ms`,
              }}>
                {/* Hourglass icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: C.surfaceContainerHigh, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="fa-solid fa-hourglass-half" style={{ fontSize: 20, color: C.onSurfaceVariant }} />
                </div>
                {/* Title + validating chip */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: pp, fontSize: 14, fontWeight: 600, color: C.onSurface, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    background: C.surfaceContainerHigh, borderRadius: 8,
                    padding: '2px 8px',
                    fontFamily: pp, fontSize: 11, fontWeight: 600, color: C.onSurfaceVariant,
                  }}>
                    {t.validating}
                  </div>
                </div>
                {/* Reward amount */}
                <div style={{ fontFamily: pp, fontSize: 13, fontWeight: 700, color: C.onSurface, flexShrink: 0 }}>
                  +{m.reward.toFixed(2)}{currency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <Ripple
        onClick={onRequestMission}
        style={{
          position: 'fixed', bottom: 76, right: 16,
          background: C.primary, borderRadius: 16,
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 3px 8px ${C.shadow}`,
          zIndex: 100,
          animation: 'kcv-fab-enter 300ms cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <i className="fa-solid fa-plus" style={{ fontSize: 16, color: C.onPrimary }} />
        <span style={{ fontFamily: pp, fontSize: 13, fontWeight: 700, color: C.onPrimary, letterSpacing: '0.05em' }}>
          {t.askMission}
        </span>
      </Ripple>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HistoryScreen
// ════════════════════════════════════════════════════════════════════════════
interface HistoryScreenProps {
  C: M3Colors;
  data: ChildProfile;
  language: Language;
  currency: string;
}

function HistoryScreen({ C, data, language, currency }: HistoryScreenProps) {
  const t = T[language] || T.fr;

  const totalGains = data.history.filter(h => h.amount > 0 && !cPurchase(h.title)).reduce((a, h) => a + h.amount, 0);
  const totalOut   = data.history.filter(h => h.amount < 0 || cPurchase(h.title)).reduce((a, h) => a + Math.abs(h.amount), 0);

  const histIcon = (entry: HistoryEntry) => {
    if (cPenalty(entry.title))  return { icon: 'fa-gavel',        color: '#B3261E' };
    if (cPurchase(entry.title)) return { icon: 'fa-cart-shopping', color: '#F59E0B' };
    if (entry.amount > 0)       return { icon: 'fa-check-circle',  color: '#10B981' };
    return { icon: 'fa-minus-circle', color: C.onSurfaceVariant };
  };

  // Pas de re-tri : on garde l'ordre du cloud (created_at décroissant = dernière
  // validation en haut), identique à iOS. Le champ `date` n'ayant que le jour
  // (JJ/MM/AAAA), re-trier dessus casserait l'ordre des transactions d'un même jour.
  const sorted = [...data.history];

  return (
    <div style={{ paddingTop: 16, paddingBottom: 24 }}>
      {/* Summary grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{
          background: C.tertiaryContainer, borderRadius: 16, padding: '14px 16px',
          animation: 'kcv-card-in 300ms ease-out both',
        }}>
          <div style={{ fontFamily: pp, fontSize: 10, fontWeight: 700, color: C.onTertiaryContainer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {t.totalGains}
          </div>
          <div style={{ fontFamily: pp, fontSize: 20, fontWeight: 800, color: '#10B981' }}>
            +{totalGains.toFixed(2)}{currency}
          </div>
        </div>
        <div style={{
          background: C.errorContainer, borderRadius: 16, padding: '14px 16px',
          animation: 'kcv-card-in 300ms ease-out 80ms both',
        }}>
          <div style={{ fontFamily: pp, fontSize: 10, fontWeight: 700, color: C.error, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {t.totalOut}
          </div>
          <div style={{ fontFamily: pp, fontSize: 20, fontWeight: 800, color: C.error }}>
            -{totalOut.toFixed(2)}{currency}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <SecLabel C={C} text={t.transactions} />
      {sorted.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 40, color: C.outlineVariant, display: 'block', marginBottom: 12 }} />
          <span style={{ fontFamily: pp, fontSize: 13, color: C.onSurfaceVariant }}>
            {language === 'fr' ? 'Aucune transaction' : language === 'nl' ? 'Geen transacties' : 'No transactions yet'}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((entry, idx) => {
          const { icon, color } = histIcon(entry);
          return (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              background: C.surfaceContainerLow, borderRadius: 14,
              animation: 'kcv-slide-left 300ms ease-out both',
              animationDelay: `${idx * 50}ms`,
            }}>
              {/* Icon */}
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: `${color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 16, color }} />
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: pp, fontSize: 13, fontWeight: 600, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.title}
                </div>
                <div style={{ fontFamily: pp, fontSize: 11, color: C.onSurfaceVariant }}>
                  {entry.date}
                </div>
                {/* Parent comment on approved mission */}
                {entry.note && !cPenalty(entry.title) && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 4,
                    background: C.secondaryContainer, borderRadius: 8, padding: '2px 7px',
                  }}>
                    <i className="fa-solid fa-comment-dots" style={{ fontSize: 9, color: C.secondary }} />
                    <span style={{ fontFamily: pp, fontSize: 10, fontWeight: 600, color: C.onSecondaryContainer }}>
                      {entry.note}
                    </span>
                  </div>
                )}
              </div>
              {/* Amount */}
              <div style={{
                fontFamily: pp, fontSize: 14, fontWeight: 700, flexShrink: 0,
                color: entry.amount >= 0 ? '#10B981' : C.error,
              }}>
                {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)}{currency}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BadgesScreen
// ════════════════════════════════════════════════════════════════════════════
interface BadgesScreenProps {
  C: M3Colors;
  data: ChildProfile;
  badges: Badge[];
  language: Language;
}

function BadgesScreen({ C, data, badges, language }: BadgesScreenProps) {
  const t = T[language] || T.fr;
  const [selected, setSelected] = useState<Badge | null>(null);

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const { level } = computeXP(data.history);

  const rarityLabel: Record<string, string> = {
    commun:     language === 'fr' ? 'Commun'     : language === 'nl' ? 'Gewoon'     : 'Common',
    rare:       language === 'fr' ? 'Rare'        : language === 'nl' ? 'Zeldzaam'   : 'Rare',
    épique:     language === 'fr' ? 'Épique'      : language === 'nl' ? 'Episch'     : 'Epic',
    légendaire: language === 'fr' ? 'Légendaire'  : language === 'nl' ? 'Legendarisch' : 'Legendary',
  };

  const rarityDotColor: Record<string, string> = {
    commun: '#5B5FE8', rare: '#F97316', épique: '#fbbf24', légendaire: '#a855f7',
  };

  return (
    <div style={{ paddingTop: 16, paddingBottom: 24 }}>
      {/* Header card */}
      <div style={{
        background: C.primaryContainer, borderRadius: 20,
        padding: '20px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
        animation: 'kcv-card-in 300ms ease-out both',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="fa-solid fa-trophy" style={{ fontSize: 24, color: C.onPrimary }} />
        </div>
        <div>
          <div style={{ fontFamily: pp, fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.collection}
          </div>
          <div style={{ fontFamily: pp, fontSize: 16, fontWeight: 700, color: C.onPrimaryContainer }}>
            {unlockedCount} / {badges.length}
            {language === 'fr' ? ' débloqués' : language === 'nl' ? ' ontgrendeld' : ' unlocked'}
          </div>
          <div style={{ fontFamily: pp, fontSize: 12, color: C.primary, marginTop: 2 }}>
            {t.level} {level}
          </div>
        </div>
      </div>

      {/* Badge grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {badges.map((badge, idx) => (
          <Ripple
            key={badge.id}
            onClick={() => setSelected(selected?.id === badge.id ? null : badge)}
            style={{
              background: badge.unlocked ? C.surfaceContainerLow : C.surfaceContainerHigh,
              borderRadius: 18, padding: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              position: 'relative',
              opacity: badge.unlocked ? 1 : 0.5,
              animation: 'kcv-badge-bounce 500ms cubic-bezier(0.34,1.56,0.64,1) both',
              animationDelay: `${idx * 50}ms`,
              boxShadow: badge.unlocked ? RARITY_GLOW[badge.rarity] : 'none',
            }}
          >
            {/* Rarity dot */}
            {badge.unlocked && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                width: 8, height: 8, borderRadius: '50%',
                background: rarityDotColor[badge.rarity],
              }} />
            )}
            {/* Icon */}
            <div style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: badge.unlocked ? 'kcv-badge-float 3s ease-in-out infinite' : 'none',
            }}>
              {badge.unlocked ? (
                <i className={`fa-solid ${badge.icon}`} style={{ fontSize: 22, color: badge.color }} />
              ) : (
                <i className="fa-solid fa-lock" style={{ fontSize: 22, color: C.onSurfaceVariant }} />
              )}
            </div>
            {/* Name */}
            <span style={{
              fontFamily: pp, fontSize: 10, fontWeight: badge.unlocked ? 700 : 500,
              color: badge.unlocked ? C.onSurface : C.onSurfaceVariant,
              textAlign: 'center', lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {badge.name}
            </span>
          </Ripple>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          marginTop: 20,
          background: C.surfaceContainerLow,
          borderRadius: 20, padding: '20px 16px',
          display: 'flex', alignItems: 'center', gap: 16,
          animation: 'kcv-scale-in 0.25s ease',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: `${selected.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: RARITY_GLOW[selected.rarity],
          }}>
            <i className={`fa-solid ${selected.icon}`} style={{ fontSize: 22, color: selected.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: pp, fontSize: 15, fontWeight: 700, color: C.onSurface }}>{selected.name}</div>
            <div style={{
              display: 'inline-block', marginTop: 2, marginBottom: 4,
              background: `${rarityDotColor[selected.rarity]}20`, borderRadius: 6,
              padding: '1px 7px',
              fontFamily: pp, fontSize: 10, fontWeight: 700, color: rarityDotColor[selected.rarity],
            }}>
              {rarityLabel[selected.rarity]}
            </div>
            <div style={{ fontFamily: pp, fontSize: 12, color: C.onSurfaceVariant }}>{selected.desc}</div>
            {selected.unlockedAt && (
              <div style={{ fontFamily: pp, fontSize: 11, color: C.outline, marginTop: 4 }}>
                {language === 'fr' ? 'Débloqué le' : language === 'nl' ? 'Ontgrendeld op' : 'Unlocked'} {selected.unlockedAt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ProfileScreen
// ════════════════════════════════════════════════════════════════════════════
interface ProfileScreenProps {
  C: M3Colors;
  data: ChildProfile;
  language: Language;
  currency: string;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

function ProfileScreen({ C, data, language, currency, isDark, onToggleDark, onLogout }: ProfileScreenProps) {
  const t = T[language] || T.fr;
  const age = computeAge(data.birthday);
  const totalEarned = data.history.filter(h => h.amount > 0).reduce((a, h) => a + h.amount, 0);

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    borderBottom: `1px solid ${C.outlineVariant}`,
    cursor: 'pointer',
  };

  const iconBoxStyle = (bg: string): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ paddingTop: 16, paddingBottom: 40 }}>
      {/* Hero card */}
      <div style={{
        borderRadius: 24,
        background: 'linear-gradient(135deg,#4338CA 0%,#6366F1 100%)',
        padding: 20, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16,
        animation: 'kcv-card-in 300ms ease-out both',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.4)',
          overflow: 'hidden', flexShrink: 0,
          background: 'rgba(255,255,255,0.15)',
        }}>
          <img src={cAvatar(data.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ fontFamily: pp, fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}>{data.name}</div>
          {age !== null && (
            <div style={{ fontFamily: pp, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {t.age(age)}
            </div>
          )}
        </div>
      </div>

      {/* Stats card */}
      <div style={{
        background: C.tertiaryContainer, borderRadius: 16,
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        animation: 'kcv-card-in 300ms ease-out 80ms both',
      }}>
        <div>
          <div style={{ fontFamily: pp, fontSize: 10, fontWeight: 700, color: C.onTertiaryContainer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t.totalEarned}
          </div>
          <div style={{ fontFamily: pp, fontSize: 18, fontWeight: 800, color: C.onTertiaryContainer }}>
            {totalEarned.toFixed(2)}{currency}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: pp, fontSize: 10, fontWeight: 700, color: C.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t.currentBalance}
          </div>
          <div style={{ fontFamily: pp, fontSize: 18, fontWeight: 800, color: C.tertiary }}>
            {data.balance.toFixed(2)}{currency}
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div style={{
        background: C.surfaceContainerLow, borderRadius: 16, overflow: 'hidden',
        animation: 'kcv-card-in 300ms ease-out 160ms both',
      }}>
        <div style={{ fontFamily: pp, fontSize: 11, fontWeight: 700, color: C.onSurfaceVariant, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 16px 4px' }}>
          {t.settings}
        </div>

        {/* Sons */}
        <Ripple style={rowStyle}>
          <div style={iconBoxStyle(C.primaryContainer)}>
            <i className="fa-solid fa-volume-high" style={{ fontSize: 14, color: C.primary }} />
          </div>
          <div style={{ flex: 1, fontFamily: pp, fontSize: 14, fontWeight: 500, color: C.onSurface }}>
            {t.sounds}
          </div>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 12, color: C.onSurfaceVariant }} />
        </Ripple>

        {/* Langue */}
        <Ripple style={rowStyle}>
          <div style={iconBoxStyle(C.secondaryContainer)}>
            <i className="fa-solid fa-language" style={{ fontSize: 14, color: C.secondary }} />
          </div>
          <div style={{ flex: 1, fontFamily: pp, fontSize: 14, fontWeight: 500, color: C.onSurface }}>
            {t.language}
          </div>
          <span style={{ fontFamily: pp, fontSize: 12, color: C.onSurfaceVariant, marginRight: 6 }}>
            {language.toUpperCase()}
          </span>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 12, color: C.onSurfaceVariant }} />
        </Ripple>

        {/* Mode sombre */}
        <Ripple onClick={onToggleDark} style={rowStyle}>
          <div style={iconBoxStyle(C.tertiaryContainer)}>
            <i className="fa-solid fa-moon" style={{ fontSize: 14, color: C.tertiary }} />
          </div>
          <div style={{ flex: 1, fontFamily: pp, fontSize: 14, fontWeight: 500, color: C.onSurface }}>
            {t.darkMode}
          </div>
          {/* Toggle switch */}
          <div style={{
            width: 44, height: 24, borderRadius: 12,
            background: isDark ? C.primary : C.surfaceVariant,
            position: 'relative', transition: 'background 0.2s ease',
          }}>
            <div style={{
              position: 'absolute', top: 3,
              left: isDark ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: isDark ? C.onPrimary : C.outline,
              transition: 'left 0.2s ease',
            }} />
          </div>
        </Ripple>

        {/* Déconnexion */}
        <Ripple onClick={onLogout} style={{ ...rowStyle, borderBottom: 'none', background: `${C.error}10` }}>
          <div style={iconBoxStyle(C.errorContainer)}>
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: 14, color: C.error }} />
          </div>
          <div style={{ flex: 1, fontFamily: pp, fontSize: 14, fontWeight: 600, color: C.error }}>
            {t.logout}
          </div>
        </Ripple>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AndroidChildView — Main component
// ════════════════════════════════════════════════════════════════════════════
export default function AndroidChildView({
  data,
  language,
  currency = '€',
  onCompleteMission,
  onLogout,
  onTutorialComplete,
  onSetPrimaryGoal,
  soundEnabled,
  onRequestGift,
  onRequestMission,
  onPurchaseGoal,
}: AndroidChildViewProps) {
  const [tab, setTab] = useState<Tab>('home');
  const [isDark, setIsDark] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; action?: { label: string; fn: () => void } } | null>(null);
  const snackTimer = useRef<ReturnType<typeof setTimeout>>();
  const C = isDark ? M3.dark : M3.light;
  const isHome = tab === 'home';

  // System dark mode detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const showSnack = useCallback((msg: string, action?: { label: string; fn: () => void }) => {
    clearTimeout(snackTimer.current);
    setSnack(null);
    setTimeout(() => setSnack({ msg, action }), 20);
    snackTimer.current = setTimeout(() => setSnack(null), 3000);
  }, []);

  const handleComplete = useCallback((missionId: string) => {
    onCompleteMission(missionId);
    const m = data.missions.find(ms => ms.id === missionId);
    if (m) {
      showSnack((T[language] || T.fr).missionDone(m.reward.toFixed(2), currency));
    }
  }, [data.missions, onCompleteMission, language, currency, showSnack]);

  const handleRequestMission = useCallback(() => {
    onRequestMission?.();
    showSnack((T[language] || T.fr).requestSent);
  }, [onRequestMission, language, showSnack]);

  const handleRequestGift = useCallback(() => {
    onRequestGift?.();
    showSnack((T[language] || T.fr).goalSent);
  }, [onRequestGift, language, showSnack]);

  const pendingCount = data.missions.filter(m => m.status === 'PENDING').length;
  const badges = deriveBadges(data);

  // Determine background gradient for home tab
  const bgStyle: React.CSSProperties = isHome
    ? {
        background: `linear-gradient(180deg,#4338CA 0%,#5B5FE8 32%,#6366F1 38%,${C.background} 38%)`,
      }
    : {
        background: C.background,
      };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...bgStyle,
      position: 'relative',
      transition: `background 0.4s ${EASING.standard}`,
    }}>
      {/* Top App Bar */}
      <ChildTopBar C={C} tab={tab} data={data} language={language} onLogout={onLogout} />

      {/* Scrollable content */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px',
          paddingBottom: 'calc(62px + env(safe-area-inset-bottom) + 16px)',
          position: 'relative',
        }}
      >
        {tab === 'home' && (
          <HomeScreen
            C={C}
            data={data}
            language={language}
            currency={currency}
            isDark={isDark}
            onComplete={handleComplete}
            onRequestGift={handleRequestGift}
          />
        )}
        {tab === 'missions' && (
          <MissionsScreen
            C={C}
            data={data}
            language={language}
            currency={currency}
            onComplete={handleComplete}
            onRequestMission={handleRequestMission}
          />
        )}
        {tab === 'history' && (
          <HistoryScreen
            C={C}
            data={data}
            language={language}
            currency={currency}
          />
        )}
        {/* Snackbar */}
        {snack && <Snackbar C={C} msg={snack.msg} action={snack.action} />}
      </div>

      {/* Bottom Navigation */}
      <ChildBottomNav
        C={C}
        active={tab}
        onChange={setTab}
        pendingMissions={pendingCount}
        language={language}
      />
    </div>
  );
}
