import { updateWidgetData } from './widgetBridge';
import { ChildProfile } from '../types';

/**
 * Widget service – thin wrapper around widgetBridge.
 * Kept as a separate module for backward-compat with App.tsx imports.
 */
export const widgetService = {
    async init() {
        console.log('[WidgetService] Initialized (direct App Group write via widgetBridge)');
    },

    async syncChildData(child: ChildProfile, language?: string) {
        // Delegate to the unified widgetBridge with a single-element array
        await updateWidgetData([child], language);
    },
};
