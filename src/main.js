import { PageFlip } from 'page-flip';
import { createIcons, icons } from 'lucide';

const pageIndicator = document.getElementById('pageIndicator');
const pageTitle = document.getElementById('pageTitle');
const folioTitle = document.getElementById('folioTitle');
const folioSubtitle = document.getElementById('folioSubtitle');
const pageScrubber = document.getElementById('pageScrubber');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const loadingNote = document.getElementById('loadingNote');
const navButtons = Array.from(document.querySelectorAll('[data-action]'));
const flipbookEl = document.getElementById('flipbook');
const fallbackGallery = document.getElementById('fallbackGallery');
const readerPanel = document.getElementById('readerPanel');
const downloadLink = document.getElementById('downloadLink');

let pages = [];
let pageFlip;
let fallbackIndex = 0;

const inlinePages = (() => {
  const dataEl = document.getElementById('pagesData');
  if (!dataEl) return [];
  try {
    return JSON.parse(dataEl.textContent);
  } catch {
    return [];
  }
})();

const loadPages = async () => {
  if (location.protocol === 'file:' && inlinePages.length) return inlinePages;
  try {
    const response = await fetch('pages.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unexpected response (${response.status})`);
    return await response.json();
  } catch {
    return inlinePages;
  }
};

const requestedLastPage = () => new URLSearchParams(location.search).get('last') === '1';
const currentIndex = () => pageFlip ? pageFlip.getCurrentPageIndex() : fallbackIndex;
const clampIndex = (index) => Math.min(Math.max(index, 0), Math.max(pages.length - 1, 0));

const preloadNear = (index) => {
  [index - 1, index + 1].forEach((candidate) => {
    const page = pages[candidate];
    if (!page) return;
    const image = new Image();
    image.src = page.src;
  });
};

const updateIndicators = () => {
  const index = clampIndex(currentIndex());
  const current = index + 1;
  const total = pages.length || 1;
  const meta = pages[index] || {};
  const title = meta.title || 'Sans titre';

  pageIndicator.textContent = `Page ${current} / ${total}`;
  pageTitle.textContent = title;
  folioTitle.textContent = title;
  folioSubtitle.textContent = `Page ${current} sur ${total}`;
  statusText.textContent = `${total} planches pretes`;
  pageScrubber.max = String(total);
  pageScrubber.value = String(current);
  progressBar.style.width = `${(current / total) * 100}%`;
  downloadLink.href = meta.src || '#';
  downloadLink.setAttribute('download', meta.src ? meta.src.split('/').pop() : 'epistellaire-page');

  navButtons.forEach((button) => {
    const action = button.dataset.action;
    if (action === 'first' || action === 'prev') button.disabled = index <= 0;
    if (action === 'next' || action === 'last') button.disabled = index >= total - 1;
  });

  preloadNear(index);
};

const createPageNode = (page) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-item';
  const img = document.createElement('img');
  img.src = page.src;
  img.alt = page.title || '';
  img.loading = 'eager';
  wrapper.appendChild(img);
  return wrapper;
};

const createFallback = () => {
  fallbackGallery.replaceChildren();
  pages.forEach((page) => {
    const img = document.createElement('img');
    img.src = page.src;
    img.alt = page.title || '';
    fallbackGallery.appendChild(img);
  });
  flipbookEl.style.display = 'none';
  fallbackGallery.classList.add('is-visible');
};

const turnTo = (index) => {
  const target = clampIndex(index);
  if (pageFlip) {
    pageFlip.turnToPage(target);
  } else {
    fallbackIndex = target;
    const slide = fallbackGallery.children[target];
    if (slide) slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateIndicators();
  }
};

const initFlipbook = () => {
  pageFlip = new PageFlip(flipbookEl, {
    width: 1260,
    height: 900,
    size: 'stretch',
    minWidth: 300,
    maxWidth: 1700,
    minHeight: 220,
    maxHeight: 1100,
    maxShadowOpacity: 0.28,
    showCover: true,
    mobileScrollSupport: true,
    usePortrait: true,
    drawShadow: true,
    flippingTime: 780
  });

  pageFlip.loadFromHTML(pages.map(createPageNode));
  pageFlip.on('flip', updateIndicators);
};

const bindControls = () => {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const index = currentIndex();
      if (button.dataset.action === 'first') turnTo(0);
      if (button.dataset.action === 'prev') turnTo(index - 1);
      if (button.dataset.action === 'next') turnTo(index + 1);
      if (button.dataset.action === 'last') turnTo(pages.length - 1);
      if (button.dataset.action === 'fullscreen') {
        if (!document.fullscreenElement) readerPanel.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    });
  });

  pageScrubber.addEventListener('input', (event) => {
    turnTo(Number(event.target.value) - 1);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') turnTo(currentIndex() - 1);
    if (event.key === 'ArrowRight') turnTo(currentIndex() + 1);
    if (event.key === 'Home') turnTo(0);
    if (event.key === 'End') turnTo(pages.length - 1);
  });
};

const init = async () => {
  createIcons({ icons });

  pages = await loadPages();
  if (!pages.length) {
    statusText.textContent = 'Aucune page disponible';
    loadingNote.textContent = 'Pages indisponibles.';
    return;
  }

  pageScrubber.max = String(pages.length);

  try {
    initFlipbook();
  } catch (error) {
    console.warn('Flipbook unavailable, using gallery fallback.', error);
    createFallback();
    statusText.textContent = 'Mode galerie active';
  }

  bindControls();
  loadingNote.classList.add('is-hidden');
  updateIndicators();

  if (requestedLastPage()) {
    requestAnimationFrame(() => turnTo(pages.length - 1));
  }
};

init().catch((error) => {
  statusText.textContent = 'Lecture interrompue';
  loadingNote.textContent = 'Pages indisponibles.';
  console.error(error);
});
