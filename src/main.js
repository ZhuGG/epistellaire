import './style.css';
import pages from './manifest.json';
import { createIcons, ArrowUpRight, Moon, Sun, ArrowLeft, ArrowRight, Scan, LayoutGrid, Maximize, Minimize, X, Minus, Plus, Eye, EyeOff } from 'lucide';
import { Book } from './book.js';
const icons = { ArrowUpRight, Moon, Sun, ArrowLeft, ArrowRight, Scan, LayoutGrid, Maximize, Minimize, X, Minus, Plus, Eye, EyeOff };
const $ = id => document.getElementById(id);
const asset = path => import.meta.env.BASE_URL + path;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const params = new URLSearchParams(location.search);
let current = params.get('last') === '1' ? pages.length - 1 : clamp(Number(params.get('page') || 1) - 1 || 0, 0, pages.length - 1);
let busy = false, book = null, ready = false;
let introductionController = null;
createIcons({ icons });
const thumbnailButtons = pages.map((page, index) => {
  const button = document.createElement('button'); button.className = 'thumbnail';
  button.setAttribute('aria-label', `Ouvrir ${page.title.toLowerCase()}`);
  const image = new Image(); image.src = asset(page.thumbnail); image.alt = page.title; image.loading = 'lazy';
  const label = document.createElement('span'); label.textContent = page.title;
  const number = document.createElement('small'); number.textContent = String(index + 1).padStart(2, '0'); label.append(number);
  button.append(image, label); button.onclick = () => { $('indexDialog').close(); navigate(index); };
  $('thumbnailGrid').append(button); return button;
});
function update() {
  $('pageLabel').textContent = pages[current].title;
  $('folio').textContent = `${String(current + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;
  $('scrubber').value = current; $('scrubber').disabled = busy || !ready;
  $('previous').disabled = busy || !ready || current === 0;
  $('next').disabled = busy || !ready || current === pages.length - 1;
  $('detailButton').disabled = busy || !ready;
  $('focusButton').disabled = !ready;
  thumbnailButtons.forEach((button, index) => { button.setAttribute('aria-current', String(index === current)); button.disabled = busy || !ready; });
}
function setUrl() {
  const url = new URL(location.href); url.searchParams.delete('last');
  if (current === 0) url.searchParams.delete('page'); else url.searchParams.set('page', current + 1);
  history.replaceState({}, '', url);
}
async function navigate(index, animate = true) {
  index = clamp(index, 0, pages.length - 1);
  if (busy || !ready || index === current) { update(); return; }
  busy = true; update(); $('status').textContent = '';
  try {
    if (book) await book.show(index, animate);
    if (!book) await showFallback(index);
    current = index; setUrl();
  } catch { $('status').textContent = 'Cette image n’a pas pu être chargée. Réessayez de tourner la page.'; }
  finally { busy = false; update(); }
}
async function showFallback(index) {
  const image = new Image(); image.src = asset(pages[index].image); await image.decode();
  $('fallback').src = image.src; $('fallback').alt = pages[index].title; $('fallback').hidden = false;
}
function activateFallback() {
  book?.dispose(); book = null;
  $('fallback').src = asset(pages[current].image); $('fallback').alt = pages[current].title; $('fallback').hidden = false;
  $('hint').textContent = 'Vue sans animation · utilisez les flèches pour feuilleter';
  $('status').textContent = 'Le livre est disponible en vue sans animation.';
}
$('next').onclick = () => navigate(current + 1); $('previous').onclick = () => navigate(current - 1);
$('scrubber').oninput = event => navigate(Number(event.target.value), false);
document.querySelector('.artist').onclick = event => { event.preventDefault(); navigate(0); };
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && introductionController) { introductionController.abort(); return; }
  if (event.key === 'Escape' && $('app').classList.contains('reading-focus')) { toggleFocus(false); return; }
  if (document.querySelector('dialog[open]') || event.target.matches('input')) return;
  const actions = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: pages.length - 1 };
  if (event.key in actions) { event.preventDefault(); navigate(actions[event.key]); }
});
let swipe = null;
$('stage').addEventListener('pointerdown', event => {
  if (event.target.closest('button') || !event.isPrimary || event.button !== 0 || busy || !ready) return;
  swipe = { x: event.clientX, y: event.clientY, id: event.pointerId, previousX: event.clientX, time: performance.now(), velocity: 0, phase: 0, pending: null, started: false };
  $('stage').setPointerCapture(event.pointerId);
});
$('stage').addEventListener('pointermove', event => {
  if (!swipe || swipe.id !== event.pointerId) return;
  const gesture = swipe, dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  const scale = Math.max(160, $('stage').clientWidth * .52), now = performance.now();
  if (!gesture.started && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    gesture.direction = dx < 0 ? 1 : -1; gesture.target = current + gesture.direction;
    if (gesture.target < 0 || gesture.target >= pages.length) return;
    gesture.started = true;
    if (book && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      busy = true; update(); $('stage').classList.add('is-dragging');
      gesture.pending = book.beginTurn(gesture.target).then(() => { if (swipe === gesture) book?.scrub(gesture.phase); });
      // L'erreur sera annoncée à la fin du geste.
      gesture.pending.catch(() => {});
    }
  }
  if (gesture.started) {
    gesture.phase = clamp(-dx * gesture.direction / scale, 0, 1);
    const speed = -(event.clientX - gesture.previousX) * gesture.direction / scale / Math.max(.008, (now - gesture.time) / 1000);
    gesture.velocity = speed * .65 + gesture.velocity * .35;
    book?.scrub(gesture.phase);
  }
  gesture.previousX = event.clientX; gesture.time = now;
});
async function endGesture(event, cancel = false) {
  if (!swipe || swipe.id !== event.pointerId) return;
  const gesture = swipe; swipe = null;
  if (!gesture.started) return;
  const velocity = performance.now() - gesture.time > 120 ? 0 : gesture.velocity;
  const commit = !cancel && (gesture.phase > .28 || (gesture.phase > .035 && velocity > .65));
  if (!gesture.pending) { if (commit) navigate(gesture.target, false); return; }
  try {
    await gesture.pending;
    if (book) { book.scrub(gesture.phase); await book.finishTurn(commit, velocity); }
    if (!book && commit) await showFallback(gesture.target);
    if (commit) { current = gesture.target; setUrl(); }
  } catch { $('status').textContent = 'Cette image n’a pas pu être chargée. Réessayez de tourner la page.'; }
  finally { busy = false; $('stage').classList.remove('is-dragging'); update(); }
}
$('stage').addEventListener('pointerup', event => endGesture(event));
$('stage').addEventListener('pointercancel', event => endGesture(event, true));
$('stage').addEventListener('lostpointercapture', event => { if (swipe) endGesture(event, true); });
$('stage').addEventListener('dblclick', event => { if (!event.target.closest('button') && !busy) $('detailButton').click(); });
function toggleFocus(value) {
  $('app').classList.toggle('reading-focus', value);
  const active = $('app').classList.contains('reading-focus');
  $('focusButton').setAttribute('aria-pressed', String(active));
  $('focusButton').setAttribute('aria-label', active ? 'Tout afficher' : 'Livre seul');
  $('focusButton').innerHTML = `<i data-lucide="${active ? 'eye-off' : 'eye'}"></i><span>${active ? 'Tout afficher' : 'Livre seul'}</span>`;
  createIcons({ icons });
}
$('focusButton').onclick = () => toggleFocus(!$('app').classList.contains('reading-focus'));
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { const r = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close(); });
}
$('indexButton').onclick = () => $('indexDialog').showModal();
$('aboutButton').onclick = () => $('aboutDialog').showModal();
$('themeButton').onclick = () => {
  const dark = document.body.dataset.theme !== 'dark'; document.body.dataset.theme = dark ? 'dark' : 'light';
  $('themeButton').setAttribute('aria-label', dark ? 'Passer en ambiance claire' : 'Passer en ambiance sombre');
  $('themeButton').innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}"></i>`; createIcons({ icons });
  document.querySelector('meta[name="theme-color"]').content = dark ? '#1c2c2b' : '#d9e2de';
};
if (!document.fullscreenEnabled) $('fullscreenButton').hidden = true;
$('fullscreenButton').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('app').requestFullscreen(); }
  catch { $('status').textContent = 'Le plein écran n’est pas disponible dans ce navigateur.'; }
};
document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  $('fullscreenButton').innerHTML = `<i data-lucide="${active ? 'minimize' : 'maximize'}"></i><span>${active ? 'Quitter' : 'Plein écran'}</span>`;
  createIcons({ icons });
});
let zoom = 1, offset = { x: 0, y: 0 }, drag = null, detailToken = 0, pinch = null;
const detailPointers = new Map();
function transformDetail() {
  const image = $('detailImage'), viewport = $('detailViewport');
  const maxX = Math.max(0, (image.offsetWidth * zoom - viewport.clientWidth) / 2 + 25);
  const maxY = Math.max(0, (image.offsetHeight * zoom - viewport.clientHeight) / 2 + 25);
  offset.x = clamp(offset.x, -maxX, maxX); offset.y = clamp(offset.y, -maxY, maxY);
  image.style.transform = `translate(${offset.x}px,${offset.y}px) scale(${zoom})`;
  $('zoomReset').textContent = `${Math.round(zoom * 100)} %`;
  $('zoomOut').disabled = zoom <= 1; $('zoomIn').disabled = zoom >= 5;
}
function changeZoom(value) { zoom = clamp(value, 1, 5); if (zoom === 1) offset = { x: 0, y: 0 }; transformDetail(); }
$('detailButton').onclick = async () => {
  const token = ++detailToken, page = pages[current];
  zoom = 1; offset = { x: 0, y: 0 };
  $('detailLabel').textContent = page.title; $('detailImage').alt = page.title + ' — numérisation entière';
  $('detailImage').src = asset(page.image); $('detailDialog').showModal(); transformDetail();
  $('detailStatus').textContent = 'Chargement de la numérisation originale…';
  const image = new Image(); image.src = asset(page.original);
  try { await image.decode(); if (token !== detailToken) return; $('detailImage').src = image.src; $('detailStatus').textContent = ''; transformDetail(); }
  catch { if (token === detailToken) $('detailStatus').textContent = 'Original indisponible. La version de lecture reste visible.'; }
};
$('detailDialog').addEventListener('close', () => { detailToken++; drag = null; pinch = null; detailPointers.clear(); });
$('detailImage').onload = transformDetail;
$('zoomIn').onclick = () => changeZoom(zoom + .5); $('zoomOut').onclick = () => changeZoom(zoom - .5); $('zoomReset').onclick = () => changeZoom(1);
$('detailViewport').addEventListener('wheel', event => { event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? .2 : -.2)); }, { passive: false });
const pinchDistance = () => { const [a, b] = [...detailPointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
$('detailViewport').addEventListener('pointerdown', event => {
  detailPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  $('detailViewport').setPointerCapture(event.pointerId);
  if (detailPointers.size === 2) { pinch = { distance: Math.max(1, pinchDistance()), zoom }; drag = null; }
  else if (detailPointers.size === 1) drag = { x: event.clientX - offset.x, y: event.clientY - offset.y };
});
$('detailViewport').addEventListener('pointermove', event => {
  if (!detailPointers.has(event.pointerId)) return;
  detailPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch && detailPointers.size === 2) changeZoom(pinch.zoom * pinchDistance() / pinch.distance);
  else if (drag) { offset = { x: event.clientX - drag.x, y: event.clientY - drag.y }; transformDetail(); }
});
for (const type of ['pointerup', 'pointercancel']) $('detailViewport').addEventListener(type, event => {
  detailPointers.delete(event.pointerId); pinch = null; drag = null;
  if (detailPointers.size === 1) { const point = [...detailPointers.values()][0]; drag = { x: point.x - offset.x, y: point.y - offset.y }; }
});
$('detailViewport').addEventListener('dblclick', () => changeZoom(zoom === 1 ? 2.5 : 1));
$('detailDialog').addEventListener('keydown', event => {
  if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(zoom + .5); }
  if (event.key === '-') { event.preventDefault(); changeZoom(zoom - .5); }
  if (event.key === '0') { event.preventDefault(); changeZoom(1); }
});
window.addEventListener('resize', transformDetail);
$('skipIntro').onclick = () => introductionController?.abort();
update();
try {
  book = new Book($('stage'), pages, asset);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) await book.show(current, false);
  else {
    const target = !params.has('page') && !params.has('last') && current === 0 ? 1 : current;
    introductionController = new AbortController();
    await book.texture(0);
    $('loading').hidden = true; $('skipIntro').hidden = false; document.querySelector('.reader').classList.add('is-introducing');
    await book.introduce(target, introductionController.signal);
    current = target; setUrl();
  }
  book.renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); activateFallback(); });
} catch { activateFallback(); }
finally { introductionController = null; ready = true; $('skipIntro').hidden = true; $('loading').hidden = true; document.querySelector('.reader').classList.remove('is-introducing'); document.querySelector('.reader').setAttribute('aria-busy', 'false'); update(); }
window.addEventListener('pagehide', () => book?.dispose(), { once: true });
