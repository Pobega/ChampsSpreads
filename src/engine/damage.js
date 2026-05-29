// Damage roll calculator for Pokemon Champions rules.

import { calculateStat, calculateStatBoost, getTypeEffectiveness } from './stats.js';
import { attackerAbilityMultiplier, defenderAbilityMultiplier } from './abilities.js';

// Effective Speed including stat boosts, used to infer turn order.
function effectiveSpeed(mon) {
  const base = calculateStat('spe', mon.baseStats.spe, mon.sps.spe, mon.nature, false);
  return calculateStatBoost(base, mon.boosts.spe || 0);
}

export function calculateDamageRolls(attacker, defender, move, modifiers) {
  const isPhysical = move.category.toLowerCase() === 'physical';
  const atkStatName = isPhysical ? 'atk' : 'spa';
  const defStatName = isPhysical ? 'def' : 'spd';

  let baseAtkVal = calculateStat(atkStatName, attacker.baseStats[atkStatName], attacker.sps[atkStatName], attacker.nature, false);
  let baseDefVal = calculateStat(defStatName, defender.baseStats[defStatName], defender.sps[defStatName], defender.nature, false);

  let effectiveAtk = calculateStatBoost(baseAtkVal, attacker.boosts[atkStatName] || 0);
  let effectiveDef = calculateStatBoost(baseDefVal, defender.boosts[defStatName] || 0);

  if (attacker.item === 'choice_band' && isPhysical) {
    effectiveAtk = Math.floor(effectiveAtk * 1.5);
  } else if (attacker.item === 'choice_specs' && !isPhysical) {
    effectiveAtk = Math.floor(effectiveAtk * 1.5);
  }

  if (attacker.ability === 'huge-power' && isPhysical) {
    effectiveAtk = Math.floor(effectiveAtk * 2.0);
  } else if (attacker.ability === 'guts' && isPhysical) {
    effectiveAtk = Math.floor(effectiveAtk * 1.5);
  }

  if (defender.item === 'assault_vest' && !isPhysical) {
    effectiveDef = Math.floor(effectiveDef * 1.5);
  } else if (defender.item === 'eviolite') {
    effectiveDef = Math.floor(effectiveDef * 1.5);
  }

  if (modifiers.weather === 'sandstorm' && defender.types.includes('Rock') && defStatName === 'spd') {
    effectiveDef = Math.floor(effectiveDef * 1.5);
  }
  if (modifiers.weather === 'snow' && defender.types.includes('Ice') && defStatName === 'def') {
    effectiveDef = Math.floor(effectiveDef * 1.5);
  }

  let effectivePower = move.power;
  if (move.apiName === 'acrobatics' && (!attacker.item || attacker.item === 'none')) {
    effectivePower *= 2;
  }

  // Conditional power multipliers driven by battle state.
  if (move.apiName === 'knock-off' && defender.item && defender.item !== 'none') {
    effectivePower = Math.floor(effectivePower * 1.5);
  }
  if (move.apiName === 'facade' && attacker.status) {
    effectivePower *= 2;
  }
  if (move.apiName === 'hex' && defender.status) {
    effectivePower *= 2;
  }
  if (move.apiName === 'bolt-beak' || move.apiName === 'fishious-rend') {
    // Doubles if the user moves first. Default to comparing effective Speed,
    // but let an explicit modifier override it (Trick Room, Choice Scarf,
    // switch-ins, etc.).
    const movesFirst = modifiers.movesFirst != null
      ? modifiers.movesFirst
      : effectiveSpeed(attacker) > effectiveSpeed(defender);
    if (movesFirst) {
      effectivePower *= 2;
    }
  }
  if (move.apiName === 'payback') {
    // The inverse of Bolt Beak: doubles when the user moves last.
    const movesSecond = modifiers.movesFirst != null
      ? !modifiers.movesFirst
      : effectiveSpeed(attacker) < effectiveSpeed(defender);
    if (movesSecond) {
      effectivePower *= 2;
    }
  }

  const levelFactor = 22;
  const baseDamage = Math.floor(Math.floor((levelFactor * effectivePower * effectiveAtk) / 50) / effectiveDef) + 2;

  let mod = 1.0;

  if (modifiers.spread) {
    mod *= 0.75;
  }

  if (modifiers.weather === 'sun') {
    if (move.type === 'Fire') {
      mod *= 1.5;
    } else if (move.type === 'Water') {
      mod *= 0.5;
    }
  } else if (modifiers.weather === 'rain') {
    if (move.type === 'Water') {
      mod *= 1.5;
    } else if (move.type === 'Fire') {
      mod *= 0.5;
    }
  }

  if (modifiers.crit) {
    mod *= (attacker.ability === 'sniper' ? 2.25 : 1.5);
  }

  let stab = 1.0;
  if (attacker.types.includes(move.type)) {
    stab = attacker.ability === 'adaptability' ? 2.0 : 1.5;
  }
  mod *= stab;

  const typeMult = getTypeEffectiveness(move.type, defender.types);
  mod *= typeMult;

  if (isPhysical && attacker.ability !== 'guts' && attacker.status === 'burned' && move.apiName !== 'facade') {
    mod *= 0.5;
  }

  if ((move.apiName === 'collision-course' || move.apiName === 'electro-drift') && typeMult > 1.0) {
    mod *= 5461 / 4096;
  }

  const abilityCtx = { move, isPhysical, attacker, defender };
  mod *= attackerAbilityMultiplier(attacker.ability, abilityCtx);

  let screenMod = modifiers.screens ? 0.66 : 1.0;
  mod *= screenMod;

  mod *= defenderAbilityMultiplier(defender.ability, abilityCtx);

  let terrainMod = 1.0;
  if (modifiers.terrain === 'electric' && move.type === 'Electric' && !attacker.types.includes('Flying')) {
    terrainMod = 1.3;
  } else if (modifiers.terrain === 'grassy' && move.type === 'Grass' && !attacker.types.includes('Flying')) {
    terrainMod = 1.3;
  } else if (modifiers.terrain === 'grassy' && move.type === 'Ground') {
    terrainMod = 0.5;
  } else if (modifiers.terrain === 'psychic' && move.type === 'Psychic' && !attacker.types.includes('Flying')) {
    terrainMod = 1.3;
  } else if (modifiers.terrain === 'misty' && move.type === 'Dragon' && !defender.types.includes('Flying')) {
    terrainMod = 0.5;
  }
  mod *= terrainMod;

  let auraMod = 1.0;
  if (modifiers.aura === 'fairy' && move.type === 'Fairy') {
    auraMod = 1.33;
  } else if (modifiers.aura === 'dark' && move.type === 'Dark') {
    auraMod = 1.33;
  }
  mod *= auraMod;

  let friendGuardMod = modifiers.friendGuard ? 0.75 : 1.0;
  mod *= friendGuardMod;

  if (modifiers.helpingHand) {
    mod *= 1.5;
  }

  if (attacker.item === 'life_orb') {
    mod *= 1.3;
  } else if (attacker.item === 'expert_belt' && typeMult > 1.0) {
    mod *= 1.2;
  } else if (attacker.item === 'black_glasses_etc') {
    mod *= 1.2;
  }

  if (defender.item === 'berries' && typeMult > 1.0) {
    mod *= 0.5;
  }

  const rolls = [];
  for (let r = 85; r <= 100; r++) {
    const rollVal = Math.floor(baseDamage * (r / 100));
    const finalDamage = Math.floor(rollVal * mod);
    rolls.push(finalDamage);
  }

  return rolls;
}
