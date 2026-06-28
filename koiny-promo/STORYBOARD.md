# STORYBOARD.md — Koiny Promo 20s

## Global Layout
- Canvas: 1080 × 1920px
- BG: `#0f0a2e` (deep indigo-black)
- Radial glows for depth (indigo + orange at 15% opacity)
- Font: Inter via Google Fonts

---

## Scene 1 — Logo Reveal (0s → 2s) [Track 1]

```
┌─────────────────────────────┐
│                             │
│                             │
│         [GLOW BG]           │
│                             │
│       ┌───────────┐         │
│       │  LOGO.PNG │         │  ← scale 60→100%, fade in (1s)
│       └───────────┘         │
│                             │
│  L'argent de poche qui      │  ← fade in at 0.8s
│  éduque vraiment            │
│                             │
│                             │
└─────────────────────────────┘
```

**Animations**:
- t=0: logo opacity 0, scale 0.6
- t=0→1s: logo opacity → 1, scale → 1 (ease out)
- t=0.8s: tagline fades in
- t=2s: scene fades to black (0.3s)

---

## Scene 2A — Pain Point (2s → 6s) [Track 2]

```
┌─────────────────────────────┐
│                             │
│                             │
│  LES PARENTS SE             │  ← orange eyebrow, uppercase
│  RECONNAISSENT              │
│                             │
│  "Il réclame de l'argent…   │  ← white headline, 64px, bold
│  sans avoir rien fait."     │
│                             │
│  ┌──────────────────────┐   │
│  │ "Elle dépense tout." │   │  ← glass card, staggered
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │"Je ne sais pas ce    │   │  ← glass card, staggered
│  │ que je lui ai donné" │   │
│  └──────────────────────┘   │
│                             │
└─────────────────────────────┘
```

**Animations**:
- t=2s: eyebrow slides up from bottom
- t=2.3s: headline fades in
- t=3s: card 1 slides in from left
- t=3.5s: card 2 slides in from left
- t=5.7s: fade out

---

## Scene 2B — Features (6s → 13s) [Track 3]

```
┌─────────────────────────────┐
│                             │
│  LA SOLUTION                │  ← orange eyebrow
│                             │
│  Missions.                  │  ← white, 72px, 900 weight
│  Épargne.                   │
│  Contrôle.                  │
│                             │
│  ┌───────────────────────┐  │
│  │  [PHONE FRAME]        │  │  ← dashboard-enfant.png, slides from right
│  │  dashboard-enfant.png │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  🎯 Missions personnalisées │  ← pill, staggered
│  🏦 Objectifs d'épargne    │  ← pill
│  🔒 Contrôle parental      │  ← pill
│                             │
└─────────────────────────────┘
```

**Animations**:
- t=6s: eyebrow fades in
- t=6.3s: headline words stagger in (Missions → Épargne → Contrôle), each 0.3s
- t=7.5s: phone slides in from right (translateX 150→0, 0.6s ease out)
- t=8.5s: pill 1 fades in (translateY 20→0)
- t=9s: pill 2 fades in
- t=9.5s: pill 3 fades in
- t=12.7s: fade out

---

## Scene 2C — Screenshots (13s → 16s) [Track 4]

```
┌─────────────────────────────┐
│                             │
│  Simple pour les enfants.   │  ← white, 52px
│  Puissant pour les parents. │  ← muted, 32px
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │ PARENT   │ │MISSIONS  │  │  ← two phones side by side
│  │ DASH     │ │  VIEW    │  │     slide from bottom
│  │          │ │          │  │
│  └──────────┘ └──────────┘  │
│                             │
└─────────────────────────────┘
```

**Animations**:
- t=13s: headline fades in
- t=13.3s: both phones slide up from bottom (translateY 80→0, stagger 0.2s)
- t=15.7s: fade out

---

## Scene 3 — CTA (16s → 20s) [Track 5]

```
┌─────────────────────────────┐
│                             │
│       [LOGO small]          │  ← top center, fade in
│                             │
│  GRATUIT À TÉLÉCHARGER      │  ← orange eyebrow
│                             │
│  Lancez-vous                │  ← white, 76px, 900
│  dès aujourd'hui            │
│                             │
│  ┌───────────────────────┐  │
│  │   [App Store Badge]   │  │  ← fr-fr.jpg, scale in
│  └───────────────────────┘  │
│                             │
│       koiny.app             │  ← white, 28px, muted
│                             │
└─────────────────────────────┘
```

**Animations**:
- t=16s: logo fades in (small, top)
- t=16.3s: eyebrow slides up
- t=16.6s: headline fades in
- t=17.2s: App Store badge scales in (0.8→1, ease out)
- t=17.8s: URL fades in
- t=20s: hold (no exit — final scene)

---

## Transition Strategy
- Scene 1→2: black cross-fade (0.3s overlay div opacity 0→1→0)
- Scene 2A→2B: same
- Scene 2B→2C: same
- Scene 2C→3: same
- All transitions on a dedicated overlay div (z-index above scenes)
