
import React, { useState } from 'react';
import { GlobalState, Language } from '../types';
import { translations } from '../i18n';
import HelpModal from './HelpModal';
import { isAndroid } from '../hooks/usePlatform';

interface LoginViewProps {
  data: GlobalState;
  onSelectChild: (childId: string) => void;
  onParentAccess: () => void;
}

const PAL: Record<string, { from: string; to: string; light: string; accent: string; soft: string; text: string }> = {
  indigo:  { from: '#818cf8', to: '#4338ca', light: '#eef2ff', accent: '#4f46e5', soft: '#e0e7ff', text: '#3730a3' },
  emerald: { from: '#34d399', to: '#059669', light: '#ecfdf5', accent: '#10b981', soft: '#d1fae5', text: '#065f46' },
  rose:    { from: '#fb7185', to: '#be123c', light: '#fff1f2', accent: '#f43f5e', soft: '#ffe4e6', text: '#9f1239' },
  amber:   { from: '#fbbf24', to: '#d97706', light: '#fffbeb', accent: '#f59e0b', soft: '#fef3c7', text: '#92400e' },
  blue:    { from: '#60a5fa', to: '#2563eb', light: '#eff6ff', accent: '#3b82f6', soft: '#dbeafe', text: '#1e40af' },
  pink:    { from: '#f472b6', to: '#db2777', light: '#fdf2f8', accent: '#ec4899', soft: '#fce7f3', text: '#9d174d' },
  violet:  { from: '#a78bfa', to: '#7c3aed', light: '#f5f3ff', accent: '#8b5cf6', soft: '#ede9fe', text: '#5b21b6' },
  purple:  { from: '#c084fc', to: '#9333ea', light: '#faf5ff', accent: '#a855f7', soft: '#f3e8ff', text: '#6b21a8' },
  teal:    { from: '#2dd4bf', to: '#0d9488', light: '#f0fdfa', accent: '#14b8a6', soft: '#ccfbf1', text: '#134e4a' },
  cyan:    { from: '#22d3ee', to: '#0891b2', light: '#ecfeff', accent: '#06b6d4', soft: '#cffafe', text: '#164e63' },
  orange:  { from: '#fb923c', to: '#ea580c', light: '#fff7ed', accent: '#f97316', soft: '#fed7aa', text: '#9a3412' },
};

