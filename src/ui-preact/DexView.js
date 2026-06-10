// Pokédex page (Preact) — the sortable/searchable species table mounted into the
// existing #page-pokedex container. Reads the reactive DexStore and re-renders on
// notifyDex(); all data + loading logic lives in dex-store.js. Row click opens the
// shared vanilla detail modal. (Lazy National-Dex loading is restored in 2b.)
import { html, useRef } from './preact.js';
import { useSubscription, useLazyRowLoader } from './reactive.js';
import { SearchChips } from './SearchChips.js';
import { RegulationBadge } from './RegulationBadge.js';
import { bst, sortDex, filterDex, SPEED_TIERS, speedTier } from '../data/dex.js';
import { getTypeBgClass, TYPE_SHORT } from '../ui/render.js';
import {
  DexStore,
  subscribeDex,
  dexStatusText,
  setDexSort,
  setDexView,
  setDexDraft,
  commitDexFilter,
  commitDexValue,
  removeDexFilter,
  clearDexFilters,
  dexSuggest,
  toggleDexPin,
  handleDexRowClick,
  loadDexDetails,
} from './dex-store.js';

// Column tracks shared by the header + every row. Stats view: name, type,
// abilities, 6 stats, BST, pin. Speed view swaps the 6 stats + BST for the 4
// computed speed tiers (wider cells — speeds run to 3 digits, no BST).
const STAT_GRID_COLS =
  'grid-cols-[minmax(150px,1.6fr)_110px_minmax(140px,1.4fr)_repeat(6,46px)_58px_34px]';
const SPEED_GRID_COLS =
  'grid-cols-[minmax(150px,1.6fr)_110px_minmax(140px,1.4fr)_repeat(4,56px)_34px]';
const gridCols = (view) => (view === 'speed' ? SPEED_GRID_COLS : STAT_GRID_COLS);
const rowGrid = (view) =>
  `grid ${gridCols(view)} items-center gap-2 px-3 py-1.5 border-b border-slate-800/70 text-xs`;
// Min-width keeps the columns from collapsing inside the horizontal scroller; the
// speed track is narrower (4 cells, no BST) so it needs less.
const minWidth = (view) => (view === 'speed' ? 'min-w-[720px]' : 'min-w-[894px]');

