/**
 * qrAuth — Connexion d'un appareil par scan de QR code (façon WhatsApp Web).
 *
 * Deux rôles :
 *   • TABLETTE (non connectée) : génère une session, affiche le QR, attend
 *     l'approbation, puis ouvre une vraie session Supabase via l'OTP.
 *   • TÉLÉPHONE PARENT (connecté) : scanne le QR et approuve la session.
 *
 * Tout passe par l'edge function `qr-auth` (la table est verrouillée).
 * Le client Supabase attache automatiquement le bon token :
 *   - anon (tablette) pour create/poll
 *   - token utilisateur (parent) pour approve
 */

import { getSupabase } from './supabase';
import { logger } from './logger';

export type QrPollStatus = 'pending' | 'claimed' | 'consumed' | 'expired' | 'not_found';

export interface QrSession {
  code: string;
  expiresAt: string;
}

const POLL_INTERVAL_MS = 2000;

// ── TABLETTE : créer une session de connexion ──────────────────────────────
export async function createQrSession(): Promise<QrSession> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('qr-auth', {
    body: { action: 'create' },
  });
  if (error || !data?.code) {
    logger.error('[qrAuth] create échoué', error);
    throw new Error('qr_create_failed');
  }
  return { code: data.code, expiresAt: data.expiresAt };
}

// ── TABLETTE : interroger l'état d'une session (un seul appel) ──────────────
export async function pollQrSession(
  code: string,
): Promise<{ status: QrPollStatus; email?: string; token?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('qr-auth', {
    body: { action: 'poll', code },
  });
  if (error) {
    logger.error('[qrAuth] poll échoué', error);
    return { status: 'not_found' };
  }
  return data;
}

// ── TABLETTE : ouvrir la vraie session une fois l'OTP reçu ─────────────────
export async function completeQrLogin(email: string, token: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    logger.error('[qrAuth] verifyOtp échoué', error);
    throw new Error('qr_verify_failed');
  }
}

/**
 * TABLETTE : flux complet. Crée une session, expose le code (pour le QR), puis
 * poll jusqu'à approbation → ouvre la session. Renvoie une fonction d'annulation.
 *
 * @param onCode    appelé dès que le code QR est prêt à afficher
 * @param onSuccess appelé quand la session est ouverte (login réussi)
 * @param onExpire  appelé si la session expire sans approbation
 * @param onError   appelé en cas d'erreur réseau/technique
 */
export function startQrLoginFlow(callbacks: {
  onCode: (session: QrSession) => void;
  onSuccess: () => void;
  onExpire: () => void;
  onError: (err: unknown) => void;
}): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  (async () => {
    try {
      const session = await createQrSession();
      if (cancelled) return;
      callbacks.onCode(session);

      const expiresMs = new Date(session.expiresAt).getTime();

      const tick = async () => {
        if (cancelled) return;
        if (Date.now() > expiresMs) {
          callbacks.onExpire();
          return;
        }
        const res = await pollQrSession(session.code);
        if (cancelled) return;

        if (res.status === 'claimed' && res.email && res.token) {
          try {
            await completeQrLogin(res.email, res.token);
            if (!cancelled) callbacks.onSuccess();
          } catch (e) {
            if (!cancelled) callbacks.onError(e);
          }
          return;
        }
        if (res.status === 'expired' || res.status === 'not_found') {
          callbacks.onExpire();
          return;
        }
        // 'pending' ou 'consumed' → continuer à attendre
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      };

      timer = setTimeout(tick, POLL_INTERVAL_MS);
    } catch (e) {
      if (!cancelled) callbacks.onError(e);
    }
  })();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

// ── PARENT (connecté) : approuver une session scannée ──────────────────────
export async function approveQrSession(code: string): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('qr-auth', {
    body: { action: 'approve', code },
  });
  if (error || !data?.ok) {
    const reason = data?.error || error?.message || 'unknown';
    logger.error('[qrAuth] approve échoué', reason);
    throw new Error(reason);
  }
}

/**
 * PARENT : extrait le code d'une valeur scannée. Le QR encode `koiny-qr:<code>`
 * pour éviter d'approuver par erreur un QR quelconque.
 */
export function parseQrPayload(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const prefix = 'koiny-qr:';
  if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  return null;
}

export const QR_PAYLOAD_PREFIX = 'koiny-qr:';
