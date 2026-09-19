# TODO-DEMO — éléments provisoires

Cette démo est volontairement construite avec des placeholders clairement
identifiés, pour ne jamais faire passer un élément non fourni pour une
donnée réelle. Voici la liste exhaustive de ce qui est provisoire.

## Visuels

- **Aucune photo de véhicule** n'a été fournie. Toutes les cartes et fiches
  affichent un visuel de repli généré (dégradé sombre + initiales de la
  marque), marqué visuellement « [DÉMO] visuel » / « [DÉMO] <angle> ».
  → Voir `public/vehicles/README.md` pour la procédure d'ajout des vraies
  photos.
- **Modèle 3D du hero** : supercar procédurale (primitives Three.js —
  boîtes, cylindres, tores), pas un modèle GLB réel de véhicule. Isolée
  dans `components/three/CarModel.tsx` pour un remplacement facile par un
  GLB fourni par le client. Voir `CREDITS.md`.
- **Carte de la page Contact** : encart statique « [DÉMO] Carte », aucune
  requête vers un service cartographique tiers (respect de la consigne
  « aucun script tiers »).

## Coordonnées

- Téléphone (`05 00 00 00 00`) et e-mail (`contact@exemple-demo.fr`)
  affichés dans l'en-tête et la page Contact sont des **valeurs neutres de
  démonstration**, non cliquables, sans action réelle. À remplacer par les
  vraies coordonnées du client avant toute mise en ligne.

## Formulaires

- Le formulaire de contact (`/contact`) et les boutons « Être rappelé » /
  « Demander un essai » (fiches véhicule) sont **100 % factices** : aucun
  appel réseau, aucune collecte, aucune donnée conservée. Ils affichent
  uniquement un message de confirmation « [DÉMO] ... simulé ».

## Accès et indexation

- Mot de passe de démo (`DEMO_PASSWORD`), bandeau de non-contractualité et
  `noindex` sont actifs tant que `NEXT_PUBLIC_DEMO_MODE` vaut `true` (valeur
  par défaut). Voir le README, section « Passer en production ».

## Contenu éditorial

- Les textes de storytelling (accueil), les points forts des 8 véhicules
  en « fiche allégée » (tout sauf Porsche 911 Carrera 4S et Alpine A110 R)
  ne contiennent **aucune option inventée** : seules les caractéristiques
  fournies (prix, kilométrage, puissance, boîte, énergie, couleur, 0-100)
  sont affichées.
- La section « Déjà vendus » n'affiche que les 4 noms de modèles fournis,
  sans prix ni détail (aucune donnée supplémentaire disponible).

## Périmètre non couvert par cette démo

- Pas de compte client, pas d'espace professionnel, pas de moteur de
  recherche multi-critères avancé au-delà des 4 filtres demandés.
- Pas de vraies données analytics ni de cookies tiers (volontairement,
  garde-fou de confidentialité de la démo).
