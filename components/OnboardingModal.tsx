import React, { useState } from 'react';
import { isAndroid } from '../hooks/usePlatform';

const AVATAR_SEEDS = ['Felix', 'Sophie', 'Lena', 'Max', 'Mia', 'Lucas', 'Emma', 'Noah', 'Zara', 'Leo'];

const COLOR_OPTIONS = [
  { key: 'indigo',  bg: '#4f46e5', light: '#e0e7ff' },
  { key: 'emerald', bg: '#10b981', light: '#d1fae5' },
  { key: 'rose',    bg: '#f43f5e', light: '#ffe4e6' },
  { key: 'amber',   bg: '#f59e0b', light: '#fef3c7' },
  { key: 'blue',    bg: '#3b82f6', light: '#dbeafe' },
  { key: 'pink',    bg: '#ec4899', light: '#fce7f3' },
  { key: 'purple',  bg: '#a855f7', light: '#f3e8ff' },
];

const MISSION_TEMPLATES = [
  { fr: 'Ranger sa chambre',  nl: 'Kamer opruimen',  en: 'Clean bedroom',  amount: 2.50, icon: '🧹' },
  { fr: 'Faire la vaisselle', nl: 'Afwassen',         en: 'Do the dishes',  amount: 1.50, icon: '🍽️' },
  { fr: 'Sortir le chien',    nl: 'Hond uitlaten',    en: 'Walk the dog',   amount: 3.00, icon: '🐕' },
  { fr: 'Lire 20 min',        nl: '20 min lezen',     en: 'Read 20 min',    amount: 1.00, icon: '📖' },
  { fr: 'Faire ses devoirs',  nl: 'Huiswerk maken',   en: 'Do homework',    amount: 2.00, icon: '✏️' },
  { fr: 'Mettre la table',    nl: 'Tafel dekken',     en: 'Set the table',  amount: 1.00, icon: '🥄' },
];

const T = {
  fr: {
    step1Title: 'Créons le profil de votre enfant',
    step1Sub: 'Choisissez un prénom et un avatar',
    namePlaceholder: 'Prénom de l\'enfant',
    next: 'Suivant',
    step2Title: 'Créez une première mission',
    step2Sub: 'Choisissez une tâche pour commencer',
    skip: 'Passer',
    create: 'Créer',
    step3Title: 'Tout est prêt !',
    step3Sub: (name: string) => `${name} peut maintenant gagner de l'argent en accomplissant des missions 🎉`,
    start: 'Démarrer',
    reward: 'Récompense',
  },
  nl: {
    step1Title: 'Profiel van uw kind aanmaken',
    step1Sub: 'Kies een naam en een avatar',
    namePlaceholder: 'Voornaam van het kind',
    next: 'Volgende',
    step2Title: 'Maak een eerste missie',
    step2Sub: 'Kies een taak om te beginnen',
    skip: 'Overslaan',
    create: 'Aanmaken',
    step3Title: 'Alles klaar!',
    step3Sub: (name: string) => `${name} kan nu geld verdienen door missies te voltooien 🎉`,
    start: 'Starten',
    reward: 'Beloning',
  },
  en: {
    step1Title: 'Create your child\'s profile',
    step1Sub: 'Pick a name and an avatar',
    namePlaceholder: 'Child\'s first name',
    next: 'Next',
    step2Title: 'Create a first mission',
    step2Sub: 'Pick a task to get started',
    skip: 'Skip',
    create: 'Create',
    step3Title: 'All set!',
    step3Sub: (name: string) => `${name} can now earn money by completing missions 🎉`,
    start: 'Get started',
    reward: 'Reward',
  },
};

interface Props {
  language: 'fr' | 'nl' | 'en';
  onAddChild: (childData: { name: string; colorClass: string; avatar: string }) => Promise<void>;
  onAddMission: (childId: string, mission: { title: string; amount: number; icon: string }) => void;
  createdChildId: string | null;
  onDone: () => void;
}

