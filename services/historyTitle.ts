import { Language } from '../types';

/**
 * Le titre "Solde reporté" (créé par handleClearHistory) est stocké dans la langue
 * du moment. Pour qu'il s'affiche TOUJOURS dans la langue du lecteur (parent/enfant,
 * iOS/Android), on le re-traduit à l'affichage. Détecte les 3 variantes stockées.
 */
const isCarry = (t: string): boolean => {
  const s = (t || '').toLowerCase();
  return s.includes('solde reporté') || s.includes('balance carried') || s.includes('saldo overgedragen');
};

export const carryTitle = (title: string, language: Language): string =>
  isCarry(title)
    ? (language === 'nl' ? 'Saldo overgedragen' : language === 'en' ? 'Balance carried forward' : 'Solde reporté')
    : title;
