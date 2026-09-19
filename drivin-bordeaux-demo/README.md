# Driv'in Bordeaux — Démo « La e-Concession »

Maquette privée de refonte pour Driv'in La e-Concession (Bordeaux /
Blanquefort), pensée pour une présentation commerciale : effet « wow »
immédiat (hero 3D, préloader, storytelling au scroll), fluidité soignée,
et une architecture déjà prête pour une vraie mise en production.

> **Cette démo est strictement privée et non contractuelle.** Elle est
> protégée par mot de passe, bloquée à l'indexation (`noindex`), et affiche
> un bandeau permanent le rappelant. Voir `TODO-DEMO.md` pour tout ce qui
> est provisoire, et `CREDITS.md` pour les crédits tiers.

## Stack

Next.js 16 (App Router) + TypeScript strict, Tailwind CSS v4, Three.js via
React Three Fiber + drei, GSAP (ScrollTrigger), Lenis (smooth scroll),
Motion pour les transitions de composants.

## Installation

```bash
pnpm install
cp .env.example .env.local
# éditer .env.local : définir DEMO_PASSWORD
pnpm dev
```

Le site est servi sur `http://localhost:3000`. Vous serez redirigé vers
`/entree` tant que le mot de passe défini dans `DEMO_PASSWORD` n'est pas
saisi (cookie valable 7 jours).

## Scripts

```bash
pnpm dev      # développement (Turbopack)
pnpm build    # build de production
pnpm start    # sert le build de production
pnpm lint     # ESLint
```

## Structure du projet

```
app/                   Routes (App Router) : accueil, /annonces, /annonces/[slug], /contact, /entree
components/
  home/                 Preloader, storytelling au scroll, sections de l'accueil
  three/                Scène 3D (Canvas R3F, modèle de voiture procédural)
  vehicles/             Cartes, filtres, galerie, fiche technique
  layout/               Header, Footer, bandeau de démo
  ui/                    Smooth scroll, curseur personnalisé, reveal au scroll
data/                   vehicles.json (10 annonces réelles), company.ts (coordonnées, horaires, services)
lib/                    Accès aux données véhicules, formatage, interrupteur démo/prod
proxy.ts                Protection par mot de passe (remplace `middleware.ts` sous Next 16)
```

## Remplacer le modèle 3D

Le hero utilise actuellement une supercar **procédurale** (générée en code,
pas de fichier GLB) dans `components/three/CarModel.tsx` — voir
`CREDITS.md` pour le détail et la justification de ce choix.

Pour utiliser un vrai modèle du véhicule phare du client :

1. Préparez un fichier `.glb` compressé (Draco ou Meshopt, textures
   KTX2/WebP, idéalement < 3 Mo) avec [`gltf-transform`](https://gltf-transform.dev/) :
   ```bash
   npx @gltf-transform/cli optimize modele-source.glb public/models/car.glb
   ```
2. Placez-le dans `public/models/car.glb`.
3. Dans `components/three/Scene.tsx`, remplacez `<CarModel ... />` par un
   composant utilisant `useGLTF("/models/car.glb")` de `@react-three/drei`
   (le hook gère automatiquement le cache et le `Suspense`).
4. Ajustez la position/l'échelle/la rotation dans le même fichier, puis
   mettez à jour `CREDITS.md` avec la licence et l'origine du modèle.

Le reste du système (éclairage studio procédural, ombre de contact,
rotation au scroll, réaction à la souris, repli sans WebGL/`saveData`/
`prefers-reduced-motion`) fonctionne sans modification.

## Ajouter les photos des véhicules

Aucune photo n'est fournie dans cette démo (visuels de repli générés,
marqués « [DÉMO] »). Pour ajouter de vraies photos :

1. Créez un dossier par annonce, nommé avec le `slug` exact de
   `data/vehicles.json` :
   ```
   public/vehicles/<slug>/01.jpg
   public/vehicles/<slug>/02.jpg
   ```
2. Mettez à jour `components/vehicles/VehicleCard.tsx` et
   `components/vehicles/Gallery.tsx` pour utiliser `next/image` avec ces
   chemins (au lieu du dégradé de repli), avec un texte alternatif
   descriptif pour chaque image.

Voir aussi `public/vehicles/README.md`.

## Changer le mot de passe de la démo

Le mot de passe est lu côté serveur uniquement (`DEMO_PASSWORD`), jamais
exposé au client. Pour le changer :

1. Modifiez `DEMO_PASSWORD` dans `.env.local` (dev) ou dans les variables
   d'environnement de votre hébergeur (production).
2. Redémarrez le serveur — aucune autre modification n'est nécessaire
   (le cookie d'accès existant devient invalide automatiquement, un
   nouveau mot de passe est requis).

## Passer du mode démo au mode production

Un seul interrupteur : `NEXT_PUBLIC_DEMO_MODE`.

| Valeur | Comportement |
|---|---|
| `true` (défaut) | Mot de passe actif, `noindex`/`nofollow` partout, bandeau « maquette non contractuelle » visible, `robots.txt` bloque tout, pas de JSON-LD, pas de sitemap. |
| `false` | Mot de passe désactivé, indexation autorisée, bandeau retiré, JSON-LD (AutoDealer, BreadcrumbList, Vehicle+Offer) actifs, `sitemap.xml` généré. |

Pour passer en production :

```bash
# .env.local ou variables d'environnement de l'hébergeur
NEXT_PUBLIC_DEMO_MODE=false
```

Puis rebuild + redeploy. **Aucune autre modification de code n'est
nécessaire** — c'est précisément l'argument commercial du brief : le
passage en production est immédiat.

Pensez alors à :
- Remplacer les coordonnées de démonstration (téléphone, e-mail) par les
  vraies coordonnées du client (voir `TODO-DEMO.md`).
- Ajouter les vraies photos (voir ci-dessus).
- Définir `NEXT_PUBLIC_SITE_URL` (utilisé par le `sitemap.xml` et les URLs
  canoniques) avec le vrai domaine.
- Brancher les formulaires (actuellement factices, voir `TODO-DEMO.md`) à
  un vrai service d'envoi si souhaité.

## Déploiement privé

Ce projet nécessite un runtime serveur (le mot de passe est appliqué par
`proxy.ts`, une fonctionnalité serveur) : il n'est **pas** exporté en
statique (`output: 'export'`), contrairement à ce qui était envisagé au
départ — l'export statique est incompatible avec la protection par mot de
passe. Un déploiement Vercel ou Netlify standard (build Next.js par défaut)
fonctionne directement et reste très simple à mettre en place.

1. Déployez sur Vercel/Netlify comme un projet Next.js standard.
2. Définissez les variables d'environnement `DEMO_PASSWORD` et
   `NEXT_PUBLIC_DEMO_MODE=true` dans les réglages du projet.
3. Partagez l'URL et le mot de passe uniquement avec les personnes
   concernées — le site reste bloqué à l'indexation tant que le mode démo
   est actif.

## Performance et comparatif

Voir `COMPARATIF.md` pour les scores Lighthouse mesurés (mobile et
desktop) sur cette démo, ainsi que les instructions pour mesurer le site
actuel et compléter le comparatif avant/après (non mesurable depuis
l'environnement de développement utilisé pour cette session, pour des
raisons de politique réseau — voir ce fichier pour le détail).

## Captures d'écran

Voir le dossier `screenshots/` (hero, liste des annonces, fiche véhicule).
