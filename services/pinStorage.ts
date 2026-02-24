/**
 * 🔐 SERVICE DE STOCKAGE LOCAL DU PIN
 * 
 * Le PIN parent doit être stocké LOCALEMENT sur chaque appareil,
 * pas dans Supabase, pour des raisons de sécurité et de co-parentalité.
 * 
 * Chaque parent a son propre PIN sur son propre appareil.
 * 
 * @author Koiny Security Team
 * @date 2026-02-10
 * @version 1.0.0
 */

import { Preferences } from '@capacitor/preferences';

import { getSupabase } from './supabase';

const PIN_STORAGE_KEY = 'koiny_parent_pin_v2';

/**
 * Sauvegarde le PIN parent localement ET sur Supabase (pour co-parenting et backup)
 * 
 * @param userId - ID de l'utilisateur
 * @param pinHash - Hash PBKDF2 du PIN
 */
export const saveParentPinLocally = async (userId: string, pinHash: string): Promise<void> => {
    try {
        // 1. Sauvegarde locale (rapide, offline)
        const key = `${PIN_STORAGE_KEY}_${userId}`;
        await Preferences.set({ key, value: pinHash });
        console.log('✅ [PIN_STORAGE] PIN sauvegardé localement pour:', userId);

        // 2. Sync vers Supabase (pour co-parenting et backup)
        const supabase = getSupabase();
        const { error } = await supabase
            .from('profiles')
            .update({ pin_hash: pinHash })
            .eq('id', userId);

        if (error) console.error('❌ [PIN_STORAGE] Erreur sync Supabase:', error.message);
        else console.log('✅ [PIN_STORAGE] PIN synced sur Supabase');

    } catch (error) {
        console.error('❌ [PIN_STORAGE] Erreur sauvegarde PIN:', error);
        throw error;
    }
};

/**
 * Charge le PIN parent depuis le stockage local
 * 
 * @param userId - ID de l'utilisateur
 * @returns Hash PBKDF2 du PIN ou null si non trouvé
 */
export const loadParentPinLocally = async (userId: string): Promise<string | null> => {
    try {
        const key = `${PIN_STORAGE_KEY}_${userId}`;
        const { value } = await Preferences.get({ key });

        if (value) {
            console.log('✅ [PIN_STORAGE] PIN chargé localement pour:', userId);
            return value;
        }

        // Fallback : chercher sur Supabase (nouveau appareil ou co-parent)
        console.log('🔍 [PIN_STORAGE] Pas de PIN local, tentative Supabase...');
        const supabase = getSupabase();
        const { data } = await supabase
            .from('profiles')
            .select('pin_hash')
            .eq('id', userId)
            .maybeSingle();

        if (data?.pin_hash) {
            // Sauvegarder localement pour les prochaines fois
            await Preferences.set({ key, value: data.pin_hash });
            console.log('✅ [PIN_STORAGE] PIN récupéré depuis Supabase et mis en cache local');
            return data.pin_hash;
        }

        console.log('⚠️ [PIN_STORAGE] Aucun PIN trouvé ni local ni Supabase pour:', userId);
        return null;

    } catch (error) {
        console.error('❌ [PIN_STORAGE] Erreur chargement PIN:', error);
        return null;
    }
};

/**
 * Supprime le PIN parent du stockage local
 * 
 * @param userId - ID de l'utilisateur
 */
export const deleteParentPinLocally = async (userId: string): Promise<void> => {
    try {
        const key = `${PIN_STORAGE_KEY}_${userId}`;
        await Preferences.remove({ key });
        console.log('✅ [PIN_STORAGE] PIN supprimé localement pour:', userId);
    } catch (error) {
        console.error('❌ [PIN_STORAGE] Erreur suppression PIN:', error);
        throw error;
    }
};

/**
 * Vérifie si un PIN existe localement pour cet utilisateur
 * 
 * @param userId - ID de l'utilisateur
 * @returns true si un PIN existe, false sinon
 */
export const hasParentPinLocally = async (userId: string): Promise<boolean> => {
    const pin = await loadParentPinLocally(userId);
    return pin !== null;
};
