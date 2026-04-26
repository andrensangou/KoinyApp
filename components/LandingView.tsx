import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

interface LandingViewProps {
  language: Language;
  onGetStarted: () => void;
  onSetLanguage: (lang: Language) => void;
}

const APP_STORE_URL = 'https://apps.apple.com/app/id6760566260';

const APP_STORE_BADGE: Record<Language, string> = {
  fr: 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/fr-fr?size=250x83',
  en: 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83',
  nl: 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/nl-nl?size=250x83',
};

const I18N = {
  fr: {
    nav: { features: 'Fonctionnalités', how: 'Comment ça marche', pricing: 'Tarifs', download: 'Télécharger', login: 'Se connecter' },
    hero: {
      badge: 'Application éducative · iOS',
      titlePre: "L'argent de poche qui ",
      titleAccent: 'éduque vraiment',
      sub: "Koiny donne à vos enfants la fierté de gagner, l'habitude d'épargner — et vous gardez le contrôle total.",
      cta: 'Télécharger gratuitement',
      see: 'Voir comment ça marche',
      tryWeb: 'Essayer dans le navigateur',
      t1: 'PIN parental', t2: 'Face ID', t3: 'Zéro pub',
      fc1a: 'Mission validée', fc1b: '+2,00 €',
      fc2a: 'Objectif', fc2b: '75% atteint',
      fc3a: 'Solde', fc3b: '12,50 €',
    },
    pain: {
      badge: 'Vous reconnaissez-vous ?',
      titlePre: 'Les galères de ',
      titleAccent: "l'argent de poche",
      desc: 'Chaque parent fait face aux mêmes questions. Koiny y répond simplement.',
      items: [
        { emoji: '😩', q: "« Il n'a rien fait mais réclame de l'argent »", a: "Avec Koiny, chaque euro est lié à une mission accomplie. Pas d'effort, pas de récompense." },
        { emoji: '💸', q: '« Elle dépense tout sans jamais épargner »', a: "Les objectifs d'épargne rendent le but visible. Votre enfant voit sa progression chaque jour." },
        { emoji: '📱', q: "« Je ne sais pas combien je lui ai donné »", a: 'Historique complet, graphiques, solde en temps réel. Vous avez une vision claire à tout moment.' },
      ],
    },
    feat: {
      badge: 'Fonctionnalités',
      titlePre: "Tout ce qu'il faut pour ",
      titleAccent: "apprendre en s'amusant",
      desc: 'Un outil pensé pour les parents exigeants qui veulent le contrôle, sans la complexité.',
      items: [
        { icon: 'fa-list-check', title: 'Missions personnalisées', desc: 'Ranger la chambre, faire les devoirs, aider… vous définissez les missions et les récompenses. Votre maison, vos règles.' },
        { icon: 'fa-piggy-bank', title: "Objectifs d'épargne", desc: "Vélo, console, jouet… votre enfant fixe un objectif et voit sa progression. L'épargne devient motivante." },
        { icon: 'fa-shield-halved', title: 'Contrôle parental total', desc: "PIN chiffré + Face ID pour accéder à l'espace parent. Vos enfants ne peuvent rien modifier sans vous." },
        { icon: 'fa-chart-line', title: 'Suivi & statistiques', desc: "Historique détaillé, graphiques d'évolution et vue d'ensemble par enfant. Tout en un coup d'œil." },
        { icon: 'fa-brands fa-apple', title: 'Widget iOS natif', desc: "Le solde directement sur l'écran d'accueil de l'iPhone. Pas besoin d'ouvrir l'app pour vérifier." },
        { icon: 'fa-lock', title: '100% privé, zéro pub', desc: 'Données stockées localement sur votre appareil. Aucun tracking, aucune publicité, aucune donnée vendue.' },
      ],
    },
    shot: {
      badge: 'Aperçu',
      titlePre: 'Une interface ',
      titleAccent: 'pensée pour toute la famille',
      desc: 'Simple pour les enfants, puissant pour les parents. Les captures varient automatiquement selon la langue.',
      l1: 'Espace Parents', l2: 'Espace Enfant', l3: 'Missions',
    },
    steps: {
      badge: 'Comment ça marche',
      titlePre: 'Lancé en ',
      titleAccent: '3 minutes',
      items: [
        { emoji: '👨‍👩‍👧', title: 'Créez les profils', desc: 'Ajoutez vos enfants avec un avatar, une couleur et un PIN parental sécurisé. 2 minutes chrono.' },
        { emoji: '🎯', title: 'Définissez les missions', desc: 'Créez vos propres défis avec des montants libres. « Ranger la chambre → 2 € », « Faire les courses → 5 € »' },
        { emoji: '🏆', title: 'Ils progressent, vous validez', desc: "Vos enfants accomplissent les missions et vous notifient. Vous validez en un tap. L'argent s'ajoute." },
      ],
    },
    why: {
      badge: 'Pourquoi Koiny',
      titlePre: 'Conçu pour les parents ',
      titleAccent: 'qui ont des valeurs',
      desc: 'Pas de compromis sur la sécurité, la vie privée ou la pédagogie.',
      items: [
        { emoji: '💰', bg: '#ecfdf5', title: '100% argent virtuel', desc: 'Aucune carte bancaire, aucun vrai argent engagé. Vos enfants apprennent sans aucun risque financier réel.' },
        { emoji: '🔒', bg: '#eef2ff', title: 'Données 100% privées', desc: 'Vos données restent sécurisées. Aucune donnée vendue, aucun tracking publicitaire.' },
        { emoji: '🛡️', bg: '#fff7ed', title: 'Toujours disponible', desc: "Les données sont sauvegardées localement en priorité. Même en cas de problème réseau, l'app continue de fonctionner." },
        { emoji: '🚫', bg: '#fdf4ff', title: 'Zéro publicité', desc: 'Aucune bannière, aucune notification marketing, aucun tracking. Une expérience pure pour toute la famille.' },
        { emoji: '🎓', bg: '#f0fdf4', title: 'Pédagogie prouvée', desc: "Basé sur les principes d'effort-récompense et d'objectif différé — des méthodes reconnues pour développer la responsabilité." },
        { emoji: '⚡', bg: '#eff6ff', title: 'Simple à utiliser', desc: 'Configuré en 3 minutes. Interface claire pour les enfants dès 6 ans, tableau de bord complet pour les parents.' },
      ],
    },
    price: {
      badge: 'Tarifs',
      titlePre: 'Simple et ',
      titleAccent: 'transparent',
      desc: 'Commencez gratuitement. Passez Premium quand votre famille grandit.',
      free: { name: 'Koiny Standard', price: 'Gratuit', period: 'Pour toujours', f: ['1 enfant', 'Max 2 missions actives', "Max 1 objectif d'épargne", 'Historique (5 dernières)', 'Widget iOS & Face ID'], muted: ['Statistiques & graphiques', 'Enfants illimités'], cta: 'Commencer gratuitement' },
      prem: { badge: 'Recommandé', name: 'Koiny Premium', price: '1,99 €', period: 'par mois · ou 16,99 €/an', f: ['Enfants illimités', 'Missions & objectifs illimités', 'Historique complet', 'Statistiques & graphiques', "14 jours d'essai gratuit"], cta: 'Essayer 14 jours gratuits' },
      disclaimer: "* L'abonnement Premium se renouvelle automatiquement. Annulable à tout moment via Réglages > Apple ID > Abonnements. L'essai gratuit de 14 jours se convertit automatiquement en abonnement payant sauf annulation préalable.",
    },
    cta: {
      title: "Lancez-vous dès aujourd'hui",
      sub: 'Rejoignez les familles qui utilisent Koiny pour motiver leurs enfants au quotidien.',
      f: ['Gratuit à télécharger', 'Zéro publicité', 'Sans abonnement obligatoire', 'Aucune donnée vendue'],
      privacy: '🔒 Consulter notre politique de confidentialité',
      note: 'Requiert iOS 15.0 ou ultérieur. iPhone.',
      age: 'Conçu pour les enfants de 6 à 14 ans sous supervision parentale.',
    },
    footer: {
      desc: "L'argent de poche virtuel qui motive vos enfants. Un simulateur éducatif sûr et amusant.",
      disclaimer: '⚠️ Koiny est un simulateur. Aucune transaction financière réelle n\'est effectuée.',
      h1: 'Liens utiles', privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation",
      h2: 'Application',
      rights: 'Tous droits réservés.',
    },
  },
  en: {
    nav: { features: 'Features', how: 'How it works', pricing: 'Pricing', download: 'Download', login: 'Sign in' },
    hero: {
      badge: 'Educational App · iOS',
      titlePre: 'Pocket money that ',
      titleAccent: 'truly educates',
      sub: 'Koiny gives your children the pride of earning and the habit of saving — while you keep full control.',
      cta: 'Download for free',
      see: 'See how it works',
      tryWeb: 'Try in browser',
      t1: 'Parental PIN', t2: 'Face ID', t3: 'Zero ads',
      fc1a: 'Mission done', fc1b: '+€2.00',
      fc2a: 'Goal', fc2b: '75% reached',
      fc3a: 'Balance', fc3b: '€12.50',
    },
    pain: {
      badge: 'Sound familiar?',
      titlePre: 'The ',
      titleAccent: 'pocket money struggles',
      desc: 'Every parent faces the same questions. Koiny answers them simply.',
      items: [
        { emoji: '😩', q: '"He did nothing but still asks for money"', a: 'With Koiny, every euro is tied to a completed mission. No effort, no reward.' },
        { emoji: '💸', q: '"She spends everything without saving"', a: 'Savings goals make the target visible. Your child sees their progress every day.' },
        { emoji: '📱', q: "\"I don't know how much I've given\"", a: 'Full history, charts, real-time balance. You have a clear view at any time.' },
      ],
    },
    feat: {
      badge: 'Features',
      titlePre: 'Everything to ',
      titleAccent: 'learn through play',
      desc: 'A tool designed for demanding parents who want control, without the complexity.',
      items: [
        { icon: 'fa-list-check', title: 'Custom missions', desc: 'Clean the room, do homework, help out… you set the missions and rewards. Your home, your rules.' },
        { icon: 'fa-piggy-bank', title: 'Savings goals', desc: 'Bike, console, toy… your child sets a goal and watches their progress. Saving becomes motivating.' },
        { icon: 'fa-shield-halved', title: 'Full parental control', desc: "Encrypted PIN + Face ID to access the parent space. Your children can't change anything without you." },
        { icon: 'fa-chart-line', title: 'Tracking & stats', desc: 'Detailed history, progress charts and overview per child. Everything at a glance.' },
        { icon: 'fa-brands fa-apple', title: 'Native iOS Widget', desc: 'Balance directly on the iPhone home screen. No need to open the app to check.' },
        { icon: 'fa-lock', title: '100% private, zero ads', desc: 'Data stored securely. No tracking, no advertising, no data sold.' },
      ],
    },
    shot: {
      badge: 'Preview',
      titlePre: 'An interface ',
      titleAccent: 'designed for the whole family',
      desc: 'Simple for kids, powerful for parents. Screenshots change automatically with your language.',
      l1: 'Parent Space', l2: 'Child Space', l3: 'Missions',
    },
    steps: {
      badge: 'How it works',
      titlePre: 'Up and running in ',
      titleAccent: '3 minutes',
      items: [
        { emoji: '👨‍👩‍👧', title: 'Create profiles', desc: 'Add your children with an avatar, color, and secure parental PIN. Done in 2 minutes.' },
        { emoji: '🎯', title: 'Set up missions', desc: 'Create your own challenges with free amounts. "Clean the room → €2", "Do the shopping → €5"' },
        { emoji: '🏆', title: 'They progress, you validate', desc: 'Your children complete missions and notify you. You approve with one tap. Money is added.' },
      ],
    },
    why: {
      badge: 'Why Koiny',
      titlePre: 'Built for parents ',
      titleAccent: 'with values',
      desc: 'No compromise on security, privacy or education.',
      items: [
        { emoji: '💰', bg: '#ecfdf5', title: '100% virtual money', desc: 'No bank card, no real money involved. Your children learn without any real financial risk.' },
        { emoji: '🔒', bg: '#eef2ff', title: 'Data 100% private', desc: 'Your data stays secure. No data sold, no ad tracking.' },
        { emoji: '🛡️', bg: '#fff7ed', title: 'Always available', desc: "Data is saved locally first. Even if there's a network issue, the app keeps working." },
        { emoji: '🚫', bg: '#fdf4ff', title: 'Zero ads', desc: 'No banners, no marketing notifications, no tracking. A pure experience for the whole family.' },
        { emoji: '🎓', bg: '#f0fdf4', title: 'Proven pedagogy', desc: 'Based on effort-reward and deferred-goal principles — recognised methods for developing responsibility.' },
        { emoji: '⚡', bg: '#eff6ff', title: 'Simple to use', desc: 'Set up in 3 minutes. Clear interface for children from age 6, full dashboard for parents.' },
      ],
    },
    price: {
      badge: 'Pricing',
      titlePre: 'Simple and ',
      titleAccent: 'transparent',
      desc: 'Start for free. Upgrade to Premium when your family grows.',
      free: { name: 'Koiny Standard', price: 'Free', period: 'Forever', f: ['1 child', 'Max 2 active missions', 'Max 1 savings goal', 'History (last 5)', 'iOS Widget & Face ID'], muted: ['Statistics & charts', 'Unlimited children'], cta: 'Start for free' },
      prem: { badge: 'Recommended', name: 'Koiny Premium', price: '€1.99', period: 'per month · or €16.99/year', f: ['Unlimited children', 'Unlimited missions & goals', 'Full history', 'Statistics & charts', '14-day free trial'], cta: 'Try free for 14 days' },
      disclaimer: '* Premium subscription auto-renews. Cancel anytime via Settings > Apple ID > Subscriptions. The 14-day free trial automatically converts to a paid subscription unless cancelled.',
    },
    cta: {
      title: 'Get started today',
      sub: 'Join the families using Koiny to motivate their children every day.',
      f: ['Free to download', 'Zero ads', 'No mandatory subscription', 'No data sold'],
      privacy: '🔒 View our privacy policy',
      note: 'Requires iOS 15.0 or later. iPhone.',
      age: 'Designed for children aged 6 to 14 under parental supervision.',
    },
    footer: {
      desc: 'Virtual pocket money that motivates your kids. A safe and fun educational simulator.',
      disclaimer: '⚠️ Koiny is a simulator. No real financial transactions are made.',
      h1: 'Useful links', privacy: 'Privacy Policy', terms: 'Terms of Use',
      h2: 'App',
      rights: 'All rights reserved.',
    },
  },
  nl: {
    nav: { features: 'Functies', how: 'Hoe het werkt', pricing: 'Prijzen', download: 'Downloaden', login: 'Aanmelden' },
    hero: {
      badge: 'Educatieve app · iOS',
      titlePre: 'Zakgeld dat ',
      titleAccent: 'echt opvoedt',
      sub: 'Koiny geeft je kinderen de trots van verdienen en de gewoonte van sparen — en jij behoudt de volledige controle.',
      cta: 'Gratis downloaden',
      see: 'Zie hoe het werkt',
      tryWeb: 'Probeer in de browser',
      t1: 'Ouderlijke PIN', t2: 'Face ID', t3: 'Geen reclame',
      fc1a: 'Missie voltooid', fc1b: '+€2,00',
      fc2a: 'Doel', fc2b: '75% bereikt',
      fc3a: 'Saldo', fc3b: '€12,50',
    },
    pain: {
      badge: 'Herken je dit?',
      titlePre: 'De ',
      titleAccent: 'zakgeldproblemen',
      desc: 'Elke ouder heeft dezelfde vragen. Koiny beantwoordt ze eenvoudig.',
      items: [
        { emoji: '😩', q: '"Hij deed niets maar vraagt toch om geld"', a: 'Met Koiny is elke euro gekoppeld aan een voltooide missie. Geen inspanning, geen beloning.' },
        { emoji: '💸', q: '"Ze geeft alles uit zonder te sparen"', a: 'Spaardoelen maken het doel zichtbaar. Je kind ziet elke dag zijn voortgang.' },
        { emoji: '📱', q: '"Ik weet niet hoeveel ik hem heb gegeven"', a: 'Volledige geschiedenis, grafieken, realtime saldo. Je hebt altijd een duidelijk overzicht.' },
      ],
    },
    feat: {
      badge: 'Functies',
      titlePre: 'Alles om ',
      titleAccent: 'spelenderwijs te leren',
      desc: 'Een tool voor veeleisende ouders die controle willen, zonder de complexiteit.',
      items: [
        { icon: 'fa-list-check', title: 'Gepersonaliseerde missies', desc: 'Kamer opruimen, huiswerk maken, helpen… jij bepaalt de missies en beloningen. Jouw huis, jouw regels.' },
        { icon: 'fa-piggy-bank', title: 'Spaardoelen', desc: 'Fiets, console, speelgoed… je kind stelt een doel en ziet de voortgang. Sparen wordt motiverend.' },
        { icon: 'fa-shield-halved', title: 'Volledige oudercontrole', desc: 'Versleutelde PIN + Face ID voor toegang tot de ouderruimte. Je kinderen kunnen niets wijzigen zonder jou.' },
        { icon: 'fa-chart-line', title: 'Opvolging & statistieken', desc: 'Gedetailleerde geschiedenis, voortgangsgrafieken en overzicht per kind. Alles in één oogopslag.' },
        { icon: 'fa-brands fa-apple', title: 'Native iOS Widget', desc: 'Saldo direct op het iPhone-startscherm. Je hoeft de app niet te openen om te controleren.' },
        { icon: 'fa-lock', title: '100% privé, geen reclame', desc: 'Gegevens veilig opgeslagen. Geen tracking, geen reclame, geen verkochte gegevens.' },
      ],
    },
    shot: {
      badge: 'Voorbeeld',
      titlePre: 'Een interface ',
      titleAccent: 'voor het hele gezin',
      desc: 'Eenvoudig voor kinderen, krachtig voor ouders. Screenshots wisselen automatisch met je taal.',
      l1: 'Ouderruimte', l2: 'Kinderruimte', l3: 'Missies',
    },
    steps: {
      badge: 'Hoe het werkt',
      titlePre: 'Klaar in ',
      titleAccent: '3 minuten',
      items: [
        { emoji: '👨‍👩‍👧', title: 'Maak profielen', desc: 'Voeg je kinderen toe met een avatar, kleur en veilige ouderlijke PIN. Klaar in 2 minuten.' },
        { emoji: '🎯', title: 'Stel missies in', desc: 'Maak je eigen uitdagingen met vrije bedragen. "Kamer opruimen → €2", "Boodschappen doen → €5"' },
        { emoji: '🏆', title: 'Ze groeien, jij valideert', desc: 'Je kinderen voltooien missies en sturen je een melding. Jij keurt goed met één tik. Geld wordt toegevoegd.' },
      ],
    },
    why: {
      badge: 'Waarom Koiny',
      titlePre: 'Gebouwd voor ouders ',
      titleAccent: 'met waarden',
      desc: 'Geen compromis op veiligheid, privacy of pedagogiek.',
      items: [
        { emoji: '💰', bg: '#ecfdf5', title: '100% virtueel geld', desc: 'Geen bankkaart, geen echt geld. Je kinderen leren zonder enig financieel risico.' },
        { emoji: '🔒', bg: '#eef2ff', title: 'Gegevens 100% privé', desc: 'Je gegevens blijven veilig. Geen verkochte gegevens, geen advertentietracking.' },
        { emoji: '🛡️', bg: '#fff7ed', title: 'Altijd beschikbaar', desc: 'Gegevens worden lokaal opgeslagen als prioriteit. Zelfs bij een netwerkprobleem blijft de app werken.' },
        { emoji: '🚫', bg: '#fdf4ff', title: 'Geen reclame', desc: 'Geen banners, geen marketingmeldingen, geen tracking. Een pure ervaring voor het hele gezin.' },
        { emoji: '🎓', bg: '#f0fdf4', title: 'Bewezen pedagogiek', desc: 'Gebaseerd op inspanning-beloning en uitgesteld doel — erkende methoden om verantwoordelijkheid bij kinderen te ontwikkelen.' },
        { emoji: '⚡', bg: '#eff6ff', title: 'Eenvoudig te gebruiken', desc: 'In 3 minuten ingesteld. Duidelijke interface voor kinderen vanaf 6 jaar, volledig dashboard voor ouders.' },
      ],
    },
    price: {
      badge: 'Prijzen',
      titlePre: 'Eenvoudig en ',
      titleAccent: 'transparant',
      desc: 'Begin gratis. Upgrade naar Premium als je gezin groeit.',
      free: { name: 'Koiny Standard', price: 'Gratis', period: 'Voor altijd', f: ['1 kind', 'Max 2 actieve missies', 'Max 1 spaardoel', 'Geschiedenis (laatste 5)', 'iOS Widget & Face ID'], muted: ['Statistieken & grafieken', 'Onbeperkt kinderen'], cta: 'Gratis beginnen' },
      prem: { badge: 'Aanbevolen', name: 'Koiny Premium', price: '€ 1,99', period: 'per maand · of € 16,99/jaar', f: ['Onbeperkt kinderen', 'Onbeperkt missies & doelen', 'Volledige geschiedenis', 'Statistieken & grafieken', '14 dagen gratis proberen'], cta: '14 dagen gratis proberen' },
      disclaimer: '* Premium-abonnement wordt automatisch verlengd. Op elk moment opzegbaar via Instellingen > Apple ID > Abonnementen. De 14-daagse gratis proefperiode wordt automatisch omgezet in een betaald abonnement tenzij geannuleerd.',
    },
    cta: {
      title: 'Begin vandaag nog',
      sub: 'Sluit je aan bij de gezinnen die Koiny gebruiken om hun kinderen elke dag te motiveren.',
      f: ['Gratis te downloaden', 'Geen reclame', 'Geen verplicht abonnement', 'Geen verkochte gegevens'],
      privacy: '🔒 Bekijk ons privacybeleid',
      note: 'Vereist iOS 15.0 of later. iPhone.',
      age: 'Ontworpen voor kinderen van 6 tot 14 jaar onder ouderlijk toezicht.',
    },
    footer: {
      desc: 'Virtueel zakgeld dat je kinderen motiveert. Een veilige, leuke educatieve simulator.',
      disclaimer: '⚠️ Koiny is een simulator. Er worden geen echte financiële transacties verwerkt.',
      h1: 'Nuttige links', privacy: 'Privacybeleid', terms: 'Gebruiksvoorwaarden',
      h2: 'App',
      rights: 'Alle rechten voorbehouden.',
    },
  },
} as const;

