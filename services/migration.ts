
import { getSupabase } from './supabase';
import { GlobalState } from '../types';
import { monitoring } from './monitoring';

/**
 * Migre les données du format JSON vers le format SQL relationnel
 */
export const migrateJsonToRelational = async (userId: string, legacyData: GlobalState) => {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  return await monitoring.measure('DATABASE_MIGRATION', async () => {
    try {
      // 1. Profil Parent
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        parent_pin: legacyData.parentPin,
        language: legacyData.language,
        sound_enabled: legacyData.soundEnabled,
        total_approved_missions: legacyData.totalApprovedMissions || 0,
        parent_badge: legacyData.parentBadge || 'NOVICE',
        updated_at: new Date().toISOString()
      });

      if (profileError) throw profileError;

      // 2. Enfants et leurs dépendances
      for (const child of legacyData.children) {
        const { data: childDb, error: childError } = await supabase.from('children').insert({
          parent_id: userId,
          name: child.name,
          avatar: child.avatar,
          color_class: child.colorClass,
          balance: child.balance,
          tutorial_seen: child.tutorialSeen
        }).select().single();

        if (childError) throw childError;
        const newChildId = childDb.id;

        // Missions
        if (child.missions && child.missions.length > 0) {
          const missionsToInsert = child.missions.map(m => ({
            child_id: newChildId,
            title: m.title,
            reward: m.reward,
            icon: m.icon,
            status: m.status,
            feedback: m.feedback
          }));
          await supabase.from('missions').insert(missionsToInsert);
        }

        // Objectifs (Goals)
        if (child.goals && child.goals.length > 0) {
          const goalsToInsert = child.goals.map(g => ({
            child_id: newChildId,
            name: g.name,
            target: g.target,
            icon: g.icon
          }));
          await supabase.from('goals').insert(goalsToInsert);
        }

        // Historique
        if (child.history && child.history.length > 0) {
          const historyToInsert = child.history.map(h => ({
            child_id: newChildId,
            date: h.date,
            title: h.title,
            amount: h.amount,
            note: h.note
          }));
          await supabase.from('history_entries').insert(historyToInsert);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("Erreur migration:", err);
      return { success: false, error: err.message };
    }
  });
};
