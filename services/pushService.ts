/**
 * pushService.ts — Cross-device push notifications via FCM (Android)
 *
 * Flow:
 *   1. App start → registerPushToken() → saves FCM token to Supabase device_tokens
 *   2. Event (new mission, mission completed…) → sendPushToChild() / sendPushToParent()
 *      → calls Supabase edge function send-push → FCM delivers to target device
 *
 * Token table schema (run migration in Supabase):
 *   device_tokens (id, user_id, token, platform, mode, child_id, updated_at)
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getSupabase } from './supabase';
import { logger } from './logger';

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`;

// ── Register & store token ────────────────────────────────────────────────────

interface RegisterOptions {
  userId: string;
  mode: 'parent' | 'child';
  childId?: string; // required when mode = 'child'
}

export async function registerPushToken(opts: RegisterOptions): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      logger.warn('[Push] Permission refusée');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      logger.debug('[Push] Token reçu:', logger.anonymize(token.value));
      await saveToken({
        userId: opts.userId,
        token: token.value,
        platform: Capacitor.getPlatform() as 'android' | 'ios',
        mode: opts.mode,
        childId: opts.childId,
      });
    });

    PushNotifications.addListener('registrationError', (err) => {
      logger.error('[Push] Erreur registration:', err);
    });

  } catch (e) {
    logger.error('[Push] registerPushToken error:', e);
  }
}

async function saveToken(opts: {
  userId: string;
  token: string;
  platform: 'android' | 'ios';
  mode: 'parent' | 'child';
  childId?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('device_tokens')
    .upsert({
      user_id: opts.userId,
      token: opts.token,
      platform: opts.platform,
      mode: opts.mode,
      child_id: opts.childId ?? null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,platform,mode,child_id',
    });

  if (error) logger.error('[Push] Erreur sauvegarde token:', error);
  else logger.debug('[Push] Token sauvegardé');
}

// ── Send helpers ──────────────────────────────────────────────────────────────

interface SendPayload {
  userId: string;        // compte Supabase propriétaire
  targetMode: 'parent' | 'child';
  targetChildId?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendPush(payload: SendPayload): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error('[Push] Edge function error:', err);
    }
  } catch (e) {
    logger.error('[Push] sendPush error:', e);
  }
}

/** Parent → Enfant : nouvelle mission assignée */
export async function sendPushNewMission(opts: {
  userId: string;
  childId: string;
  missionTitle: string;
  reward: number;
  currency: string;
  language: 'fr' | 'nl' | 'en';
}): Promise<void> {
  const titles = { fr: '🎯 Nouvelle mission !', nl: '🎯 Nieuwe missie!', en: '🎯 New mission!' };
  const bodies = {
    fr: `${opts.missionTitle} — +${opts.reward.toFixed(2)}${opts.currency}`,
    nl: `${opts.missionTitle} — +${opts.reward.toFixed(2)}${opts.currency}`,
    en: `${opts.missionTitle} — +${opts.reward.toFixed(2)}${opts.currency}`,
  };
  await sendPush({
    userId: opts.userId,
    targetMode: 'child',
    targetChildId: opts.childId,
    title: titles[opts.language],
    body: bodies[opts.language],
    data: { type: 'NEW_MISSION', childId: opts.childId },
  });
}

/** Enfant → Parent : mission marquée terminée */
export async function sendPushMissionComplete(opts: {
  userId: string;
  childName: string;
  missionTitle: string;
  language: 'fr' | 'nl' | 'en';
}): Promise<void> {
  const titles = {
    fr: `✅ ${opts.childName} a terminé une mission`,
    nl: `✅ ${opts.childName} heeft een missie voltooid`,
    en: `✅ ${opts.childName} completed a mission`,
  };
  const bodies = {
    fr: `"${opts.missionTitle}" attend ta validation 👀`,
    nl: `"${opts.missionTitle}" wacht op jouw goedkeuring 👀`,
    en: `"${opts.missionTitle}" is waiting for your approval 👀`,
  };
  await sendPush({
    userId: opts.userId,
    targetMode: 'parent',
    title: titles[opts.language],
    body: bodies[opts.language],
    data: { type: 'MISSION_COMPLETE' },
  });
}

