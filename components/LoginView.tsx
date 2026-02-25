
import React, { useState } from 'react';
import { GlobalState, Language } from '../types';
import { translations } from '../i18n';
import HelpModal from './HelpModal';


interface LoginViewProps {
  data: GlobalState;
  onSelectChild: (childId: string) => void;
  onParentAccess: () => void;
}

const renderAvatar = (avatar: string, colorClass: string = "indigo") => {
  if (avatar.startsWith('fa-')) {
    return <i className={avatar}></i>;
  }
  const src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${avatar}`;
  return (
    <div className={`w-full h-full rounded-full bg-gradient-to-br from-${colorClass}-100 to-${colorClass}-300 flex items-center justify-center p-1 overflow-hidden shadow-inner`}>
      <img src={src} alt="Avatar" className="w-full h-full object-contain scale-110 translate-y-1 drop-shadow-sm" />
    </div>
  );
};

const LoginView: React.FC<LoginViewProps> = ({ data, onSelectChild, onParentAccess }) => {
  const t = translations[data.language];
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-500">
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200 dark:bg-fuchsia-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>


      <div className="relative z-10 w-full max-w-md flex flex-col min-h-[85vh] justify-between py-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-40 h-40 mb-10 flex items-center justify-center animate-scale-in transition-all hover:scale-110 duration-300 rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-500/20 border-4 border-white/50 dark:border-white/10 relative">
            <img
              src="/mascot.png"
              alt="Koiny Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{t.login.welcome}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">{t.login.selectProfile}</p>
        </div>

        {data.children.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 text-center mb-8 animate-fade-in-up transition-colors duration-500">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              <i className="fa-solid fa-people-roof"></i>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t.login.noProfileTitle}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t.login.noProfileDesc}</p>
            <button               onClick={onParentAccess}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 w-full transition-all"
            >
              {t.login.createFirstProfile}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {data.children.map(child => (
              <button                 key={child.id}
                onClick={() => onSelectChild(child.id)}
                aria-label={`${child.name} — ${child.balance.toFixed(2)}€`}
                className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border-4 border-transparent hover:border-indigo-400 active:scale-95 transition-all group flex flex-col items-center gap-3 relative overflow-hidden"
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center group-hover:rotate-6 transition-transform overflow-hidden shadow-inner`}>
                  {renderAvatar(child.avatar, child.colorClass)}
                </div>
                <div className="text-center">
                  <span className="block font-black text-slate-800 dark:text-white text-base mb-1">{child.name}</span>
                  <span className={`inline-block px-3 py-1 bg-${child.colorClass}-100 text-${child.colorClass}-700 rounded-full text-[10px] font-black shadow-sm uppercase tracking-wider`}>
                    {child.balance.toFixed(2)} €
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {data.children.length > 0 && (
          <div className="text-center mt-auto pt-6">
            <button               onClick={onParentAccess}
              className="group inline-flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-5 rounded-[2rem] hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl hover:shadow-2xl active:scale-95 w-full justify-center"
            >
              <i className="fa-solid fa-lock text-emerald-400 dark:text-emerald-500 group-hover:rotate-12 transition-transform" aria-hidden="true"></i>
              <span className="font-black uppercase tracking-widest text-sm">{t.login.parentAccess}</span>
            </button>
          </div>
        )}

        {/* Legal Link */}
        <div className="text-center mt-8">
          <button             onClick={() => {
              const event = new CustomEvent('openLegalModal');
              window.dispatchEvent(event);
            }}
            className="text-xs text-slate-400 hover:text-indigo-500 underline decoration-slate-300 hover:decoration-indigo-500 transition-colors"
          >
            {t.legal.link}
          </button>
        </div>

        {/* Help Modal */}
        <HelpModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          language={data.language}
        />

        {/* Legal Modal (Centralized) */}
      </div>
    </div>
  );
};

export default LoginView;
