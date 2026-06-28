# Site language switcher

_Started 2026-05-11 20:51 UTC_

---

## User



## Assistant

_[tool: list_files]_

_[tool: update_todos]_

_[tool: view_image]_

_[tool: list_files]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Premium Koiny landing page is live at **Koiny Landing.html**. The redesign covers all 9 sections from your spec:

- **Sticky glass nav** with indigo CTA pill
- **Hero**: deep indigo gradient with floating blob shapes, gold-accent gradient on "éduque", iPhone mockup showing Léo's dashboard (balance 12,50 €, Lego Star Wars goal at 75%, mission cards) with three floating notification cards
- **Pain points**: 3 cards with indigo left-accent border
- **Features**: 3×2 grid with indigo icon tiles
- **How it works**: 3 numbered steps with dotted connector and mini app-UI previews
- **Trust**: 3×2 grid on soft slate
- **Pricing**: Free + Premium side-by-side; Premium uses indigo gradient with amber glow, recommended badge, and glassmorphism
- **Final CTA**: full indigo gradient with both store badges, large format
- **Footer**: dark indigo-black with all links

Both App Store and Google Play badges appear in the hero AND final CTA, linking to the URLs you provided. Reveal-on-scroll animations and smooth anchor nav are wired up.

## User

normalement le site est trilingue fr nl et en on pouvait changer de langue

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: run_script]_

I'll add a trilingual language switcher (FR/NL/EN) by injecting translation hooks and a dictionary. Doing this via a script for clean batch edits.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

All hooks placed. Now I'll add the language switcher UI and the translation dictionary + script.

_[tool: done]_

_[tool: fork_verifier_agent]_

Langue ajoutée — switcher **FR / EN / NL** dans le header (segmented control à droite du bouton Télécharger).

- Tout le contenu visible est traduit dans les 3 langues (nav, hero, mockup iPhone, pain points, fonctionnalités, étapes, trust, pricing, CTA final, footer)
- Le choix est sauvegardé dans `localStorage` et la langue par défaut suit celle du navigateur
- L'attribut `<html lang>` se met à jour à chaque switch (SEO / accessibilité)

## User

Verifier agent check completed

## Assistant

Parfait, le switcher fonctionne dans les trois langues. ✅

## User

pour quoi je ne vois pas ceci sur le site?

## Assistant

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

Bonne remarque — cette section "Aperçu" avec les 3 mockups (Espace parents / Espace enfant / Missions) n'avait pas été reportée dans la refonte. Je vais l'ajouter. Laissez-moi voir les autres screenshots dans uploads pour identifier des écrans réels à utiliser.

_[tool: list_files]_

_[tool: image_metadata]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: copy_files]_

_[tool: list_files]_

_[tool: copy_files]_

_[tool: copy_files]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: str_replace_edit]_

