const id = value => typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.length <= 128 ? value : '';
const integer = (value, min, max) => Math.min(max, Math.max(min, Math.trunc(Number(value) || 0)));

export function decodeBuild(encoded) {
  if (!encoded || encoded.length > 12000) return null;
  try {
    const value = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!value || typeof value !== 'object' || !value.stats) return null;
    const gemLevel = integer(value.gemLevel, 0, 12);
    const stats = Object.fromEntries(['str', 'agi', 'int', 'speedPoints'].map(key => [key, integer(value.stats[key], 0, gemLevel * 400)]));
    if (Object.values(stats).reduce((sum, v) => sum + v, 0) > gemLevel * 400) return null;
    return {
      armorType: ['plates', 'mail', 'leather', 'cloth'].includes(value.armorType) ? value.armorType : 'plates',
      gemLevel, stats,
      accessories: ['acc1Id', 'acc2Id', 'gemAcc1Id', 'gemAcc2Id', 'gemAcc3Id', 'gemAcc4Id'].map(key => id(value[key])),
      charms: [{ id: id(value.charmId), level: integer(value.charmLevel, 1, 100), slots: Array.isArray(value.charmSlots) ? value.charmSlots.filter(v => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(v)).slice(0, 4) : [] }],
      abilities: Array.isArray(value.abilities) ? value.abilities.slice(0, 9).map(id) : [],
    };
  } catch { return null; }
}

export function encodeBuild(build) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(build))));
}
