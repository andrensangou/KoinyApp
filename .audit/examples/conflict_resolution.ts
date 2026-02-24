/**
 * 🔄 SERVICE DE SYNCHRONISATION AVEC GESTION DE CONFLITS
 * 
 * Remplace le "Last Write Wins" par un merge intelligent
 * 
 * @author Antigravity Agent
 * @date 2026-02-10
 * @version 2.0.0-secure
 */

import { GlobalState, ChildProfile, HistoryEntry } from '../types';
import { loadFromSupabase, saveToSupabase } from './supabase';
import { logger } from './logger';

/**
 * Type de conflit détecté
 */
export enum ConflictType {
    NO_CONFLICT = 'NO_CONFLICT',
    LOCAL_NEWER = 'LOCAL_NEWER',
    CLOUD_NEWER = 'CLOUD_NEWER',
    CONCURRENT_EDIT = 'CONCURRENT_EDIT'
}

/**
 * Résultat de la détection de conflit
 */
interface ConflictDetection {
    type: ConflictType;
    localTimestamp: number;
    cloudTimestamp: number;
    message: string;
}

/**
 * Détecte un conflit entre les versions locale et cloud
 * 
 * @param local - État local
 * @param cloud - État cloud
 * @returns Type de conflit détecté
 */
function detectConflict(local: GlobalState, cloud: GlobalState): ConflictDetection {
    const localTimestamp = new Date(local.updatedAt || 0).getTime();
    const cloudTimestamp = new Date(cloud.updatedAt || 0).getTime();

    // Marge de tolérance : 5 secondes
    const TOLERANCE_MS = 5000;

    if (Math.abs(localTimestamp - cloudTimestamp) < TOLERANCE_MS) {
        return {
            type: ConflictType.NO_CONFLICT,
            localTimestamp,
            cloudTimestamp,
            message: 'Versions synchronisées'
        };
    }

    if (localTimestamp > cloudTimestamp + TOLERANCE_MS) {
        return {
            type: ConflictType.LOCAL_NEWER,
            localTimestamp,
            cloudTimestamp,
            message: 'Version locale plus récente'
        };
    }

    if (cloudTimestamp > localTimestamp + TOLERANCE_MS) {
        return {
            type: ConflictType.CLOUD_NEWER,
            localTimestamp,
            cloudTimestamp,
            message: 'Version cloud plus récente'
        };
    }

    return {
        type: ConflictType.CONCURRENT_EDIT,
        localTimestamp,
        cloudTimestamp,
        message: 'Modifications concurrentes détectées'
    };
}

/**
 * Merge deux profils enfant
 * 
 * Stratégie :
 * - Solde : prendre le plus récent (basé sur l'historique)
 * - Missions : union (pas de doublons)
 * - Objectifs : union
 * - Historique : union triée par date
 * 
 * @param local - Profil local
 * @param cloud - Profil cloud
 * @returns Profil mergé
 */
