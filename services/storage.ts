import { Preferences } from '@capacitor/preferences';
import { GlobalState, INITIAL_DATA } from '../types';
import { getSupabase, loadFromSupabase, saveToSupabase } from './supabase';

const STORAGE_KEY = 'koiny_local_v1';
const BACKUP_KEY = 'koiny_local_v1_backup';

/**
 * Wrapper asynchrone pour le stockage persistant (Natif + Web)
 * @capacitor/preferences utilise SharedPreferences sur Android et UserDefaults sur iOS,
 * ce qui est beaucoup plus fiable que le localStorage du WebView.
 */
export const persistentStorage = {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    // Fallback sur localStorage pour la transition (migration transparente)
    if (value === null) {
      const old = localStorage.getItem(key);
      if (old !== null) {
        await Preferences.set({ key, value: old });
        return old;
      }
    }
    return value;
  },
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
    // Optionnel : garder localStorage à jour pour le web
    localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
    localStorage.removeItem(key);
  }
};

/**
 * VERSION HYBRIDE - Supporte Preferences et Supabase Cloud Sync
 */
export const loadData = async (): Promise<{ data: GlobalState, ownerId?: string }> => {
  const supabase = getSupabase();

  // Timeout de sécurité pour la session
  const getSessionWithTimeout = async () => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 3000));
    const session = supabase.auth.getSession();
    return Promise.race([session, timeout]) as any;
  };

  let session = null;
  try {
    const result = await getSessionWithTimeout();
    session = result.data?.session;
  } catch (e) {
    console.warn('⚠️ [STORAGE] Session timeout or error, proceeding offline');
  }

  const user = session?.user;

  // 1. Charger le cache local d'abord (pour comparer les timestamps)
  let localData: GlobalState | null = null;
  try {
    const stored = await persistentStorage.get(STORAGE_KEY) || await persistentStorage.get(BACKUP_KEY);
    if (stored) {
      localData = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('⚠️ [STORAGE] Erreur lecture cache local:', e);
  }

  // 2. Charger depuis Supabase si connecté
  if (user) {
    try {
      console.log('☁️ [STORAGE] Tentative chargement cloud pour:', user.id);

      const cloudData = await loadFromSupabase(user.id);

      if (cloudData) {
        // Comparer les timestamps : si local plus récent → garder local et sync vers cloud
        const localUpdatedAt = localData?.updatedAt ? new Date(localData.updatedAt).getTime() : 0;
        const cloudUpdatedAt = cloudData?.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;

        if (localData && localUpdatedAt > cloudUpdatedAt) {
          console.log('⚡ [STORAGE] Cache local plus récent que le cloud — données offline prioritaires');
          // Déclencher un sync cloud en arrière-plan
          saveToSupabase(user.id, localData).catch(e =>
            console.warn('⚠️ [STORAGE] Sync offline→cloud échouée:', e)
          );
          return {
            data: migrateData(localData),
            ownerId: user.id
          };
        }

        console.log('✅ [STORAGE] Données cloud plus récentes, chargement cloud');
        await persistentStorage.set(STORAGE_KEY, JSON.stringify(cloudData));
        return {
          data: migrateData(cloudData),
          ownerId: user.id
        };
      }
    } catch (e) {
      console.error('❌ [STORAGE] Erreur cloud load:', e);
    }
  }

  // 3. Fallback Storage Natif (Offline ou Invité)
  if (localData) {
    console.log('💾 [STORAGE] Données chargées depuis stockage natif');
    return {
      data: migrateData(localData),
      ownerId: user?.id || 'local-owner'
    };
  }

  console.log('📦 [STORAGE] Aucune donnée trouvée, retour aux données initiales');
  return {
    data: INITIAL_DATA,
    ownerId: user?.id || 'local-owner'
  };
};

