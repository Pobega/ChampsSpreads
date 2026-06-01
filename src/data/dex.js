// Pure, DOM/fetch-free logic for the Pokédex stats-browser page.
// Kept side-effect free so it can be unit-tested in tests.html.

// The six base stats, in canonical Showdown order.
export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// Sum of the six base stats.
export function bst(baseStats) {
  if (!baseStats) return 0;
  return STAT_KEYS.reduce((sum, k) => sum + (baseStats[k] || 0), 0);
}

// A row is { apiName, name, details|null } where details is the object returned
// by fetchPokemonDetails (or null when not yet loaded).

// Numeric value for a sortable stat/bst key on a row, or null when unknown.
function statValue(row, key) {
  if (!row.details) return null;
  if (key === 'bst') return bst(row.details.baseStats);
  return row.details.baseStats ? (row.details.baseStats[key] ?? null) : null;
}

// Returns a new array sorted by `key` ('name', 'bst', or a STAT_KEYS entry) in
// the given direction ('desc' | 'asc'). Rows whose details aren't loaded sort to
// the end (for stat keys); the sort is stable.
export function sortDex(rows, key, dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      if (key === 'name') {
        const cmp = a.row.name.localeCompare(b.row.name);
        return cmp !== 0 ? cmp * sign : a.i - b.i;
      }
      const av = statValue(a.row, key);
      const bv = statValue(b.row, key);
      // Unknown stats always sink to the bottom regardless of direction.
      if (av === null && bv === null) return a.i - b.i;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av !== bv) return (av - bv) * sign;
      return a.i - b.i; // stable tie-break
    })
    .map((e) => e.row);
}

// Case-insensitive filter: matches when the query is a substring of the display
// name or of any ability name. Rows without loaded details match on name only.
export function filterDex(rows, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    if (row.name.toLowerCase().includes(q)) return true;
    if (row.details && row.details.abilities) {
      return row.details.abilities.some((a) => a.name.toLowerCase().includes(q));
    }
    return false;
  });
}
