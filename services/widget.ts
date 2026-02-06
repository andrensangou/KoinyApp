import { Preferences } from '@capacitor/preferences';
import { ChildProfile } from '../types';

const APP_GROUP = 'group.com.koiny.app';

export const widgetService = {
    async init() {
        try {
            await Preferences.configure({ group: APP_GROUP });
            console.log('[WidgetService] Configured with group:', APP_GROUP);
        } catch (e) {
            console.error('[WidgetService] Init error:', e);
        }
    },

    async syncChildData(child: ChildProfile) {
        try {
            // Pour iOS, on utilise Preferences avec le groupe configuré
            const primaryGoal = child.goals && child.goals.length > 0 ? child.goals[0] : { name: 'Objectif', target: 1 };

            await Promise.all([
                Preferences.set({ key: 'childName', value: child.name }),
                Preferences.set({ key: 'balance', value: child.balance.toString() }),
                Preferences.set({ key: 'goalName', value: primaryGoal.name }),
                Preferences.set({ key: 'goalTarget', value: primaryGoal.target.toString() }),
                Preferences.set({ key: 'lastTransaction', value: (child.history && child.history.length > 0) ? child.history[0].amount.toString() : '0' })
            ]);

            console.log('[WidgetService] Synced data for:', child.name);
        } catch (e) {
            console.warn('[WidgetService] Sync failed (probably not on iOS or group not ready):', e);
        }
    }
};
