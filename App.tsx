
import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './components/LoginView';
import AuthView from './components/AuthView';
import ChildView from './components/ChildView';
import ParentView from './components/ParentView';
import LandingView from './components/LandingView';
import OnboardingView from './components/OnboardingView';
import LegalModal from './components/LegalModal';
import { GlobalState, INITIAL_DATA, HistoryEntry, ChildProfile, Language, Goal, BADGE_THRESHOLDS, ParentBadge, MAX_BALANCE } from './types';
import { loadData, saveData } from './services/storage';
import { updateWidgetData } from './services/widgetBridge';
import { getSupabase, updatePassword, deleteAccount, ensureUserProfile } from './services/supabase';
import { notifications } from './services/notifications';
import { translations } from './i18n';
import { monitoring } from './services/monitoring';
import { widgetService } from './services/widget';
import { saveParentPinLocally, loadParentPinLocally } from './services/pinStorage';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';

type ViewState = 'LANDING' | 'AUTH' | 'LOGIN' | 'CHILD' | 'PARENT';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [data, setData] = useState<GlobalState>(INITIAL_DATA);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const [isOverflowing, setIsOverflowing] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [notificationAction, setNotificationAction] = useState<{ type: string; childId: string } | null>(null);

  const prevChildrenRef = React.useRef<ChildProfile[]>([]);

  const isInitializing = React.useRef(false);

  // Securité : Forcer la fin du chargement après 15s quoi qu'il arrive
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ [APP] Timeout global de chargement ! On débloque.');
        setLoading(false);
        isInitializing.current = false;
        SplashScreen.hide();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const initialize = useCallback(async (session: any) => {
    // Restauration immédiate de la langue préférée
    const savedLanguage = localStorage.getItem('koiny_language') as Language;
    if (savedLanguage && ['fr', 'en', 'nl'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }

    if (isInitializing.current) {
      console.log('⏳ [INIT] Déjà en cours, on attend...');
      return;
    }
    isInitializing.current = true;

    try {
      // 1. Stratégie Optimiste : Afficher le cache immédiatement si disponible
      const cached = localStorage.getItem('koiny_local_v1');
      const cachedView = localStorage.getItem('koiny_last_view');
      const cachedChildId = localStorage.getItem('koiny_last_child_id');

      if (cached) {
        try {
          const parsed = JSON.parse(cached);

          // Priorité à la langue sauvegardée individuellement si elle existe
          const savedLang = localStorage.getItem('koiny_language') as Language;
          if (savedLang && ['fr', 'en', 'nl'].includes(savedLang)) {
            parsed.language = savedLang;
          }

          setData(parsed);

          // Si on a une vue en cache (et que ce n'est pas Landing), on restaure direct
          if (cachedView === 'CHILD' && cachedChildId) {
            setActiveChildId(cachedChildId);
            setView('CHILD');
            setLoading(false);
            SplashScreen.hide();
            console.log('⚡ [INIT] Restauration Enfant:', cachedChildId);
          } else if (cachedView && cachedView !== 'LANDING') {
            setView(cachedView as ViewState);
            setLoading(false);
            SplashScreen.hide();
            console.log('⚡ [INIT] Restauration View:', cachedView);
          } else {
            console.log('⚡ [INIT] Affichage immédiat du cache local');
          }
        } catch (e) {
          console.warn('⚠️ [INIT] Cache local corrompu');
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      const email = session?.user?.email || 'Invité';
      console.log('🔄 [INIT] Chargement pour:', email);

      if (session?.user) {
        console.log('🔐 [INIT] Vérification du profil...');
        await ensureUserProfile(session.user.id);
      }

      console.log('📦 [INIT] Chargement des données cloud en arrière-plan...');
      const result = await loadData();

      const cloudData = result.data || INITIAL_DATA;
      setData({
        ...cloudData,
        language: savedLanguage || cloudData.language || 'fr'
      });
      setOwnerId(result.ownerId);

      // Sync widget data on initial load
      if (cloudData.children?.length > 0) {
        const lang = savedLanguage || cloudData.language || 'fr';
        updateWidgetData(cloudData.children, lang);
      }

      // ✅ FIX DU FLASH : Ne pas écraser la vue si on a déjà restauré (CHILD ou PARENT)
      if (!cachedView || cachedView === 'LANDING') {
        if (session) {
          setView('LOGIN');
        } else {
          const hasLocalChildren = result.data?.children?.length > 0;
          if (hasLocalChildren) setView('LOGIN');
          else setView('LANDING');
        }
      }
    } catch (err) {
      console.error("❌ [INIT] Erreur:", err);
      // Ne pas bloquer si on a déjà des données du cache
      if (!localStorage.getItem('koiny_local_v1')) {
        setCriticalError("Problème de connexion.");
      }
    } finally {
      setLoading(false);
      isInitializing.current = false;
      SplashScreen.hide();
    }
  }, []);

  // Persistance de la vue actuelle
  useEffect(() => {
    if (view !== 'LANDING' && view !== 'AUTH') {
      localStorage.setItem('koiny_last_view', view);
    }
  }, [view]);

  // Sécurité : Si on est sur la vue CHILD mais que l'enfant n'existe plus (ex: sync cloud)
  useEffect(() => {
    if (view === 'CHILD' && !loading && !data.children.find(c => c.id === activeChildId)) {
      console.log('⚠️ [SAFETY] Enfant non trouvé, retour au Login');
      setView('LOGIN');
    }
  }, [view, loading, data.children, activeChildId]);

  // Écouteur de changements pour les notifications
  useEffect(() => {
    if (loading) {
      prevChildrenRef.current = data.children;
      return;
    }

    if (prevChildrenRef.current.length === 0 && data.children.length > 0) {
      prevChildrenRef.current = data.children;
      return;
    }

    const t = translations[data.language || 'fr'];

    data.children.forEach(child => {
      const prevChild = prevChildrenRef.current.find(c => c.id === child.id);
      if (!prevChild) return;

      if (child.giftRequested && !prevChild.giftRequested) {
        notifications.notifyChildRequest(
          child.id,
          'GIFT',
          t.parent.notifications.push.giftRequestTitle,
          t.parent.notifications.push.giftRequestBody.replace('{name}', child.name)
        );
      }
      if (child.missionRequested && !prevChild.missionRequested) {
        notifications.notifyChildRequest(
          child.id,
          'MISSION',
          t.parent.notifications.push.missionRequestTitle,
          t.parent.notifications.push.missionRequestBody.replace('{name}', child.name)
        );
      }

      child.missions.forEach(m => {
        const prevM = prevChild.missions.find(pm => pm.id === m.id);
        if (m.status === 'PENDING' && prevM?.status !== 'PENDING') {
          notifications.notifyMissionComplete(
            child.id,
            m.id,
            t.parent.notifications.push.missionCompleteTitle,
            t.parent.notifications.push.missionCompleteBody.replace('{name}', child.name)
          );
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

      if (now - lastSent > threeDaysInMs) {
        const anyChildNoMission = data.children.some(child => child.missions.length === 0);
        const t = translations[data.language || 'fr'];
        if (anyChildNoMission) {
          notifications.notifyParentReminder(t.parent.notifications.push.parentReminderTitle, t.parent.notifications.push.parentReminderBody);
          setData(prev => ({ ...prev, lastReminderSent: new Date().toISOString(), updatedAt: new Date().toISOString() }));
        }
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [data.children, data.lastReminderSent, loading]);

  useEffect(() => {
    monitoring.initSentry();
    monitoring.initWebVitals();
    monitoring.track('BUSINESS', 'APP_OPEN');

    const handleError = (error: ErrorEvent) => {
      console.error("Runtime Crash:", error);
      monitoring.track('ERROR', 'RUNTIME_CRASH', 0, { message: error.message });
    };
    window.addEventListener('error', handleError);

    widgetService.init();

    // Listen for notification clicks (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('🔔 [NOTIFICATION] Clicked:', action);
        const extra = action.notification.extra;
        if (!extra?.type) return;

        // ✅ Toujours aller sur la vue parent d'abord
        setView('PARENT');
        setActiveChildId(null); // S'assurer qu'on n'est pas sur une vue enfant

        // Passer l'action au ParentView
        setNotificationAction({
          type: extra.type,
          childId: extra.childId
        });
      });
    }

    // Gestion des liens profonds (Deep Links) pour OAuth & Invites
    let urlListener: any;
    CapApp.addListener('appUrlOpen', async (event: any) => {
      console.log('🔗 [DEEP LINK] Ouvert avec:', event.url);

      const supabase = getSupabase();
      if (!supabase) return;

      // Flux PKCE (Supabase v2 par défaut) — retourne ?code=XXXX
      const urlObj = new URL(event.url);
      const code = urlObj.searchParams.get('code');
      if (code) {
        console.log('🔐 [DEEP LINK] Code PKCE détecté, échange en cours...');
        try {
          const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(event.url);
          if (error) {
            console.error('❌ [DEEP LINK] Erreur exchangeCodeForSession:', error.message);
          } else {
            console.log('✅ [DEEP LINK] Session PKCE établie pour:', sessionData.session?.user?.email);
            await Browser.close();
            if (sessionData.session) await initialize(sessionData.session);
          }
        } catch (e: any) {
          console.error('❌ [DEEP LINK] Exception PKCE:', e.message);
        }
        return;
      }

      // Flux implicite (fallback) — retourne #access_token=... ou ?access_token=...
      if (event.url.includes('access_token=') || event.url.includes('refresh_token=')) {
        console.log('🔐 [DEEP LINK] Tokens implicites détectés...');
        const hashPart = event.url.includes('#') ? event.url.split('#')[1] : event.url.split('?')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            try {
              const { data: sessionData, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (error) {
                console.error('❌ [DEEP LINK] Erreur setSession:', error.message);
              } else {
                console.log('✅ [DEEP LINK] Session implicite établie pour:', sessionData.session?.user?.email);
                await Browser.close();
                if (sessionData.session) await initialize(sessionData.session);
              }
            } catch (e: any) {
              console.error('❌ [DEEP LINK] Exception setSession:', e.message);
            }
          }
        }
      }

    }).then(h => { urlListener = h; }).catch(err => console.warn('⚠️ [APP] Deep link listener failed:', err));

    return () => {
      window.removeEventListener('error', handleError);
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.removeAllListeners();
      }
      if (urlListener) urlListener.remove();
    };
  }, [initialize]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      initialize(null);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        await initialize(session);
      } else if (event === 'SIGNED_OUT') {
        setView('LANDING');
        setData(INITIAL_DATA);
        setOwnerId(undefined);
      }
    });

    const runInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await initialize(session);
    };

    runInit();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [initialize]);

  const [immediateSave, setImmediateSave] = useState(false);
  const isReloadingFromRealtime = React.useRef(false);
  const isDirectSupabaseOperation = React.useRef(false);
  const isSavingRef = React.useRef(false);

  useEffect(() => {
    const runSave = async () => {
      // Bloquer la sauvegarde si on vient de recharger depuis Realtime, opération directe ou déjà en cours
      if (isSavingRef.current || isReloadingFromRealtime.current || isDirectSupabaseOperation.current) {
        console.log('🛑 [APP] Save blocked');
        return;
      }

      isSavingRef.current = true;
      try {
        if (!loading && view !== 'AUTH' && view !== 'LANDING' && !criticalError) {
          const changes = await saveData(data, ownerId, immediateSave);
          updateWidgetData(data.children, data.language);

          // Si des IDs ont changé (ex: création enfant ou goal), on met à jour le state local
          // pour éviter de recréer les objets en boucle
          if (Object.keys(changes).length > 0) {
            console.log('🔄 [APP] Mise à jour des IDs (enfants/goals) après sync cloud:', changes);
            setData(prev => ({
              ...prev,
              children: prev.children.map(c => {
                // Update child ID if changed
                const updatedChild = changes[c.id] ? { ...c, id: changes[c.id] } : c;

                // Update goal IDs if matching temporary IDs are found in changes
                return {
                  ...updatedChild,
                  goals: updatedChild.goals.map(g => ({
                    ...g,
                    id: changes[g.id] || g.id
                  }))
                };
              })
            }));
          }

          if (immediateSave) setImmediateSave(false);
          if (data.children && data.children.length > 0) {
            const childToSync = data.children.find(c => c.id === activeChildId) || data.children[0];
            widgetService.syncChildData(childToSync, data.language);
          }
        }
      } finally {
        isSavingRef.current = false;
      }
    };
    runSave();
  }, [data, loading, view, ownerId, criticalError, immediateSave]);

  // Listener for forced cloud sync events
  useEffect(() => {
    const handleForceSync = () => {
      console.log('⚡ [APP] Force Sync requested via event');
      setImmediateSave(true);
    };
    window.addEventListener('force-cloud-sync', handleForceSync);
    return () => window.removeEventListener('force-cloud-sync', handleForceSync);
  }, []);

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
    setImmediateSave(true);
  };

  const handleApprove = async (childId: string, missionId: string, note?: string) => {
    monitoring.track('BUSINESS', 'MISSION_APPROVED', 1, { childId });
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ownerId) return;

    const t = translations[data.language];
    const child = data.children.find(c => c.id === childId);
    if (!child) return;
    const mission = child.missions.find(m => m.id === missionId);
    if (!mission) return;

    let effectiveReward = mission.reward;
    let titleSuffix = "";

    const currentMax = data.maxBalance === 0 ? Infinity : (data.maxBalance || MAX_BALANCE);
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

    const transactionId = crypto.randomUUID();
    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // 1. Operations directes Supabase
    isDirectSupabaseOperation.current = true;

    try {
      // Marquer la mission comme validée (si UUID)
      if (missionId.includes('-')) {
        const { error: mErr } = await supabase
          .from('missions')
          .update({
            status: 'validated',
            validated_at: new Date().toISOString(),
            validated_by: user.id
          })
          .eq('id', missionId);
        if (mErr) throw new Error(`Mise à jour mission échouée : ${mErr.message}`);
      }

      // Insérer la transaction
      const { error: tErr } = await supabase.from('transactions').insert({
        id: transactionId,
        child_id: childId,
        type: 'mission',
        amount: effectiveReward,
        description: mission.title + titleSuffix,
        created_by: user.id
      });

      if (tErr) throw new Error(`Insertion transaction échouée : ${tErr.message}`);

      // 2. Update local state
      setData(prev => {
        const newTotalMissions = (prev.totalApprovedMissions || 0) + 1;
        const newBadge = calculateBadge(newTotalMissions);

        return {
          ...prev,
          totalApprovedMissions: newTotalMissions,
          parentBadge: newBadge,
          updatedAt: new Date().toISOString(),
          children: prev.children.map(c => {
            if (c.id !== childId) return c;
            return {
              ...c,
              balance: Number((c.balance + effectiveReward).toFixed(2)),
              history: [{
                id: transactionId,
                date: dateFormatted,
                title: mission.title + titleSuffix,
                amount: effectiveReward,
                note: note
              }, ...c.history],
              missions: c.missions.filter(m => m.id !== missionId)
            };
          })
        };
      });
    } catch (err: any) {
      console.error('❌ Erreur approbation message:', err?.message);
      console.error('❌ Erreur approbation code:', err?.code);
      console.error('❌ Erreur approbation details:', err?.details);
      console.error('❌ Erreur approbation hint:', err?.hint);
      console.error('❌ Erreur approbation full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };

  const handleManualTransaction = async (childId: string, amount: number, reason: string) => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ownerId) return;

    let effectiveAmount = amount;
    let finalReason = reason;

    // Calculer l'overflow localement (basé sur la langue actuelle)
    const t = translations[data.language];
    if (amount > 0) {
      const currentMax = data.maxBalance === 0 ? Infinity : (data.maxBalance || MAX_BALANCE);
      const child = data.children.find(c => c.id === childId);
      if (child) {
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
    }

    const transactionId = crypto.randomUUID();
    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // 1. Operations directes Supabase
    isDirectSupabaseOperation.current = true;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          id: transactionId,
          child_id: childId,
          type: effectiveAmount >= 0 ? 'bonus' : 'withdrawal',
          amount: effectiveAmount,
          description: finalReason,
          created_by: user.id
        });

      if (error) throw new Error(`Transaction echouée : ${error.message}`);

      // 2. Update local state
      updateChild(childId, (child) => ({
        ...child,
        balance: Math.max(0, Math.min(MAX_BALANCE, Number((child.balance + effectiveAmount).toFixed(2)))),
        history: [{
          id: transactionId,
          date: dateFormatted,
          title: finalReason,
          amount: effectiveAmount
        }, ...child.history]
      }));
    } catch (err: any) {
      console.error('❌ Erreur transaction manuelle message:', err?.message);
      console.error('❌ Erreur transaction manuelle code:', err?.code);
      console.error('❌ Erreur transaction manuelle details:', err?.details);
      console.error('❌ Erreur transaction manuelle hint:', err?.hint);
      console.error('❌ Erreur transaction manuelle full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };

  const setLanguage = async (lang: Language) => {
    // Sync widget with new language BEFORE updating state
    if (data.children?.length > 0) {
      await updateWidgetData(data.children, lang);
    }
    // THEN update state
    setData(prev => ({
      ...prev,
      language: lang,
      updatedAt: new Date().toISOString()
    }));
    localStorage.setItem('koiny_language', lang);
  };
  const handleLogout = () => { setActiveChildId(null); setView('LOGIN'); };
  const handleFullSignOut = async () => {
    const supabase = getSupabase();

    // Supprimer le PIN local avant de se déconnecter
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { deleteParentPinLocally } = await import('./services/pinStorage');
          await deleteParentPinLocally(user.id);
          console.log('✅ [APP] PIN local supprimé lors de la déconnexion');
        }
      } catch (error) {
        console.error('❌ [APP] Erreur suppression PIN local:', error);
      }

      await supabase.auth.signOut();
    }

    setView('LANDING');
    setData(INITIAL_DATA);
    setOwnerId(undefined);
  };
  const handleMissionComplete = (id: string) => { updateChild(activeChildId!, (child) => ({ ...child, missions: child.missions.map(m => m.id === id ? { ...m, status: 'PENDING' } : m) })); };
  const handleReject = (childId: string, missionId: string, note?: string) => { updateChild(childId, (child) => ({ ...child, missions: child.missions.map(m => m.id === missionId ? { ...m, status: 'ACTIVE', feedback: note } : m) })); };
  const handleAddMission = async (childId: string, title: string, amount: number) => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ownerId) return;

    const missionId = crypto.randomUUID();

    // 1. Operations directes Supabase
    isDirectSupabaseOperation.current = true;

    try {
      const { error } = await supabase
        .from('missions')
        .insert({
          id: missionId,
          child_id: childId,
          title: title,
          amount: amount,
          icon_id: 'icon_star',
          status: 'available',
          created_by: user.id
        });

      if (error) throw new Error(`Creation mission echouée : ${error.message}`);

      // ✅ Reset mission_requested flag in DB
      await supabase
        .from('children')
        .update({ mission_requested: false })
        .eq('id', childId);

      // 2. Update local state
      updateChild(childId, (child) => ({
        ...child,
        missionRequested: false,
        missions: [...child.missions, {
          id: missionId,
          title,
          reward: amount,
          icon: 'fa-solid fa-star',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }]
      }));
    } catch (err: any) {
      console.error('❌ Erreur ajout mission message:', err?.message);
      console.error('❌ Erreur ajout mission code:', err?.code);
      console.error('❌ Erreur ajout mission details:', err?.details);
      console.error('❌ Erreur ajout mission hint:', err?.hint);
      console.error('❌ Erreur ajout mission full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };
  const handleDeleteActiveMission = async (childId: string, missionId: string) => {
    const supabase = getSupabase();

    // Bloquer le save automatique
    isDirectSupabaseOperation.current = true;

    try {
      if (missionId.includes('-')) {
        const { error } = await supabase.from('missions').delete().eq('id', missionId);
        if (error) throw new Error(`Suppression mission echouée : ${error.message}`);
      }

      // 2. Update local state
      updateChild(childId, (child) => ({
        ...child,
        missions: child.missions.filter(m => m.id !== missionId)
      }));
    } catch (err: any) {
      console.error('❌ Erreur suppression mission message:', err?.message);
      console.error('❌ Erreur suppression mission code:', err?.code);
      console.error('❌ Erreur suppression mission full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };
  const handleChildTutorialComplete = () => { updateChild(activeChildId!, (child) => ({ ...child, tutorialSeen: true })); };
  const handleParentTutorialComplete = () => setData(prev => ({ ...prev, parentTutorialSeen: true, updatedAt: new Date().toISOString() }));
  const handleSetGoalPrimary = (childId: string, goalId: string) => { updateChild(childId, (child) => { const idx = child.goals.findIndex(g => g.id === goalId); if (idx <= 0) return child; const next = [...child.goals]; const [g] = next.splice(idx, 1); next.unshift(g); return { ...child, goals: next }; }); };
  const handleEditChild = (id: string, updates: Partial<ChildProfile>) => updateChild(id, (c) => ({ ...c, ...updates }));
  const handleDeleteGoal = async (childId: string, goalId: string) => {
    const supabase = getSupabase();

    // Bloquer le save automatique
    isDirectSupabaseOperation.current = true;

    try {
      if (goalId.includes('-')) {
        const { error } = await supabase.from('goals').delete().eq('id', goalId);
        if (error) throw new Error(`Suppression objectif echouée : ${error.message}`);
      }

      // 2. Update local state
      updateChild(childId, (child) => ({
        ...child,
        goals: child.goals.filter(g => g.id !== goalId)
      }));
    } catch (err: any) {
      console.error('❌ Erreur suppression objectif message:', err?.message);
      console.error('❌ Erreur suppression objectif code:', err?.code);
      console.error('❌ Erreur suppression objectif full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };
  const handleArchiveGoal = (childId: string, goalId: string) => {
    updateChild(childId, (child) => ({
      ...child,
      goals: child.goals.map(g => g.id === goalId ? { ...g, status: 'ARCHIVED' } : g)
    }));
  };
  const handleDeleteChild = async (id: string) => {
    const supabase = getSupabase();

    // Bloquer le save automatique
    isDirectSupabaseOperation.current = true;

    try {
      // 1. Supprimer dans Supabase
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Suppression enfant echouée : ${error.message}`);

      // 2. Mettre à jour state ET localStorage ensemble
      setData(prev => {
        const newData = {
          ...prev,
          children: prev.children.filter(c => c.id !== id),
          updatedAt: new Date().toISOString()
        };
        // Forcer la mise à jour du localStorage immédiatement
        localStorage.setItem('koiny_local_v1', JSON.stringify(newData));
        return newData;
      });
    } catch (err: any) {
      console.error('❌ Erreur suppression enfant message:', err?.message);
      console.error('❌ Erreur suppression enfant code:', err?.code);
      console.error('❌ Erreur suppression enfant full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };
  const handleClearHistory = (id: string) => updateChild(id, (c) => ({ ...c, history: [] }));
  const showAppError = (msg: string) => {
    setAppError(msg);
    setTimeout(() => setAppError(null), 5000);
  };

  const handleAddChild = async (childData: any) => {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showAppError('Vous n\'êtes pas connecté.');
      return;
    }

    const childId = crypto.randomUUID();
    const childPayload = {
      id: childId,
      user_id: user.id,
      name: childData.name,
      avatar_id: childData.avatar || 'avatar_1',
      theme_color: childData.colorClass || 'indigo',
      balance: 0
    };

    // Bloquer le save automatique
    isDirectSupabaseOperation.current = true;

    try {
      // 1. INSERT direct
      const { error } = await supabase.from('children').insert([childPayload]);
      if (error) throw new Error(error.message);

      // 2. Update local state
      setData(prev => ({
        ...prev,
        children: [...prev.children, {
          id: childId,
          ...childData,
          balance: 0,
          missions: [],
          history: [],
          tutorialSeen: false
        }]
      }));
    } catch (err: any) {
      console.error('❌ Erreur ajout enfant:', err?.message);
      showAppError(`Impossible de créer l'enfant : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };
  const handlePurchaseGoal = async (childId: string, goal: Goal) => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ownerId) return;

    const transactionId = crypto.randomUUID();
    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Bloquer le save automatique
    isDirectSupabaseOperation.current = true;

    try {
      // 1. INSERT direct
      const { error } = await supabase
        .from('transactions')
        .insert({
          id: transactionId,
          child_id: childId,
          type: 'withdrawal',
          amount: -goal.target,
          description: `Achat : ${goal.name}`,
          created_by: user.id
        });

      if (error) throw new Error(`Achat echoué : ${error.message}`);

      // 2. Update Goal Status IMMEDIATELY in Supabase
      const { error: gError } = await supabase
        .from('goals')
        .update({
          status: 'COMPLETED',
          is_achieved: true,
          achieved_at: new Date().toISOString()
        })
        .eq('id', goal.id);

      if (gError) console.error('⚠️ [APP] Erreur update statut goal:', gError.message);

      // 3. Update local state
      updateChild(childId, (c) => ({
        ...c,
        balance: Number((c.balance - goal.target).toFixed(2)),
        goals: c.goals.map(g => g.id === goal.id ? { ...g, status: 'COMPLETED' } : g),
        history: [{
          id: transactionId,
          date: dateFormatted,
          title: `Achat : ${goal.name}`,
          amount: -goal.target
        }, ...c.history]
      }));
    } catch (err: any) {
      console.error('❌ Erreur achat objectif message:', err?.message);
      console.error('❌ Erreur achat objectif code:', err?.code);
      console.error('❌ Erreur achat objectif full:', JSON.stringify(err));
    } finally {
      setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
    }
  };
  const handleSetPin = async (pin: string) => {
    // Sauvegarder dans le state global (pour Supabase si owner)
    setData(prev => ({ ...prev, parentPin: pin, updatedAt: new Date().toISOString() }));

    // Sauvegarder LOCALEMENT sur cet appareil (pour co-parents)
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveParentPinLocally(user.id, pin);
          console.log('✅ [APP] PIN sauvegardé localement pour:', user.id);
        }
      } catch (error) {
        console.error('❌ [APP] Erreur sauvegarde PIN local:', error);
      }
    }
  };
  const handleToggleSound = (enabled: boolean) => setData(prev => ({ ...prev, soundEnabled: enabled, updatedAt: new Date().toISOString() }));
  const handleUpdateMaxBalance = (limit: number) => setData(prev => ({ ...prev, maxBalance: limit, updatedAt: new Date().toISOString() }));

  const handleLoginSuccess = async (demoData?: GlobalState) => {
    setLoading(true);
    if (demoData) {
      localStorage.removeItem('kidbank_data_demo');
      setData(demoData);
      setOwnerId('demo');
      saveData(demoData, 'demo');
    } else {
      const result = await loadData();
      setData(result.data || INITIAL_DATA);
      setOwnerId(result.ownerId);
    }
    setLoading(false);
    setView('LOGIN');
  };

  if (criticalError) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-slate-950 p-6 font-sans">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl text-center max-w-sm border border-red-100 dark:border-red-900/30">
        <i className="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-4"></i>
        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Problème</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{criticalError}</p>
        <button onClick={() => window.location.reload()} className="w-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold transition-colors">Réessayer</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center 
      bg-gradient-to-br from-indigo-600 to-indigo-900 
      dark:from-indigo-950 dark:to-slate-950 
      font-sans relative transition-colors duration-500">

      <div className="relative z-10 flex flex-col items-center animate-scale-in">

        <div className="w-40 h-40 mb-8 rounded-[2.5rem] overflow-hidden shadow-2xl"
          style={{ background: '#3730a3' }}>
          <img src="/mascot.png"
            className="w-full h-full object-cover scale-110"
            alt="Koiny" />
        </div>

        {/* Nom de l'app */}
        <p className="text-white font-black text-3xl tracking-tight mb-8">
          Koiny
        </p>

        {/* Points de chargement blancs */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></div>
        </div>

      </div>

      {/* Cercles décoratifs en arrière-plan */}
      <div className="absolute top-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );

  const handleRequestGift = () => { updateChild(activeChildId!, (child) => ({ ...child, giftRequested: true })); };
  const handleRequestMission = () => { updateChild(activeChildId!, (child) => ({ ...child, missionRequested: true })); };
  const handleSelectChild = (childId: string) => {
    localStorage.setItem('koiny_last_view', 'CHILD');
    localStorage.setItem('koiny_last_child_id', childId);
    setActiveChildId(childId);
    setView('CHILD');
  };

  return (
    <div className={`min-h-screen ${isOverflowing ? 'overflow-active' : ''}`}>
      {view === 'LANDING' && (
        !localStorage.getItem('koiny_onboarding_seen')
          ? <OnboardingView
            language={data.language}
            onSetLanguage={setLanguage}
            onComplete={() => {
              localStorage.setItem('koiny_onboarding_seen', '1');
              setView('AUTH');
            }}
          />
          : <AuthView language={data.language} onSetLanguage={setLanguage} onLoginSuccess={handleLoginSuccess} />
      )}
      {view === 'AUTH' && <AuthView language={data.language} onSetLanguage={setLanguage} onLoginSuccess={handleLoginSuccess} />}
      {view === 'LOGIN' && <LoginView data={data} onSelectChild={handleSelectChild} onParentAccess={() => setView('PARENT')} />}
      {view === 'CHILD' && (
        data.children.find(c => c.id === activeChildId) ? (
          <ChildView
            data={data.children.find(c => c.id === activeChildId)!} language={data.language} onCompleteMission={handleMissionComplete} onLogout={handleLogout} onTutorialComplete={handleChildTutorialComplete} onSetPrimaryGoal={(gid) => handleSetGoalPrimary(activeChildId!, gid)} soundEnabled={data.soundEnabled} onPurchaseGoal={(g) => handlePurchaseGoal(activeChildId!, g)} onRequestGift={handleRequestGift} onRequestMission={handleRequestMission}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">Chargement...</p>
          </div>
        )
      )}
      <LegalModal language={data.language} />
      {view === 'PARENT' && (
        <ParentView
          data={data} ownerId={ownerId} language={data.language} onApprove={handleApprove} onReject={handleReject} onAddMission={handleAddMission}
          onDeleteActiveMission={handleDeleteActiveMission} onManualTransaction={handleManualTransaction} onAddChild={handleAddChild}
          onEditChild={handleEditChild} onDeleteGoal={handleDeleteGoal} onArchiveGoal={handleArchiveGoal} onDeleteChild={handleDeleteChild} onSetPin={handleSetPin} onClearHistory={handleClearHistory}
          onUpdatePassword={async (p) => { await updatePassword(p); }} onDeleteAccount={async () => { await deleteAccount(); setView('LANDING'); }}
          onExit={handleLogout} onTutorialComplete={handleParentTutorialComplete} onToggleSound={handleToggleSound} onSetLanguage={setLanguage}
          onUpdateMaxBalance={handleUpdateMaxBalance}
          notificationAction={notificationAction} onClearNotificationAction={() => setNotificationAction(null)}
          onSignOut={handleFullSignOut}
        />
      )}

      {isOverflowing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none z-[200] animate-slide-down">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl shadow-red-500/40 border border-red-400/30">
            <i className="fa-solid fa-shield-halved text-xl"></i>
            <span className="font-bold text-sm uppercase tracking-wide">Pas assez d'argent</span>
          </div>
        </div>
      )}

      {appError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-slide-down max-w-sm w-[90vw]">
          <div className="bg-red-600 text-white px-5 py-4 rounded-2xl flex items-start gap-3 shadow-2xl shadow-red-600/40 border border-red-500/30">
            <i className="fa-solid fa-circle-exclamation text-lg mt-0.5 shrink-0"></i>
            <span className="font-bold text-sm leading-snug">{appError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
