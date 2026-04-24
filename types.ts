
export type MissionStatus = 'ACTIVE' | 'PENDING' | 'COMPLETED';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type Language = 'fr' | 'nl' | 'en';

export type ParentBadge = 'NOVICE' | 'MENTOR' | 'EXPERT' | 'FINTECH_GURU';

// Business Rules
export const MAX_BALANCE = 100; // Limite stricte pour la tranche 6-14 ans

export const BADGE_THRESHOLDS = {
  MENTOR: 10,
  EXPERT: 50,
  FINTECH_GURU: 200
};

export interface Mission {
  id: string;
  title: string;
  reward: number;
  icon: string;
  status: MissionStatus;
  feedback?: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  amount: number;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  icon: string;
  status?: GoalStatus;
}

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  colorClass: string;
  balance: number;
  goals: Goal[];
  missions: Mission[];
  history: HistoryEntry[];
  tutorialSeen: boolean;
  birthday?: string;
  lastBirthdayRewardYear?: number;
  giftRequested?: boolean;
  missionRequested?: boolean;
}

export interface GlobalState {
  children: ChildProfile[];
  parentTutorialSeen: boolean;
  language: Language;
  parentPin: string | null;
  ownerId?: string;
  soundEnabled: boolean;
  notificationsEnabled?: boolean;
  lastParentLogin?: string;
  parentBadge?: ParentBadge;
  totalApprovedMissions?: number;
  lastReminderSent?: string;
  maxBalance?: number;
  isPremium?: boolean;
  currency?: string;
  updatedAt?: string;
}

export const CURRENCIES: { symbol: string; code: string }[] = [
  { symbol: '€',    code: 'EUR' },
  { symbol: '$',    code: 'USD' },
  { symbol: '£',    code: 'GBP' },
  { symbol: 'CHF',  code: 'CHF' },
  { symbol: 'CA$',  code: 'CAD' },
  { symbol: 'A$',   code: 'AUD' },
  { symbol: 'S$',   code: 'SGD' },
  { symbol: 'HK$',  code: 'HKD' },
  { symbol: 'NZ$',  code: 'NZD' },
  { symbol: '¥',    code: 'JPY' },
  { symbol: '₹',    code: 'INR' },
  { symbol: '₺',    code: 'TRY' },
  { symbol: '₩',    code: 'KRW' },
  { symbol: 'R$',   code: 'BRL' },
  { symbol: 'kr',   code: 'SEK' },
  { symbol: 'kr',   code: 'NOK' },
  { symbol: 'kr',   code: 'DKK' },
  { symbol: 'zł',   code: 'PLN' },
  { symbol: 'R',    code: 'ZAR' },
  { symbol: 'د.م.', code: 'MAD' },
  { symbol: 'د.إ',  code: 'AED' },
  { symbol: 'Ft',   code: 'HUF' },
  { symbol: 'Kč',   code: 'CZK' },
];

const getBrowserLanguage = (): Language => {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.split('-')[0];
    if (lang === 'nl') return 'nl';
    if (lang === 'en') return 'en';
    return 'fr';
  }
  return 'fr';
};

export const INITIAL_DATA: GlobalState = {
  parentTutorialSeen: false,
  language: getBrowserLanguage(),
  parentPin: null,
  children: [],
  soundEnabled: true,
  parentBadge: 'NOVICE',
  totalApprovedMissions: 0,
  maxBalance: 100,
  currency: '€',
  updatedAt: new Date().toISOString()
};

