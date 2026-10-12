import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeBuild, decodeBuild } from '../src/lib/buildShare.mjs';

test('shared builds preserve armor, accessory slots, stats and abilities', () => {
  const build = { armorType: 'mail', gemLevel: 3, stats: { str: 300, agi: 200, int: 100, speedPoints: 0 }, acc1Id: '', acc2Id: 15, charmId: 4, charmLevel: 5, charmSlots: ['hp', 'magicDmg'], abilities: [null, 7, null, 12] };
  const result = decodeBuild(encodeBuild(build));
  assert.equal(result.armorType, 'mail');
  assert.deepEqual(result.accessories, ['', 15, '', '', '', '']);
  assert.deepEqual(result.stats, build.stats);
  assert.deepEqual(result.abilities, ['', 7, '', 12]);
  assert.equal(result.charms[0].id, 4);
});

test('malformed and impossible builds cannot crash the calculator', () => {
  assert.equal(decodeBuild('not-json'), null);
  assert.equal(decodeBuild('A'.repeat(12001)), null);
  assert.equal(decodeBuild(encodeBuild({ gemLevel: 1, stats: { str: 400, int: 400 } })), null);
  const value = decodeBuild(encodeBuild({ armorType: '__proto__', gemLevel: 100, stats: { str: -5 }, charmLevel: 900 }));
  assert.equal(value.armorType, 'plates');
  assert.equal(value.gemLevel, 12);
  assert.equal(value.stats.str, 0);
  assert.equal(value.charms[0].level, 100);
});
