
/**
 * Service de Notification Koiny v2.0
 * Gère les permissions et l'affichage des notifications système.
 * Support Web + iOS natif via Capacitor
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Removed hardcoded NOTIFICATION_TYPES to support i18n directly from components

class NotificationService {
    private hasPermission: boolean = false;
    private isNative: boolean = false;
    private notificationId: number = Date.now() % 100000; // ID unique au démarrage

    constructor() {
        this.isNative = Capacitor.isNativePlatform();

        if (!this.isNative && typeof window !== 'undefined' && 'Notification' in window) {
            this.hasPermission = Notification.permission === 'granted';
        }
    }

    /**
     * Demande l'autorisation à l'utilisateur
     */
    async requestPermission(): Promise<boolean> {
        console.log('[Notifications] Demande de permission, isNative:', this.isNative);

        if (this.isNative) {
            // iOS/Android natif
            try {
                console.log('[Notifications] Demande permission native...');
                const result = await LocalNotifications.requestPermissions();
                console.log('[Notifications] Résultat permission native:', result);
                this.hasPermission = result.display === 'granted';
                console.log('[Notifications] Permission accordée:', this.hasPermission);
                return this.hasPermission;
            } catch (error: any) {
                console.error('[Notifications] Erreur permission notifications natives:', error);

                // Si UNIMPLEMENTED, fallback sur notifications Web
                if (error?.code === 'UNIMPLEMENTED') {
                    console.log('[Notifications] Plugin natif non disponible, utilisation notifications Web');
                    this.isNative = false; // Basculer en mode Web
                    return this.requestPermissionWeb();
                }
                return false;
            }
        } else {
            return this.requestPermissionWeb();
        }
    }

    /**
     * Demande permission Web (séparé pour réutilisation)
     */
    private async requestPermissionWeb(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn("[Notifications] Ce navigateur ne supporte pas les notifications.");
            return false;
        }

        console.log('[Notifications] Permission actuelle:', Notification.permission);
        const permission = await Notification.requestPermission();
        console.log('[Notifications] Nouvelle permission:', permission);
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
    }

    /**
     * Vérifie si les permissions sont déjà accordées
     */
    async checkPermission(): Promise<boolean> {
        if (this.isNative) {
            try {
                const result = await LocalNotifications.checkPermissions();
                this.hasPermission = result.display === 'granted';
                return this.hasPermission;
            } catch (error) {
                console.error('[Notifications] Erreur vérification permission:', error);
                return false;
            }
        } else {
            if ('Notification' in window) {
                this.hasPermission = Notification.permission === 'granted';
                return this.hasPermission;
            }
            return false;
        }
    }

    isMuted(): boolean {
        try {
            return localStorage.getItem('koiny_notifications_muted') === 'true';
        } catch (e) {
            return false;
        }
    }

    setMuted(muted: boolean) {
        try {
            localStorage.setItem('koiny_notifications_muted', muted ? 'true' : 'false');
        } catch (e) {
            console.error('Erreur sauvegarde mute:', e);
        }
    }

    /**
     * Envoie une notification locale
     */
    async send(title: string, body: string, data?: { childId?: string; type?: string; missionId?: string }) {
        if (!this.hasPermission) {
            console.warn('Permission notifications non accordée');
            return;
        }

        if (this.isMuted()) {
            console.log('Notifications rendues silencieuses par l\'utilisateur');
            return;
        }

        if (this.isNative) {
            // Notification native iOS/Android
            try {
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            id: this.notificationId++,
                            title: title,
                            body: body,
                            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true }, // Dans 1 seconde
                            sound: 'default',
                            smallIcon: 'ic_stat_icon_config_sample',
                            iconColor: '#667eea',
                            extra: data || {} // Add extra data for deep linking
                        }
                    ]
                });
            } catch (error) {
                console.error('Erreur envoi notification native:', error);
            }
        } else {
            // Notification Web
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: '/favicon.svg',
                        badge: '/favicon.svg',
                        tag: `koiny-${Date.now()}`,
                        data: data || {} // Add data for web notifications
                    });
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: '/favicon.svg',
                    data: data || {}
                });
            }
        }
    }
    /**
     * Notify for child request
     */
    notifyChildRequest(childId: string, type: 'GIFT' | 'MISSION', title: string, body: string) {
        this.send(title, body, { childId, type });
    }

    /**
     * Notify for mission completion
     */
    notifyMissionComplete(childId: string, missionId: string | undefined, title: string, body: string) {
        this.send(title, body, { childId, type: 'MISSION_COMPLETE', missionId });
    }

    /**
     * Periodic reminder for parents
     */
    notifyParentReminder(title: string, body: string) {
        this.send(title, body, { type: 'PARENT_REMINDER' });
    }
}

export const notifications = new NotificationService();