export const getDemoData = (language: Language = 'fr'): GlobalState => {
  const now = new Date();
  const d = (daysAgo: number) => { const d = new Date(now); d.setDate(now.getDate() - daysAgo); return d; };
  const fmt = (date: Date) => date.toLocaleDateString(language === 'fr' ? 'fr-FR' : (language === 'nl' ? 'nl-NL' : 'en-US'), { day: '2-digit', month: '2-digit' });
  const fr = (fr: string, nl: string, en: string) => language === 'fr' ? fr : language === 'nl' ? nl : en;

  return {
    parentTutorialSeen: true,
    language,
    parentPin: '73df605645ebf3aca750aa13c079f9ee:bf375d4b25c1ccd172d6efe41753c6b6965e472c9acf88bea88b08f917afdac1d1ebbfc3181669f80ace18e3bad0cb52dea1e613ec555b4bb2692b869801c4e1', // PIN "0000"
    soundEnabled: true,
    parentBadge: 'EXPERT',
    totalApprovedMissions: 24,
    maxBalance: 100,
    currency: '€',
    isPremium: true,
    updatedAt: now.toISOString(),
    children: [
      {
        id: 'demo-child-1',
        name: 'Léo',
        avatar: 'Felix',
        colorClass: 'indigo',
        balance: 22.50,
        birthday: '2016-03-12',
        tutorialSeen: true,
        giftRequested: false,
        missionRequested: true,
        goals: [
          { id: 'dg1', name: 'Lego Technic', target: 35, icon: 'fa-solid fa-rocket', status: 'ACTIVE' }
        ],
        missions: [
          { id: 'dm1', title: fr('Ranger la chambre', 'Kamer opruimen', 'Clean room'), reward: 2, icon: 'fa-solid fa-broom', status: 'PENDING', createdAt: d(1).toISOString() },
          { id: 'dm2', title: fr('Sortir les poubelles', 'Vuilnis buiten zetten', 'Take out trash'), reward: 1, icon: 'fa-solid fa-trash', status: 'ACTIVE', createdAt: now.toISOString() },
          { id: 'dm3', title: fr('Lecture 20 min', '20 min lezen', 'Read 20 min'), reward: 1.50, icon: 'fa-solid fa-book', status: 'ACTIVE', createdAt: d(2).toISOString() }
        ],
        history: [
          { id: 'dh1', date: fmt(d(1)), title: fr('Missions de la semaine', 'Missies van de week', 'Weekly missions'), amount: 5.50 },
          { id: 'dh2', date: fmt(d(4)), title: fr('Aide aux devoirs', 'Huiswerk hulp', 'Homework help'), amount: 3 },
          { id: 'dh3', date: fmt(d(7)), title: fr('Cadeau Mamie', 'Cadeau Oma', 'Gift from grandma'), amount: 10 },
          { id: 'dh4', date: fmt(d(10)), title: fr('Achat — Pokémon', 'Aankoop — Pokémon', 'Purchase — Pokémon'), amount: -8 },
          { id: 'dh5', date: fmt(d(14)), title: fr('Missions quinzaine', 'Missies twee weken', 'Biweekly missions'), amount: 7 }
        ]
      },
      {
        id: 'demo-child-2',
        name: 'Emma',
        avatar: 'Zoe',
        colorClass: 'pink',
        balance: 47.00,
        birthday: '2014-07-25',
        tutorialSeen: true,
        giftRequested: true,
        missionRequested: false,
        goals: [
          { id: 'dg2', name: fr('Nouveau vélo', 'Nieuwe fiets', 'New bike'), target: 80, icon: 'fa-solid fa-bicycle', status: 'ACTIVE' },
          { id: 'dg3', name: fr('Rollers', 'Skeelers', 'Rollerblades'), target: 35, icon: 'fa-solid fa-star', status: 'ACTIVE' }
        ],
        missions: [
          { id: 'dm4', title: fr('Mettre la table', 'Tafel dekken', 'Set the table'), reward: 0.50, icon: 'fa-solid fa-utensils', status: 'ACTIVE', createdAt: now.toISOString() },
          { id: 'dm5', title: fr('Promener le chien', 'Hond uitlaten', 'Walk the dog'), reward: 2, icon: 'fa-solid fa-paw', status: 'ACTIVE', createdAt: d(1).toISOString() }
        ],
        history: [
          { id: 'dh6', date: fmt(d(1)), title: fr('Anniversaire Papa', 'Verjaardag Papa', "Dad's birthday"), amount: 20 },
          { id: 'dh7', date: fmt(d(5)), title: fr('Missions semaine', 'Missies week', 'Weekly missions'), amount: 6 },
          { id: 'dh8', date: fmt(d(8)), title: fr('Achat — Livre', 'Aankoop — Boek', 'Purchase — Book'), amount: -12 },
          { id: 'dh9', date: fmt(d(12)), title: fr('Aide jardinage', 'Tuinieren', 'Garden help'), amount: 5 },
          { id: 'dh10', date: fmt(d(20)), title: fr('Missions quinzaine', 'Missies twee weken', 'Biweekly missions'), amount: 8 }
        ]
      }
    ]
  };
};
