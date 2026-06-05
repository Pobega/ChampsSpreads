// Competitive VGC regulation definitions.
//
// PokéAPI has no per-regulation Pokédex, and regulations rotate every few months
// (M-A -> M-B -> ...), each adding and/or removing a handful of species. So the
// legal roster for every regulation is maintained here, expressed as a delta over
// the Champions game roster (champions_dex.json, mirrored upstream as PokéAPI
// pokedex 36):
//
//     legal = (roster ∪ include) − exclude
//
// Adding a new regulation is a data change: add an entry below and the format
// selector, legality badges, and roster filters all pick it up — there is no
// per-regulation logic to touch. Keyed by the STATE.format value used in the
// format <select>. The unrestricted "National Dex" view ('all') is the absence
// of a regulation, not an entry here.

export const REGULATIONS = {
  regulation_ma: {
    label: 'Regulation M-A',  // full badge / tag text
    short: 'M-A',             // compact selector + pill text
    // Rotom-form accent for the brand glow and format pill (Heat Rotom amber).
    theme: { glow: 'rgba(251,191,36,0.65)', pillBorder: 'border-amber-500/40', pillText: 'text-amber-300' },
    include: [],              // legal beyond the Champions roster
    exclude: [],              // roster species not legal this regulation
  },
};

// Accent for the unrestricted "National Dex" view (STATE.format === 'all'), which
// is not a regulation. Wash Rotom's cool sky, mirroring the old FORM_THEMES.all.
export const NATIONAL_THEME = { glow: 'rgba(56,189,248,0.65)', pillBorder: 'border-sky-500/40', pillText: 'text-sky-300' };

// Resolve a regulation's legal base-species Set from the roster names + its delta:
// start from the roster, drop excludes, add includes.
export function resolveLegalSet(rosterNames, reg) {
  const set = new Set(rosterNames);
  for (const name of reg.exclude || []) set.delete(name);
  for (const name of reg.include || []) set.add(name);
  return set;
}