function PinButton({ row, pinned }) {
  // stopPropagation so pinning doesn't also open the row's detail modal.
  return html`
    <button
      onClick=${(e) => {
        e.stopPropagation();
        toggleDexPin(row.apiName);
      }}
      class=${`justify-self-center transition leading-none p-2 -m-2 ${pinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}
      title=${pinned ? 'Unpin' : 'Pin to top'} aria-label=${pinned ? `Unpin ${row.name}` : `Pin ${row.name}`} aria-pressed=${pinned ? 'true' : 'false'}>
      <i class="fa-solid fa-thumbtack text-[11px]"></i>
    </button>`;
}

function PlaceholderRow({ row, pinned, view }) {
  // Lazy placeholder; data-api lets 2b's observer know what to fetch. Clicking a
  // not-yet-loaded row still opens the modal (it fetches on demand), matching the
  // old delegated-click behavior. Dash count matches the active view's stat block
  // (6 stats + BST, or 4 speed tiers).
  const dashes = view === 'speed' ? SPEED_TIERS.length : 7;
  return html`
    <div class=${`${rowGrid(view)} cursor-pointer ${pinned ? 'bg-amber-950/10' : ''}`} data-api=${row.apiName}
      onClick=${() => handleDexRowClick(row.apiName)}>
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 bg-slate-800 rounded shrink-0 animate-pulse"></div>
        <span class="font-bold text-slate-300 truncate">${row.name}</span>
      </div>
      <span class="text-slate-600 text-[10px]">…</span>
      <span class="text-slate-600 text-[10px]">loading…</span>
      ${Array.from({ length: dashes }).map(() => html`<span class="text-right font-mono text-slate-600">–</span>`)}
      <${PinButton} row=${row} pinned=${pinned} />
    </div>`;
}

function DexRow({ row, pinned, view }) {
  const d = row.details;
  if (!d) return html`<${PlaceholderRow} row=${row} pinned=${pinned} view=${view} />`;

  const s = d.baseStats;
  const cell = (v) => html`<span class="text-right font-mono text-slate-300">${v}</span>`;
  // Stats view: the six base stats + BST. Speed view: the four computed tiers,
  // with Scarf tinted to flag it as the item-boosted (conditional) speed.
  const statBlock =
    view === 'speed'
      ? SPEED_TIERS.map((t) =>
          t.scarf
            ? html`<span class="text-right font-mono text-sky-300">${speedTier(s, t)}</span>`
            : cell(speedTier(s, t))
        )
      : html`${cell(s.hp)}${cell(s.atk)}${cell(s.def)}${cell(s.spa)}${cell(s.spd)}${cell(s.spe)}
        <span class="text-right font-mono font-bold text-amber-400">${bst(s)}</span>`;
  return html`
    <div class=${`${rowGrid(view)} hover:bg-slate-800/40 transition cursor-pointer ${pinned ? 'bg-amber-950/10' : ''}`} data-api=${row.apiName}
      onClick=${() => handleDexRowClick(row.apiName)}>
      <div class="flex items-center gap-2 min-w-0">
        <img src=${d.sprite || ''} alt="" loading="lazy" class="w-8 h-8 object-contain shrink-0" />
        <span class="font-bold text-slate-100 truncate">${row.name}</span>
      </div>
      <div class="flex flex-wrap gap-1">
        ${d.types.map((t) => html`<span class=${`text-[8px] px-1 py-0.5 font-extrabold uppercase rounded ${getTypeBgClass(t)} text-white`} title=${t}>${TYPE_SHORT[t] || t}</span>`)}
      </div>
      <span class="text-slate-400 text-[10px] leading-tight">${d.abilities.map((a) => a.name).join(', ')}</span>
      ${statBlock}
      <${PinButton} row=${row} pinned=${pinned} />
    </div>`;
}

const SORT_COLS = [
  { key: 'name', label: 'Pokémon', align: 'text-left' },
  { key: 'hp', label: 'HP', align: 'text-right' },
  { key: 'atk', label: 'Atk', align: 'text-right' },
  { key: 'def', label: 'Def', align: 'text-right' },
  { key: 'spa', label: 'SpA', align: 'text-right' },
  { key: 'spd', label: 'SpD', align: 'text-right' },
  { key: 'spe', label: 'Spe', align: 'text-right' },
  { key: 'bst', label: 'BST', align: 'text-right' },
];

// Sortable stat-block headers for the speed view (the 4 computed tiers).
const SPEED_SORT_COLS = SPEED_TIERS.map((t) => ({
  key: t.key,
  label: t.label,
  align: 'text-right',
}));

function ViewToggle() {
  const btn = (mode, label) => {
    const active = DexStore.view === mode;
    return html`
      <button
        onClick=${() => setDexView(mode)}
        class=${`px-3 py-2 text-[10px] leading-4 font-extrabold uppercase tracking-wider transition ${active ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
        aria-pressed=${active ? 'true' : 'false'}>
        ${label}
      </button>`;
  };
  // py-2 + leading-4 matches the SearchChips input box (py-2 text-xs) so the two
  // controls line up at the same height; rounded-xl matches its corners.
  return html`
    <div class="inline-flex self-start rounded-xl border border-slate-700 overflow-hidden shrink-0">
      ${btn('stats', 'Stats')}${btn('speed', 'Speed tiers')}
    </div>`;
}

function SortButton({ col }) {
  const active = DexStore.sortKey === col.key;
  const arrow = active ? (DexStore.sortDir === 'desc' ? '▼' : '▲') : '';
  return html`
    <button class=${`dex-sort ${col.align} hover:text-white transition ${active ? 'text-amber-400' : ''}`}
      onClick=${() => setDexSort(col.key)}>
      ${col.label} <span class="dex-arrow">${arrow}</span>
    </button>`;
}

