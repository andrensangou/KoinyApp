
import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './components/LoginView';
import AuthView from './components/AuthView';
import ChildView from './components/ChildView';
import ParentView from './components/ParentView';
import LandingView from './components/LandingView';
import OnboardingView from './components/OnboardingView';
import LegalModal from './components/LegalModal';
import AlertBanner from './components/AlertBanner';
import { GlobalState, INITIAL_DATA, HistoryEntry, ChildProfile, Language, Goal, BADGE_THRESHOLDS, ParentBadge, MAX_BALANCE } from './types';
import { loadData, saveData, persistentStorage } from './services/storage';
import { updateWidgetData } from './services/widgetBridge';
import { getSupabase, updatePassword, deleteAccount, ensureUserProfile } from './services/supabase';
import { alertService, AppAlert } from './services/alertService';
import { notifications } from './services/notifications';
import { translations } from './i18n';
import { monitoring } from './services/monitoring';
import { widgetService } from './services/widget';
import { saveParentPinLocally, loadParentPinLocally } from './services/pinStorage';
import { hashPin } from './services/security';
import { subscriptionService } from './services/subscription';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';

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
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AppAlert | null>(null);

  const prevChildrenRef = React.useRef<ChildProfile[]>([]);

  const isInitializing = React.useRef(false);
  const pendingSessionRef = React.useRef<any>(null);

  // Securité : Forcer la fin du chargement après 15s quoi qu'il arrive
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ [APP] Timeout global de chargement ! On débloque.');
        setLoading(false);
        isInitializing.current = false;
        SplashScreen.hide();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Détection connexion via navigator.onLine + Capacitor Network + events natifs
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      // Bloquer les notifications pendant le sync pour éviter les doublons
      isSyncingFromOnline.current = true;
      setTimeout(() => { isSyncingFromOnline.current = false; }, 5000);
      // Forcer un sync Supabase dès que la connexion revient
      setImmediateSave(true);
    };
    const handleOffline = () => setIsOfflineMode(true);

    // Vérifier l'état initial
    setIsOfflineMode(!navigator.onLine);

    // Écouter les changements réseau natifs
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ⭐ Utiliser Capacitor Network sur native (détecte mode avion iOS)
    const initCapacitorNetworkListener = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        // Vérifier l'état initial via Capacitor
        const status = await Network.getStatus();
        setIsOfflineMode(!status.connected);

        // Écouter les changements de connexion
        const unsubscribe = Network.addListener('networkStatusChange', (status) => {
          setIsOfflineMode(!status.connected);
        });
        return unsubscribe;
      } catch (error) {
        console.warn('[Network] Erreur Capacitor Network:', error);
        return undefined;
      }
    };

    let unsubscribeNetwork: (() => void) | undefined;
    initCapacitorNetworkListener().then(unsub => {
      unsubscribeNetwork = unsub?.remove;
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeNetwork) unsubscribeNetwork();
    };
  }, []);

  // Fetcher les alertes au startup
  useEffect(() => {
    const fetchAlert = async () => {
      const alert = await alertService.fetchAlert(data.language);
      if (alert) {
        setCurrentAlert(alert);
      }
    };
    fetchAlert();
  }, [data.language]);

  const initialize = useCallback(async (session: any) => {
    // Restauration immédiate de la langue préférée
    const savedLanguage = localStorage.getItem('koiny_language') as Language;
    if (savedLanguage && ['fr', 'en', 'nl'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }

    if (isInitializing.current) {
      console.log('⏳ [INIT] Déjà en cours, session mise en attente...');
      if (session) pendingSessionRef.current = session;
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

          // Priorité au statut premium stocké localement (évite le flash couronne)
          if (localStorage.getItem('koiny_premium_active') === 'true') {
            parsed.isPremium = true;
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

      console.log('📦 [INIT] Chargement des données cloud en arrière-plan...');
      const result = await loadData(session?.user?.id);

      // Profile check AFTER loadData to avoid concurrent auth lock contention
      if (session?.user) {
        ensureUserProfile(session.user.id).catch(e =>
          console.warn('⚠️ [INIT] Profile check failed (non-blocking):', e?.message)
        );
      }

      const cloudData = result.data || INITIAL_DATA;
      setData({
        ...cloudData,
        language: savedLanguage || cloudData.language || 'fr'
      });
      setOwnerId(result.ownerId);

      // Initialiser RevenueCat et vérifier le statut premium
      try {
        await subscriptionService.initialize(result.ownerId);
        if (result.ownerId && result.ownerId !== 'local-owner' && result.ownerId !== 'demo') {
          await subscriptionService.loginUser(result.ownerId);
        }
        const subStatus = await subscriptionService.getSubscriptionStatus();
        if (subStatus.isSubscribed) {
          localStorage.setItem('koiny_premium_active', 'true');
          setData(prev => ({ ...prev, isPremium: true }));
        } else {
          // Explicitly reset premium — prevents stale state from previous user
          localStorage.removeItem('koiny_premium_active');
          setData(prev => ({ ...prev, isPremium: false }));
        }
      } catch (e) {
        console.warn('⚠️ [INIT] RevenueCat init failed (non-blocking):', e);
      }

      // Sync widget data on initial load
      if (cloudData.children?.length > 0) {
        const lang = savedLanguage || cloudData.language || 'fr';
        updateWidgetData(cloudData.children, lang);
      }

      // ✅ FIX DU FLASH : Ne pas écraser la vue si on a déjà restauré (CHILD ou PARENT)
      if (!cachedView || cachedView === 'LANDING') {
        if (session) {
          const hasChildren = (cloudData.children?.length ?? 0) > 0;
          // Compte frais (pas d'enfants) → aller directement à PARENT, pas besoin du sélecteur LOGIN
          setView(hasChildren ? 'LOGIN' : 'PARENT');
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
      // Traiter la session en attente (ex: deep link OAuth arrivé pendant l'init)
      const pending = pendingSessionRef.current;
      if (pending) {
        pendingSessionRef.current = null;
        console.log('🔄 [INIT] Traitement de la session OAuth en attente...');
        setTimeout(() => initialize(pending), 0);
      }
    }
  }, []);

  // Refresh périodique du statut premium (détecte les annulations)
  useEffect(() => {
    if (loading) return;

    const refreshPremiumStatus = async () => {
      try {
        const status = await subscriptionService.getSubscriptionStatus();
        const wasPremium = localStorage.getItem('koiny_premium_active') === 'true';
        if (status.isSubscribed && !wasPremium) {
          localStorage.setItem('koiny_premium_active', 'true');
          setData(prev => ({ ...prev, isPremium: true, updatedAt: new Date().toISOString() }));
        } else if (!status.isSubscribed && wasPremium) {
          localStorage.removeItem('koiny_premium_active');
          setData(prev => ({ ...prev, isPremium: false, updatedAt: new Date().toISOString() }));
        }
      } catch (e) {
        // Silencieux — ne pas bloquer l'app
      }
    };

    // Refresh quand l'app revient au premier plan
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshPremiumStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Refresh toutes les 6 heures
    const interval = setInterval(refreshPremiumStatus, 6 * 60 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [loading]);

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

    // Bloquer les notifications pendant le sync au retour en ligne (évite doublons)
    if (isSyncingFromOnline.current) {
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

    // 🔔 Notification Habit Test: programmer le rappel hebdomadaire (dimanche 10h)
    const t = translations[data.language || 'fr'];
    notifications.scheduleWeeklyReminder(
      t.parent.notifications.push.weeklyReminderTitle,
      t.parent.notifications.push.weeklyReminderBody
    );

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

        if (extra.type === 'NEW_MISSION' || extra.type === 'GOAL_MILESTONE' || extra.type === 'WEEKLY_POCKET_MONEY') {
          if (extra.childId) {
            setActiveChildId(extra.childId);
            setView('CHILD');
          }
          return;
        }

        // Pour les autres notifications (destinées aux parents)
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

      // Fermer le browser immédiatement dès le retour du callback OAuth
      // (évite la page blanche quand iOS intercepte le custom scheme avant le SFSafariViewController)
      if (event.url.includes('com.koiny.app://callback')) {
        Browser.close().catch(() => {});
      }

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
            if (sessionData.session) {
              // Attendre que le WebProcess récupère son réseau après le freeze du browser
              await new Promise(r => setTimeout(r, 2000));
              await initialize(sessionData.session);
            }
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
                if (sessionData.session) {
                  // Attendre que le WebProcess récupère son réseau après le freeze du browser
                  await new Promise(r => setTimeout(r, 2000));
                  await initialize(sessionData.session);
                }
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
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Handles both null (no session) and valid session
        await initialize(session);
      } else if (event === 'SIGNED_OUT') {
        // Clear ALL local state immediately to prevent stale data bleed
        setData(INITIAL_DATA);
        setOwnerId(undefined);
        setView('LANDING');
        setActiveChildId(null);
        // Clear premium state — must be re-validated for next user
        localStorage.removeItem('koiny_premium_active');
        // Clear cached data so next login doesn't flash old children
        localStorage.removeItem('koiny_local_v1');
        localStorage.removeItem('koiny_last_view');
        localStorage.removeItem('koiny_last_child_id');
        persistentStorage.remove('koiny_local_v1').catch(() => {});
        persistentStorage.remove('koiny_local_v1_backup').catch(() => {});
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [initialize]);

  const [immediateSave, setImmediateSave] = useState(false);
  const isReloadingFromRealtime = React.useRef(false);
  const isDirectSupabaseOperation = React.useRef(false);
  const isSavingRef = React.useRef(false);
  const isSyncingFromOnline = React.useRef(false);

  useEffect(() => {
    const runSave = async () => {
      // Bloquer la sauvegarde si on vient de recharger depuis Realtime, opération directe, en cours d'init ou déjà en cours
      if (isSavingRef.current || isReloadingFromRealtime.current || isDirectSupabaseOperation.current || isInitializing.current) {
        console.log('🛑 [APP] Save blocked');
        return;
      }

      isSavingRef.current = true;
      try {
        if (!loading && view !== 'AUTH' && view !== 'LANDING' && !criticalError && ownerId !== 'demo') {
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
    // ⭐ ownerId est déjà en cache React — zéro appel réseau (fonctionne offline)
    const userId = (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') ? ownerId : null;

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

    // ⭐ 1. PRIORITÉ: Update local state TOUJOURS d'abord (offline-friendly)
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

    // 🔔 Notification Habit Test: vérifier les milestones d'objectifs après l'augmentation du solde
    const newBalance = Number((child.balance + effectiveReward).toFixed(2));
    if (child.goals && child.goals.length > 0) {
      child.goals.filter(g => g.status !== 'COMPLETED' && g.status !== 'ARCHIVED').forEach(goal => {
        const prevPercent = Math.floor((child.balance / goal.target) * 100);
        const newPercent = Math.floor((newBalance / goal.target) * 100);
        const milestoneKey = `koiny_milestone_${childId}_${goal.id}`;
        const lastMilestone = parseInt(localStorage.getItem(milestoneKey) || '0');

        if (newPercent >= 100 && lastMilestone < 100) {
          notifications.notifyGoalMilestone(childId,
            t.parent.notifications.push.goalMilestone100Title,
            t.parent.notifications.push.goalMilestone100Body.replace('{name}', child.name).replace('{goal}', goal.name)
          );
          localStorage.setItem(milestoneKey, '100');
        } else if (newPercent >= 75 && prevPercent < 75 && lastMilestone < 75) {
          const remaining = (goal.target - newBalance).toFixed(2);
          notifications.notifyGoalMilestone(childId,
            t.parent.notifications.push.goalMilestone75Title,
            t.parent.notifications.push.goalMilestone75Body.replace('{name}', child.name).replace('{goal}', goal.name).replace('{remaining}', remaining)
          );
          localStorage.setItem(milestoneKey, '75');
        } else if (newPercent >= 50 && prevPercent < 50 && lastMilestone < 50) {
          notifications.notifyGoalMilestone(childId,
            t.parent.notifications.push.goalMilestone50Title,
            t.parent.notifications.push.goalMilestone50Body.replace('{name}', child.name).replace('{goal}', goal.name)
          );
          localStorage.setItem(milestoneKey, '50');
        }
      });
    }
    if (userId) {
      (async () => {
        try {
          if (missionId.includes('-')) {
            await supabase.from('missions').update({
              status: 'validated',
              validated_at: new Date().toISOString(),
              validated_by: userId
            }).eq('id', missionId);
          }
          await supabase.from('transactions').insert({
            id: transactionId,
            child_id: childId,
            type: 'mission',
            amount: effectiveReward,
            description: mission.title + titleSuffix,
            created_by: userId
          });
        } catch (err: any) {
          console.warn('⚠️ Sync Supabase (offline?):', err?.message);
          // Détecter si c'est une erreur réseau
          const isNetworkError = !err?.status || err?.message?.includes('Failed to fetch') || err?.message?.includes('network');
          if (isNetworkError) {
            setIsOfflineMode(true);
          }
        }
      })();
    }
  };

  const handleManualTransaction = async (childId: string, amount: number, reason: string) => {
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

    // ⭐ 1. PRIORITÉ: Update local state TOUJOURS d'abord (offline-friendly)
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

    // 🔔 Notification Habit Test: vérifier milestones après un dépôt
    if (effectiveAmount > 0) {
      const child = data.children.find(c => c.id === childId);
      if (child && child.goals && child.goals.length > 0) {
        const newBal = Number((child.balance + effectiveAmount).toFixed(2));
        child.goals.filter(g => g.status !== 'COMPLETED' && g.status !== 'ARCHIVED').forEach(goal => {
          const prevPct = Math.floor((child.balance / goal.target) * 100);
          const newPct = Math.floor((newBal / goal.target) * 100);
          const mk = `koiny_milestone_${childId}_${goal.id}`;
          const last = parseInt(localStorage.getItem(mk) || '0');

          if (newPct >= 100 && last < 100) {
            notifications.notifyGoalMilestone(childId, t.parent.notifications.push.goalMilestone100Title, t.parent.notifications.push.goalMilestone100Body.replace('{name}', child.name).replace('{goal}', goal.name));
            localStorage.setItem(mk, '100');
          } else if (newPct >= 75 && prevPct < 75 && last < 75) {
            notifications.notifyGoalMilestone(childId, t.parent.notifications.push.goalMilestone75Title, t.parent.notifications.push.goalMilestone75Body.replace('{name}', child.name).replace('{goal}', goal.name).replace('{remaining}', (goal.target - newBal).toFixed(2)));
            localStorage.setItem(mk, '75');
          } else if (newPct >= 50 && prevPct < 50 && last < 50) {
            notifications.notifyGoalMilestone(childId, t.parent.notifications.push.goalMilestone50Title, t.parent.notifications.push.goalMilestone50Body.replace('{name}', child.name).replace('{goal}', goal.name));
            localStorage.setItem(mk, '50');
          }
        });
      }
    }

    // 2. Operations Supabase en arrière-plan (non-bloquant)
    if (ownerId && ownerId !== 'local-owner') {
      (async () => {
        isDirectSupabaseOperation.current = true;
        try {
          const supabase = getSupabase();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.warn('⚠️ Pas de session pour sync Supabase');
            return;
          }

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

          if (error) {
            console.warn('⚠️ Sync transaction échouée:', error.message);
          } else {
            console.log('✅ Sync Supabase réussi');
          }
        } catch (err: any) {
          console.warn('⚠️ Erreur sync Supabase (offline?):', err?.message);
        } finally {
          setTimeout(() => { isDirectSupabaseOperation.current = false; }, 2000);
        }
      })();
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

    // Naviguer immédiatement — le cleanup se fait en arrière-plan
    setData(INITIAL_DATA);
    setOwnerId(undefined);
    setView('AUTH');

    if (supabase) {
      try {
        // getSession() est caché localement — pas d'appel réseau
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { deleteParentPinLocally } = await import('./services/pinStorage');
          await deleteParentPinLocally(session.user.id);
        }
      } catch (error) {
        console.error('❌ [APP] Erreur suppression PIN local:', error);
      }

      await supabase.auth.signOut();
    }

    // Déconnecter l'utilisateur de RevenueCat
    try {
      await subscriptionService.logoutUser();
    } catch (e) {
      console.warn('⚠️ [APP] Erreur logout RevenueCat:', e);
    }

    // Nettoyer les données locales pour éviter qu'un autre compte les charge
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key: 'koiny_local_v1' });
      console.log('✅ [APP] Données locales nettoyées lors de la déconnexion');
    } catch (e) {
      console.error('❌ [APP] Erreur nettoyage données locales:', e);
    }

    setView('LANDING');
    setData(INITIAL_DATA);
    setOwnerId(undefined);
  };
  const handleMissionComplete = (id: string) => { updateChild(activeChildId!, (child) => ({ ...child, missions: child.missions.map(m => m.id === id ? { ...m, status: 'PENDING', feedback: undefined } : m) })); };
  const handleReject = (childId: string, missionId: string, note?: string) => { updateChild(childId, (child) => ({ ...child, missions: child.missions.map(m => m.id === missionId ? { ...m, status: 'ACTIVE', feedback: note } : m) })); };
  const handleAddMission = async (childId: string, title: string, amount: number) => {
    const supabase = getSupabase();
    // ⭐ ownerId est déjà en cache React — zéro appel réseau (fonctionne offline)
    const userId = (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') ? ownerId : null;

    const missionId = crypto.randomUUID();

    // ⭐ 1. PRIORITÉ: Update local state TOUJOURS d'abord (offline-friendly)
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

    // 🔔 Notification Habit Test: alerter l'enfant qu'une nouvelle mission est disponible
    const t = translations[data.language];
    notifications.notifyNewMission(
      childId,
      t.parent.notifications.push.newMissionTitle,
      t.parent.notifications.push.newMissionBody
        .replace('{mission}', title)
        .replace('{amount}', amount.toString())
    );

    // 2. Sync Supabase en arrière-plan (seulement si connecté)
    if (userId) {
      isDirectSupabaseOperation.current = true;
      (async () => {
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
              created_by: userId
            });
          if (error) console.warn('⚠️ Sync mission échouée:', error.message);

          await supabase
            .from('children')
            .update({ mission_requested: false })
            .eq('id', childId);
        } catch (err: any) {
          console.warn('⚠️ Sync addMission (offline?):', err?.message);
          // Détecter si c'est une erreur réseau
          const isNetworkError = !err?.status || err?.message?.includes('Failed to fetch') || err?.message?.includes('network');
          if (isNetworkError) {
            setIsOfflineMode(true);
          }
        }
      })();
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

  const handleEditMission = async (childId: string, missionId: string, updates: { title?: string; reward?: number }) => {
    // 1. Update local state
    updateChild(childId, (child) => ({
      ...child,
      missions: child.missions.map(m =>
        m.id === missionId ? { ...m, ...updates } : m
      )
    }));

    // 2. Sync Supabase si connecté
    const userId = (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') ? ownerId : null;
    if (userId && missionId.includes('-')) {
      (async () => {
        try {
          const supabase = getSupabase();
          const supabaseUpdates: any = {};
          if (updates.title) supabaseUpdates.title = updates.title;
          if (updates.reward !== undefined) supabaseUpdates.amount = updates.reward;
          await supabase.from('missions').update(supabaseUpdates).eq('id', missionId);
        } catch (err: any) {
          console.warn('⚠️ Sync editMission (offline?):', err?.message);
        }
      })();
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
    // Hash le PIN avant tout stockage (PBKDF2 100k iterations SHA-512)
    let pinToStore = pin;
    if (pin && pin.length >= 4) {
      try {
        pinToStore = await hashPin(pin);
      } catch (error) {
        console.error('❌ [APP] Erreur hachage PIN:', error);
        throw error;
      }
    }

    // Sauvegarder le HASH dans le state global (pour Supabase si owner)
    setData(prev => ({ ...prev, parentPin: pinToStore, updatedAt: new Date().toISOString() }));

    // Sauvegarder LOCALEMENT sur cet appareil (pour co-parents)
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveParentPinLocally(user.id, pinToStore);
          console.log('✅ [APP] PIN haché et sauvegardé localement pour:', user.id);
        }
      } catch (error) {
        console.error('❌ [APP] Erreur sauvegarde PIN local:', error);
      }
    }
  };
  const handleToggleSound = (enabled: boolean) => setData(prev => ({ ...prev, soundEnabled: enabled, updatedAt: new Date().toISOString() }));
  const handleUpdateMaxBalance = (limit: number) => setData(prev => ({ ...prev, maxBalance: limit, updatedAt: new Date().toISOString() }));
  const handleSetPremium = (enabled: boolean) => {
    if (enabled) {
      localStorage.setItem('koiny_premium_active', 'true');
    } else {
      localStorage.removeItem('koiny_premium_active');
    }
    setData(prev => ({ ...prev, isPremium: enabled, updatedAt: new Date().toISOString() }));
  };

  const handleLoginSuccess = async (demoData?: GlobalState) => {
    setLoading(true);
    if (demoData) {
      localStorage.removeItem('kidbank_data_demo');
      setData(demoData);
      setOwnerId('demo');
      // Demo data stays in React state only — do NOT persist to local storage
      // to prevent demo children from bleeding into real accounts on next login
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
      {currentAlert && (
        <div style={{ padding: '16px 24px', maxWidth: '1100px', margin: '0 auto' }}>
          <AlertBanner
            type={currentAlert.type}
            message={currentAlert.message}
            onClose={() => setCurrentAlert(null)}
          />
        </div>
      )}
      {view === 'PARENT' && (
        <ParentView
          data={data} ownerId={ownerId} language={data.language} onApprove={handleApprove} onReject={handleReject} onAddMission={handleAddMission}
          onDeleteActiveMission={handleDeleteActiveMission} onEditMission={handleEditMission} onManualTransaction={handleManualTransaction} onAddChild={handleAddChild}
          onEditChild={handleEditChild} onDeleteGoal={handleDeleteGoal} onArchiveGoal={handleArchiveGoal} onDeleteChild={handleDeleteChild} onSetPin={handleSetPin} onClearHistory={handleClearHistory}
          onUpdatePassword={async (p) => { await updatePassword(p); }} onDeleteAccount={async () => { await deleteAccount(); localStorage.removeItem('koiny_last_view'); localStorage.removeItem('koiny_last_child_id'); setData(INITIAL_DATA); setOwnerId(undefined); setView('LANDING'); }}
          onExit={handleLogout} onTutorialComplete={handleParentTutorialComplete} onToggleSound={handleToggleSound} onSetLanguage={setLanguage}
          onUpdateMaxBalance={handleUpdateMaxBalance}
          onSetPremium={handleSetPremium}
          notificationAction={notificationAction} onClearNotificationAction={() => setNotificationAction(null)}
          onSignOut={handleFullSignOut}
          isOfflineMode={isOfflineMode}
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
