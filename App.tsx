
import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './components/LoginView';
import AuthView from './components/AuthView';
import ChildView from './components/ChildView';
import AndroidChildView from './components/AndroidChildView';
import ParentView from './components/ParentView';
import AndroidParentView from './components/AndroidParentView';
import LandingView from './components/LandingView';
import OnboardingView from './components/OnboardingView';
import OnboardingModal from './components/OnboardingModal';
import LegalModal from './components/LegalModal';
import AlertBanner from './components/AlertBanner';
import { GlobalState, INITIAL_DATA, HistoryEntry, ChildProfile, Language, Goal, BADGE_THRESHOLDS, ParentBadge, MAX_BALANCE } from './types';
import { loadData, saveData, persistentStorage } from './services/storage';
import { updateWidgetData } from './services/widgetBridge';
import { getSupabase, updatePassword, deleteAccount, ensureUserProfile, recordDeletion, recordDeletions, restInsert } from './services/supabase';
import { alertService, AppAlert } from './services/alertService';
import { notifications } from './services/notifications';
import { getContextualReminder } from './services/smartReminder';
import { trackSignUp, trackChildCreated, trackPurchase } from './services/analytics';
import { translations } from './i18n';
import { monitoring } from './services/monitoring';
import { widgetService } from './services/widget';
import { saveParentPinLocally, loadParentPinLocally } from './services/pinStorage';
import { hashPin } from './services/security';
import { subscriptionService } from './services/subscription';
import { Capacitor } from '@capacitor/core';
import { isAndroid } from './hooks/usePlatform';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Network } from '@capacitor/network';
import { registerPushToken, sendPushNewMission, sendPushMissionComplete, sendPushMissionApproved, sendPushMissionRejected, sendPushMissionRequested, sendPushGiftRequested, unregisterPushToken } from './services/pushService';

type ViewState = 'LANDING' | 'AUTH' | 'LOGIN' | 'CHILD' | 'PARENT';

