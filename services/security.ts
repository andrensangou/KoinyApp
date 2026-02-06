
/**
 * Service de Sécurité Renforcé v2.1
 * Note: Pour une véritable sécurité, le code PIN ne devrait jamais être stocké de manière réversible.
 * Cependant, pour maintenir la compatibilité synchrone avec l'architecture actuelle (localStorage),
 * nous utilisons une obfuscation renforcée.
 */

const SECRET_SALT = (import.meta as any).env?.VITE_KIDBANK_SALT || "koiny_default_salt_change_me_in_env";

const getDeviceKey = (): string => {
  if (typeof navigator === 'undefined') return "default_key";

  // Utilisation de facteurs STABLES pour permettre le fonctionnement cross-device
  // On ne dépend plus du UserAgent ou de la langue qui changent d'un appareil à l'autre
  const factors = [
    "koiny_universal_key_v1",
    SECRET_SALT
  ];

  // Simple hash FNV-1a pour générer une clé déterministe
  let hash = 0x811c9dc5;
  const str = factors.join('|');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
};

/**
 * Obfuscation améliorée (Vigenère + Base64 custom)
 * Ce n'est PAS du chiffrement militaire, mais empêche la lecture claire simple.
 */
export const encryptAtRest = (text: string | null): string | null => {
  if (!text) return null;
  const key = getDeviceKey();
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = (text.charCodeAt(i) + key.charCodeAt(i % key.length)) % 65535;
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
};

/**
 * Dé-obfuscation
 */
export const decryptAtRest = (encoded: string | null): string | null => {
  if (!encoded) return null;
  try {
    const key = getDeviceKey();
    const text = atob(encoded);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = (text.charCodeAt(i) - key.charCodeAt(i % key.length) + 65535) % 65535;
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Failed to decrypt data", e);
    return null;
  }
};
