import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GlobalState, Language, ChildProfile, Mission, HistoryEntry, Goal } from '../types';
import { translations } from '../i18n';
import { verifyPin } from '../services/security';
import { loadParentPinLocally, deleteParentPinLocally } from '../services/pinStorage';
import { getSupabase } from '../services/supabase';
import HelpModal from './HelpModal';
import { SubscriptionModal } from './SubscriptionModal';
import QrScannerModal from './QrScannerModal';
import QrConnectTip, { isQrTipDismissed } from './QrConnectTip';
import { notifications } from '../services/notifications';

// ── Design tokens (mirrors koiny-data.jsx)
const KT = {
  primary: '#4f46e5',
  primaryDark: '#3730a3',
  primaryDeep: '#312e81',
  primaryLight: '#e0e7ff',
  success: '#10b981',
  successLight: '#d1fae5',
  danger: '#f43f5e',
  dangerLight: '#ffe4e6',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  orange: '#f97316',
  orangeLight: '#fff7ed',
  purple: '#a855f7',
  purpleLight: '#f3e8ff',
  text: '#1e293b',
  textSm: '#64748b',
  textXs: '#94a3b8',
  border: '#e2e8f0',
  bg: '#f8fafc',
  surface: '#ffffff',
  poppins: "'Poppins', sans-serif",
};

const COLOR_PAL: Record<string, { bg: string; light: string; dark: string; text: string }> = {
  indigo:  { bg: '#4f46e5', light: '#e0e7ff', dark: '#3730a3', text: '#4338ca' },
  emerald: { bg: '#10b981', light: '#d1fae5', dark: '#059669', text: '#059669' },
  rose:    { bg: '#f43f5e', light: '#ffe4e6', dark: '#be123c', text: '#e11d48' },
  amber:   { bg: '#f59e0b', light: '#fef3c7', dark: '#d97706', text: '#d97706' },
  blue:    { bg: '#3b82f6', light: '#dbeafe', dark: '#2563eb', text: '#2563eb' },
  pink:    { bg: '#ec4899', light: '#fce7f3', dark: '#db2777', text: '#db2777' },
  purple:  { bg: '#a855f7', light: '#f3e8ff', dark: '#7c3aed', text: '#7c3aed' },
};

const ICON_MAP: Record<string, string> = {
  broom: 'fa-broom', utensils: 'fa-utensils', book: 'fa-book', dog: 'fa-dog',
  trash: 'fa-trash-can', shirt: 'fa-shirt', bed: 'fa-bed', bike: 'fa-person-biking',
  trophy: 'fa-trophy', gamepad: 'fa-gamepad', plane: 'fa-plane', cart: 'fa-cart-shopping',
  music: 'fa-music', futbol: 'fa-futbol', wand: 'fa-wand-magic-sparkles',
  rocket: 'fa-rocket', star: 'fa-star', gift: 'fa-gift', gavel: 'fa-gavel',
};

const MISSION_TEMPLATES = [
  { title: 'Ranger sa chambre', titleNl: 'Kamer opruimen', titleEn: 'Clean bedroom', amount: 2.50, icon: 'broom' },
  { title: 'Faire la vaisselle', titleNl: 'Afwassen', titleEn: 'Do the dishes', amount: 1.50, icon: 'utensils' },
  { title: 'Sortir le chien', titleNl: 'Hond uitlaten', titleEn: 'Walk the dog', amount: 3.00, icon: 'dog' },
  { title: 'Lire 20 min', titleNl: '20 min lezen', titleEn: 'Read 20 min', amount: 1.00, icon: 'book' },
  { title: 'Faire ses devoirs', titleNl: 'Huiswerk maken', titleEn: 'Do homework', amount: 2.00, icon: 'book' },
  { title: 'Mettre la table', titleNl: 'Tafel dekken', titleEn: 'Set the table', amount: 1.00, icon: 'utensils' },
];

const MISSION_ICONS = ['broom', 'utensils', 'book', 'dog', 'star', 'rocket', 'shirt', 'bed', 'bike', 'trash'];

