import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

const isAndroid = Capacitor.getPlatform() === 'android';

async function logEvent(name: string, params?: Record<string, unknown>) {
  if (!isAndroid) return;
  try {
    await FirebaseAnalytics.logEvent({ name, params });
  } catch {
    // fire-and-forget — never block the UI
  }
}

export function trackSignUp(method: 'google' | 'apple' | 'email') {
  logEvent('sign_up', { method });
}

export function trackChildCreated(isFirstChild: boolean) {
  logEvent('child_created', { is_first_child: isFirstChild });
}

export function trackPurchase(productId: string, value: number) {
  logEvent('purchase', { item_id: productId, currency: 'EUR', value });
}
