import { Preferences } from '@capacitor/preferences';
import { GlobalState, INITIAL_DATA } from '../types';
import { getSupabase, loadFromSupabase, saveToSupabase, fetchDeletedIds, getDeletedIdsCache } from './supabase';

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
// Retire les items supprimés (tombstones) du state pour que le merge (union par ID)
// ne les ressuscite pas. Utilise le cache synchrone rempli par fetchDeletedIds.
const applyTombstones = (state: GlobalState): GlobalState => {
  const del = getDeletedIdsCache();
  if (del.child.size === 0 && del.goal.size === 0 && del.mission.size === 0 && del.transaction.size === 0) {
    return state;
  }
  const children = (state.children || [])
    .filter((c: any) => !del.child.has(c.id))
    .map((c: any) => ({
      ...c,
      goals: (c.goals || []).filter((g: any) => !del.goal.has(g.id)),
      missions: (c.missions || []).filter((m: any) => !del.mission.has(m.id)),
      history: (c.history || []).filter((h: any) => !del.transaction.has(h.id)),
    }));
  return { ...state, children };
};

export const loadData = async (knownUserId?: string): Promise<{ data: GlobalState, ownerId?: string }> => {
  const supabase = getSupabase();

  let user: { id: string } | null = null;

  if (knownUserId) {
    // Session already known (e.g. from OAuth deep link) — skip slow getSession() call
    user = { id: knownUserId };
  } else {
    // Timeout de sécurité pour la session
    const getSessionWithTimeout = async () => {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 8000));
      const session = supabase.auth.getSession();
      return Promise.race([session, timeout]) as any;
    };

    try {
      const result = await getSessionWithTimeout();
      user = result.data?.session?.user ?? null;
    } catch (e) {
      console.warn('⚠️ [STORAGE] Session timeout or error, proceeding offline');
    }
  }

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

      // Charger les tombstones (suppressions) pour filtrer les items ressuscités
      await fetchDeletedIds(user.id);

      if (cloudData) {
        const localHasChildren = (localData?.children?.length || 0) > 0;
        const cloudHasChildren = (cloudData?.children?.length || 0) > 0;

        // 🔀 Les DEUX côtés ont des données → MERGE par ID (anti-perte multi-appareils).
        // Avant: on prenait tout local OU tout cloud selon un seul updatedAt global →
        // un appareil avec un timestamp plus récent écrasait les enfants/objectifs/
        // missions créés sur l'autre appareil (QR / co-parent). Le merge fusionne les
        // entités par ID des deux côtés, donc rien n'est perdu.
        if (localData && localHasChildren && cloudHasChildren) {
          console.log('🔀 [STORAGE] Merge local + cloud (multi-appareils)');
          // applyTombstones : retire les items supprimés ailleurs pour qu'ils ne
          // soient pas ressuscités par l'union du merge ni repoussés vers le cloud.
          const merged = applyTombstones(mergeGlobalStates(migrateData(localData), migrateData(cloudData)));
          await persistentStorage.set(STORAGE_KEY, JSON.stringify(merged));
          // Converger : repousser le résultat fusionné vers le cloud
          saveToSupabase(user.id, merged).catch(e =>
            console.warn('⚠️ [STORAGE] Sync merge→cloud échouée:', e)
          );
          return { data: merged, ownerId: user.id };
        }

        // Local a des enfants mais le cloud est vide → garder local, repousser au cloud
        // (évite d'écraser des données offline par un cloud vide)
        if (localData && localHasChildren && !cloudHasChildren) {
          console.log('⚡ [STORAGE] Cache local prioritaire (cloud vide)');
          const localClean = applyTombstones(migrateData(localData));
          saveToSupabase(user.id, localClean).catch(e =>
            console.warn('⚠️ [STORAGE] Sync offline→cloud échouée:', e)
          );
          return { data: localClean, ownerId: user.id };
        }

        // Sinon (local vide ou inexistant) → charger le cloud
        console.log('✅ [STORAGE] Chargement cloud');
        const cloudClean = applyTombstones(migrateData(cloudData));
        await persistentStorage.set(STORAGE_KEY, JSON.stringify(cloudClean));
        return {
          data: cloudClean,
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
      balance: typeof c.balance === 'number' ? Math.max(0, c.balance) : 0,
      goals: (() => {
        const goals = Array.isArray(c.goals) ? c.goals : [];
        // Dédupliquer par nom+montant (signature), préférer les UUIDs
        const seen = new Map<string, any>();
        const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        for (const g of goals) {
          const sig = `${g.name || ''}:${g.target || 0}`;
          const existing = seen.get(sig);
          if (!existing) {
            seen.set(sig, g);
          } else if (!isUUID(existing.id) && isUUID(g.id)) {
            // Prefer the UUID version
            seen.set(sig, g);
          }
          // else: already have a UUID version or same ID, skip duplicate
        }
        return Array.from(seen.values());
      })(),
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
// `preferCloudScalars` = true quand l'état GLOBAL cloud est plus récent (updatedAt).
// Sert à résoudre les champs scalaires sans historique propre (flags de demande),
// qui sinon seraient toujours écrasés par la valeur locale via le `...local`.
const mergeChildProfile = (local: any, cloud: any, preferCloudScalars: boolean = false): any => {
  // Temps d'une entrée : on privilégie le timestamp ISO complet (heure incluse),
  // sinon on retombe sur la date jour (DD/MM/YYYY). Permet un tri chronologique
  // fiable ET identique entre appareils (même clé de tri partout).
  const entryTime = (e: any): number => {
    if (e?.createdAt) {
      const t = new Date(e.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    const p = String(e?.date || '').split('/');
    if (p.length === 3) {
      const t = new Date(`${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // Merger l'historique (union sans doublons)
  const historyMap = new Map();
  [...local.history, ...cloud.history].forEach((entry: any) => {
    const existing = historyMap.get(entry.id);
    if (!existing) {
      historyMap.set(entry.id, entry);
    } else if (entryTime(entry) > entryTime(existing)) {
      // Garder l'entrée avec le timestamp le plus complet/récent
      historyMap.set(entry.id, entry);
    }
  });

  // Tri par temps décroissant. Départage déterministe par id (même ordre sur les
  // deux appareils) pour les entrées du même jour sans heure.
  const mergedHistory = Array.from(historyMap.values())
    .sort((a: any, b: any) => entryTime(b) - entryTime(a) || String(b.id).localeCompare(String(a.id)));

  // Calculer le solde à partir de l'historique — plancher à 0 (tirelire enfant)
  const calculatedBalance = Math.max(0, mergedHistory.reduce((sum: number, entry: any) => sum + entry.amount, 0));

  // Merger les missions. Pour un même ID présent des deux côtés (= édition :
  // nom/montant modifiés), on garde la version de l'appareil qui a sauvegardé en
  // dernier. On itère le côté préféré EN DERNIER pour qu'il gagne le `set`.
  // (Les missions uniques à un seul côté sont toujours conservées → union.)
  const missionsMap = new Map();
  const missionOrder = preferCloudScalars
    ? [...local.missions, ...cloud.missions]   // cloud plus récent → cloud gagne
    : [...cloud.missions, ...local.missions];  // local plus récent → local gagne
  missionOrder.forEach((mission: any) => {
    missionsMap.set(mission.id, mission);
  });

  // Merger les goals par ID (union, comme les missions). Le côté préféré itéré en
  // dernier gagne sur un même ID (édition). PLUS de dédup par signature nom+montant :
  // depuis que les goals ont des UUID stables, l'id suffit — la dédup par contenu
  // fusionnait à tort des goals distincts et BLOQUAIT l'apparition d'un nouveau goal
  // dont le nom+montant matchait un goal existant sur l'autre appareil.
  const goalsMap = new Map();
  const goalOrder = preferCloudScalars
    ? [...local.goals, ...cloud.goals]   // cloud plus récent → cloud gagne
    : [...cloud.goals, ...local.goals];  // local plus récent → local gagne
  goalOrder.forEach((goal: any) => {
    goalsMap.set(goal.id, goal);
  });

  return {
    ...local,
    // Champs éditables de l'enfant : résolus selon l'état GLOBAL le plus récent
    // (updatedAt, mis à jour à chaque sauvegarde). Sinon le `...local` / un tie sur
    // les dates d'historique faisait toujours gagner le local → les modifs (nom,
    // couleur, avatar, anniversaire) faites sur un appareil étaient perdues sur l'autre.
    name: preferCloudScalars ? cloud.name : local.name,
    avatar: preferCloudScalars ? cloud.avatar : local.avatar,
    colorClass: preferCloudScalars ? cloud.colorClass : local.colorClass,
    birthday: preferCloudScalars ? cloud.birthday : local.birthday,
    balance: calculatedBalance,
    goals: Array.from(goalsMap.values()),
    missions: Array.from(missionsMap.values()),
    history: mergedHistory,
    // Flags de demande (enfant → parent) : pas d'historique propre, donc résolus
    // selon l'état global le plus récent. Sinon `...local` les écraserait toujours
    // → la demande faite sur un appareil n'arrivait jamais sur l'autre.
    giftRequested: preferCloudScalars ? cloud.giftRequested : local.giftRequested,
    missionRequested: preferCloudScalars ? cloud.missionRequested : local.missionRequested,
  };
};

/**
 * Merge deux états globaux
 */
const mergeGlobalStates = (local: GlobalState, cloud: GlobalState): GlobalState => {
  console.log('⚠️ [STORAGE] Merge de conflits en cours...');

  // Propriétés globales : prendre le plus récent (calculé d'abord pour le passer
  // au merge de chaque enfant — résolution des flags de demande).
  const localTimestamp = new Date(local.updatedAt || 0).getTime();
  const cloudTimestamp = new Date(cloud.updatedAt || 0).getTime();
  const useLocal = localTimestamp >= cloudTimestamp;

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

    return mergeChildProfile(localChild, cloudChild, !useLocal);
  });

  return {
    ...local,
    children: mergedChildren,
    language: useLocal ? local.language : cloud.language,
    parentPin: useLocal ? local.parentPin : cloud.parentPin,
    soundEnabled: useLocal ? local.soundEnabled : cloud.soundEnabled,
    notificationsEnabled: useLocal ? local.notificationsEnabled : cloud.notificationsEnabled,
    // ⚠️ NE PAS minter un timestamp neuf ici : merger deux états identiques doit
    // redonner le MÊME updatedAt, sinon le foreground reload (App.tsx) voit toujours
    // « cloud plus récent » → boucle de reload infinie + save-auto bloqué en permanence.
    // On conserve le plus récent des deux. Le chemin saveData ré-override avec now().
    updatedAt: (useLocal ? local.updatedAt : cloud.updatedAt) || new Date().toISOString()
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

          // Conflit : le cloud a été modifié par un AUTRE appareil depuis notre
          // dernier état. On merge AVANT de sauvegarder pour ne jamais réécrire le
          // cloud avec des valeurs périmées (sinon une édition faite sur l'appareil A
          // était écrasée quand l'appareil B sauvegardait son ancien état → "revert").
          // Le merge résout chaque champ par récence, donc la valeur la plus récente
          // gagne. (Avant : seuil de 5s trop permissif → la fenêtre de revert restait.)
          if (cloudTimestamp > localTimestamp) {
            console.warn('⚠️ [STORAGE] Cloud plus récent (autre appareil), merge avant save');
            const merged = mergeGlobalStates(dataToSave, cloudData);
            dataToSave = { ...merged, updatedAt: new Date().toISOString() };
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

  // 4. Synchronisation cloud (AWAITED pour récupérer les idMappings)
  if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
    try {
      // Ne jamais repousser un item supprimé : on filtre via le cache tombstones
      // (synchrone, rempli par loadData/recordDeletion) avant l'upsert cloud.
      dataToSave = { ...applyTombstones(dataToSave), updatedAt: dataToSave.updatedAt };
      console.log('☁️ [STORAGE] Synchronisation cloud en cours...');
      const syncPromise = saveToSupabase(ownerId, dataToSave);
      const syncTimeout = new Promise<{ success: boolean, idMapping: Record<string, string> }>((resolve) =>
        setTimeout(() => resolve({ success: false, idMapping: {} }), 10000)
      );
      const result = await Promise.race([syncPromise, syncTimeout]);
      if (result?.success) {
        console.log('✅ [STORAGE] Sync cloud réussi');
        if (result?.idMapping && Object.keys(result.idMapping).length > 0) {
          changes = result.idMapping;
          // ✅ Mettre à jour le cache local avec les nouveaux IDs pour éviter les doublons
          const updatedData = {
            ...dataToSave,
            children: dataToSave.children.map(c => ({
              ...c,
              id: changes[c.id] || c.id,
              goals: c.goals.map((g: any) => ({
                ...g,
                id: changes[g.id] || g.id
              })),
              missions: c.missions.map((m: any) => ({
                ...m,
                id: changes[m.id] || m.id
              })),
              history: c.history.map((h: any) => ({
                ...h,
                id: changes[h.id] || h.id
              }))
            }))
          };
          await persistentStorage.set(STORAGE_KEY, JSON.stringify(updatedData));
          console.log('✅ [STORAGE] Cache local mis à jour avec les nouveaux IDs cloud');
        }
      } else {
        console.warn('⚠️ [STORAGE] Sync cloud échouée ou timeout, mais données locales sauvegardées');
      }
    } catch (e) {
      console.warn('⚠️ [STORAGE] Erreur synchronisation cloud (offline?):', e instanceof Error ? e.message : e);
    }
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