const kGetIcon = (id: string, fb = 'fa-star') => ICON_MAP[id] || id || fb;
const kGetColor = (cls: string) => COLOR_PAL[cls] || COLOR_PAL.indigo;
const kAvatar = (seed: string) => {
  if (!seed) return '';
  if (seed.startsWith('data:') || seed.startsWith('http')) return seed;
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`;
};
const kIsPenalty = (t: string) => /amende|penalty|punition|fine/i.test(t);
const kIsPurchase = (t: string) => /retrait|achat|purchase|dépense/i.test(t);

const kWeeklySummary = (history: HistoryEntry[]) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return history.reduce(
    (acc, item) => {
      const [d, m, y] = item.date.split('/');
      const dt = new Date(+y || new Date().getFullYear(), +m - 1, +d);
      if (dt >= cutoff) {
        if (item.amount < 0 && kIsPenalty(item.title)) acc.penalty += Math.abs(item.amount);
        else if (item.amount < 0) acc.expense += Math.abs(item.amount);
        else acc.income += item.amount;
      }
      return acc;
    },
    { income: 0, expense: 0, penalty: 0 }
  );
};

// ── Props (mirrors ParentView)
interface AndroidParentViewProps {
  data: GlobalState;
  language: Language;
  onApprove: (childId: string, missionId: string, note?: string) => void;
  onReject: (childId: string, missionId: string, note?: string) => void;
  onAddMission: (childId: string, title: string, amount: number) => void;
  onEditMission: (childId: string, missionId: string, updates: { title?: string; reward?: number }) => void;
  onDeleteMission: (childId: string, missionId: string) => void;
  onManualTransaction: (childId: string, amount: number, reason: string) => void;
  onAddChild: (childData: { name: string; colorClass: string; avatar: string; birthday?: string }) => Promise<void>;
  onEditChild: (childId: string, updates: Partial<ChildProfile>) => void;
  onDeleteChild: (childId: string) => Promise<void>;
  onClearHistory: (childId: string) => void;
  onSetPin: (pin: string) => Promise<void>;
  onToggleNotifications: (enabled: boolean) => void;
  onExit: () => void;
  onSignOut: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onSetPremium?: (enabled: boolean) => void;
  onSetLanguage?: (lang: Language) => void;
  onSetMaxBalance?: (limit: number) => void;
  isOfflineMode?: boolean;
  notificationAction?: { type: string; childId?: string } | null;
  onClearNotificationAction?: () => void;
}

type TabId = 'dashboard' | 'history' | 'requests' | 'profile';
type WithdrawSubtype = 'PURCHASE' | 'PENALTY';

// ── Toast
function Toast({ msg, type }: { msg: string; type: 'success' | 'danger' | 'info' }) {
  const col = type === 'success' ? KT.success : type === 'danger' ? KT.danger : KT.primary;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-circle-xmark' : 'fa-circle-info';
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 200,
      background: '#1e293b', borderRadius: 14, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
      animation: 'toastIn 0.28s ease forwards',
      fontFamily: KT.poppins,
    }}>
      <i className={`fa-solid ${icon}`} style={{ color: col, fontSize: 18, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{msg}</span>
    </div>
  );
}

// ── Bottom Sheet wrapper
function Sheet({ isOpen, onClose, title, children }: {
  isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [slide, setSlide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSlide(true)));
    } else {
      setSlide(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!mounted) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, overflow: 'hidden' }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: slide ? 'rgba(0,0,0,0.45)' : 'transparent',
        transition: 'background 0.32s',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff',
        borderRadius: '20px 20px 0 0', maxHeight: '88%', display: 'flex', flexDirection: 'column',
        transform: slide ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', zIndex: 91,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: KT.border }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 14px' }}>
            <span style={{ fontFamily: KT.poppins, fontWeight: 700, fontSize: 12, color: KT.textXs, letterSpacing: '0.1em' }}>{title}</span>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%', background: KT.bg, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-xmark" style={{ color: KT.textSm, fontSize: 13 }} />
            </button>
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, fontFamily: KT.poppins }}>{children}</div>
      </div>
    </div>
  );
}

// ── Section header
const SecHead = ({ label, right }: { label: string; right?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{label}</span>
    {right}
  </div>
);

// ── Add Mission Sheet
function AddMissionSheet({ isOpen, onClose, onAdd, currency, language }: {
  isOpen: boolean; onClose: () => void;
  onAdd: (title: string, amount: number, icon: string) => void;
  currency: string; language: Language;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [icon, setIcon] = useState('broom');
  const ok = title.trim() && amount && parseFloat(amount) > 0;

  const submit = () => {
    if (!ok) return;
    onAdd(title.trim(), parseFloat(amount), icon);
    setTitle(''); setAmount(''); setIcon('broom'); onClose();
  };

  const getTplTitle = (tpl: typeof MISSION_TEMPLATES[0]) =>
    language === 'nl' ? tpl.titleNl : language === 'en' ? tpl.titleEn : tpl.title;

  const mLbl = { display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 } as React.CSSProperties;
  const mInp = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box' as const, outline: 'none' } as React.CSSProperties;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'NOUVELLE MISSION' : language === 'nl' ? 'NIEUWE MISSIE' : 'NEW MISSION'}>
      <div style={{ padding: '0 20px 28px' }}>
        {/* Templates */}
        <div style={{ marginBottom: 18 }}>
          <p style={mLbl}>{language === 'fr' ? 'MODÈLES RAPIDES' : language === 'nl' ? 'SNELLE SJABLONEN' : 'QUICK TEMPLATES'}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MISSION_TEMPLATES.map(tpl => {
              const tplTitle = getTplTitle(tpl);
              return (
                <button key={tpl.title} onClick={() => { setTitle(tplTitle); setAmount(String(tpl.amount)); setIcon(tpl.icon); }}
                  style={{
                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                    background: title === tplTitle ? KT.primaryLight : KT.bg,
                    border: title === tplTitle ? `1.5px solid ${KT.primary}` : `1.5px solid ${KT.border}`,
                    fontFamily: KT.poppins, fontSize: 12,
                    color: title === tplTitle ? KT.primary : KT.textSm,
                  }}>
                  {tplTitle}
                </button>
              );
            })}
          </div>
        </div>
        {/* Icon picker */}
        <div style={{ marginBottom: 18 }}>
          <p style={mLbl}>{language === 'fr' ? 'ICÔNE' : language === 'nl' ? 'ICOON' : 'ICON'}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MISSION_ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                style={{
                  width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background: icon === ic ? KT.primaryLight : KT.bg,
                  border: icon === ic ? `2px solid ${KT.primary}` : `2px solid ${KT.border}`,
                }}>
                <i className={`fa-solid ${kGetIcon(ic)}`} style={{ color: icon === ic ? KT.primary : KT.textXs, fontSize: 14 }} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={mLbl}>{language === 'fr' ? 'TITRE' : language === 'nl' ? 'TITEL' : 'TITLE'}</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={language === 'fr' ? 'Ex: Ranger sa chambre' : language === 'nl' ? 'Bv: Kamer opruimen' : 'E.g: Clean bedroom'}
            style={mInp} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={mLbl}>{language === 'fr' ? 'RÉCOMPENSE' : language === 'nl' ? 'BELONING' : 'REWARD'}</label>
          <div style={{ position: 'relative' }}>
            <input value={amount} onChange={e => { const v = e.target.value; if (parseFloat(v) <= 100 || v === '') setAmount(v); }}
              type="number" min="0" max="100" step="0.5" placeholder="2.50"
              style={{ ...mInp, paddingRight: 44 }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: KT.poppins, fontWeight: 700, color: KT.textXs, fontSize: 16 }}>{currency}</span>
          </div>
        </div>
        <button onClick={submit} disabled={!ok}
          style={{
            width: '100%', padding: 16, borderRadius: 14, background: ok ? KT.primary : KT.border, border: 'none',
            fontFamily: KT.poppins, fontWeight: 700, fontSize: 14, color: ok ? '#fff' : KT.textXs,
            cursor: ok ? 'pointer' : 'not-allowed', letterSpacing: '0.05em',
          }}>
          {language === 'fr' ? 'CRÉER LA MISSION' : language === 'nl' ? 'MISSIE AANMAKEN' : 'CREATE MISSION'}
        </button>
      </div>
    </Sheet>
  );
}

// ── Edit Mission Sheet
function EditMissionSheet({ isOpen, onClose, mission, onSave, currency, language }: {
  isOpen: boolean; onClose: () => void;
  mission: Mission | null;
  onSave: (missionId: string, updates: { title: string; reward: number }) => void;
  currency: string; language: Language;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen && mission) {
      setTitle(mission.title);
      setAmount(String(mission.reward));
    }
  }, [isOpen, mission]);

  const ok = title.trim() && amount && parseFloat(amount) > 0;
  const submit = () => {
    if (!ok || !mission) return;
    onSave(mission.id, { title: title.trim(), reward: parseFloat(amount) });
    onClose();
  };

  const mLbl = { display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 } as React.CSSProperties;
  const mInp = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box' as const, outline: 'none' } as React.CSSProperties;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'MODIFIER LA MISSION' : language === 'nl' ? 'MISSIE BEWERKEN' : 'EDIT MISSION'}>
      <div style={{ padding: '0 20px 28px' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={mLbl}>{language === 'fr' ? 'TITRE' : language === 'nl' ? 'TITEL' : 'TITLE'}</label>
          <input value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} style={mInp} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={mLbl}>{language === 'fr' ? 'RÉCOMPENSE' : language === 'nl' ? 'BELONING' : 'REWARD'}</label>
          <div style={{ position: 'relative' }}>
            <input value={amount} onChange={e => { const v = e.target.value; if (parseFloat(v) <= 100 || v === '') setAmount(v); }}
              type="number" min="0" max="100" step="0.5" style={{ ...mInp, paddingRight: 44 }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: KT.poppins, fontWeight: 700, color: KT.textXs, fontSize: 16 }}>{currency}</span>
          </div>
        </div>
        <button onClick={submit} disabled={!ok}
          style={{ width: '100%', padding: 16, borderRadius: 14, background: ok ? KT.primary : KT.border, border: 'none', fontFamily: KT.poppins, fontWeight: 700, fontSize: 14, color: ok ? '#fff' : KT.textXs, cursor: ok ? 'pointer' : 'not-allowed', letterSpacing: '0.05em' }}>
          {language === 'fr' ? 'ENREGISTRER' : language === 'nl' ? 'OPSLAAN' : 'SAVE'}
        </button>
      </div>
    </Sheet>
  );
}

// ── Transaction Sheet
function TransactionSheet({ isOpen, onClose, onConfirm, currency, childName, balance, language }: {
  isOpen: boolean; onClose: () => void;
  onConfirm: (amount: number, reason: string, isDeposit: boolean, subtype: WithdrawSubtype) => void;
  currency: string; childName: string; balance: number; language: Language;
}) {
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [subtype, setSubtype] = useState<WithdrawSubtype | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const isDeposit = type === 'DEPOSIT';
  const needsSubtype = !isDeposit && subtype === null;
  const ok = amount && parseFloat(amount) > 0 && !needsSubtype;

  const submit = () => {
    if (!ok || (!isDeposit && !subtype)) return;
    onConfirm(parseFloat(amount), reason, isDeposit, isDeposit ? 'PURCHASE' : (subtype as WithdrawSubtype));
    setAmount(''); setReason(''); setType('DEPOSIT'); setSubtype(null); onClose();
  };

  const mLbl = { display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 } as React.CSSProperties;
  const mInp = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box' as const, outline: 'none' } as React.CSSProperties;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'TRANSACTION MANUELLE' : language === 'nl' ? 'MANUELE TRANSACTIE' : 'MANUAL TRANSACTION'}>
      <div style={{ padding: '0 20px 28px' }}>
        {/* Child info */}
        <div style={{ background: KT.bg, borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${KT.border}` }}>
          <span style={{ fontFamily: KT.poppins, fontSize: 13, color: KT.textSm }}>{childName}</span>
          <span style={{ fontFamily: KT.poppins, fontSize: 16, fontWeight: 800, color: KT.text }}>{balance.toFixed(2)}{currency}</span>
        </div>
        {/* Type toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {([
            ['DEPOSIT', 'fa-plus', language === 'fr' ? 'CRÉDITER' : language === 'nl' ? 'STORTEN' : 'DEPOSIT', KT.success, KT.successLight],
            ['WITHDRAW', 'fa-minus', language === 'fr' ? 'DÉBITER' : language === 'nl' ? 'AFSCHRIJVEN' : 'DEBIT', KT.danger, KT.dangerLight],
          ] as const).map(([k, ic, lb, col, bg]) => (
            <button key={k} onClick={() => { setType(k as 'DEPOSIT' | 'WITHDRAW'); setSubtype(null); }}
              style={{
                padding: 14, borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: type === k ? bg : KT.bg,
                border: type === k ? `2px solid ${col}` : '2px solid transparent',
              }}>
              <i className={`fa-solid ${ic}`} style={{ fontSize: 20, color: type === k ? col : KT.textXs }} />
              <span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: type === k ? col : KT.textXs, letterSpacing: '0.06em' }}>{lb}</span>
            </button>
          ))}
        </div>
        {type === 'WITHDRAW' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {([
              ['PURCHASE', 'fa-cart-shopping', language === 'fr' ? 'ACHAT' : language === 'nl' ? 'AANKOOP' : 'PURCHASE', KT.orange, KT.orangeLight],
              ['PENALTY', 'fa-gavel', language === 'fr' ? 'AMENDE' : language === 'nl' ? 'BOETE' : 'FINE', KT.danger, KT.dangerLight],
            ] as const).map(([k, ic, lb, col, bg]) => (
              <button key={k} onClick={() => setSubtype(k as WithdrawSubtype)}
                style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: subtype === k ? bg : KT.bg,
                  border: subtype === k ? `2px solid ${col}` : '2px solid transparent',
                }}>
                <i className={`fa-solid ${ic}`} style={{ fontSize: 14, color: subtype === k ? col : KT.textXs }} />
                <span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: subtype === k ? col : KT.textXs, letterSpacing: '0.06em' }}>{lb}</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={mLbl}>{language === 'fr' ? 'MONTANT' : language === 'nl' ? 'BEDRAG' : 'AMOUNT'}</label>
          <div style={{ position: 'relative' }}>
            <input value={amount} onChange={e => { const v = e.target.value; if (parseFloat(v) <= 100 || v === '') setAmount(v); }}
              type="number" min="0" max="100" step="0.5" placeholder="0.00"
              style={{ ...mInp, paddingRight: 44, fontSize: 22, fontWeight: 800, color: isDeposit ? KT.success : KT.danger }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: KT.poppins, fontWeight: 700, color: KT.textXs, fontSize: 18 }}>{currency}</span>
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={mLbl}>{language === 'fr' ? 'MOTIF (OPTIONNEL)' : language === 'nl' ? 'REDEN (OPTIONEEL)' : 'REASON (OPTIONAL)'}</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder={language === 'fr' ? 'Ex: Cahier de cours' : language === 'nl' ? 'Bv: Schrift' : 'E.g: Notebook'}
            style={mInp} />
        </div>
        <button onClick={submit} disabled={!ok}
          style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: ok ? (isDeposit ? KT.success : KT.danger) : KT.border,
            fontFamily: KT.poppins, fontWeight: 700, fontSize: 14,
            color: ok ? '#fff' : KT.textXs, cursor: ok ? 'pointer' : 'not-allowed', letterSpacing: '0.05em',
          }}>
          {needsSubtype
            ? (language === 'fr' ? 'CHOISIR ACHAT OU AMENDE' : language === 'nl' ? 'KIES AANKOOP OF BOETE' : 'CHOOSE PURCHASE OR FINE')
            : isDeposit
              ? (language === 'fr' ? 'CONFIRMER LE CRÉDIT' : language === 'nl' ? 'STORTING BEVESTIGEN' : 'CONFIRM DEPOSIT')
              : (language === 'fr' ? 'CONFIRMER LE DÉBIT' : language === 'nl' ? 'AFSCHRIJVING BEVESTIGEN' : 'CONFIRM DEBIT')}
        </button>
      </div>
    </Sheet>
  );
}

// ── Review Mission Sheet
function ReviewSheet({ isOpen, onClose, mission, childName, onApprove, onReject, currency, language, defaultAction }: {
  isOpen: boolean; onClose: () => void;
  mission: Mission | null; childName: string;
  onApprove: (missionId: string, note?: string) => void;
  onReject: (missionId: string, note?: string) => void;
  currency: string; language: Language;
  defaultAction?: 'approve' | 'reject';
}) {
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (isOpen) { setAction(defaultAction ?? null); setNote(''); }
    else { setNote(''); setAction(null); }
  }, [isOpen, defaultAction]);

  const confirm = () => {
    if (!action || !mission) return;
    action === 'approve' ? onApprove(mission.id, note) : onReject(mission.id, note);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'VALIDER LA MISSION' : language === 'nl' ? 'MISSIE VALIDEREN' : 'REVIEW MISSION'}>
      {mission && (
        <div style={{ padding: '0 20px 28px' }}>
          {/* Mission card */}
          <div style={{ background: KT.bg, borderRadius: 16, padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${KT.border}` }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: KT.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fa-solid ${kGetIcon(mission.icon)}`} style={{ fontSize: 20, color: KT.primary }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: KT.poppins, fontSize: 14, fontWeight: 600, color: KT.text, margin: '0 0 4px' }}>{mission.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: KT.poppins, fontSize: 15, fontWeight: 800, color: KT.primary }}>+{mission.reward.toFixed(2)}{currency}</span>
                <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.warning, background: KT.warningLight, padding: '2px 8px', borderRadius: 8 }}>
                  {language === 'fr' ? 'EN ATTENTE' : language === 'nl' ? 'IN AFWACHTING' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>
          {/* Approve / Reject */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {([
              ['approve', 'fa-check', language === 'fr' ? 'APPROUVER' : language === 'nl' ? 'GOEDKEUREN' : 'APPROVE', KT.success, KT.successLight],
              ['reject', 'fa-xmark', language === 'fr' ? 'REFUSER' : language === 'nl' ? 'WEIGEREN' : 'REJECT', KT.danger, KT.dangerLight],
            ] as const).map(([k, ic, lb, col, bg]) => (
              <button key={k} onClick={() => setAction(k as 'approve' | 'reject')}
                style={{
                  padding: 14, borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  background: action === k ? bg : KT.bg,
                  border: action === k ? `2px solid ${col}` : '2px solid transparent',
                }}>
                <i className={`fa-solid ${ic}`} style={{ fontSize: 24, color: action === k ? col : KT.textXs }} />
                <span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: action === k ? col : KT.textXs, letterSpacing: '0.06em' }}>{lb}</span>
              </button>
            ))}
          </div>
          {/* Note */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              {language === 'fr' ? `MESSAGE POUR ${childName.toUpperCase()} (OPTIONNEL)` : language === 'nl' ? `BERICHT VOOR ${childName.toUpperCase()} (OPTIONEEL)` : `MESSAGE FOR ${childName.toUpperCase()} (OPTIONAL)`}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder={language === 'fr' ? 'Bravo, super travail ! 🌟' : language === 'nl' ? 'Goed gedaan, super werk! 🌟' : 'Great job, well done! 🌟'} rows={2}
              style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box', outline: 'none', resize: 'none' }} />
          </div>
          <button onClick={confirm} disabled={!action}
            style={{
              width: '100%', padding: 16, borderRadius: 14, letterSpacing: '0.05em', border: 'none',
              background: !action ? KT.border : action === 'approve' ? KT.success : KT.danger,
              fontFamily: KT.poppins, fontWeight: 700, fontSize: 14,
              color: action ? '#fff' : KT.textXs, cursor: action ? 'pointer' : 'not-allowed',
            }}>
            {!action
              ? (language === 'fr' ? 'SÉLECTIONNER UNE ACTION' : language === 'nl' ? 'SELECTEER EEN ACTIE' : 'SELECT AN ACTION')
              : action === 'approve'
                ? (language === 'fr' ? '✓  APPROUVER LA MISSION' : language === 'nl' ? '✓  MISSIE GOEDKEUREN' : '✓  APPROVE MISSION')
                : (language === 'fr' ? '✕  REFUSER LA MISSION' : language === 'nl' ? '✕  MISSIE WEIGEREN' : '✕  REJECT MISSION')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ══ DASHBOARD SCREEN ══════════════════════════════════════════
function DashboardScreen({ data, childId, onSelectChild, onAddMission, onEditMission, onDeleteMission, onTransaction, onReview, onAddGoal, onEditGoal, onDeleteGoal, onGoToRequests, language }: {
  data: GlobalState; childId: string;
  onSelectChild: (id: string) => void;
  onAddMission: () => void;
  onEditMission: (mission: Mission) => void;
  onDeleteMission: (missionId: string) => void;
  onTransaction: () => void;
  onReview: (mission: Mission) => void;
  onAddGoal: (name: string, target: number, icon: string) => void;
  onEditGoal: (goalId: string, name: string, target: number, icon: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onGoToRequests: () => void;
  language: Language;
}) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const child = data.children.find(c => c.id === childId);
  const currency = data.currency || '€';
  if (!child) return null;

  const cc = kGetColor(child.colorClass); // couleur de l'enfant
  const FREE_GOALS_LIMIT = 1;
  const summary = kWeeklySummary(child.history);
  const pending = child.missions.filter(m => m.status === 'PENDING');
  const active = child.missions.filter(m => m.status === 'ACTIVE');
  const goals = (child.goals || []).filter(g => g.status !== 'ARCHIVED');
  const maxBal = data.maxBalance || 100;
  const balPct = Math.min(100, Math.round(child.balance / maxBal * 100));

  return (
    <div>
      {/* ── HERO */}
      <div style={{
        background: `linear-gradient(155deg, ${KT.primaryDeep} 0%, ${KT.primaryDark} 45%, ${KT.primary} 100%)`,
        paddingTop: 'calc(env(safe-area-inset-top) + 60px)', paddingBottom: 28, paddingLeft: 20, paddingRight: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Deco circles */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, right: 20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Child selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {data.children.map(c => {
            const isActive = c.id === childId;
            const ccc = kGetColor(c.colorClass);
            const hasPending = c.missions.some(m => m.status === 'PENDING');
            return (
              <button key={c.id} onClick={() => onSelectChild(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 5px 5px',
                  borderRadius: 24, flexShrink: 0, cursor: 'pointer', position: 'relative',
                  background: isActive ? ccc.bg + '44' : 'rgba(255,255,255,0.09)',
                  border: isActive ? `1.5px solid ${ccc.bg}` : '1.5px solid rgba(255,255,255,0.18)',
                }}>
                <img src={kAvatar(c.avatar)} alt={c.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain', background: ccc.light, border: `1.5px solid ${ccc.bg}44` }} />
                <span style={{ fontFamily: KT.poppins, fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.72)' }}>{c.name}</span>
                {hasPending && <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: KT.danger, border: '1.5px solid #3730a3' }} />}
              </button>
            );
          })}
        </div>

        {/* Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <img src={kAvatar(child.avatar)} alt={child.name}
            style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'contain', background: cc.light, border: `2.5px solid ${cc.bg}`, flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.62)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>
              {language === 'fr' ? `SOLDE DE ${child.name.toUpperCase()}` : language === 'nl' ? `SALDO VAN ${child.name.toUpperCase()}` : `${child.name.toUpperCase()}'S BALANCE`}
            </p>
            <p style={{ fontFamily: KT.poppins, fontSize: 34, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
              {child.balance.toFixed(2)}<span style={{ fontSize: 20, fontWeight: 600, opacity: 0.8 }}>{currency}</span>
            </p>
          </div>
        </div>

      </div>

      {/* ── BODY */}
      <div style={{ background: KT.bg, paddingBottom: 16 }}>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 16px 0' }}>
          {[
            { label: language === 'fr' ? 'MISSION' : language === 'nl' ? 'MISSIE' : 'MISSION', icon: 'fa-plus', color: KT.primary, bg: KT.primaryLight, border: '#c7d2fe', onClick: onAddMission },
            { label: language === 'fr' ? 'TRANSACTION' : language === 'nl' ? 'TRANSACTIE' : 'TRANSACTION', icon: 'fa-coins', color: KT.success, bg: KT.successLight, border: '#a7f3d0', onClick: onTransaction },
          ].map(a => (
            <button key={a.label} onClick={a.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 14, background: KT.surface, border: `1.5px solid ${a.border}`, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${a.icon}`} style={{ color: a.color, fontSize: 15 }} />
              </div>
              <span style={{ fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: a.color, letterSpacing: '0.05em' }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* 7-day summary */}
        <div style={{ padding: '18px 16px 0' }}>
          <SecHead label={language === 'fr' ? 'BILAN 7 JOURS' : language === 'nl' ? 'OVERZICHT 7 DAGEN' : '7-DAY SUMMARY'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: language === 'fr' ? 'REVENUS' : language === 'nl' ? 'INKOMSTEN' : 'EARNED', val: `+${summary.income.toFixed(2)}`, color: KT.success, bg: KT.successLight, icon: 'fa-arrow-up' },
              { label: language === 'fr' ? 'DÉPENSES' : language === 'nl' ? 'UITGAVEN' : 'SPENT', val: `-${summary.expense.toFixed(2)}`, color: '#d97706', bg: KT.warningLight, icon: 'fa-cart-shopping' },
              { label: language === 'fr' ? 'AMENDES' : language === 'nl' ? 'BOETES' : 'FINES', val: `-${summary.penalty.toFixed(2)}`, color: KT.danger, bg: KT.dangerLight, icon: 'fa-gavel' },
            ].map(s => (
              <div key={s.label} style={{ background: KT.surface, borderRadius: 14, padding: '12px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 12 }} />
                </div>
                <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 800, color: s.color, margin: '0 0 2px' }}>{s.val}{currency}</p>
                <p style={{ fontFamily: KT.poppins, fontSize: 8.5, fontWeight: 700, color: KT.textXs, letterSpacing: '0.08em', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending alert */}
        {pending.length > 0 && (
          <div onClick={onGoToRequests} style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg,#fff7ed,#fffbeb)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #fed7aa', cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: KT.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-bell" style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: '#c2410c', margin: 0 }}>
                {pending.length} {language === 'fr' ? `mission${pending.length > 1 ? 's' : ''} à valider` : language === 'nl' ? `missie${pending.length > 1 ? 's' : ''} te valideren` : `mission${pending.length > 1 ? 's' : ''} to review`}
              </p>
              <p style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.orange, margin: 0 }}>
                {language === 'fr' ? 'En attente de votre décision' : language === 'nl' ? 'Wacht op uw beslissing' : 'Waiting for your decision'}
              </p>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: KT.orange, fontSize: 11 }} />
          </div>
        )}

        {/* Pending missions */}
        {pending.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <SecHead
              label={language === 'fr' ? 'À VALIDER' : language === 'nl' ? 'TE VALIDEREN' : 'TO REVIEW'}
              right={<span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: '#fff', background: KT.warning, padding: '2px 8px', borderRadius: 10 }}>{pending.length}</span>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map(m => (
                <div key={m.id} style={{ background: KT.surface, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 2px 8px rgba(245,158,11,0.10)`, border: `1.5px solid ${KT.warningLight}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: KT.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fa-solid ${kGetIcon(m.icon)}`} style={{ color: KT.warning, fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                    <span style={{ fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: KT.primary }}>+{m.reward.toFixed(2)}{currency}</span>
                  </div>
                  <button onClick={() => onReview(m)}
                    style={{ padding: '8px 14px', borderRadius: 10, background: KT.primary, border: 'none', fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', letterSpacing: '0.04em', flexShrink: 0 }}>
                    {language === 'fr' ? 'VALIDER' : language === 'nl' ? 'VALIDEER' : 'REVIEW'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active missions */}
        <div style={{ padding: '16px 16px 0' }}>
          <SecHead
            label={language === 'fr' ? 'MISSIONS ACTIVES' : language === 'nl' ? 'ACTIEVE MISSIES' : 'ACTIVE MISSIONS'}
            right={<span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: cc.bg, background: cc.light, padding: '2px 8px', borderRadius: 10 }}>{active.length}</span>}
          />
          {active.length === 0 ? (
            <div style={{ background: KT.surface, borderRadius: 14, padding: 22, textAlign: 'center', border: `1px dashed ${KT.border}` }}>
              <i className="fa-solid fa-rocket" style={{ fontSize: 26, color: KT.border, display: 'block', marginBottom: 8 }} />
              <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textXs, margin: 0 }}>
                {language === 'fr' ? 'Aucune mission active' : language === 'nl' ? 'Geen actieve missies' : 'No active missions'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.map(m => (
                <div key={m.id} style={{ background: KT.surface, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 1px 4px ${cc.bg}22`, border: `1px solid ${cc.bg}33`, borderLeft: `3px solid ${cc.bg}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: cc.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fa-solid ${kGetIcon(m.icon)}`} style={{ color: cc.bg, fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: cc.bg }}>+{m.reward.toFixed(2)}{currency}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                      <span style={{ fontFamily: KT.poppins, fontSize: 10, color: KT.textXs }}>
                        {language === 'fr' ? 'En cours' : language === 'nl' ? 'Bezig' : 'In progress'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => onEditMission(m)}
                      style={{ width: 32, height: 32, borderRadius: 9, background: cc.light, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-pen" style={{ color: cc.bg, fontSize: 12 }} />
                    </button>
                    <button onClick={() => onDeleteMission(m.id)}
                      style={{ width: 32, height: 32, borderRadius: 9, background: KT.dangerLight, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-trash-can" style={{ color: KT.danger, fontSize: 12 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals */}
        <div style={{ padding: '16px 16px 0' }}>
          <SecHead
            label={language === 'fr' ? 'OBJECTIFS' : language === 'nl' ? 'DOELEN' : 'GOALS'}
            right={
              (data.isPremium || goals.length < FREE_GOALS_LIMIT) ? (
                <button onClick={() => setShowAddGoal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 16, background: cc.light, border: 'none', cursor: 'pointer' }}>
                  <i className="fa-solid fa-plus" style={{ color: cc.bg, fontSize: 10 }} />
                  <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: cc.bg }}>
                    {language === 'fr' ? 'AJOUTER' : language === 'nl' ? 'TOEVOEGEN' : 'ADD'}
                  </span>
                </button>
              ) : null
            }
          />
          {goals.length === 0 ? (
            <div style={{ background: KT.surface, borderRadius: 14, padding: 22, textAlign: 'center', border: `1px dashed ${KT.border}`, marginBottom: 8 }}>
              <i className="fa-solid fa-piggy-bank" style={{ fontSize: 26, color: KT.border, display: 'block', marginBottom: 8 }} />
              <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textXs, margin: '0 0 12px' }}>
                {language === 'fr' ? 'Aucun objectif d\'épargne' : language === 'nl' ? 'Geen spaardoel' : 'No savings goal'}
              </p>
              {(data.isPremium || goals.length < FREE_GOALS_LIMIT) && (
                <button onClick={() => setShowAddGoal(true)}
                  style={{ padding: '8px 18px', borderRadius: 12, background: cc.light, border: 'none', cursor: 'pointer', fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: cc.bg }}>
                  + {language === 'fr' ? 'Créer un objectif' : language === 'nl' ? 'Doel aanmaken' : 'Create goal'}
                </button>
              )}
            </div>
          ) : null}
          {goals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goals.map(g => {
                const pct = Math.min(100, Math.round(child.balance / g.target * 100));
                const ready = child.balance >= g.target;
                return (
                  <div key={g.id} style={{ background: KT.surface, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: ready ? `1.5px solid #a7f3d0` : `1px solid ${KT.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: ready ? KT.successLight : cc.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fa-solid ${kGetIcon(g.icon)}`} style={{ color: ready ? KT.success : cc.bg, fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.text, margin: 0 }}>{g.name}</p>
                        <p style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.textXs, margin: 0 }}>{child.balance.toFixed(2)}{currency} / {g.target.toFixed(2)}{currency}</p>
                      </div>
                      {ready
                        ? <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.success, background: KT.successLight, padding: '4px 8px', borderRadius: 8, flexShrink: 0 }}>PRÊT ✓</span>
                        : <span style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 800, color: cc.bg, flexShrink: 0 }}>{pct}%</span>
                      }
                      <button onClick={() => setEditingGoal(g)}
                        style={{ width: 28, height: 28, borderRadius: 8, background: cc.light, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-pen" style={{ color: cc.bg, fontSize: 11 }} />
                      </button>
                      <button onClick={() => onDeleteGoal(g.id)}
                        style={{ width: 28, height: 28, borderRadius: 8, background: KT.dangerLight, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-trash-can" style={{ color: KT.danger, fontSize: 11 }} />
                      </button>
                    </div>
                    <div style={{ background: KT.bg, borderRadius: 6, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 6, width: `${pct}%`, transition: 'width 0.6s ease',
                        background: ready ? KT.success : pct >= 67 ? cc.bg : pct >= 34 ? KT.warning : KT.danger }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <AddGoalSheet isOpen={showAddGoal} onClose={() => setShowAddGoal(false)}
            onAdd={(name, target, icon) => { onAddGoal(name, target, icon); setShowAddGoal(false); }}
            currency={currency} language={language} cc={cc} />
          <AddGoalSheet isOpen={!!editingGoal} onClose={() => setEditingGoal(null)}
            onAdd={(name, target, icon) => { if (editingGoal) { onEditGoal(editingGoal.id, name, target, icon); } }}
            prefill={editingGoal ?? undefined}
            currency={currency} language={language} cc={cc} editMode />
        </div>
      </div>
    </div>
  );
}

// ══ ADD GOAL SHEET ════════════════════════════════════════════
const GOAL_ICONS = ['star', 'rocket', 'gamepad', 'bike', 'plane', 'cart', 'music', 'futbol', 'trophy', 'gift'];

function AddGoalSheet({ isOpen, onClose, onAdd, prefill, editMode, currency, language, cc }: {
  isOpen: boolean; onClose: () => void;
  onAdd: (name: string, target: number, icon: string) => void;
  prefill?: Goal;
  editMode?: boolean;
  currency: string; language: Language;
  cc: { bg: string; light: string; dark: string; text: string };
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('star');

  useEffect(() => {
    if (isOpen) {
      setName(prefill?.name ?? '');
      setTarget(prefill?.target ? String(prefill.target) : '');
      setIcon(prefill?.icon ?? 'star');
    }
  }, [isOpen, prefill]);

  const targetVal = parseFloat(target);
  const ok = name.trim().length >= 1 && !isNaN(targetVal) && targetVal > 0;

  const mLbl = { display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 } as React.CSSProperties;
  const mInp = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box' as const, outline: 'none' } as React.CSSProperties;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={editMode ? (language === 'fr' ? 'MODIFIER OBJECTIF' : language === 'nl' ? 'DOEL BEWERKEN' : 'EDIT GOAL') : (language === 'fr' ? 'NOUVEL OBJECTIF' : language === 'nl' ? 'NIEUW DOEL' : 'NEW GOAL')}>
      <div style={{ padding: '0 20px 28px' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={mLbl}>{language === 'fr' ? 'NOM DE L\'OBJECTIF' : language === 'nl' ? 'NAAM DOEL' : 'GOAL NAME'}</label>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 50))}
            placeholder={language === 'fr' ? 'Ex: Vélo, Jeu vidéo...' : language === 'nl' ? 'Bv: Fiets, Spelletje...' : 'E.g: Bike, Video game...'}
            style={mInp} autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={mLbl}>{language === 'fr' ? `MONTANT CIBLE (${currency})` : language === 'nl' ? `DOELBEDRAG (${currency})` : `TARGET AMOUNT (${currency})`}</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} min="0.01" max="1000" step="0.01"
            placeholder="0.00" style={mInp} inputMode="decimal" />
        </div>
        <div style={{ marginBottom: 24 }}>
          <p style={mLbl}>{language === 'fr' ? 'ICÔNE' : language === 'nl' ? 'ICOON' : 'ICON'}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GOAL_ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                style={{ width: 44, height: 44, borderRadius: 12, background: icon === ic ? cc.light : KT.bg, border: icon === ic ? `2px solid ${cc.bg}` : `1.5px solid ${KT.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${kGetIcon(ic)}`} style={{ color: icon === ic ? cc.bg : KT.textXs, fontSize: 16 }} />
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => ok && onAdd(name.trim(), targetVal, icon)} disabled={!ok}
          style={{ width: '100%', padding: 16, borderRadius: 14, background: ok ? cc.bg : KT.border, border: 'none', fontFamily: KT.poppins, fontWeight: 700, fontSize: 14, color: ok ? '#fff' : KT.textXs, cursor: ok ? 'pointer' : 'not-allowed', letterSpacing: '0.05em' }}>
          {editMode ? (language === 'fr' ? 'ENREGISTRER' : language === 'nl' ? 'OPSLAAN' : 'SAVE') : (language === 'fr' ? 'CRÉER L\'OBJECTIF' : language === 'nl' ? 'DOEL AANMAKEN' : 'CREATE GOAL')}
        </button>
      </div>
    </Sheet>
  );
}

// ══ HISTORY SCREEN ════════════════════════════════════════════
function HistoryScreen({ child, currency, language, onClearHistory, isPremium }: { child: ChildProfile; currency: string; language: Language; onClearHistory: (childId: string) => void; isPremium?: boolean }) {
  const FREE_HISTORY_LIMIT = 5;
  const [filter, setFilter] = useState<'THIS_MONTH' | 'ALL'>('THIS_MONTH');
  const [confirmClear, setConfirmClear] = useState(false);
  const now = new Date();
  const monthStr = `/${String(now.getMonth() + 1).padStart(2, '0')}/`;
  const allShown = filter === 'THIS_MONTH' ? child.history.filter(i => i.date.includes(monthStr)) : child.history;
  const shown = isPremium ? allShown : allShown.slice(0, FREE_HISTORY_LIMIT);
  const gains = shown.filter(i => i.amount > 0).reduce((a, i) => a + i.amount, 0);
  const losses = shown.filter(i => i.amount < 0).reduce((a, i) => a + i.amount, 0);

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px 10px', alignItems: 'center' }}>
        {([['THIS_MONTH', language === 'fr' ? 'CE MOIS' : language === 'nl' ? 'DEZE MAAND' : 'THIS MONTH'], ['ALL', language === 'fr' ? 'TOUT' : language === 'nl' ? 'ALLES' : 'ALL']] as const).map(([k, lb]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: '7px 18px', borderRadius: 20, fontFamily: KT.poppins, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === k ? KT.primary : KT.surface, color: filter === k ? '#fff' : KT.textSm, border: filter === k ? 'none' : `1.5px solid ${KT.border}` }}>
            {lb}
          </button>
        ))}
        {child.history.length > 0 && (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: '50%', background: KT.dangerLight, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={language === 'fr' ? 'Effacer l\'historique' : language === 'nl' ? 'Geschiedenis wissen' : 'Clear history'}>
            <i className="fa-solid fa-trash-can" style={{ color: KT.danger, fontSize: 13 }} />
          </button>
        )}
      </div>
      {confirmClear && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, margin: '0 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', maxWidth: 340 }}>
            <p style={{ fontFamily: KT.poppins, fontSize: 15, fontWeight: 700, color: KT.text, margin: '0 0 8px' }}>
              {language === 'fr' ? 'Effacer l\'historique ?' : language === 'nl' ? 'Geschiedenis wissen?' : 'Clear history?'}
            </p>
            <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textSm, margin: '0 0 20px' }}>
              {language === 'fr' ? `Toutes les transactions de ${child.name} seront supprimées définitivement.` : language === 'nl' ? `Alle transacties van ${child.name} worden permanent verwijderd.` : `All transactions for ${child.name} will be permanently deleted.`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClear(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: KT.bg, border: 'none', fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.textSm, cursor: 'pointer' }}>
                {language === 'fr' ? 'Annuler' : language === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
              <button onClick={() => { onClearHistory(child.id); setConfirmClear(false); }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: KT.danger, border: 'none', fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                {language === 'fr' ? 'Effacer' : language === 'nl' ? 'Wissen' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { lb: language === 'fr' ? 'TOTAL' : 'TOTAAL', val: `${gains + losses >= 0 ? '+' : ''}${(gains + losses).toFixed(2)}${currency}`, c: gains + losses >= 0 ? KT.success : KT.danger, bg: gains + losses >= 0 ? KT.successLight : KT.dangerLight },
          { lb: language === 'fr' ? 'GAINS' : language === 'nl' ? 'WINST' : 'EARNED', val: `+${gains.toFixed(2)}${currency}`, c: KT.success, bg: KT.successLight },
          { lb: language === 'fr' ? 'SORTIES' : language === 'nl' ? 'UITGAVEN' : 'SPENT', val: `${losses.toFixed(2)}${currency}`, c: KT.danger, bg: KT.dangerLight },
        ].map(s => (
          <div key={s.lb} style={{ background: s.bg, borderRadius: 12, padding: '8px 14px', flexShrink: 0 }}>
            <p style={{ fontFamily: KT.poppins, fontSize: 9, fontWeight: 700, color: s.c, letterSpacing: '0.08em', margin: '0 0 2px' }}>{s.lb}</p>
            <p style={{ fontFamily: KT.poppins, fontSize: 14, fontWeight: 800, color: s.c, margin: 0 }}>{s.val}</p>
          </div>
        ))}
      </div>
      {/* List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 30, color: KT.border, display: 'block', marginBottom: 10 }} />
            <p style={{ fontFamily: KT.poppins, fontSize: 13, color: KT.textXs }}>
              {language === 'fr' ? 'Aucune transaction' : language === 'nl' ? 'Geen transacties' : 'No transactions'}
            </p>
          </div>
        ) : (<>{shown.map(item => {
          const pos = item.amount > 0;
          const pen = !pos && kIsPenalty(item.title);
          const ic = pos ? 'fa-check-circle' : pen ? 'fa-gavel' : 'fa-cart-shopping';
          const col = pos ? KT.success : pen ? KT.danger : KT.warning;
          const bg = pos ? KT.successLight : pen ? KT.dangerLight : KT.warningLight;
          return (
            <div key={item.id} style={{ background: KT.surface, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${KT.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${ic}`} style={{ color: col, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 500, color: KT.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                <p style={{ fontFamily: KT.poppins, fontSize: 10, color: KT.textXs, margin: 0 }}>{item.date}</p>
              </div>
              <span style={{ fontFamily: KT.poppins, fontSize: 14, fontWeight: 800, color: pos ? KT.success : KT.danger, flexShrink: 0 }}>
                {pos ? '+' : ''}{item.amount.toFixed(2)}{currency}
              </span>
            </div>
          );
        })}{!isPremium && allShown.length > FREE_HISTORY_LIMIT && (
          <div style={{ margin: '10px 0 0', padding: '12px 14px', background: '#fffbeb', borderRadius: 12, border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-lock" style={{ color: '#f59e0b', fontSize: 13 }} />
            <span style={{ fontFamily: KT.poppins, fontSize: 12, color: '#92400e', fontWeight: 500 }}>
              {language === 'fr' ? `+${allShown.length - FREE_HISTORY_LIMIT} entrées masquées — Premium pour tout voir` : language === 'nl' ? `+${allShown.length - FREE_HISTORY_LIMIT} items verborgen — Premium voor volledig overzicht` : `+${allShown.length - FREE_HISTORY_LIMIT} entries hidden — Premium to see all`}
            </span>
          </div>
        )}</>)}
      </div>
    </div>
  );
}

// ══ REQUESTS SCREEN ═══════════════════════════════════════════
function RequestsScreen({ data, onReview, currency, language, selectedChildId, onCreateMission, onDismissRequest }: {
  data: GlobalState; onReview: (mission: Mission, childId: string, defaultAction?: 'approve' | 'reject') => void; currency: string; language: Language; selectedChildId?: string;
  onCreateMission?: (childId: string) => void;
  onDismissRequest?: (childId: string, type: 'missionRequested' | 'giftRequested') => void;
}) {
  type RequestItem = Mission & { childName: string; childAvatar: string; childId: string; kind: 'MISSION' };
  const allItems: RequestItem[] = data.children.flatMap(c =>
    c.missions
      .filter(m => m.status === 'PENDING')
      .map(m => ({ ...m, childName: c.name, childAvatar: c.avatar, childId: c.id, kind: 'MISSION' as const }))
  );
  const items = selectedChildId ? allItems.filter(i => i.childId === selectedChildId) : allItems;

  const missionReqs = data.children.filter(c => c.missionRequested && (!selectedChildId || c.id === selectedChildId));
  const giftReqs = data.children.filter(c => c.giftRequested && (!selectedChildId || c.id === selectedChildId));
  const totalCount = items.length + missionReqs.length + giftReqs.length;

  if (totalCount === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: KT.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <i className="fa-solid fa-check-double" style={{ fontSize: 26, color: KT.success }} />
        </div>
        <p style={{ fontFamily: KT.poppins, fontSize: 15, fontWeight: 700, color: KT.text, margin: '0 0 6px' }}>
          {language === 'fr' ? 'Tout est à jour !' : language === 'nl' ? 'Alles bijgewerkt!' : 'All up to date!'}
        </p>
        <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textXs, textAlign: 'center' }}>
          {language === 'fr' ? 'Aucune demande en attente' : language === 'nl' ? 'Geen openstaande aanvragen' : 'No pending requests'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px 16px' }}>
      <SecHead
        label={language === 'fr' ? 'EN ATTENTE' : language === 'nl' ? 'IN AFWACHTING' : 'PENDING'}
        right={<span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 700, color: '#fff', background: KT.danger, padding: '2px 8px', borderRadius: 10 }}>{totalCount}</span>}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Demandes de nouvelle mission */}
        {missionReqs.map(child => {
          const ccc = kGetColor(child.colorClass);
          return (
            <div key={`mr-${child.id}`} style={{ background: KT.surface, borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1.5px solid ${ccc.light}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: ccc.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-list-check" style={{ fontSize: 15, color: ccc.bg }} />
                </div>
                <div>
                  <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: KT.text, margin: 0 }}>{child.name}</p>
                  <p style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.textXs, margin: 0 }}>
                    {language === 'fr' ? 'Demande une nouvelle mission' : language === 'nl' ? 'Vraagt een nieuwe missie' : 'Requesting a new mission'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { onDismissRequest?.(child.id, 'missionRequested'); onCreateMission?.(child.id); }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: ccc.bg, border: 'none', cursor: 'pointer', fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {language === 'fr' ? '+ Créer une mission' : language === 'nl' ? '+ Missie aanmaken' : '+ Create mission'}
                </button>
                <button onClick={() => onDismissRequest?.(child.id, 'missionRequested')}
                  style={{ width: 38, height: 38, borderRadius: 10, background: KT.bg, border: `1px solid ${KT.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-xmark" style={{ fontSize: 14, color: KT.textSm }} />
                </button>
              </div>
            </div>
          );
        })}
        {/* Demandes de cadeau */}
        {giftReqs.map(child => {
          const ccc = kGetColor(child.colorClass);
          return (
            <div key={`gr-${child.id}`} style={{ background: KT.surface, borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1.5px solid #c4b5fd` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-gift" style={{ fontSize: 15, color: '#7c3aed' }} />
                </div>
                <div>
                  <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: KT.text, margin: 0 }}>{child.name}</p>
                  <p style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.textXs, margin: 0 }}>
                    {language === 'fr' ? 'Veut un cadeau / objectif' : language === 'nl' ? 'Wil een cadeau / doel' : 'Wants a gift / goal'}
                  </p>
                </div>
              </div>
              <button onClick={() => onDismissRequest?.(child.id, 'giftRequested')}
                style={{ width: '100%', padding: '9px 0', borderRadius: 10, background: '#7c3aed', border: 'none', cursor: 'pointer', fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {language === 'fr' ? 'Vu ✓' : language === 'nl' ? 'Gezien ✓' : 'Seen ✓'}
              </button>
            </div>
          );
        })}
        {items.map(item => {
          const childObj = data.children.find(c => c.id === item.childId);
          const ccc = kGetColor(childObj?.colorClass ?? 'indigo');
          return (
          <div key={item.id} style={{ background: KT.surface, borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${KT.border}` }}>
            {/* Child name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <img src={kAvatar(item.childAvatar)} alt={item.childName} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain', background: ccc.light }} />
              <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: ccc.bg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.childName}</span>
            </div>
            {/* Mission info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: KT.warningLight }}>
                <i className={`fa-solid ${kGetIcon(item.icon)}`} style={{ fontSize: 18, color: KT.warning }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.text, margin: '0 0 2px' }}>{item.title}</p>
                <span style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 800, color: KT.primary }}>+{item.reward.toFixed(2)}{currency}</span>
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => onReview(item, item.childId, 'reject')}
                style={{ padding: 10, borderRadius: 11, background: KT.dangerLight, border: `1px solid ${KT.danger}33`, fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: KT.danger, cursor: 'pointer', letterSpacing: '0.04em' }}>
                ✕  {language === 'fr' ? 'REFUSER' : language === 'nl' ? 'WEIGEREN' : 'REJECT'}
              </button>
              <button onClick={() => onReview(item, item.childId, 'approve')}
                style={{ padding: 10, borderRadius: 11, background: KT.successLight, border: `1px solid ${KT.success}33`, fontFamily: KT.poppins, fontSize: 12, fontWeight: 700, color: KT.success, cursor: 'pointer', letterSpacing: '0.04em' }}>
                ✓  {language === 'fr' ? 'APPROUVER' : language === 'nl' ? 'GOEDKEUREN' : 'APPROVE'}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ══ ADD CHILD SHEET ═══════════════════════════════════════════
const AVATAR_SEEDS = ['Felix', 'Sophie', 'Lena', 'Max', 'Mia', 'Lucas', 'Emma', 'Noah', 'Zara', 'Leo'];
const COLOR_OPTIONS = ['indigo', 'emerald', 'rose', 'amber', 'blue', 'pink', 'purple'];

function AddChildSheet({ isOpen, onClose, onAdd, language }: {
  isOpen: boolean; onClose: () => void;
  onAdd: (childData: { name: string; colorClass: string; avatar: string; birthday?: string }) => Promise<void>;
  language: Language;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('indigo');
  const [avatar, setAvatar] = useState('Felix');
  const [birthday, setBirthday] = useState('');
  const [saving, setSaving] = useState(false);
  const ok = name.trim().length >= 2;

  const submit = async () => {
    if (!ok || saving) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), colorClass: color, avatar, birthday: birthday || undefined });
      setName(''); setColor('indigo'); setAvatar('Felix'); setBirthday('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const mLbl = { display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 } as React.CSSProperties;
  const mInp = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box' as const, outline: 'none' } as React.CSSProperties;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'NOUVEL ENFANT' : language === 'nl' ? 'NIEUW KIND' : 'NEW CHILD'}>
      <div style={{ padding: '0 20px 28px' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={mLbl}>{language === 'fr' ? 'PRÉNOM' : language === 'nl' ? 'VOORNAAM' : 'FIRST NAME'}</label>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 30))}
            placeholder={language === 'fr' ? 'Ex: Emma' : language === 'nl' ? 'Bv: Emma' : 'E.g: Emma'}
            style={mInp} autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={mLbl}>{language === 'fr' ? 'DATE DE NAISSANCE' : language === 'nl' ? 'GEBOORTEDATUM' : 'DATE OF BIRTH'}</label>
          <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={mInp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={mLbl}>{language === 'fr' ? 'AVATAR' : 'AVATAR'}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_SEEDS.map(seed => (
              <button key={seed} onClick={() => setAvatar(seed)}
                style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, cursor: 'pointer', border: avatar === seed ? `2.5px solid ${KT.primary}` : `2px solid transparent`, background: KT.primaryLight, overflow: 'hidden' }}>
                <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`} alt={seed} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <p style={mLbl}>{language === 'fr' ? 'COULEUR' : language === 'nl' ? 'KLEUR' : 'COLOR'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLOR_OPTIONS.map(c => {
              const col = COLOR_PAL[c];
              return (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: col.bg, border: color === c ? `2.5px solid #1e293b` : `2px solid transparent`, cursor: 'pointer' }} />
              );
            })}
          </div>
        </div>
        <button onClick={submit} disabled={!ok || saving}
          style={{ width: '100%', padding: 16, borderRadius: 14, background: ok && !saving ? KT.primary : KT.border, border: 'none', fontFamily: KT.poppins, fontWeight: 700, fontSize: 14, color: ok && !saving ? '#fff' : KT.textXs, cursor: ok && !saving ? 'pointer' : 'not-allowed', letterSpacing: '0.05em' }}>
          {saving ? '...' : (language === 'fr' ? 'CRÉER LE PROFIL' : language === 'nl' ? 'PROFIEL AANMAKEN' : 'CREATE PROFILE')}
        </button>
      </div>
    </Sheet>
  );
}

// ══ EDIT CHILD SHEET ══════════════════════════════════════════
function EditChildSheet({ isOpen, onClose, child, onSave, onDelete, language }: {
  isOpen: boolean; onClose: () => void;
  child: ChildProfile | null;
  onSave: (childId: string, updates: Partial<ChildProfile>) => void;
  onDelete: (childId: string) => Promise<void>;
  language: Language;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('indigo');
  const [avatar, setAvatar] = useState('Felix');
  const [birthday, setBirthday] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && child) {
      setName(child.name);
      setColor(child.colorClass || 'indigo');
      setAvatar(child.avatar || 'Felix');
      setBirthday(child.birthday || '');
      setConfirmDel(false);
    }
  }, [isOpen, child]);

  const ok = name.trim().length >= 2;
  const submit = () => {
    if (!ok || !child) return;
    onSave(child.id, { name: name.trim(), colorClass: color, avatar, birthday: birthday || undefined });
    onClose();
  };
  const del = async () => {
    if (!child || deleting) return;
    setDeleting(true);
    try { await onDelete(child.id); onClose(); } finally { setDeleting(false); }
  };

  const mLbl = { display: 'block', fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: KT.textXs, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 } as React.CSSProperties;
  const mInp = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 14, color: KT.text, background: KT.bg, boxSizing: 'border-box' as const, outline: 'none' } as React.CSSProperties;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'MODIFIER ENFANT' : language === 'nl' ? 'KIND BEWERKEN' : 'EDIT CHILD'}>
      <div style={{ padding: '0 20px 28px' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={mLbl}>{language === 'fr' ? 'PRÉNOM' : language === 'nl' ? 'VOORNAAM' : 'FIRST NAME'}</label>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 30))} style={mInp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={mLbl}>{language === 'fr' ? 'DATE DE NAISSANCE' : language === 'nl' ? 'GEBOORTEDATUM' : 'DATE OF BIRTH'}</label>
          <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={mInp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={mLbl}>AVATAR</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_SEEDS.map(seed => (
              <button key={seed} onClick={() => setAvatar(seed)}
                style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, cursor: 'pointer', border: avatar === seed ? `2.5px solid ${KT.primary}` : `2px solid transparent`, background: KT.primaryLight, overflow: 'hidden' }}>
                <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`} alt={seed} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={mLbl}>{language === 'fr' ? 'COULEUR' : language === 'nl' ? 'KLEUR' : 'COLOR'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLOR_OPTIONS.map(c => {
              const col = COLOR_PAL[c];
              return (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: col.bg, border: color === c ? `2.5px solid #1e293b` : `2px solid transparent`, cursor: 'pointer' }} />
              );
            })}
          </div>
        </div>
        <button onClick={submit} disabled={!ok}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: ok ? KT.primary : KT.border, border: 'none', fontFamily: KT.poppins, fontWeight: 700, fontSize: 14, color: ok ? '#fff' : KT.textXs, cursor: ok ? 'pointer' : 'not-allowed', letterSpacing: '0.05em', marginBottom: 10 }}>
          {language === 'fr' ? 'ENREGISTRER' : language === 'nl' ? 'OPSLAAN' : 'SAVE'}
        </button>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)}
            style={{ width: '100%', padding: 12, borderRadius: 14, background: KT.dangerLight, border: `1px solid ${KT.danger}33`, fontFamily: KT.poppins, fontWeight: 700, fontSize: 12, color: KT.danger, cursor: 'pointer', letterSpacing: '0.05em' }}>
            <i className="fa-solid fa-trash-can" style={{ marginRight: 6 }} />
            {language === 'fr' ? 'SUPPRIMER LE PROFIL' : language === 'nl' ? 'PROFIEL VERWIJDEREN' : 'DELETE PROFILE'}
          </button>
        ) : (
          <div style={{ padding: 12, borderRadius: 14, background: KT.dangerLight, border: `1px solid ${KT.danger}33` }}>
            <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.danger, fontWeight: 600, margin: '0 0 10px', textAlign: 'center' }}>
              {language === 'fr' ? 'Supprimer définitivement ?' : language === 'nl' ? 'Definitief verwijderen?' : 'Delete permanently?'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(false)} disabled={deleting}
                style={{ flex: 1, padding: 10, borderRadius: 11, background: '#fff', border: `1px solid ${KT.border}`, fontFamily: KT.poppins, fontWeight: 600, fontSize: 12, color: KT.text, cursor: 'pointer' }}>
                {language === 'fr' ? 'Annuler' : language === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
              <button onClick={del} disabled={deleting}
                style={{ flex: 1, padding: 10, borderRadius: 11, background: KT.danger, border: 'none', fontFamily: KT.poppins, fontWeight: 700, fontSize: 12, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? '...' : (language === 'fr' ? 'Supprimer' : language === 'nl' ? 'Verwijderen' : 'Delete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ══ PIN SETUP SHEET ═══════════════════════════════════════════
function PinSetupSheet({ isOpen, onClose, onSave, onRemove, hasExisting, language }: {
  isOpen: boolean; onClose: () => void;
  onSave: (pin: string) => Promise<void>;
  onRemove: () => Promise<void>;
  hasExisting: boolean;
  language: Language;
}) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) { setStep('enter'); setPin1(''); setPin2(''); setErr(null); setSaving(false); }
  }, [isOpen]);

  const current = step === 'enter' ? pin1 : pin2;
  const setCurrent = step === 'enter' ? setPin1 : setPin2;

  const press = (k: string) => {
    if (saving) return;
    setErr(null);
    if (k === '⌫') { setCurrent(current.slice(0, -1)); return; }
    if (current.length >= 4) return;
    const next = (current + k).slice(0, 4);
    setCurrent(next);
    if (next.length === 4) {
      if (step === 'enter') {
        setTimeout(() => setStep('confirm'), 150);
      } else {
        setSaving(true);
        setTimeout(async () => {
          console.log('[PinSetup] confirm — match:', pin1 === next);
          if (pin1 !== next) {
            setErr(language === 'fr' ? 'Les codes sont différents' : language === 'nl' ? 'Codes komen niet overeen' : 'Codes do not match');
            setStep('enter'); setPin1(''); setPin2('');
            setSaving(false);
            return;
          }
          try {
            console.log('[PinSetup] calling onSave...');
            await onSave(next);
            console.log('[PinSetup] onSave done');
            onClose();
          } catch (e: any) {
            console.error('[PinSetup] onSave error:', e?.message || e);
            setErr(e?.message || 'Error');
            setStep('enter'); setPin1(''); setPin2('');
          } finally {
            setSaving(false);
          }
        }, 150);
      }
    }
  };

  const titleEnter = language === 'fr' ? (hasExisting ? 'Nouveau code PIN' : 'Créer un code PIN') : language === 'nl' ? (hasExisting ? 'Nieuwe PIN-code' : 'PIN-code aanmaken') : (hasExisting ? 'New PIN code' : 'Create PIN code');
  const titleConfirm = language === 'fr' ? 'Confirmer le code' : language === 'nl' ? 'Code bevestigen' : 'Confirm code';

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={language === 'fr' ? 'CODE PIN' : language === 'nl' ? 'PIN-CODE' : 'PIN CODE'}>
      <div style={{ padding: '8px 20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontFamily: KT.poppins, fontSize: 14, fontWeight: 600, color: KT.text, margin: '0 0 18px' }}>
          {step === 'enter' ? titleEnter : titleConfirm}
        </p>
        <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
          {[0,1,2,3].map(i => {
            const filled = i < current.length;
            return <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: err ? KT.danger : filled ? KT.primary : KT.border, border: `2px solid ${err ? KT.danger : filled ? KT.primary : KT.border}` }} />;
          })}
        </div>
        {err && <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.danger, fontWeight: 600, margin: '0 0 14px' }}>{err}</p>}
        {saving && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 16, height: 16, border: `2.5px solid ${KT.border}`, borderTopColor: KT.primary, borderRadius: '50%', animation: 'kcv-spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textSm, fontWeight: 600 }}>
              {language === 'fr' ? 'Enregistrement...' : language === 'nl' ? 'Opslaan...' : 'Saving...'}
            </span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: 260, marginBottom: 16 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
            <button key={idx} onClick={() => k && press(k)} disabled={!k || saving}
              style={{ height: 58, borderRadius: 14, border: 'none', fontFamily: KT.poppins, fontSize: k === '⌫' ? 17 : 20, fontWeight: 600, cursor: k && !saving ? 'pointer' : 'default', background: k ? '#f8fafc' : 'transparent', color: KT.text, boxShadow: k ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
              {k}
            </button>
          ))}
        </div>
        {hasExisting && (
          <button onClick={async () => { setSaving(true); try { await onRemove(); onClose(); } finally { setSaving(false); } }} disabled={saving}
            style={{ width: '100%', padding: 12, borderRadius: 14, background: KT.dangerLight, border: `1px solid ${KT.danger}33`, fontFamily: KT.poppins, fontWeight: 700, fontSize: 12, color: KT.danger, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
            {language === 'fr' ? 'SUPPRIMER LE CODE PIN' : language === 'nl' ? 'PIN-CODE VERWIJDEREN' : 'REMOVE PIN CODE'}
          </button>
        )}
      </div>
    </Sheet>
  );
}

