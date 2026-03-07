import { getSupabase } from './supabase';

export interface AppAlert {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'maintenance';
  is_active: boolean;
  updated_at: string;
}

// Messages par défaut en cas de problème Supabase
export const DEFAULT_ALERTS = {
  fr: {
    error: {
      id: 'default-error-fr',
      message: 'Désolé, un problème technique nous empêche de nous connecter à Koiny. Nous travaillons pour rétablir le service au plus vite.',
      type: 'error' as const,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    warning: {
      id: 'default-warning-fr',
      message: 'Koiny rencontre actuellement des performances dégradées. Vos données sont en sécurité, mais certaines fonctionnalités peuvent être lentes.',
      type: 'warning' as const,
      is_active: true,
      updated_at: new Date().toISOString()
    }
  },
  en: {
    error: {
      id: 'default-error-en',
      message: 'Sorry, a technical issue is preventing us from connecting to Koiny. We\'re working to restore the service as soon as possible.',
      type: 'error' as const,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    warning: {
      id: 'default-warning-en',
      message: 'Koiny is currently experiencing degraded performance. Your data is safe, but some features may be slow.',
      type: 'warning' as const,
      is_active: true,
      updated_at: new Date().toISOString()
    }
  },
  nl: {
    error: {
      id: 'default-error-nl',
      message: 'Sorry, een technisch probleem verhindert ons om verbinding te maken met Koiny. We werken eraan om de service zo snel mogelijk te herstellen.',
      type: 'error' as const,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    warning: {
      id: 'default-warning-nl',
      message: 'Koiny ondervindt momenteel verslechterde prestaties. Uw gegevens zijn veilig, maar sommige functies kunnen traag zijn.',
      type: 'warning' as const,
      is_active: true,
      updated_at: new Date().toISOString()
    }
  }
};

export const alertService = {
  /**
   * Fetch l'alerte active depuis Supabase, avec fallback sur le cache local
   */
  async fetchAlert(language: 'fr' | 'en' | 'nl'): Promise<AppAlert | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('app_alerts')
        .select('id, message, type, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Supabase échoue → utiliser le cache
        return this.getCachedAlert(language);
      }

      // Succès → sauvegarder en cache pour la prochaine fois
      this.cacheAlert(data);
      return data as AppAlert;
    } catch (err) {
      console.warn('⚠️ [AlertService] Fetch échoué, utilisant cache:', err);
      return this.getCachedAlert(language);
    }
  },

  /**
   * Récupère l'alerte du cache localStorage
   */
  getCachedAlert(language: 'fr' | 'en' | 'nl'): AppAlert | null {
    try {
      const cached = localStorage.getItem('koiny_cached_alert');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('⚠️ [AlertService] Cache corrompu');
    }
    return null;
  },

  /**
   * Sauvegarde l'alerte en cache localStorage
   */
  cacheAlert(alert: AppAlert): void {
    try {
      localStorage.setItem('koiny_cached_alert', JSON.stringify(alert));
    } catch (err) {
      console.warn('⚠️ [AlertService] Cache sauvegarde échouée');
    }
  },

  /**
   * Récupère le message par défaut en cas d'erreur critique
   */
  getDefaultAlert(type: 'error' | 'warning', language: 'fr' | 'en' | 'nl'): AppAlert {
    return DEFAULT_ALERTS[language][type];
  },

  /**
   * Efface le cache
   */
  clearCache(): void {
    localStorage.removeItem('koiny_cached_alert');
  }
};
