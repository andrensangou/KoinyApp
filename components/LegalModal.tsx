
import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';

interface LegalModalProps {
  language: Language;
}

const LegalModal: React.FC<LegalModalProps> = ({ language }) => {
  const [show, setShow] = useState(false);
  const t = translations[language];

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('openLegalModal', handler);
    return () => window.removeEventListener('openLegalModal', handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh] border border-white/20 dark:border-white/10 transition-colors duration-500"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-dialog-title"
      >
        {/* Header */}
        <div className="bg-slate-900 dark:bg-black p-6 flex justify-between items-center shrink-0 border-b border-slate-800 transition-colors duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <i className="fa-solid fa-scale-balanced text-xl"></i>
            </div>
            <div>
              <h3 id="legal-dialog-title" className="text-white font-bold text-lg leading-tight">{t.legal.title}</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">Koiny v1.0</p>
            </div>
          </div>
          <button aria-label={language === 'fr' ? 'Fermer' : language === 'nl' ? 'Sluiten' : 'Close'} onClick={() => setShow(false)} className="w-10 h-10 bg-white/10 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center">
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-slate-600 dark:text-slate-300 space-y-8 no-scrollbar bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-500">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border-l-4 border-indigo-500 p-4 rounded-r-xl">
            <p className="font-bold text-indigo-900 dark:text-indigo-300 italic leading-relaxed text-sm">
              {t.legal.intro}
            </p>
          </div>

          {Object.entries(t.legal.sections).map(([key, section]: [string, any]) => (
            <div key={key} className="space-y-2">
              <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                {section.title}
              </h4>
              <p className="text-sm leading-relaxed font-medium">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shrink-0 transition-colors duration-500">
          <button onClick={() => setShow(false)}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-[0.98]"
          >
            {t.common.close}
          </button>
          <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Koiny • Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