export function DexView() {
  useSubscription(subscribeDex);

  // Committed chips plus the live draft (so typing previews before Enter).
  const draft = DexStore.draft.trim();
  const terms = draft ? [...DexStore.filters, draft] : DexStore.filters;

  // Pinned species are hoisted above the (filtered) rest and shown regardless of
  // the search; the rest excludes them so they never appear twice. Each group is
  // sorted independently by the active column.
  const pinnedSet = new Set(DexStore.pinned);
  const isPinned = (row) => pinnedSet.has(row.apiName);
  const pinnedRows = sortDex(DexStore.roster.filter(isPinned), DexStore.sortKey, DexStore.sortDir);
  const rest = sortDex(
    filterDex(
      DexStore.roster.filter((r) => !isPinned(r)),
      terms
    ),
    DexStore.sortKey,
    DexStore.sortDir
  );
  const statusText =
    DexStore.loading && DexStore.roster.length === 0 ? 'loading roster…' : dexStatusText();

  // Active view drives the grid track, min-width, and which stat-block headers are
  // sortable (base stats + BST vs the 4 speed tiers).
  const view = DexStore.view;
  const statCols = view === 'speed' ? SPEED_SORT_COLS : SORT_COLS.slice(1);

  // Lazy National-Dex loading: fetch placeholder rows as they scroll into view.
  // (Regulation rosters eager-load, so allLoaded short-circuits the observer.)
  const rowsRef = useRef(null);
  useLazyRowLoader(rowsRef, DexStore, loadDexDetails);

  return html`
    <section class="bg-slate-950/20 border border-slate-800/80 rounded-3xl p-5 lg:p-5 flex flex-col gap-4">

      <!-- Title + Search -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
        <h2 class="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-book text-xs"></i> Pokédex
          <${RegulationBadge} />
          <span class="text-[10px] font-bold text-slate-500 normal-case tracking-normal">${statusText}</span>
        </h2>
        <div class="flex flex-wrap items-start gap-2 w-full sm:w-auto">
          <${ViewToggle} />
          <${SearchChips}
            draft=${DexStore.draft}
            filters=${DexStore.filters}
            placeholder="Search name, type, ability, move… (Enter to add)"
            onDraft=${setDexDraft}
            onCommit=${commitDexFilter}
            onRemove=${removeDexFilter}
            onClear=${clearDexFilters}
            suggest=${dexSuggest}
            onPick=${commitDexValue} />
        </div>
      </div>

      <!-- Scrollable table -->
      <div class="overflow-x-auto">
        <div class=${minWidth(view)}>
          <!-- Header row -->
          <div class=${`grid ${gridCols(view)} items-center gap-2 px-3 py-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-700`}>
            <${SortButton} col=${SORT_COLS[0]} />
            <span class="text-left">Type</span>
            <span class="text-left">Abilities</span>
            ${statCols.map((col) => html`<${SortButton} col=${col} />`)}
            <span class="justify-self-center"><i class="fa-solid fa-thumbtack text-[9px]"></i></span>
          </div>
          <!-- Data rows: pinned first, then the filtered rest -->
          <div class="flex flex-col" ref=${rowsRef}>
            ${pinnedRows.map((row) => html`<${DexRow} key=${`pin-${row.apiName}`} row=${row} pinned=${true} view=${view} />`)}
            ${pinnedRows.length > 0 && rest.length > 0 && html`<div class="border-b-2 border-amber-900/30"></div>`}
            ${rest.map((row) => html`<${DexRow} key=${row.apiName} row=${row} pinned=${false} view=${view} />`)}
            ${
              pinnedRows.length === 0 &&
              rest.length === 0 &&
              html`
              <div class="px-3 py-8 text-center text-xs text-slate-500">No Pokémon match ${terms.map((t, i) => html`${i > 0 ? ' + ' : ''}“${t}”`)}.</div>`
            }
          </div>
        </div>
      </div>

    </section>`;
}
