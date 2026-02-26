
import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language, GlobalState, getDemoData } from '../types';
import { getSupabase, signInWithGoogle, signInWithApple } from '../services/supabase';
import { SUPABASE_URL } from '../config';
import HelpModal from './HelpModal';


interface AuthViewProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onLoginSuccess: (data?: GlobalState) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ language, onSetLanguage, onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [gdprConsent, setGdprConsent] = useState(false); // Business: Mandatory for GDPR
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const t = translations[language];
  const supabase = getSupabase();
  const isConfigured = (SUPABASE_URL as string) !== "YOUR_SUPABASE_URL_HERE";

  useEffect(() => {
    const savedEmail = localStorage.getItem('kidbank_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'SIGNUP' && !gdprConsent) {
      setError(language === 'fr' ? "Vous devez accepter les conditions." : language === 'nl' ? "U moet de voorwaarden accepteren." : "You must accept the terms.");
      return;
    }
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (rememberMe) localStorage.setItem('kidbank_saved_email', email);
        else localStorage.removeItem('kidbank_saved_email');
        onLoginSuccess();
      }
      else if (authMode === 'SIGNUP') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        setEmailSent(true);
      }
      else if (authMode === 'FORGOT') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Configuration error: Supabase not available');
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const msg = err.message || 'Erreur lors de la connexion Google';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!supabase) {
      setError('Configuration error: Supabase not available');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      const msg = err.message || (language === 'fr' ? 'Erreur lors de la connexion Apple' : 'Apple sign-in error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setEmailSent(false);
    setAuthMode('LOGIN');
    setError(null);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    // Simulation d'un délai réseau pour l'UX
    setTimeout(() => {
      const demoData = getDemoData(language);
      // Note: PIN is now displayed in the UI instead of an alert
      onLoginSuccess(demoData);
      setLoading(false);
    }, 800);
  };

  const triggerLegalModal = () => {
    const event = new CustomEvent('openLegalModal');
    window.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center pt-28 pb-10 p-4 sm:p-6 relative overflow-hidden font-sans transition-colors duration-500">
      <div className="hidden sm:block absolute top-[-10%] right-[-10%] w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="hidden sm:block absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] bg-pink-200 dark:bg-fuchsia-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* Optimized Header with Safe Area */}
      <nav className="fixed top-0 left-0 right-0 z-[60] safe-pt bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors duration-500">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex gap-2">
            {(['fr', 'nl', 'en'] as Language[]).map((lang) => (
              <button key={lang}
                onClick={() => onSetLanguage(lang)}
                aria-label={lang === 'fr' ? 'Passer en Français' : lang === 'nl' ? 'Schakel over naar Nederlands' : 'Switch to English'}
                className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center font-black text-xs ${language === lang ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-sm scale-110' : 'border-transparent text-slate-400 dark:text-slate-600 opacity-60'}`}
              >
                {lang === 'fr' ? '🇫🇷' : lang === 'nl' ? '🇳🇱' : '🇬🇧'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowHelp(true)}
            aria-label={language === 'fr' ? 'Aide' : language === 'nl' ? 'Help' : 'Help'}
            className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800 active:scale-90 transition-transform"
          >
            <i className="fa-solid fa-book-bookmark" aria-hidden="true"></i>
          </button>
        </div>
      </nav>

      <div className="max-w-md w-full mx-auto relative z-10">

        {/* Titre simplifié pour l'entrée */}
        <div className="text-center mb-8 mt-4">
          {!emailSent && (
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t.auth.login}
            </h1>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up transition-colors duration-500">
          {!isConfigured ? (
            <div className="space-y-6">
              <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-400 p-4 rounded-xl text-sm border border-orange-200 dark:border-orange-900/50">
                <div className="flex items-center gap-2 mb-2 font-bold">
                  <i className="fa-solid fa-cloud-slash"></i>
                  {language === 'en' ? 'Offline Mode' : 'Mode non connecté'}
                </div>
                <p>{language === 'en' ? 'To enable online backup, configure Supabase in config.ts.' : 'Pour activer la sauvegarde en ligne, configurez Supabase dans config.ts.'}</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 text-center">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">{language === 'en' ? 'Test immediately?' : 'Tester immédiatement ?'}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{language === 'en' ? 'Use the app in demo mode. No data will be sent to the cloud.' : 'Utilisez l\'app en mode démo. Aucune donnée n\'est envoyée au cloud.'} <span className="font-bold block mt-1">{language === 'en' ? 'Parent PIN: 0000' : 'Code Parent : 0000'}</span></p>
                <button onClick={handleDemoLogin} disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-2">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-play"></i> {language === 'en' ? 'Launch Demo' : 'Lancer le Mode Démo'}</>}
                </button>
              </div>
            </div>
          ) : emailSent ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-bounce-short">
                <i className="fa-solid fa-envelope-open-text"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">{t.auth.checkEmailTitle}</h2>
              <p className="text-slate-600 mb-6">{t.auth.checkEmailDesc} <span className="font-bold text-slate-900">{email}</span>.</p>
              <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-800 mb-8 border border-indigo-100"><i className="fa-solid fa-circle-info mr-2"></i>{t.auth.checkEmailAction}</div>
              <button onClick={resetToLogin} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 transition-all shadow-lg">{t.auth.backToHome}</button>
            </div>
          ) : (
            <>
              {authMode === 'LOGIN' && (
                <div className="mb-6 space-y-3">
                  {/* Sign in with Apple — MUST be first per Apple Guideline 4.8 */}
                  <button
                    onClick={handleAppleLogin}
                    disabled={loading}
                    aria-label={language === 'fr' ? 'Continuer avec Apple' : 'Continue with Apple'}
                    className="w-full bg-black text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-sm text-[15px]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    {language === 'fr' ? 'Continuer avec Apple' : language === 'nl' ? 'Doorgaan met Apple' : 'Continue with Apple'}
                  </button>

                  {/* Google Sign-In */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    aria-label={t.auth.googleLogin}
                    className="w-full bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-3 shadow-sm"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    {t.auth.googleLogin}
                  </button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                    <span className="text-xs font-bold text-slate-500 uppercase">{t.auth.or}</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  </div>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">{t.auth.email}</label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-600"></i>
                    <input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 shadow-inner" placeholder="parent@email.com" required />
                  </div>
                </div>

                {authMode !== 'FORGOT' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">{t.auth.password}</label>
                    <div className="relative">
                      <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-600"></i>
                      <input name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 shadow-inner" placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-600 focus:outline-none"><i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                    </div>
                  </div>
                )}

                {authMode === 'SIGNUP' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={gdprConsent} onChange={e => setGdprConsent(e.target.checked)} className="mt-1 accent-indigo-600" required />
                      <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight group-hover:text-slate-700 dark:group-hover:text-slate-300">
                        {language === 'fr'
                          ? "Je consens au traitement de mes données et certifie être le parent/tuteur légal. Koiny n'est pas une banque réelle."
                          : language === 'nl'
                            ? "Ik ga akkoord met de verwerking van mijn gegevens en bevestig dat ik de ouder/voogd ben. Koiny is geen echte bank."
                            : "I consent to the processing of my data and certify that I am the legal parent/guardian. Koiny is not a real bank."}
                      </span>
                    </label>
                  </div>
                )}

                {authMode === 'LOGIN' && (
                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex justify-between items-center text-sm">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-indigo-600">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'}`}>{rememberMe && <i className="fa-solid fa-check text-xs"></i>}<input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="hidden" /></div>
                        <span className="font-bold">{t.auth.rememberMe}</span>
                      </label>
                      <button type="button" onClick={() => setAuthMode('FORGOT')} className="text-indigo-600 font-extrabold hover:underline transition-all cursor-pointer z-50">{t.auth.forgotPassword}</button>
                    </div>
                  </div>
                )}

                {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl flex items-center gap-2 font-bold animate-pulse"><i className="fa-solid fa-circle-exclamation"></i>{error}</div>}

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 text-lg flex justify-center items-center gap-2">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (authMode === 'LOGIN' ? t.auth.login : authMode === 'SIGNUP' ? t.auth.signup : t.auth.sendLink)}
                </button>
              </form>
            </>
          )}

          {!emailSent && isConfigured && (
            <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-800">
              {authMode === 'FORGOT' ? (
                <button onClick={() => setAuthMode('LOGIN')} className="text-indigo-600 font-bold hover:underline"><i className="fa-solid fa-arrow-left mr-1"></i> {t.auth.backToLogin}</button>
              ) : (
                <div className="flex flex-col gap-4">
                  <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} className="group text-sm font-medium transition-all"><span className="text-slate-500 group-hover:text-slate-600">{authMode === 'LOGIN' ? t.auth.newHere : t.auth.alreadyAccount}</span><span className="text-indigo-600 font-bold ml-1 group-hover:underline">{authMode === 'LOGIN' ? t.auth.noAccount : t.auth.hasAccount}</span></button>
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={handleDemoLogin} className="text-xs text-slate-500 hover:text-indigo-600 font-medium underline decoration-slate-300 hover:decoration-indigo-600">{language === 'en' ? 'Continue without account (Demo Mode)' : 'Continuer sans compte (Mode Démo)'}</button>
                    <span className="text-[10px] font-bold text-slate-400 opacity-80">{t.parent.demoHint}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center mt-6 gap-2">
          <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 opacity-80"><i className="fa-solid fa-shield-halved"></i> {isConfigured ? t.auth.cloudSync : language === 'en' ? "Local Mode (No cloud sync)" : "Mode Local (Données non synchronisées)"}</p>
          <button onClick={triggerLegalModal} className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-indigo-500 transition-colors uppercase font-black tracking-widest">{t.legal.link}</button>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} language={language} />
    </div>
  );
};

export default AuthView;
