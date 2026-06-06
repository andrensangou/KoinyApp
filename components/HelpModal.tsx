
import React, { useEffect } from 'react';
import { Language } from '../types';
import { useModal } from '../hooks/useModal';
import { isAndroid } from '../hooks/usePlatform';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  scrollToQr?: boolean; // ouvrir directement sur la section "Connecter l'appareil" (QR)
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, language, scrollToQr }) => {
  useModal(isOpen);

  // Scroll auto vers l'étape QR (id 8) quand ouvert depuis le tip "Comment faire"
  useEffect(() => {
    if (isOpen && scrollToQr) {
      const t = setTimeout(() => {
        document.getElementById('help-step-8')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300); // attendre le rendu + l'animation d'ouverture
      return () => clearTimeout(t);
    }
  }, [isOpen, scrollToQr]);

  if (!isOpen) return null;

  const tAndroid = {
    fr: {
      title: 'Guide Utilisateur',
      welcomeTitle: 'Bienvenue sur Koiny !',
      welcomeText: "Koiny transforme l'éducation financière en jeu. Voici comment utiliser l'app Android en famille.",
      steps: [
        {
          id: 1,
          icon: 'fa-border-all',
          color: 'from-indigo-400 to-purple-600',
          title: 'Navigation',
          text: '4 onglets en bas de l\'écran :',
          items: [
            'Accueil : Vue d\'ensemble, missions actives et objectifs de l\'enfant.',
            'Historique : Toutes les transactions, filtres Ce mois / Tout, effacer l\'historique.',
            'Demandes : Valider ou refuser les missions soumises par l\'enfant.',
            'Profil : Gérer les enfants, paramètres et compte.',
          ]
        },
        {
          id: 2,
          icon: 'fa-lock',
          color: 'from-rose-400 to-pink-600',
          title: 'Espace Parents — Sécurité',
          text: 'Accès protégé par code PIN :',
          items: [
            'Code PIN à 4 chiffres configuré dans Profil > Paramètres > Code PIN.',
            'Si aucun PIN n\'est configuré, l\'accès est direct.',
            'Oubli du PIN : déconnectez-vous et reconnectez-vous avec votre email/mot de passe, puis reconfigurez le PIN.',
          ]
        },
        {
          id: 3,
          icon: 'fa-child',
          color: 'from-emerald-400 to-teal-600',
          title: 'Gérer les Enfants',
          text: 'Dans l\'onglet Profil > MES ENFANTS :',
          items: [
            'Ajoutez un enfant : prénom, date de naissance, avatar et couleur.',
            'Modifiez un profil avec le bouton crayon (nom, avatar, couleur, anniversaire).',
            'Supprimez un profil enfant depuis le formulaire de modification.',
          ]
        },
        {
          id: 4,
          icon: 'fa-bullseye',
          color: 'from-amber-400 to-orange-500',
          title: 'Objectifs d\'épargne',
          text: 'Dans l\'onglet Accueil, section Objectifs :',
          items: [
            'Créez un objectif avec nom, montant cible et icône.',
            'La jauge change de couleur : rouge → orange → couleur de l\'enfant → vert à l\'atteinte.',
            'Modifiez ou supprimez un objectif avec le bouton crayon ou corbeille.',
            'Quand l\'objectif est atteint, l\'enfant peut le réclamer depuis son espace.',
          ]
        },
        {
          id: 5,
          icon: 'fa-check-double',
          color: 'from-blue-400 to-indigo-600',
          title: 'Les Missions',
          text: 'Cycle complet d\'une mission :',
          items: [
            'Création : dans Accueil, tapez "+ MISSION" pour ajouter titre et récompense.',
            'Action : l\'enfant clique sur "C\'est fait !" dans son espace.',
            'Validation : dans l\'onglet Demandes, approuvez ou refusez.',
            'Paiement : la récompense est automatiquement ajoutée au solde.',
          ]
        },
        {
          id: 6,
          icon: 'fa-right-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'Changer de Profil',
          text: 'Passer de l\'espace parent à l\'espace enfant :',
          items: [
            'Appuyez sur le bouton ⏻ (power) en haut à droite du tableau de bord.',
            'L\'enfant voit ses missions, son solde et peut marquer "C\'est fait !".',
            'Pour revenir, appuyez à nouveau sur ⏻ et saisissez votre PIN si configuré.',
          ]
        },
        {
          id: 7,
          icon: 'fa-wallet',
          color: 'from-teal-400 to-emerald-500',
          title: 'Limite du portefeuille',
          text: 'Dans Profil > Paramètres > Limite du portefeuille :',
          items: [
            'Définissez le solde maximum autorisé pour l\'enfant (0 à 1 000€).',
            '0 = illimité. Utile pour responsabiliser sans risque.',
            'Si une récompense dépasse ce plafond, le paiement est bloqué.',
          ]
        },
        {
          id: 8,
          icon: 'fa-qrcode',
          color: 'from-violet-400 to-fuchsia-600',
          title: 'Connecter l\'appareil de l\'enfant',
          text: 'Installez Koiny sur la tablette ou le téléphone de l\'enfant, sans ressaisir vos identifiants :',
          items: [
            'Sur l\'appareil de l\'enfant, installez Koiny et tapez "Connexion par QR code" sur l\'écran de connexion.',
            'Sur votre téléphone : Profil > Connecter un appareil, puis scannez le QR affiché.',
            'L\'appareil de l\'enfant s\'ouvre directement sur votre compte famille.',
          ]
        },
      ],
      close: 'C\'est parti !'
    },
    en: {
      title: 'User Guide',
      welcomeTitle: 'Welcome to Koiny!',
      welcomeText: "Koiny turns financial education into a game. Here's how to use the Android app as a family.",
      steps: [
        {
          id: 1, icon: 'fa-border-all', color: 'from-indigo-400 to-purple-600',
          title: 'Navigation',
          text: '4 tabs at the bottom of the screen:',
          items: [
            'Home: Overview, active missions and child goals.',
            'History: All transactions, This month / All filter, clear history.',
            'Requests: Approve or reject missions submitted by the child.',
            'Profile: Manage children, settings and account.',
          ]
        },
        {
          id: 2, icon: 'fa-lock', color: 'from-rose-400 to-pink-600',
          title: 'Parent Space — Security',
          text: 'Access protected by PIN code:',
          items: [
            '4-digit PIN code set in Profile > Settings > PIN Code.',
            'If no PIN is set, access is direct.',
            'Forgot PIN: sign out and sign back in with email/password, then set a new PIN.',
          ]
        },
        {
          id: 3, icon: 'fa-child', color: 'from-emerald-400 to-teal-600',
          title: 'Managing Children',
          text: 'In the Profile tab > MY CHILDREN:',
          items: [
            'Add a child: name, date of birth, avatar and colour.',
            'Edit a profile with the pencil button (name, avatar, colour, birthday).',
            'Delete a child profile from the edit form.',
          ]
        },
        {
          id: 4, icon: 'fa-bullseye', color: 'from-amber-400 to-orange-500',
          title: 'Savings Goals',
          text: 'In the Home tab, Goals section:',
          items: [
            'Create a goal with a name, target amount and icon.',
            'Progress bar changes colour: red → orange → child colour → green when reached.',
            'Edit or delete a goal with the pencil or trash button.',
            'Once reached, the child can claim it from their space.',
          ]
        },
        {
          id: 5, icon: 'fa-check-double', color: 'from-blue-400 to-indigo-600',
          title: 'Missions',
          text: 'Full mission cycle:',
          items: [
            'Create: in Home, tap "+ MISSION" to add a title and reward.',
            'Action: child taps "Done!" in their space.',
            'Validation: in the Requests tab, approve or reject.',
            'Payment: reward is automatically added to the balance.',
          ]
        },
        {
          id: 6, icon: 'fa-right-left', color: 'from-cyan-400 to-blue-500',
          title: 'Switching Profiles',
          text: 'Switch between parent and child space:',
          items: [
            'Tap the ⏻ (power) button top-right on the dashboard.',
            'Child sees their missions, balance and can tap "Done!".',
            'To return, tap ⏻ again and enter your PIN if set.',
          ]
        },
        {
          id: 7, icon: 'fa-wallet', color: 'from-teal-400 to-emerald-500',
          title: 'Wallet Limit',
          text: 'In Profile > Settings > Wallet limit:',
          items: [
            'Set the maximum balance allowed for the child (0–1,000).',
            '0 = unlimited. Useful to teach responsibility safely.',
            'If a reward exceeds this limit, payment is blocked.',
          ]
        },
        {
          id: 8,
          icon: 'fa-qrcode',
          color: 'from-violet-400 to-fuchsia-600',
          title: "Connect your child's device",
          text: "Install Koiny on your child's tablet or phone without re-entering your credentials:",
          items: [
            'On the child\'s device, install Koiny and tap "Sign in with QR code" on the login screen.',
            'On your phone: Profile > Connect a device, then scan the QR shown.',
            'The child\'s device opens straight into your family account.',
          ]
        },
      ],
      close: "Let's go!"
    },
    nl: {
      title: 'Gebruikershandleiding',
      welcomeTitle: 'Welkom bij Koiny!',
      welcomeText: "Koiny maakt financiële educatie tot een spel. Zo gebruik je de Android-app als gezin.",
      steps: [
        {
          id: 1, icon: 'fa-border-all', color: 'from-indigo-400 to-purple-600',
          title: 'Navigatie',
          text: '4 tabbladen onderaan het scherm:',
          items: [
            'Home: Overzicht, actieve missies en doelen van het kind.',
            'Historiek: Alle transacties, filter Deze maand / Alles, geschiedenis wissen.',
            'Aanvragen: Missies van het kind goedkeuren of weigeren.',
            'Profiel: Kinderen, instellingen en account beheren.',
          ]
        },
        {
          id: 2, icon: 'fa-lock', color: 'from-rose-400 to-pink-600',
          title: 'Ouderomgeving — Beveiliging',
          text: 'Toegang beveiligd met PIN-code:',
          items: [
            '4-cijferige PIN-code instellen via Profiel > Instellingen > PIN-code.',
            'Als er geen PIN is ingesteld, is toegang direct.',
            'PIN vergeten: afmelden en opnieuw aanmelden met e-mail/wachtwoord, daarna nieuwe PIN instellen.',
          ]
        },
        {
          id: 3, icon: 'fa-child', color: 'from-emerald-400 to-teal-600',
          title: 'Kinderen beheren',
          text: 'In het tabblad Profiel > MIJN KINDEREN:',
          items: [
            'Voeg een kind toe: naam, geboortedatum, avatar en kleur.',
            'Bewerk een profiel met de potloodknop (naam, avatar, kleur, verjaardag).',
            'Verwijder een kindprofiel vanuit het bewerkingsformulier.',
          ]
        },
        {
          id: 4, icon: 'fa-bullseye', color: 'from-amber-400 to-orange-500',
          title: 'Spaardoelen',
          text: 'In het tabblad Home, sectie Doelen:',
          items: [
            'Maak een doel met naam, doelbedrag en icoon.',
            'De balk verandert van kleur: rood → oranje → kleur kind → groen bij bereiken.',
            'Bewerk of verwijder een doel met het potlood of prullenbak.',
            'Wanneer bereikt, kan het kind het opeisen vanuit zijn/haar ruimte.',
          ]
        },
        {
          id: 5, icon: 'fa-check-double', color: 'from-blue-400 to-indigo-600',
          title: 'Missies',
          text: 'Volledige missiecyclus:',
          items: [
            'Aanmaken: in Home, tik "+ MISSIE" om titel en beloning toe te voegen.',
            'Actie: kind tikt op "Klaar!" in zijn/haar ruimte.',
            'Validatie: in het tabblad Aanvragen, goed- of afkeuren.',
            'Betaling: beloning wordt automatisch aan het saldo toegevoegd.',
          ]
        },
        {
          id: 6, icon: 'fa-right-left', color: 'from-cyan-400 to-blue-500',
          title: 'Profielen wisselen',
          text: 'Schakelen tussen ouder- en kinderomgeving:',
          items: [
            'Tik op de ⏻ (power) knop rechtsboven op het dashboard.',
            'Kind ziet missies, saldo en kan op "Klaar!" tikken.',
            'Om terug te keren, tik opnieuw op ⏻ en voer PIN in indien ingesteld.',
          ]
        },
        {
          id: 7, icon: 'fa-wallet', color: 'from-teal-400 to-emerald-500',
          title: 'Portemonnee-limiet',
          text: 'Via Profiel > Instellingen > Portemonnee-limiet:',
          items: [
            'Stel het maximale saldo in voor het kind (0–1.000€).',
            '0 = onbeperkt. Handig om verantwoordelijkheid bij te brengen.',
            'Als een beloning dit plafond overschrijdt, wordt de betaling geblokkeerd.',
          ]
        },
        {
          id: 8,
          icon: 'fa-qrcode',
          color: 'from-violet-400 to-fuchsia-600',
          title: 'Apparaat van het kind verbinden',
          text: 'Installeer Koiny op de tablet of telefoon van het kind, zonder je gegevens opnieuw in te voeren:',
          items: [
            'Installeer Koiny op het toestel van het kind en tik op "Inloggen met QR-code" op het inlogscherm.',
            'Op jouw telefoon: Profiel > Apparaat verbinden, scan daarna de getoonde QR-code.',
            'Het toestel van het kind opent meteen in jouw gezinsaccount.',
          ]
        },
      ],
      close: 'Aan de slag!'
    },
  }[language] ?? { title: 'User Guide', welcomeTitle: 'Welcome!', welcomeText: '', steps: [], close: "Let's go!" };

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
          icon: 'fa-right-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'Changer de Profil',
          text: 'Passer de l\'espace parent à l\'espace enfant :',
          items: [
            'Appuyez sur le bouton ⏻ (power) en haut à droite pour basculer vers l\'espace enfant.',
            'L\'enfant peut ainsi voir ses missions et marquer "C\'est fait !".',
            'Pour revenir à l\'espace parent, appuyez à nouveau sur ⏻ et saisissez votre PIN.'
          ]
        },
        {
          id: 7,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Limites de Solde',
          text: 'Configurable selon vos besoins :',
          items: [
            'Le plafond est réglable dans Profil > Réglages > Limite du portefeuille.',
            'Valeur possible de 0 à 10 000€ selon votre situation.',
            'Si une récompense dépasse ce plafond, le paiement est bloqué.'
          ]
        },
        {
          id: 8,
          icon: 'fa-qrcode',
          color: 'from-violet-400 to-fuchsia-600',
          title: 'Connecter l\'appareil de l\'enfant',
          text: 'Installez Koiny sur la tablette ou le téléphone de l\'enfant, sans ressaisir vos identifiants :',
          items: [
            'Sur l\'appareil de l\'enfant, installez Koiny et tapez "Connexion par QR code" sur l\'écran de connexion.',
            'Sur votre téléphone : Profil > Connecter un appareil, puis scannez le QR affiché.',
            'L\'appareil de l\'enfant s\'ouvre directement sur votre compte famille.'
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
          icon: 'fa-right-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'Switching Profiles',
          text: 'Switch between parent and child space:',
          items: [
            'Tap the ⏻ (power) button in the top right to switch to the child\'s space.',
            'Your child can then see their missions and tap "Done!".',
            'To return to the parent space, tap ⏻ again and enter your PIN.'
          ]
        },
        {
          id: 7,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Balance Limits',
          text: 'Configurable to your needs:',
          items: [
            'The cap is adjustable in Profile > Settings > Wallet Limit.',
            'Set any amount from 0 to 10,000 in your currency.',
            'If a reward exceeds this limit, payment is blocked.'
          ]
        },
        {
          id: 8,
          icon: 'fa-qrcode',
          color: 'from-violet-400 to-fuchsia-600',
          title: "Connect your child's device",
          text: "Install Koiny on your child's tablet or phone without re-entering your credentials:",
          items: [
            'On the child\'s device, install Koiny and tap "Sign in with QR code" on the login screen.',
            'On your phone: Profile > Connect a device, then scan the QR shown.',
            'The child\'s device opens straight into your family account.'
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
          icon: 'fa-right-left',
          color: 'from-cyan-400 to-blue-500',
          title: 'Profielen wisselen',
          text: 'Schakelen tussen ouder- en kinderomgeving:',
          items: [
            'Tik op de ⏻ (power) knop rechtsboven om naar de kinderomgeving te gaan.',
            'Je kind kan dan missies zien en op "Klaar!" tikken.',
            'Om terug te keren naar de ouderomgeving, tik opnieuw op ⏻ en voer je PIN in.'
          ]
        },
        {
          id: 7,
          icon: 'fa-piggy-bank',
          color: 'from-amber-400 to-yellow-500',
          title: 'Saldolimieten',
          text: 'Instelbaar naar jouw situatie:',
          items: [
            'Het plafond is aanpasbaar via Profiel > Instellingen > Portemonnee-limiet.',
            'Stel een bedrag in van €0 tot €10.000.',
            'Als een beloning dit plafond overschrijdt, wordt de betaling geblokkeerd.'
          ]
        },
        {
          id: 8,
          icon: 'fa-qrcode',
          color: 'from-violet-400 to-fuchsia-600',
          title: 'Apparaat van het kind verbinden',
          text: 'Installeer Koiny op de tablet of telefoon van het kind, zonder je gegevens opnieuw in te voeren:',
          items: [
            'Installeer Koiny op het toestel van het kind en tik op "Inloggen met QR-code" op het inlogscherm.',
            'Op jouw telefoon: Profiel > Apparaat verbinden, scan daarna de getoonde QR-code.',
            'Het toestel van het kind opent meteen in jouw gezinsaccount.'
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
              <h3 id="help-dialog-title" className="text-xl font-medium text-slate-900 dark:text-white">{tAndroid.title}</h3>
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
                <h4 className="font-semibold text-lg mb-1">{tAndroid.welcomeTitle}</h4>
                <p className="text-sm text-indigo-100 leading-relaxed">{tAndroid.welcomeText}</p>
              </div>
              <i className="fa-solid fa-piggy-bank absolute -bottom-4 -right-4 text-8xl text-white/10 rotate-12"></i>
            </div>

            <div className="space-y-6">
              {tAndroid.steps.map((step) => (
                <section key={step.id} id={`help-step-${step.id}`}>
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
                {tAndroid.close}
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
              <section key={step.id} id={`help-step-${step.id}`} className="relative pl-12">
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
