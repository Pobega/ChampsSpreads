// Shareable matchup URLs: serialize the calc-relevant slices of STATE into a
// compact query string, and parse one back into a normalized plain object.
//
// Both functions are pure (no DOM, no window) so they unit-test cleanly. The
// app layer in app.js is responsible for reading the augmented state in (burn
// lives on attacker.status and the tailwind flags live straight on the DOM,
// so app.js folds them into the `modifiers` object it passes here) and for
// applying a decoded object back onto the DOM inputs.
//
// Schema (short keys, defaults omitted to keep URLs under Discord's truncation
// limit):
//   a/d   = attacker/defender apiName
//   aN/dN = nature, '+' stripped ('atk','spa','def','spd','spe','neutral')
//   aI/dI = item key (omitted when 'none')
//   aA/dA = ability apiName (omitted when 'none')
//   aS/dS = sps as hp.atk.def.spa.spd.spe
//   aB    = attacker boosts atk.spa.spe (omitted when 0.0.0)
//   dB    = defender boosts def.spd.spe (omitted when 0.0.0)
//   m     = move apiName, or 'custom'; when custom, mt/mp/mc = type/power/category
//   mod   = dot-joined flags {spread,crit,screens,friendGuard,helpingHand,
//           burn,tailAtk,tailDef} plus weather:<v>/terrain:<v>/aura:<v>
//   mode  = 'survival' (omitted when offensive); ko = '2hko' (omitted when ohko)

const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const NATURE_STATS = ['atk', 'spa', 'def', 'spd', 'spe'];
const MOD_FLAGS = ['spread', 'crit', 'screens', 'friendGuard', 'helpingHand', 'burn', 'tailAtk', 'tailDef'];

function natureShort(nature) {
  if (!nature || nature === 'neutral') return 'neutral';
  return String(nature).replace('+', '');
}

function natureLong(short) {
  return NATURE_STATS.includes(short) ? '+' + short : 'neutral';
}

function intOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function spsToStr(sps) {
  const s = sps || {};
  return STAT_ORDER.map(k => intOr(s[k], 0)).join('.');
}

function spsFromStr(str) {
  const parts = String(str || '').split('.');
  const out = {};
  STAT_ORDER.forEach((k, i) => { out[k] = Math.max(0, intOr(parts[i], 0)); });
  return out;
}

function boostsToStr(boosts, keys) {
  const b = boosts || {};
  return keys.map(k => intOr(b[k], 0)).join('.');
}

function boostsFromStr(str, keys) {
  const parts = String(str || '').split('.');
  const out = {};
  keys.forEach((k, i) => { out[k] = intOr(parts[i], 0); });
  return out;
}

export function encodeMatchup(state) {
  const a = state.attacker || {};
  const d = state.defender || {};
  const m = state.move || {};
  const mod = state.modifiers || {};
  const parts = [];
  const add = (k, v) => parts.push(`${k}=${v}`);

  if (a.apiName) add('a', a.apiName);
  if (a.nature) add('aN', natureShort(a.nature));
  if (a.item && a.item !== 'none') add('aI', a.item);
  if (a.ability && a.ability !== 'none') add('aA', a.ability);
  if (a.sps) add('aS', spsToStr(a.sps));
  const aB = boostsToStr(a.boosts, ['atk', 'spa', 'spe']);
  if (aB !== '0.0.0') add('aB', aB);

  if (d.apiName) add('d', d.apiName);
  if (d.nature) add('dN', natureShort(d.nature));
  if (d.item && d.item !== 'none') add('dI', d.item);
  if (d.ability && d.ability !== 'none') add('dA', d.ability);
  if (d.sps) add('dS', spsToStr(d.sps));
  const dB = boostsToStr(d.boosts, ['def', 'spd', 'spe']);
  if (dB !== '0.0.0') add('dB', dB);

  if (m.apiName) {
    add('m', m.apiName);
  } else {
    add('m', 'custom');
    if (m.type) add('mt', m.type);
    if (m.power != null) add('mp', String(m.power));
    if (m.category) add('mc', m.category);
  }

  const flags = MOD_FLAGS.filter(f => mod[f]);
  if (mod.weather && mod.weather !== 'none') flags.push('weather:' + mod.weather);
  if (mod.terrain && mod.terrain !== 'none') flags.push('terrain:' + mod.terrain);
  if (mod.aura && mod.aura !== 'none') flags.push('aura:' + mod.aura);
  if (flags.length) add('mod', flags.join('.'));

  if (state.mode === 'survival') add('mode', 'survival');
  if (state.targetKO === '2hko') add('ko', '2hko');

  return parts.join('&');
}

export function decodeMatchup(search) {
  let raw = String(search || '');
  if (raw[0] === '?') raw = raw.slice(1);
  const params = new URLSearchParams(raw);

  // Nothing to restore unless at least one Pokémon is named.
  if (!params.has('a') && !params.has('d')) return null;

  const modStr = params.get('mod') || '';
  const modTokens = modStr ? modStr.split('.') : [];
  const modifiers = {
    spread: false, crit: false, screens: false, friendGuard: false,
    helpingHand: false, burn: false, tailAtk: false, tailDef: false,
    weather: 'none', terrain: 'none', aura: 'none'
  };
  for (const token of modTokens) {
    const colon = token.indexOf(':');
    if (colon === -1) {
      if (MOD_FLAGS.includes(token)) modifiers[token] = true;
    } else {
      const prefix = token.slice(0, colon);
      const value = token.slice(colon + 1);
      if (prefix === 'weather' || prefix === 'terrain' || prefix === 'aura') {
        modifiers[prefix] = value;
      }
    }
  }

  const moveKey = params.get('m');
  const move = (!moveKey || moveKey === 'custom')
    ? {
        apiName: null,
        type: params.get('mt') || 'Normal',
        power: Math.max(0, intOr(params.get('mp'), 80)),
        category: params.get('mc') || 'physical'
      }
    : { apiName: moveKey, type: null, power: null, category: null };

  return {
    attacker: {
      apiName: params.get('a') || '',
      nature: natureLong(params.get('aN')),
      item: params.get('aI') || 'none',
      ability: params.get('aA') || 'none',
      sps: spsFromStr(params.get('aS')),
      boosts: boostsFromStr(params.get('aB'), ['atk', 'spa', 'spe'])
    },
    defender: {
      apiName: params.get('d') || '',
      nature: natureLong(params.get('dN')),
      item: params.get('dI') || 'none',
      ability: params.get('dA') || 'none',
      sps: spsFromStr(params.get('dS')),
      boosts: boostsFromStr(params.get('dB'), ['def', 'spd', 'spe'])
    },
    move,
    modifiers,
    mode: params.get('mode') === 'survival' ? 'survival' : 'offensive',
    ko: params.get('ko') === '2hko' ? '2hko' : 'ohko'
  };
}
