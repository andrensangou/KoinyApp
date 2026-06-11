/**
 * QrScannerModal — Scanner un QR de connexion (côté PARENT, déjà connecté).
 *
 * Le parent ouvre ce scanner depuis son téléphone connecté, vise le QR affiché
 * sur l'appareil à connecter (tablette de l'enfant). Une fois le code détecté,
 * il confirme → l'appareil distant ouvre une session sur le compte du parent.
 *
 * Décodage 100% web (jsQR + getUserMedia) → cross-platform iOS/Android.
 * Permissions natives requises :
 *   iOS     → NSCameraUsageDescription dans Info.plist
 *   Android → <uses-permission android:name="android.permission.CAMERA"/>
 */

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Language } from '../types';
import { approveQrSession, parseQrPayload } from '../services/qrAuth';
import { useModal } from '../hooks/useModal';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type ScanState = 'scanning' | 'detected' | 'approving' | 'success' | 'error' | 'no_camera';

const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, language }) => {
  const [state, setState] = useState<ScanState>('scanning');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedCodeRef = useRef<string | null>(null);

  useModal(isOpen);

  const t = {
    title: language === 'fr' ? 'Connecter un appareil' : language === 'nl' ? 'Apparaat verbinden' : 'Connect a device',
    aim: language === 'fr' ? 'Visez le QR code affiché sur l\'autre appareil' : language === 'nl' ? 'Richt op de QR-code op het andere apparaat' : 'Point at the QR code shown on the other device',
    detected: language === 'fr' ? 'Code détecté' : language === 'nl' ? 'Code gedetecteerd' : 'Code detected',
    confirmQuestion: language === 'fr' ? 'Connecter cet appareil à votre compte ?' : language === 'nl' ? 'Dit apparaat met je account verbinden?' : 'Connect this device to your account?',
    confirm: language === 'fr' ? 'Connecter' : language === 'nl' ? 'Verbinden' : 'Connect',
    rescan: language === 'fr' ? 'Scanner à nouveau' : language === 'nl' ? 'Opnieuw scannen' : 'Scan again',
    approving: language === 'fr' ? 'Connexion…' : language === 'nl' ? 'Verbinden…' : 'Connecting…',
    success: language === 'fr' ? 'Appareil connecté !' : language === 'nl' ? 'Apparaat verbonden!' : 'Device connected!',
    error: language === 'fr' ? 'Échec de la connexion. Le code a peut-être expiré.' : language === 'nl' ? 'Verbinding mislukt. De code is mogelijk verlopen.' : 'Connection failed. The code may have expired.',
    noCamera: language === 'fr' ? 'Caméra inaccessible. Vérifiez les autorisations.' : language === 'nl' ? 'Camera niet beschikbaar. Controleer de rechten.' : 'Camera unavailable. Check permissions.',
    close: language === 'fr' ? 'Fermer' : language === 'nl' ? 'Sluiten' : 'Close',
  };

  const stopCamera = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(tr => tr.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setState('scanning');
    detectedCodeRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      scanLoop();
    } catch {
      setState('no_camera');
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (result) {
          const code = parseQrPayload(result.data);
          if (code) {
            detectedCodeRef.current = code;
            stopCamera();
            setState('detected');
            return;
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  const handleApprove = async () => {
    const code = detectedCodeRef.current;
    if (!code) return;
    setState('approving');
    try {
      // Timeout 12s : si approveQrSession hang (réseau lent / edge function / QR expiré),
      // on bascule en 'error' au lieu de rester figé sur "Connexion…" pour toujours.
      await Promise.race([
        approveQrSession(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
      ]);
      setState('success');
      setTimeout(onClose, 1400);
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (isOpen) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/60" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1">{t.title}</h2>

        {/* Zone caméra / états */}
        <div className="relative mx-auto my-4 w-full aspect-square rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center">
          {/* Vidéo (visible seulement en scanning) */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${state === 'scanning' ? '' : 'hidden'}`}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Cadre de visée */}
          {state === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 h-2/3 border-4 border-white/80 rounded-2xl" />
            </div>
          )}

          {state === 'detected' && (
            <div className="flex flex-col items-center gap-3 text-indigo-600 px-6">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-4xl">
                <i className="fa-solid fa-qrcode" />
              </div>
              <span className="font-black">{t.detected}</span>
            </div>
          )}

          {state === 'approving' && (
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-white" />
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-3 text-emerald-400">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-4xl">
                <i className="fa-solid fa-check" />
              </div>
              <span className="font-black">{t.success}</span>
            </div>
          )}

          {(state === 'error' || state === 'no_camera') && (
            <div className="flex flex-col items-center gap-3 text-slate-300 px-6">
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-4xl">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <span className="font-bold text-sm leading-snug">{state === 'no_camera' ? t.noCamera : t.error}</span>
            </div>
          )}
        </div>

        {/* Texte / actions selon l'état */}
        {state === 'scanning' && (
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">{t.aim}</p>
        )}

        {state === 'detected' && (
          <>
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200 mb-4">{t.confirmQuestion}</p>
            <button onClick={handleApprove}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all mb-2">
              {t.confirm}
            </button>
            <button onClick={startCamera} className="w-full text-indigo-600 font-bold py-2 text-sm">
              {t.rescan}
            </button>
          </>
        )}

        {state === 'approving' && (
          <p className="text-[13px] text-indigo-600 font-bold mb-4">{t.approving}</p>
        )}

        {(state === 'error' || state === 'no_camera') && (
          <button onClick={startCamera}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all mb-2">
            {t.rescan}
          </button>
        )}

        {state !== 'success' && (
          <button onClick={onClose} className="w-full text-slate-500 dark:text-slate-400 font-bold py-2.5 text-sm">
            {t.close}
          </button>
        )}
      </div>
    </div>
  );
};

export default QrScannerModal;
