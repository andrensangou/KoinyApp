import { GlobalState, INITIAL_DATA } from '../types';

const STORAGE_KEY = 'koiny_local_v1';
const BACKUP_KEY = 'koiny_local_v1_backup';

/**
 * VERSION LOCALE - Stockage 100% localStorage, sans Supabase
 */
export const loadData = async (): Promise<{ data: GlobalState }> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('✅ [LOCAL] Données chargées depuis localStorage');
      return { data: migrateData(parsed) };
    }
  } catch (e) {
    console.error('❌ [LOCAL] Erreur chargement localStorage:', e);
  }

  console.log('📦 [LOCAL] Aucune donnée trouvée, retour aux données initiales');
  return { data: INITIAL_DATA };
};

const migrateData = (data: any): GlobalState => {
  if (!data || typeof data !== 'object') return INITIAL_DATA;

  const children = Array.isArray(data.children) ? data.children : [];

  return {
    ...INITIAL_DATA,
    ...data,
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

export const saveData = (data: GlobalState): void => {
  const dataToSave = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  try {
    const jsonString = JSON.stringify(dataToSave);

    // Backup de la version précédente
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      localStorage.setItem(BACKUP_KEY, current);
    }

    // Sauvegarde des nouvelles données
    localStorage.setItem(STORAGE_KEY, jsonString);
    console.log('✅ [LOCAL] Données sauvegardées dans localStorage');
  } catch (e) {
    console.error('❌ [LOCAL] Erreur sauvegarde localStorage:', e);
  }
};

/**
 * Fonction d'exportation RGPD (Portabilité)
 */
export const exportUserData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return;

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `koiny_local_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log('📥 [LOCAL] Export RGPD effectué');
};
