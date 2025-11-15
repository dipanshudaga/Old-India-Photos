/* app.js - final updated logic
   - flexi-masonry (column-based)
   - show top popular non-numeric tags (TOP_TAGS)
   - OR logic across tags + multi-word OR search
   - infinite scroll, modal, url state
*/

const DATA_PATH = './index.json';
const TOP_TAGS = 30; // top N popular tags to show (non-numeric)
const PAGE_SIZE = 60; // items per load

// state
const state = { all: [], tags: [], selected: new Set(), q: '', page: 0, visible: [], openId: null };

// dom
const masonryRoot = document.getElementById('masonry');
const chipsEl = document.getElementById('chips');
const chipPrev = document.getElementById('chipPrev');
const chipNext = document.getElementById('chipNext');
const searchInput = document.getElementById('searchInput');
const sentinel = document.getElementById('sentinel');

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalClose = document.getElementById('modalClose');

const tpl = document.getElementById('cardTmpl');

/* utils */
const uniq = a => [...new Set(a)];
const toSlug = s => (s || '').toLowerCase().trim();
const isNumericTag = t => /^\d{3,4}s?$/.test(String(t).trim()); // treats "1800s" as numeric; tweak if needed

/* URL state helpers */
function parseURL(){
  const p = new URLSearchParams(location.search);
  return {
    tags: (p.get('tags') || '').split(',').filter(Boolean),
    q: p.get('q') || '',
    page: parseInt(p.get('p') || '0', 10) || 0,
    openId: p.get('open') || null
  };
}
function writeURL(){
  const p = new URLSearchParams();
  if (state.selected.size) p.set('tags', [...state.selected].join(','));
  if (state.q) p.set('q', state.q);
  if (state.page > 0) p.set('p', String(state.page));
  if (state.openId) p.set('open', state.openId);
  history.replaceState(null,'', `${location.pathname}?${p.toString()}`);
}

/* load data */
async function loadData(){
  const res = await fetch(DATA_PATH);
  const data = await res.json();
  state.all = data.map(d => ({
    ...d,
    image: Array.isArray(d.images) ? d.images[0] : (d.image || null),
    thumb: Array.isArray(d.thumbs) ? d.thumbs[0] : (d.thumb || null),
    tag: Array.isArray(d.tag) ? d.tag : (d.tags || [])
  }));
  state.tags = uniq(state.all.flatMap(x => x.tag || [])).sort((a,b)=>a.localeCompare(b));
}

/* compute popular tags and render top N excluding numeric-only */
function renderChips({ topN = TOP_TAGS, curated = [] } = {}){
  // count tags
  const counts = {};
  state.all.forEach(it => (it.tag || []).forEach(t => { const tt = String(t).trim(); if (!tt) return; counts[tt] = (counts[tt]||0) + 1; }));
  const entries = Object.entries(counts)
    .filter(([tag]) => !isNumericTag(tag))
    .sort((a,b) => b[1] - a[1]);

  const top = [...curated, ...entries.map(e=>e[0])].filter((v,i,a)=>a.indexOf(v)===i).slice(0, topN);
  chipsEl.innerHTML = '';
  top.forEach(t => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = t;
    b.setAttribute('aria-selected', state.selected.has(t) ? 'true' : 'false');
    b.addEventListener('click', () => {
      if (state.selected.has(t)) state.selected.delete(t); else state.selected.add(t);
      b.setAttribute('aria-selected', state.selected.has(t) ? 'true' : 'false');
      syncSearchDisplay();
      resetGrid();
      writeURL();
    });
    chipsEl.appendChild(b);
  });
  requestAnimationFrame(updateChipNav);
}

/* chip nav */
function updateChipNav(){
  const tolerance = 2;
  const canRight = (chipsEl.scrollWidth - chipsEl.clientWidth - chipsEl.scrollLeft) > tolerance;
  const canLeft = chipsEl.scrollLeft > tolerance;
  if (chipNext) chipNext.hidden = !canRight;
  if (chipPrev) chipPrev.hidden = !canLeft;
}
chipNext?.addEventListener('click', ()=>chipsEl.scrollBy({ left: chipsEl.clientWidth * 0.85, behavior:'smooth' }));
chipPrev?.addEventListener('click', ()=>chipsEl.scrollBy({ left: -chipsEl.clientWidth * 0.85, behavior:'smooth' }));
chipsEl?.addEventListener('scroll', ()=>requestAnimationFrame(updateChipNav));
window.addEventListener('resize', ()=>requestAnimationFrame(()=>{ updateChipNav(); layoutColumns(); }));

/* search display: if user hasn't typed (empty q), show selected tags as comma text */
function syncSearchDisplay(){
  if (state.q && state.q.length) return; // user typed explicitly
  const selectedText = [...state.selected].join(', ');
  searchInput.value = selectedText;
}

