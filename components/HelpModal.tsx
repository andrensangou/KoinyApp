
import React from 'react';
import { Language } from '../types';
import { useModal } from '../hooks/useModal';
import { isAndroid } from '../hooks/usePlatform';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, language }) => {
  useModal(isOpen);
  if (!isOpen) return null;

  const t = {
    fr: {
      title: 'Guide Utilisateur',
      welcomeTitle: 'Bienvenue sur Koiny !',
      welcomeText: "Koiny transforme l'éducation financière en jeu. Voici tout ce qu'il faut savoir pour bien démarrer en famille.",
      steps: [
        {
          id: 1,
          icon: 'fa-rocket',
          color: 'from-violet-400 to-indigo-600',
          title: 'Démarrer en 3 étapes',
          text: 'Tout se fait en quelques minutes :',
          items: [
            '① Créez votre compte parent (Google, Apple ou email).',
            '② Appuyez sur le bouton + pour ajouter votre premier enfant (prénom, couleur, avatar).',
            '③ Créez une première mission — votre enfant reçoit une notification immédiatement !'
          ]
        },
        {
          id: 2,
          icon: 'fa-table-columns',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigation',
          text: '4 onglets en bas de l\'écran :',
          items: [
            'Dashboard : Solde, objectifs et missions de l\'enfant sélectionné.',
            'Historique : Journal de toutes les transactions par enfant.',
            'Demandes : Valider les missions accomplies et les demandes de cadeaux.',
            'Profil : Gérer les enfants, la devise, la langue et la sécurité.'
          ]
        },
        {
          id: 3,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Espace Parents — Sécurité',
          text: 'Votre espace est protégé séparément de l\'espace enfant :',
          items: [
            'Code PIN à 4 chiffres défini à la première utilisation.',
            'Face ID / Touch ID si activé sur votre appareil.',
            'L\'enfant ne peut pas accéder à votre espace — il ne voit que son profil.',
            'Oubli du PIN : saisissez votre mot de passe Koiny pour le réinitialiser.'
          ]
        },
        {
          id: 4,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Gérer les Enfants',
          text: 'Depuis le Dashboard (onglet Maison) :',
          items: [
            'Sélectionnez un enfant en haut de l\'écran pour voir son tableau de bord.',
            'Appuyez sur + Dépôt ou − Retrait pour ajuster le solde manuellement.',
            'Ajoutez un objectif via le bouton "+ Ajouter" dans la section Objectifs.',
            'Modifiez le profil d\'un enfant depuis l\'onglet Profil → section FAMILLE.'
          ]
        },
        {
          id: 5,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Les Missions',
          text: 'Cycle complet d\'une mission :',
          items: [
            'Création : Appuyez sur + dans le Dashboard, choisissez un titre et une récompense.',
            'Action : L\'enfant voit la mission dans son espace et clique "C\'est fait !".',
            'Notification : Vous recevez une alerte dans l\'onglet Demandes.',
            'Validation : Approuvez ou rejetez — la récompense est ajoutée automatiquement.'
          ]
        },
        {
          id: 6,
          icon: 'fa-gift',
          color: 'from-amber-400 to-orange-600',
          title: 'Objectifs & Cadeaux',
          text: 'Système d\'épargne intégré :',
          items: [
            'Ajoutez un objectif (nom + montant cible) depuis le Dashboard de l\'enfant.',
            'L\'enfant suit sa progression via la barre colorée dans son espace.',
            'Quand le solde atteint l\'objectif, l\'enfant envoie une demande de cadeau.',
            'Vous confirmez dans l\'onglet Demandes — le solde est automatiquement déduit.'
          ]
        },
        {
          id: 7,
          icon: 'fa-clock-rotate-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'Historique & Journal',
          text: 'Suivi complet des transactions :',
          items: [
            'Onglet Historique : sélectionnez un enfant pour voir ses entrées/sorties.',
            'Filtres CE MOIS / TOUT pour affiner la période.',
            'L\'enfant peut aussi consulter son journal d\'argent dans son espace.',
            'Chaque transaction affiche le type (mission, cadeau, dépôt, retrait) et la date.'
          ]
        },
        {
          id: 8,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Limites & Devise',
          text: 'Pour rester réaliste et pédagogique :',
          items: [
            'Le solde est plafonné (100€ par défaut, modifiable dans Profil → Limite du portefeuille).',
            'Choisissez votre devise dans Profil → Paramètres → Devise (23 devises disponibles).',
            'Si une récompense dépasse le plafond, le paiement est bloqué — bonne occasion d\'expliquer l\'épargne !'
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
          icon: 'fa-rocket',
          color: 'from-violet-400 to-indigo-600',
          title: 'Get started in 3 steps',
          text: 'Everything takes just a few minutes:',
          items: [
            '① Create your parent account (Google, Apple or email).',
            '② Tap the + button to add your first child (name, colour, avatar).',
            '③ Create a first mission — your child gets a notification immediately!'
          ]
        },
        {
          id: 2,
          icon: 'fa-table-columns',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigation',
          text: '4 tabs at the bottom of the screen:',
          items: [
            'Dashboard: Balance, goals and missions for the selected child.',
            'History: Full transaction log per child.',
            'Requests: Approve completed missions and gift requests.',
            'Profile: Manage children, currency, language and security.'
          ]
        },
        {
          id: 3,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Parent Space — Security',
          text: 'Your space is protected separately from the child\'s space:',
          items: [
            '4-digit PIN code set on first use.',
            'Face ID / Touch ID if enabled on your device.',
            'The child cannot access your space — they only see their own profile.',
            'Forgot PIN: enter your Koiny password to reset it.'
          ]
        },
        {
          id: 4,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Managing Children',
          text: 'From the Dashboard (Home tab):',
          items: [
            'Select a child at the top of the screen to view their dashboard.',
            'Tap + Deposit or − Withdraw to manually adjust the balance.',
            'Add a goal using the "+ Add" button in the Goals section.',
            'Edit a child\'s profile from the Profile tab → FAMILY section.'
          ]
        },
        {
          id: 5,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Missions',
          text: 'Full mission cycle:',
          items: [
            'Create: Tap + on the Dashboard, choose a title and reward.',
            'Action: Child sees the mission in their space and taps "Done!".',
            'Notification: You receive an alert in the Requests tab.',
            'Approval: Approve or reject — reward is added automatically.'
          ]
        },
        {
          id: 6,
          icon: 'fa-gift',
          color: 'from-amber-400 to-orange-600',
          title: 'Goals & Gifts',
          text: 'Built-in savings system:',
          items: [
            'Add a goal (name + target amount) from the child\'s Dashboard.',
            'Child tracks progress via the coloured bar in their space.',
            'When the balance reaches the goal, the child sends a gift request.',
            'You confirm in the Requests tab — balance is automatically deducted.'
          ]
        },
        {
          id: 7,
          icon: 'fa-clock-rotate-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'History & Journal',
          text: 'Full transaction tracking:',
          items: [
            'History tab: select a child to see their income/expenses.',
            'THIS MONTH / ALL filters to narrow the period.',
            'The child can also view their money journal in their own space.',
            'Each transaction shows type (mission, gift, deposit, withdrawal) and date.'
          ]
        },
        {
          id: 8,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Limits & Currency',
          text: 'Staying realistic and educational:',
          items: [
            'Balance is capped (€100 by default, editable in Profile → Wallet Limit).',
            'Choose your currency in Profile → Settings → Currency (23 currencies available).',
            'If a reward exceeds the limit, payment is blocked — a great chance to talk about saving!'
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
          icon: 'fa-rocket',
          color: 'from-violet-400 to-indigo-600',
          title: 'Starten in 3 stappen',
          text: 'Alles is klaar in een paar minuten:',
          items: [
            '① Maak je ouderaccount aan (Google, Apple of e-mail).',
            '② Tik op de + knop om je eerste kind toe te voegen (naam, kleur, avatar).',
            '③ Maak een eerste missie — je kind ontvangt meteen een melding!'
          ]
        },
        {
          id: 2,
          icon: 'fa-table-columns',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigatie',
          text: '4 tabbladen onderaan het scherm:',
          items: [
            'Dashboard: Saldo, doelen en missies van het geselecteerde kind.',
            'Geschiedenis: Volledig transactielogboek per kind.',
            'Verzoeken: Voltooide missies en cadeauverzoeken goedkeuren.',
            'Profiel: Kinderen, valuta, taal en beveiliging beheren.'
          ]
        },
        {
          id: 3,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Ouderomgeving — Beveiliging',
          text: 'Jouw ruimte is apart beveiligd van de kinderomgeving:',
          items: [
            '4-cijferige PIN-code ingesteld bij eerste gebruik.',
            'Face ID / Touch ID als ingesteld op uw toestel.',
            'Het kind heeft geen toegang tot jouw ruimte — het ziet alleen zijn eigen profiel.',
            'PIN vergeten: voer uw Koiny-wachtwoord in om het te resetten.'
          ]
        },
        {
          id: 4,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Kinderen beheren',
          text: 'Vanuit het Dashboard (tabblad Thuis):',
          items: [
            'Selecteer een kind bovenaan om hun dashboard te zien.',
            'Tik op + Storting of − Opname om het saldo handmatig aan te passen.',
            'Voeg een doel toe via de "+ Toevoegen" knop in de sectie Doelen.',
            'Bewerk een kindprofiel via Profiel → sectie GEZIN.'
          ]
        },
        {
          id: 5,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Missies',
          text: 'Volledige missiecyclus:',
          items: [
            'Aanmaken: Tik op + in het Dashboard, kies titel en beloning.',
            'Actie: Kind ziet de missie in zijn ruimte en tikt "Klaar!".',
            'Melding: Je ontvangt een alert in het tabblad Verzoeken.',
            'Goedkeuring: Keur goed of weiger — beloning wordt automatisch toegevoegd.'
          ]
        },
        {
          id: 6,
          icon: 'fa-gift',
          color: 'from-amber-400 to-orange-600',
          title: 'Doelen & Cadeaus',
          text: 'Ingebouwd spaarsysteem:',
          items: [
            'Voeg een doel toe (naam + doelbedrag) vanuit het Dashboard van het kind.',
            'Kind volgt voortgang via de kleurrijke balk in zijn/haar ruimte.',
            'Wanneer saldo het doel bereikt, stuurt het kind een cadeauverzoek.',
            'Jij bevestigt in Verzoeken — saldo wordt automatisch afgetrokken.'
          ]
        },
        {
          id: 7,
          icon: 'fa-clock-rotate-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'Geschiedenis & Dagboek',
          text: 'Volledig transactieoverzicht:',
          items: [
            'Tabblad Geschiedenis: selecteer een kind om inkomsten/uitgaven te zien.',
            'Filters DEZE MAAND / ALLES om de periode te verfijnen.',
            'Het kind kan ook zijn geldendagboek bekijken in zijn eigen ruimte.',
            'Elke transactie toont type (missie, cadeau, storting, opname) en datum.'
          ]
        },
        {
          id: 8,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Limieten & Valuta',
          text: 'Realistisch en educatief blijven:',
          items: [
            'Saldo heeft een plafond (standaard €100, aanpasbaar in Profiel → Portefeuillelimiet).',
            'Kies je valuta in Profiel → Instellingen → Valuta (23 valuta\'s beschikbaar).',
            'Als een beloning het plafond overschrijdt, wordt betaling geblokkeerd — een mooie gelegenheid!'
          ]
        }
      ],
      close: 'Aan de slag!'
    }
  }[language] ?? {
    title: 'User Guide', welcomeTitle: 'Welcome to Koiny!', welcomeText: '', steps: [], close: "Let's go!"
  };

  if (isAndroid) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end">
        <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose}></div>
        <div
          className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl animate-slide-up flex flex-col max-h-[90vh] relative z-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Handle bar */}
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-1 shrink-0" />

          {/* MD3 Header — light surface */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <i className="fa-solid fa-book-open text-indigo-500 text-sm"></i>
              </div>
              <h3 id="help-dialog-title" className="text-xl font-medium text-slate-900 dark:text-white">{t.title}</h3>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 overflow-y-auto flex-grow">
            {/* Welcome Card */}
            <div className="relative overflow-hidden mb-6 p-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
              <div className="relative z-10">
                <h4 className="font-semibold text-lg mb-1">{t.welcomeTitle}</h4>
                <p className="text-sm text-indigo-100 leading-relaxed">{t.welcomeText}</p>
              </div>
              <i className="fa-solid fa-piggy-bank absolute -bottom-4 -right-4 text-8xl text-white/10 rotate-12"></i>
            </div>

            <div className="space-y-6">
              {t.steps.map((step) => (
                <section key={step.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white shrink-0`}>
                      <i className={`fa-solid ${step.icon} text-xs`}></i>
                    </div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-base">{step.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 ml-11">{step.text}</p>
                  <ul className="space-y-2 ml-11">
                    {step.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 mt-0.5">
                          <i className="fa-solid fa-check text-indigo-500 text-[8px]"></i>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* MD3 bottom button */}
            <div className="mt-6 flex justify-center">
              <button onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                {t.close}
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
