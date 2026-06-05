// Shared detail modal (Preact) for the Pokédex ↔ Attackdex cross-links: a
// learnset list (Pokémon → moves) or learned-by list (move → Pokémon). Replaces
// the vanilla src/ui/detail-modal.js — same open/close/refresh API so the two
// dex stores barely change, but items now carry a Preact `node` (JSX) instead of
// a pre-escaped HTML string, so callers no longer hand-escape.
//
// Mounted once by app.js into #detail-modal-root. Scroll position survives a
// refresh for free: the scroll container element persists across renders, so
// only its children reconcile (the vanilla version had to save/restore scrollTop
// because it rebuilt innerHTML).
import { html, useState, useLayoutEffect } from './preact.js';

// Reactive modal state with its own listener set.
const modal = { open: false, title: '', subtitle: '', items: [] };
const listeners = new Set();
function notify() { listeners.forEach((l) => l()); }

// items: [{
//   node?:    Preact VNode for the row interior
//   label?:   plain-text fallback used when `node` is absent
//   onClick?: () => void   — omit for non-interactive note rows
// }]
export function openDetailModal({ title, subtitle, items }) {
  modal.open = true;
  modal.title = title;
  modal.subtitle = subtitle || '';
  modal.items = items;
  notify();
}

export function closeDetailModal() {
  modal.open = false;
  notify();
}

// Re-render just the item list (e.g. as async details stream in). No-op when the
// modal is closed, matching the old guard.
export function refreshDetailModalBody(items) {
  if (!modal.open) return;
  modal.items = items;
  notify();
}

function Item({ item }) {
  const inner = item.node ?? html`<span class="truncate">${item.label || ''}</span>`;
  if (!item.onClick) {
    return html`<p class="text-[11px] text-slate-500 italic px-3 py-2 text-center">${inner}</p>`;
  }
  return html`
    <button class="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-800/60 transition text-slate-200 flex items-center gap-2 group"
      onClick=${item.onClick}>${inner}</button>`;
}

export function DetailModal() {
  const [, force] = useState(0);
  useLayoutEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  if (!modal.open) return null;

  return html`
    <div class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick=${(e) => { if (e.target === e.currentTarget) closeDetailModal(); }}>
      <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-3 p-5 max-h-[80vh]">
        <div class="flex items-center justify-between gap-3 border-b border-slate-700 pb-3">
          <div class="min-w-0">
            <h3 class="text-sm font-extrabold text-amber-400 truncate">${modal.title}</h3>
            <p class="text-[11px] text-slate-500 mt-0.5">${modal.subtitle}</p>
          </div>
          <button onClick=${closeDetailModal} class="text-slate-400 hover:text-white text-lg leading-none px-1 shrink-0" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="overflow-y-auto flex flex-col min-h-0 flex-1">
          ${modal.items.length
            ? modal.items.map((item, i) => html`<${Item} key=${i} item=${item} />`)
            : html`<p class="text-xs text-slate-500 italic p-3 text-center">No entries found.</p>`}
        </div>
      </div>
    </div>`;
}
