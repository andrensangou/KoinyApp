
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
      welcomeTitle: 'Bienvenue sur Koiny !',
      welcomeText: "Koiny transforme l'éducation financière en jeu. Voici tout ce qu'il faut savoir pour bien démarrer en famille.",
      steps: [
        {
          id: 1,
          icon: 'fa-table-columns',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigation',
          text: '4 onglets en bas de l\'écran :',
          items: [
            'Maison : Vue d\'ensemble et ajout rapide de missions.',
            'Horloge : Historique des transactions et graphiques.',
            'Bulles : Valider les missions et les demandes de cadeaux.',
            'Profil : Gérer les enfants, objectifs et réglages.'
          ]
        },
        {
          id: 2,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Espace Parents — Sécurité',
          text: 'Accès protégé de deux façons :',
          items: [
            'Code PIN à 4 chiffres défini à la première utilisation.',
            'Face ID / Touch ID si activé sur votre appareil.',
            'Oubli du PIN : saisissez votre mot de passe Koiny pour le réinitialiser.'
          ]
        },
        {
          id: 3,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Gérer les Enfants',
          text: 'Dans l\'onglet Profil :',
          items: [
            'Ajoutez un enfant : prénom, couleur, photo (optionnel).',
            'Modifiez le solde manuellement via les boutons + / −.',
            'Ajoutez des objectifs (ex : vélo à 150€) pour motiver l\'épargne.'
          ]
        },
        {
          id: 4,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Les Missions',
          text: 'Cycle complet d\'une mission :',
          items: [
            'Création : Le parent crée une mission avec titre et récompense.',
            'Action : L\'enfant clique sur "C\'est fait !" dans son espace.',
            'Validation : Le parent approuve ou demande une correction.',
            'Paiement : La récompense est automatiquement ajoutée au solde.'
          ]
        },
        {
          id: 5,
          icon: 'fa-gift',
          color: 'from-amber-400 to-orange-600',
          title: 'Objectifs & Cadeaux',
          text: 'Système d\'épargne intégré :',
          items: [
            'L\'enfant suit sa progression via la jauge colorée.',
            'Quand le solde atteint l\'objectif, un bouton "Réclamer" apparaît.',
            'Le parent confirme dans l\'onglet Bulles — le solde est déduit.'
          ]
        },
        {
          id: 6,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Limites de Solde',
          text: 'Pour rester réaliste et pédagogique :',
          items: [
            'Le solde est plafonné à 100€ par enfant.',
            'Si une récompense dépasse ce plafond, le paiement est bloqué.',
            'C\'est l\'occasion d\'expliquer l\'épargne et la dépense réelle !'
          ]
        },
        {
          id: 7,
          icon: 'fa-eye',
          color: 'from-cyan-400 to-blue-500',
          title: 'Mode Démo',
          text: 'Information sur le compte d\'essai :',
          items: [
            'Si vous testez Koiny en mode démo, pensez à vous déconnecter.',
            'Pour utiliser l\'application avec votre propre famille, il faudra créer un vrai compte.',
            'Vos données en mode démo ne sont pas transférables.'
          ]
        }
      ],
      close: 'C\'est parti !'
    },
    en: {
      title: 'User Guide',
      welcomeTitle: 'Welcome to Koiny!',
      welcomeText: "Koiny turns financial education into a game. Here's everything you need to get started as a family.",
      steps: [
        {
          id: 1,
          icon: 'fa-table-columns',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigation',
          text: '4 tabs at the bottom of the screen:',
          items: [
            'Home: Overview and quick mission adding.',
            'Clock: Transaction history and charts.',
            'Bubbles: Approve missions and gift requests.',
            'Profile: Manage children, goals and settings.'
          ]
        },
        {
          id: 2,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Parent Space — Security',
          text: 'Protected in two ways:',
          items: [
            '4-digit PIN code set on first use.',
            'Face ID / Touch ID if enabled on your device.',
            'Forgot PIN: enter your Koiny password to reset it.'
          ]
        },
        {
          id: 3,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Managing Children',
          text: 'In the Profile tab:',
          items: [
            'Add a child: name, color, optional photo.',
            'Manually adjust balance with + / − buttons.',
            'Add goals (e.g. bike at €150) to motivate saving.'
          ]
        },
        {
          id: 4,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Missions',
          text: 'Full mission cycle:',
          items: [
            'Create: Parent adds a mission with a title and reward.',
            'Action: Child taps "Done!" in their space.',
            'Validation: Parent approves or requests a correction.',
            'Payment: Reward is automatically added to the balance.'
          ]
        },
        {
          id: 5,
          icon: 'fa-gift',
          color: 'from-amber-400 to-orange-600',
          title: 'Goals & Gifts',
          text: 'Built-in savings system:',
          items: [
            'Child tracks progress via the coloured gauge.',
            'When balance reaches the goal, a "Claim" button appears.',
            'Parent confirms in the Bubbles tab — balance is deducted.'
          ]
        },
        {
          id: 6,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Balance Limits',
          text: 'To stay realistic and educational:',
          items: [
            'Balance is capped at €100 per child.',
            'If a reward exceeds this limit, payment is blocked.',
            'A great opportunity to talk about real saving and spending!'
          ]
        },
        {
          id: 7,
          icon: 'fa-eye',
          color: 'from-cyan-400 to-blue-500',
          title: 'Demo Mode',
          text: 'Information about the trial account:',
          items: [
            'If you are testing Koiny via demo mode, remember to log out.',
            'To use the app with your own family, you will need to create a real account.',
            'Your data in demo mode is not transferable.'
          ]
        }
      ],
      close: "Let's go!"
    },
    nl: {
      title: 'Gebruikershandleiding',
      welcomeTitle: 'Welkom bij Koiny!',
      welcomeText: "Koiny maakt financiële educatie tot een spel. Alles wat je nodig hebt om als gezin te starten.",
      steps: [
        {
          id: 1,
          icon: 'fa-table-columns',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigatie',
          text: '4 tabbladen onderaan het scherm:',
          items: [
            'Huis: Overzicht en snel missies toevoegen.',
            'Klok: Transactiegeschiedenis en grafieken.',
            'Bellen: Missies en cadeauverzoeken goedkeuren.',
            'Profiel: Kinderen, doelen en instellingen beheren.'
          ]
        },
        {
          id: 2,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Ouderomgeving — Beveiliging',
          text: 'Op twee manieren beveiligd:',
          items: [
            '4-cijferige PIN-code ingesteld bij eerste gebruik.',
            'Face ID / Touch ID als ingesteld op uw toestel.',
            'PIN vergeten: voer uw Koiny-wachtwoord in om het te resetten.'
          ]
        },
        {
          id: 3,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Kinderen beheren',
          text: 'In het tabblad Profiel:',
          items: [
            'Voeg een kind toe: naam, kleur, optionele foto.',
            'Pas het saldo handmatig aan met + / − knoppen.',
            'Voeg doelen toe (bijv. fiets voor €150) om sparen te motiveren.'
          ]
        },
        {
          id: 4,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Missies',
          text: 'Volledige missiecyclus:',
          items: [
            'Aanmaken: Ouder maakt een missie met titel en beloning.',
            'Actie: Kind tikt op "Klaar!" in zijn/haar ruimte.',
            'Validatie: Ouder keurt goed of vraagt correctie.',
            'Betaling: Beloning wordt automatisch aan het saldo toegevoegd.'
          ]
        },
        {
          id: 5,
          icon: 'fa-gift',
          color: 'from-amber-400 to-orange-600',
          title: 'Doelen & Cadeaus',
          text: 'Ingebouwd spaarsysteem:',
          items: [
            'Kind volgt voortgang via de kleurrijke balk.',
            'Wanneer saldo het doel bereikt, verschijnt een "Opvragen"-knop.',
            'Ouder bevestigt in het tabblad Bellen — saldo wordt afgetrokken.'
          ]
        },
        {
          id: 6,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Saldolimieten',
          text: 'Realistisch en educatief blijven:',
          items: [
            'Saldo is geplafonneerd op €100 per kind.',
            'Als een beloning dit plafond overschrijdt, wordt de betaling geblokkeerd.',
            'Een mooie gelegenheid om over echt sparen en uitgeven te praten!'
          ]
        },
        {
          id: 7,
          icon: 'fa-eye',
          color: 'from-cyan-400 to-blue-500',
          title: 'Demo Modus',
          text: 'Informatie over het proefaccount:',
          items: [
            'Als je Koiny via de demo modus test, vergeet dan niet uit te loggen.',
            'Om de app met je eigen gezin te gebruiken, moet je een echt account aanmaken.',
            'Je gegevens in de demo modus kunnen niet worden overgezet.'
          ]
        }
      ],
      close: 'Aan de slag!'
    }
  }[language] ?? {
    title: 'User Guide', welcomeTitle: 'Welcome to Koiny!', welcomeText: '', steps: [], close: "Let's go!"
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh] border border-white/20 dark:border-white/10 relative z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >

        {/* Animated Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-black dark:to-slate-900 p-6 flex justify-between items-center shrink-0 border-b border-white/10">
          <h3 id="help-dialog-title" className="text-white font-black text-xl uppercase tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <i className="fa-solid fa-book-open text-indigo-400"></i>
            </div>
            {t.title}
          </h3>
          <button onClick={onClose}
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
          <button onClick={onClose}
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