/** Parent → Enfant : mission validée avec montant crédité */
export async function sendPushMissionApproved(opts: {
  userId: string;
  childId: string;
  missionTitle: string;
  reward: number;
  currency: string;
  note?: string;
  language: 'fr' | 'nl' | 'en';
}): Promise<void> {
  const titles = {
    fr: `🎉 Mission validée !`,
    nl: `🎉 Missie goedgekeurd!`,
    en: `🎉 Mission approved!`,
  };
  const bodies = {
    fr: `+${opts.reward.toFixed(2)}${opts.currency} crédités${opts.note ? ` · "${opts.note}"` : ''}`,
    nl: `+${opts.reward.toFixed(2)}${opts.currency} bijgeschreven${opts.note ? ` · "${opts.note}"` : ''}`,
    en: `+${opts.reward.toFixed(2)}${opts.currency} credited${opts.note ? ` · "${opts.note}"` : ''}`,
  };
  await sendPush({
    userId: opts.userId,
    targetMode: 'child',
    targetChildId: opts.childId,
    title: titles[opts.language],
    body: bodies[opts.language],
    data: { type: 'MISSION_APPROVED', childId: opts.childId },
  });
}

/** Parent → Enfant : mission refusée */
export async function sendPushMissionRejected(opts: {
  userId: string;
  childId: string;
  missionTitle: string;
  note?: string;
  language: 'fr' | 'nl' | 'en';
}): Promise<void> {
  const titles = {
    fr: `❌ Mission refusée`,
    nl: `❌ Missie geweigerd`,
    en: `❌ Mission rejected`,
  };
  const bodies = {
    fr: `"${opts.missionTitle}"${opts.note ? ` · "${opts.note}"` : ' · Réessaie !'}`,
    nl: `"${opts.missionTitle}"${opts.note ? ` · "${opts.note}"` : ' · Probeer opnieuw!'}`,
    en: `"${opts.missionTitle}"${opts.note ? ` · "${opts.note}"` : ' · Try again!'}`,
  };
  await sendPush({
    userId: opts.userId,
    targetMode: 'child',
    targetChildId: opts.childId,
    title: titles[opts.language],
    body: bodies[opts.language],
    data: { type: 'MISSION_REJECTED', childId: opts.childId },
  });
}

/** Enfant → Parent : demande de nouvelle mission */
export async function sendPushMissionRequested(opts: {
  userId: string;
  childName: string;
  language: 'fr' | 'nl' | 'en';
}): Promise<void> {
  const titles = {
    fr: `📋 ${opts.childName} demande une mission`,
    nl: `📋 ${opts.childName} vraagt een missie`,
    en: `📋 ${opts.childName} is requesting a mission`,
  };
  const bodies = {
    fr: `Crée une nouvelle mission pour ${opts.childName} 👀`,
    nl: `Maak een nieuwe missie voor ${opts.childName} 👀`,
    en: `Create a new mission for ${opts.childName} 👀`,
  };
  await sendPush({
    userId: opts.userId,
    targetMode: 'parent',
    title: titles[opts.language],
    body: bodies[opts.language],
    data: { type: 'MISSION_REQUESTED' },
  });
}

/** Enfant → Parent : demande de cadeau/objectif */
export async function sendPushGiftRequested(opts: {
  userId: string;
  childName: string;
  language: 'fr' | 'nl' | 'en';
}): Promise<void> {
  const titles = {
    fr: `🎁 ${opts.childName} veut un cadeau`,
    nl: `🎁 ${opts.childName} wil een cadeau`,
    en: `🎁 ${opts.childName} wants a gift`,
  };
  const bodies = {
    fr: `Regarde ce que ${opts.childName} a choisi 🛍️`,
    nl: `Bekijk wat ${opts.childName} heeft gekozen 🛍️`,
    en: `Check what ${opts.childName} has picked 🛍️`,
  };
  await sendPush({
    userId: opts.userId,
    targetMode: 'parent',
    title: titles[opts.language],
    body: bodies[opts.language],
    data: { type: 'GIFT_REQUESTED' },
  });
}

/** Nettoyage du token au logout */
export async function unregisterPushToken(opts: {
  userId: string;
  mode: 'parent' | 'child';
  childId?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', opts.userId)
    .eq('platform', platform)
    .eq('mode', opts.mode)
    .eq('child_id', opts.childId ?? null);
}
