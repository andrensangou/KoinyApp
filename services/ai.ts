
/**
 * Service AI désactivé pour corriger les erreurs de déploiement.
 * Les avatars utilisent désormais uniquement DiceBear (Seed).
 */

export const generateAiAvatar = async (description: string): Promise<string> => {
  console.warn("La génération d'avatar IA est désactivée.");
  return ""; 
};