const migrateData = (data: any): GlobalState => {
  if (!data || typeof data !== 'object') return INITIAL_DATA;

  const children = Array.isArray(data.children) ? data.children : [];
  const isPremium = localStorage.getItem('koiny_premium_active') === 'true';

  return {
    ...INITIAL_DATA,
    ...data,
    isPremium: isPremium,
    children: children.map((c: any) => ({
      ...c,
      balance: typeof c.balance === 'number' ? c.balance : 0,
      goals: Array.isArray(c.goals) ? c.goals : [],
      missions: Array.isArray(c.missions) ? c.missions : [],
      history: Array.isArray(c.history) ? c.history : [],
      tutorialSeen: !!c.tutorialSeen
    })),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
};

/**
 * Purge automatique de l'historique ancien
 */
const purgeOldHistory = (data: GlobalState, maxEntriesPerChild: number = 300): GlobalState => {
  return {
    ...data,
    children: data.children.map(child => ({
      ...child,
      history: child.history
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, maxEntriesPerChild)
    }))
  };
};

/**
 * Merge intelligent de deux profils enfant
 */
const mergeChildProfile = (local: any, cloud: any): any => {
  // Merger l'historique (union sans doublons)
  const historyMap = new Map();
  [...local.history, ...cloud.history].forEach((entry: any) => {
    const existing = historyMap.get(entry.id);
    if (!existing) {
      historyMap.set(entry.id, entry);
    } else {
      // Garder le plus récent
      const existingDate = new Date(existing.date).getTime();
      const newDate = new Date(entry.date).getTime();
      if (newDate > existingDate) {
        historyMap.set(entry.id, entry);
      }
    }
  });

  const mergedHistory = Array.from(historyMap.values())
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculer le solde à partir de l'historique
  const calculatedBalance = mergedHistory.reduce((sum: number, entry: any) => sum + entry.amount, 0);

  // Merger les missions et objectifs
  const missionsMap = new Map();
  [...local.missions, ...cloud.missions].forEach((mission: any) => {
    missionsMap.set(mission.id, mission);
  });

  const goalsMap = new Map();
  [...local.goals, ...cloud.goals].forEach((goal: any) => {
    goalsMap.set(goal.id, goal);
  });

  // Prendre les propriétés du plus récent
  const localLastUpdate = Math.max(...local.history.map((h: any) => new Date(h.date).getTime()), 0);
  const cloudLastUpdate = Math.max(...cloud.history.map((h: any) => new Date(h.date).getTime()), 0);
  const useLocal = localLastUpdate >= cloudLastUpdate;

  return {
    ...local,
    name: useLocal ? local.name : cloud.name,
    avatar: useLocal ? local.avatar : cloud.avatar,
    balance: calculatedBalance,
    goals: Array.from(goalsMap.values()),
    missions: Array.from(missionsMap.values()),
    history: mergedHistory
  };
};

/**
 * Merge deux états globaux
 */
const mergeGlobalStates = (local: GlobalState, cloud: GlobalState): GlobalState => {
  console.log('⚠️ [STORAGE] Merge de conflits en cours...');

  // Collecter tous les IDs d'enfants
  const allChildrenIds = new Set([
    ...local.children.map(c => c.id),
    ...cloud.children.map(c => c.id)
  ]);

  // Merger chaque enfant
  const mergedChildren = Array.from(allChildrenIds).map(childId => {
    const localChild = local.children.find(c => c.id === childId);
    const cloudChild = cloud.children.find(c => c.id === childId);

    if (!localChild) return cloudChild!;
    if (!cloudChild) return localChild;

    return mergeChildProfile(localChild, cloudChild);
  });

  // Propriétés globales : prendre le plus récent
  const localTimestamp = new Date(local.updatedAt || 0).getTime();
  const cloudTimestamp = new Date(cloud.updatedAt || 0).getTime();
  const useLocal = localTimestamp >= cloudTimestamp;

  return {
    ...local,
    children: mergedChildren,
    language: useLocal ? local.language : cloud.language,
    parentPin: useLocal ? local.parentPin : cloud.parentPin,
    soundEnabled: useLocal ? local.soundEnabled : cloud.soundEnabled,
    notificationsEnabled: useLocal ? local.notificationsEnabled : cloud.notificationsEnabled,
    updatedAt: new Date().toISOString()
  };
};

