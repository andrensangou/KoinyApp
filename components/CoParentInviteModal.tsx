import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useModal } from '../hooks/useModal';
import { generateCoParentInvitation, getFamilyId } from '../services/supabase';
import type { Language } from '../types';

interface CoParentInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  language: Language;
}

export default function CoParentInviteModal({ isOpen, onClose, ownerId, language }: CoParentInviteModalProps) {
  useModal(isOpen);

  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const generate = async () => {
      setLoading(true);
      setError(null);
      setQrPayload(null);

      try {
        const familyId = await getFamilyId(ownerId);
        if (!familyId) {
          setError(language === 'fr' ? 'Famille introuvable' : language === 'nl' ? 'Familie niet gevonden' : 'Family not found');
          return;
        }
        if (cancelled) return;

        const result = await generateCoParentInvitation(ownerId, familyId);
        if (cancelled) return;

        setQrPayload(result.qr_payload);
        setExpiresAt(result.expires_at);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Erreur');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [isOpen, ownerId, language]);

  if (!isOpen) return null;

  const formatExpiry = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffMs <= 0) return language === 'fr' ? 'Expiré' : language === 'nl' ? 'Verlopen' : 'Expired';
    return `${diffH}h ${diffM}m`;
  };

  const handleCopy = async () => {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for iOS
      const textarea = document.createElement('textarea');
      textarea.value = qrPayload;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl px-6 pt-6 pb-10 animate-slide-up"
        style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-800 dark:text-white text-center mb-1">
          {language === 'fr' ? 'Inviter un co-parent' : language === 'nl' ? 'Co-ouder uitnodigen' : 'Invite Co-parent'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          {language === 'fr'
            ? "Scannez ce QR code depuis l'appareil du 2e parent"
            : language === 'nl'
              ? 'Scan deze QR-code vanaf het apparaat van de 2e ouder'
              : "Scan this QR code from the 2nd parent's device"}
        </p>

        {/* Content */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm text-slate-400">
              {language === 'fr' ? 'Génération...' : language === 'nl' ? 'Genereren...' : 'Generating...'}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {qrPayload && !loading && (
          <div className="flex flex-col items-center gap-4">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-md shadow-indigo-500/10">
              <QRCodeSVG
                value={qrPayload}
                size={200}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#312E81"
                marginSize={1}
              />
            </div>

            {/* Expiry */}
            {expiresAt && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-clock text-xs" />
                <span>
                  {language === 'fr' ? 'Expire dans' : language === 'nl' ? 'Verloopt over' : 'Expires in'}{' '}
                  {formatExpiry(expiresAt)}
                </span>
              </div>
            )}

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
              {copied
                ? (language === 'fr' ? 'Copié !' : language === 'nl' ? 'Gekopieerd!' : 'Copied!')
                : (language === 'fr' ? 'Copier le lien' : language === 'nl' ? 'Link kopiëren' : 'Copy Link')}
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {language === 'fr' ? 'Fermer' : language === 'nl' ? 'Sluiten' : 'Close'}
        </button>
      </div>
    </div>
  );
}
