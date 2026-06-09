// The format pill shown in each dex-page title (Pokédex, Attackdex, Abilitydex):
// the active regulation's label, or "National Dex" when no regulation is selected.
// Makes it obvious the list is filtered to that format's legal species / learners /
// holders. Reads STATE.format reactively — the view it lives in re-renders on a
// format change, so no own subscription is needed.
import { html } from './preact.js';
import { STATE } from '../state.js';
import { REGULATIONS } from '../data/regulations.js';

export function RegulationBadge() {
  const reg = REGULATIONS[STATE.format];
  if (reg) {
    return html`<span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 bg-green-950 text-green-400 border border-green-900/50">${reg.label}</span>`;
  }
  return html`<span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 bg-slate-800/60 text-slate-400 border border-slate-700/30">National Dex</span>`;
}
