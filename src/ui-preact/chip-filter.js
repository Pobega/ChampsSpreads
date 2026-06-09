// Shared chip-filter state logic for the dex-style browser pages (Pokédex,
// Attackdex, and any future page with the same stackable-search UX). A page's
// store carries `filters` (the committed chips, ANDed together) and `draft` (the
// uncommitted input text, live-previewed before Enter). This factory wires the
// standard mutators so every page behaves identically — commit on Enter (skipping
// blanks and case-insensitive duplicates), remove one chip, clear all, update the
// live draft.
//
// `onActivate` is an optional async hook run after any change that leaves a term
// active (a committed chip or a non-empty draft). Lazy pages pass their
// "ensure every row's details are loaded" routine here, since type/category/move
// search reads attributes the lazy browse hasn't fetched yet; the hook is expected
// to be a no-op once everything is loaded.
export function makeChipFilter(store, notify, { onActivate } = {}) {
  const hasActiveTerm = () => store.filters.length > 0 || store.draft.trim() !== '';
  const maybeActivate = async () => {
    if (onActivate && hasActiveTerm()) await onActivate();
  };

  // Lock a specific value in as a chip (skipping blanks + case-insensitive dupes)
  // and clear the draft. Used both for the typed draft (commit) and for a picked
  // autocomplete suggestion (commitValue), so the two stay consistent.
  async function commitValue(value) {
    const term = (value || '').trim();
    store.draft = '';
    if (term && !store.filters.some((f) => f.toLowerCase() === term.toLowerCase())) {
      store.filters = [...store.filters, term];
    }
    notify();
    await maybeActivate();
  }

  return {
    hasActiveTerm,

    async setDraft(text) {
      store.draft = text;
      notify();
      await maybeActivate();
    },

    commit() {
      return commitValue(store.draft);
    },

    commitValue,

    // Add the term as a chip, or remove it if already present (case-insensitive).
    // Backs preset filter buttons that map a label to a keyword chip (e.g. the
    // Abilitydex Offensive / Defensive toggles). When `group` is given, the term
    // belongs to a mutually-exclusive set: turning it on first clears any other
    // active group member (so Offensive / Defensive can't both be on — no ability
    // is both).
    async toggle(value, group) {
      const term = (value || '').trim();
      if (!term) return;
      const lower = term.toLowerCase();
      if (store.filters.some((f) => f.toLowerCase() === lower)) {
        store.filters = store.filters.filter((f) => f.toLowerCase() !== lower);
        notify();
        return;
      }
      const groupLower = new Set((group || []).map((g) => g.toLowerCase()));
      store.filters = [...store.filters.filter((f) => !groupLower.has(f.toLowerCase())), term];
      notify();
      await maybeActivate();
    },

    remove(index) {
      store.filters = store.filters.filter((_, i) => i !== index);
      notify();
    },

    clear() {
      store.filters = [];
      store.draft = '';
      notify();
    },
  };
}
