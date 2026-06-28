## Overview
Koiny is a clean, modern family-SaaS app. Light backgrounds, large bold Inter headings, indigo (#4F46E5) as the dominant brand color, orange (#FF7A30) as action accent. For the 9:16 social video, we invert to a deep indigo-black background so the app screenshots pop. The tone is warm but confident — serious enough for parents, fun enough to evoke kids.

## Colors
- **Background**: `#0f0a2e` — deep indigo-black, video-native dark canvas
- **Primary**: `#5B5FE8` — indigo brand (user-specified, close to site's #4F46E5)
- **Accent**: `#FF7A30` — orange, CTAs and highlights
- **White**: `#FFFFFF` — headlines and key text
- **Muted**: `rgba(255,255,255,0.55)` — subtext, secondary copy
- **Card bg**: `rgba(255,255,255,0.07)` — subtle glass cards on dark bg

## Typography
- **Primary**: Inter (300–900). The site's font — built into HyperFrames.
- **Headlines**: Inter 900, 64-88px, white
- **Subheads**: Inter 700, 34-42px, white
- **Body**: Inter 400, 24-28px, muted white
- **Labels/eyebrows**: Inter 600, 18-22px, uppercase, letter-spacing 4px, accent orange

## Elevation
Dark background + radial glows (indigo and orange at 15-25% opacity) create depth without gradients. App screenshots use a CSS phone frame with white border + shadow. Cards use rgba white at 7-10% with 1px rgba(255,255,255,0.12) border.

## Components
- **Logo mark**: circle (gradient indigo) + "K" letter (white 900) + "Koiny" text (indigo 900)
- **Feature pill**: icon emoji + h3 bold + p light, fade-in staggered
- **Phone mockup**: CSS rounded-[48px] black frame, screenshot inside, subtle drop shadow
- **CTA button**: orange bg, white bold text, 28px border-radius, glow shadow

## Do's and Don'ts
### Do's
- Use real captured screenshots (dashboard-enfant.png, mission.png) in phone frames
- Keep all text white/muted on dark bg — high contrast
- Stagger feature entrances left-to-right or bottom-to-top
- Orange only for CTAs and accent elements — not headlines

### Don'ts
- No white backgrounds (this is a dark social video)
- No gradient text (house-style anti-pattern)
- No more than 2 elements entering simultaneously
