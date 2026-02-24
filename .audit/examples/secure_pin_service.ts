/**
 * 🔒 SERVICE DE SÉCURITÉ PIN - VERSION SÉCURISÉE
 * 
 * Remplace services/security.ts avec un vrai chiffrement PBKDF2
 * 
 * @author Antigravity Agent
 * @date 2026-02-10
 * @version 2.0.0-secure
 */

import { pbkdf2Sync, randomBytes } from 'crypto';

// Configuration sécurisée
const PBKDF2_ITERATIONS = 100000; // Recommandation OWASP 2024
const HASH_LENGTH = 64; // 512 bits
const SALT_LENGTH = 16; // 128 bits
const HASH_ALGORITHM = 'sha512';

/**
 * Hache un code PIN avec PBKDF2
 * 
 * @param pin - Code PIN en clair (4-6 chiffres)
 * @returns Hash au format "salt:hash" (hex)
 * 
 * @example
 * const hash = hashPin('1234');
 * // Retourne: "a1b2c3d4....:e5f6g7h8...."
 */
export const hashPin = (pin: string): string => {
  // Validation
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error('PIN must be 4-6 digits');
  }
  
  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only digits');
  }
  
  // Génération du salt aléatoire
  const salt = randomBytes(SALT_LENGTH);
  
  // Dérivation de clé avec PBKDF2
  const hash = pbkdf2Sync(
    pin,
    salt,
    PBKDF2_ITERATIONS,
    HASH_LENGTH,
    HASH_ALGORITHM
  );
  
  // Format: "salt:hash" (hex)
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
};

/**
 * Vérifie un code PIN contre un hash stocké
 * 
 * @param pin - Code PIN en clair à vérifier
 * @param storedHash - Hash stocké au format "salt:hash"
 * @returns true si le PIN correspond, false sinon
 * 
 * @example
 * const isValid = verifyPin('1234', storedHash);
 * if (isValid) {
 *   console.log('Accès autorisé');
 * }
 */
export const verifyPin = (pin: string, storedHash: string): boolean => {
  try {
    // Validation
    if (!pin || !storedHash) {
      return false;
    }
    
    // Extraction du salt et du hash
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      console.error('Invalid hash format');
      return false;
    }
    
    const [saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    
    // Vérification de la longueur du salt
    if (salt.length !== SALT_LENGTH) {
      console.error('Invalid salt length');
      return false;
    }
    
    // Re-calcul du hash avec le même salt
    const pinHash = pbkdf2Sync(
      pin,
      salt,
      PBKDF2_ITERATIONS,
      HASH_LENGTH,
      HASH_ALGORITHM
    );
    
    // Comparaison sécurisée (timing-safe)
    return timingSafeEqual(
      Buffer.from(hashHex, 'hex'),
      pinHash
    );
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
};

/**
 * Comparaison sécurisée contre les attaques par timing
 * 
 * @param a - Premier buffer
 * @param b - Second buffer
 * @returns true si identiques, false sinon
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Génère un PIN aléatoire sécurisé
 * 
 * @param length - Longueur du PIN (4-6)
 * @returns PIN aléatoire
 * 
 * @example
 * const randomPin = generateSecurePin(4);
 * // Retourne: "7392" (aléatoire)
 */
export const generateSecurePin = (length: number = 4): string => {
  if (length < 4 || length > 6) {
    throw new Error('PIN length must be between 4 and 6');
  }
  
  const bytes = randomBytes(length);
  let pin = '';
  
  for (let i = 0; i < length; i++) {
    // Conversion en chiffre 0-9
    pin += (bytes[i] % 10).toString();
  }
  
  return pin;
};

/**
 * Vérifie la force d'un PIN
 * 
 * @param pin - PIN à vérifier
 * @returns Score de force (0-100)
 * 
 * @example
 * const strength = checkPinStrength('1234');
 * // Retourne: 20 (faible - séquence)
 */
export const checkPinStrength = (pin: string): number => {
  let score = 50; // Score de base
  
  // Pénalités
  if (pin === '0000' || pin === '1234' || pin === '4321') {
    score -= 40; // PINs très communs
  }
  
  // Vérifier les répétitions
  if (/^(\d)\1+$/.test(pin)) {
    score -= 30; // Tous les chiffres identiques (1111, 2222, etc.)
  }
  
  // Vérifier les séquences
  if (isSequence(pin)) {
    score -= 20; // Séquences (1234, 5678, etc.)
  }
  
  // Bonus pour la longueur
  if (pin.length >= 6) {
    score += 20;
  }
  
  // Bonus pour la diversité des chiffres
  const uniqueDigits = new Set(pin.split('')).size;
  score += (uniqueDigits - 1) * 5;
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Vérifie si un PIN est une séquence
 */
function isSequence(pin: string): boolean {
  const digits = pin.split('').map(Number);
  
  // Séquence croissante
  let isAscending = true;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] + 1) {
      isAscending = false;
      break;
    }
  }
  
  // Séquence décroissante
  let isDescending = true;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] - 1) {
      isDescending = false;
      break;
    }
  }
  
  return isAscending || isDescending;
}

/**
 * Migration des anciens PINs obfusqués vers PBKDF2
 * 
 * @param obfuscatedPin - PIN obfusqué (ancien système)
 * @returns Hash PBKDF2 (nouveau système)
 * 
 * @deprecated À utiliser uniquement pour la migration
 */
export const migrateObfuscatedPin = (obfuscatedPin: string): string | null => {
  try {
    // Importer l'ancienne fonction de déchiffrement
    // (Temporairement, pour la migration uniquement)
    const { decryptAtRest } = require('../security-old');
    
    const clearPin = decryptAtRest(obfuscatedPin);
    
    if (!clearPin) {
      console.error('Failed to decrypt old PIN');
      return null;
    }
    
    // Créer un nouveau hash PBKDF2
    return hashPin(clearPin);
  } catch (error) {
    console.error('Migration failed:', error);
    return null;
  }
};

// Export des constantes pour les tests
export const SECURITY_CONFIG = {
  PBKDF2_ITERATIONS,
  HASH_LENGTH,
  SALT_LENGTH,
  HASH_ALGORITHM
} as const;
