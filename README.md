# Épistellaire — Hélène Lagnieu

Livre numérique construit avec Three.js, Vite, Lucide et Sharp. Les neuf numérisations de la maquette sont conservées entières et dans leur ordre d’origine.

## Lecture

- À l’arrivée : découverte du livre en volume, puis ouverture. « Passer à la lecture » et Échap interrompent l’introduction. La préférence de réduction des mouvements est respectée.
- Glisser horizontalement : le papier suit le mouvement. Un geste court revient en place ; un geste ample ou rapide tourne la page.
- Flèches gauche/droite, Début/Fin : navigation. Les boutons restent disponibles sur téléphone.
- « Regarder de près » ou double-clic : numérisation originale, zoom jusqu’à 500 %, déplacement et pincement à deux doigts. Les touches +, − et 0 contrôlent le zoom.
- « Les planches » : accès direct aux neuf images. « Livre seul » : lecture agrandie sans en-tête. « Plein écran » : immersion si le navigateur le permet.
- Sans WebGL : lecture des images avec navigation et détails, sans animation.

Liens directs : `?page=4` ouvre la quatrième image, `?last=1` la dernière. L’ouverture initiale sans lien direct montre la couverture, puis la première planche.

## Installation et construction

Node.js 22.12+ ou 24+, npm.

```sh
npm ci
npm run prepare:assets
npm run dev
```

```sh
npm run build
npm run check
npm run preview
```

`prepare:assets` génère les WebP de lecture, les miniatures et les copies originales à partir de `pages.json` et `assets/pages/`. Le logo autonome est conservé dans `public/identity/`. Les originaux ne sont ni retouchés, ni recadrés. Le contrôle compare leurs empreintes SHA-256.

`src/book.js` contient le modèle, la courbure du papier et le ressort amorti. `src/main.js` gère les gestes, la navigation et les détails. Le rendu est effectué à la demande, sans boucle permanente au repos ; la définition du rendu est limitée à deux fois la résolution de l’écran.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` construit et contrôle le projet, puis publie `dist/`. La source de Pages doit être **GitHub Actions** dans les réglages du dépôt. Les chemins relatifs de Vite permettent un hébergement sous `/epistellaire/`.

## Fidélité documentaire

Source : [maquette ZhuGG/epistellaire](https://github.com/ZhuGG/epistellaire), consultée le 14 octobre 2026. L’attribution à Hélène Lagnieu est communiquée par l’utilisateur. La couverture porte « Cartes Postales » ; Épistellaire désigne ici la présentation numérique.

La reliure, l’épaisseur et les versos neutres constituent une scénographie virtuelle, pas une reconstitution mesurée de l’objet. Le titre définitif, la date, la technique et les crédits de numérisation restent à compléter avec l’artiste. La publication de cette version sur GitHub Pages a été demandée par l’utilisateur le 14 octobre 2026 ; elle ne vaut pas validation générale des informations encore manquantes.

Références techniques : [Three.js](https://threejs.org/docs/), [Vite](https://vite.dev/guide/).