const renderAvatar = (avatar: string, colorClass: string = 'indigo') => {
  if (avatar.startsWith('fa-')) {
    return <i className={avatar}></i>;
  }
  const src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${avatar}`;
  return (
    <div className={`w-full h-full rounded-full bg-gradient-to-br from-${colorClass}-100 to-${colorClass}-300 flex items-center justify-center overflow-hidden`}>
      <img src={src} alt="Avatar" loading="lazy" className="w-full h-full object-contain scale-110 translate-y-1" />
    </div>
  );
};

const LoginView: React.FC<LoginViewProps> = ({ data, onSelectChild, onParentAccess }) => {
  const t = translations[data.language];
  const curr = data.currency || '€';
  const [showHelp, setShowHelp] = useState(false);

  if (isAndroid) {
    return (
      /* ── Android MD3 Login Screen ── */
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col font-sans" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Top indigo band */}
        <div className="bg-indigo-600 pt-12 pb-10 px-6 flex flex-col items-center" style={{ paddingTop: 'max(48px, env(safe-area-inset-top))' }}>
          <div className="w-20 h-20 mb-4 rounded-[1.5rem] overflow-hidden shadow-lg">
            <img src="/mascot.png" alt="Koiny Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-medium text-white mb-1">{t.login.welcome}</h1>
          <p className="text-white/70 text-sm">{t.login.selectProfile}</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pt-6 pb-4">
          {data.children.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl text-center mb-6">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                <i className="fa-solid fa-people-roof"></i>
              </div>
              <h2 className="text-base font-medium text-slate-900 dark:text-white mb-1">{t.login.noProfileTitle}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{t.login.noProfileDesc}</p>
              <button onClick={onParentAccess} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium w-full active:bg-indigo-700 transition-colors">
                {t.login.createFirstProfile}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {data.children.map(child => (
                <button
                  key={child.id}
                  onClick={() => onSelectChild(child.id)}
                  aria-label={`${child.name} — ${child.balance.toFixed(2)}${curr}`}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700 transition-colors flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    {renderAvatar(child.avatar, child.colorClass)}
                  </div>
                  <div className="text-center">
                    <span className="block font-medium text-slate-900 dark:text-white text-sm mb-1">{child.name}</span>
                    <span className={`inline-block px-3 py-1 bg-${child.colorClass}-100 dark:bg-${child.colorClass}-900/30 text-${child.colorClass}-700 dark:text-${child.colorClass}-400 rounded-full text-xs font-medium`}>
                      {child.balance.toFixed(2)} {curr}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        {data.children.length > 0 && (
          <div className="px-4 pb-4">
            <button onClick={onParentAccess}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl text-sm font-medium active:opacity-80 transition-opacity"
            >
              <i className="fa-solid fa-lock text-emerald-400" aria-hidden="true"></i>
              <span>{t.login.parentAccess}</span>
            </button>
          </div>
        )}

        <div className="text-center pb-6">
          <button onClick={() => { const event = new CustomEvent('openLegalModal'); window.dispatchEvent(event); }}
            className="text-xs text-slate-400 underline"
          >
            {t.legal.link}
          </button>
        </div>

        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} language={data.language} />
      </div>
    );
  }

  /* ── iOS Login Screen — New Design ── */
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Blob gradients */}
      <div style={{ position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(165,180,252,0.35)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -40, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(251,207,232,0.3)', filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 80, right: 20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(167,243,208,0.25)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px 40px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', paddingTop: 'max(52px, env(safe-area-inset-top))', paddingBottom: 24 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 28, overflow: 'hidden',
            margin: '0 auto 18px',
            boxShadow: '0 20px 60px rgba(99,102,241,0.45), 0 4px 16px rgba(0,0,0,0.15)'
          }}>
            <img src="/mascot.png" alt="Koiny" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.8px', lineHeight: 1.3, marginBottom: 10 }}>
            {t.login.welcome}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {t.login.selectProfile}
          </div>
        </div>

        {data.children.length === 0 ? (
          /* Empty state */
          <div style={{ background: 'white', borderRadius: 28, padding: '32px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: '#4f46e5' }}>
              <i className="fa-solid fa-people-roof"></i>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>{t.login.noProfileTitle}</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>{t.login.noProfileDesc}</p>
            <button onClick={onParentAccess}
              style={{ width: '100%', height: 52, borderRadius: 18, background: '#4f46e5', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              {t.login.createFirstProfile}
            </button>
          </div>
        ) : (
          /* Child cards grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {data.children.map((child, i) => {
              const pal = PAL[child.colorClass] || PAL.indigo;
              return (
                <button
                  key={child.id}
                  onClick={() => onSelectChild(child.id)}
                  aria-label={`${child.name} — ${child.balance.toFixed(2)}${curr}`}
                  style={{
                    background: 'white', borderRadius: 32, padding: '22px 12px 18px',
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Shimmer stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${pal.from},${pal.to})`, opacity: 0.6, borderRadius: '32px 32px 0 0' }} />
                  {/* Avatar with gradient ring */}
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: `linear-gradient(135deg,${pal.from},${pal.to})`, padding: 3, boxShadow: `0 4px 16px ${pal.accent}55`, flexShrink: 0 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: pal.light, overflow: 'hidden' }}>
                      {renderAvatar(child.avatar, child.colorClass)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{child.name}</div>
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 100, background: pal.soft, fontSize: 10, fontWeight: 800, color: pal.text, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      {child.balance.toFixed(2)}&nbsp;{curr}
                    </div>
                  </div>
                  {/* Chevron */}
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: pal.light, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 11, color: pal.accent }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Parent Space button */}
        {data.children.length > 0 && (
          <button
            onClick={onParentAccess}
            style={{
              width: '100%', height: 56, borderRadius: 22,
              background: '#0f172a', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              boxShadow: '0 12px 40px rgba(15,23,42,0.35)',
              marginBottom: 20,
            }}
          >
            <i className="fa-solid fa-lock" style={{ fontSize: 14, color: '#34d399' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {t.login.parentAccess}
            </span>
          </button>
        )}

        {/* Legal */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { const event = new CustomEvent('openLegalModal'); window.dispatchEvent(event); }}
            style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {t.legal.link}
          </button>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} language={data.language} />
    </div>
  );
};

export default LoginView;