function mergeChildProfile(local: ChildProfile, cloud: ChildProfile): ChildProfile {
    logger.debug('Merging child profile', {
        childId: logger.anonymize(local.id),
        localHistoryCount: local.history.length,
        cloudHistoryCount: cloud.history.length
    });

    // 1. Merger l'historique (union sans doublons)
    const historyMap = new Map<string, HistoryEntry>();

    [...local.history, ...cloud.history].forEach(entry => {
        const existing = historyMap.get(entry.id);
        if (!existing) {
            historyMap.set(entry.id, entry);
        } else {
            // Si doublon, garder le plus récent
            const existingDate = new Date(existing.date).getTime();
            const newDate = new Date(entry.date).getTime();
            if (newDate > existingDate) {
                historyMap.set(entry.id, entry);
            }
        }
    });

    const mergedHistory = Array.from(historyMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Calculer le solde à partir de l'historique
    const calculatedBalance = mergedHistory.reduce((sum, entry) => sum + entry.amount, 0);

    // 3. Merger les missions (union par ID)
    const missionsMap = new Map();
    [...local.missions, ...cloud.missions].forEach(mission => {
        const existing = missionsMap.get(mission.id);
        if (!existing) {
            missionsMap.set(mission.id, mission);
        } else {
            // Prendre la version avec le statut le plus avancé
            const statusPriority = { 'ACTIVE': 0, 'PENDING': 1, 'COMPLETED': 2 };
            if (statusPriority[mission.status] > statusPriority[existing.status]) {
                missionsMap.set(mission.id, mission);
            }
        }
    });

    // 4. Merger les objectifs (union par ID)
    const goalsMap = new Map();
    [...local.goals, ...cloud.goals].forEach(goal => {
        goalsMap.set(goal.id, goal);
    });

    // 5. Propriétés simples : prendre le plus récent
    const localLastUpdate = Math.max(
        ...local.history.map(h => new Date(h.date).getTime()),
        0
    );
    const cloudLastUpdate = Math.max(
        ...cloud.history.map(h => new Date(h.date).getTime()),
        0
    );

    const useLocal = localLastUpdate >= cloudLastUpdate;

    return {
        id: local.id,
        name: useLocal ? local.name : cloud.name,
        avatar: useLocal ? local.avatar : cloud.avatar,
        colorClass: useLocal ? local.colorClass : cloud.colorClass,
        balance: calculatedBalance,
        tutorialSeen: local.tutorialSeen || cloud.tutorialSeen,
        birthday: useLocal ? local.birthday : cloud.birthday,
        giftRequested: useLocal ? local.giftRequested : cloud.giftRequested,
        missionRequested: useLocal ? local.missionRequested : cloud.missionRequested,
        goals: Array.from(goalsMap.values()),
        missions: Array.from(missionsMap.values()),
        history: mergedHistory
    };
}

/**
 * Merge deux états globaux
 * 
 * @param local - État local
 * @param cloud - État cloud
 * @returns État mergé
 */
export function mergeGlobalStates(local: GlobalState, cloud: GlobalState): GlobalState {
    logger.info('Merging global states', {
        localChildren: local.children.length,
        cloudChildren: cloud.children.length
    });

    // 1. Collecter tous les IDs d'enfants
    const allChildrenIds = new Set([
        ...local.children.map(c => c.id),
        ...cloud.children.map(c => c.id)
    ]);

    // 2. Merger chaque enfant
    const mergedChildren = Array.from(allChildrenIds).map(childId => {
        const localChild = local.children.find(c => c.id === childId);
        const cloudChild = cloud.children.find(c => c.id === childId);

        // Si seulement local ou cloud, retourner celui qui existe
        if (!localChild) {
            logger.debug('Child only in cloud', { childId: logger.anonymize(childId) });
            return cloudChild!;
        }
        if (!cloudChild) {
            logger.debug('Child only in local', { childId: logger.anonymize(childId) });
            return localChild;
        }

        // Merge intelligent
        return mergeChildProfile(localChild, cloudChild);
    });

    // 3. Propriétés globales : prendre le plus récent
    const localTimestamp = new Date(local.updatedAt || 0).getTime();
    const cloudTimestamp = new Date(cloud.updatedAt || 0).getTime();
    const useLocal = localTimestamp >= cloudTimestamp;

    return {
        children: mergedChildren,
        parentTutorialSeen: local.parentTutorialSeen || cloud.parentTutorialSeen,
        language: useLocal ? local.language : cloud.language,
        parentPin: useLocal ? local.parentPin : cloud.parentPin,
        ownerId: local.ownerId || cloud.ownerId,
        soundEnabled: useLocal ? local.soundEnabled : cloud.soundEnabled,
        notificationsEnabled: useLocal ? local.notificationsEnabled : cloud.notificationsEnabled,
        lastParentLogin: useLocal ? local.lastParentLogin : cloud.lastParentLogin,
        parentBadge: useLocal ? local.parentBadge : cloud.parentBadge,
        totalApprovedMissions: Math.max(
            local.totalApprovedMissions || 0,
            cloud.totalApprovedMissions || 0
        ),
        lastReminderSent: useLocal ? local.lastReminderSent : cloud.lastReminderSent,
        maxBalance: useLocal ? local.maxBalance : cloud.maxBalance,
        updatedAt: new Date().toISOString()
    };
}

/**
 * Sauvegarde avec gestion de conflits
 * 
 * @param local - État local à sauvegarder
 * @param ownerId - ID du propriétaire
 * @returns État final (possiblement mergé)
 */
export async function saveWithConflictResolution(
    local: GlobalState,
    ownerId?: string
): Promise<GlobalState> {
    // 1. Vérifier si on doit synchroniser
    if (!ownerId || ownerId === 'local-owner' || ownerId === 'demo') {
        logger.debug('Skipping cloud sync (local-only mode)');
        return local;
    }

    try {
        // 2. Charger la version cloud
        logger.debug('Loading cloud version for conflict detection');
        const cloud = await loadFromSupabase(ownerId);

        if (!cloud) {
            // Pas de version cloud, première synchronisation
            logger.info('First sync, no conflict possible');
            await saveToSupabase(ownerId, local);
            return local;
        }

        // 3. Détecter les conflits
        const conflict = detectConflict(local, cloud);
        logger.info('Conflict detection', {
            type: conflict.type,
            message: conflict.message
        });

        // 4. Résoudre selon le type de conflit
        let finalState: GlobalState;

        switch (conflict.type) {
            case ConflictType.NO_CONFLICT:
            case ConflictType.LOCAL_NEWER:
                // Local est à jour ou plus récent, sauvegarder directement
                finalState = local;
                break;

            case ConflictType.CLOUD_NEWER:
                // Cloud est plus récent, utiliser la version cloud
                logger.warn('Cloud version is newer, using cloud data');
                finalState = cloud;
                break;

            case ConflictType.CONCURRENT_EDIT:
                // Modifications concurrentes, merger
                logger.warn('Concurrent edits detected, merging...');
                finalState = mergeGlobalStates(local, cloud);

                // Notifier l'utilisateur (optionnel)
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('sync-conflict-resolved', {
                        detail: { message: 'Modifications synchronisées automatiquement' }
                    }));
                }
                break;
        }

        // 5. Sauvegarder l'état final
        await saveToSupabase(ownerId, finalState);

        logger.info('Sync completed successfully');
        return finalState;

    } catch (error) {
        logger.error('Sync failed', { error });
        // En cas d'erreur, retourner l'état local
        return local;
    }
}

/**
 * Exemple d'utilisation
 */
export const USAGE_EXAMPLE = `
// ❌ AVANT (Last Write Wins)
export const saveData = async (data: GlobalState, ownerId?: string) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await saveToSupabase(ownerId, data); // ✗ Écrase tout
};

// ✅ APRÈS (Merge intelligent)
import { saveWithConflictResolution } from './sync';

export const saveData = async (data: GlobalState, ownerId?: string) => {
  // 1. Sauvegarde locale immédiate
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  // 2. Sync cloud avec gestion de conflits
  const finalState = await saveWithConflictResolution(data, ownerId);
  
  // 3. Mettre à jour le localStorage si mergé
  if (finalState !== data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalState));
  }
  
  return finalState;
};
`;
