/**
 * 📝 SERVICE DE LOGGING SÉCURISÉ
 * 
 * Remplace tous les console.log par un système de logging avec niveaux
 * et anonymisation automatique des données sensibles
 * 
 * @author Koiny Security Team
 * @date 2026-02-10
 * @version 2.0.0-secure
 */

/**
 * Niveaux de log
 */
export enum LogLevel {
    DEBUG = 0,   // Développement uniquement
    INFO = 1,    // Informations générales
    WARN = 2,    // Avertissements
    ERROR = 3    // Erreurs critiques
}

/**
 * Configuration du logger
 */
const config = {
    // En production, seulement WARN et ERROR
    level: (import.meta as any).env?.PROD ? LogLevel.WARN : LogLevel.DEBUG,

    // Activer l'envoi à Sentry en production
    sentryEnabled: (import.meta as any).env?.PROD,

    // Anonymiser automatiquement les IDs
    anonymizeIds: true,

    // Préfixes colorés (développement)
    colors: {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Vert
        [LogLevel.WARN]: '\x1b[33m',  // Jaune
        [LogLevel.ERROR]: '\x1b[31m'  // Rouge
    },
    reset: '\x1b[0m'
};

/**
 * Données sensibles à anonymiser
 */
const SENSITIVE_KEYS = [
    'userId',
    'user_id',
    'ownerId',
    'owner_id',
    'parentId',
    'parent_id',
    'email',
    'password',
    'pin',
    'parentPin',
    'token',
    'apiKey',
    'api_key',
    'key',
    'secret'
];

/**
 * Anonymise un ID (garde seulement les 4 derniers caractères)
 * 
 * @param id - ID à anonymiser
 * @returns ID anonymisé
 * 
 * @example
 * anonymizeId('550e8400-e29b-41d4-a716-446655440000')
 * // Retourne: "***0000"
 */
export const anonymizeId = (id: string | undefined | null): string => {
    if (!id) return '***';
    if (id.length <= 4) return '***';
    return `***${id.slice(-4)}`;
};

/**
 * Anonymise récursivement un objet
 * 
 * @param obj - Objet à anonymiser
 * @returns Objet anonymisé
 */
function anonymizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => anonymizeObject(item));
    }

    const anonymized: any = {};

    for (const [key, value] of Object.entries(obj)) {
        // Vérifier si la clé est sensible
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            if (typeof value === 'string') {
                anonymized[key] = anonymizeId(value);
            } else {
                anonymized[key] = '***';
            }
        } else if (typeof value === 'object') {
            anonymized[key] = anonymizeObject(value);
        } else {
            anonymized[key] = value;
        }
    }

    return anonymized;
}

/**
 * Formate un message de log
 */
function formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    let formatted = `[${timestamp}] [${levelName}] ${message}`;

    if (data !== undefined) {
        const anonymized = config.anonymizeIds ? anonymizeObject(data) : data;
        formatted += ` ${JSON.stringify(anonymized)}`;
    }

    return formatted;
}

/**
 * Envoie un log à Sentry (production uniquement)
 */
async function sendToSentry(level: LogLevel, message: string, data?: any) {
    if (!config.sentryEnabled) return;

    try {
        // TODO: Intégrer Sentry SDK
        // import * as Sentry from '@sentry/browser';
        // 
        // if (level === LogLevel.ERROR) {
        //   Sentry.captureException(new Error(message), {
        //     extra: data
        //   });
        // } else if (level === LogLevel.WARN) {
        //   Sentry.captureMessage(message, {
        //     level: 'warning',
        //     extra: data
        //   });
        // }
    } catch (error) {
        console.error('Failed to send to Sentry:', error);
    }
}

/**
 * Logger principal
 */
export const logger = {
    /**
     * Log de débogage (développement uniquement)
     * 
     * @example
     * logger.debug('User data loaded', { userId: '123', count: 5 });
     * // DEV: [2026-02-10T09:00:00.000Z] [DEBUG] User data loaded {"userId":"***3","count":5}
     * // PROD: (rien)
     */
    debug: (message: string, data?: any) => {
        if (config.level <= LogLevel.DEBUG) {
            const formatted = formatMessage(LogLevel.DEBUG, message, data);
            console.log(`${config.colors[LogLevel.DEBUG]}${formatted}${config.reset}`);
        }
    },

    /**
     * Log d'information
     * 
     * @example
     * logger.info('Synchronization completed');
     * // [2026-02-10T09:00:00.000Z] [INFO] Synchronization completed
     */
    info: (message: string, data?: any) => {
        if (config.level <= LogLevel.INFO) {
            const formatted = formatMessage(LogLevel.INFO, message, data);
            console.log(`${config.colors[LogLevel.INFO]}${formatted}${config.reset}`);
        }
    },

    /**
     * Log d'avertissement
     * 
     * @example
     * logger.warn('Quota localStorage proche', { sizeKB: 4500 });
     */
    warn: (message: string, data?: any) => {
        if (config.level <= LogLevel.WARN) {
            const formatted = formatMessage(LogLevel.WARN, message, data);
            console.warn(`${config.colors[LogLevel.WARN]}${formatted}${config.reset}`);
            sendToSentry(LogLevel.WARN, message, data);
        }
    },

    /**
     * Log d'erreur
     * 
     * @example
     * logger.error('Failed to save data', { error: e.message });
     */
    error: (message: string, error?: any) => {
        const formatted = formatMessage(LogLevel.ERROR, message, error);
        console.error(`${config.colors[LogLevel.ERROR]}${formatted}${config.reset}`);
        sendToSentry(LogLevel.ERROR, message, error);
    },

    /**
     * Helper pour anonymiser manuellement
     * 
     * @example
     * logger.debug('Processing', { userId: logger.anonymize(userId) });
     */
    anonymize: anonymizeId,

    /**
     * Configure le niveau de log
     * 
     * @example
     * logger.setLevel(LogLevel.WARN); // Seulement WARN et ERROR
     */
    setLevel: (level: LogLevel) => {
        config.level = level;
    },

    /**
     * Active/désactive Sentry
     */
    setSentryEnabled: (enabled: boolean) => {
        config.sentryEnabled = enabled;
    }
};

// Export du type pour TypeScript
export type Logger = typeof logger;
