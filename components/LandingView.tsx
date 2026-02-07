
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../i18n';


interface LandingViewProps {
  language: Language;
  onGetStarted: () => void;
  onSetLanguage: (lang: Language) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ language, onGetStarted, onSetLanguage }) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  const faqData = {
    fr: [
      { q: "Est-ce une vraie banque ?", a: "Non, Koiny est un simulateur pédagogique. Tout l'argent affiché est virtuel. Vous restez le gestionnaire physique de l'argent réel de vos enfants." },
      { q: "Le widget est-il disponible sur Web ?", a: "Non, le widget 'Tirelire' est une exclusivité de la version iOS Native (iPhone). Il n'est pas disponible en version Web ou PWA." },
      { q: "Mes données sont-elles sécurisées ?", a: "Oui, nous utilisons Supabase pour un stockage crypté. Nous ne vendons aucune donnée et respectons scrupuleusement le RGPD." },
      { q: "Comment fonctionne le co-parentage ?", a: "Invitez votre partenaire via QR Code. Une fois accepté, vous gérez la famille ensemble en temps réel." }
    ],
    nl: [
      { q: "Is dit een echte bank?", a: "Nee, Koiny is een educatieve simulator. Al het getoonde geld is virtueel." },
      { q: "Werkt de widget op het web?", a: "Nee, de widget is exclusief voor de iOS-versie (iPhone)." },
      { q: "Zijn mijn gegevens veilig?", a: "Ja, we gebruiken Supabase voor versleutelde opslag." }
    ],
    en: [
      { q: "Is this a real bank?", a: "No, Koiny is an educational simulator. All displayed money is virtual." },
      { q: "Is the widget available on Web?", a: "No, the Piggy Bank widget is exclusive to the iOS Native version (iPhone)." },
      { q: "Is my data secure?", a: "Yes, we use Supabase for encrypted storage." }
    ]
  };

  const steps = {
    fr: [
      { title: "Créez les profils", desc: "Ajoutez vos enfants et définissez leurs objectifs d'épargne.", icon: "fa-user-plus" },
      { title: "Confiez des missions", desc: "Ranger la chambre, aider au jardin... fixez une récompense.", icon: "fa-list-check" },
      { title: "Validez et payez", desc: "Approuvez les tâches finies et voyez leur tirelire grandir.", icon: "fa-coins" }
    ],
    nl: [
      { title: "Maak profielen", desc: "Voeg uw kinderen toe en stel hun spaardoelen in.", icon: "fa-user-plus" },
      { title: "Geef missies", desc: "Kamer opruimen, helpen in de tuin... stel een beloning in.", icon: "fa-list-check" },
      { title: "Valideer en betaal", desc: "Keur voltooide taken goed en zie hun spaarpot groeien.", icon: "fa-coins" }
    ],
    en: [
      { title: "Create profiles", desc: "Add your children and set their savings goals.", icon: "fa-user-plus" },
      { title: "Assign missions", desc: "Clean room, help in the garden... set a reward.", icon: "fa-list-check" },
      { title: "Approve and pay", desc: "Approve finished tasks and watch their piggy bank grow.", icon: "fa-coins" }
    ]
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-950 z-[100] border-b border-slate-100 dark:border-white/10 safe-pt transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer shrink-0">
            <div className="w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <img
                src="/mascot.png"
                alt="Koiny Logo"
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform scale-[1.35] translate-y-1 brightness-[1.05] contrast-[1.05]"
              />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white hidden xs:block">Koiny</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative shrink-0" ref={langMenuRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-all text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 active:scale-95 shadow-sm"
              >
                <span className="text-base sm:text-sm">{currentLang.flag}</span>
                <span className="hidden md:inline">{currentLang.label}</span>
                <i className={`fa-solid fa-chevron-down text-[8px] sm:text-[10px] transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-3 w-48 sm:w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-scale-in origin-top-right py-2 z-[110]">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSetLanguage(l.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-colors ${language === l.code ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{l.flag}</span>
                        <span>{l.label}</span>
                      </div>
                      {language === l.code && <i className="fa-solid fa-circle-check text-indigo-500"></i>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onGetStarted}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-indigo-600 dark:hover:bg-indigo-50 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 whitespace-nowrap shrink-0"
            >
              {t.auth.login}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-50 dark:bg-indigo-900 rounded-full blur-[120px] opacity-40 dark:opacity-20 -translate-y-1/2 translate-x-1/4"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest mb-8 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 dark:bg-indigo-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-400"></span>
              </span>
              {language === 'fr' ? 'Argent de poche réinventé' : language === 'nl' ? 'Zakgeld opnieuw uitgevonden' : 'Pocket money reinvented'}
            </div>
            <h1 className="text-4xl sm:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] sm:leading-[1] mb-8">
              {language === 'fr' ? 'Éduquez vos enfants' : language === 'nl' ? 'Voed uw kinderen op' : 'Educate your kids'} <br />
              <span className="text-indigo-600 dark:text-indigo-500">{language === 'fr' ? 'par l\'effort.' : language === 'nl' ? 'door inspanning.' : 'through effort.'}</span>
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-lg leading-relaxed font-medium">
              {t.auth.description} {language === 'fr' ? 'Koiny est l\'outil indispensable pour les familles qui souhaitent enseigner la valeur de l\'argent.' : language === 'nl' ? 'Koiny is het onmisbare hulpmiddel voor gezinnen.' : 'Koiny is the essential tool for families.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <button
                onClick={onGetStarted}
                className="bg-indigo-600 dark:bg-indigo-500 text-white px-12 py-6 rounded-3xl font-black text-xl shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-4 group"
              >
                {language === 'fr' ? 'Essayer Koiny' : language === 'nl' ? 'Probeer Koiny' : 'Try Koiny'}
                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
              <div className="flex items-center gap-4 px-2">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white dark:border-slate-800 shadow-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${i * 55}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-snug uppercase tracking-widest">
                  <span className="text-slate-900 dark:text-white">+5000</span><br />{language === 'fr' ? 'Familles inscrites' : language === 'nl' ? 'Geregistreerde gezinnen' : 'Registered families'}
                </div>
              </div>
            </div>
          </div>

          <div className="relative animate-scale-in flex justify-center lg:justify-end">
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[100px] opacity-60"></div>

            {/* Main App Mockup */}
            <div className="relative w-[300px] h-auto bg-slate-900 rounded-[3.5rem] border-[10px] border-slate-800 dark:border-slate-950 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden ring-4 ring-indigo-500/10 transition-all duration-500">
              <img src="/child_dashboard_mockup.png" alt="App Preview" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Widget iOS Feature */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <i className="fa-brands fa-apple"></i>
              Exclusivité iPhone
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-8 leading-tight">
              {language === 'fr' ? 'Sa tirelire, directement sur votre écran.' : 'Their piggy bank, right on your screen.'}
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
              {language === 'fr' ? "Gardez un œil sur les progrès de votre enfant sans même ouvrir l'application. Notre widget iOS haute fidélité affiche le solde et l'objectif en temps réel." : "Keep track of your child's progress without even opening the app. Our high-fidelity iOS widget shows balance and goals in real-time."}
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-xs"><i className="fa-solid fa-check"></i></div>
                {language === 'fr' ? 'Design Premium Indigo' : 'Premium Indigo Design'}
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-xs"><i className="fa-solid fa-check"></i></div>
                {language === 'fr' ? 'Mise à jour instantanée' : 'Instant updates'}
              </li>
            </ul>
          </div>
          <div className="lg:w-1/2 flex justify-center">
            {/* Simulating the Widget look */}
            <div className="w-64 h-64 bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border-4 border-slate-800 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">LÉO</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><i className="fa-solid fa-piggy-bank"></i></div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Solde Actuel</span>
                  <div className="text-4xl font-black text-white">45,00€</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-black text-white/70 uppercase">
                    <span>Vélo</span>
                    <span>75%</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                    <div className="w-[75%] h-full bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-6">{language === 'fr' ? 'Comment ça marche ?' : language === 'nl' ? 'Hoe werkt het?' : 'How it works?'}</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">{language === 'fr' ? 'Trois étapes simples pour transformer le quotidien en leçons d\'épargne.' : language === 'nl' ? 'Drie simpele stappen.' : 'Three simple steps.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {(steps[language] || steps.fr).map((step, i) => (
              <div key={i} className="relative group animate-fade-in-up" style={{ animationDelay: `${i * 200}ms` }}>
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px border-t-2 border-dashed border-slate-200 dark:border-slate-800 z-0 -translate-x-1/2"></div>
                )}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-3xl text-indigo-600 dark:text-indigo-400 mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                    <i className={`fa-solid ${step.icon}`}></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{step.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-slate-900 dark:bg-black text-white overflow-hidden relative transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-full bg-indigo-900/10 opacity-30 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-6">FAQ</h2>
            <p className="text-slate-400 dark:text-slate-500 font-medium font-black uppercase tracking-widest text-[10px]">Tout ce que vous devez savoir pour bien démarrer.</p>
          </div>

          <div className="space-y-4">
            {(faqData[language] || faqData.fr).map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all duration-500">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-white/5 transition-all"
                >
                  <span className="text-lg font-bold pr-6">{item.q}</span>
                  <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ${activeFaq === i ? 'rotate-180 bg-indigo-500 text-white' : ''}`}>
                    <i className="fa-solid fa-chevron-down text-xs"></i>
                  </div>
                </button>
                <div className={`transition-all duration-500 overflow-hidden ${activeFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-6 pt-0 text-slate-500 leading-relaxed font-medium">
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-64 bg-indigo-500/10 rounded-full blur-[100px] -z-10"></div>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1]">
            {language === 'fr' ? 'Prêt à transformer l\'avenir de vos enfants ?' : language === 'nl' ? 'Klaar voor de toekomst?' : 'Ready to transform your kids\' future?'}
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 font-medium">
            {language === 'fr' ? 'Rejoignez des milliers de familles qui éduquent déjà leurs enfants à l\'argent avec Koiny.' : language === 'nl' ? 'Sluit je aan bij duizenden gezinnen.' : 'Join thousands of families already using Koiny.'}
          </p>
          <button
            onClick={onGetStarted}
            className="bg-indigo-600 dark:bg-indigo-500 text-white px-16 py-7 rounded-3xl font-black text-2xl shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-[0.98] animate-bounce-short"
          >
            {t.common.start}
          </button>
        </div>
      </section>

      {/* Footer Simplified */}
      <footer className="py-20 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 transition-colors duration-500">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6">
              <img src="/mascot.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
              <span className="text-xl font-black tracking-tight dark:text-white">Koiny</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed font-medium text-center">
              {language === 'fr' ? 'La plateforme d\'éducation financière n°1 pour les enfants.' : 'The #1 financial education platform for kids.'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-10">
            <button
              onClick={() => { const event = new CustomEvent('openLegalModal'); window.dispatchEvent(event); }}
              className="text-slate-500 dark:text-slate-500 font-black hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs uppercase tracking-[0.2em]"
            >
              {language === 'fr' ? 'Confidentialité & Mentions' : 'Privacy & Terms'}
            </button>
          </div>

          <div className="text-slate-300 dark:text-slate-700 text-[10px] font-black uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Koiny Labs.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
