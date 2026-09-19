# Crédits

## Modèle 3D du hero

Aucun modèle GLB externe n'est utilisé. Le véhicule visible dans le hero et
le storytelling au scroll est une **supercar stylisée entièrement
procédurale**, construite en JSX avec des primitives Three.js / drei
(`RoundedBox`, `Cylinder`, `Torus`) dans `components/three/CarModel.tsx`.
Ce choix évite toute question de licence sur un modèle tiers et garde le
poids de page minimal (aucun fichier binaire à télécharger).

C'est un **placeholder assumé** : pour la mise en production, remplacez ce
composant par le rendu d'un vrai modèle GLB du véhicule phare du client
(compressé Draco/Meshopt, < 3 Mo), chargé via `useGLTF` de `@react-three/drei`.
Voir le README, section « Remplacer le modèle 3D ».

## Environnement / éclairage 3D

L'environnement de reflets (`StudioEnvironment` dans
`components/three/Scene.tsx`) est généré à 100 % localement avec des
`Lightformer` de `@react-three/drei` (aucun fichier `.hdr` téléchargé).
Ce choix a été fait délibérément après avoir constaté qu'un
`<Environment preset="..."/>` de drei télécharge un fichier HDRI depuis un
CDN public à l'exécution : une dépendance réseau externe est incompatible
avec une démo strictement privée et peut échouer selon la politique réseau
de l'hébergeur.

## Polices

- **Syne** (titres) et **Inter** (texte courant), Google Fonts, licence
  SIL Open Font License. Chargées via `next/font/google`, qui les
  télécharge une fois au build et les sert en auto-hébergement (aucune
  requête vers Google au runtime), avec `font-display: swap`.

## Bibliothèques tierces principales

- Next.js (App Router), React, TypeScript — Vercel / Meta, MIT.
- Tailwind CSS — Tailwind Labs, MIT.
- Three.js, @react-three/fiber, @react-three/drei — MIT.
- GSAP (dont ScrollTrigger) — Webflow/GreenSock, licence standard GSAP
  (gratuite pour cet usage ; vérifier les conditions GreenSock avant un
  usage commercial élargi).
- Lenis (smooth scroll) — Studio Freight, MIT.
- Motion (`motion/react`, ex-Framer Motion) — MIT.

## Visuels de repli

Les cartes et galeries véhicules affichent des dégradés générés en CSS
(aucune image), marqués « [DÉMO] » — voir `TODO-DEMO.md`.
