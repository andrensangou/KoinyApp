/**
 * QrLoginModal — Connexion d'un appareil par QR code (côté TABLETTE).
 *
 * Affiché sur l'appareil NON connecté (ex: tablette de l'enfant). Génère un QR
 * que le parent scanne depuis son téléphone déjà connecté. Une fois approuvé,
 * la session s'ouvre automatiquement.
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Language } from '../types';
import { startQrLoginFlow, QR_PAYLOAD_PREFIX, QrSession } from '../services/qrAuth';
import { useModal } from '../hooks/useModal';

interface QrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
}

type FlowState = 'loading' | 'waiting' | 'success' | 'expired' | 'error';

const QrLoginModal: React.FC<QrLoginModalProps> = ({ isOpen, onClose, onSuccess, language }) => {
  const [state, setState] = useState<FlowState>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const cancelRef = useRef<(() => void) | null>(null);

  useModal(isOpen);

  const t = {
    title: language === 'fr' ? 'Connexion par QR code' : language === 'nl' ? 'Inloggen met QR-code' : 'Sign in with QR code',
    instructions: language === 'fr'
      ? 'Depuis le téléphone du parent déjà connecté : Profil → Connecter un appareil → scannez ce code.'
      : language === 'nl'
        ? 'Op de telefoon van de ingelogde ouder: Profiel → Apparaat verbinden → scan deze code.'
        : 'On the parent\'s phone (already signed in): Profile → Connect a device → scan this code.',
    waiting: language === 'fr' ? 'En attente du scan…' : language === 'nl' ? 'Wachten op scan…' : 'Waiting for scan…',
    success: language === 'fr' ? 'Connecté !' : language === 'nl' ? 'Verbonden!' : 'Connected!',
    expired: language === 'fr' ? 'Code expiré' : language === 'nl' ? 'Code verlopen' : 'Code expired',
    error: language === 'fr' ? 'Une erreur est survenue' : language === 'nl' ? 'Er ging iets mis' : 'Something went wrong',
    regenerate: language === 'fr' ? 'Générer un nouveau code' : language === 'nl' ? 'Nieuwe code' : 'Generate new code',
    close: language === 'fr' ? 'Fermer' : language === 'nl' ? 'Sluiten' : 'Close',
  };

  const start = () => {
    setState('loading');
    setQrDataUrl('');
    cancelRef.current?.();
    cancelRef.current = startQrLoginFlow({
      onCode: async (session: QrSession) => {
        try {
          const url = await QRCode.toDataURL(QR_PAYLOAD_PREFIX + session.code, {
            width: 280,
            margin: 1,
            color: { dark: '#1e1b4b', light: '#ffffff' },
          });
          setQrDataUrl(url);
          setState('waiting');
        } catch {
          setState('error');
        }
      },
      onSuccess: () => { setState('success'); setTimeout(onSuccess, 900); },
      onExpire: () => setState('expired'),
      onError: () => setState('error'),
    });
  };

  useEffect(() => {
    if (isOpen) start();
    return () => { cancelRef.current?.(); cancelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-sm p-7 text-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1">{t.title}</h2>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug mb-5">{t.instructions}</p>

        {/* Zone QR / état */}
        <div className="relative mx-auto mb-5 w-[280px] h-[280px] rounded-2xl bg-white border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
          {state === 'loading' && (
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500" />
          )}

          {(state === 'waiting') && qrDataUrl && (
            <img src={qrDataUrl} alt="QR code" className="w-full h-full object-contain p-2" />
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-3 text-emerald-600">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl">
                <i className="fa-solid fa-check" />
              </div>
              <span className="font-black">{t.success}</span>
            </div>
          )}

          {(state === 'expired' || state === 'error') && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl">
                <i className={`fa-solid ${state === 'expired' ? 'fa-clock' : 'fa-triangle-exclamation'}`} />
              </div>
              <span className="font-bold text-slate-500">{state === 'expired' ? t.expired : t.error}</span>
            </div>
          )}
        </div>

        {/* Statut sous le QR */}
        {state === 'waiting' && (
          <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm font-bold mb-5">
            <i className="fa-solid fa-circle-notch fa-spin" />
            {t.waiting}
          </div>
        )}

        {/* Actions */}
        {(state === 'expired' || state === 'error') && (
          <button onClick={start}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all mb-3">
            {t.regenerate}
          </button>
        )}

        <button onClick={onClose}
          className="w-full text-slate-500 dark:text-slate-400 font-bold py-2.5 text-sm">
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default QrLoginModal;
