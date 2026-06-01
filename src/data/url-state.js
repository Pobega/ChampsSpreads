// Shareable matchup URLs: pack the calc-relevant slices of STATE into a compact
// binary buffer and base64url-encode it into a single `s` query param. Numeric
// PokeAPI IDs (not names) make the token tiny — a full matchup fits in ~35
// bytes, i.e. a ~47-char token, versus ~190 chars for a readable query string.
//
// Both functions are pure (no DOM, no window). The app layer (app.js) feeds in
// an augmented STATE (burn lives on attacker.status and the tailwind flags live
// on the DOM, so it folds them into `modifiers`) and applies a decoded object
// back onto the DOM, fetching Pokémon/moves by their numeric id.
//
// The token is opaque and not hand-editable — that's the deliberate trade for
// a much shorter URL. A version byte leads the buffer so the format can evolve.

const VERSION = 1;
const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// Stable enum tables — order is append-only; never reorder or the meaning of
// existing tokens shifts. These mirror the option values used in index.html /
// app.js (natures, items, ability lists, move types/categories, field state).
const NATURES = ['neutral', '+atk', '+spa', '+def', '+spd', '+spe'];
// Attacker and defender expose different held-item menus (see index.html), so
// each side gets its own table — sharing one would drop the other's items.
const ATK_ITEMS = ['none', 'choice_band', 'choice_specs', 'choice_scarf', 'life_orb', 'expert_belt', 'black_glasses_etc', 'mega_stone'];
const DEF_ITEMS = ['none', 'assault_vest', 'eviolite', 'berries', 'choice_scarf', 'mega_stone'];
const OFF_ABILITIES = ['none', 'huge-power', 'guts', 'adaptability', 'technician', 'sharpness', 'tough-claws', 'strong-jaw', 'sniper', 'transistor', 'steelworker', 'rocky-payload', 'supreme-overlord', 'iron-fist', 'mega-sol', 'fairy-aura'];
const DEF_ABILITIES = ['none', 'multiscale', 'shadow-shield', 'fluffy', 'ice-scales'];
const TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const CATEGORIES = ['physical', 'special', 'status'];
const WEATHERS = ['none', 'sun', 'rain', 'sandstorm', 'snow'];
const TERRAINS = ['none', 'electric', 'grassy', 'psychic', 'misty'];
const AURAS = ['none', 'fairy', 'dark'];

function idxOf(list, value) {
  const i = list.indexOf(value);
  return i < 0 ? 0 : i;
}