export const saveData = async (data: GlobalState, ownerId?: string, immediate?: boolean): Promise<Record<string, string>> => {
  let dataToSave = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  // 1. Vérifier la taille et purger si nécessaire
  const jsonString = JSON.stringify(dataToSave);
  const sizeKB = new Blob([jsonString]).size / 1024;

  if (sizeKB > 4000) { // 4MB = seuil d'alerte (80% de 5MB)
    console.warn(`⚠️ [STORAGE] Données volumineuses: ${sizeKB.toFixed(0)}KB, purge automatique`);
    const purged = purgeOldHistory(dataToSave, 300);
    dataToSave = { ...purged, updatedAt: purged.updatedAt || new Date().toISOString() };
  }

  let changes: Record<string, string> = {};

  // ⭐ 2. PRIORITÉ: Sauvegarde locale TOUJOURS d'abord (mode offline friendly)
  try {
    const current = await persistentStorage.get(STORAGE_KEY);
    if (current) await persistentStorage.set(BACKUP_KEY, current);
    await persistentStorage.set(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('✅ [STORAGE] Données sauvegardées localement');
  } catch (e: any) {
    console.error('❌ [STORAGE] ERREUR CRITIQUE - Sauvegarde locale échouée:', e);
    // Même en cas d'erreur locale, on continue pour le cloud
  }

  // 3. Gestion des conflits de synchronisation (non-bloquant, timeout court)
  if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
    try {
      // Timeout pour pas bloquer en offline
      const conflictCheckPromise = (async () => {
        const cloudData = await loadFromSupabase(ownerId);
        if (cloudData) {
          const localTimestamp = new Date(dataToSave.updatedAt || 0).getTime();
          const cloudTimestamp = new Date(cloudData.updatedAt || 0).getTime();

          // Détecter conflit (marge de tolérance : 5 secondes)
          if (cloudTimestamp > localTimestamp + 5000) {
            console.warn('⚠️ [STORAGE] Conflit détecté, merge automatique');
            const merged = mergeGlobalStates(dataToSave, cloudData);
            dataToSave = { ...merged, updatedAt: merged.updatedAt || new Date().toISOString() };
          }
        }
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('CONFLICT_CHECK_TIMEOUT')), 3000)
      );

      await Promise.race([conflictCheckPromise, timeoutPromise]).catch(e => {
        if (e.message === 'CONFLICT_CHECK_TIMEOUT') {
          console.warn('⚠️ [STORAGE] Détection conflits timeout (offline?)');
        } else {
          console.warn('⚠️ [STORAGE] Erreur détection conflits:', e?.message);
        }
      });
    } catch (e) {
      console.warn('⚠️ [STORAGE] Erreur détection conflits:', e);
    }
  }

  // 4. Synchronisation cloud (non-bloquant, async)
  if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
    (async () => {
      try {
        console.log('☁️ [STORAGE] Synchronisation cloud en cours...');
        const result = await saveToSupabase(ownerId, dataToSave);
        if (result?.success) {
          console.log('✅ [STORAGE] Sync cloud réussi');
          if (result?.idMapping) changes = result.idMapping;
        } else {
          console.warn('⚠️ [STORAGE] Sync cloud échouée, mais données locales sauvegardées');
        }
      } catch (e) {
        console.warn('⚠️ [STORAGE] Erreur synchronisation cloud (offline?):', e instanceof Error ? e.message : e);
      }
    })();
  }

  return changes;
};


/**
 * Fonction d'exportation RGPD (Portabilité)
 */
export const exportUserData = async () => {
  const data = await persistentStorage.get(STORAGE_KEY);
  if (!data) return;

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `koiny_local_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log('📥 [STORAGE] Export RGPD effectué');
};
