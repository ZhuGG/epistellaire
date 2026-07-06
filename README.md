# Epistellaire

Epistellaire est une galerie web pensee pour presenter une oeuvre illustree sous forme de livre numerique. La V1 met l'oeuvre au centre: une interface sombre, precise et volontairement sobre encadre les planches sans ajouter d'image d'arriere-plan.

## V1 livrable

- Visionneuse immersive avec effet de page via `page-flip`.
- Interface responsive pour desktop, tablette et mobile.
- Navigation premiere page, precedente, suivante, derniere page.
- Curseur de progression, etat de page, plein ecran et telechargement de la planche courante.
- Icones vectorielles via `lucide`.
- Build moderne avec `vite`, pret pour GitHub Pages.
- Apercu social base sur la couverture de l'oeuvre.

## Developpement

```bash
npm install
npm run dev
```

Pour produire une version statique:

```bash
npm run build
npm run preview
```

## Structure

```text
.
|-- index.html
|-- package.json
|-- vite.config.js
|-- pages.json
|-- src/
|   `-- main.js
|-- assets/
|   `-- pages/
|       |-- 001.jpg
|       |-- 002.jpg
|       `-- ...
`-- scripts/
    `-- sync_pages_manifest.py
```

## Ajouter ou remplacer des pages

1. Deposer les images dans `assets/pages/`.
2. Garder une numerotation stable, par exemple `001.jpg`, `002.jpg`, `010.jpg`.
3. Synchroniser le manifeste:

```bash
npm run sync:pages
```

Le script met a jour `pages.json` et les donnees integrees dans `index.html`.

## Publication GitHub Pages

Le workflow `.github/workflows/pages.yml` installe les dependances, construit le site avec Vite, puis publie le dossier `dist` sur GitHub Pages.

L'URL peut recevoir `?last=1` pour ouvrir directement la derniere planche.
