
import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './components/LoginView';
import AuthView from './components/AuthView';
import ChildView from './components/ChildView';
import ParentView from './components/ParentView';
import LandingView from './components/LandingView';
import LegalModal from './components/LegalModal';
import { GlobalState, INITIAL_DATA, HistoryEntry, ChildProfile, Language, Goal, BADGE_THRESHOLDS, ParentBadge, MAX_BALANCE } from './types';
import { loadData, saveData } from './services/storage';
import { getSupabase, updatePassword, deleteAccount, ensureUserProfile } from './services/supabase';
import { notifications } from './services/notifications';
import { translations } from './i18n';
import { monitoring } from './services/monitoring';
import { widgetService } from './services/widget';

type ViewState = 'LANDING' | 'AUTH' | 'LOGIN' | 'CHILD' | 'PARENT';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [data, setData] = useState<GlobalState>(INITIAL_DATA);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [isSharedFamily, setIsSharedFamily] = useState(false);

  const prevChildrenRef = React.useRef<ChildProfile[]>([]);

  // Écouteur de changements pour les notifications
  useEffect(() => {
    if (loading) {
      prevChildrenRef.current = data.children;
      return;
    }

    // Skip notification check on first render (empty ref)
    if (prevChildrenRef.current.length === 0 && data.children.length > 0) {
      prevChildrenRef.current = data.children;
      return;
    }

    data.children.forEach(child => {
      const prevChild = prevChildrenRef.current.find(c => c.id === child.id);
      if (!prevChild) return;

      // Détection nouvelle demande de cadeau
      if (child.giftRequested && !prevChild.giftRequested) {
        notifications.notifyChildRequest(child.name, 'GIFT');
      }

      // Détection nouvelle demande de mission
      if (child.missionRequested && !prevChild.missionRequested) {
        notifications.notifyChildRequest(child.name, 'MISSION');
      }

      // Détection mission terminée (statut passe à PENDING)
      child.missions.forEach(m => {
        const prevM = prevChild.missions.find(pm => pm.id === m.id);
        if (m.status === 'PENDING' && prevM?.status !== 'PENDING') {
          notifications.notifyMissionComplete(child.name);
        }
      });
    });

    prevChildrenRef.current = data.children;
  }, [data.children, loading]);

  // Système de Rappel Automatique pour les missions
  useEffect(() => {
    if (loading || !data.children.length) return;

    const checkReminder = () => {
      const lastSent = data.lastReminderSent ? new Date(data.lastReminderSent).getTime() : 0;
      const now = Date.now();
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

      // Si plus de 3 jours se sont écoulés depuis le dernier rappel
      if (now - lastSent > threeDaysInMs) {
        const anyChildNoMission = data.children.some(child => child.missions.length === 0);

        if (anyChildNoMission) {
          notifications.notifyParentReminder();
          setData(prev => ({
            ...prev,
            lastReminderSent: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }
      }
    };

    // Vérifie au démarrage et toutes les 24h si l'app reste ouverte
    checkReminder();
    const interval = setInterval(checkReminder, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [data.children, data.lastReminderSent, loading]);

  useEffect(() => {
    monitoring.initWebVitals();
    monitoring.track('BUSINESS', 'APP_OPEN');

    // Global Error Catcher pour la résilience
    const handleError = (error: ErrorEvent) => {
      console.error("Runtime Crash:", error);
      monitoring.track('ERROR', 'RUNTIME_CRASH', 0, { message: error.message });
    };
    window.addEventListener('error', handleError);

    // Initialisation du Widget Service (iOS App Groups)
    widgetService.init();

    return () => window.removeEventListener('error', handleError);
  }, []);

  // Équilibre entre initApp et authListener pour éviter les redirections vers LANDING
  useEffect(() => {
    const supabase = getSupabase();
    let isInitialized = false;

    const initialize = async (session: any, sharedFamilyId?: string) => {
      // Si on a déjà une session chargée et qu'on essaie de charger "null", on ignore
      if (isInitialized && !session && !sharedFamilyId) return;

      try {
        setLoading(true);
        console.log('🔄 [INIT] Chargement...', session?.user?.email || 'Invité');

        // IMPORTANT: Si on a une session, vérifier/créer le profil AVANT de charger les données
        if (session?.user) {
          console.log('🔐 [INIT] Vérification du profil utilisateur...');
          const profileExists = await ensureUserProfile(session.user.id);
          if (!profileExists) {
            console.error('❌ [INIT] Impossible de créer/vérifier le profil');
            setCriticalError('Erreur de création du profil utilisateur');
            setLoading(false);
            return;
          }
          console.log('✅ [INIT] Profil vérifié/créé avec succès');
        }

        const result = await loadData(sharedFamilyId);
        setData(result.data || INITIAL_DATA);
        setOwnerId(result.ownerId);
        setIsSharedFamily(result.isSharedFamily || false);

        if (session) {
          console.log('✅ [INIT] Mode Connecté → LOGIN');
          setView('LOGIN');
        } else {
          const hasLocalChildren = result.data?.children?.length > 0;
          if (hasLocalChildren) {
            setView('LOGIN');
          } else {
            setView('LANDING');
          }
        }
        isInitialized = true;
      } catch (err) {
        console.error("❌ [INIT] Erreur:", err);
        setCriticalError("Problème de connexion aux données.");
      } finally {
        setLoading(false);
      }
    };

    if (!supabase) {
      initialize(null);
      return;
    }

    // 1. Écouter les changements (OAuth Google)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('🔐 [AUTH EVENT]', event, session?.user?.email);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        console.log('🚀 [AUTH] Session valide détectée !');

        // NOUVEAU: Vérifier et créer le profil si nécessaire
        const profileExists = await ensureUserProfile(session.user.id);
        if (!profileExists) {
          console.error('❌ [AUTH] Impossible de créer/vérifier le profil');
          setCriticalError('Erreur de création du profil utilisateur');
          setLoading(false);
          return;
        }

        await initialize(session);
      } else if (event === 'SIGNED_OUT') {
        setView('LANDING');
        setData(INITIAL_DATA);
        setOwnerId(undefined);
        setIsSharedFamily(false);
      }
    });

    // 2. Lancement initial avec vérification forcée
    const runInit = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      let sharedFamilyId = urlParams.get('familyId') || localStorage.getItem('koiny_pending_family_invite') || undefined;

      // Détecter si on revient d'un OAuth (hash contient access_token OU erreur)
      const hasAuthToken = window.location.hash.includes('access_token=');
      const hasAuthError = window.location.hash.includes('error=');

      if (hasAuthToken || hasAuthError) {
        console.log('🔄 [INIT] Retour OAuth détecté dans l\'URL');

        if (hasAuthError) {
          const errorMatch = window.location.hash.match(/error_description=([^&]*)/);
          const errorDesc = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Erreur inconnue';
          console.error('❌ [OAUTH] Erreur OAuth:', errorDesc);
          setCriticalError(`Erreur OAuth: ${errorDesc}`);
          setLoading(false);
          return;
        }

        // Attendre que le listener onAuthStateChange traite la session
        console.log('⏳ [INIT] Attente de la session OAuth (1.5s max)...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ [INIT] Session OAuth récupérée:', (session as any).user.email);
          if (!isInitialized) {
            await initialize(session, sharedFamilyId);
          }
        } else {
          console.error('❌ [INIT] Aucune session trouvée après OAuth');
          setCriticalError('Impossible de récupérer la session OAuth');
          setLoading(false);
        }
        return;
      }

      // Cas normal: pas de OAuth callback
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 [INIT] Session existante:', (session as any)?.user?.email || 'Aucune');
      await initialize(session, sharedFamilyId);

      // Nettoyage URL
      if (sharedFamilyId && window.history.replaceState) {
        localStorage.removeItem('koiny_pending_family_invite');
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    runInit();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  /* State for controlling save urgency */
  const [immediateSave, setImmediateSave] = useState(false);

  useEffect(() => {
    if (!loading && view !== 'AUTH' && view !== 'LANDING' && !criticalError) {
      saveData(data, ownerId, immediateSave);
      if (immediateSave) setImmediateSave(false);

      // Synchronisation Widget iOS
      if (data.children && data.children.length > 0) {
        // On synchronise soit l'enfant actif, soit le premier de la liste
        const childToSync = data.children.find(c => c.id === activeChildId) || data.children[0];
        widgetService.syncChildData(childToSync);
      }
    }
  }, [data, loading, view, ownerId, criticalError, immediateSave, activeChildId]);

  const triggerOverflow = useCallback(() => {
    setIsOverflowing(true);
    if ("vibrate" in navigator) navigator.vibrate([50, 50, 50]);
    setTimeout(() => setIsOverflowing(false), 1500);
  }, []);

  const calculateBadge = (count: number): ParentBadge => {
    if (count >= BADGE_THRESHOLDS.FINTECH_GURU) return 'FINTECH_GURU';
    if (count >= BADGE_THRESHOLDS.EXPERT) return 'EXPERT';
    if (count >= BADGE_THRESHOLDS.MENTOR) return 'MENTOR';
    return 'NOVICE';
  };

  const updateChild = (childId: string, updater: (child: ChildProfile) => ChildProfile) => {
    setData(prev => {
      const newChildren = prev.children.map(c => c.id === childId ? updater(c) : c);
      return { ...prev, updatedAt: new Date().toISOString(), children: newChildren };
    });
  };

  const handleApprove = (childId: string, missionId: string, note?: string) => {
    monitoring.track('BUSINESS', 'MISSION_APPROVED', 1, { childId });
    setData(prev => {
      const newTotalMissions = (prev.totalApprovedMissions || 0) + 1;
      const newBadge = calculateBadge(newTotalMissions);
      const t = translations[prev.language];

      return {
        ...prev,
        totalApprovedMissions: newTotalMissions,
        parentBadge: newBadge,
        updatedAt: new Date().toISOString(),
        children: prev.children.map(child => {
          if (child.id !== childId) return child;
          const mission = child.missions.find(m => m.id === missionId);
          if (!mission) return child;

          let effectiveReward = mission.reward;
          let titleSuffix = "";

          const currentMax = prev.maxBalance === 0 ? Infinity : (prev.maxBalance || MAX_BALANCE);
          if (child.balance >= currentMax) {
            triggerOverflow();
            effectiveReward = 0;
            titleSuffix = ` (${t.parent.history.limitReached})`;
          } else {
            const maxGainPossible = Math.max(0, currentMax - child.balance);
            if (mission.reward > maxGainPossible) {
              triggerOverflow();
              effectiveReward = maxGainPossible;
              titleSuffix = ` (${t.parent.history.limitReached})`;
            }
          }

          const locale = prev.language === 'fr' ? 'fr-FR' : 'en-US';
          const newHistoryEntry: HistoryEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
            title: mission.title + titleSuffix,
            amount: effectiveReward,
            note: note
          };

          return {
            ...child,
            balance: Number((child.balance + effectiveReward).toFixed(2)),
            history: [newHistoryEntry, ...child.history],
            missions: child.missions.filter(m => m.id !== missionId)
          };
        })
      };
    });
  };

  const handleManualTransaction = (childId: string, amount: number, reason: string) => {
    setData(prev => {
      const t = translations[prev.language];
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        children: prev.children.map(child => {
          if (child.id !== childId) return child;
          let effectiveAmount = amount;
          let finalReason = reason;

          if (amount > 0) {
            const currentMax = prev.maxBalance === 0 ? Infinity : (prev.maxBalance || MAX_BALANCE);
            if (child.balance >= currentMax) {
              triggerOverflow();
              effectiveAmount = 0;
              finalReason = `${reason} (${t.parent.history.limitReached})`;
            } else {
              const maxPossible = Math.max(0, currentMax - child.balance);
              if (amount > maxPossible) {
                triggerOverflow();
                effectiveAmount = maxPossible;
                finalReason = `${reason} (${t.parent.history.limitReached})`;
              }
            }
          }

          return {
            ...child, balance: Math.max(0, Math.min(MAX_BALANCE, Number((child.balance + effectiveAmount).toFixed(2)))),
            history: [{ id: Date.now().toString(), date: new Date().toLocaleDateString(), title: finalReason, amount: effectiveAmount }, ...child.history]
          };
        })
      };
    });
  };

  const handleCopyInvite = () => {
    const inviteLink = `${window.location.origin}?familyId=${ownerId || 'demo'}`;
    navigator.clipboard.writeText(inviteLink);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const setLanguage = (lang: Language) => setData(prev => ({ ...prev, language: lang, updatedAt: new Date().toISOString() }));
  const handleLogout = () => { setActiveChildId(null); setView('LOGIN'); };
  const handleFullSignOut = async () => { const supabase = getSupabase(); if (supabase) await supabase.auth.signOut(); setView('LANDING'); setData(INITIAL_DATA); setOwnerId(undefined); };
  const handleMissionComplete = (id: string) => { updateChild(activeChildId!, (child) => ({ ...child, missions: child.missions.map(m => m.id === id ? { ...m, status: 'PENDING' } : m) })); };
  const handleReject = (childId: string, missionId: string, note?: string) => { updateChild(childId, (child) => ({ ...child, missions: child.missions.map(m => m.id === missionId ? { ...m, status: 'ACTIVE', feedback: note } : m) })); };
  const handleAddMission = (childId: string, title: string, amount: number) => { updateChild(childId, (child) => ({ ...child, missions: [...child.missions, { id: Date.now().toString(), title, reward: amount, icon: 'fa-solid fa-star', status: 'ACTIVE', createdAt: new Date().toISOString() }] })); };
  const handleDeleteActiveMission = (childId: string, missionId: string) => { updateChild(childId, (child) => ({ ...child, missions: child.missions.filter(m => m.id !== missionId) })); };
  const handleChildTutorialComplete = () => { updateChild(activeChildId!, (child) => ({ ...child, tutorialSeen: true })); };
  const handleParentTutorialComplete = () => setData(prev => ({ ...prev, parentTutorialSeen: true, updatedAt: new Date().toISOString() }));
  const handleSetGoalPrimary = (childId: string, goalId: string) => { updateChild(childId, (child) => { const idx = child.goals.findIndex(g => g.id === goalId); if (idx <= 0) return child; const next = [...child.goals]; const [g] = next.splice(idx, 1); next.unshift(g); return { ...child, goals: next }; }); };
  const handleEditChild = (id: string, updates: Partial<ChildProfile>) => updateChild(id, (c) => ({ ...c, ...updates }));
  const handleDeleteChild = (id: string) => { setImmediateSave(true); setData(prev => ({ ...prev, children: prev.children.filter(c => c.id !== id), updatedAt: new Date().toISOString() })); };
  const handleClearHistory = (id: string) => updateChild(id, (c) => ({ ...c, history: [] }));
  const handleAddChild = (childData: any) => setData(prev => ({ ...prev, children: [...prev.children, { id: Date.now().toString(), ...childData, balance: 0, missions: [], history: [], tutorialSeen: false }] }));
  const handlePurchaseGoal = (id: string, goal: Goal) => updateChild(id, (c) => ({ ...c, balance: Number((c.balance - goal.target).toFixed(2)), history: [{ id: Date.now().toString(), date: new Date().toLocaleDateString(), title: `Achat : ${goal.name}`, amount: -goal.target }, ...c.history] }));
  const handleSetPin = (pin: string) => setData(prev => ({ ...prev, parentPin: pin, updatedAt: new Date().toISOString() }));
  const handleToggleSound = (enabled: boolean) => setData(prev => ({ ...prev, soundEnabled: enabled, updatedAt: new Date().toISOString() }));
  const handleUpdateMaxBalance = (limit: number) => setData(prev => ({ ...prev, maxBalance: limit, updatedAt: new Date().toISOString() }));

  const handleLoginSuccess = async (demoData?: GlobalState) => {
    setLoading(true);
    if (demoData) {
      // Mode Démo : On injecte les données et on sauvegarde en local
      // FORCE RESET: On supprime les anciennes données de démo pour charger la nouvelle conf (tutoriel reset)
      localStorage.removeItem('kidbank_data_demo');
      setData(demoData);
      setOwnerId('demo');
      saveData(demoData, 'demo');
    } else {
      // Mode Standard : On recharge depuis le stockage
      const result = await loadData();
      setData(result.data || INITIAL_DATA);
      setOwnerId(result.ownerId);
    }
    setLoading(false);
    setView('LOGIN');
  };

  if (criticalError) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-slate-950 p-6 font-sans transition-colors duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl text-center max-w-sm border border-red-100 dark:border-red-900/30">
        <i className="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-4"></i>
        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Problème de chargement</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{criticalError}</p>
        <button onClick={() => window.location.reload()} className="w-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-slate-100 transition-colors">Réessayer</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 font-sans transition-colors duration-500 overflow-hidden relative">
      <div className="absolute inset-0 bg-indigo-50/30 dark:bg-indigo-950/10 pointer-events-none"></div>

      {/* Premium Ambient Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-pink-200/20 dark:bg-fuchsia-900/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10 flex flex-col items-center animate-scale-in">
        <div className="w-32 h-32 mb-8 relative p-4 group">
          <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
          <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center p-2 border border-slate-100 dark:border-slate-800 transition-transform group-hover:scale-110 duration-500">
            <img
              src="/mascot.png"
              alt="Koiny Logo"
              className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform scale-125 translate-y-1"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
          </div>
          <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-[9px] animate-pulse">
            Koiny
          </p>
        </div>
      </div>
    </div>
  );

  const t = translations[data.language] || translations.fr;
  const inviteUrl = `${window.location.origin}?familyId=${ownerId || 'demo'}`;

  /* New Handlers for Child Requests */
  const handleRequestGift = () => { updateChild(activeChildId!, (child) => ({ ...child, giftRequested: true })); };
  const handleRequestMission = () => { updateChild(activeChildId!, (child) => ({ ...child, missionRequested: true })); };

  return (
    <div className={`min-h-screen ${isOverflowing ? 'overflow-active' : ''}`}>
      {view === 'LANDING' && <LandingView language={data.language} onGetStarted={() => setView('AUTH')} onSetLanguage={setLanguage} />}
      {view === 'AUTH' && <AuthView language={data.language} onSetLanguage={setLanguage} onLoginSuccess={handleLoginSuccess} />}
      {view === 'LOGIN' && <LoginView data={data} onSelectChild={(cid) => { setActiveChildId(cid); setView('CHILD'); }} onParentAccess={() => setView('PARENT')} />}
      {view === 'CHILD' && <ChildView data={data.children.find(c => c.id === activeChildId)!} language={data.language} onCompleteMission={handleMissionComplete} onLogout={handleLogout} onTutorialComplete={handleChildTutorialComplete} onSetPrimaryGoal={(gid) => handleSetGoalPrimary(activeChildId!, gid)} soundEnabled={data.soundEnabled} onPurchaseGoal={(g) => handlePurchaseGoal(activeChildId!, g)} onRequestGift={handleRequestGift} onRequestMission={handleRequestMission} />}
      <LegalModal language={data.language} />
      {view === 'PARENT' && (
        <ParentView
          data={data} ownerId={ownerId} language={data.language} onApprove={handleApprove} onReject={handleReject} onAddMission={handleAddMission}
          onDeleteActiveMission={handleDeleteActiveMission} onManualTransaction={handleManualTransaction} onAddChild={handleAddChild}
          onEditChild={handleEditChild} onDeleteChild={handleDeleteChild} onSetPin={handleSetPin} onClearHistory={handleClearHistory}
          onUpdatePassword={async (p) => { await updatePassword(p); }} onDeleteAccount={async () => { await deleteAccount(); setView('LANDING'); }}
          onExit={handleLogout} onTutorialComplete={handleParentTutorialComplete} onToggleSound={handleToggleSound} onSetLanguage={setLanguage}
          onShowQrInvite={() => setShowQrModal(true)} onUpdateMaxBalance={handleUpdateMaxBalance} isSharedFamily={isSharedFamily}
        />
      )}

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center animate-scale-in border border-white/20 dark:border-white/10 transition-colors duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm">{t.qr.title}</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl mb-6 flex justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`} alt="QR Code" className="w-48 h-48 mix-blend-multiply dark:mix-blend-normal dark:invert dark:hue-rotate-180" />
            </div>
            <button onClick={handleCopyInvite} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg ${qrCopied ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-100 shadow-black/20 dark:shadow-none'}`}>{qrCopied ? t.qr.copied : t.qr.copyLink}</button>
          </div>
        </div>
      )}

      {isOverflowing && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center animate-pop-in">
          <div className="bg-red-600/90 text-white w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)] border-4 border-red-400">
            <i className="fa-solid fa-shield-halved text-5xl"></i>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