const LandingView: React.FC<LandingViewProps> = ({ language, onGetStarted, onSetLanguage }) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const t = I18N[language] || I18N.fr;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) setIsLangOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const titles: Record<Language, string> = {
      fr: "Koiny - L'argent de poche qui éduque vos enfants",
      en: 'Koiny - Pocket money that educates your children',
      nl: 'Koiny - Zakgeld dat je kinderen opvoedt',
    };
    document.title = titles[language] || titles.fr;
  }, [language]);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];
  const currentLang = languages.find(l => l.code === language) || languages[0];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="min-h-screen text-slate-700 antialiased overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Inter font + custom CSS variables */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .koiny-landing {
          --indigo: #4f46e5;
          --indigo-dark: #3730a3;
          --indigo-light: #eef2ff;
          --indigo-mid: #6366f1;
          --slate-900: #0f172a;
          --slate-700: #334155;
          --slate-500: #64748b;
          --slate-400: #94a3b8;
          --slate-300: #cbd5e1;
          --slate-100: #f1f5f9;
          --slate-50: #f8fafc;
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .float-anim { animation: floatY 3s ease-in-out infinite; }
        .fade-up-anim { animation: fadeUp 0.7s ease-out both; }
      `}</style>

      <div className="koiny-landing bg-white">
        {/* NAV */}
        <nav
          className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300`}
          style={{
            background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: scrolled ? '1px solid #f1f5f9' : '1px solid transparent',
          }}
        >
          <div className="max-w-[1100px] mx-auto px-6 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                <img src="/mascot.png" alt="Koiny" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">Koiny</span>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.features}</button>
              <button onClick={() => scrollTo('how-it-works')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.how}</button>
              <button onClick={() => scrollTo('pricing')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.pricing}</button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-sm font-semibold text-slate-700"
                >
                  <span className="text-base">{currentLang.flag}</span>
                  <span className="hidden md:inline">{currentLang.label}</span>
                  <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isLangOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {isLangOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 overflow-hidden py-2 z-[110]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,.1), 0 8px 24px rgba(0,0,0,.06)' }}>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { onSetLanguage(l.code); setIsLangOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${language === l.code ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3"><span>{l.flag}</span><span>{l.label}</span></div>
                        {language === l.code && <i className="fa-solid fa-circle-check text-indigo-500"></i>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-0.5"
                style={{ background: '#4f46e5', boxShadow: '0 8px 24px rgba(79,70,229,.3)' }}
              >
                <i className="fa-brands fa-apple"></i>
                {t.nav.download}
              </a>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section
          className="relative pt-[120px] pb-20 px-6"
          style={{
            background: 'linear-gradient(135deg, #f8f9ff 0%, #eef2ff 50%, #faf5ff 100%)',
            minHeight: '92vh',
          }}
        >
          {/* radial blobs */}
          <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)' }}></div>
          <div className="absolute -bottom-[100px] -left-[100px] w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,.08) 0%, transparent 70%)' }}></div>

          <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
            {/* hero content */}
            <div className="fade-up-anim text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
                style={{ background: 'rgba(79,70,229,.1)', color: '#4f46e5', border: '1px solid rgba(79,70,229,.2)' }}>
                <i className="fa-solid fa-star"></i>
                {t.hero.badge}
              </div>
              <h1 className="font-black mb-5 text-slate-900" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
                {t.hero.titlePre}<span style={{ color: '#4f46e5' }}>{t.hero.titleAccent}</span>
              </h1>
              <p className="text-lg text-slate-500 mb-9 max-w-[480px] mx-auto lg:mx-0" style={{ lineHeight: 1.7 }}>{t.hero.sub}</p>

              <div className="flex flex-wrap items-center gap-3 mb-10 justify-center lg:justify-start">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white font-bold text-[0.95rem] transition-all hover:-translate-y-0.5"
                  style={{ background: '#4f46e5', padding: '15px 28px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(79,70,229,.25)' }}
                >
                  <i className="fa-brands fa-apple"></i>
                  {t.hero.cta}
                </a>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center gap-2 font-semibold text-[0.9rem] transition-all hover:bg-slate-100 hover:text-slate-900"
                  style={{ color: '#64748b', padding: '14px 20px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: 'transparent' }}
                >
                  <i className="fa-solid fa-play text-xs"></i>
                  {t.hero.see}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center lg:justify-start">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <i className="fa-solid fa-shield-halved" style={{ color: '#4f46e5' }}></i>
                  <span>{t.hero.t1}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <i className="fa-solid fa-face-smile" style={{ color: '#4f46e5' }}></i>
                  <span>{t.hero.t2}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <i className="fa-solid fa-ban" style={{ color: '#4f46e5' }}></i>
                  <span>{t.hero.t3}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <i className="fa-solid fa-globe" style={{ color: '#4f46e5' }}></i>
                  <span>FR · EN · NL</span>
                </div>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center items-center relative order-1 lg:order-2 mb-12 lg:mb-0">
              <div className="relative">
                <PhoneDevice src={`/parent_dashboard_mockup_${language}.png`} />
                <FloatCard pos={{ top: '40px', right: '-40px' }} bg="#ecfdf5" emoji="✅" subtitle={t.hero.fc1a} value={t.hero.fc1b} valueColor="#059669" delay={0} />
                <FloatCard pos={{ bottom: '100px', right: '-50px' }} bg="#eef2ff" emoji="🎯" subtitle={t.hero.fc2a} value={t.hero.fc2b} valueColor="#4f46e5" delay={1} />
                <FloatCard pos={{ bottom: '40px', left: '-40px' }} bg="#fffbeb" emoji="🏆" subtitle={t.hero.fc3a} value={t.hero.fc3b} valueColor="#d97706" delay={0.5} />
              </div>
            </div>
          </div>
        </section>

        {/* PAIN */}
        <Section bg="white">
          <SectionHead eyebrow={t.pain.badge} titlePre={t.pain.titlePre} titleAccent={t.pain.titleAccent} desc={t.pain.desc} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.pain.items.map((p, i) => (
              <div key={i} className="bg-white rounded-3xl p-7 transition-all hover:-translate-y-1" style={{ boxShadow: '0 4px 20px rgba(0,0,0,.05)', border: '1px solid #f1f5f9' }}>
                <span className="block text-4xl mb-4">{p.emoji}</span>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3 leading-snug">{p.q}</h3>
                <p className="text-sm text-slate-500" style={{ lineHeight: 1.65 }}>{p.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FEATURES */}
        <Section bg="alt" id="features">
          <SectionHead eyebrow={t.feat.badge} titlePre={t.feat.titlePre} titleAccent={t.feat.titleAccent} desc={t.feat.desc} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.feat.items.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 transition-all hover:-translate-y-1" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid #e2e8f0' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                  <i className={`fa-solid ${f.icon} text-lg`}></i>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2.5">{f.title}</h3>
                <p className="text-sm text-slate-500" style={{ lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* SCREENSHOTS */}
        <Section bg="white" id="screenshots">
          <SectionHead eyebrow={t.shot.badge} titlePre={t.shot.titlePre} titleAccent={t.shot.titleAccent} desc={t.shot.desc} />
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 lg:gap-8">
            {[
              { label: t.shot.l1, featured: false, src: `/parent_dashboard_mockup_${language}.png` },
              { label: t.shot.l2, featured: true, src: `/child_dashboard_mockup_${language}.png` },
              { label: t.shot.l3, featured: false, src: `/missions_mockup_${language}.png` },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center" style={{ transform: s.featured ? 'scale(1.08)' : 'scale(0.92)' }}>
                <PhoneDevice src={s.src} small />
                <span className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* HOW IT WORKS */}
        <Section bg="alt" id="how-it-works">
          <SectionHead eyebrow={t.steps.badge} titlePre={t.steps.titlePre} titleAccent={t.steps.titleAccent} />
          <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-3">
            {t.steps.items.map((s, i) => (
              <React.Fragment key={i}>
                <div className="bg-white rounded-3xl p-7 flex-1 max-w-sm mx-auto md:mx-0 relative" style={{ boxShadow: '0 4px 20px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
                  <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ background: '#4f46e5', boxShadow: '0 4px 12px rgba(79,70,229,.3)' }}>{i + 1}</div>
                  <span className="block text-4xl mb-4 mt-2">{s.emoji}</span>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2.5">{s.title}</h3>
                  <p className="text-sm text-slate-500" style={{ lineHeight: 1.65 }}>{s.desc}</p>
                </div>
                {i < t.steps.items.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-slate-300 text-2xl px-1">
                    <i className="fa-solid fa-chevron-right"></i>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </Section>

        {/* WHY KOINY */}
        <Section bg="white" id="why">
          <SectionHead eyebrow={t.why.badge} titlePre={t.why.titlePre} titleAccent={t.why.titleAccent} desc={t.why.desc} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.why.items.map((w, i) => (
              <div key={i} className="rounded-2xl p-7 bg-white transition-all hover:-translate-y-1" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid #e2e8f0' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-2xl" style={{ background: w.bg }}>
                  {w.emoji}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2.5">{w.title}</h3>
                <p className="text-sm text-slate-500" style={{ lineHeight: 1.65 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* PRICING */}
        <Section bg="alt" id="pricing">
          <SectionHead eyebrow={t.price.badge} titlePre={t.price.titlePre} titleAccent={t.price.titleAccent} desc={t.price.desc} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-3xl p-8 relative" style={{ boxShadow: '0 4px 20px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">{t.price.free.name}</div>
              <div className="text-4xl font-black text-slate-900 mb-1">{t.price.free.price}</div>
              <div className="text-sm text-slate-500 font-medium">{t.price.free.period}</div>
              <div className="my-6 h-px bg-slate-200"></div>
              <ul className="space-y-3 mb-8">
                {t.price.free.f.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700"><i className="fa-solid fa-check text-emerald-500 text-xs"></i>{f}</li>
                ))}
                {t.price.free.muted.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-400"><i className="fa-solid fa-xmark text-xs"></i>{f}</li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3.5 rounded-xl font-bold text-sm text-slate-900 transition-all hover:bg-slate-100" style={{ background: '#f1f5f9' }}>
                {t.price.free.cta}
              </button>
            </div>

            {/* Premium */}
            <div className="rounded-3xl p-8 relative text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)', boxShadow: '0 20px 60px rgba(79,70,229,.35)' }}>
              <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: 'rgba(255,255,255,.25)', backdropFilter: 'blur(8px)' }}>{t.price.prem.badge}</div>
              <div className="text-sm font-bold uppercase tracking-widest text-indigo-100 mb-2">{t.price.prem.name}</div>
              <div className="text-4xl font-black mb-1">{t.price.prem.price}</div>
              <div className="text-sm text-indigo-100 font-medium">{t.price.prem.period}</div>
              <div className="my-6 h-px bg-white/20"></div>
              <ul className="space-y-3 mb-8">
                {t.price.prem.f.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm"><i className="fa-solid fa-check text-white text-xs"></i>{f}</li>
                ))}
              </ul>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3.5 rounded-xl font-bold text-sm text-indigo-700 transition-all hover:-translate-y-0.5" style={{ background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
                {t.price.prem.cta}
              </a>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6 max-w-2xl mx-auto" style={{ lineHeight: 1.6 }}>{t.price.disclaimer}</p>
        </Section>

        {/* CTA DOWNLOAD */}
        <section
          className="relative py-20 px-6 text-center overflow-hidden"
          id="download"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(168,85,247,.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(99,102,241,.4) 0%, transparent 50%)' }}></div>
          <div className="relative max-w-3xl mx-auto">
            <h2 className="font-black text-white mb-5" style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.15, letterSpacing: '-1px' }}>{t.cta.title}</h2>
            <p className="text-lg text-indigo-100 mb-10 max-w-xl mx-auto" style={{ lineHeight: 1.6 }}>{t.cta.sub}</p>

            <div className="flex justify-center mb-8">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-105">
                <img src={APP_STORE_BADGE[language]} alt="Download on the App Store" style={{ height: '56px' }} />
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
              {t.cta.f.map((f, i) => (
                <div key={i} className="inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                  <i className="fa-solid fa-check text-xs" style={{ color: '#86efac' }}></i>
                  {f}
                </div>
              ))}
            </div>

            <button onClick={() => { window.dispatchEvent(new CustomEvent('openLegalModal')); }} className="text-xs font-medium text-white/60 hover:text-white/90 underline underline-offset-2 transition-colors">
              {t.cta.privacy}
            </button>

            <p className="text-sm text-white/50 mt-8"><i className="fa-solid fa-mobile-screen mr-2"></i>{t.cta.note}</p>
            <p className="text-xs text-white/35 mt-1.5">{t.cta.age}</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-50 py-16 px-6 border-t border-slate-100">
          <div className="max-w-[1100px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl overflow-hidden">
                    <img src="/mascot.png" alt="Koiny" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-lg font-black tracking-tight text-slate-900">Koiny</span>
                </div>
                <p className="text-sm text-slate-500 mb-5 max-w-xs" style={{ lineHeight: 1.6 }}>{t.footer.desc}</p>
                <div className="inline-flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', lineHeight: 1.5 }}>
                  <span>{t.footer.disclaimer}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-900 mb-4">{t.footer.h1}</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => window.dispatchEvent(new CustomEvent('openLegalModal'))} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">{t.footer.privacy}</button></li>
                  <li><button onClick={() => window.dispatchEvent(new CustomEvent('openLegalModal'))} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">{t.footer.terms}</button></li>
                  <li><a href="mailto:hello@koiny.app" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-900 mb-4">{t.footer.h2}</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => scrollTo('features')} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.features}</button></li>
                  <li><button onClick={() => scrollTo('how-it-works')} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.how}</button></li>
                  <li><button onClick={() => scrollTo('pricing')} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.pricing}</button></li>
                  <li><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">{t.nav.download}</a></li>
                </ul>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <p>&copy; 2026 Koiny — Andre Nsangou. {t.footer.rights}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const Section: React.FC<{ id?: string; bg: 'white' | 'alt'; children: React.ReactNode }> = ({ id, bg, children }) => (
  <section id={id} className="py-20 px-6" style={{ background: bg === 'alt' ? '#f8fafc' : '#ffffff' }}>
    <div className="max-w-[1100px] mx-auto">{children}</div>
  </section>
);

const SectionHead: React.FC<{ eyebrow: string; titlePre: string; titleAccent: string; desc?: string }> = ({ eyebrow, titlePre, titleAccent, desc }) => (
  <div className="text-center mb-14">
    <span className="inline-block text-xs font-extrabold uppercase tracking-widest mb-4" style={{ color: '#4f46e5' }}>{eyebrow}</span>
    <h2 className="font-black text-slate-900 mb-4" style={{ fontSize: 'clamp(1.8rem, 3.8vw, 2.6rem)', lineHeight: 1.2, letterSpacing: '-0.8px' }}>
      {titlePre}<span style={{ color: '#4f46e5' }}>{titleAccent}</span>
    </h2>
    {desc && <p className="text-base text-slate-500 max-w-2xl mx-auto" style={{ lineHeight: 1.6 }}>{desc}</p>}
  </div>
);

const PhoneDevice: React.FC<{ src: string; small?: boolean }> = ({ src, small }) => (
  <div
    className="relative"
    style={{
      width: small ? '220px' : '260px',
      height: small ? '450px' : '530px',
      background: '#0f172a',
      borderRadius: small ? '38px' : '44px',
      padding: '12px',
      boxShadow: '0 32px 80px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.1)',
      overflow: 'hidden',
    }}
  >
    {/* notch */}
    <div className="absolute z-[2]" style={{ top: '14px', left: '50%', transform: 'translateX(-50%)', width: '90px', height: '24px', background: '#0f172a', borderRadius: '0 0 18px 18px' }}></div>
    <div className="w-full h-full overflow-hidden bg-white" style={{ borderRadius: small ? '28px' : '34px' }}>
      <img src={src} alt="App preview" className="w-full h-full" style={{ objectFit: 'cover', objectPosition: 'top' }} />
    </div>
  </div>
);

const FloatCard: React.FC<{
  pos: { top?: string; right?: string; bottom?: string; left?: string };
  bg: string; emoji: string; subtitle: string; value: string; valueColor: string; delay: number;
}> = ({ pos, bg, emoji, subtitle, value, valueColor, delay }) => (
  <div
    className="absolute float-anim hidden md:flex items-center gap-2"
    style={{
      ...pos,
      background: '#ffffff',
      borderRadius: '14px',
      padding: '10px 14px',
      boxShadow: '0 20px 60px rgba(0,0,0,.1), 0 8px 24px rgba(0,0,0,.06)',
      animationDelay: `${delay}s`,
      zIndex: 5,
    }}
  >
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: bg }}>{emoji}</div>
    <div>
      <div className="text-[11px] font-medium" style={{ color: '#64748b' }}>{subtitle}</div>
      <div className="text-sm font-extrabold" style={{ color: valueColor }}>{value}</div>
    </div>
  </div>
);

export default LandingView;
