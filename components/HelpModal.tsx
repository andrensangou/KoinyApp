
import React from 'react';
import { Language } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  const t = {
    fr: {
      title: 'Guide Utilisateur',
      welcomeTitle: 'Bienvenue sur Koiny ! 🐷',
      welcomeText: "Cette application transforme l'éducation financière en un jeu amusant. Voici comment l'utiliser en famille.",
      steps: [
        {
          id: 1,
          icon: 'fa-star',
          color: 'from-amber-400 to-orange-600',
          title: 'Nouveau : Widget iPhone',
          text: "Suivez sa tirelire sans ouvrir l'app :",
          items: [
            "Installez la version iOS (TestFlight).",
            "Appuyez longuement sur votre écran d'accueil.",
            "Ajoutez le widget Koiny pour voir le solde en direct."
          ]
        },
        {
          id: 2,
          icon: 'fa-download',
          color: 'from-blue-400 to-indigo-600',
          title: 'Installation (App Web)',
          text: "Pour une meilleure expérience :",
          items: [
            'Ouvrez ce site dans Safari (iPhone) ou Chrome (Android).',
            'Appuyez sur "Partager" ou "Menu".',
            'Sélectionnez "Sur l\'écran d\'accueil".'
          ]
        },
        {
          id: 3,
          icon: 'fa-rocket',
          color: 'from-indigo-400 to-purple-600',
          title: 'Démarrage',
          text: 'Les bases pour bien commencer :',
          items: [
            'Compte : Créez un compte parent avec votre email.',
            'Code PIN : Sécurisez l\'accès parent avec un code à 4 chiffres.',
            'Profils : Créez un profil pour chaque enfant.'
          ]
        },
        {
          id: 4,
          icon: 'fa-check-double',
          color: 'from-emerald-400 to-teal-600',
          title: 'Le Cycle des Missions',
          text: 'Comment ça marche ?',
          items: [
            '1. Création : Le parent ajoute une mission.',
            '2. Action : L\'enfant clique sur "C\'est fait !" sur son profil.',
            '3. Validation : Le parent valide la mission.'
          ]
        },
        {
          id: 5,
          icon: 'fa-comments',
          color: 'from-orange-400 to-rose-600',
          title: 'Communication 💬',
          text: 'L\'enfant peut attirer votre attention :',
          items: [
            '"Choisir un cadeau" : Demande un nouvel objectif.',
            '"Défi !" : Demande de nouvelles missions.'
          ]
        },
        {
          id: 6,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-orange-600',
          title: "Gérer l'Argent (Virtuel)",
          text: 'Koiny est un livre de comptes numérique.',
          items: [
            'Dépôt (+) : Argent de poche ou cadeau.',
            'Retrait (-) : Achat effectué pour l\'enfant.',
            'Achat : Déduisez le montant manuellement.'
          ]
        }
      ],
      close: 'C\'est parti !'
    },
    en: {
      title: 'User Guide',
      welcomeTitle: 'Welcome to Koiny! 🐷',
      welcomeText: "Turn financial education into a fun game. Here's your family roadmap.",
      steps: [
        {
          id: 1,
          icon: 'fa-star',
          color: 'from-amber-400 to-orange-600',
          title: 'New: iPhone Widget',
          text: "Track their savings without opening the app:",
          items: [
            "Install the iOS version (TestFlight).",
            "Long press on your home screen.",
            "Add the Koiny widget for live balance updates."
          ]
        },
        {
          id: 2,
          icon: 'fa-download',
          color: 'from-blue-400 to-indigo-600',
          title: 'Installation (Web App)',
          text: "For the best experience:",
          items: [
            'Open in Safari (iPhone) or Chrome (Android).',
            'Press "Share" or "Menu".',
            'Select "Add to Home Screen".'
          ]
        },
        {
          id: 3,
          icon: 'fa-rocket',
          color: 'from-indigo-400 to-purple-600',
          title: 'Getting Started',
          text: 'The basics to start right:',
          items: [
            'Account: Create a parent account with your email.',
            'PIN Code: Secure access with a 4-digit code.',
            'Profiles: Create a profile for each child.'
          ]
        },
        {
          id: 4,
          icon: 'fa-check-double',
          color: 'from-emerald-400 to-teal-600',
          title: 'Mission Cycle',
          text: 'How it works:',
          items: [
            '1. Creation: Parent adds a mission.',
            '2. Action: Child clicks "Done!" on their profile.',
            '3. Validation: Parent approves the task.'
          ]
        },
        {
          id: 5,
          icon: 'fa-comments',
          color: 'from-orange-400 to-rose-600',
          title: 'Communication 💬',
          text: 'The child can get your attention:',
          items: [
            '"Pick a gift": Request a new goal.',
            '"Challenge!": Request new missions.'
          ]
        },
        {
          id: 6,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-orange-600',
          title: 'Virtual Bank',
          text: 'Koiny is a digital ledger.',
          items: [
            'Deposit (+): Pocket money or gifts.',
            'Withdrawal (-): Purchases made for the child.',
            'Buy: Deduct amounts manually.'
          ]
        }
      ],
      close: "Let's go!"
    }
  }[language === 'nl' ? 'en' : language];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh] border border-white/20 dark:border-white/10 relative z-10">

        {/* Animated Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-black dark:to-slate-900 p-6 flex justify-between items-center shrink-0 border-b border-white/10">
          <h3 className="text-white font-black text-xl uppercase tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <i className="fa-solid fa-book-open text-indigo-400"></i>
            </div>
            {t.title}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 custom-scrollbar flex-grow">

          {/* Welcome Card */}
          <div className="relative overflow-hidden mb-10 p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-500/20">
            <div className="relative z-10">
              <h4 className="font-black text-xl mb-2">{t.welcomeTitle}</h4>
              <p className="text-sm text-indigo-100 font-medium leading-relaxed">{t.welcomeText}</p>
            </div>
            <i className="fa-solid fa-piggy-bank absolute -bottom-4 -right-4 text-8xl text-white/10 rotate-12"></i>
          </div>

          <div className="space-y-12">
            {t.steps.map((step) => (
              <section key={step.id} className="relative pl-12">
                {/* Number/Icon Divider */}
                <div className="absolute left-0 top-0 bottom-[-2.5rem] w-px bg-slate-200 dark:bg-slate-800 last:hidden"></div>
                <div className={`absolute left-[-16px] top-0 w-8 h-8 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg z-10 border-2 border-white dark:border-slate-900`}>
                  <i className={`fa-solid ${step.icon} text-xs`}></i>
                </div>

                <div className="group">
                  <h4 className="font-black text-slate-800 dark:text-white text-base uppercase tracking-tight mb-2 flex items-center group-hover:text-indigo-500 transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">{step.text}</p>

                  <ul className="space-y-3">
                    {step.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          <div className="h-6"></div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 flex justify-center shrink-0">
          <button
            onClick={onClose}
            className="group relative w-full bg-slate-900 dark:bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] overflow-hidden shadow-xl hover:shadow-indigo-500/40 active:scale-[0.98] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {t.close}
              <i className="fa-solid fa-arrow-right animate-pulse"></i>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
