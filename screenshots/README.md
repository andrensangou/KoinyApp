# Koiny App Store Screenshots Generator

Generate premium App Store screenshots for Koiny in 3 languages (FR/NL/EN) and 4 Apple resolutions.

## 🚀 Quick Start

```bash
npm run dev
# Open http://localhost:3000
```

## 📱 Features

- **6 Marketing Slides**: Wallet, Missions, Goals, Parent Dashboard, Duo App, CTA
- **3 Languages**: French, Dutch, English
- **4 Resolutions**: 6.9" (1320×2868), 6.5" (1284×2778), 6.3" (1206×2622), 6.1" (1125×2436)
- **Live Preview**: See changes instantly
- **Export to PNG**: Download current slide or batch export

## 📸 Screenshots Overview

| Slide | Title | Feature |
|---|---|---|
| 1 | Ma Fortune 💰 | Child's wallet with balance |
| 2 | Missions Gamifiées 🎯 | Gamified tasks with rewards |
| 3 | Objectifs d'Épargne 🎁 | Savings goals with progress bars |
| 4 | Dashboard Parent 📊 | Parent control dashboard |
| 5 | Une App pour Toute la Famille 👨‍👩‍👧‍👦 | Parent & child unified interface |
| 6 | Commencez Gratuitement 🚀 | CTA with premium pricing |

## 🎨 Design System

- **Primary Color**: `#3730A3` (Indigo)
- **Secondary Color**: `#60A5FA` (Blue)
- **Accent Color**: `#F97316` (Orange)
- **Font**: Poppins (Google Fonts)
- **Style**: Playful, colorful, child-friendly gradient backgrounds

## 🛠️ How to Use

1. **Start dev server**: `npm run dev`
2. **Select Language**: FR, NL, EN (top-left dropdown)
3. **Select Slide**: Choose slide 1-6 (top-middle dropdown)
4. **Select Size**: Choose iPhone size (top-right dropdown)
5. **Preview**: See live preview below
6. **Export**: Click "Export" button to download PNG

## 📦 Batch Export

For exporting all 72 screenshots (6 slides × 3 languages × 4 sizes):

Option 1: Export manually one by one
Option 2: Setup server-side rendering (see `/app/api/export/route.ts`)

## 📁 Project Structure

```
screenshots/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main UI with controls
│   ├── globals.css             # Global styles
│   └── api/
│       └── export/route.ts      # API route for batch export
├── components/
│   ├── IPhoneMockup.tsx         # iPhone frame component
│   ├── SlideLayout.tsx          # Base slide layout
│   ├── ScreenshotCanvas.tsx     # Canvas wrapper for export
│   └── slides/
│       ├── Slide1Wallet.tsx
│       ├── Slide2Missions.tsx
│       ├── Slide3Goals.tsx
│       ├── Slide4ParentDash.tsx
│       ├── Slide5Duo.tsx
│       └── Slide6CTA.tsx
├── data/
│   ├── config.ts               # Sizes, colors, types
│   └── translations.ts         # Multi-language text
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🔧 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 📤 Upload to App Store

1. Download all 72 screenshots
2. Go to App Store Connect → Your App → App Preview and Screenshots
3. Select the appropriate device (iPhone Pro Max, iPhone 15, etc.)
4. Upload screenshots for each language (FR, NL, EN)
5. Ensure proper order (slide 1-6)

## ✅ Checklist Before Upload

- [ ] All 6 slides previewed
- [ ] Text legible in thumbnail size
- [ ] Colors match brand guidelines
- [ ] Screenshots cover key features
- [ ] Language-specific translations correct
- [ ] No typos or formatting issues
- [ ] All 4 sizes tested

## 🐛 Troubleshooting

**Export not working?**
- Check browser console for errors
- Ensure adequate memory (large images ~15MB)
- Try smaller size first

**Preview blank?**
- Refresh page
- Check that slide component is rendering
- Check browser DevTools for React errors

## 📝 Notes

- Uses `html-to-image` for PNG export (client-side)
- Tailwind CSS v4 with `@tailwindcss/postcss`
- Next.js 16 with App Router
- TypeScript strict mode

## 📄 License

MIT
