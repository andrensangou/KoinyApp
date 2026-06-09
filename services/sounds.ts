/**
 * Sons synthétisés "enfant" (Web Audio API) — doux, volume bas (0.18), aucun fichier.
 * Remplace les anciens MP3 (/sounds/*.mp3) jugés trop forts/adultes.
 * Variantes choisies avec l'utilisateur (09/06/2026) via la page d'aperçu.
 * Marche sur iOS/Android (WebView) et web. Respecte le flag `enabled` (son ON/OFF).
 */
const VOL = 0.18;
let _ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (!_ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    if (_ctx && _ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

/** Une note : oscillateur doux, enveloppe attaque rapide + décroissance type carillon. */
function tone(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', peak = 1) {
  const c = audioCtx();
  if (!c) return;
  const now = c.currentTime + t0;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(c.destination);
  const v = VOL * peak;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(v, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/** Petite touche scintillante aiguë (pour les célébrations). */
function sparkle(t0: number) {
  tone(2093, t0, 0.18, 'sine', 0.35);
  tone(2637, t0 + 0.04, 0.16, 'sine', 0.28);
}

export const sounds = {
  /** 💰 Gain — carillon ascendant joyeux (C5-E5-G5). */
  gain(enabled = true) {
    if (!enabled) return;
    tone(523, 0, 0.18, 'sine');
    tone(659, 0.1, 0.18, 'sine');
    tone(784, 0.2, 0.3, 'sine');
  },
  /** 🎯 Objectif atteint — petite fanfare + scintillement. */
  goal(enabled = true) {
    if (!enabled) return;
    tone(523, 0, 0.14, 'triangle');
    tone(659, 0.12, 0.14, 'triangle');
    tone(784, 0.24, 0.14, 'triangle');
    tone(1047, 0.36, 0.4, 'sine');
    sparkle(0.42);
  },
  /** 🛍️ Achat — "ta-da" doux. */
  purchase(enabled = true) {
    if (!enabled) return;
    tone(659, 0, 0.12, 'sine');
    tone(988, 0.1, 0.28, 'sine');
  },
  /** ⭐ Mission — blip mignon. */
  mission(enabled = true) {
    if (!enabled) return;
    tone(784, 0, 0.07, 'triangle', 0.8);
    tone(1175, 0.06, 0.16, 'sine');
  },
  /** 😅 Pénalité — petit "oh" descendant, doux (pas effrayant). */
  penalty(enabled = true) {
    if (!enabled) return;
    tone(440, 0, 0.16, 'sine');
    tone(349, 0.12, 0.3, 'sine');
  },
};
