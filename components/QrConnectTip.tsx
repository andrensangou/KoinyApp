/**
 * QrConnectTip — Astuce contextuelle pour faire découvrir la connexion par QR.
 *
 * Apparaît une fois que le parent a au moins un enfant (donc juste après la
 * première création), pour lui suggérer d'installer Koiny sur l'appareil de
 * l'enfant via le QR code — sinon la feature reste invisible dans les réglages.
 *
 * Carte fixe en bas de l'écran (au-dessus de la bottom nav), non intrusive et
 * permanente une fois fermée (`localStorage`). « Comment faire » ouvre le guide.
 */

import React from 'react';
import { Language } from '../types';

const DISMISS_KEY = 'koiny_qr_tip_dismissed';

export const isQrTipDismissed = (): boolean => {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

interface QrConnectTipProps {
  isOpen: boolean;
  childName: string;
  language: Language;
  onHowTo: () => void;   // ouvre le HelpModal
  onDismiss: () => void; // ferme définitivement
}

const QrConnectTip: React.FC<QrConnectTipProps> = ({ isOpen, childName, language, onHowTo, onDismiss }) => {
  if (!isOpen) return null;

  const name = childName || (language === 'nl' ? 'je kind' : language === 'en' ? 'your child' : 'votre enfant');

  const t = {
    fr: {
      body: `Vous voulez installer Koiny sur la tablette ou le téléphone de ${name} ? Connectez l'appareil en scannant un QR code, pas besoin de remettre vos identifiants.`,
      howTo: 'Comment faire',
      later: 'Plus tard',
    },
    nl: {
      body: `Wil je Koiny installeren op de tablet of telefoon van ${name}? Verbind het toestel door een QR-code te scannen, je hoeft je gegevens niet opnieuw in te voeren.`,
      howTo: 'Hoe werkt het',
      later: 'Later',
    },
    en: {
      body: `Want to install Koiny on ${name}'s tablet or phone? Connect the device by scanning a QR code, no need to re-enter your credentials.`,
      howTo: 'How it works',
      later: 'Later',
    },
  }[language] ?? {
    body: `Want to install Koiny on ${name}'s tablet or phone? Connect the device by scanning a QR code, no need to re-enter your credentials.`,
    howTo: 'How it works',
    later: 'Later',
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    onDismiss();
  };

  return (
    <div
      className="fixed left-0 right-0 z-[150] px-4 pointer-events-none flex justify-center animate-slide-up"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
    >
      <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-4 relative overflow-hidden">
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-md shadow-fuchsia-500/25">
            <i className="fa-solid fa-qrcode text-lg" />
          </div>
          <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300 font-medium">{t.body}</p>
        </div>

        <div className="flex items-center gap-2 mt-3.5">
          <button
            onClick={() => { dismiss(); onHowTo(); }}
            className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-all"
          >
            {t.howTo}
          </button>
          <button
            onClick={dismiss}
            className="px-4 text-slate-500 dark:text-slate-400 font-bold py-2.5 text-sm"
          >
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrConnectTip;
