// Damage roll calculator for Pokemon Champions rules.

import { calculateStat, calculateStatBoost, getTypeEffectiveness } from './stats.js';

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

  const levelFactor = 22;
  const baseDamage = Math.floor(Math.floor((levelFactor * move.power * effectiveAtk) / 50) / effectiveDef) + 2;

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

  if (isPhysical && attacker.ability !== 'guts' && attacker.status === 'burned') {
    mod *= 0.5;
  }

  let attackerAbilityMod = 1.0;
  const moveNameLower = move.apiName ? move.apiName.toLowerCase() : "";

  if (attacker.ability === 'technician' && move.power > 0 && move.power <= 60) {
    attackerAbilityMod *= 1.5;
  } else if (attacker.ability === 'sharpness') {
    const slicingMoves = ['leaf-blade', 'sacred-sword', 'kowtow-cleave', 'aqua-cutter', 'slash', 'night-slash', 'air-slash', 'psyblade', 'x-scissor', 'sasha', 'aerial-ace'];
    if (slicingMoves.includes(moveNameLower)) {
      attackerAbilityMod *= 1.5;
    }
  } else if (attacker.ability === 'tough-claws') {
    const contactMoves = ['fake-out', 'close-combat', 'u-turn', 'sucker-punch', 'flare-blitz', 'wood-hammer', 'triple-axel', 'knock-off', 'high-jump-kick', 'drain-punch', 'thunder-punch', 'ice-punch', 'fire-punch', 'brave-bird', 'extreme-speed', 'bullet-punch'];
    if (contactMoves.includes(moveNameLower)) {
      attackerAbilityMod *= 1.3;
    }
  } else if (attacker.ability === 'strong-jaw') {
    const bitingMoves = ['crunch', 'psychic-fangs', 'thunder-fang', 'ice-fang', 'fire-fang', 'fishious-rend', 'bite', 'hyper-fang'];
    if (bitingMoves.includes(moveNameLower)) {
      attackerAbilityMod *= 1.5;
    }
  } else if (attacker.ability === 'iron-fist') {
    const punchingMoves = ['drain-punch', 'ice-punch', 'thunder-punch', 'fire-punch', 'bullet-punch', 'mach-punch', 'rage-fist', 'shadow-punch', 'focus-punch', 'meteor-mash', 'ice-hammer', 'hammer-arm'];
    if (punchingMoves.includes(moveNameLower)) {
      attackerAbilityMod *= 1.2;
    }
  } else if (attacker.ability === 'transistor' && move.type === 'Electric') {
    attackerAbilityMod *= 1.3;
  } else if (attacker.ability === 'steelworker' && move.type === 'Steel') {
    attackerAbilityMod *= 1.5;
  } else if (attacker.ability === 'rocky-payload' && move.type === 'Rock') {
    attackerAbilityMod *= 1.5;
  } else if (attacker.ability === 'supreme-overlord') {
    attackerAbilityMod *= 1.5;
  }
  mod *= attackerAbilityMod;

  let screenMod = modifiers.screens ? 0.66 : 1.0;
  mod *= screenMod;

  let defenderAbilityMod = 1.0;
  if (defender.ability === 'multiscale' || defender.ability === 'shadow-shield') {
    defenderAbilityMod = 0.5;
  } else if (defender.ability === 'fluffy' && isPhysical) {
    defenderAbilityMod = 0.5;
  } else if (defender.ability === 'ice-scales' && !isPhysical) {
    defenderAbilityMod = 0.5;
  }
  mod *= defenderAbilityMod;

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
