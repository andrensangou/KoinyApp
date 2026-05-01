import { Preferences } from '@capacitor/preferences';
import { ChildProfile } from '../types';

/**
 * Writes the primary child's data to Capacitor Preferences (standard storage)
 * so the native AppDelegate can read it from UserDefaults.standard
 * and forward it to the widget's App Group.
 */
export const updateWidgetData = async (children: ChildProfile[], language?: string) => {
  try {
    const child = children[0];
    if (!child) return;

    // Pick the first non-archived goal
    const primaryGoal =
      child.goals?.find(g => !g.status || g.status === 'ACTIVE') ?? null;

    const lang = language || localStorage.getItem('koiny_language') || 'fr';

    // History dates are stored as DD/MM/YYYY — convert to Date for comparison
    const parseHistoryDate = (dateStr: string): Date => {
      const parts = dateStr.split('/');
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      return new Date(dateStr); // fallback for ISO format
    };

    const today = new Date();
    const todayDateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const lastApprovedEntry = (child.history ?? [])
      .filter(h => h.amount > 0)
      .sort((a, b) => parseHistoryDate(b.date).getTime() - parseHistoryDate(a.date).getTime())[0];

    const todayEarned = (child.history ?? [])
      .filter(h => h.amount > 0 && h.date === todayDateStr)
      .reduce((sum, h) => sum + h.amount, 0);

    const pendingMissionsCount = (child.missions ?? [])
      .filter(m => m.status === 'PENDING').length;

    const payload = {
      childName: child.name,
      balance: child.balance,
      goalName: primaryGoal?.name ?? null,
      goalTarget: primaryGoal?.target ?? 0,
      language: lang,
      lastMissionApprovedDate: lastApprovedEntry
        ? parseHistoryDate(lastApprovedEntry.date).toISOString()
        : null,
      pendingMissionsCount,
      todayEarned,
    };

    // Write to standard Capacitor Preferences
    // iOS stores this as UserDefaults.standard["CapacitorStorage.koiny_widget_data"]
    // The AppDelegate reads this and copies it to the App Group for the widget
    await Preferences.set({
      key: 'koiny_widget_data',
      value: JSON.stringify(payload),
    });

    console.log('[WidgetBridge] ✅ Synced widget data for:', child.name,
      '| balance:', child.balance,
      '| goal:', primaryGoal?.name ?? 'none');
  } catch {
    // Not on native – ignore
  }
};
