# Photos véhicules

Aucune photo n'est fournie dans cette démo : les fiches et cartes affichent
un visuel de repli généré (dégradé + badge « [DÉMO] »), jamais de fausse
photo.

Pour ajouter de vraies photos plus tard, créez un dossier par annonce en
utilisant le `slug` exact de `data/vehicles.json`, par exemple :

```
public/vehicles/Porsche-911-Carrera-4S-992-450-Interieur-Gris/01.jpg
public/vehicles/Porsche-911-Carrera-4S-992-450-Interieur-Gris/02.jpg
```

Puis mettez à jour `components/vehicles/Gallery.tsx` et `VehicleCard.tsx`
pour utiliser `next/image` avec ces chemins au lieu du visuel de repli.
Voir le README principal, section « Ajouter les photos ».
