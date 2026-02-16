#!/usr/bin/env python3
"""Synchronise pages.json and inline fallback data in index.html from assets/pages/."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT / "assets" / "pages"
PAGES_JSON = ROOT / "pages.json"
INDEX_HTML = ROOT / "index.html"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg", ".avif"}
EXTENSION_PRIORITY = {
    ".jpg": 0,
    ".jpeg": 1,
    ".png": 2,
    ".webp": 3,
    ".avif": 4,
    ".svg": 5,
}

INLINE_START = "  <!-- PAGES_DATA_START -->"
INLINE_END = "  <!-- PAGES_DATA_END -->"


def sort_key(path: Path):
    parts = re.split(r"(\d+)", path.name.lower())
    key = []
    for part in parts:
        key.append(int(part) if part.isdigit() else part)
    return key


def load_existing_titles() -> dict[str, str]:
    if not PAGES_JSON.exists():
        return {}

    try:
        data = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    titles = {}
    for entry in data:
        src = entry.get("src")
        title = entry.get("title")
        if isinstance(src, str) and isinstance(title, str) and title.strip():
            titles[src] = title.strip()
    return titles


def default_title(index: int, stem: str) -> str:
    if index == 0:
        return "Couverture"

    label = stem.replace("_", " ").replace("-", " ").strip()
    if label:
        return label.title()
    return f"Planche {index:02d}"


def build_manifest() -> list[dict[str, str]]:
    titles_by_src = load_existing_titles()
    images = [
        path
        for path in ASSETS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]

    deduplicated_by_stem: dict[str, Path] = {}
    for image in images:
        existing = deduplicated_by_stem.get(image.stem)
        if not existing:
            deduplicated_by_stem[image.stem] = image
            continue

        image_priority = EXTENSION_PRIORITY.get(image.suffix.lower(), 999)
        existing_priority = EXTENSION_PRIORITY.get(existing.suffix.lower(), 999)
        if image_priority < existing_priority:
            deduplicated_by_stem[image.stem] = image

    images = sorted(deduplicated_by_stem.values(), key=sort_key)

    manifest: list[dict[str, str]] = []
    for index, image in enumerate(images):
        rel_src = image.relative_to(ROOT).as_posix()
        manifest.append(
            {
                "src": rel_src,
                "title": titles_by_src.get(rel_src, default_title(index, image.stem)),
            }
        )
    return manifest


def update_index_html(manifest: list[dict[str, str]]):
    html = INDEX_HTML.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"{re.escape(INLINE_START)}.*?{re.escape(INLINE_END)}",
        re.DOTALL,
    )

    replacement = (
        f"{INLINE_START}\n"
        '  <script type="application/json" id="pagesData">\n'
        f"{json.dumps(manifest, ensure_ascii=False, indent=2)}\n"
        "  </script>\n"
        f"{INLINE_END}"
    )

    if not pattern.search(html):
        raise RuntimeError("Impossible de trouver les marqueurs PAGES_DATA dans index.html")

    INDEX_HTML.write_text(pattern.sub(replacement, html), encoding="utf-8")


def main():
    if not ASSETS_DIR.exists():
        raise RuntimeError(f"Dossier introuvable: {ASSETS_DIR}")

    manifest = build_manifest()
    PAGES_JSON.write_text(f"{json.dumps(manifest, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
    update_index_html(manifest)
    print(f"Manifest synchronisé avec {len(manifest)} page(s).")


if __name__ == "__main__":
    main()
