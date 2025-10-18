# Flipbook StPageFlip — Starter GitHub Pages

Un mini-site **100% statique** prêt pour GitHub Pages, pour feuilleter un livre d’illustrations et **ajouter une page chaque jour** via un simple commit.

## 🚀 Déploiement rapide (GitHub Pages)
1. Créez un nouveau repo sur GitHub (ou utilisez-en un).
2. Ajoutez ces fichiers à la racine du repo (ou dans `/docs` si vous préférez publier depuis un dossier docs).
3. Activez **Settings → Pages** : Source = **Deploy from a branch** (branche `main`, dossier `/root` ou `/docs`).
4. Ouvrez l’URL fournie par GitHub Pages.

## 🗂️ Structure
```
.
├─ index.html          # La visionneuse (StPageFlip via CDN)
├─ pages.json          # La liste des pages (à mettre à jour)
└─ assets/
   └─ pages/
      ├─ 001.svg
      ├─ 002.svg
      └─ 003.svg      # Exemples — remplacez par vos images (JPG/PNG/SVG)
```

## ✏️ Mise à jour quotidienne
- Déposez l’image du jour dans `assets/pages/` (ex. `004.jpg`).
- Ajoutez une ligne à `pages.json` :
```json
{ "src": "assets/pages/004.jpg", "title": "Jour 3" }
```
- Commit & push → c’est en ligne.
- Astuce : ajoutez `?last=1` à l’URL pour atterrir automatiquement sur la **dernière page** (nouveauté du jour).

## 🧩 Astuces & variantes
- **Taille & zoom** : ajustez `width/height` dans `index.html` (`new PageFlip(...)`) ou utilisez les boutons `＋`/`－`.
- **Accessibilité** : chaque page a un `alt` (repris du `title` si présent). Soignez ce champ dans `pages.json`.
- **SEO** : la `<title>` et la meta `description` sont dans `<head>`.
- **Tri** : gardez un nommage avec zéros (`001.jpg`, `002.jpg`, …) pour rester dans l’ordre.
- **Couverture** : laissez `showCover: true` et mettez la couverture en premier (`001.*`).

## 🛠️ Personnalisation légère
- Styles : directement dans `index.html` → `<style>…</style>`.
- Contrôles : ajoutez des boutons (plein écran, téléchargement, etc.).
- Contenu mixte : vous pouvez aussi mettre du texte HTML dans une page si besoin (remplacez l’`<img>`).

## ❓Dépannage
- *Rien ne s’affiche* : ouvrez la console du navigateur (F12) → erreurs de chemin (sensible à la casse) ?
- *CORS sur images* : hébergez **toutes** les images dans le repo (même domaine que la page).
- *Cache* : `fetch('pages.json', {cache: 'no-store'})` minimise les surprises, mais un hard refresh peut aider (Ctrl/Cmd+Shift+R).

Bon projet ! 🎨📖