export default function OnboardingModal({ language, onAddChild, onAddMission, createdChildId, onDone }: Props) {
  const t = T[language] || T.fr;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('Felix');
  const [color, setColor] = useState('indigo');
  const [selectedMission, setSelectedMission] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState(false);

  const colorObj = COLOR_OPTIONS.find(c => c.key === color) || COLOR_OPTIONS[0];

  async function handleStep1Next() {
    if (!name.trim()) { setNameError(true); return; }
    setNameError(false);
    setLoading(true);
    await onAddChild({ name: name.trim(), colorClass: color, avatar });
    setLoading(false);
    setStep(2);
  }

  function handleStep2Create() {
    if (createdChildId) {
      const m = MISSION_TEMPLATES[selectedMission];
      onAddMission(createdChildId, {
        title: language === 'nl' ? m.nl : language === 'en' ? m.en : m.fr,
        amount: m.amount,
        icon: m.icon,
      });
    }
    setStep(3);
  }

  if (isAndroid) return <AndroidOnboarding t={t} step={step} name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} color={color} setColor={setColor} colorObj={colorObj} selectedMission={selectedMission} setSelectedMission={setSelectedMission} loading={loading} nameError={nameError} language={language} onStep1Next={handleStep1Next} onStep2Create={handleStep2Create} onStep2Skip={() => setStep(3)} onDone={onDone} />;
  return <IOSOnboarding t={t} step={step} name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} color={color} setColor={setColor} colorObj={colorObj} selectedMission={selectedMission} setSelectedMission={setSelectedMission} loading={loading} nameError={nameError} language={language} onStep1Next={handleStep1Next} onStep2Create={handleStep2Create} onStep2Skip={() => setStep(3)} onDone={onDone} />;
}

// ─── Shared props ──────────────────────────────────────────────────────────────
interface StepProps {
  t: typeof T.fr;
  step: 1 | 2 | 3;
  name: string; setName: (v: string) => void;
  avatar: string; setAvatar: (v: string) => void;
  color: string; setColor: (v: string) => void;
  colorObj: { bg: string; light: string };
  selectedMission: number; setSelectedMission: (i: number) => void;
  loading: boolean;
  nameError: boolean;
  language: 'fr' | 'nl' | 'en';
  onStep1Next: () => void;
  onStep2Create: () => void;
  onStep2Skip: () => void;
  onDone: () => void;
}

