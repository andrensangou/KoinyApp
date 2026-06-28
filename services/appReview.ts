/**
 * appReview.ts — Demande d'avis in-app (SKStoreReviewRequest iOS / In-App Review Android).
 *
 * Déclencheur : après une VALIDATION DE MISSION (moment positif) + au moins
 * MIN_OPENS ouvertures de l'app (user engagé). Demandé une seule fois côté app.
 * Apple/Google brident en plus automatiquement (max ~3 prompts/an).
 */
import { InAppReview } from '@capacitor-community/in-app-review';
import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

const OPEN_COUNT_KEY = 'koiny_app_open_count';
const ASKED_KEY = 'koiny_review_asked';
const MIN_OPENS = 3;

/** À appeler une fois au démarrage de l'app (compte les ouvertures). */
export function incrementAppOpen(): void {
  try {
    const n = parseInt(localStorage.getItem(OPEN_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(OPEN_COUNT_KEY, String(n));
  } catch {
    /* best-effort */
  }
}

/**
 * À appeler après un moment positif (validation de mission).
 * Demande l'avis si l'user est engagé (>= MIN_OPENS ouvertures) et qu'on ne
 * l'a pas déjà demandé. Fire-and-forget — ne bloque jamais l'UI.
 */
export async function maybeRequestReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (localStorage.getItem(ASKED_KEY) === '1') return; // déjà demandé une fois
    const opens = parseInt(localStorage.getItem(OPEN_COUNT_KEY) || '0', 10);
    if (opens < MIN_OPENS) return; // pas assez engagé

    // Marque AVANT l'appel (évite un double-prompt si appelé en rafale).
    localStorage.setItem(ASKED_KEY, '1');
    await InAppReview.requestReview();
    logger.debug('[Review] Prompt d\'avis demandé');
  } catch (e) {
    logger.error('[Review] requestReview error:', e);
  }
}
