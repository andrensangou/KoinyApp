# Remotion + Claude Code — Guide complet

## C'est quoi Remotion ?

Remotion est un framework React pour créer des vidéos programmatiquement.
Tu écris des composants React normaux, et Remotion les rend frame par frame via Chrome headless → MP4.

**Cas d'usage pour Koiny :**
- Vidéo promo App Store / Google Play
- Reels Instagram / TikTok animés
- Démos animées de l'app

---

## C'est quoi les Agent Skills ?

Les **Agent Skills** sont un format ouvert (créé par Anthropic, adopté par +30 outils) pour donner de nouvelles capacités aux agents IA.

Un skill = un dossier avec un fichier `SKILL.md` qui contient :
- Des métadonnées (frontmatter YAML)
- Des instructions pour l'agent (Markdown)

Claude Code lit automatiquement les skills dans `.agents/skills/` au démarrage.

**Remotion maintient un skill officiel** avec +38 règles sur les APIs Remotion (animations, audio, fonts, transitions, 3D, etc.).

---

## Installation — Nouveau projet Remotion

```bash
# Créer un projet Remotion avec le skill inclus
npx create-video@latest

# Pendant le setup, choisir :
# ✅ Blank template
# ✅ TailwindCSS
# ✅ Install Skills package
```

Ou manuellement dans un projet existant :

```bash
npx skills add remotion-dev/skills
```

Cela installe le skill dans `.agents/skills/remotion/` avec tous les fichiers de règles.

---

## Utilisation avec Claude Code

### 1. Démarrer le serveur de preview

```bash
cd my-video
npm install
npm run dev   # Lance Remotion Studio sur http://localhost:3000
```

### 2. Ouvrir Claude Code dans un second terminal

```bash
cd my-video
claude        # Claude Code détecte automatiquement le skill Remotion
```

### 3. Prompter en langage naturel

Claude Code charge le skill Remotion et comprend toutes les APIs. Exemples de prompts :

```
Create a 10-second intro animation for Koiny app with the indigo gradient 
background and the logo appearing with a spring animation
```

```
Make a 30-second promo video showing the parent dashboard, then the child view, 
with smooth transitions between screens
```

```
Create a bar chart animation showing savings growth over 12 months, 
with each bar animating in sequence using useCurrentFrame()
```

```
Add a text animation where "Koiny" appears letter by letter with a 
typewriter effect over 60 frames
```

### 4. Vérifier un frame avant de rendre toute la vidéo

Claude peut rendre un frame spécifique pour vérifier layout/couleurs :

```
Render frame 30 to check the layout looks correct
```

### 5. Rendre la vidéo finale

```bash
npx remotion render MyComposition out/video.mp4

# Ou avec des paramètres :
npx remotion render MyComposition out/video.mp4 --width=1080 --height=1920  # Portrait (Reel)
npx remotion render MyComposition out/video.mp4 --width=1920 --height=1080  # Paysage
```

---

## Structure du skill Remotion

Le skill officiel couvre 38 domaines :

| Domaine | Fichier de règles |
|---|---|
| Animations spring/interpolate | `animations.md` |
| Audio + visualisation | `audio.md`, `audio-visualization.md` |
| Fonts Google/custom | `fonts.md` |
| Compositions et durées | `compositions.md`, `timing.md` |
| Transitions entre scènes | `transitions.md` |
| Vidéos embarquées | `videos.md` |
| Images et GIFs | `images.md`, `gifs.md` |
| Texte animé | `text-animations.md` |
| Graphiques / charts | `charts.md` |
| 3D (Three.js) | `3d.md` |
| Sous-titres / captions | `subtitles.md`, `display-captions.md` |
| Tailwind CSS | `tailwind.md` |
| Paramètres dynamiques | `parameters.md` |
| Séquençage | `sequencing.md` |
| Maps / cartes | `maps.md` |
| Lottie animations | `lottie.md` |
| FFmpeg avancé | `ffmpeg.md` |
| Voix off | `voiceover.md` |
| Effets sonores | `sfx.md` |
| Vidéos transparentes | `transparent-videos.md` |

---

## Créer son propre skill (format Agent Skills)

Structure minimale :

```
.agents/skills/mon-skill/
├── SKILL.md        # Obligatoire
├── scripts/        # Optionnel : scripts exécutables
├── references/     # Optionnel : docs supplémentaires
└── assets/         # Optionnel : templates, images
```

Format du `SKILL.md` :

```markdown
---
name: mon-skill
description: Ce que fait le skill et quand l'utiliser. Max 1024 chars.
license: MIT
metadata:
  author: andre
  version: "1.0"
---

## Instructions

Étape 1 : ...
Étape 2 : ...

## Exemples

...
```

**Règles du champ `name` :**
- Minuscules, chiffres, tirets uniquement
- 1-64 caractères
- Doit correspondre au nom du dossier parent

---

## Exemples de projets créés avec Remotion + Claude Code

Via la galerie [remotion.dev/prompts](https://www.remotion.dev/prompts) :

- News article headline highlight
- Travel Route on Map avec landmarks 3D
- Product Demo animée
- Launch Video for X/Twitter
- Rocket Launches Timeline
- Cinematic Tech Intro
- Three.js Bar Chart "Top 20 Games"
- Promotion video (Reel format)

---

## Ressources

- **Galerie de prompts** : https://www.remotion.dev/prompts
- **Doc Claude Code + Remotion** : https://www.remotion.dev/docs/ai/claude-code
- **Agent Skills spec** : https://agentskills.io/specification
- **GitHub skills** : https://github.com/remotion-dev/remotion/tree/main/packages/skills
- **Remotion Studio** : http://localhost:3000 (pendant `npm run dev`)
