# Comparatif de performance

## ⚠️ Limite de mesure importante

Cette session de développement s'est exécutée dans un environnement cloud
dont l'accès réseau sortant est restreint par une politique d'organisation :
le domaine public `www.drivinbordeaux.fr` était **bloqué par le proxy
sortant** (`CONNECT tunnel failed, response 403`), aussi bien en HTTPS qu'en
HTTP. Il n'a donc **pas été possible de mesurer le site actuel** depuis cet
environnement, et conformément à la consigne du brief, **aucun chiffre non
mesuré n'est présenté ici** pour le site actuel.

Seuls des chiffres réellement mesurés sur la démo (build de production,
en local, sur cette machine) figurent ci-dessous. La colonne « Site actuel »
reste à compléter par vous-même avec les commandes fournies en bas de page
(2 minutes, à faire une fois avec une connexion internet normale).

## Contexte de mesure (démo)

- Outil : Lighthouse 13.5 (moteur du Chrome DevTools), exécuté en CLI/Node.
- Navigateur : Chromium headless pré-installé de l'environnement (rendu
  logiciel, sans accélération GPU matérielle — les métriques de performance
  peuvent donc être légèrement pessimistes par rapport à un poste réel avec
  GPU).
- Cible : build de production (`pnpm build && pnpm start`) servi en local
  (`http://localhost:3411`), mot de passe de démo désactivé pour la mesure
  (aucun impact sur le rendu des pages).
- Presets : « mobile » (throttling Lighthouse par défaut, CPU x4, réseau
  4G lente simulée) et « desktop » (sans throttling réseau, CPU natif).
- Date de mesure : voir `fetchTime` dans les rapports bruts, conservés dans
  ce dossier pour audit (`*.json` si vous relancez `run-lighthouse` — ces
  fichiers ne sont pas commités par défaut, voir note en fin de document).

## Résultats mesurés — Démo (mode démo actif, `noindex`)

### Mobile

| Page | Performance | Accessibilité | Bonnes pratiques | SEO¹ | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Accueil (`/`) | 94 | 100 | 100 | 66 | 2,58 s | 0.003 | 167 ms |
| Annonces (`/annonces`) | 96 | 100 | 100 | 66 | 2,69 s | 0 | 70 ms |
| Fiche véhicule | 97 | 100 | 100 | 66 | 2,53 s | 0 | 26 ms |

### Desktop (Accueil)

| Performance | Accessibilité | Bonnes pratiques | SEO¹ | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| 99 | 100 | 100 | 66 | 0,61 s | 0.002 | 3 ms |

¹ Le score SEO de 66 vient **uniquement** de l'audit « Page is blocked from
indexing » (`is-crawlable`), qui sanctionne le `noindex` volontaire de la
démo privée — c'est le comportement recherché ici (voir garde-fous). Aucun
autre audit SEO n'échoue.

### Preuve : SEO = 100 une fois `NEXT_PUBLIC_DEMO_MODE=false`

Pour vérifier que le `noindex` est bien la seule cause, et que le site est
réellement prêt pour la mise en ligne, un rebuild avec
`NEXT_PUBLIC_DEMO_MODE=false` (sans changer une ligne de code) donne, sur
l'accueil, en mobile :

| Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|
| 94 | 100 | 100 | **100** |

## Poids de page et requêtes (mobile, démo)

| Page | Poids total | Requêtes |
|---|---|---|
| Accueil | 651 Ko | 24 |
| Annonces | 380 Ko | 21 |
| Fiche véhicule | 380 Ko | 21 |

Le budget JS initial (hors chunk 3D chargé en différé) respecte l'objectif
de 170 Ko gzip fixé dans le brief ; le chunk Three.js/R3F/GSAP ne se charge
qu'après hydratation, via `next/dynamic({ ssr: false })`, et jamais sur
mobile bas de gamme, `saveData` actif ou navigateur sans WebGL (repli
silencieux vers le poster CSS, voir `components/three/HeroCanvas.tsx`).

## Comment mesurer le site actuel (à faire avec un accès internet normal)

Avec Chrome installé et Node.js disponible :

```bash
npx lighthouse https://www.drivinbordeaux.fr/ \
  --preset=perf --form-factor=mobile --screenEmulation.mobile \
  --output=json --output-path=./avant-mobile.json --only-categories=performance,accessibility,best-practices,seo

npx lighthouse https://www.drivinbordeaux.fr/ \
  --preset=desktop \
  --output=json --output-path=./avant-desktop.json --only-categories=performance,accessibility,best-practices,seo
```

Ou directement depuis Chrome DevTools → onglet « Lighthouse » → cocher les
4 catégories → « Analyze page load », en mode navigation privée pour éviter
les extensions.

Reportez ensuite les scores et métriques (LCP, CLS, TBT/INP, poids de page,
nombre de requêtes) dans le tableau « Site actuel » de ce document pour
obtenir le comparatif avant/après complet à présenter au dirigeant.

## Pour reproduire les mesures de la démo

```bash
pnpm install
pnpm build
pnpm start -p 3411 &

npx lighthouse http://localhost:3411/ --preset=perf --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility,best-practices,seo
npx lighthouse http://localhost:3411/ --preset=desktop --only-categories=performance,accessibility,best-practices,seo
```

(Le mot de passe de démo bloque l'accès direct : soit définissez
`DEMO_PASSWORD` vide dans `.env.local` le temps de la mesure, soit passez
l'en-tête `Cookie` avec le jeton attendu — voir `proxy.ts`.)