// ══ PROFILE SCREEN ════════════════════════════════════════════
function ProfileScreen({ data, language, onSignOut, onDeleteAccount, onOpenPremium, onSetLanguage, onSetMaxBalance, onAddChild, onEditChild, onDeleteChild, onSetPin, onToggleNotifications, showToast, autoOpenPinSheet, onPinSetupShown, autoOpenHelp, onHelpShown }: {
  data: GlobalState; language: Language; onSignOut: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onOpenPremium?: () => void;
  onSetLanguage?: (lang: Language) => void;
  onSetMaxBalance?: (limit: number) => void;
  onAddChild: (childData: { name: string; colorClass: string; avatar: string; birthday?: string }) => Promise<void>;
  onEditChild: (childId: string, updates: Partial<ChildProfile>) => void;
  onDeleteChild: (childId: string) => Promise<void>;
  onSetPin: (pin: string) => Promise<void>;
  onToggleNotifications: (enabled: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
  autoOpenPinSheet?: boolean;
  onPinSetupShown?: () => void;
  autoOpenHelp?: boolean;
  onHelpShown?: () => void;
}) {
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [showPinSheet, setShowPinSheet] = useState(false);

  useEffect(() => {
    if (autoOpenPinSheet) {
      setShowPinSheet(true);
      onPinSetupShown?.();
    }
  }, [autoOpenPinSheet]);
  const [showHelp, setShowHelp] = useState(false);
  const [helpScrollToQr, setHelpScrollToQr] = useState(false);

  useEffect(() => {
    if (autoOpenHelp) {
      setHelpScrollToQr(true); // auto-open vient du tip QR → scroller vers la section QR
      setShowHelp(true);
      onHelpShown?.();
    }
  }, [autoOpenHelp]);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWalletLimit, setShowWalletLimit] = useState(false);
  const [walletLimitInput, setWalletLimitInput] = useState('');
  const notifEnabled = data.notificationsEnabled !== false;
  const badge = data.parentBadge || 'NOVICE';
  const badgeMap: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    NOVICE:      { label: language === 'fr' ? 'Débutant' : language === 'nl' ? 'Beginner' : 'Beginner', icon: 'fa-seedling', color: KT.success, bg: KT.successLight },
    MENTOR:      { label: 'Mentor', icon: 'fa-graduation-cap', color: KT.primary, bg: KT.primaryLight },
    EXPERT:      { label: 'Expert', icon: 'fa-medal', color: KT.warning, bg: KT.warningLight },
    FINTECH_GURU:{ label: 'Guru', icon: 'fa-crown', color: KT.purple, bg: KT.purpleLight },
  };
  const bInfo = badgeMap[badge] || badgeMap.NOVICE;

  const cycleLanguage = () => {
    if (!onSetLanguage) return;
    const next: Language = language === 'fr' ? 'nl' : language === 'nl' ? 'en' : 'fr';
    onSetLanguage(next);
  };

  const settingsRows: { icon: string; color: string; label: string; detail: string; onClick: () => void; danger?: boolean; toggle?: boolean }[] = [
    {
      icon: 'fa-bell', color: KT.primary,
      label: language === 'fr' ? 'Notifications' : language === 'nl' ? 'Notificaties' : 'Notifications',
      detail: notifEnabled ? (language === 'fr' ? 'Activées' : language === 'nl' ? 'Ingeschakeld' : 'Enabled') : (language === 'fr' ? 'Désactivées' : language === 'nl' ? 'Uitgeschakeld' : 'Disabled'),
      toggle: true,
      onClick: () => {
        const next = !notifEnabled;
        onToggleNotifications(next);
        showToast(next ? (language === 'fr' ? 'Notifications activées' : language === 'nl' ? 'Notificaties ingeschakeld' : 'Notifications enabled') : (language === 'fr' ? 'Notifications désactivées' : language === 'nl' ? 'Notificaties uitgeschakeld' : 'Notifications disabled'), 'info');
      },
    },
    {
      icon: 'fa-language', color: '#0891b2',
      label: language === 'fr' ? 'Langue' : language === 'nl' ? 'Taal' : 'Language',
      detail: language === 'fr' ? 'Français' : language === 'nl' ? 'Nederlands' : 'English',
      onClick: cycleLanguage,
    },
    {
      icon: 'fa-lock', color: KT.purple,
      label: language === 'fr' ? 'Code PIN' : language === 'nl' ? 'PIN-code' : 'PIN Code',
      detail: data.parentPin ? (language === 'fr' ? 'Configuré' : language === 'nl' ? 'Ingesteld' : 'Set') : (language === 'fr' ? 'Non configuré' : language === 'nl' ? 'Niet ingesteld' : 'Not set'),
      onClick: () => setShowPinSheet(true),
    },
    {
      icon: 'fa-wallet', color: '#0d9488',
      label: language === 'fr' ? 'Limite du portefeuille' : language === 'nl' ? 'Portemonnee-limiet' : 'Wallet limit',
      detail: data.maxBalance === 0 ? (language === 'fr' ? 'Illimitée' : language === 'nl' ? 'Onbeperkt' : 'Unlimited') : `${data.maxBalance || 100}${data.currency || '€'}`,
      onClick: () => { setWalletLimitInput(String(data.maxBalance || 100)); setShowWalletLimit(true); },
    },
    {
      icon: 'fa-qrcode', color: KT.primary,
      label: language === 'fr' ? 'Connecter un appareil' : language === 'nl' ? 'Apparaat verbinden' : 'Connect a device',
      detail: '',
      onClick: () => setShowQrScanner(true),
    },
    {
      icon: 'fa-book-open', color: KT.warning,
      label: language === 'fr' ? 'Guide utilisateur' : language === 'nl' ? 'Gebruikersgids' : 'User guide',
      detail: '',
      onClick: () => { setHelpScrollToQr(false); setShowHelp(true); },
    },
    {
      icon: 'fa-circle-question', color: '#0891b2',
      label: language === 'fr' ? 'Contacter le support' : language === 'nl' ? 'Contact support' : 'Contact support',
      detail: '',
      onClick: () => { window.location.href = 'mailto:hello@koiny.app'; },
    },
    {
      icon: 'fa-power-off', color: KT.danger, danger: true,
      label: language === 'fr' ? 'Déconnexion' : language === 'nl' ? 'Afmelden' : 'Sign out',
      detail: '',
      onClick: onSignOut,
    },
  ];

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Badge card */}
      <div style={{ margin: '14px 16px', background: `linear-gradient(135deg,${KT.primaryDeep},${KT.primary})`, borderRadius: 18, padding: '16px 18px' }}>
        <p style={{ fontFamily: KT.poppins, fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
          {language === 'fr' ? 'Espace Parent' : language === 'nl' ? 'Ouderruimte' : 'Parent Space'}
        </p>
      </div>

      {/* Premium banner */}
      {!data.isPremium && (
        <div onClick={() => onOpenPremium?.()} style={{ margin: '0 16px 14px', padding: '13px 14px', background: 'linear-gradient(135deg,#fffbeb,#fff7ed)', borderRadius: 14, border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${KT.warning},${KT.orange})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fa-solid fa-crown" style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: '#c2410c', margin: 0 }}>
              {language === 'fr' ? 'Passer à Koiny Premium' : language === 'nl' ? 'Upgrade naar Koiny Premium' : 'Upgrade to Koiny Premium'}
            </p>
            <p style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.orange, margin: 0 }}>
              {language === 'fr' ? '1,99€/mois · 16,99€/an · Économies 30%' : language === 'nl' ? '1,99€/maand · 16,99€/jaar · 30% korting' : '1.99€/mo · 16.99€/yr · Save 30%'}
            </p>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ color: KT.orange, fontSize: 12 }} />
        </div>
      )}

      {/* Children */}
      <div style={{ padding: '0 16px 14px' }}>
        <SecHead
          label={language === 'fr' ? 'MES ENFANTS' : language === 'nl' ? 'MIJN KINDEREN' : 'MY CHILDREN'}
          right={
            <button onClick={() => {
              if (!data.isPremium && data.children.length >= 1) {
                onOpenPremium?.();
              } else {
                setShowAddChild(true);
              }
            }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: KT.primary, border: 'none', cursor: 'pointer' }}>
              <i className="fa-solid fa-plus" style={{ color: '#fff', fontSize: 10 }} />
              <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: 700, color: '#fff' }}>
                {language === 'fr' ? 'AJOUTER' : language === 'nl' ? 'TOEVOEGEN' : 'ADD'}
              </span>
            </button>
          }
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.children.map(c => {
            const cc = kGetColor(c.colorClass);
            const age = c.birthday ? Math.floor((Date.now() - new Date(c.birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
            return (
              <div key={c.id} style={{ background: KT.surface, borderRadius: 13, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${KT.border}` }}>
                <img src={kAvatar(c.avatar)} alt={c.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'contain', background: cc.light, border: `2px solid ${cc.light}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontFamily: KT.poppins, fontSize: 14, fontWeight: 600, color: KT.text, margin: 0 }}>{c.name}</p>
                    {age !== null && age >= 0 && age <= 18 && (
                      <span style={{ fontFamily: KT.poppins, fontSize: 11, fontWeight: 600, color: cc.bg, background: cc.light, padding: '1px 7px', borderRadius: 10 }}>
                        {age} {language === 'fr' ? 'ans' : language === 'nl' ? 'jaar' : 'yrs'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.textXs, margin: 0 }}>
                    {c.balance.toFixed(2)}{data.currency || '€'} · {c.missions.filter(m => m.status === 'ACTIVE').length} {language === 'fr' ? 'missions actives' : language === 'nl' ? 'actieve missies' : 'active missions'}
                  </p>
                </div>
                <button onClick={() => setEditingChild(c)}
                  title={language === 'fr' ? 'Modifier' : language === 'nl' ? 'Bewerken' : 'Edit'}
                  style={{ width: 34, height: 34, borderRadius: 10, background: KT.primaryLight, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-pen" style={{ color: KT.primary, fontSize: 13 }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AddChildSheet isOpen={showAddChild} onClose={() => setShowAddChild(false)} onAdd={onAddChild} language={language} />
      <EditChildSheet isOpen={!!editingChild} onClose={() => setEditingChild(null)} child={editingChild}
        onSave={(cid, updates) => { onEditChild(cid, updates); showToast(language === 'fr' ? 'Profil mis à jour' : language === 'nl' ? 'Profiel bijgewerkt' : 'Profile updated'); }}
        onDelete={async (cid) => { await onDeleteChild(cid); showToast(language === 'fr' ? 'Profil supprimé' : language === 'nl' ? 'Profiel verwijderd' : 'Profile deleted', 'danger'); }}
        language={language} />
      <PinSetupSheet isOpen={showPinSheet} onClose={() => setShowPinSheet(false)}
        onSave={async (pin) => { await onSetPin(pin); showToast(language === 'fr' ? 'Code PIN enregistré !' : language === 'nl' ? 'PIN-code opgeslagen!' : 'PIN code saved!'); }}
        onRemove={async () => { await onSetPin(''); showToast(language === 'fr' ? 'Code PIN supprimé' : language === 'nl' ? 'PIN-code verwijderd' : 'PIN code removed', 'info'); }}
        hasExisting={!!data.parentPin} language={language} />

      {/* Settings */}
      <div style={{ padding: '0 16px' }}>
        <SecHead label={language === 'fr' ? 'PARAMÈTRES' : language === 'nl' ? 'INSTELLINGEN' : 'SETTINGS'} />
        <div style={{ background: KT.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${KT.border}` }}>
          {settingsRows.map((s, i) => (
            <div key={s.label} onClick={s.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderBottom: i < settingsRows.length - 1 ? `1px solid ${KT.bg}` : 'none', cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: s.danger ? KT.dangerLight : KT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 13 }} />
              </div>
              <span style={{ fontFamily: KT.poppins, fontSize: 13, color: s.danger ? KT.danger : KT.text, flex: 1 }}>{s.label}</span>
              {s.toggle ? (
                <div style={{ width: 38, height: 22, borderRadius: 11, background: notifEnabled ? KT.primary : KT.border, position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: notifEnabled ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              ) : (
                <>
                  {s.detail && <span style={{ fontFamily: KT.poppins, fontSize: 11, color: KT.textXs }}>{s.detail}</span>}
                  <i className="fa-solid fa-chevron-right" style={{ color: KT.border, fontSize: 11 }} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete account */}
      {onDeleteAccount && (
        <div style={{ padding: '12px 16px 4px' }}>
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'transparent', border: `1px solid ${KT.danger}44`, fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.danger, cursor: 'pointer' }}>
            {language === 'fr' ? 'Supprimer mon compte' : language === 'nl' ? 'Account verwijderen' : 'Delete my account'}
          </button>
        </div>
      )}

      {/* Wallet limit dialog */}
      {showWalletLimit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, margin: '0 24px', maxWidth: 340, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <p style={{ fontFamily: KT.poppins, fontSize: 15, fontWeight: 700, color: KT.text, margin: '0 0 4px' }}>
              {language === 'fr' ? 'Limite du portefeuille' : language === 'nl' ? 'Portemonnee-limiet' : 'Wallet limit'}
            </p>
            <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textXs, margin: '0 0 16px' }}>
              {language === 'fr' ? 'Solde max autorisé (0 = illimité)' : language === 'nl' ? 'Max saldo toegestaan (0 = onbeperkt)' : 'Max balance allowed (0 = unlimited)'}
            </p>
            <input
              type="number" inputMode="decimal" min="0" max="1000"
              value={walletLimitInput}
              onChange={e => setWalletLimitInput(e.target.value.slice(0, 7))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${KT.border}`, fontFamily: KT.poppins, fontSize: 16, fontWeight: 700, color: KT.text, background: KT.bg, boxSizing: 'border-box', outline: 'none', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowWalletLimit(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: KT.bg, border: 'none', fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.textSm, cursor: 'pointer' }}>
                {language === 'fr' ? 'Annuler' : language === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
              <button onClick={() => {
                const val = parseFloat(walletLimitInput);
                if (!isNaN(val) && val >= 0 && val <= 1000) { onSetMaxBalance?.(val); showToast(language === 'fr' ? 'Limite mise à jour' : language === 'nl' ? 'Limiet bijgewerkt' : 'Limit updated'); }
                setShowWalletLimit(false);
              }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: KT.primary, border: 'none', fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                {language === 'fr' ? 'Enregistrer' : language === 'nl' ? 'Opslaan' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpModal isOpen={showHelp} scrollToQr={helpScrollToQr} onClose={() => { setShowHelp(false); setHelpScrollToQr(false); }} language={language} />
      <QrScannerModal isOpen={showQrScanner} onClose={() => setShowQrScanner(false)} language={language} />

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, margin: '0 24px', maxWidth: 340, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: KT.dangerLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: KT.danger, fontSize: 20 }} />
            </div>
            <p style={{ fontFamily: KT.poppins, fontSize: 15, fontWeight: 700, color: KT.text, margin: '0 0 8px', textAlign: 'center' }}>
              {language === 'fr' ? 'Supprimer le compte ?' : language === 'nl' ? 'Account verwijderen?' : 'Delete account?'}
            </p>
            <p style={{ fontFamily: KT.poppins, fontSize: 12, color: KT.textXs, margin: '0 0 20px', textAlign: 'center' }}>
              {language === 'fr' ? 'Toutes les données seront supprimées définitivement. Cette action est irréversible.' : language === 'nl' ? 'Alle gegevens worden permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.' : 'All data will be permanently deleted. This action cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: KT.bg, border: 'none', fontFamily: KT.poppins, fontSize: 13, fontWeight: 600, color: KT.textSm, cursor: 'pointer' }}>
                {language === 'fr' ? 'Annuler' : language === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
              <button onClick={async () => { setShowDeleteConfirm(false); await onDeleteAccount?.(); }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: KT.danger, border: 'none', fontFamily: KT.poppins, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                {language === 'fr' ? 'Supprimer' : language === 'nl' ? 'Verwijderen' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══ BOTTOM NAV ════════════════════════════════════════════════
function BottomNav({ active, onChange, pendingCount, language }: {
  active: TabId; onChange: (t: TabId) => void; pendingCount: number; language: Language;
}) {
  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'dashboard', icon: 'fa-border-all',    label: language === 'fr' ? 'Accueil' : language === 'nl' ? 'Home' : 'Home' },
    { id: 'history',   icon: 'fa-calendar-days', label: language === 'fr' ? 'Historique' : language === 'nl' ? 'Historiek' : 'History' },
    { id: 'requests',  icon: 'fa-comment-dots',  label: language === 'fr' ? 'Demandes' : language === 'nl' ? 'Aanvragen' : 'Requests' },
    { id: 'profile',   icon: 'fa-user',          label: language === 'fr' ? 'Profil' : language === 'nl' ? 'Profiel' : 'Profile' },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: `1px solid ${KT.border}`, display: 'flex', flexDirection: 'column', zIndex: 50, boxShadow: '0 -2px 12px rgba(0,0,0,0.06)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <div style={{ display: 'flex', height: 62 }}>
      {tabs.map(tab => {
        const on = tab.id === active;
        const showBadge = tab.id === 'requests' && pendingCount > 0;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 28, borderRadius: 14, background: on ? KT.primaryLight : 'transparent', transition: 'background 0.2s', position: 'relative' }}>
              <i className={`fa-solid ${tab.icon}`} style={{ fontSize: 17, color: on ? KT.primary : '#94a3b8', transition: 'color 0.2s' }} />
              {showBadge && (
                <span style={{ position: 'absolute', top: 2, right: 8, minWidth: 16, height: 16, borderRadius: 8, background: KT.danger, fontFamily: KT.poppins, fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #fff' }}>
                  {pendingCount}
                </span>
              )}
            </div>
            <span style={{ fontFamily: KT.poppins, fontSize: 10, fontWeight: on ? 700 : 500, color: on ? KT.primary : '#94a3b8', letterSpacing: '0.01em', transition: 'color 0.2s' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
    </div>
  );
}

// ══ TOP BAR (non-dashboard tabs) ══════════════════════════════
function TopBar({ tab, children, selectedChildId, onSelectChild, language }: {
  tab: TabId; children: ChildProfile[]; selectedChildId: string; onSelectChild: (id: string) => void; language: Language;
}) {
  if (tab === 'dashboard') return null;
  const TITLES: Record<TabId, string> = {
    dashboard: '',
    history:   language === 'fr' ? 'Historique' : language === 'nl' ? 'Historiek' : 'History',
    requests:  language === 'fr' ? 'Demandes' : language === 'nl' ? 'Aanvragen' : 'Requests',
    profile:   language === 'fr' ? 'Profil' : language === 'nl' ? 'Profiel' : 'Profile',
  };
  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${KT.border}`, flexShrink: 0, paddingTop: 'env(safe-area-inset-top)' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 16px', gap: 10 }}>
        {tab !== 'profile' && (
          <div style={{ display: 'flex', gap: 7, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {children.map(c => {
              const on = c.id === selectedChildId;
              const cc = kGetColor(c.colorClass);
              return (
                <button key={c.id} onClick={() => onSelectChild(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 4px', borderRadius: 20, cursor: 'pointer', flexShrink: 0, background: on ? cc.light : '#f8fafc', border: on ? `1.5px solid ${cc.bg}` : '1.5px solid transparent' }}>
                  <img src={kAvatar(c.avatar)} alt={c.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'contain', background: cc.light }} />
                  <span style={{ fontFamily: KT.poppins, fontSize: 12, fontWeight: on ? 700 : 500, color: on ? cc.bg : '#64748b' }}>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <span style={{ fontFamily: KT.poppins, fontSize: 14, fontWeight: 700, color: KT.text, flexShrink: 0 }}>{TITLES[tab]}</span>
      </div>
    </div>
  );
}

// ══ MAIN COMPONENT ════════════════════════════════════════════
export default function AndroidParentView({
  data, language, onApprove, onReject, onAddMission, onEditMission, onDeleteMission, onManualTransaction,
  onAddChild, onEditChild, onDeleteChild, onClearHistory, onSetPin, onToggleNotifications,
  onExit, onSignOut, onDeleteAccount, onSetPremium, onSetLanguage, onSetMaxBalance, isOfflineMode,
  notificationAction, onClearNotificationAction,
}: AndroidParentViewProps) {
  // ── PIN gate ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localPin, setLocalPin] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinState, setPinState] = useState<'idle' | 'validating' | 'error' | 'success'>('idle');
  const [pinResetState, setPinResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const pinErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinValidationIdRef = useRef(0);
  const pinWasResetRef = useRef(false);
  const [triggerPinSetup, setTriggerPinSetup] = useState(false);

  useEffect(() => {
    const checkPin = async (userId: string) => {
      const supabase = getSupabase();
      if (!supabase) { setIsAuthenticated(true); return; }
      try {
        const pin = await loadParentPinLocally(userId);
        if (pin) {
          setLocalPin(pin);
        } else {
          // Local vide — vérifier Supabase (cas reset PIN via magic link)
          const { data: profile } = await supabase.from('profiles').select('pin_hash').eq('id', userId).single();
          if (!profile?.pin_hash) {
            setIsAuthenticated(true);
          } else {
            setLocalPin(profile.pin_hash);
          }
        }
      } catch { /* ignore */ }
    };

    const load = async () => {
      const supabase = getSupabase();
      if (!supabase) { setIsAuthenticated(true); return; }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await checkPin(user.id);
      } catch { /* ignore */ }
    };
    load();

    // Écouter le retour magic link (SIGNED_IN déclenché par le deep link)
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Only bypass PIN on SIGNED_IN (deep link click) — TOKEN_REFRESHED fires from
        // signInWithOtp on an already-authenticated user and must NOT bypass the gate.
        if (event === 'SIGNED_IN' && pinWasResetRef.current) {
          pinWasResetRef.current = false;
          setIsAuthenticated(true);
          setTab('profile');
          setTriggerPinSetup(true);
        } else {
          await checkPin(session.user.id);
        }
      }
    });

    // Fallback: re-vérifier quand l'app revient en foreground (après magic link)
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (pinWasResetRef.current) {
        pinWasResetRef.current = false;
        setIsAuthenticated(true);
        setTab('profile');
        setTriggerPinSetup(true);
        return;
      }
      await checkPin(user.id);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Auto-authenticate when no PIN is configured
  useEffect(() => {
    if (localPin !== null) {
      const effectivePin = localPin || data.parentPin;
      if (!effectivePin || String(effectivePin).trim().length === 0) {
        setIsAuthenticated(true);
      }
    } else if (data.parentPin === undefined || data.parentPin === null || data.parentPin === '') {
      setIsAuthenticated(true);
    }
  }, [localPin, data.parentPin]);

  const handlePinDigit = useCallback(async (digit: string) => {
    if (pinState === 'validating' || pinState === 'success') return;
    if (pinErrorTimeoutRef.current) clearTimeout(pinErrorTimeoutRef.current);
    setPinState('idle');
    const next = (pinValue + digit).slice(0, 4);
    setPinValue(next);
    if (next.length < 4) return;
    const effectivePin = localPin || data.parentPin;
    if (!effectivePin) { setIsAuthenticated(true); return; }
    const validationId = ++pinValidationIdRef.current;
    setPinState('validating');
    let match = false;
    if (String(effectivePin).includes(':')) {
      match = await verifyPin(next, String(effectivePin));
    } else {
      match = next === String(effectivePin);
    }
    if (pinValidationIdRef.current !== validationId) return;
    if (match) {
      setPinState('success');
      setTimeout(() => { setIsAuthenticated(true); setPinValue(''); setPinState('idle'); }, 200);
    } else {
      pinErrorTimeoutRef.current = setTimeout(() => { setPinState('error'); setPinValue(''); }, 150);
    }
  }, [pinValue, pinState, localPin, data.parentPin]);

  const handleForgotPin = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || pinResetState === 'sending' || pinResetState === 'sent') return;
    setPinResetState('sending');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setPinResetState('error'); return; }
      // Send OTP with 10s timeout (rate limit ou réseau lent peuvent bloquer indéfiniment)
      const otpPromise = supabase.auth.signInWithOtp({ email: user.email, options: { emailRedirectTo: 'com.koiny.app://callback' } });
      const timeoutPromise = new Promise<{ error: Error }>(resolve =>
        setTimeout(() => resolve({ error: new Error('timeout') }), 10000)
      );
      const { error: otpError } = await Promise.race([otpPromise, timeoutPromise]) as any;
      if (otpError) {
        console.error('[handleForgotPin] OTP error:', otpError.message);
        setPinResetState('error');
        return;
      }
      // Only clear PIN after OTP is queued
      await supabase.from('profiles').update({ pin_hash: null }).eq('id', user.id);
      try { await deleteParentPinLocally(user.id); } catch (e) { console.warn('[handleForgotPin] local delete failed (ignored):', e); }
      setLocalPin(null);
      pinWasResetRef.current = true;
      setPinResetState('sent');
    } catch (e: any) {
      console.error('[handleForgotPin] error:', e?.message || e?.code || JSON.stringify(e));
      setPinResetState('error');
    }
  }, [pinResetState]);

  // ── Main component state (must be before any conditional return)
  const [tab, setTab] = useState<TabId>('dashboard');
  const [childId, setChildId] = useState<string>(data.children[0]?.id ?? '');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showQrTip, setShowQrTip] = useState(() => !isQrTipDismissed());
  const [pendingOpenHelp, setPendingOpenHelp] = useState(false);
  const [showAddChildEmpty, setShowAddChildEmpty] = useState(false);
  const [showAddMission, setShowAddMission] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showTransaction, setShowTransaction] = useState(false);
  const [reviewMission, setReviewMission] = useState<{ mission: Mission; childId: string; defaultAction?: 'approve' | 'reject' } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = translations[language];
  const currency = data.currency || '€';

  // ── Tap sur notif (push/locale) destinée au parent → onglet Demandes
  useEffect(() => {
    if (!notificationAction) return;
    const type = notificationAction.type;
    if (type === 'MISSION' || type === 'MISSION_COMPLETE' || type === 'MISSION_REQUESTED' || type === 'GIFT_REQUESTED') {
      if (notificationAction.childId) setChildId(notificationAction.childId);
      setTab('requests');
    }
    onClearNotificationAction?.();
  }, [notificationAction]);

  // ── Callbacks (hooks — must be before any conditional return)
  const showToast = useCallback((msg: string, type: 'success' | 'danger' | 'info' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
    setTimeout(() => setToast({ msg, type }), 20);
    toastTimer.current = setTimeout(() => setToast(null), 2900);
  }, []);

  const FREE_MISSIONS_LIMIT = 2;
  const FREE_CHILDREN_LIMIT = 1;
  const FREE_HISTORY_LIMIT = 5;

  const handleAddMission = useCallback((title: string, amount: number) => {
    onAddMission(childId, title, amount);
    showToast(language === 'fr' ? 'Mission créée !' : language === 'nl' ? 'Missie aangemaakt!' : 'Mission created!');
  }, [childId, language, onAddMission, showToast]);

  const handleTransaction = useCallback((amount: number, reason: string, isDeposit: boolean, subtype: WithdrawSubtype) => {
    const delta = isDeposit ? amount : -amount;
    const prefix = isDeposit
      ? (language === 'fr' ? 'Bonus' : 'Bonus')
      : subtype === 'PENALTY' ? (language === 'fr' ? 'Amende' : language === 'nl' ? 'Boete' : 'Fine')
        : (language === 'fr' ? 'Achat' : language === 'nl' ? 'Aankoop' : 'Purchase');
    const label = reason ? `${prefix} : ${reason}` : prefix;
    onManualTransaction(childId, delta, label);
    showToast(
      isDeposit
        ? `+${amount.toFixed(2)}${currency} ${language === 'fr' ? 'ajoutés !' : language === 'nl' ? 'toegevoegd!' : 'added!'}`
        : `-${amount.toFixed(2)}${currency} ${language === 'fr' ? 'débités.' : language === 'nl' ? 'afgeschreven.' : 'debited.'}`,
      isDeposit ? 'success' : 'danger'
    );
  }, [childId, currency, language, onManualTransaction, showToast]);

  const handleApprove = useCallback((missionId: string, note?: string) => {
    if (!reviewMission) return;
    onApprove(reviewMission.childId, missionId, note);
    showToast(language === 'fr' ? 'Mission approuvée ! 🎉' : language === 'nl' ? 'Missie goedgekeurd! 🎉' : 'Mission approved! 🎉');
  }, [reviewMission, language, onApprove, showToast]);

  const handleReject = useCallback((missionId: string, note?: string) => {
    if (!reviewMission) return;
    onReject(reviewMission.childId, missionId, note);
    showToast(language === 'fr' ? 'Mission refusée.' : language === 'nl' ? 'Missie geweigerd.' : 'Mission rejected.', 'danger');
  }, [reviewMission, language, onReject, showToast]);

  const handleOpenReview = useCallback((mission: Mission, missionChildId: string, defaultAction?: 'approve' | 'reject') => {
    setReviewMission({ mission, childId: missionChildId, defaultAction });
  }, []);

  // Keep childId in sync if children change
  useEffect(() => {
    if (data.children.length > 0 && !data.children.find(c => c.id === childId)) {
      setChildId(data.children[0].id);
    }
  }, [data.children, childId]);

  // Demande de permission notifications au montage (comme iOS ParentView)
  useEffect(() => {
    notifications.checkPermission().then(granted => {
      if (!granted) notifications.requestPermission();
    });
  }, []);

  if (!isAuthenticated) {
    const dots = [0, 1, 2, 3];
    const isError = pinState === 'error';
    const isSuccess = pinState === 'success';
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: KT.poppins }}>
        <div style={{ background: `linear-gradient(160deg,${KT.primaryDeep},${KT.primary})`, paddingTop: 'max(56px,env(safe-area-inset-top))', paddingBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `max(56px,env(safe-area-inset-top)) 24px 40px` }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <i className="fa-solid fa-user-lock" style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{t.parent.accessTitle}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{t.parent.enterPin}</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
            {dots.map(i => {
              const filled = i < pinValue.length;
              return (
                <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: isError ? KT.danger : isSuccess ? KT.success : filled ? KT.primary : KT.border, transition: 'background 0.2s, transform 0.15s', transform: isError ? 'translateX(2px)' : 'none', border: `2px solid ${isError ? KT.danger : isSuccess ? KT.success : filled ? KT.primary : KT.border}` }} />
              );
            })}
          </div>
          {isError && <p style={{ fontSize: 12, color: KT.danger, marginBottom: 24, fontWeight: 600 }}>{t.parent.incorrectCode}</p>}
          {pinResetState === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '0 32px', marginTop: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: KT.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: 24, color: KT.success }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: KT.text, margin: '0 0 8px' }}>
                {language === 'fr' ? 'Lien envoyé !' : language === 'nl' ? 'Link verzonden!' : 'Link sent!'}
              </p>
              <p style={{ fontSize: 13, color: KT.textSm, margin: 0, lineHeight: 1.5 }}>
                {language === 'fr' ? 'Cliquez le lien dans votre email pour accéder à votre espace parent.' : language === 'nl' ? 'Klik op de link in uw e-mail om toegang te krijgen.' : 'Click the link in your email to access your parent space.'}
              </p>
            </div>
          ) : (
            <>
              {/* Keypad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: 264 }}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
                  <button key={idx} onClick={() => {
                    if (k === '') return;
                    if (k === '⌫') { setPinValue(p => p.slice(0, -1)); setPinState('idle'); return; }
                    handlePinDigit(k);
                  }}
                    style={{ height: 64, borderRadius: 16, border: 'none', fontSize: k === '⌫' ? 18 : 22, fontWeight: 600, cursor: k === '' ? 'default' : 'pointer', background: k === '' ? 'transparent' : '#f8fafc', color: KT.text, boxShadow: k === '' ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', fontFamily: KT.poppins }}
                  >{k}</button>
                ))}
              </div>
              {/* Forgot PIN */}
              <button onClick={handleForgotPin} disabled={pinResetState === 'sending'}
                style={{ marginTop: 28, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: pinResetState === 'error' ? KT.danger : KT.textSm, fontFamily: KT.poppins, textDecoration: 'underline' }}>
                {pinResetState === 'sending'
                  ? (language === 'fr' ? 'Envoi...' : language === 'nl' ? 'Verzenden...' : 'Sending...')
                  : pinResetState === 'error'
                    ? (language === 'fr' ? 'Erreur, réessayez' : language === 'nl' ? 'Fout, probeer opnieuw' : 'Error, try again')
                    : (language === 'fr' ? 'Code oublié ?' : language === 'nl' ? 'Code vergeten?' : 'Forgot code?')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const activeChild = data.children.find(c => c.id === childId) ?? data.children[0];
  const totalPending = data.children.reduce((a, c) =>
    a + c.missions.filter(m => m.status === 'PENDING').length
      + (c.giftRequested ? 1 : 0) + (c.missionRequested ? 1 : 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: KT.bg, position: 'relative' }}>
      {/* Toast animation */}
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateY(16px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      {/* Power button overlay (dashboard only) */}
      {tab === 'dashboard' && (
        <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingRight: 16, pointerEvents: 'none' }}>
          <button onClick={onExit}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
            <i className="fa-solid fa-power-off" style={{ color: '#fff', fontSize: 13 }} />
          </button>
        </div>
      )}

      {/* Top bar */}
      <TopBar tab={tab} children={data.children} selectedChildId={childId} onSelectChild={setChildId} language={language} />

      {/* Scrollable content — padding-bottom pour laisser place à la nav fixe */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingBottom: 'calc(62px + env(safe-area-inset-bottom))' }}>
        {tab === 'dashboard' && data.children.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: '36px 28px 32px', textAlign: 'center', width: '100%', maxWidth: 360, boxShadow: '0 4px 24px rgba(91,95,232,0.10)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <i className="fa-solid fa-people-roof" style={{ fontSize: 34, color: KT.primary }} />
              </div>
              <p style={{ fontSize: 20, fontWeight: 700, color: KT.text, margin: '0 0 12px', fontFamily: KT.poppins, lineHeight: 1.3 }}>
                {language === 'fr' ? 'Bienvenue sur votre Dashboard !' : language === 'nl' ? 'Welkom op uw Dashboard!' : 'Welcome to your Dashboard!'}
              </p>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', fontFamily: KT.poppins, lineHeight: 1.6 }}>
                {language === 'fr' ? "Koiny vous aide à enseigner la valeur de l'effort. Commencez par créer le premier profil de votre enfant." : language === 'nl' ? 'Koiny helpt u de waarde van inspanning te leren. Begin met het aanmaken van het eerste profiel van uw kind.' : "Koiny helps you teach the value of effort. Start by creating your child's first profile."}
              </p>
              <button onClick={() => setShowAddChildEmpty(true)} style={{ width: '100%', background: KT.primary, color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: KT.poppins }}>
                + {language === 'fr' ? 'Ajouter un enfant' : language === 'nl' ? 'Kind toevoegen' : 'Add a child'}
              </button>
            </div>
          </div>
        )}
        {tab === 'dashboard' && data.children.length > 0 && (
          <DashboardScreen
            data={data} childId={childId}
            onSelectChild={setChildId}
            onAddMission={() => {
              const child = data.children.find(c => c.id === childId);
              const activeMissions = child?.missions.filter(m => m.status === 'ACTIVE').length ?? 0;
              if (!data.isPremium && activeMissions >= FREE_MISSIONS_LIMIT) {
                setShowSubscriptionModal(true);
              } else {
                setShowAddMission(true);
              }
            }}
            onEditMission={m => setEditingMission(m)}
            onDeleteMission={missionId => onDeleteMission(childId, missionId)}
            onTransaction={() => setShowTransaction(true)}
            onReview={m => handleOpenReview(m, childId)}
            onAddGoal={(name, target, icon) => {
              const child = data.children.find(c => c.id === childId);
              if (!child) return;
              const newGoal: Goal = { id: crypto.randomUUID(), name, target, icon, status: 'ACTIVE' as any };
              onEditChild(childId, { goals: [...(child.goals || []), newGoal] });
              showToast(language === 'fr' ? 'Objectif créé !' : language === 'nl' ? 'Doel aangemaakt!' : 'Goal created!');
            }}
            onEditGoal={(goalId, name, target, icon) => {
              const child = data.children.find(c => c.id === childId);
              if (!child) return;
              onEditChild(childId, { goals: child.goals.map(g => g.id === goalId ? { ...g, name, target, icon } : g) });
              showToast(language === 'fr' ? 'Objectif mis à jour' : language === 'nl' ? 'Doel bijgewerkt' : 'Goal updated');
            }}
            onDeleteGoal={goalId => {
              const child = data.children.find(c => c.id === childId);
              if (!child) return;
              onEditChild(childId, { goals: child.goals.filter(g => g.id !== goalId) });
              showToast(language === 'fr' ? 'Objectif supprimé' : language === 'nl' ? 'Doel verwijderd' : 'Goal deleted', 'danger');
            }}
            onGoToRequests={() => setTab('requests')}
            language={language}
          />
        )}
        {tab === 'history' && activeChild && (
          <HistoryScreen child={activeChild} currency={currency} language={language} onClearHistory={onClearHistory} isPremium={data.isPremium} />
        )}
        {tab === 'requests' && (
          <RequestsScreen
            data={data}
            onReview={(mission, mChildId, defaultAction) => handleOpenReview(mission, mChildId, defaultAction)}
            currency={currency}
            language={language}
            selectedChildId={data.children.length > 1 ? childId : undefined}
            onCreateMission={(cId) => { setChildId(cId); setTab('dashboard'); setTimeout(() => setShowAddMission(true), 150); }}
            onDismissRequest={(cId, type) => onEditChild(cId, { [type]: false })}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen data={data} language={language} onSignOut={onSignOut} onDeleteAccount={onDeleteAccount} onSetLanguage={onSetLanguage}
            onAddChild={onAddChild} onEditChild={onEditChild} onDeleteChild={onDeleteChild}
            onSetPin={async (pin: string) => {
              await onSetPin(pin);
              // Sync localPin immédiatement après la sauvegarde pour éviter la race condition
              // entre fire-and-forget et initialize() qui peut écraser data.parentPin
              const supabase = getSupabase();
              if (supabase) {
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (!user) return;
                  setTimeout(() => {
                    loadParentPinLocally(user.id).then(hash => {
                      if (hash) setLocalPin(hash);
                    }).catch(() => {});
                  }, 400);
                }).catch(() => {});
              }
            }}
            onToggleNotifications={onToggleNotifications}
            onOpenPremium={() => setShowSubscriptionModal(true)} onSetMaxBalance={onSetMaxBalance} showToast={showToast}
            autoOpenPinSheet={triggerPinSetup} onPinSetupShown={() => setTriggerPinSetup(false)}
            autoOpenHelp={pendingOpenHelp} onHelpShown={() => setPendingOpenHelp(false)} />
        )}
      </div>

      {/* Astuce connexion QR (post-création enfant) */}
      <QrConnectTip
        isOpen={showQrTip && tab === 'dashboard' && data.children.length > 0}
        childName={data.children.find(c => c.id === childId)?.name || data.children[0]?.name || ''}
        language={language}
        onHowTo={() => { setShowQrTip(false); setTab('profile'); setPendingOpenHelp(true); }}
        onDismiss={() => setShowQrTip(false)}
      />

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={setTab} pendingCount={totalPending} language={language} />

      {/* AddChild from empty state */}
      <AddChildSheet isOpen={showAddChildEmpty} onClose={() => setShowAddChildEmpty(false)} onAdd={async (childData) => { await onAddChild(childData); setShowAddChildEmpty(false); }} language={language} />

      {/* Sheets */}
      <AddMissionSheet
        isOpen={showAddMission} onClose={() => setShowAddMission(false)}
        onAdd={handleAddMission} currency={currency} language={language}
      />
      <EditMissionSheet
        isOpen={!!editingMission} onClose={() => setEditingMission(null)}
        mission={editingMission}
        onSave={(missionId, updates) => { onEditMission(childId, missionId, updates); showToast(language === 'fr' ? 'Mission mise à jour' : language === 'nl' ? 'Missie bijgewerkt' : 'Mission updated'); }}
        currency={currency} language={language}
      />
      <TransactionSheet
        isOpen={showTransaction} onClose={() => setShowTransaction(false)}
        onConfirm={handleTransaction} currency={currency}
        childName={activeChild?.name ?? ''} balance={activeChild?.balance ?? 0}
        language={language}
      />
      <ReviewSheet
        isOpen={!!reviewMission} onClose={() => setReviewMission(null)}
        mission={reviewMission?.mission ?? null}
        childName={reviewMission ? (data.children.find(c => c.id === reviewMission.childId)?.name ?? '') : ''}
        onApprove={handleApprove} onReject={handleReject}
        currency={currency} language={language}
        defaultAction={reviewMission?.defaultAction}
      />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscribed={() => { setShowSubscriptionModal(false); onSetPremium?.(true); }}
        t={translations[language]}
        language={language}
        isOfflineMode={isOfflineMode}
      />

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