// ─── Android MD3 ──────────────────────────────────────────────────────────────
function AndroidOnboarding({ t, step, name, setName, avatar, setAvatar, color, setColor, colorObj, selectedMission, setSelectedMission, loading, nameError, language, onStep1Next, onStep2Create, onStep2Skip, onDone }: StepProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: '28px 28px 0 0', padding: '0 0 env(safe-area-inset-bottom)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#f1f5f9', margin: '8px 24px 0' }}>
          <div style={{ height: '100%', borderRadius: 2, background: '#4f46e5', width: `${(step / 3) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {step === 1 && (
            <>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{t.step1Title}</p>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>{t.step1Sub}</p>

              {/* Avatar grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
                {AVATAR_SEEDS.map(seed => (
                  <button key={seed} onClick={() => setAvatar(seed)} style={{ width: 56, height: 56, borderRadius: '50%', padding: 0, border: avatar === seed ? `3px solid ${colorObj.bg}` : '3px solid transparent', background: colorObj.light, overflow: 'hidden', cursor: 'pointer' }}>
                    <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`} alt={seed} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c.key} onClick={() => setColor(c.key)} style={{ width: 32, height: 32, borderRadius: '50%', background: c.bg, border: color === c.key ? '3px solid #1e293b' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>

              {/* Name input */}
              <input
                value={name}
                onChange={e => { setName(e.target.value); }}
                placeholder={t.namePlaceholder}
                maxLength={30}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${nameError ? '#f43f5e' : '#e2e8f0'}`, fontSize: 16, boxSizing: 'border-box', outline: 'none', marginBottom: 4 }}
              />
              {nameError && <p style={{ color: '#f43f5e', fontSize: 12, margin: '0 0 12px' }}>
                {language === 'fr' ? 'Entrez un prénom' : language === 'nl' ? 'Voer een naam in' : 'Enter a name'}
              </p>}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={onStep1Next} disabled={loading} style={{ padding: '10px 24px', borderRadius: 20, background: loading ? '#e0e7ff' : '#4f46e5', color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? '...' : t.next}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{t.step2Title}</p>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>{t.step2Sub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {MISSION_TEMPLATES.map((m, i) => (
                  <button key={i} onClick={() => setSelectedMission(i)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: `2px solid ${selectedMission === i ? '#4f46e5' : '#f1f5f9'}`, background: selectedMission === i ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 24 }}>{m.icon}</span>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#1e293b' }}>
                      {language === 'nl' ? m.nl : language === 'en' ? m.en : m.fr}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>{m.amount.toFixed(2)}€</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={onStep2Skip} style={{ padding: '10px 20px', borderRadius: 20, background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>{t.skip}</button>
                <button onClick={onStep2Create} style={{ padding: '10px 24px', borderRadius: 20, background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>{t.create}</button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>{t.step3Title}</p>
              <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 28px' }}>{t.step3Sub(name)}</p>
              <button onClick={onDone} style={{ width: '100%', padding: '16px', borderRadius: 20, background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>{t.start}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── iOS ──────────────────────────────────────────────────────────────────────
function IOSOnboarding({ t, step, name, setName, avatar, setAvatar, color, setColor, colorObj, selectedMission, setSelectedMission, loading, nameError, language, onStep1Next, onStep2Create, onStep2Skip, onDone }: StepProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 40, padding: '32px 28px 28px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 64px rgba(0,0,0,0.25)' }}>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s === step ? '#4f46e5' : '#e0e7ff', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', textAlign: 'center' }}>{t.step1Title}</p>
            <p style={{ fontSize: 15, color: '#94a3b8', margin: '0 0 24px', textAlign: 'center' }}>{t.step1Sub}</p>

            {/* Avatar grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, justifyContent: 'center' }}>
              {AVATAR_SEEDS.map(seed => (
                <button key={seed} onClick={() => setAvatar(seed)} style={{ width: 60, height: 60, borderRadius: '50%', padding: 0, border: avatar === seed ? `3px solid ${colorObj.bg}` : '3px solid transparent', background: colorObj.light, overflow: 'hidden', cursor: 'pointer', boxShadow: avatar === seed ? `0 0 0 3px ${colorObj.bg}33` : 'none', transition: 'all 0.2s' }}>
                  <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`} alt={seed} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </button>
              ))}
            </div>

            {/* Color picker */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c.key} onClick={() => setColor(c.key)} style={{ width: 36, height: 36, borderRadius: '50%', background: c.bg, border: 'none', cursor: 'pointer', boxShadow: color === c.key ? `0 0 0 3px ${c.bg}55, 0 0 0 5px #fff, 0 0 0 7px ${c.bg}` : 'none', transition: 'box-shadow 0.2s' }} />
              ))}
            </div>

            {/* Name input */}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={30}
              style={{ width: '100%', padding: '16px 18px', borderRadius: 16, border: `2px solid ${nameError ? '#f43f5e' : '#e0e7ff'}`, fontSize: 17, boxSizing: 'border-box', outline: 'none', marginBottom: nameError ? 4 : 24, background: '#f8fafc', fontWeight: 500 }}
            />
            {nameError && <p style={{ color: '#f43f5e', fontSize: 13, margin: '0 0 16px', textAlign: 'center' }}>
              {language === 'fr' ? 'Entrez un prénom' : language === 'nl' ? 'Voer een naam in' : 'Enter a name'}
            </p>}

            <button onClick={onStep1Next} disabled={loading} style={{ width: '100%', padding: '18px', borderRadius: 20, background: loading ? '#c7d2fe' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
              {loading ? '...' : t.next}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', textAlign: 'center' }}>{t.step2Title}</p>
            <p style={{ fontSize: 15, color: '#94a3b8', margin: '0 0 20px', textAlign: 'center' }}>{t.step2Sub}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {MISSION_TEMPLATES.map((m, i) => (
                <button key={i} onClick={() => setSelectedMission(i)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 20, border: 'none', background: selectedMission === i ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f8fafc', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: selectedMission === i ? '0 4px 16px rgba(79,70,229,0.3)' : 'none' }}>
                  <span style={{ fontSize: 26 }}>{m.icon}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: selectedMission === i ? '#fff' : '#1e293b' }}>
                    {language === 'nl' ? m.nl : language === 'en' ? m.en : m.fr}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: selectedMission === i ? '#c7d2fe' : '#4f46e5' }}>{m.amount.toFixed(2)}€</span>
                </button>
              ))}
            </div>

            <button onClick={onStep2Create} style={{ width: '100%', padding: '18px', borderRadius: 20, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.4)', marginBottom: 10 }}>
              {t.create}
            </button>
            <button onClick={onStep2Skip} style={{ width: '100%', padding: '14px', borderRadius: 20, background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              {t.skip}
            </button>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: '0 0 10px' }}>{t.step3Title}</p>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 32px', lineHeight: 1.6 }}>{t.step3Sub(name)}</p>
            <button onClick={onDone} style={{ width: '100%', padding: '18px', borderRadius: 20, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
              {t.start}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
