
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

        if (this.isNative) {
            this.initializeChannels();
        }
    }

    private async initializeChannels() {
        try {
            await LocalNotifications.createChannel({
                id: 'koiny-gains',
                name: 'Gains Koiny',
                description: 'Sons de pièces lors des validations',
                sound: 'coins.mp3',
                importance: 5,
                visibility: 1,
            });
            console.log('[Notifications] Channel koiny-gains créé');
        } catch (error) {
            console.error('[Notifications] Erreur création channel:', error);
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
     * Envoie une notification locale avec regroupement par type
     */
    async send(title: string, body: string, data?: { childId?: string; type?: string; missionId?: string }, channelId?: string) {
        if (!this.hasPermission) {
            console.warn('Permission notifications non accordée');
            return;
        }

        if (this.isMuted()) {
            console.log('Notifications rendues silencieuses par l\'utilisateur');
            return;
        }

        // Déterminer le type et l'ID pour le regroupement
        const notificationType = data?.type || 'default';
        const notificationId = this.getNotificationId(notificationType);
        const tag = `koiny-${notificationType}`;

        if (this.isNative) {
            // Notification native iOS/Android
            // L'ID stable (1001, 1002, 1003) remplace les anciennes du même type
            try {
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            id: notificationId,
                            title: title,
                            body: body,
                            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true }, // Dans 1 seconde
                            sound: channelId === 'koiny-gains' ? 'coins.mp3' : 'default',
                            channelId: channelId || 'default',
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
                        tag: tag, // Regroupement par type
                        data: data || {} // Add data for web notifications
                    });
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: '/favicon.svg',
                    data: data || {},
                    tag: tag // Regroupement par type
                });
            }
        }
    }

    /**
     * Obtient un ID stable basé sur le type de notification
     */
    private getNotificationId(type: string): number {
        const idMap: { [key: string]: number } = {
            'GIFT': 1001,
            'MISSION': 1002,
            'MISSION_COMPLETE': 1003,
            'NEW_MISSION': 1004,
            'GOAL_MILESTONE': 1005,
            'PARENT_REMINDER': this.notificationId++, // Rappels sans limite
            'default': this.notificationId++
        };
        return idMap[type] || this.notificationId++;
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
        this.send(title, body, { childId, type: 'MISSION_COMPLETE', missionId }, 'koiny-gains');
    }

    /**
     * Periodic reminder for parents
     */
    notifyParentReminder(title: string, body: string) {
        this.send(title, body, { type: 'PARENT_REMINDER' });
    }

    /**
     * Notify child when a new mission is created by the parent
     */
    notifyNewMission(childId: string, title: string, body: string) {
        this.send(title, body, { childId, type: 'NEW_MISSION' });
    }

    /**
     * Notify when a child reaches a savings goal milestone (50%, 75%, 100%)
     */
    notifyGoalMilestone(childId: string, title: string, body: string) {
        this.send(title, body, { childId, type: 'GOAL_MILESTONE' });
    }

    /**
     * Schedule a weekly pocket money reminder (every Sunday at 10:00)
     * Uses native scheduled notifications for persistence even when app is closed
     */
    async scheduleWeeklyReminder(title: string, body: string) {
        if (!this.isNative) {
            console.log('[Notifications] Weekly reminder only available on native platforms');
            return;
        }

        try {
            // Cancel any existing weekly reminder first
            try {
                await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
            } catch (_) { }

            // Schedule for next Sunday at 10:00
            const now = new Date();
            const nextSunday = new Date(now);
            nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
            nextSunday.setHours(10, 0, 0, 0);

            // If it's already past 10:00 on Sunday, schedule for next week
            if (nextSunday <= now) {
                nextSunday.setDate(nextSunday.getDate() + 7);
            }

            await LocalNotifications.schedule({
                notifications: [{
                    id: 9999,
                    title: title,
                    body: body,
                    schedule: {
                        at: nextSunday,
                        repeats: true,
                        every: 'week',
                        allowWhileIdle: true
                    },
                    sound: 'default',
                    smallIcon: 'ic_stat_icon_config_sample',
                    iconColor: '#667eea'
                }]
            });
            console.log('[Notifications] ✅ Weekly reminder scheduled for', nextSunday.toISOString());
        } catch (error) {
            console.error('[Notifications] Error scheduling weekly reminder:', error);
        }
    }
}

export const notifications = new NotificationService();
