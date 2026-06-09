import { GlobalState, Language } from '../types';

/**
 * Calcule le texte du rappel hebdo "rolling" en fonction du DERNIER profil ouvert
 * (parent ou enfant via localStorage) et de l'état des données. Retourne {title, body}
 * passés à notifications.scheduleWeeklyReminder. Fallback générique si rien de pertinent.
 */
export interface ReminderText { title: string; body: string; }

const pick = (lang: Language, fr: string, nl: string, en: string): string =>
  lang === 'nl' ? nl : lang === 'en' ? en : fr;

export function getContextualReminder(
  data: GlobalState,
  fallback: ReminderText,
): ReminderText {
  const lang: Language = (data.language as Language) || 'fr';
  let lastView: string | null = null;
  let lastChildId: string | null = null;
  try {
    lastView = localStorage.getItem('koiny_last_view');
    lastChildId = localStorage.getItem('koiny_last_child_id');
  } catch { /* localStorage indispo : on retombe sur le parent */ }

  // ── Profil ENFANT en dernier ──────────────────────────────────────────────
  if (lastView === 'CHILD' && lastChildId) {
    const child = data.children.find(c => c.id === lastChildId);
    if (child) {
      const pending = child.missions.filter(m => m.status === 'PENDING').length;
      const active = child.missions.filter(m => m.status === 'ACTIVE').length;

      // Mission terminée en attente de validation parent → rappeler de la montrer
      if (pending > 0) {
        return {
          title: pick(lang, 'Bravo ! 🎉', 'Goed gedaan! 🎉', 'Well done! 🎉'),
          body: pick(lang,
            'Montre ta mission terminée à tes parents pour la valider !',
            'Laat je voltooide missie aan je ouders zien om te bevestigen!',
            'Show your completed mission to your parents to get it approved!'),
        };
      }
      // Aucune mission active → inviter à en demander une
      if (active === 0) {
        return {
          title: pick(lang, 'Envie de gagner ? 💰', 'Zin om te verdienen? 💰', 'Want to earn? 💰'),
          body: pick(lang,
            'Tu n\'as pas de mission. Demandes-en une à tes parents !',
            'Je hebt geen missie. Vraag er een aan je ouders!',
            'You have no mission. Ask your parents for one!'),
        };
      }
      // Missions actives à faire
      return {
        title: pick(lang, 'Tes missions t\'attendent ⭐', 'Je missies wachten ⭐', 'Your missions await ⭐'),
        body: pick(lang,
          'Termine tes missions pour gagner de l\'argent de poche !',
          'Voltooi je missies om zakgeld te verdienen!',
          'Complete your missions to earn pocket money!'),
      };
    }
  }

  // ── Profil PARENT (défaut) ────────────────────────────────────────────────
  const totalPending = data.children.reduce(
    (a, c) => a + c.missions.filter(m => m.status === 'PENDING').length, 0);
  if (totalPending > 0) {
    return {
      title: pick(lang, 'Missions à valider ⭐', 'Missies te bevestigen ⭐', 'Missions to approve ⭐'),
      body: pick(lang,
        `${totalPending} mission${totalPending > 1 ? 's' : ''} attend${totalPending > 1 ? 'ent' : ''} ta validation.`,
        `${totalPending} missie${totalPending > 1 ? 's' : ''} wacht${totalPending > 1 ? 'en' : ''} op je goedkeuring.`,
        `${totalPending} mission${totalPending > 1 ? 's' : ''} waiting for your approval.`),
    };
  }

  // Un enfant a atteint un objectif (goal actif au montant cible)
  const childWithGoal = data.children.find(c =>
    (c.goals || []).some(g => g.status === 'ACTIVE' && c.balance >= (g.target || Infinity)));
  if (childWithGoal) {
    const name = (childWithGoal.name || '').trim();
    return {
      title: pick(lang, 'Objectif atteint 🎯', 'Doel bereikt 🎯', 'Goal reached 🎯'),
      body: pick(lang,
        `${name} a atteint son objectif ! Aide-le à choisir sa récompense.`,
        `${name} heeft zijn doel bereikt! Help bij het kiezen van de beloning.`,
        `${name} reached their goal! Help them pick their reward.`),
    };
  }

  // Demandes en attente (mission/cadeau)
  const anyRequest = data.children.some(c => c.missionRequested || c.giftRequested);
  if (anyRequest) {
    return {
      title: pick(lang, 'Une demande t\'attend 💬', 'Een aanvraag wacht 💬', 'A request awaits 💬'),
      body: pick(lang,
        'Un de tes enfants a fait une demande. Va voir !',
        'Een van je kinderen heeft een aanvraag gedaan. Ga kijken!',
        'One of your children made a request. Take a look!'),
    };
  }

  // Rien de spécial → message générique fourni par l'appelant
  return fallback;
}
