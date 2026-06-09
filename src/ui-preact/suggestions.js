// Autocomplete suggestions for the dex-style chip search. Two layers:
//   - buildSuggestions(): pure ranking over in-memory name lists, unit-tested.
//   - makeSuggester(): binds it to the app's cache-backed name lists + their lazy
//     loaders, so a page just gets a (draft) -> suggestions function.
//
// Suggestions are intentionally shallow (a few across categories) and never
// auto-selected — they hint what a term will filter ("Dark (type)" vs
// "Darkrai (pokemon)" vs "Dark Aura (ability)"), they don't drive the search.
import { ALL_TYPES } from '../data/constants.js';
import { CACHE } from '../state.js';
import { initPokemonList, initAllMovesList, initAllAbilitiesList } from '../api/pokeapi.js';
import { isHiddenForm } from '../data/dex.js';

// Pure suggestion ranking. `query` is the raw draft; `sources` is an ordered list
// of { kind, label, items } (items are display strings) in priority order;
// `exclude` is a Set/array of lowercased values already committed (skipped).
// Returns up to `limit` { value, kind, label } picks, interleaved across kinds
// (round-robin in source order) so a query like "dark" surfaces one of each kind
// rather than three moves. Within a kind, prefix matches rank above interior
// substring matches, then shorter strings, then alphabetical.
export function buildSuggestions(query, sources, { limit = 3, exclude } = {}) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const skip = exclude instanceof Set ? exclude : new Set(exclude || []);

  const ranked = sources.map(({ kind, label, items }) => {
    const matches = [];
    for (const item of items) {
      const lower = item.toLowerCase();
      const at = lower.indexOf(q);
      if (at === -1 || skip.has(lower)) continue;
      matches.push({ value: item, kind, label, lower, prefix: at === 0 ? 0 : 1, len: item.length });
    }
    matches.sort((a, b) => a.prefix - b.prefix || a.len - b.len || a.lower.localeCompare(b.lower));
    return matches;
  });

  const out = [];
  const seen = new Set();
  for (let rank = 0; out.length < limit; rank++) {
    let advanced = false;
    for (const matches of ranked) {
      if (rank >= matches.length) continue;
      advanced = true;
      const m = matches[rank];
      if (seen.has(m.lower)) continue;
      seen.add(m.lower);
      out.push({ value: m.value, kind: m.kind, label: m.label });
      if (out.length >= limit) break;
    }
    if (!advanced) break; // every kind exhausted
  }
  return out;
}

// Each suggestable kind: its display hint, a loader that fills the name cache it
// reads (idempotent + localStorage-backed), and an accessor for the current list
// of display names. Types are static (no loader).
const KINDS = {
  type: { label: 'type', loader: null, items: () => ALL_TYPES },
  pokemon: {
    label: 'pokemon',
    loader: initPokemonList,
    items: () =>
      (CACHE.pokemonList || []).filter((p) => !isHiddenForm(p.apiName)).map((p) => p.name),
  },
  ability: {
    label: 'ability',
    loader: initAllAbilitiesList,
    items: () => (CACHE.allAbilities || []).map((a) => a.name),
  },
  move: {
    label: 'move',
    loader: initAllMovesList,
    items: () => (CACHE.allMoves || []).map((m) => m.name),
  },
};

// Builds a (draft, exclude) -> suggestions function for the given kinds, in
// priority order. The backing name lists load lazily the first time the suggester
// runs (the first keystroke) — each is localStorage-backed so it's instant on
// later visits — and `onReady` fires once the in-flight loads settle so the view
// re-renders with the now-populated lists.
export function makeSuggester(kinds, { onReady, limit = 3 } = {}) {
  let kickedOff = false;
  const ensureLoaded = () => {
    if (kickedOff) return;
    kickedOff = true;
    const pending = kinds
      .map((k) => KINDS[k]?.loader)
      .filter(Boolean)
      .map((load) => load().catch(() => {}));
    if (pending.length && onReady) Promise.all(pending).then(() => onReady());
  };

  return (draft, exclude) => {
    ensureLoaded();
    const sources = kinds
      .filter((k) => KINDS[k])
      .map((k) => ({ kind: k, label: KINDS[k].label, items: KINDS[k].items() }));
    return buildSuggestions(draft, sources, { limit, exclude });
  };
}
