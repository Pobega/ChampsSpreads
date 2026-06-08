// Smart default nature + SP spread. When a Pokémon is chosen the calculator used
// to leave whatever spread was last set (a physical +atk attacker, a +def wall),
// which made no sense for, say, a freshly-picked Flutter Mane. This picks a spread
// that fits the mon's base stats, mirroring the presets the cards already expose.
//
// Both functions are pure: they take only base stats and return a flat
// { nature, sps } object the caller assigns onto STATE. The returned spreads are
// exactly the card presets (AttackerCard / DefenderCard PRESETS) so a defaulted
// mon lights up the matching preset chip in the UI.

// Base Speed below this is treated as too slow to benefit from Speed investment,
// so the 32 that would go into Spe is banked into HP bulk instead.
const SLOW_SPEED = 60;

// Attacker: lean into the higher attacking stat (ties go physical, matching the
// pickDefaultMove tie-break), and put the second 32 into Spe — or HP for slow mons
// (base Spe < 60), which can't outspeed much and would rather have the bulk.
export function pickAttackerSpread(baseStats) {
  const atk = baseStats?.atk || 0;
  const spa = baseStats?.spa || 0;
  const speedOrHp = (baseStats?.spe || 0) < SLOW_SPEED ? { hp: 32, spe: 0 } : { hp: 0, spe: 32 };
  return atk >= spa
    ? { nature: '+atk', sps: { atk: 32, spa: 0, ...speedOrHp } }
    : { nature: '+spa', sps: { atk: 0, spa: 32, ...speedOrHp } };
}

// Defender: most mons don't run dedicated defensive bulk, so default a freshly-picked
// defender to the same attacker spread rather than a wall — it inherits the attacker's
// Spe-or-HP split (slow mons get HP, fast mons Spe) and offense-leaning nature, with
// no Def/SpD investment. The Def/SpD keys are zeroed so any defensive spread from a
// previous selection is cleared. (An offensive nature like +atk leaves the defender's
// Def/SpD unmodified, i.e. defensively neutral.)
export function pickDefenderSpread(baseStats) {
  const { nature, sps } = pickAttackerSpread(baseStats);
  return { nature, sps: { def: 0, spd: 0, ...sps } };
}
