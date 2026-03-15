export const APPLE_SIZES = {
  '6.9': { width: 1320, height: 2868 },
  '6.5': { width: 1284, height: 2778 },
  '6.3': { width: 1206, height: 2622 },
  '6.1': { width: 1125, height: 2436 },
} as const;

export type AppleSize = keyof typeof APPLE_SIZES;

export const COLORS = {
  primary: '#3730A3',    // indigo-700
  secondary: '#60A5FA',  // blue-400
  accent: '#F97316',     // orange
  white: '#FFFFFF',
  darkGray: '#1F2937',
  lightGray: '#F3F4F6',
};

export const LANGUAGES = ['fr', 'nl', 'en'] as const;
export type Language = typeof LANGUAGES[number];

export const SLIDES = [1, 2, 3, 4, 5, 6] as const;
export type SlideNumber = typeof SLIDES[number];

export interface SlideProps {
  language: Language;
  width: number;
  height: number;
}
