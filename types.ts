
export type MissionStatus = 'ACTIVE' | 'PENDING' | 'COMPLETED';
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
  updatedAt?: string;
}

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
  updatedAt: new Date().toISOString()
};

export const getDemoData = (language: Language = 'fr'): GlobalState => {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);

  const fmt = (d: Date) => d.toLocaleDateString(language === 'fr' ? 'fr-FR' : (language === 'nl' ? 'nl-NL' : 'en-US'), { day: '2-digit', month: '2-digit' });

  return {
    parentTutorialSeen: true,
    language: language,
    parentPin: '0000', // Code PIN simple pour la démo
    soundEnabled: true,
    parentBadge: 'EXPERT',
    totalApprovedMissions: 15,
    maxBalance: 100,
    updatedAt: now.toISOString(),
    children: [
      {
        id: 'demo-child-1',
        name: 'Léo',
        avatar: 'Felix',
        colorClass: 'indigo',
        balance: 14.50,
        tutorialSeen: false,
        giftRequested: false,
        missionRequested: false,
        goals: [
          { id: 'dg1', name: 'Lego Star Wars', target: 30, icon: 'fa-solid fa-rocket' }
        ],
        missions: [
          { id: 'dm1', title: language === 'fr' ? 'Ranger la chambre' : (language === 'nl' ? 'Kamer opruimen' : 'Clean room'), reward: 2, icon: 'fa-solid fa-broom', status: 'PENDING', createdAt: yesterday.toISOString() },
          { id: 'dm2', title: language === 'fr' ? 'Sortir les poubelles' : (language === 'nl' ? 'Vuilnis buiten zetten' : 'Take out trash'), reward: 1, icon: 'fa-solid fa-trash', status: 'ACTIVE', createdAt: now.toISOString() }
        ],
        history: [
          { id: 'dh1', date: fmt(yesterday), title: language === 'fr' ? 'Missions semaine' : 'Missions', amount: 4 },
          { id: 'dh2', date: fmt(lastWeek), title: language === 'fr' ? 'Cadeau Mamie' : 'Gift', amount: 10 }
        ]
      },
      {
        id: 'demo-child-2',
        name: 'Emma',
        avatar: 'Zoe',
        colorClass: 'pink',
        balance: 45.00,
        tutorialSeen: true,
        giftRequested: true,
        missionRequested: false,
        goals: [
          { id: 'dg2', name: language === 'fr' ? 'Vélo' : (language === 'nl' ? 'Fiets' : 'Bike'), target: 120, icon: 'fa-solid fa-bicycle' }
        ],
        missions: [],
        history: [
          { id: 'dh3', date: fmt(yesterday), title: language === 'fr' ? 'Anniversaire' : 'Birthday', amount: 20 }
        ]
      }
    ]
  };
};
