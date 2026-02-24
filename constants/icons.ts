
export const ICON_MAP: Record<string, string> = {
    // Missions
    'star': 'fa-solid fa-star',
    'rocket': 'fa-solid fa-rocket',
    'broom': 'fa-solid fa-broom',
    'utensils': 'fa-solid fa-utensils',
    'book': 'fa-solid fa-book',
    'dog': 'fa-solid fa-dog',
    'trash': 'fa-solid fa-trash-can',
    'shirt': 'fa-solid fa-shirt',
    'bed': 'fa-solid fa-bed',
    'bike': 'fa-solid fa-person-biking',

    // Objectifs / Goals
    'trophy': 'fa-solid fa-trophy',
    'bullseye': 'fa-solid fa-bullseye',
    'gift': 'fa-solid fa-bullseye', // Changé de fa-gift à fa-bullseye pour cohérence globale
    'gamepad': 'fa-solid fa-gamepad',
    'plane': 'fa-solid fa-plane',
    'cart': 'fa-solid fa-cart-shopping',
    'music': 'fa-solid fa-music',
    'futbol': 'fa-solid fa-futbol',
    'wand': 'fa-solid fa-wand-magic-sparkles',
    'gavel': 'fa-solid fa-gavel',

    // Fallbacks par contexte
    'icon_star': 'fa-solid fa-star',   // compat supabase existant
    'icon_gift': 'fa-solid fa-gift',   // compat supabase existant
};

export function getIcon(iconId?: string | null, fallback = 'fa-solid fa-star'): string {
    if (!iconId) return fallback;
    return ICON_MAP[iconId] ?? iconId; // si c'est déjà une classe FA complète, on la retourne telle quelle
}
