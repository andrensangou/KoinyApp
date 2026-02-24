
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GlobalState, Language, ChildProfile, Goal, ParentBadge } from '../types';
import TutorialOverlay, { TutorialStep } from './TutorialOverlay';
import { BottomNavigation } from './BottomNavigation';
import { translations } from '../i18n';
import { getSupabase } from '../services/supabase';
import { loadParentPinLocally } from '../services/pinStorage';
import HelpModal from './HelpModal';
import ConfirmDialog from './ConfirmDialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import confetti from 'canvas-confetti';
import { notifications } from '../services/notifications';
import { getIcon } from '../constants/icons';
import { checkBiometricAvailability, authenticateWithBiometric, getBiometricLabel, getBiometricIcon } from '../services/biometric';

interface ParentViewProps {
  data: GlobalState;
  ownerId?: string;
  language: Language;
  onApprove: (childId: string, missionId: string, note?: string) => void;
  onReject: (childId: string, missionId: string, note?: string) => void;
  onAddMission: (childId: string, title: string, amount: number) => void;
  onDeleteActiveMission: (childId: string, missionId: string) => void;
  onManualTransaction: (childId: string, amount: number, reason: string) => void;
  onAddChild: (child: Omit<ChildProfile, 'id' | 'missions' | 'history' | 'tutorialSeen' | 'balance'>) => void;
  onEditChild: (childId: string, updates: Partial<ChildProfile>) => void;
  onDeleteChild: (childId: string) => void;
  onSetPin: (pin: string) => void;
  onClearHistory: (childId: string) => void;
  onUpdatePassword: (pass: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onExit: () => void;
  onTutorialComplete: () => void;
  notificationData?: { childName: string, goalName?: string } | null;
  clearNotification?: () => void;
  onToggleSound: (enabled: boolean) => void;
  onSetLanguage: (lang: Language) => void;
  onUpdateMaxBalance?: (limit: number) => void;
  notificationAction?: { type: string; childId: string } | null;
  onClearNotificationAction?: () => void;
  onSignOut: () => Promise<void>;
  onDeleteGoal?: (childId: string, goalId: string) => void;
  onArchiveGoal?: (childId: string, goalId: string) => void;
}

type ActionType = 'APPROVE' | 'REJECT' | null;
type WithdrawSubtype = 'PURCHASE' | 'PENALTY';
type SettingsTab = 'FAMILY' | 'ACCOUNT';
type GoalsFilter = 'ALL' | 'READY' | 'ONGOING';
type HistoryFilter = 'THIS_MONTH' | 'ALL';

const AVAILABLE_SEEDS = [
  'Milo', 'Kiki', 'Jasper', 'Sasha',
  'Leo', 'Mia', 'Felix', 'Zoe',
  'Sam', 'Lily', 'Kai', 'Ruby',
  'Oliver', 'Chloe', 'Noah', 'Ava',
  'Léo', 'Ines', 'Gaspard', 'Cleo'
];

const AVAILABLE_COLORS = [
  'indigo', 'pink', 'emerald', 'amber', 'blue',
  'rose', 'purple', 'cyan', 'teal', 'orange'
];

const renderAvatar = (avatar: string, sizeClass: string = "w-full h-full", colorClass: string = "indigo") => {
  if (!avatar) return <i className="fa-solid fa-user text-slate-300"></i>;
  if (avatar.startsWith('fa-')) {
    return <i className={`${avatar} ${sizeClass.replace('w-', 'text-').replace('h-', 'text-')}`}></i>;
  }
  const src = avatar.startsWith('data:')
    ? avatar
    : `https://api.dicebear.com/9.x/lorelei/svg?seed=${avatar}`;

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-white shadow-md bg-gradient-to-br from-${colorClass}-100 to-${colorClass}-300 flex items-center justify-center p-0.5`}>
      <img src={src} alt="Avatar" className="w-full h-full object-contain scale-110 translate-y-1 drop-shadow-sm" />
    </div>
  );
};

const getBadgeInfo = (badge: ParentBadge = 'NOVICE', language: Language) => {
  const isFr = language === 'fr';
  switch (badge) {
    case 'NOVICE': return { label: isFr ? 'Débutant' : 'Beginner', icon: 'fa-seedling', color: 'text-emerald-500' };
    case 'MENTOR': return { label: isFr ? 'Mentor' : 'Mentor', icon: 'fa-graduation-cap', color: 'text-indigo-500' };
    case 'EXPERT': return { label: isFr ? 'Expert' : 'Expert', icon: 'fa-medal', color: 'text-amber-500' };
    case 'FINTECH_GURU': return { label: isFr ? 'Gourou' : 'Guru', icon: 'fa-crown', color: 'text-purple-600' };
    default: return { label: 'Novice', icon: 'fa-user', color: 'text-slate-400' };
  }
};

const isPenalty = (title: string) => {
  return title.toLowerCase().includes('amende') || title.toLowerCase().includes('penalty') || title.toLowerCase().includes('punition') || title.toLowerCase().includes('boete') || title.toLowerCase().includes('fine');
};

const isPurchase = (title: string) => {
  return title.toLowerCase().includes('retrait') || title.toLowerCase().includes('opname') || title.toLowerCase().includes('opnemen') ||
    title.toLowerCase().includes('achat') || title.toLowerCase().includes('purchase') || title.toLowerCase().includes('dépense') || title.toLowerCase().includes('aankoop');
};

const isGift = (title: string) => {
  return title.toLowerCase().includes('cadeau') || title.toLowerCase().includes('bonus') || title.toLowerCase().includes('gift');
};

const getTranslatedTitle = (title: string, language: Language) => {
  const parts = title.split(' : ');
  const category = parts[0];
  const reason = parts[1] ? ` : ${parts[1]}` : '';

  if (isPenalty(category)) return translations[language].parent.transactions.labels.penalty + reason;
  if (isPurchase(category)) return translations[language].parent.transactions.labels.purchase + reason;
  if (isGift(category)) return translations[language].parent.transactions.labels.deposit + reason;

  return title;
};

const ParentView: React.FC<ParentViewProps> = ({
  data, ownerId, language, onApprove, onReject, onAddMission, onDeleteActiveMission,
  onManualTransaction, onAddChild, onEditChild, onDeleteChild, onSetPin,
  onClearHistory, onUpdatePassword, onDeleteAccount,
  onExit, onTutorialComplete, onToggleSound, onSetLanguage, onUpdateMaxBalance,
  notificationAction, onClearNotificationAction, onSignOut, onDeleteGoal, onArchiveGoal
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedChildId, setSelectedChildId] = useState<string>(data.children && data.children.length > 0 ? data.children[0].id : '');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);
  const [withdrawSubtype, setWithdrawSubtype] = useState<WithdrawSubtype>('PURCHASE');
  const [transAmount, setTransAmount] = useState('');
  const [transReason, setTransReason] = useState('');

  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [note, setNote] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('FAMILY');
  const [settingsView, setSettingsView] = useState<'LIST' | 'FORM'>('LIST');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  /* NAV & TABS STATE */
  const [mainView, setMainView] = useState<'dashboard' | 'history' | 'requests' | 'profile'>('dashboard');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);



  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState(AVAILABLE_SEEDS[0]);
  const [formBirthday, setFormBirthday] = useState('');
  const [formColorClass, setFormColorClass] = useState(AVAILABLE_COLORS[0]);
  const [formGoals, setFormGoals] = useState<Goal[]>([]);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [localPin, setLocalPin] = useState<string | null>(null);

  // Charger le PIN local au démarrage
  useEffect(() => {
    const loadLocalPin = async () => {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const pin = await loadParentPinLocally(user.id);
            if (pin) {
              setLocalPin(pin);
              console.log('✅ [PARENT VIEW] PIN local chargé pour:', user.id);
            }
          }
        } catch (error) {
          console.error('❌ [PARENT VIEW] Erreur chargement PIN local:', error);
        }
      }
    };
    loadLocalPin();
  }, []);

  useEffect(() => {
    // Vérifier les permissions au chargement
    const checkPerms = async () => {
      const granted = await notifications.checkPermission();
      const isMuted = notifications.isMuted();
      console.log('[ParentView] Permissions notifications:', granted, 'Muted:', isMuted);
      setNotificationsAllowed(granted && !isMuted);
    };
    checkPerms();
  }, []);

  const [historyView, setHistoryView] = useState<'LIST' | 'CHART'>('LIST');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('THIS_MONTH');
  const [showHelp, setShowHelp] = useState(false);
  const [goalsFilter, setGoalsFilter] = useState<GoalsFilter>('ALL');

  const [triggerAddGoal, setTriggerAddGoal] = useState(false);

  // Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info' | 'success' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'info'
  });

  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'danger' | 'input';
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => { }
  });
  const [promptValue, setPromptValue] = useState('');

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' | 'warning' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  const openPrompt = (config: Omit<typeof promptConfig, 'isOpen'>) => {
    setPromptValue(config.defaultValue || '');
    setPromptConfig({ ...config, isOpen: true });
  };

  const missionFormRef = useRef<HTMLDivElement>(null);
  const t = translations[language];
  const activeChild = useMemo(() => data.children ? data.children.find(c => c.id === selectedChildId) : null, [data.children, selectedChildId]);

  // Sync Listeners
  useEffect(() => {
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => setIsSyncing(false);

    window.addEventListener('sync-success', handleSyncEnd);
    window.addEventListener('sync-error', handleSyncEnd);

    return () => {
      window.removeEventListener('sync-success', handleSyncEnd);
      window.removeEventListener('sync-error', handleSyncEnd);
    };
  }, []);

  const totalPendingCount = useMemo(() => {
    if (!data.children) return 0;
    return data.children.reduce((acc, child) => {
      const missionsCount = child.missions ? child.missions.filter(m => m.status === 'PENDING').length : 0;
      const giftCount = child.giftRequested ? 1 : 0;
      const missionReqCount = child.missionRequested ? 1 : 0;
      return acc + missionsCount + giftCount + missionReqCount;
    }, 0);
  }, [data.children]);

  const activeChildPendingCount = useMemo(() => {
    if (!activeChild) return 0;
    const missionsCount = activeChild.missions ? activeChild.missions.filter(m => m.status === 'PENDING').length : 0;
    const giftCount = activeChild.giftRequested ? 1 : 0;
    const missionReqCount = activeChild.missionRequested ? 1 : 0;
    return missionsCount + giftCount + missionReqCount;
  }, [activeChild]);

  const otherChildrenWithPending = useMemo(() => {
    return data.children.filter(c => {
      if (c.id === selectedChildId) return false;
      const missionsCount = c.missions ? c.missions.filter(m => m.status === 'PENDING').length : 0;
      return missionsCount > 0 || c.giftRequested || c.missionRequested;
    });
  }, [data.children, selectedChildId]);

  useEffect(() => {
    if (!selectedChildId && data.children && data.children.length > 0) {
      setSelectedChildId(data.children[0].id);
    }
  }, [data.children, selectedChildId]);

  const weeklySummary = useMemo(() => {
    if (!activeChild || !activeChild.history) return { income: 0, expense: 0, penalty: 0 };
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return activeChild.history.reduce((acc, item) => {
      const parts = item.date.split('/');
      const year = new Date().getFullYear();
      const entryDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));

      if (entryDate >= sevenDaysAgo) {
        if (item.amount < 0 && isPenalty(item.title)) {
          acc.penalty += Math.abs(item.amount);
        } else if (item.amount < 0) {
          acc.expense += Math.abs(item.amount);
        } else {
          acc.income += item.amount;
        }
      }
      return acc;
    }, { income: 0, expense: 0, penalty: 0 });
  }, [activeChild]);

  const filteredGoals = useMemo(() => {
    if (!activeChild || !activeChild.goals) return [];
    const balance = activeChild.balance;
    const goals = activeChild.goals.filter(g => g.status !== 'ARCHIVED');
    switch (goalsFilter) {
      case 'READY': return goals.filter(g => (balance >= g.target && g.status !== 'COMPLETED') || g.status === 'COMPLETED');
      case 'ONGOING': return goals.filter(g => balance < g.target && g.status !== 'COMPLETED');
      default: return goals;
    }
  }, [activeChild, goalsFilter]);

  const handlePinInput = (val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(cleanVal);
    // Vérifier le PIN local en priorité, sinon le PIN de Supabase
    const effectivePin = localPin || data.parentPin;
    const storedPin = effectivePin ? String(effectivePin).trim() : null;
    if (storedPin && cleanVal === storedPin) {
      setTimeout(() => {
        setIsAuthenticated(true);
        setPin('');
      }, 200);
    }
  };

  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const cleanNew = newPin.replace(/[^0-9]/g, '');
    const cleanConf = confirmPin.replace(/[^0-9]/g, '');
    if (cleanNew.length !== 4) {
      setPinError(t.parent.pinLengthError);
      return;
    }
    if (cleanNew !== cleanConf) {
      setPinError(t.parent.pinMismatch);
      return;
    }
    onSetPin(cleanNew);
    setIsAuthenticated(true);
  };

  const performPinReset = () => {
    onSetPin('');
    setPin('');
    setNewPin('');
    setConfirmPin('');
    setIsAuthenticated(false);
    setIsSettingsOpen(false);
    setTimeout(() => {
      openPrompt({
        title: t.parent.messages.pinResetSuccessTitle,
        message: t.parent.messages.pinResetSuccessMessage,
        type: 'success',
        onConfirm: () => { }
      });
    }, 500);
  };
  // Déclencheur automatique pour l'ajout d'objectif
  useEffect(() => {
    if (triggerAddGoal && settingsView === 'FORM') {
      handleAddGoalToForm();
      setTriggerAddGoal(false);
    }
  }, [triggerAddGoal, settingsView]);
  const handleResetPinWithPassword = () => {
    openPrompt({
      title: t.parent.messages.securityRequiredTitle,
      message: t.parent.messages.securityRequiredMessage,
      type: 'input',
      placeholder: t.auth.password,
      onConfirm: async (password) => {
        if (!password) return;

        // Demo Mode Bypass
        if (ownerId === 'demo') {
          performPinReset();
          return;
        }

        const supabase = getSupabase();
        if (!supabase) {
          performPinReset(); // Offline/No Supabase fallback
          return;
        }

        try {
          // Verify password by re-authenticating
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email) {
            const { error } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: password
            });

            if (error) {
              setTimeout(() => {
                openPrompt({
                  title: t.parent.messages.accessDeniedTitle,
                  message: t.parent.messages.accessDeniedMessage,
                  type: 'danger',
                  onConfirm: () => { }
                });
              }, 300);
            } else {
              performPinReset();
            }
          } else {
            // Fallback if no user (e.g. local only)
            performPinReset();
          }
        } catch (e) {
          console.error(e);
          performPinReset();
        }
      }
    });
  };

  const handleResetPinWithBiometric = async () => {
    const success = await authenticateWithBiometric(t.parent.messages.biometricReason);
    if (success) {
      performPinReset();
    } else {
      setTimeout(() => {
        openPrompt({
          title: t.parent.messages.accessDeniedTitle,
          message: t.parent.messages.biometricFailed,
          type: 'warning',
          onConfirm: () => { }
        });
      }, 300);
    }
  };

  const [biometricChoice, setBiometricChoice] = useState<{
    isOpen: boolean;
    label: string;
    icon: string;
  } | null>(null);

  const handleResetPin = async () => {
    // Demo Mode — skip security
    if (ownerId === 'demo') {
      performPinReset();
      return;
    }

    // Check if biometrics are available
    const biometric = await checkBiometricAvailability();

    if (biometric.isAvailable) {
      // Show choice dialog
      const label = getBiometricLabel(biometric.biometryType, language);
      const icon = getBiometricIcon(biometric.biometryType);
      setBiometricChoice({ isOpen: true, label, icon });
    } else {
      // No biometrics available — use password only
      handleResetPinWithPassword();
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAmount || !selectedChildId) return;
    onAddMission(selectedChildId, newTitle, parseFloat(newAmount));
    setNewTitle('');
    setNewAmount('');
  };

  const openActionModal = (id: string, type: ActionType) => {
    setSelectedMissionId(id);
    setActionType(type);
    setNote('');
  };

  const confirmAction = () => {
    if (!selectedMissionId || !actionType || !selectedChildId) return;
    if (actionType === 'APPROVE') {
      onApprove(selectedChildId, selectedMissionId, note);
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#10b981', '#34d399', '#ffffff']
        });
      }
    }
    else onReject(selectedChildId, selectedMissionId, note);
    setSelectedMissionId(null);
    setActionType(null);
    setNote('');
  };

  const applyTemplate = (title: string, amount: number) => {
    setNewTitle(title);
    setNewAmount(amount.toString());
    if ("vibrate" in navigator) navigator.vibrate(20);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionType || !selectedChildId || !transAmount) return;

    // Fermer le clavier proprement pour éviter l'effet de zoom iOS
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const amount = parseFloat(transAmount.replace(',', '.'));
    const currentMax = data.maxBalance === 0 ? Infinity : (data.maxBalance || 100);

    // Check limit for deposits
    if (transactionType === 'DEPOSIT' && activeChild) {
      if (activeChild.balance + amount > currentMax) {
        const msg = t.parent.history.limitReachedMessage.replace('{limit}', currentMax.toString());
        openConfirm(t.parent.history.limitReached, msg, () => { }, 'warning');
        return;
      }
    }

    const finalAmount = transactionType === 'DEPOSIT' ? amount : -amount;

    let categoryPrefix = "";
    if (transactionType === 'DEPOSIT') {
      categoryPrefix = t.parent.transactions.labels.deposit;
    } else {
      categoryPrefix = withdrawSubtype === 'PURCHASE'
        ? t.parent.transactions.labels.purchase
        : t.parent.transactions.labels.penalty;
    }

    const finalTitle = transReason ? `${categoryPrefix} : ${transReason}` : categoryPrefix;

    onManualTransaction(selectedChildId, finalAmount, finalTitle);
    setTransactionType(null);
    setTransAmount('');
    setTransReason('');
    setWithdrawSubtype('PURCHASE');
  };

  const [scrollToGoalsOnOpen, setScrollToGoalsOnOpen] = useState(false);
  const formGoalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsView === 'FORM' && scrollToGoalsOnOpen && formGoalsRef.current) {
      setTimeout(() => {
        formGoalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setScrollToGoalsOnOpen(false);
      }, 300); // Slight delay to ensure modal/form is rendered
    }
  }, [settingsView, scrollToGoalsOnOpen]);

  const startEditChild = useCallback((child: ChildProfile, jumpToGoals: boolean = false) => {
    setEditingChildId(child.id);
    setFormName(child.name);
    setFormAvatar(child.avatar);
    setFormBirthday(child.birthday || '');
    setFormColorClass(child.colorClass || AVAILABLE_COLORS[0]);
    setFormGoals(child.goals || []);
    setSettingsView('FORM');
    setIsSettingsOpen(true);
    setMainView('profile');
    setActiveTab('FAMILY');
    setScrollToGoalsOnOpen(jumpToGoals);

    if (child.giftRequested) {
      onEditChild(child.id, { giftRequested: false });
    }
  }, [onEditChild]);

  const startAddChild = useCallback(() => {
    setEditingChildId(null);
    setFormName('');
    setFormAvatar(AVAILABLE_SEEDS[0]);
    setFormBirthday('');
    setFormColorClass(AVAILABLE_COLORS[0]);
    setFormGoals([]);
    setSettingsView('FORM');
    setIsSettingsOpen(true);
    setMainView('profile');
    setActiveTab('FAMILY');
    setScrollToGoalsOnOpen(false);
  }, []);

  // Handle notification actions (e.g., open mission creation from notification click)
  useEffect(() => {
    if (!notificationAction?.childId || !data.children) return;

    const child = data.children.find(c => c.id === notificationAction.childId);
    if (!child) return;

    if (notificationAction.type === 'GIFT') {
      console.log('🔔 [PARENT VIEW] Opening gift configuration');
      setTimeout(() => {
        setSelectedChildId(child.id);
        startEditChild(child);
        setTimeout(() => {
          setTriggerAddGoal(true);
          setTimeout(() => {
            formGoalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }, 300);
      }, 200);
      onClearNotificationAction?.();
    }
    else if (notificationAction.type === 'MISSION' || notificationAction.type === 'MISSION_COMPLETE') {
      console.log('🔔 [PARENT VIEW] Opening requests tab');
      setTimeout(() => {
        setSelectedChildId(child.id);
        setMainView('requests');
      }, 200);
      onClearNotificationAction?.();
    }
  }, [notificationAction, data.children, onEditChild, onClearNotificationAction, startEditChild]);

  const startAddGoal = () => {
    if (activeChild) {
      startEditChild(activeChild, true);
    }
  };

  const saveChildForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;
    const childData = {
      name: formName,
      goals: formGoals,
      avatar: formAvatar,
      colorClass: formColorClass,
      birthday: formBirthday || undefined,
      giftRequested: false,
      missionRequested: false
    };
    if (editingChildId) onEditChild(editingChildId, childData);
    else onAddChild(childData);
    setSettingsView('LIST');
    if (!data.children || data.children.length === 0) {
      setIsSettingsOpen(false);
    }
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    setFormGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const handleRemoveGoal = (id: string) => {
    // Si on est en mode édition et que l'ID est un UUID, on demande la suppression directe
    if (editingChildId && id.includes('-')) {
      onDeleteGoal?.(editingChildId, id);
    }
    setFormGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleAddGoalToForm = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      name: '',
      target: 0,
      icon: getIcon('gift')
    };
    setFormGoals(prev => [...prev, newGoal]);
  };

  const filteredHistory = useMemo(() => {
    if (!activeChild || !activeChild.history) return [];
    if (historyFilter === 'ALL') return activeChild.history;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    return activeChild.history.filter(item => {
      const cleanDate = item.date.trim();
      const parts = cleanDate.split('/');
      if (parts.length < 2) return false;

      const entryMonth = parseInt(parts[1], 10);
      const entryYear = parts.length >= 3 ? parseInt(parts[2], 10) : currentYear;

      return entryMonth === currentMonth && entryYear === currentYear;
    });
  }, [activeChild, historyFilter]);

  const chartData = useMemo(() => {
    if (!activeChild || !activeChild.history) return [];

    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const monthsNl = ['jan.', 'feb.', 'maa.', 'apr.', 'mei', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = language === 'fr' ? monthsFr : language === 'nl' ? monthsNl : monthsEn;

    const result: any[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const year = d.getFullYear();
      const mLabel = months[mIdx];

      const monthlyEntries = activeChild.history.filter(item => {
        const parts = item.date.trim().split('/');
        if (parts.length < 2) return false;
        const entryMonth = parseInt(parts[1], 10);
        const entryYear = parts.length >= 3 ? parseInt(parts[2], 10) : now.getFullYear();
        return entryMonth === mIdx + 1 && entryYear === year;
      });

      let gains = 0;
      let expenses = 0;
      let penalties = 0;

      monthlyEntries.forEach(e => {
        if (e.amount < 0 && isPenalty(e.title)) penalties += Math.abs(e.amount);
        else if (e.amount < 0) expenses += Math.abs(e.amount);
        else gains += e.amount;
      });

      result.push({ name: mLabel, Gains: gains, Dépenses: expenses, Amendes: penalties });
    }
    return result;
  }, [activeChild, language]);

  const hasAnyHistory = useMemo(() => {
    return activeChild && activeChild.history && activeChild.history.length > 0;
  }, [activeChild]);

  if (!isAuthenticated) {
    // Utiliser le PIN local si disponible, sinon le PIN de Supabase
    const effectivePin = localPin || data.parentPin;
    const isPinSetup = !effectivePin || String(effectivePin).trim().length === 0;
    return (
      <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative">
        {/* Background Atmosphere */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

        {isPinSetup ? (
          <div className="w-full max-w-sm z-10 animate-fade-in-up">
            <div className="flex justify-center mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-indigo-700/5 rounded-[2.5rem] flex items-center justify-center border border-indigo-500/30 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.4)] backdrop-blur-xl group">
                <i className="fa-solid fa-lock-hashtag text-5xl text-indigo-400 group-hover:scale-110 transition-transform duration-500"></i>
              </div>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{t.parent.createPinTitle}</h2>
              <p className="text-slate-400 font-bold px-4">{t.parent.createPinDesc}</p>
            </div>

            <form onSubmit={handleCreatePin} className="space-y-8 bg-white/[0.03] backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.5)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400/80 uppercase mb-3 tracking-[0.2em] ml-1">{t.parent.definePin}</label>
                  <div className="relative group">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      className="w-full text-center text-3xl font-bold tracking-[0.8em] bg-black/40 border-2 border-white/5 rounded-3xl py-5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder:text-white/5 shadow-inner"
                      placeholder="••••"
                      required
                    />
                    <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none group-hover:border-white/10 transition-colors"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-400/80 uppercase mb-3 tracking-[0.2em] ml-1">{t.parent.confirmPin}</label>
                  <div className="relative group">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      className="w-full text-center text-3xl font-bold tracking-[0.8em] bg-black/40 border-2 border-white/5 rounded-3xl py-5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder:text-white/5 shadow-inner"
                      placeholder="••••"
                      required
                    />
                    <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none group-hover:border-white/10 transition-colors"></div>
                  </div>
                </div>
              </div>

              {pinError && (
                <div className="bg-red-500/10 border border-red-500/20 py-3 px-4 rounded-2xl animate-shake">
                  <p className="text-red-400 text-xs text-center font-black uppercase tracking-widest leading-none flex items-center justify-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-sm"></i>
                    {pinError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-active:duration-200"></div>
                <div className="relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black py-5 rounded-3xl group-hover:from-emerald-400 group-hover:to-emerald-500 group-active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3">
                  <span className="tracking-widest uppercase text-sm">{t.common.save}</span>
                  <i className="fa-solid fa-arrow-right-long animate-bounce-x"></i>
                </div>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in-up w-full max-w-[340px] mx-auto py-8 z-10">
            <div className="relative mb-10">
              <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="w-24 h-24 bg-white/[0.05] backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl relative">
                <i className="fa-solid fa-user-lock text-4xl text-emerald-400"></i>
              </div>
            </div>

            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{t.parent.accessTitle}</h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">{t.parent.enterPin}</p>
            </div>

            {/* Custom PIN Display - Re-styled for Premium Feel */}
            <div className="flex justify-center gap-4 mb-16 px-4 py-6 bg-black/20 rounded-[2.5rem] border border-white/5 shadow-inner">
              {[0, 1, 2, 3].map(i => {
                const isActive = pin.length > i;
                return (
                  <div key={i} className={`w-14 h-18 rounded-2xl flex items-center justify-center transition-all duration-500 transform relative ${isActive ? 'scale-110' : 'scale-100'}`}>
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${isActive ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 'bg-white/5 border border-white/10'}`}></div>
                    {isActive ? (
                      <div className="w-4 h-4 bg-white rounded-full animate-pop-in relative z-10 shadow-sm"></div>
                    ) : (
                      <div className="w-2 h-2 bg-slate-700 rounded-full relative z-10"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Keypad - Premium Glass Buttons */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-[320px] mb-12">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinInput(pin + num)}
                  className="w-18 h-18 rounded-3xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-indigo-500 text-white transition-all flex items-center justify-center text-3xl font-black border border-white/10 active:scale-90 shadow-xl"
                >
                  {num}
                </button>
              ))}
              <div className="flex items-center justify-center">
                <button onClick={onExit} aria-label={language === 'fr' ? 'Retour' : 'Back'} className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                  <i className="fa-solid fa-chevron-left text-xl" aria-hidden="true"></i>
                </button>
              </div>
              <button
                type="button"
                onClick={() => handlePinInput(pin + '0')}
                className="w-18 h-18 rounded-3xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-indigo-500 text-white transition-all flex items-center justify-center text-3xl font-black border border-white/10 active:scale-90 shadow-xl"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handlePinInput(pin.slice(0, -1))}
                className="w-18 h-18 rounded-3xl flex items-center justify-center text-2xl hover:bg-white/5 active:scale-90 transition-all text-slate-500"
              >
                <i className="fa-solid fa-delete-left"></i>
              </button>
            </div>

            <div className="flex flex-col items-center gap-8 w-full">
              {(ownerId === 'demo' || !ownerId) && data.parentPin === '0000' && (
                <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-400/10 px-6 py-3 rounded-full border border-emerald-400/20 flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb text-sm"></i>
                    {t.parent.demoHint}
                  </p>
                </div>
              )}

              {pin.length === 4 && pin !== String(data.parentPin).trim() && (
                <div className="flex flex-col items-center gap-5 animate-shake">
                  <div className="bg-red-500/10 px-6 py-3 rounded-full border border-red-500/20">
                    <p className="text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-circle-xmark"></i>{t.parent.incorrectCode}
                    </p>
                  </div>
                  <button onClick={handleResetPin} className="text-[10px] text-slate-500 hover:text-indigo-400 font-bold uppercase tracking-widest transition-colors underline decoration-slate-800 underline-offset-8 relative z-50 cursor-pointer p-2">
                    {t.parent.forgotPinAction}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmLabel={t.common.confirm}
          cancelLabel={t.common.cancel}
        />
        {promptConfig.isOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xl animate-fade-in" onClick={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}></div>
            <div className="bg-white/90 dark:bg-slate-900/80 w-full max-w-sm rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] p-8 relative z-10 animate-scale-in border border-white dark:border-white/10 overflow-hidden group">
              <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${promptConfig.type === 'success' ? 'from-emerald-400 to-emerald-600' : promptConfig.type === 'danger' || promptConfig.type === 'warning' ? 'from-rose-400 to-rose-600' : 'from-indigo-400 to-indigo-600'} opacity-50`}></div>
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl mb-8 shadow-inner border border-white/50 dark:border-white/5 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 ${promptConfig.type === 'success' ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-500' : promptConfig.type === 'warning' || promptConfig.type === 'danger' ? 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-500' : 'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-500'}`}>
                  <i className={`fa-solid ${promptConfig.type === 'success' ? 'fa-check-circle' : promptConfig.type === 'warning' || promptConfig.type === 'danger' ? 'fa-triangle-exclamation' : promptConfig.type === 'input' ? 'fa-pen-to-square' : 'fa-circle-info'}`}></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight leading-tight uppercase">{promptConfig.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-10 leading-relaxed px-2">{promptConfig.message}</p>
                {promptConfig.type === 'input' && (
                  <div className="w-full mb-10 relative group/input">
                    <input autoFocus type="password" value={promptValue} onChange={(e) => setPromptValue(e.target.value)} placeholder={promptConfig.placeholder || '...'} className="w-full p-5 bg-black/5 dark:bg-black/40 border-2 border-white/10 dark:border-white/5 rounded-3xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-900 dark:text-white font-black transition-all text-center placeholder:opacity-30 shadow-inner text-xl tracking-widest" />
                  </div>
                )}
                <div className="flex gap-4 w-full">
                  {promptConfig.type === 'input' && (
                    <button onClick={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-4 px-4 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px] active:scale-95 border border-transparent hover:border-slate-300 dark:hover:border-slate-600">{t.common.cancel}</button>
                  )}
                  <button onClick={() => { promptConfig.onConfirm(promptValue); setPromptConfig(prev => ({ ...prev, isOpen: false })); }} className={`flex-1 py-4 px-6 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-xl active:scale-95 ${promptConfig.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)]'}`}>{promptConfig.type === 'input' ? t.common.confirm : t.common.close}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }



  const badgeInfo = getBadgeInfo(data.parentBadge, language);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans pb-10 relative text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Floating Header Premium */}
      {/* Unified Header for Dashboard & Other Views */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${mainView !== 'dashboard' ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800' : 'pointer-events-none safe-pt'}`}>
        <div className={`max-w-7xl mx-auto px-4 ${mainView !== 'dashboard' ? 'py-2 safe-pt pb-2' : 'py-4'} flex justify-between items-center gap-4`}>
          {/* Left: Premium Button */}
          <button
            onClick={() => openPrompt({ title: t.parent.messages.premiumSoonTitle, message: t.parent.messages.premiumSoonMessage, type: 'info', onConfirm: () => { } })}
            className={`flex items-center justify-center bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl w-12 h-12 rounded-2xl shadow-lg border border-white/20 dark:border-white/10 pointer-events-auto active:scale-95 transition-transform group shrink-0 ${mainView !== 'dashboard' ? 'w-10 h-10 rounded-xl shadow-sm' : ''}`}
          >
            <div className={`w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-orange-200 dark:shadow-none shadow-lg group-hover:scale-110 transition-transform ${mainView !== 'dashboard' ? 'text-sm' : 'text-xl'}`}>
              <i className="fa-solid fa-crown"></i>
            </div>
          </button>

          {/* Center: Child Selector (Compact for non-dashboard) */}
          {mainView !== 'dashboard' && (
            <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2 justify-center pointer-events-auto">
              {data.children && data.children.map(child => {
                const totalIconPending = (child.missions?.filter(m => m.status === 'PENDING').length || 0) + (child.giftRequested ? 1 : 0) + (child.missionRequested ? 1 : 0);
                const isSelected = selectedChildId === child.id;
                return (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all whitespace-nowrap border ${isSelected ? `bg-${child.colorClass}-100 dark:bg-${child.colorClass}-900/30 border-${child.colorClass}-200 dark:border-${child.colorClass}-800` : 'bg-transparent border-transparent opacity-60 grayscale'}`}
                  >
                    <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${isSelected ? `border-${child.colorClass}-500` : 'border-slate-200'}`}>
                      {renderAvatar(child.avatar, "w-full h-full", child.colorClass)}
                    </div>
                    {isSelected && <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-tight">{child.name}</span>}
                    {totalIconPending > 0 && (
                      <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {totalIconPending}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: Power Button */}
          <div className="flex items-center gap-2 pointer-events-auto shrink-0">
            <button onClick={onExit} aria-label={language === 'fr' ? 'Déconnexion' : 'Logout'} className={`bg-rose-500 text-white flex items-center justify-center rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-90 ${mainView !== 'dashboard' ? 'w-10 h-10 rounded-xl shadow-sm' : 'w-12 h-12'}`}>
              <i className={`fa-solid fa-power-off ${mainView !== 'dashboard' ? 'text-sm' : 'text-lg'}`} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section (Dashboard Only) */}
      {mainView === 'dashboard' && (
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 pt-32 pb-12 px-6 relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mt-64 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/20 rounded-full -ml-32 -mb-32 blur-2xl"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-8 bg-black/10 dark:bg-black/30 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/20 ring-1 ring-white/10">
                  <i className="fa-solid fa-chart-pie text-2xl text-white"></i>
                </div>
                <div>
                  <h2 className="text-white text-lg font-black tracking-tight">{t.parent.dashboard.weeklyBilling}</h2>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest opacity-80">{language === 'fr' ? 'Sept derniers jours' : 'Last seven days'}</p>
                </div>
              </div>

              <div className="flex gap-10 sm:gap-14">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-60">{t.parent.history.income}</span>
                  <span className="text-xl font-black text-emerald-400">+{weeklySummary.income.toFixed(2)}€</span>
                </div>
                <div className="h-10 w-px bg-white/10 self-center"></div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-60">{language === 'fr' ? 'Sorties' : 'Outcome'}</span>
                  <span className="text-xl font-black text-rose-300">-{weeklySummary.expense.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standard Child Selector (Dashboard Only) */}
      {mainView === 'dashboard' && (
        <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 sm:top-24 z-30 pt-4 pb-4 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-6 overflow-x-auto no-scrollbar flex gap-4 scroll-smooth">
            {data.children && data.children.length > 0 ? data.children.map(child => {
              const childPending = child.missions ? child.missions.filter(m => m.status === 'PENDING').length : 0;
              const childGiftPending = child.giftRequested ? 1 : 0;
              const childMissionPending = child.missionRequested ? 1 : 0;
              const totalIconPending = childPending + childGiftPending + childMissionPending;
              const isSelected = selectedChildId === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap relative border-2 ${isSelected ? `bg-${child.colorClass}-600 border-${child.colorClass}-600 text-white shadow-xl shadow-${child.colorClass}-200 dark:shadow-none -translate-y-1` : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                >
                  <div className={`w-9 h-9 rounded-full overflow-hidden ${isSelected ? 'ring-2 ring-white/50' : 'opacity-60 dark:opacity-40 grayscale-[50%]'}`}>
                    {renderAvatar(child.avatar, "w-full h-full", child.colorClass)}
                  </div>
                  <span className="tracking-tight">{child.name}</span>
                  {totalIconPending > 0 && (
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black shadow-sm ${isSelected ? 'bg-white text-red-500' : 'bg-red-500 text-white dark:border dark:border-slate-900'}`}>
                      {totalIconPending}
                    </span>
                  )}
                </button>
              );
            }) : (
              <p className="text-slate-400 text-xs font-bold italic py-2">{t.parent.dashboard.emptyProfilesHint}</p>
            )}
          </div>
        </div>
      )}


      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 pb-32">
        {activeChild ? (
          <div className="animate-fade-in-up">
            {mainView === 'dashboard' && <div className="space-y-8">
              <section className={`relative bg-gradient-to-br from-${activeChild.colorClass}-600 to-${activeChild.colorClass}-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-${activeChild.colorClass}-200 overflow-hidden transform transition-all hover:scale-[1.01]`}>
                {/* SVG Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <path d="M0 200C100 150 200 250 400 200V0H0V200Z" fill="white" />
                    <path d="M0 100C150 50 250 150 400 100V0H0V100Z" fill="white" opacity="0.5" />
                  </svg>
                </div>

                <div className="flex justify-between items-start relative z-10 mb-8">
                  <div className="space-y-1">
                    <p className="opacity-60 text-[10px] font-black uppercase tracking-[0.2em]">{t.parent.childBalance}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter tabular-nums leading-none">
                        {activeChild.balance.toFixed(2)}
                      </span>
                      <span className="text-2xl font-black opacity-40">€</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setTransactionType('DEPOSIT')} aria-label={language === 'fr' ? 'Ajouter de l\'argent' : 'Add money'} className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-90 border border-white/10">
                      <i className="fa-solid fa-plus text-xl" aria-hidden="true"></i>
                    </button>
                    <button onClick={() => { setTransactionType('WITHDRAW'); setWithdrawSubtype('PURCHASE'); }} aria-label={language === 'fr' ? 'Retirer de l\'argent' : 'Withdraw money'} className="w-12 h-12 rounded-2xl bg-black/20 hover:bg-black/30 flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-90 border border-white/5">
                      <i className="fa-solid fa-minus text-xl" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>

                {/* Liquid Progress Bar iOS Style - CONDITIONAL RENDERING */}
                {activeChild.goals && activeChild.goals.length > 0 ? (
                  <div className="relative z-10 pt-4 mt-auto">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{t.parent.childGoal}</span>
                        <span className="text-sm font-black tracking-tight">{activeChild.goals[0].name}</span>
                      </div>
                      <span className="text-[10px] font-black opacity-60">
                        {Math.min(100, Math.round((activeChild.balance / activeChild.goals[0].target) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{ width: `${Math.min(100, (activeChild.balance / activeChild.goals[0].target) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 pt-4 mt-auto opacity-0 pointer-events-none" aria-hidden="true">
                    <div className="h-10"></div>
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest ml-1">
                    {t.parent.childGoalsTitle}
                  </h2>
                  <div className="bg-white p-1 rounded-2xl flex gap-1 shadow-sm border border-slate-100 w-full sm:w-auto">
                    <button
                      onClick={() => setGoalsFilter('ALL')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${goalsFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t.parent.goalsFilter.all}
                    </button>
                    <button
                      onClick={() => setGoalsFilter('READY')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${goalsFilter === 'READY' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t.parent.goalsFilter.reached}
                    </button>
                    <button
                      onClick={() => setGoalsFilter('ONGOING')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${goalsFilter === 'ONGOING' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t.parent.goalsFilter.progress}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center text-center min-h-[240px] justify-center space-y-4 transition-colors duration-500">
                  {filteredGoals.length === 0 ? (
                    <>
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 text-3xl">
                        <i className={getIcon('gift')}></i>
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 font-medium text-sm leading-relaxed max-w-[200px]">
                        {goalsFilter === 'ALL' ? t.parent.goalsEmpty.none : (goalsFilter === 'READY' ? t.parent.goalsEmpty.reached : t.parent.goalsEmpty.progress)}
                      </p>
                      <button
                        onClick={startAddGoal}
                        className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95"
                      >
                        {t.parent.addGoalAction}
                      </button>
                    </>
                  ) : (
                    <div className="w-full space-y-3">
                      {filteredGoals.map(goal => {
                        const percent = Math.min(100, Math.round((activeChild.balance / goal.target) * 100));
                        const isReady = activeChild.balance >= goal.target;
                        return (
                          <div key={goal.id} className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-colors duration-300 ${goal.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : (isReady ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700/50 text-slate-800 dark:text-yellow-100' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800')}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${goal.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : (isReady ? 'bg-yellow-400 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500')}`}>
                                <i className={getIcon(goal.icon)}></i>
                              </div>
                              <div>
                                <p className="font-bold text-sm">{goal.name}</p>
                                <p className="text-[10px] font-black uppercase tracking-wider opacity-50">
                                  {goal.status === 'COMPLETED' ? (language === 'fr' ? 'Obtenu' : 'Purchased') : `${percent}% • ${goal.target}€`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {goal.status === 'COMPLETED' ? (
                                <button
                                  onClick={() => onArchiveGoal?.(activeChild.id, goal.id)}
                                  className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                  title={language === 'fr' ? 'Archiver' : 'Archive'}
                                >
                                  <i className="fa-solid fa-box-archive"></i>
                                </button>
                              ) : isReady && (
                                <span className="bg-yellow-400 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse shadow-sm">{t.child.available}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={startAddGoal} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-600 text-xs font-bold hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all">
                        + {t.parent.addGoalAction}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section ref={missionFormRef} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <i className="fa-solid fa-circle-plus"></i>
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t.parent.addMissionTitle}</h2>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6 transition-colors duration-500">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-[0.15em] ml-1">{t.parent.templatesTitle}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyTemplate(t.parent.templates.room, 2)} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100/50 dark:border-slate-700/50 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all uppercase tracking-widest">🧹 {t.parent.templates.room}</button>
                      <button type="button" onClick={() => applyTemplate(t.parent.templates.table, 1)} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100/50 dark:border-slate-700/50 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all uppercase tracking-widest">🍽️ {t.parent.templates.table}</button>
                    </div>
                  </div>

                  <form onSubmit={handleAddSubmit} className="space-y-5 pt-5 border-t border-slate-50 dark:border-slate-800">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.parent.formTitleLabel}</label>
                        <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all text-slate-900 dark:text-white font-black text-sm shadow-inner" placeholder={t.parent.formTitlePlaceholder} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.parent.formAmountLabel}</label>
                        <div className="relative">
                          <input type="number" step="0.5" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full pl-5 pr-12 py-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all text-slate-900 dark:text-white font-black text-sm shadow-inner" placeholder={t.parent.formAmountPlaceholder} required />
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 dark:text-slate-600">€</span>
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                      <i className="fa-solid fa-paper-plane text-emerald-400 dark:text-emerald-500"></i>
                      {t.parent.addButton} {activeChild.name}
                    </button>
                  </form>
                </div>
              </section>

              {/* Quick Actions (QR & Premium) - Added for visibility */}
              <section className="space-y-4 pt-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Raccourcis</h2>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setActiveTab('ACCOUNT'); setMainView('profile'); }} className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-3 rounded-2xl shadow-lg shadow-violet-200 flex flex-col items-center justify-center gap-2 hover:translate-y-[-2px] transition-all text-white text-center py-6 relative overflow-hidden group border border-white/20">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-colors"></div>
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner mb-1 ring-2 ring-white/30">
                      <i className="fa-solid fa-crown text-yellow-300 text-xl drop-shadow-sm"></i>
                    </div>
                    <div className="relative z-10">
                      <p className="font-black text-xs leading-tight mb-1 uppercase tracking-wider">Premium</p>
                      <p className="text-[10px] text-white/90 font-medium">Débloquer tout</p>
                    </div>
                  </button>
                </div>
              </section>
            </div>}

            {/* Content that was previously side-by-side is now managed via tabs */}
            {/* START REQUESTS VIEW */}
            {mainView === 'requests' && <section className="pt-24 space-y-4 pb-24">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t.parent.pendingValidations}</h2>
                  {activeChildPendingCount > 0 && <span className="bg-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-black shadow-md">{activeChildPendingCount}</span>}
                </div>
              </div>
              <div className="space-y-4">
                {activeChild.giftRequested && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-violet-100 text-violet-500 rounded-2xl flex items-center justify-center text-xl">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                          {language === 'fr' ? 'Cadeau demandé' : 'Gift requested'}
                        </h4>
                      </div>
                    </div>
                    <button onClick={() => {
                      startEditChild(activeChild);
                      setTimeout(() => {
                        setTriggerAddGoal(true);
                        setTimeout(() => {
                          formGoalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 150);
                      }, 200);
                    }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm">Configurer</button>
                  </div>
                )}

                {activeChild.missionRequested && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-2xl flex items-center justify-center text-xl"><i className="fa-solid fa-bell"></i></div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{t.child.askNewMission}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Demande de mission</p>
                      </div>
                    </div>
                    <button onClick={() => { setMainView('dashboard'); setTimeout(() => missionFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm">Créer une mission</button>
                  </div>
                )}

                {activeChild.missions && activeChild.missions.filter(m => m.status === 'PENDING').map(mission => (
                  <div key={mission.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl p-1 overflow-hidden shrink-0">
                          {renderAvatar(activeChild.avatar, "w-full h-full", activeChild.colorClass)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug">{getTranslatedTitle(mission.title, language)}</h3>
                          <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-black">+{mission.reward} €</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => openActionModal(mission.id, 'REJECT')} className="py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">Corriger</button>
                      <button onClick={() => openActionModal(mission.id, 'APPROVE')} className="py-3.5 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-600 transition-colors text-sm">Valider</button>
                    </div>
                  </div>
                ))}

                {activeChildPendingCount === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <i className="fa-solid fa-mug-hot text-4xl mb-4 opacity-50"></i>
                    <p className="font-bold text-sm text-center">Aucune demande en attente.<br />Tout est à jour !</p>
                  </div>
                )}
              </div>
            </section>}

            {mainView === 'history' && <section className="pt-28 pb-32 space-y-4">
              <div className="px-4">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 items-center">
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0">
                    <button onClick={() => setHistoryView('LIST')} aria-label={language === 'fr' ? 'Vue liste' : 'List view'} className={`w-10 h-9 rounded-lg flex items-center justify-center transition-all ${historyView === 'LIST' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}><i className="fa-solid fa-list" aria-hidden="true"></i></button>
                    <button onClick={() => setHistoryView('CHART')} aria-label={language === 'fr' ? 'Vue graphique' : 'Chart view'} className={`w-10 h-9 rounded-lg flex items-center justify-center transition-all ${historyView === 'CHART' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}><i className="fa-solid fa-chart-simple" aria-hidden="true"></i></button>
                  </div>

                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-1 h-11">
                    <button onClick={() => setHistoryFilter('THIS_MONTH')} className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all h-full ${historyFilter === 'THIS_MONTH' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>{t.parent.history.thisMonth}</button>
                    <button onClick={() => setHistoryFilter('ALL')} className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all h-full ${historyFilter === 'ALL' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>{t.parent.history.all}</button>
                  </div>

                  {hasAnyHistory &&
                    <button onClick={() => openConfirm(t.parent.history.clearTitle, t.parent.history.clearMessage, () => onClearHistory(activeChild.id), 'warning')} aria-label={t.parent.history.clearTitle} className="w-11 h-11 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors shrink-0 border border-rose-100 dark:border-rose-900/50 shadow-sm">
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </button>
                  }
                </div>
              </div>

              <div className="bg-transparent overflow-hidden min-h-[400px]">
                {historyView === 'LIST' ? (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800 p-2">
                    {filteredHistory.length > 0 ? filteredHistory.map((item) => {
                      const neg = item.amount < 0;
                      const penalty = neg && isPenalty(item.title);
                      return (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 w-12 h-12 rounded-2xl shrink-0 leading-tight">
                              <span className="text-xs text-slate-800 dark:text-slate-300">{item.date.split('/')[0]}</span>
                              <span className="text-[8px] uppercase">{['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(item.date.split('/')[1]) - 1] || item.date.split('/')[1]}</span>
                            </span>
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{getTranslatedTitle(item.title, language)}</h3>
                              {item.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.note}</p>}
                            </div>
                          </div>
                          <span className={`font-black text-sm px-4 py-2 rounded-xl whitespace-nowrap ${penalty ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : (neg ? 'text-slate-900 dark:text-slate-300' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20')}`}>
                            {penalty ? <i className="fa-solid fa-gavel mr-2"></i> : null}
                            {neg ? '-' : '+'}{Math.abs(item.amount).toFixed(2)} €
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <i className="fa-solid fa-receipt text-6xl mb-4 opacity-20"></i>
                        <p className="font-bold text-sm italic">{historyFilter === 'THIS_MONTH' ? t.parent.history.noDataMonth : t.parent.history.noData}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 h-[400px] flex flex-col">
                    {activeChild.history && activeChild.history.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                            <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                            />
                            <Bar dataKey="Gains" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="Amendes" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-8 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">{t.parent.history.income}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-xs font-black uppercase text-red-600 tracking-wider">{t.parent.history.expense}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-black uppercase text-amber-600 tracking-wider">{t.parent.transactions.labels.penalty}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <i className="fa-solid fa-chart-line text-6xl mb-4 opacity-20"></i>
                        <p className="font-bold text-sm italic">{t.parent.history.noDataChart}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-16 animate-fade-in-up px-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden text-center p-8 sm:p-12 relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 text-4xl mx-auto mb-8 shadow-inner border border-indigo-100">
                <i className="fa-solid fa-people-roof animate-bounce-short"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-4">{t.parent.dashboard.welcomeTitle}</h2>
              <p className="text-slate-500 text-lg mb-10 max-w-sm mx-auto leading-relaxed">
                {t.parent.dashboard.welcomeDesc}
              </p>
              <button
                onClick={startAddChild}
                className="inline-flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
              >
                <i className="fa-solid fa-plus group-hover:rotate-90 transition-transform"></i>
                {t.parent.addChild}
              </button>
            </div>
          </div>
        )}
      </div>

      {
        mainView === 'profile' && (
          <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 z-[40] flex flex-col p-4 animate-fade-in pt-24 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-2xl mx-auto rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-none sm:shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
              {/* Header Premium - Hidden in Tab View as TopNav covers it */}

              {/* Segmented Control iOS Style */}
              <div className="px-6 py-4 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    onClick={() => { setActiveTab('FAMILY'); setSettingsView('LIST'); }}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FAMILY' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    {t.parent.tabs.family}
                  </button>                  <button
                    onClick={() => { setActiveTab('ACCOUNT'); setSettingsView('LIST'); }}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ACCOUNT' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    {t.parent.tabs.account}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain pb-24 px-4 pt-4 bg-slate-50 dark:bg-slate-800/50 no-scrollbar text-slate-900 dark:text-white">
                {activeTab === 'FAMILY' && (
                  settingsView === 'LIST' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.children && data.children.map(child => (
                          <div key={child.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100/50 dark:border-slate-700 group hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-700 rounded-2xl p-1 shadow-inner ring-1 ring-slate-100 dark:ring-slate-600 flex items-center justify-center">
                                {renderAvatar(child.avatar, "w-full h-full", child.colorClass)}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{child.name}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                  {child.goals?.length || 0} {t.child.goalObjective}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => startEditChild(child)} aria-label={`${language === 'fr' ? 'Modifier' : 'Edit'} ${child.name}`} className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-sm active:scale-90">
                                <i className="fa-solid fa-pen text-xs" aria-hidden="true"></i>
                              </button>
                              <button onClick={() => openConfirm(t.parent.deleteTitle, t.parent.deleteMessage, () => onDeleteChild(child.id), 'danger')} aria-label={`${language === 'fr' ? 'Supprimer' : 'Delete'} ${child.name}`} className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-sm active:scale-90">
                                <i className="fa-solid fa-trash text-xs" aria-hidden="true"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={startAddChild} className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 rounded-3xl text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]">
                        <i className="fa-solid fa-user-plus text-lg opacity-40 group-hover:opacity-100 transition-opacity"></i>
                        {t.parent.addChild}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={saveChildForm} className="space-y-6 text-slate-900 dark:text-white animate-fade-in-up">
                      <div className="flex flex-col items-center mb-2">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700 flex flex-col items-center w-40 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-full h-1 bg-${formColorClass}-500 opacity-50`}></div>
                          <div className="w-16 h-16 mb-2">
                            {renderAvatar(formAvatar, "w-full h-full", formColorClass)}
                          </div>
                          <span className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest truncate w-full text-center px-2">{formName || t.parent.childName}</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.parent.childName}</label>
                            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full p-4 border-2 border-slate-50 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 outline-none text-slate-900 dark:text-white font-black transition-all" placeholder={t.parent.childName} />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.parent.childBirthday}</label>
                            <div className="flex gap-2">
                              <select
                                value={formBirthday ? parseInt(formBirthday.split('-')[2]) : ''}
                                onChange={e => {
                                  const d = e.target.value.padStart(2, '0');
                                  const m = formBirthday ? formBirthday.split('-')[1] : '01';
                                  const y = formBirthday ? formBirthday.split('-')[0] : new Date().getFullYear().toString();
                                  setFormBirthday(`${y}-${m}-${d}`);
                                }}
                                className="flex-1 p-4 border-2 border-slate-50 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 outline-none text-slate-900 dark:text-white font-black transition-all appearance-none"
                              >
                                <option value="" disabled>J</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <select
                                value={formBirthday ? parseInt(formBirthday.split('-')[1]) : ''}
                                onChange={e => {
                                  const m = e.target.value.padStart(2, '0');
                                  const d = formBirthday ? formBirthday.split('-')[2] : '01';
                                  const y = formBirthday ? formBirthday.split('-')[0] : new Date().getFullYear().toString();
                                  setFormBirthday(`${y}-${m}-${d}`);
                                }}
                                className="flex-1 p-4 border-2 border-slate-50 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 outline-none text-slate-900 dark:text-white font-black transition-all appearance-none"
                              >
                                <option value="" disabled>M</option>
                                {['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                  <option key={i} value={i + 1}>{m}</option>
                                ))}
                              </select>
                              <select
                                value={formBirthday ? parseInt(formBirthday.split('-')[0]) : ''}
                                onChange={e => {
                                  const y = e.target.value;
                                  const m = formBirthday ? formBirthday.split('-')[1] : '01';
                                  const d = formBirthday ? formBirthday.split('-')[2] : '01';
                                  setFormBirthday(`${y}-${m}-${d}`);
                                }}
                                className="flex-1 p-4 border-2 border-slate-50 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 outline-none text-slate-900 dark:text-white font-black transition-all appearance-none"
                              >
                                <option value="" disabled>A</option>
                                {Array.from({ length: 18 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 relative">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t.parent.childAvatar}</label>
                        <button
                          type="button"
                          onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                          className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10">
                              {renderAvatar(formAvatar, "w-full h-full", formColorClass)}
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-200 tracking-wide">{formAvatar}</span>
                          </div>
                          <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform ${isAvatarDropdownOpen ? 'rotate-180' : ''}`}></i>
                        </button>

                        {isAvatarDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-50" onClick={() => setIsAvatarDropdownOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[60] animate-scale-in">
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[200px] overflow-y-auto no-scrollbar p-1">
                                {AVAILABLE_SEEDS.map(seed => (
                                  <button
                                    key={seed}
                                    type="button"
                                    onClick={() => {
                                      setFormAvatar(seed);
                                      setIsAvatarDropdownOpen(false);
                                    }}
                                    className={`aspect-square rounded-full border-2 transition-all overflow-hidden p-0.5 ${formAvatar === seed ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50' : 'border-slate-50 opacity-60 hover:opacity-100 hover:border-slate-200'}`}
                                  >
                                    {renderAvatar(seed, "w-full h-full", seed === formAvatar ? formColorClass : "slate")}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t.parent.childColor}</label>
                        <div className="relative group">
                          <select
                            value={formColorClass}
                            onChange={(e) => setFormColorClass(e.target.value)}
                            className="w-full p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-slate-200 shadow-sm pr-12"
                          >
                            {AVAILABLE_COLORS.map(color => (
                              <option key={color} value={color} className={`text-${color}-600 font-bold`}>
                                {(t.colors as any)[color]}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full bg-${formColorClass}-500 shadow-sm border border-white`}></div>
                            <i className="fa-solid fa-chevron-down text-slate-400 text-sm"></i>
                          </div>
                        </div>
                      </div>

                      <div ref={formGoalsRef} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                              <i className="fa-solid fa-bullseye-arrow"></i>
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{t.parent.childGoalsTitle}</h4>
                          </div>
                          <button type="button" onClick={handleAddGoalToForm} className="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-md transition-all active:scale-95 flex items-center gap-2 border border-indigo-100 dark:border-indigo-800 shadow-sm">
                            <i className="fa-solid fa-plus text-xs"></i> {t.common.add}
                          </button>
                        </div>
                        <div className="p-5 space-y-3 min-h-[100px]">
                          {formGoals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-300 gap-2">
                              <i className="fa-solid fa-bullseye text-2xl opacity-20"></i>
                              <p className="text-xs font-bold italic">{t.parent.goalsEmpty.noneInForm}</p>
                            </div>
                          ) : formGoals.map((goal) => (
                            <div key={goal.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/50 dark:border-slate-700 animate-scale-in group">
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <i className={getIcon(goal.icon, 'fa-solid fa-bullseye')}></i>
                              </div>
                              <input
                                type="text"
                                value={goal.name}
                                onChange={e => handleUpdateGoal(goal.id, { name: e.target.value })}
                                placeholder={t.parent.childGoalName}
                                className="flex-1 min-w-[120px] p-3 rounded-xl border-2 border-transparent bg-transparent text-sm font-black outline-none focus:border-indigo-100 dark:focus:border-indigo-800 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                              />
                              <div className="relative">
                                <input
                                  type="number"
                                  value={goal.target || ''}
                                  onChange={e => handleUpdateGoal(goal.id, { target: parseFloat(e.target.value) || 0 })}
                                  placeholder="0"
                                  className="w-24 p-3 pr-8 rounded-xl border-2 border-transparent bg-transparent text-sm font-black text-right outline-none focus:border-indigo-100 dark:focus:border-indigo-800 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs pointer-events-none">€</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveGoal(goal.id)} aria-label={language === 'fr' ? 'Supprimer l\'objectif' : 'Remove goal'} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-rose-300 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 transition-all border border-slate-100 dark:border-slate-600 active:scale-90">
                                <i className="fa-solid fa-trash-can text-sm" aria-hidden="true"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-6">
                        <button
                          type="submit"
                          disabled={formGoals.some(g => !g.name || !g.target || g.target <= 0)}
                          className="w-full sm:flex-[2] py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 order-1 sm:order-2"
                        >
                          <i className="fa-solid fa-cloud-arrow-up text-indigo-300"></i>
                          {t.common.save}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettingsView('LIST')}
                          className="w-full sm:flex-1 py-5 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-slate-600 rounded-[1.5rem] transition-all order-2 sm:order-1"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    </form>
                  )
                )}

                {activeTab === 'ACCOUNT' && (
                  <div className="space-y-4 max-w-lg mx-auto pb-8 text-slate-900 dark:text-white transition-colors duration-500">
                    <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden mb-8 border border-white/5 dark:border-white/10">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full -ml-16 -mb-16 blur-2xl"></div>

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <i className="fa-solid fa-crown text-xl text-white"></i>
                          </div>
                          <div>
                            <h4 className="text-lg font-black tracking-tight">{t.parent.premium.title} ✨</h4>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{language === 'fr' ? 'Soutenez Koiny' : 'Support Koiny'}</span>
                          </div>
                        </div>

                        <p className="text-sm text-white/70 mb-6 font-medium leading-relaxed">{t.parent.premium.desc}</p>

                        <div className="grid grid-cols-1 gap-3 mb-8">
                          {t.parent.premium.features.split('•').filter(f => f.trim()).map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                              <i className="fa-solid fa-circle-check text-indigo-400 text-xs"></i>
                              <span className="text-xs font-bold text-white/90">{feature.trim()}</span>
                            </div>
                          ))}
                        </div>

                        <button onClick={() => openPrompt({ title: t.parent.messages.premiumSoonTitle, message: t.parent.messages.premiumSoonMessage, type: 'info', onConfirm: () => { } })} className="w-full bg-white dark:bg-indigo-500 text-slate-900 dark:text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-indigo-600 transition-colors">
                          {t.parent.premium.upgrade}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 text-slate-900 dark:text-white">
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            <i className="fa-solid fa-volume-high"></i>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t.parent.account.soundEffects}</span>
                        </div>
                        <button onClick={() => onToggleSound(!data.soundEnabled)} className={`w-12 h-6 rounded-full transition-all relative shadow-inner ${data.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${data.soundEnabled ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <button onClick={() => {
                        openPrompt({
                          title: language === 'fr' ? 'Limite des cagnottes' : language === 'nl' ? 'Spaarbeperking' : 'Savings Limit',
                          message: language === 'fr' ? 'Montant maximum du portefeuille (0 pour illimité)' : language === 'nl' ? 'Maximumbedrag in portemonnee' : 'Maximum wallet balance',
                          type: 'input',
                          placeholder: (data.maxBalance || 100).toString(),
                          onConfirm: (val) => {
                            if (val && !isNaN(parseFloat(val))) {
                              onUpdateMaxBalance?.(parseFloat(val));
                            }
                          }
                        });
                      }} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            <i className="fa-solid fa-gauge-high"></i>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{language === 'fr' ? 'Limite du portefeuille' : language === 'nl' ? 'Portemonnee limiet' : 'Wallet Limit'}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{(data.maxBalance || 100)}€ Max</span>
                          </div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                      </button>

                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                            <i className="fa-solid fa-language"></i>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{language === 'fr' ? 'Langue de l\'application' : language === 'nl' ? 'Taal van de app' : 'App Language'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['fr', 'nl', 'en'] as Language[]).map(l => (
                            <button
                              key={l}
                              onClick={() => onSetLanguage(l)}
                              className={`py-2 px-3 rounded-xl font-black text-xs transition-all border-2 ${language === l ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                              {l.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={handleResetPin} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            <i className="fa-solid fa-key"></i>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t.parent.account.changePin}</span>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                      </button>

                      <button onClick={() => {
                        openPrompt({
                          title: t.parent.account.changePassword,
                          message: t.parent.account.newPassword,
                          type: 'input',
                          placeholder: '••••••••',
                          onConfirm: (val) => {
                            if (val) onUpdatePassword(val).then(() => openPrompt({ title: t.parent.messages.pinResetSuccessTitle, message: t.parent.account.passwordUpdated, type: 'success', onConfirm: () => { } }));
                          }
                        });
                      }} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            <i className="fa-solid fa-lock"></i>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t.parent.account.changePassword}</span>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                      </button>

                      <button onClick={() => setShowHelp(true)} className="w-full flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800/60 group transition-all hover:shadow-md text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-indigo-800/60 text-indigo-500 dark:text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <i className="fa-solid fa-book-open"></i>
                          </div>
                          <span className="font-bold text-indigo-700 dark:text-indigo-200 text-sm">{t.common.userGuide}</span>
                        </div>
                        <i className="fa-solid fa-chevron-right text-indigo-300 dark:text-indigo-400 group-hover:translate-x-1 transition-transform"></i>
                      </button>

                      <button onClick={async () => {
                        if (notificationsAllowed) {
                          // User wants to disable: We mute them locally
                          notifications.setMuted(true);
                          setNotificationsAllowed(false);
                          return;
                        }

                        // User wants to enable
                        // First check if it's just muted but we have permission
                        const isMuted = notifications.isMuted();
                        if (isMuted) {
                          notifications.setMuted(false);
                          // Verify system permission still exists
                          const hasSysPerm = await notifications.checkPermission();
                          if (hasSysPerm) {
                            setNotificationsAllowed(true);
                            return;
                          }
                        }

                        // Otherwise, request full system permission
                        try {
                          const granted = await notifications.requestPermission();
                          if (granted) {
                            notifications.setMuted(false);
                            setNotificationsAllowed(true);
                            // Envoyer une notification de test
                            await notifications.send(
                              '🎉 Notifications activées !',
                              'Vous recevrez désormais des alertes pour les missions et demandes de vos enfants.'
                            );
                          } else {
                            // Permission denied by system/user
                            openPrompt({ title: 'Notifications', message: t.parent.messages.notificationsDisabledMessage, type: 'warning', onConfirm: () => { } });
                          }
                        } catch (error) {
                          console.error('[ParentView] Erreur activation notifications:', error);
                          openPrompt({ title: 'Notifications', message: t.parent.messages.notificationsErrorMessage, type: 'warning', onConfirm: () => { } });
                        }
                      }} className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border group transition-all hover:shadow-md text-left ${notificationsAllowed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${notificationsAllowed ? 'bg-white dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                            <i className={`fa-solid ${notificationsAllowed ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${notificationsAllowed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>{t.parent.account.enableNotifications}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{notificationsAllowed ? t.parent.account.notificationsEnabled : t.parent.account.notificationsDisabled}</span>
                          </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-colors ${notificationsAllowed ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsAllowed ? 'translate-x-7' : 'translate-x-1'}`}></div>
                        </div>
                      </button>

                      <button onClick={async () => {
                        await onSignOut();
                      }} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors">
                            <i className="fa-solid fa-right-from-bracket"></i>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{language === 'fr' ? 'Se déconnecter' : language === 'nl' ? 'Afmelden' : 'Sign Out'}</span>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                      </button>

                      <button onClick={() => openConfirm(t.parent.account.deleteAccountTitle, t.parent.account.deleteAccountMessage, () => onDeleteAccount(), 'danger')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-100 dark:hover:border-red-900/30 text-left transition-colors">
                        <div className="flex items-center gap-4 text-red-500 dark:text-red-400">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            <i className="fa-solid fa-trash-can"></i>
                          </div>
                          <span className="font-bold text-sm">{t.parent.account.deleteAccount}</span>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 group-hover:text-red-300 dark:group-hover:text-red-400 transition-colors"></i>
                      </button>
                    </div>

                    <div className="pt-8 text-center">
                      <button onClick={() => {
                        const event = new CustomEvent('openLegalModal');
                        window.dispatchEvent(event);
                      }} className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 transition-colors underline decoration-slate-200 hover:decoration-indigo-200">
                        {t.legal.link}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {
        transactionType && activeChild && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-colors duration-500">
            <div className="fixed inset-0" onClick={() => setTransactionType(null)}></div>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in text-slate-900 dark:text-white relative z-10 border-t border-white/20 dark:border-white/10 transition-colors duration-500">
              <div className={`pt-8 pb-6 px-8 text-white relative overflow-hidden ${transactionType === 'DEPOSIT' ? 'bg-emerald-500' : (withdrawSubtype === 'PURCHASE' ? 'bg-slate-900' : 'bg-red-600')}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 ring-1 ring-white/30">
                    <i className={`fa-solid ${transactionType === 'DEPOSIT'
                      ? 'fa-coins'
                      : withdrawSubtype === 'PURCHASE'
                        ? 'fa-cart-shopping'
                        : 'fa-gavel'
                      } text-2xl`}></i>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest">{transactionType === 'DEPOSIT' ? t.parent.transactions.labels.deposit : (withdrawSubtype === 'PURCHASE' ? t.parent.transactions.labels.purchase : t.parent.transactions.labels.penalty)}</h3>
                  <p className="text-white/70 text-xs font-bold mt-1 uppercase tracking-tighter">{activeChild?.name}</p>
                </div>
              </div>

              <form onSubmit={handleTransactionSubmit} className="p-8 space-y-6">
                {transactionType === 'WITHDRAW' && (
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl mb-2">
                    <button type="button" onClick={() => setWithdrawSubtype('PURCHASE')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${withdrawSubtype === 'PURCHASE' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><i className="fa-solid fa-cart-shopping"></i> {t.parent.transactions.labels.purchase}</button>
                    <button type="button" onClick={() => setWithdrawSubtype('PENALTY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${withdrawSubtype === 'PENALTY' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><i className="fa-solid fa-gavel"></i> {t.parent.transactions.labels.penalty}</button>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{language === 'fr' ? 'Montant à valider' : language === 'nl' ? 'Bedrag' : 'Amount'}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={transAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setTransAmount(e.target.value);
                          }
                        }}
                        className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] py-5 px-6 text-3xl font-black focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 outline-none bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white transition-all text-center placeholder:opacity-30 shadow-inner"
                        required
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 dark:text-slate-700 text-xl">€</span>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{t.parent.transactions.reason}</label>
                    <input
                      type="text"
                      value={transReason}
                      onChange={(e) => setTransReason(e.target.value)}
                      className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] py-4 px-6 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 outline-none bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white transition-all shadow-inner"
                      placeholder={
                        transactionType === 'DEPOSIT'
                          ? t.parent.transactions.placeholders.deposit
                          : (withdrawSubtype === 'PURCHASE' ? t.parent.transactions.placeholders.purchase : t.parent.transactions.placeholders.penalty)
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    type="submit"
                    className={`w-full py-5 text-white font-black uppercase tracking-[0.2em] text-sm rounded-[1.5rem] shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${transactionType === 'DEPOSIT' ? 'bg-emerald-500 shadow-emerald-200/50' : (withdrawSubtype === 'PURCHASE' ? 'bg-slate-900 shadow-slate-200/50' : 'bg-red-600 shadow-red-200/50')}`}
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    {t.common.confirm}
                  </button>
                  <button type="button" onClick={() => setTransactionType(null)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">{t.common.cancel}</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        selectedMissionId && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-slate-900 dark:text-white font-bold border border-white/10 transition-colors duration-500">
              <div className={`p-6 text-white ${actionType === 'APPROVE' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                <h3 className="text-base font-bold flex items-center gap-2"><i className={`fa-solid ${actionType === 'APPROVE' ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i> {actionType === 'APPROVE' ? t.parent.approveModalTitle : t.parent.rejectModalTitle}</h3>
              </div>
              <div className="p-6">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold transition-all" placeholder={t.parent.notePlaceholder}></textarea>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setSelectedMissionId(null)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">{t.common.cancel}</button>
                  <button onClick={confirmAction} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${actionType === 'APPROVE' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>{t.common.confirm}</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} language={language} />

      {/* Confirmation Dialog System */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
      />
      {/* Custom Prompt/Alert Modal - Premium Upgrade */}
      {
        promptConfig.isOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xl animate-fade-in" onClick={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}></div>
            <div className="bg-white/90 dark:bg-slate-900/80 w-full max-w-sm rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] p-8 relative z-10 animate-scale-in border border-white dark:border-white/10 overflow-hidden group">
              {/* Background Accent Bar */}
              <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${promptConfig.type === 'success' ? 'from-emerald-400 to-emerald-600' :
                promptConfig.type === 'danger' || promptConfig.type === 'warning' ? 'from-rose-400 to-rose-600' :
                  'from-indigo-400 to-indigo-600'
                } opacity-50`}></div>

              <div className="flex flex-col items-center text-center">
                {/* Floating Icon Container */}
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl mb-8 shadow-inner border border-white/50 dark:border-white/5 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 ${promptConfig.type === 'success' ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-500' :
                  promptConfig.type === 'warning' || promptConfig.type === 'danger' ? 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-500' :
                    'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-500'
                  }`}>
                  <i className={`fa-solid ${promptConfig.type === 'success' ? 'fa-check-circle' :
                    promptConfig.type === 'warning' || promptConfig.type === 'danger' ? 'fa-triangle-exclamation' :
                      promptConfig.type === 'input' ? 'fa-pen-to-square' : 'fa-circle-info'
                    }`}></i>
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight leading-tight uppercase">{promptConfig.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-10 leading-relaxed px-2">{promptConfig.message}</p>

                {promptConfig.type === 'input' && (
                  <div className="w-full mb-10 relative group/input">
                    <input
                      autoFocus
                      type="password"
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      placeholder={promptConfig.placeholder || '...'}
                      className="w-full p-5 bg-black/5 dark:bg-black/40 border-2 border-white/10 dark:border-white/5 rounded-3xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-900 dark:text-white font-black transition-all text-center placeholder:opacity-30 shadow-inner text-xl tracking-widest"
                    />
                  </div>
                )}

                <div className="flex gap-4 w-full">
                  {promptConfig.type === 'input' && (
                    <button
                      onClick={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1 py-4 px-4 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px] active:scale-95 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      {t.common.cancel}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      promptConfig.onConfirm(promptValue);
                      setPromptConfig(prev => ({ ...prev, isOpen: false }));
                    }}
                    className={`flex-1 py-4 px-6 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-xl active:scale-95 ${promptConfig.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]' :
                      'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)]'
                      }`}
                  >
                    {promptConfig.type === 'input' ? t.common.confirm : t.common.close}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Biometric Choice Dialog */}
      {biometricChoice?.isOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xl animate-fade-in"
            onClick={() => setBiometricChoice(null)}
          ></div>
          <div className="bg-white/90 dark:bg-slate-900/90 w-full max-w-sm rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] p-8 relative z-10 animate-scale-in border border-white dark:border-white/10 overflow-hidden">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500 opacity-50"></div>

            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-20 h-20 bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400 rounded-[2rem] flex items-center justify-center text-3xl mb-6 shadow-inner border border-white/50 dark:border-white/5 transform -rotate-6">
                <i className="fa-solid fa-shield-halved"></i>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                {t.parent.messages.chooseMethodTitle}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8 leading-relaxed">
                {t.parent.messages.chooseMethodMessage}
              </p>

              {/* Biometric Button */}
              <button
                onClick={() => {
                  setBiometricChoice(null);
                  setTimeout(() => handleResetPinWithBiometric(), 300);
                }}
                className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl mb-3 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-95 transition-all group"
              >
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  <i className={biometricChoice.icon}></i>
                </div>
                <div className="text-left">
                  <span className="font-black text-sm block">
                    {t.parent.messages.useBiometric.replace('{biometric}', biometricChoice.label)}
                  </span>
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                    {language === 'fr' ? 'Rapide & sécurisé' : language === 'nl' ? 'Snel & veilig' : 'Fast & secure'}
                  </span>
                </div>
              </button>

              {/* Password Button */}
              <button
                onClick={() => {
                  setBiometricChoice(null);
                  setTimeout(() => handleResetPinWithPassword(), 300);
                }}
                className="w-full flex items-center gap-4 p-5 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-2xl active:scale-95 transition-all group border border-slate-200 dark:border-slate-700"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-xl text-slate-400 dark:text-slate-500 shadow-sm group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                  <i className="fa-solid fa-key"></i>
                </div>
                <div className="text-left">
                  <span className="font-black text-sm block">
                    {t.parent.messages.usePassword}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {language === 'fr' ? 'Méthode classique' : language === 'nl' ? 'Klassieke methode' : 'Classic method'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation
        activeTab={mainView}
        onTabChange={(tab) => setMainView(tab as any)}
        onAddClick={() => {
          setMainView('dashboard');
          setTimeout(() => {
            missionFormRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        pendingCount={totalPendingCount}
      />
    </div>
  );
};

// End of ParentView component
export default ParentView;