// Garde un await réseau de ne jamais hang indéfiniment : sur réseau flaky (Huawei),
// un `await supabase...delete()` qui ne se résout jamais laisserait le guard
// `isDirectSupabaseOperation` coincé sur true → tous les saves bloqués. Le tombstone
// garde l'item caché de toute façon, donc on peut abandonner le delete réseau après N ms.
const raceTimeout = <T,>(p: PromiseLike<T>, ms = 8000): Promise<T | { timedOut: true }> =>
  Promise.race([Promise.resolve(p), new Promise<{ timedOut: true }>((resolve) => setTimeout(() => resolve({ timedOut: true }), ms))]);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [data, setData] = useState<GlobalState>(INITIAL_DATA);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const [isOverflowing, setIsOverflowing] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChildId, setOnboardingChildId] = useState<string | null>(null);
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
    // Garde-fou anti-blocage : si un await ci-dessous HANG (ex: RevenueCat ne répond
    // pas sur iOS après une perturbation de session), le `finally` ne s'exécuterait
    // jamais → isInitializing resterait `true` → TOUS les saves bloqués → perte de
    // données (vu le 11/06 : missions iPhone non sauvegardées tant que l'app n'était
    // pas relancée). Ce timeout libère le guard de force après 15s quoi qu'il arrive.
    const initGuardSafety = setTimeout(() => {
      if (isInitializing.current) {
        console.warn('⚠️ [INIT] Garde-fou : libération forcée de isInitializing après 15s (un await a hang)');
        isInitializing.current = false;
        // Si une session était en attente (ex: connexion Google arrivée pendant un init
        // précédent qui a hang), la traiter maintenant — sinon elle reste bloquée en file
        // jusqu'à un fermer/rouvrir. Le finally normal ne tournera pas (await hang).
        const pending = pendingSessionRef.current;
        if (pending) {
          pendingSessionRef.current = null;
          console.warn('⚠️ [INIT] Garde-fou : traitement de la session en attente après libération forcée');
          setTimeout(() => initialize(pending), 0);
        }
      }
    }, 15000);

    try {
      // Sentinel de suppression de compte : si on vient de supprimer un compte, on PURGE
      // tout cache résiduel et on saute la restauration optimiste — empêche un ancien PIN
      // gate / des données périmées de bleeder sur une reconnexion immédiate (même appareil).
      const justDeleted = localStorage.getItem('koiny_account_deleted') === '1';
      if (justDeleted) {
        localStorage.removeItem('koiny_account_deleted');
        persistentStorage.remove('koiny_account_deleted').catch(() => {});
        localStorage.removeItem('koiny_local_v1');
        localStorage.removeItem('koiny_local_v1_backup');
        localStorage.removeItem('koiny_last_view');
        localStorage.removeItem('koiny_last_child_id');
        persistentStorage.remove('koiny_local_v1').catch(() => {});
        persistentStorage.remove('koiny_local_v1_backup').catch(() => {});
        console.log('🧹 [INIT] Sentinel suppression : cache purgé, restauration optimiste sautée');
      }

      // 1. Stratégie Optimiste : Afficher le cache immédiatement si disponible
      const cached = justDeleted ? null : localStorage.getItem('koiny_local_v1');
      const cachedView = justDeleted ? null : localStorage.getItem('koiny_last_view');
      const cachedChildId = justDeleted ? null : localStorage.getItem('koiny_last_child_id');

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

      // 🚦 Navigation PROVISOIRE basée sur la SESSION, AVANT loadData.
      // Juste après une connexion OAuth (Google), loadData() peut HANG dans la fenêtre
      // post-OAuth sur Android → si la navigation est gérée après loadData, l'user reste
      // bloqué sur l'écran login (et ne voit le dashboard qu'après fermer/rouvrir, car au
      // cold start la session se lit proprement). On route donc IMMÉDIATEMENT dès qu'une
      // session valide existe, à partir du cache enfants. loadData affinera ensuite.
      if (session?.user && (!cachedView || cachedView === 'LANDING')) {
        let cachedChildrenCount = 0;
        try {
          const c = localStorage.getItem('koiny_local_v1');
          if (c) cachedChildrenCount = (JSON.parse(c).children || []).length;
        } catch { /* cache absent/corrompu → 0 */ }
        setView(cachedChildrenCount > 0 ? 'LOGIN' : 'PARENT');
        setLoading(false);
        SplashScreen.hide();
        console.log('🚦 [INIT] Navigation provisoire (session valide) avant loadData');
        // Si cache vide (nouveau user ou compte supprimé) → préparer onboarding
        // Note: setShowOnboarding sera confirmé après loadData (enfants cloud vides)
        if (cachedChildrenCount === 0) {
          setShowOnboarding(true);
        }
      }

      console.log('📦 [INIT] Chargement des données cloud en arrière-plan...');
      const result = await loadData(session?.user?.id, session?.access_token);

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

      // Ajuster l'onboarding selon les données CLOUD (source de vérité)
      // Si le cloud confirme children=0 → garder modal ouvert
      // Si le cloud trouve des enfants → fermer le modal (user existant, cache était juste vide)
      if (session?.user && result.ownerId && result.ownerId !== 'demo') {
        const hasCloudChildren = (cloudData.children?.length ?? 0) > 0;
        if (hasCloudChildren) {
          setShowOnboarding(false); // user existant, pas besoin d'onboarding
        } else {
          setShowOnboarding(true);  // vraiment nouveau user / profil recréé
        }
      }

      // Sync langue → profiles (pour les emails de re-engagement)
      const supabaseClient = getSupabase();
      const effectiveLang = savedLanguage || cloudData.language || 'fr';
      if (supabaseClient && result.ownerId && result.ownerId !== 'local-owner') {
        supabaseClient.from('profiles').update({ language: effectiveLang }).eq('id', result.ownerId).then(() => {});
      }

      // Navigation immédiate — AVANT RevenueCat pour ne pas bloquer si RevenueCat hang sur Android
      if (!cachedView || cachedView === 'LANDING') {
        if (session) {
          const hasChildren = (cloudData.children?.length ?? 0) > 0;
          setView(hasChildren ? 'LOGIN' : 'PARENT');
          // Nouveau user ou profil supprimé/recréé → forcer l'onboarding
          if (!hasChildren && result.ownerId && result.ownerId !== 'demo') {
            setShowOnboarding(true);
          }
        } else {
          const hasLocalChildren = result.data?.children?.length > 0;
          if (hasLocalChildren) setView('LOGIN');
          else setView('LANDING');
        }
      }

      // Initialiser RevenueCat avec timeout 8s — évite de bloquer initialize() si RevenueCat hang
      // (sur Android au cold start, les 3 await RevenueCat peuvent ne jamais résoudre,
      // empêchant le finally de tourner et laissant pendingSessionRef non traité → pas de navigation)
      try {
        const rcTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 8000));
        const rcResult = await Promise.race([
          (async () => {
            await subscriptionService.initialize(result.ownerId);
            if (result.ownerId && result.ownerId !== 'local-owner' && result.ownerId !== 'demo') {
              await subscriptionService.loginUser(result.ownerId);
            }
            return subscriptionService.getSubscriptionStatus();
          })(),
          rcTimeout
        ]);
        if (rcResult && rcResult.isSubscribed) {
          localStorage.setItem('koiny_premium_active', 'true');
          localStorage.setItem('koiny_premium_verified_at', Date.now().toString());
          setData(prev => ({ ...prev, isPremium: true }));
        } else if (rcResult !== null) {
          // Réponse reçue mais pas abonné — reset explicite
          localStorage.removeItem('koiny_premium_active');
          localStorage.removeItem('koiny_premium_verified_at');
          setData(prev => ({ ...prev, isPremium: false }));
        }
        // rcResult === null = timeout — on garde l'état premium du cache localStorage
      } catch (e) {
        console.warn('⚠️ [INIT] RevenueCat init failed (non-blocking):', e);
        // Si la dernière vérification réussie date de plus de 7 jours, révoquer le premium
        const lastVerified = parseInt(localStorage.getItem('koiny_premium_verified_at') || '0');
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastVerified > sevenDays) {
          localStorage.removeItem('koiny_premium_active');
          localStorage.removeItem('koiny_premium_verified_at');
          setData(prev => ({ ...prev, isPremium: false }));
        }
      }

      // Sync widget data on initial load
      if (cloudData.children?.length > 0) {
        const lang = savedLanguage || cloudData.language || 'fr';
        updateWidgetData(cloudData.children, lang, cloudData.currency, activeChildId);
      }

      // Enregistrer le token push en mode parent
      if (result.ownerId && result.ownerId !== 'local-owner' && result.ownerId !== 'demo') {
        registerPushToken({ userId: result.ownerId, mode: 'parent' });
      }

    } catch (err) {
      console.error("❌ [INIT] Erreur:", err);
      // Ne pas bloquer si on a déjà des données du cache
      if (!localStorage.getItem('koiny_local_v1')) {
        setCriticalError("Problème de connexion.");
      }
    } finally {
      clearTimeout(initGuardSafety);
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
        localStorage.setItem('koiny_premium_verified_at', Date.now().toString());
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

    // 🔔 Rappel hebdo "rolling" — message CONTEXTUEL selon le dernier profil ouvert
    // (parent/enfant) et l'état des données. Fallback = message générique actuel.
    const t = translations[data.language || 'fr'];
    const reminder = getContextualReminder(data, {
      title: t.parent.notifications.push.weeklyReminderTitle,
      body: t.parent.notifications.push.weeklyReminderBody,
    });
    notifications.scheduleWeeklyReminder(reminder.title, reminder.body);

    return () => clearInterval(interval);
  }, [data.children, data.lastReminderSent, loading]);

  // 🎂 Birthday bonus: check on init + foreground, credit once per year
  useEffect(() => {
    if (loading || !data.children.length) return;
    const checkBirthdays = () => {
      const now = new Date();
      const todayMonth = now.getMonth() + 1;
      const todayDay = now.getDate();
      const currentYear = now.getFullYear();
      const t = translations[data.language || 'fr'];
      const BIRTHDAY_BONUS = 5;

      const childrenWithBirthday = data.children.filter(c => {
        if (!c.birthday) return false;
        const [, m, d] = c.birthday.split('-').map(Number);
        return m === todayMonth && d === todayDay && c.lastBirthdayRewardYear !== currentYear;
      });

      if (!childrenWithBirthday.length) return;

      setData(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        children: prev.children.map(child => {
          if (!childrenWithBirthday.find(c => c.id === child.id)) return child;
          const newBalance = Math.min((child.balance || 0) + BIRTHDAY_BONUS, prev.maxBalance || 100);
          const credited = newBalance - (child.balance || 0);
          notifications.notifyParentReminder(
            t.child.happyBirthday,
            `${child.name}: +${credited}${prev.currency || '€'} ${t.child.birthdayBonus}`
          );
          return {
            ...child,
            balance: newBalance,
            lastBirthdayRewardYear: currentYear,
            history: [
              { id: crypto.randomUUID(), date: now.toISOString(), createdAt: now.toISOString(), title: t.child.birthdayBonus, amount: credited },
              ...child.history,
            ],
          };
        }),
      }));
    };
    checkBirthdays();
    const onVis = () => { if (document.visibilityState === 'visible') checkBirthdays(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [data.children, data.language, data.currency, data.maxBalance, loading]);

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

      // Tap sur une push FCM (cross-device) → même routage que les notifs locales
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const pdata = action.notification.data || {};
        const type = pdata.type;
        if (!type) return;

        // Notifs destinées à l'enfant → vue enfant
        if (type === 'NEW_MISSION' || type === 'MISSION_APPROVED' || type === 'MISSION_REJECTED') {
          if (pdata.childId) {
            setActiveChildId(pdata.childId);
            setView('CHILD');
          }
          return;
        }

        // Notifs destinées au parent (mission terminée / demandée, cadeau) → vue parent
        setView('PARENT');
        setActiveChildId(null);
        setNotificationAction({ type, childId: pdata.childId });
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
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setView('AUTH');
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Bug B (cold-start logout) : au lancement à froid, INITIAL_SESSION peut
        // arriver avec session=null alors qu'une session valide EXISTE en storage
        // mais que la récupération supabase-js n'a pas encore résolu. Résultat vécu :
        // écran AUTH au 1er lancement → l'user devait fermer/relancer pour être
        // reconnecté. Fix : si INITIAL_SESSION arrive SANS session, on retente
        // getSession() une fois (la lecture est ~instantanée avec le storage hybride)
        // avant de conclure à une déconnexion. Aucun impact sur un vrai user
        // déconnecté : getSession() renverra null aussi → initialize(null) comme avant.
        let s = session;
        if (event === 'INITIAL_SESSION' && !s) {
          await new Promise(r => setTimeout(r, 400));
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Session timeout')), 3000)
            );
            const { data: retry } = await Promise.race([sessionPromise, timeoutPromise]);
            if (retry?.session) {
              console.log('🔄 [AUTH] INITIAL_SESSION null mais session récupérée au retry — reconnexion auto');
              s = retry.session;
            }
          } catch (_) { /* garde s=null → flux déconnecté normal */ }
        }
        // Handles both null (no session) and valid session
        await initialize(s);
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
  const isForegroundReloadingRef = React.useRef(false);
  // Retry de sauvegarde : si un save est bloqué par un guard transitoire, on le
  // re-tente au lieu de l'abandonner (sinon la modif — ex: mission créée pendant
  // un reload — est perdue, puis effacée au rechargement WebView). BORNÉ : si un
  // guard reste coincé (réseau hang), on n'enchaîne pas une boucle infinie.
  const saveRetryRef = React.useRef<any>(null);
  const saveRetryCountRef = React.useRef(0);
  // Marque les données qui viennent d'être appliquées depuis le cloud (foreground
  // reload) : on ne les re-pousse PAS (sinon ping-pong reload→save→reload).
  const skipNextSaveRef = React.useRef(false);

  // Ref toujours à jour vers les données courantes (évite les closures périmées
  // dans les listeners qui doivent comparer les timestamps)
  const dataRef = React.useRef(data);
  React.useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const runSave = async () => {
      // Données venant d'être appliquées depuis le cloud (foreground reload) :
      // ne pas les re-pousser → évite le ping-pong reload→save→reload.
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }

      // Guard transitoire (reload en cours, opération directe, init, save déjà en
      // cours) : NE PAS abandonner le save (sinon la modif est perdue puis effacée
      // au rechargement WebView). On le re-tente — mais BORNÉ avec backoff : si un
      // guard reste coincé (réseau hang), on arrête après ~8 essais pour ne pas
      // boucler à l'infini (le prochain changement de `data` ou la convergence
      // loadData→cloud rattrapera la sauvegarde).
      if (isSavingRef.current || isReloadingFromRealtime.current || isDirectSupabaseOperation.current || isInitializing.current) {
        const blockedBy = [
          isSavingRef.current && 'saving',
          isReloadingFromRealtime.current && 'reloading',
          isDirectSupabaseOperation.current && 'directOp',
          isInitializing.current && 'initializing',
        ].filter(Boolean).join('+');
        if (saveRetryCountRef.current >= 8) {
          console.log(`🛑 [APP] Save blocked (${blockedBy}) — retry abandonné après 8 essais`);
          saveRetryCountRef.current = 0;
          return;
        }
        const delay = Math.min(600 * 2 ** saveRetryCountRef.current, 5000); // backoff 600ms→5s
        saveRetryCountRef.current += 1;
        console.log(`🛑 [APP] Save blocked (${blockedBy}) — retry ${saveRetryCountRef.current}/8 dans ${delay}ms`);
        if (saveRetryRef.current) clearTimeout(saveRetryRef.current);
        saveRetryRef.current = setTimeout(() => { runSave(); }, delay);
        return;
      }

      if (saveRetryRef.current) { clearTimeout(saveRetryRef.current); saveRetryRef.current = null; }
      saveRetryCountRef.current = 0;
      isSavingRef.current = true;
      try {
        if (!loading && view !== 'AUTH' && view !== 'LANDING' && !criticalError && ownerId !== 'demo') {
          const changes = await saveData(data, ownerId, immediateSave);
          updateWidgetData(data.children, data.language, data.currency, activeChildId);

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
    return () => { if (saveRetryRef.current) { clearTimeout(saveRetryRef.current); saveRetryRef.current = null; } };
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

  // 🔄 Foreground reload — re-télécharge les données cloud quand l'app revient au
  // premier plan (retour à l'app, ou tap sur une push). Permet à un 2ème appareil
  // (QR / co-parent) de voir les changements de l'autre. loadData compare déjà les
  // timestamps : on n'applique que si le cloud est STRICTEMENT plus récent que ce
  // qu'on a en mémoire — jamais d'écrasement d'une modif locale non sauvegardée.
  useEffect(() => {
    const reloadFromCloud = async () => {
      // Ne rien faire si on n'est pas dans un état synchronisable
      if (loading || view === 'AUTH' || view === 'LANDING') return;
      if (!ownerId || ownerId === 'demo' || ownerId === 'local-owner') return;
      // Pas de rechargement concurrent, ni pendant une écriture/init en cours
      if (isForegroundReloadingRef.current) return;
      if (isSavingRef.current || isDirectSupabaseOperation.current || isInitializing.current) return;

      isForegroundReloadingRef.current = true;
      try {
        const result = await loadData(ownerId);
        const incoming = result.data;
        const currentTs = dataRef.current?.updatedAt ? new Date(dataRef.current.updatedAt).getTime() : 0;
        const incomingTs = incoming?.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;

        // Appliquer seulement si le cloud est plus récent ET qu'aucune écriture
        // locale n'a démarré pendant le téléchargement (anti-écrasement)
        if (incoming && incomingTs > currentTs && !isSavingRef.current && !isDirectSupabaseOperation.current) {
          console.log('🔄 [APP] Foreground reload: cloud plus récent, mise à jour');
          isReloadingFromRealtime.current = true; // bloque le save-auto déclenché par ce setData
          skipNextSaveRef.current = true; // ces données viennent du cloud → ne pas les re-pousser
          setData(prev => ({ ...incoming, language: prev.language, isPremium: prev.isPremium }));
          setTimeout(() => { isReloadingFromRealtime.current = false; }, 200);
        } else {
          console.log('🔄 [APP] Foreground reload: rien de nouveau');
        }
      } catch (e) {
        console.warn('⚠️ [APP] Foreground reload échoué:', e);
      } finally {
        isForegroundReloadingRef.current = false;
      }
    };

    const onVis = () => { if (document.visibilityState === 'visible') reloadFromCloud(); };
    document.addEventListener('visibilitychange', onVis);

    // Sur natif, appStateChange est plus fiable que visibilitychange au resume
    let nativeHandle: any;
    if (Capacitor.isNativePlatform()) {
      nativeHandle = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) reloadFromCloud();
      });
    }

    // Polling premier plan — couvre le cas "2 appareils ouverts en même temps" :
    // ni l'un ni l'autre ne passe en arrière-plan, donc visibilitychange/appStateChange
    // ne se déclenchent jamais. On recharge le cloud toutes les 5s tant que l'app est
    // visible. reloadFromCloud a déjà tous les garde-fous (anti-écrasement, n'applique
    // que si cloud strictement plus récent) → aucun risque d'écraser une modif locale.
    const pollId = setInterval(() => {
      if (document.visibilityState === 'visible') reloadFromCloud();
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (nativeHandle) nativeHandle.then((h: any) => h.remove());
      clearInterval(pollId);
    };
  }, [ownerId, loading, view]);

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

    // Block general saveData while Supabase IIFE runs (same pattern as handleManualTransaction)
    if (userId) isDirectSupabaseOperation.current = true;

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
              createdAt: new Date().toISOString(),
              title: mission.title + titleSuffix,
              amount: effectiveReward,
              note: note
            }, ...c.history],
            missions: c.missions.filter(m => m.id !== missionId)
          };
        })
      };
    });

    if (userId) {
      sendPushMissionApproved({ userId, childId, missionTitle: mission.title, reward: effectiveReward, currency: data.currency || '€', note, language: data.language });
    }

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
          const isNetworkError = !err?.status || err?.message?.includes('Failed to fetch') || err?.message?.includes('network');
          if (isNetworkError) {
            setIsOfflineMode(true);
          }
        } finally {
          isDirectSupabaseOperation.current = false;
          setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
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
      balance: Math.max(0, Math.min(data.maxBalance === 0 ? Infinity : (data.maxBalance || MAX_BALANCE), Number((child.balance + effectiveAmount).toFixed(2)))),
      history: [{
        id: transactionId,
        date: dateFormatted,
        createdAt: new Date().toISOString(),
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
          isDirectSupabaseOperation.current = false;
          // Re-trigger saveData to flush balance to local storage + Supabase children.balance
          setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
        }
      })();
    }
  };

  const setLanguage = async (lang: Language) => {
    // Sync widget with new language BEFORE updating state
    if (data.children?.length > 0) {
      await updateWidgetData(data.children, lang, data.currency, activeChildId);
    }
    // THEN update state
    setData(prev => ({
      ...prev,
      language: lang,
      updatedAt: new Date().toISOString()
    }));
    localStorage.setItem('koiny_language', lang);
    // Persist language to profiles table (used by re-engagement emails)
    const supabase = getSupabase();
    if (supabase && ownerId) {
      supabase.from('profiles').update({ language: lang }).eq('id', ownerId).then(() => {});
    }
  };
  const setCurrency = (symbol: string) => {
    setData(prev => ({ ...prev, currency: symbol, updatedAt: new Date().toISOString() }));
  };

  const handleLogout = () => { setActiveChildId(null); setView('LOGIN'); monitoring.track('BUSINESS', 'PROFILE_SWITCH', 1, { direction: 'child_to_parent' }); };
  const handleFullSignOut = async () => {
    const supabase = getSupabase();

    // Naviguer immédiatement — le cleanup se fait en arrière-plan
    setData(INITIAL_DATA);
    setOwnerId(undefined);
    setView('AUTH');

    if (supabase) {
      try {
        // getSession() devrait être caché localement, mais timeout au cas où
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        );
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
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

    // Nettoyer le token push
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
      const mode = view === 'CHILD' ? 'child' : 'parent';
      unregisterPushToken({ userId: ownerId, mode, childId: activeChildId || undefined }).catch(() => {});
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
  const handleMissionComplete = (id: string) => {
    updateChild(activeChildId!, (child) => ({ ...child, missions: child.missions.map(m => m.id === id ? { ...m, status: 'PENDING', feedback: undefined } : m) }));
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo' && activeChildId) {
      const child = data.children.find(c => c.id === activeChildId);
      const mission = child?.missions.find(m => m.id === id);
      if (child && mission) {
        sendPushMissionComplete({ userId: ownerId, childId: child.id, childName: child.name, missionTitle: mission.title, language: data.language });
      }
    }
  };
  const handleReject = (childId: string, missionId: string, note?: string) => {
    updateChild(childId, (child) => ({ ...child, missions: child.missions.map(m => m.id === missionId ? { ...m, status: 'ACTIVE', feedback: note } : m) }));
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
      const child = data.children.find(c => c.id === childId);
      const mission = child?.missions.find(m => m.id === missionId);
      if (child && mission) {
        sendPushMissionRejected({ userId: ownerId, childId, missionTitle: mission.title, note, language: data.language });
      }
    }
  };
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
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
      sendPushNewMission({ userId: ownerId, childId, missionTitle: title, reward: amount, currency: data.currency || '€', language: data.language });
    }

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
          const isNetworkError = !err?.status || err?.message?.includes('Failed to fetch') || err?.message?.includes('network');
          if (isNetworkError) setIsOfflineMode(true);
        } finally {
          isDirectSupabaseOperation.current = false;
          setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
        }
      })();
    }
  };
  const handleDeleteActiveMission = async (childId: string, missionId: string) => {
    const supabase = getSupabase();

    // Bloquer le save automatique
    isDirectSupabaseOperation.current = true;

    // ⭐ Optimistic : retirer localement D'ABORD. Avant, le delete réseau passait
    // en premier ; s'il throwait (contrainte/RLS sur `missions`), le retrait local
    // était sauté → la mission ne disparaissait jamais (corbeille "inactive").
    updateChild(childId, (child) => ({
      ...child,
      missions: child.missions.filter(m => m.id !== missionId)
    }));

    // Tombstone : empêche la résurrection (garde la mission cachée même si le
    // delete cloud échoue ou si l'autre appareil l'a encore en cache).
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
      recordDeletion(ownerId, 'mission', missionId);
    }

    try {
      // Delete cloud best-effort — n'empêche jamais le retrait local. Timeout pour
      // ne pas laisser le guard coincé si le réseau hang (tombstone garde caché).
      if (missionId.includes('-')) {
        const res: any = await raceTimeout(supabase.from('missions').delete().eq('id', missionId));
        if (res?.timedOut) console.warn('⚠️ Suppression mission cloud timeout (tombstone garde caché)');
        else if (res?.error) console.warn('⚠️ Suppression mission cloud échouée (tombstone garde caché):', res.error.message);
      }
    } catch (err: any) {
      console.warn('⚠️ Erreur suppression mission cloud (tombstone garde caché):', err?.message);
    } finally {
      isDirectSupabaseOperation.current = false;
      setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
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

    // ⭐ Optimistic : retirer localement D'ABORD (l'UI ne doit jamais attendre le
    // réseau). Le tombstone garde l'objectif caché même si le delete cloud échoue.
    updateChild(childId, (child) => ({
      ...child,
      goals: child.goals.filter(g => g.id !== goalId)
    }));
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
      recordDeletion(ownerId, 'goal', goalId);
    }

    try {
      // Delete cloud best-effort (timeout anti-hang, tombstone garde caché).
      if (goalId.includes('-')) {
        const res: any = await raceTimeout(supabase.from('goals').delete().eq('id', goalId));
        if (res?.timedOut) console.warn('⚠️ Suppression objectif cloud timeout (tombstone garde caché)');
        else if (res?.error) console.warn('⚠️ Suppression objectif cloud échouée (tombstone garde caché):', res.error.message);
      }
    } catch (err: any) {
      console.warn('⚠️ Erreur suppression objectif cloud (tombstone garde caché):', err?.message);
    } finally {
      isDirectSupabaseOperation.current = false;
      setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
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
      // 1. Supprimer dans Supabase (timeout anti-hang pour ne pas coincer le guard)
      const res: any = await raceTimeout(supabase.from('children').delete().eq('id', id));
      if (res?.timedOut) throw new Error('Suppression enfant timeout réseau');
      if (res?.error) throw new Error(`Suppression enfant echouée : ${res.error.message}`);

      // Tombstone : empêche la résurrection de l'enfant sur l'autre appareil
      if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
        recordDeletion(ownerId, 'child', id);
      }

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
      console.error('❌ Erreur suppression enfant:', err?.message);
    } finally {
      isDirectSupabaseOperation.current = false;
    }
  };
  // Fonctionnalité "Effacer l'historique" RETIRÉE (09/06/2026) : le solde de l'enfant
  // est dérivé de l'historique (somme des transactions), donc effacer l'historique
  // entrait en conflit avec préserver le solde. Le contournement "Solde reporté" se
  // battait contre la sync multi-appareils (doublements, races) → trop fragile.
  // Pour désencombrer, l'utilisateur a déjà le filtre "CE MOIS / TOUT". No-op conservé
  // pour ne pas casser les props onClearHistory existantes.
  const handleClearHistory = (_id: string) => { /* retiré — voir filtre CE MOIS/TOUT */ };
  const showAppError = (msg: string) => {
    setAppError(msg);
    setTimeout(() => setAppError(null), 5000);
  };

  const handleAddChild = async (childData: any): Promise<string | undefined> => {
    const supabase = getSupabase();

    // Utilise ownerId du state React (déjà connu, pas besoin de getSession qui hang sur Android)
    const userId = ownerId;
    if (!userId || userId === 'demo' || userId === 'local-owner') {
      showAppError('Vous n\'êtes pas connecté.');
      return;
    }
    // Objet user minimal pour la suite du code
    const user = { id: userId };

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
      // 1. INSERT via REST brut (bypass supabase-js qui appelle getSession() → hang Android)
      const { error } = await restInsert('children', childPayload);
      if (error) throw new Error(error);

      // 2. Update local state
      setData(prev => {
        const isFirstChild = prev.children.length === 0;
        monitoring.track('BUSINESS', 'CHILD_CREATED', 1, { isFirstChild });
        trackChildCreated(isFirstChild);
        return {
          ...prev,
          children: [...prev.children, {
            id: childId,
            ...childData,
            balance: 0,
            goals: [],
            missions: [],
            history: [],
            tutorialSeen: false
          }]
        };
      });
    } catch (err: any) {
      console.error('❌ Erreur ajout enfant:', err?.message);
      showAppError(`Impossible de créer l'enfant : ${err?.message || 'Erreur inconnue'}`);
      return undefined;
    } finally {
      isDirectSupabaseOperation.current = false;
      setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
    }
    return childId;
  };
  const handlePurchaseGoal = async (childId: string, goal: Goal) => {
    const supabase = getSupabase();
    // timeout getSession to avoid hang on Android/iOS
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session timeout')), 5000)
    );
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
    const user = session?.user;
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
          createdAt: new Date().toISOString(),
          title: `Achat : ${goal.name}`,
          amount: -goal.target
        }, ...c.history]
      }));
    } catch (err: any) {
      console.error('❌ Erreur achat objectif:', err?.message);
    } finally {
      isDirectSupabaseOperation.current = false;
      setData(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
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

    // Sauvegarder LOCALEMENT sur cet appareil — fire-and-forget pour ne pas bloquer l'UI
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) saveParentPinLocally(user.id, pinToStore)
          .then(() => console.log('✅ [APP] PIN sauvegardé localement'))
          .catch(e => console.error('❌ [APP] Erreur sauvegarde PIN local:', e));
      }).catch(e => console.error('❌ [APP] getUser error in handleSetPin:', e));
    }
  };
  const handleToggleSound = (enabled: boolean) => setData(prev => ({ ...prev, soundEnabled: enabled, updatedAt: new Date().toISOString() }));
  const handleToggleNotifications = (enabled: boolean) => setData(prev => ({ ...prev, notificationsEnabled: enabled, updatedAt: new Date().toISOString() }));
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
      monitoring.track('BUSINESS', 'AUTH_SUCCESS', 1, { isFirstSession: !result.data?.children?.length });
      trackSignUp('google');
      if (!result.data?.children?.length && result.ownerId && result.ownerId !== 'demo') {
        setShowOnboarding(true);
      }
      // Track onboarding completion at login if onboarding was seen but not yet tracked
      if (localStorage.getItem('koiny_onboarding_seen') && result.ownerId && result.ownerId !== 'demo') {
        const profileUpdate: Record<string, any> = { onboarding_completed_at: new Date().toISOString() };
        if (localStorage.getItem('koiny_marketing_consent')) {
          profileUpdate.marketing_consent = true;
          localStorage.removeItem('koiny_marketing_consent');
        }
        getSupabase().from('profiles').update(profileUpdate).eq('id', result.ownerId).then(() => {});
        monitoring.track('BUSINESS', 'ONBOARDING_COMPLETED');
      }
    }
    setLoading(false);
    setView('PARENT');
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

  const handleRequestGift = () => {
    updateChild(activeChildId!, (child) => ({ ...child, giftRequested: true }));
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo' && activeChildId) {
      const child = data.children.find(c => c.id === activeChildId);
      if (child) sendPushGiftRequested({ userId: ownerId, childId: child.id, childName: child.name, language: data.language });
    }
  };
  const handleRequestMission = () => {
    updateChild(activeChildId!, (child) => ({ ...child, missionRequested: true }));
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo' && activeChildId) {
      const child = data.children.find(c => c.id === activeChildId);
      if (child) sendPushMissionRequested({ userId: ownerId, childId: child.id, childName: child.name, language: data.language });
    }
  };
  const handleSelectChild = (childId: string) => {
    localStorage.setItem('koiny_last_view', 'CHILD');
    localStorage.setItem('koiny_last_child_id', childId);
    setActiveChildId(childId);
    setView('CHILD');
    monitoring.track('BUSINESS', 'PROFILE_SWITCH', 1, { direction: 'parent_to_child' });
    if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
      registerPushToken({ userId: ownerId, mode: 'child', childId });
    }
  };

  return (
    <div className={`min-h-screen ${isOverflowing ? 'overflow-active' : ''}`}>
      {showOnboarding && (
        <OnboardingModal
          language={(data.language as 'fr' | 'nl' | 'en') || 'fr'}
          onAddChild={async (childData) => {
            try {
              const newId = await handleAddChild(childData);
              if (newId) setOnboardingChildId(newId);
            } catch (err) {
              console.error('❌ OnboardingModal.onAddChild error:', err);
              showAppError(`Erreur : ${err instanceof Error ? err.message : 'Impossible de créer l\'enfant'}`);
            }
          }}
          onAddMission={(childId, mission) => {
            handleAddMission(childId, mission.title, mission.amount);
          }}
          createdChildId={onboardingChildId}
          onDone={() => setShowOnboarding(false)}
        />
      )}
      {view === 'LANDING' && (
        !localStorage.getItem('koiny_onboarding_seen')
          ? <OnboardingView
            language={data.language}
            onSetLanguage={setLanguage}
            onComplete={(marketingConsent) => {
              localStorage.setItem('koiny_onboarding_seen', '1');
              if (marketingConsent) {
                localStorage.setItem('koiny_marketing_consent', '1');
              }
              setView('AUTH');
            }}
          />
          : <AuthView language={data.language} onSetLanguage={setLanguage} onLoginSuccess={handleLoginSuccess} isPasswordRecovery={false} onPasswordReset={() => setIsPasswordRecovery(false)} />
      )}
      {view === 'AUTH' && <AuthView language={data.language} onSetLanguage={setLanguage} onLoginSuccess={handleLoginSuccess} isPasswordRecovery={isPasswordRecovery} onPasswordReset={() => setIsPasswordRecovery(false)} />}
      {view === 'LOGIN' && <LoginView data={data} onSelectChild={handleSelectChild} onParentAccess={() => setView('PARENT')} />}
      {view === 'CHILD' && (
        data.children.find(c => c.id === activeChildId) ? (
          isAndroid ? (
            <AndroidChildView
              data={data.children.find(c => c.id === activeChildId)!}
              language={data.language}
              currency={data.currency || '€'}
              onCompleteMission={handleMissionComplete}
              onLogout={handleLogout}
              onTutorialComplete={handleChildTutorialComplete}
              onSetPrimaryGoal={(gid) => handleSetGoalPrimary(activeChildId!, gid)}
              soundEnabled={data.soundEnabled}
              onPurchaseGoal={(g) => handlePurchaseGoal(activeChildId!, g)}
              onRequestGift={handleRequestGift}
              onRequestMission={handleRequestMission}
            />
          ) : (
            <ChildView
              data={data.children.find(c => c.id === activeChildId)!} language={data.language} currency={data.currency || '€'} onCompleteMission={handleMissionComplete} onLogout={handleLogout} onTutorialComplete={handleChildTutorialComplete} onSetPrimaryGoal={(gid) => handleSetGoalPrimary(activeChildId!, gid)} soundEnabled={data.soundEnabled} onPurchaseGoal={(g) => handlePurchaseGoal(activeChildId!, g)} onRequestGift={handleRequestGift} onRequestMission={handleRequestMission}
            />
          )
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
      {view === 'PARENT' && isAndroid && (
        <AndroidParentView
          data={data} language={data.language}
          onApprove={(childId, missionId, note) => handleApprove(childId, missionId, note)}
          onReject={(childId, missionId, note) => handleReject(childId, missionId, note)}
          onAddMission={(childId, title, amount) => handleAddMission(childId, title, amount)}
          onEditMission={(childId, missionId, updates) => handleEditMission(childId, missionId, updates)}
          onDeleteMission={(childId, missionId) => handleDeleteActiveMission(childId, missionId)}
          onDeleteGoal={(childId, goalId) => handleDeleteGoal(childId, goalId)}
          onManualTransaction={(childId, amount, reason) => handleManualTransaction(childId, amount, reason)}
          onAddChild={async (childData) => { await handleAddChild(childData); }}
          onEditChild={handleEditChild}
          onDeleteChild={handleDeleteChild}
          onClearHistory={handleClearHistory}
          onSetPin={handleSetPin}
          onToggleNotifications={handleToggleNotifications}
          onExit={handleLogout}
          onSignOut={handleFullSignOut}
          onDeleteAccount={async () => { await deleteAccount(ownerId); localStorage.removeItem('koiny_last_view'); localStorage.removeItem('koiny_last_child_id'); setData(INITIAL_DATA); setOwnerId(undefined); setView('LANDING'); }}
          onSetPremium={handleSetPremium}
          onSetMaxBalance={handleUpdateMaxBalance}
          onSetLanguage={setLanguage}
          isOfflineMode={isOfflineMode}
          notificationAction={notificationAction}
          onClearNotificationAction={() => setNotificationAction(null)}
        />
      )}
      {view === 'PARENT' && !isAndroid && (
        <ParentView
          data={data} ownerId={ownerId} language={data.language} onApprove={handleApprove} onReject={handleReject} onAddMission={handleAddMission}
          onDeleteActiveMission={handleDeleteActiveMission} onEditMission={handleEditMission} onManualTransaction={handleManualTransaction} onAddChild={handleAddChild}
          onEditChild={handleEditChild} onDeleteGoal={handleDeleteGoal} onArchiveGoal={handleArchiveGoal} onDeleteChild={handleDeleteChild} onSetPin={handleSetPin} onClearHistory={handleClearHistory}
          onUpdatePassword={async (p) => { await updatePassword(p); }} onDeleteAccount={async () => { await deleteAccount(ownerId); localStorage.removeItem('koiny_last_view'); localStorage.removeItem('koiny_last_child_id'); setData(INITIAL_DATA); setOwnerId(undefined); setView('LANDING'); }}
          onExit={handleLogout} onTutorialComplete={handleParentTutorialComplete} onToggleSound={handleToggleSound} onSetLanguage={setLanguage} onSetCurrency={setCurrency}
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
