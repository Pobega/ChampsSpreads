// Pure UI render helpers shared across the Preact islands: type→Tailwind color
// and nature-id→display-name lookups. Both are pure (no STATE, no DOM); the rest
// of the old vanilla rendering (dropdown colors, move badges, option cards, stat
// bars, search placeholders) moved into the islands during the Preact migration.

const TYPE_BG_CLASSES = {
  Normal: 'bg-neutral-500',
  Fire: 'bg-orange-600',
  Water: 'bg-blue-500',
  Grass: 'bg-green-600',
  Electric: 'bg-yellow-500',
  Ice: 'bg-cyan-400 text-slate-900',
  Fighting: 'bg-red-700',
  Poison: 'bg-purple-600',
  Ground: 'bg-amber-600',
  Flying: 'bg-indigo-400 text-slate-900',
  Psychic: 'bg-pink-600',
  Bug: 'bg-lime-600',
  Rock: 'bg-yellow-700',
  Ghost: 'bg-violet-700',
  Dragon: 'bg-indigo-700',
  Dark: 'bg-stone-800',
  Steel: 'bg-slate-500',
  Fairy: 'bg-pink-400 text-slate-900',
};

export function getTypeBgClass(type) {
  return TYPE_BG_CLASSES[type] || 'bg-slate-700';
}

const NATURE_DISPLAY = {
  'neutral': 'Neutral',
  '+atk': '+Atk',
  '+spa': '+SpAtk',
  '+def': '+Def',
  '+spd': '+SpDef',
  '+spe': '+Spe',
};

export function formatNatureDisplayName(natId) {
  return NATURE_DISPLAY[natId.toLowerCase()] || natId;
}