function clampByte(v) {
  v = Math.round(Number(v) || 0);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function bytesToBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Returns the base64url token (the value of the `s` param, no key/leading '?').
export function encodeMatchup(state) {
  const a = state.attacker || {};
  const d = state.defender || {};
  const m = state.move || {};
  const mod = state.modifiers || {};
  const bytes = [];

  const u8 = v => bytes.push(clampByte(v));
  const u16 = v => { const n = (Number(v) || 0) & 0xFFFF; bytes.push((n >> 8) & 0xFF, n & 0xFF); };
  const i8 = v => bytes.push(((Math.round(Number(v) || 0)) + 256) & 0xFF);

  u8(VERSION);

  u16(a.id || 0);
  u8(idxOf(NATURES, a.nature));
  u8(idxOf(ATK_ITEMS, a.item));
  u8(idxOf(OFF_ABILITIES, a.ability));
  STAT_ORDER.forEach(k => u8((a.sps && a.sps[k]) || 0));
  i8((a.boosts && a.boosts.atk) || 0);
  i8((a.boosts && a.boosts.spa) || 0);
  i8((a.boosts && a.boosts.spe) || 0);

  u16(d.id || 0);
  u8(idxOf(NATURES, d.nature));
  u8(idxOf(DEF_ITEMS, d.item));
  u8(idxOf(DEF_ABILITIES, d.ability));
  STAT_ORDER.forEach(k => u8((d.sps && d.sps[k]) || 0));
  i8((d.boosts && d.boosts.def) || 0);
  i8((d.boosts && d.boosts.spd) || 0);
  i8((d.boosts && d.boosts.spe) || 0);

  if (m.id) {
    u8(0); // move identified by numeric id
    u16(m.id);
  } else {
    u8(1); // custom move carries its own type/category/power
    u8(idxOf(TYPES, m.type));
    u8(idxOf(CATEGORIES, m.category));
    u8(m.power || 0);
  }

  let flags = 0;
  if (mod.spread) flags |= 1;
  if (mod.crit) flags |= 2;
  if (mod.screens) flags |= 4;
  if (mod.friendGuard) flags |= 8;
  if (mod.helpingHand) flags |= 16;
  if (mod.burn) flags |= 32;
  if (mod.tailAtk) flags |= 64;
  if (mod.tailDef) flags |= 128;
  u8(flags);

  u8((idxOf(WEATHERS, mod.weather) << 5) | (idxOf(TERRAINS, mod.terrain) << 2) | idxOf(AURAS, mod.aura));
  u8(((state.mode === 'survival' ? 1 : 0) << 1) | (state.targetKO === '2hko' ? 1 : 0));

  return bytesToBase64Url(bytes);
}

// Accepts a query string (with or without a leading '?'). Returns a normalized
// matchup object, or null when there's no usable `s` token. Never throws.
export function decodeMatchup(search) {
  let raw = String(search || '');
  if (raw[0] === '?') raw = raw.slice(1);
  const token = new URLSearchParams(raw).get('s');
  if (!token) return null;

  let bytes;
  try {
    bytes = base64UrlToBytes(token);
  } catch (err) {
    return null;
  }
  if (bytes.length < 5) return null;

  let p = 0;
  const u8 = () => bytes[p++] ?? 0;
  const u16 = () => { const v = ((bytes[p] ?? 0) << 8) | (bytes[p + 1] ?? 0); p += 2; return v; };
  const i8 = () => { const v = bytes[p++] ?? 0; return v > 127 ? v - 256 : v; };
  const sps = () => { const o = {}; STAT_ORDER.forEach(k => { o[k] = u8(); }); return o; };

  u8(); // version (only v1 today; reserved for future branching)

  const aId = u16();
  const aNature = NATURES[u8()] || 'neutral';
  const aItem = ATK_ITEMS[u8()] || 'none';
  const aAbility = OFF_ABILITIES[u8()] || 'none';
  const aSps = sps();
  const aBoosts = { atk: i8(), spa: i8(), spe: i8() };

  const dId = u16();
  const dNature = NATURES[u8()] || 'neutral';
  const dItem = DEF_ITEMS[u8()] || 'none';
  const dAbility = DEF_ABILITIES[u8()] || 'none';
  const dSps = sps();
  const dBoosts = { def: i8(), spd: i8(), spe: i8() };

  const moveCustom = u8() === 1;
  let move;
  if (moveCustom) {
    move = {
      id: null,
      apiName: null,
      type: TYPES[u8()] || 'Normal',
      category: CATEGORIES[u8()] || 'physical',
      power: u8(),
    };
  } else {
    move = { id: u16(), apiName: null, type: null, category: null, power: null };
  }

  const flags = u8();
  const env = u8();
  const panel = u8();

  return {
    attacker: { id: aId, nature: aNature, item: aItem, ability: aAbility, sps: aSps, boosts: aBoosts },
    defender: { id: dId, nature: dNature, item: dItem, ability: dAbility, sps: dSps, boosts: dBoosts },
    move,
    modifiers: {
      spread: !!(flags & 1),
      crit: !!(flags & 2),
      screens: !!(flags & 4),
      friendGuard: !!(flags & 8),
      helpingHand: !!(flags & 16),
      burn: !!(flags & 32),
      tailAtk: !!(flags & 64),
      tailDef: !!(flags & 128),
      weather: WEATHERS[(env >> 5) & 0x07] || 'none',
      terrain: TERRAINS[(env >> 2) & 0x07] || 'none',
      aura: AURAS[env & 0x03] || 'none',
    },
    mode: (panel >> 1) & 1 ? 'survival' : 'offensive',
    ko: panel & 1 ? '2hko' : 'ohko',
  };
}
