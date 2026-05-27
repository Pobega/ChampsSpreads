// Move classification tags used by ability modifiers.
// PokeAPI does not expose these flags directly, so we maintain them by hand.
// Add new moves as users hit them.

export const SLICING_MOVES = new Set([
  'leaf-blade', 'sacred-sword', 'kowtow-cleave', 'aqua-cutter',
  'slash', 'night-slash', 'air-slash', 'psyblade', 'x-scissor',
  'aerial-ace',
]);

export const CONTACT_MOVES = new Set([
  'fake-out', 'close-combat', 'u-turn', 'sucker-punch', 'flare-blitz',
  'wood-hammer', 'triple-axel', 'knock-off', 'high-jump-kick',
  'drain-punch', 'thunder-punch', 'ice-punch', 'fire-punch',
  'brave-bird', 'extreme-speed', 'bullet-punch',
]);

export const BITING_MOVES = new Set([
  'crunch', 'psychic-fangs', 'thunder-fang', 'ice-fang', 'fire-fang',
  'fishious-rend', 'bite', 'hyper-fang',
]);

export const PUNCHING_MOVES = new Set([
  'drain-punch', 'ice-punch', 'thunder-punch', 'fire-punch',
  'bullet-punch', 'mach-punch', 'rage-fist', 'shadow-punch',
  'focus-punch', 'meteor-mash', 'ice-hammer', 'hammer-arm',
]);