/* filter: OR logic across tags and search keywords */
function applyFilters(items){
  const terms = state.q ? state.q.split(/\s+/).map(toSlug).filter(Boolean) : [];
  if (!terms.length && state.selected.size === 0) return items;
  return items.filter(item => {
    // tags match = any selected tag present (OR)
    if (state.selected.size > 0) {
      if ((item.tag || []).some(t => state.selected.has(t))) return true;
    }
    // search term match (any term present in title or tags)
    if (terms.length) {
      const title = toSlug(item.title || '');
      for (const term of terms) {
        if (title.includes(term)) return true;
        if ((item.tag || []).some(t => toSlug(t).includes(term))) return true;
      }
    }
    return false;
  });
}

/* ----- Flexi masonry implementation (column-based) ----- */
let cols = [];
function getColumnCount(){
  const w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  if (w >= 1400) return 5;
  if (w >= 1100) return 4;
  if (w >= 800) return 3;
  if (w >= 520) return 2;
  return 1;
}
function layoutColumns(){
  const count = getColumnCount();
  // if same number of columns, keep existing to preserve DOM nodes
  if (cols.length === count) return;
  // create columns
  masonryRoot.innerHTML = '';
  cols = [];
  for (let i=0;i<count;i++){
    const c = document.createElement('div');
    c.className = 'col';
    masonryRoot.appendChild(c);
    cols.push(c);
  }
}
function shortestColumn(){
  return cols.reduce((a,b)=> (a.scrollHeight <= b.scrollHeight ? a : b));
}

// create card element
function createCard(rec){
  let node;
  if (tpl && tpl.content) node = tpl.content.firstElementChild.cloneNode(true);
  else {
    node = document.createElement('article');
    node.className = 'card';
    node.innerHTML = `<img class="card__img" alt=""><h3 class="card__title"></h3>`;
  }
  const img = node.querySelector('.card__img');
  const title = node.querySelector('.card__title');
  img.src = rec.thumb || rec.image || '';
  img.alt = rec.title || '';
  title.textContent = rec.title || '';
  node.addEventListener('click', ()=> openModal(rec));
  // when image loads, nothing special needed; column heights will update automatically
  return node;
}

/* rendering pipeline */
function renderNextPage(){
  const filtered = applyFilters(state.all);
  const start = state.page * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  if (!slice.length) return;
  slice.forEach(rec=>{
    const node = createCard(rec);
    // append to shortest column for even distribution
    const col = shortestColumn();
    col.appendChild(node);
    state.visible.push(rec);
  });
  state.page++;
  writeURL();
}

/* reset grid and re-render */
function resetGrid(){
  state.visible = [];
  state.page = 0;
  // rebuild columns layout (keeps responsive)
  layoutColumns();
  renderNextPage();
}

/* infinite scroll */
const io = new IntersectionObserver(entries=>{
  for (const e of entries){
    if (!e.isIntersecting) continue;
    const filtered = applyFilters(state.all);
    if (state.visible.length < filtered.length) renderNextPage();
  }
},{ rootMargin: '800px 0px' });

/* modal */
function openModal(rec){
  state.openId = String(rec.id || '');
  if (modalImg) modalImg.src = rec.image || rec.thumb || '';
  if (modalTitle) modalTitle.textContent = rec.title || '';
  if (modalDesc) modalDesc.textContent = rec.post_description || '';
  if (modal) modal.setAttribute('aria-hidden','false');
  writeURL();
}
function closeModal(){
  state.openId = null;
  if (modal) modal.setAttribute('aria-hidden','true');
  writeURL();
}
modal?.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeModal(); });
modalClose?.addEventListener('click', closeModal);
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

window.addEventListener('popstate', ()=>{
  const { openId } = parseURL();
  if (!openId && modal?.getAttribute('aria-hidden') === 'false') closeModal();
});

/* search input behavior */
let userTyping = false;
searchInput.addEventListener('input', (e)=>{
  userTyping = !!e.target.value.trim();
  state.q = e.target.value.trim();
  // if user typed -> respect text; else show selected tags text
  if (!userTyping) syncSearchDisplay();
  resetGrid();
  writeURL();
});
searchInput.addEventListener('focus', ()=> { /* preserve user control */ });

/* initialization */
(async function init(){
  await loadData();
  // build columns
  layoutColumns();

  // restore url state
  const { tags, q, page, openId } = parseURL();
  tags.forEach(t => state.selected.add(t));
  state.q = q || '';
  if (state.q && searchInput) { searchInput.value = state.q; userTyping = true; }
  else syncSearchDisplay();

  // render chips + first page
  renderChips();
  renderNextPage();
  for (let i=1;i<=page;i++) renderNextPage();

  // observe sentinel
  io.observe(sentinel);

  // re-layout on resize
  window.addEventListener('resize', () => {
    const prevCols = cols.length;
    layoutColumns();
    // If column count changed, reflow all visible items into new columns
    if (cols.length !== prevCols) {
      // re-append visible nodes into shortest columns
      const nodes = Array.from(document.querySelectorAll('.card'));
      masonryRoot.querySelectorAll('.col').forEach(c => c.innerHTML = '');
      nodes.forEach(n => shortestColumn().appendChild(n));
    }
  });

  // open modal from url if any
  if (openId) {
    const rec = state.all.find(r => String(r.id || '') === String(openId));
    if (rec) openModal(rec);
  }
})();
