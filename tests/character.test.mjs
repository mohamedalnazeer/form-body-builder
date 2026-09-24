import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacter } from '../src/character/geometry.js';
import { characterPose } from '../src/character/motion.js';
import { HAIRSTYLES, OUTFITS, normalizeProfile } from '../src/character/config.js';
import { defaultProfile, validState, createDemo } from '../src/domain.js';
import { weightKg, weightValue, heightCm, heightValue, formatHeight } from '../src/units.js';
test('unit round trips preserve canonical measurements', () => {
  for (const units of ['metric', 'imperial'])
    for (const v of [30, 78.12345, 182.88, 299.99]) {
      assert.ok(Math.abs(weightKg(weightValue(v, units), units) - v) < 1e-10);
      assert.ok(Math.abs(heightCm(heightValue(v, units), units) - v) < 1e-10);
    }
  assert.equal(formatHeight(182.88, 'imperial'), '6′ 0″');
});
test('all styles and outfits produce finite indexed meshes with valid hierarchy', () => {
  for (const h of HAIRSTYLES)
    for (const o of OUTFITS) {
      const r = buildCharacter({ ...defaultProfile, hairStyle: h.id, outfit: o.id });
      const nodes = new Set(['']);
      for (const n of r.nodes) {
        assert.ok(nodes.has(n.parent));
        nodes.add(n.id);
      }
      for (const m of r.meshes) {
        assert.ok(nodes.has(m.parent));
        assert.equal(m.vertices.length, m.normals.length);
        assert.ok(m.vertices.every(Number.isFinite));
        assert.ok(m.normals.every(Number.isFinite));
        assert.ok(
          m.triangles.every((i) => Number.isInteger(i) && i >= 0 && i < m.vertices.length / 3),
        );
      }
      if (h.id === 'bald') assert.ok(!r.meshes.some((m) => m.id.startsWith('hair-')));
      if (o.id === 'physique')
        assert.ok(
          !r.meshes.some((m) => m.id.startsWith('clothing-') || m.id.startsWith('bottom-')),
        );
    }
});
test('shoulder, back and core progress affect the character independently', () => {
  const base = buildCharacter(defaultProfile);
  for (const group of ['Shoulders', 'Back', 'Core']) {
    const next = buildCharacter(defaultProfile, { muscle: { [group]: 0.1 } });
    assert.notDeepEqual(next, base);
  }
});
test('emotes settle to normal proportions and food disappears', () => {
  assert.equal(characterPose('meal', 4.2).food, false);
  assert.equal(characterPose('workout', 4.2).aura, 0);
  assert.ok(characterPose('meal', 1).food);
  assert.ok(characterPose('workout', 1).aura > 0);
});
test('legacy backups gain safe defaults; malformed character settings are rejected', () => {
  const data = createDemo();
  delete data.profile.units;
  delete data.profile.hairStyle;
  assert.equal(validState(data), true);
  assert.equal(normalizeProfile(data.profile).units, 'imperial');
  data.profile.outfit = 'bad';
  assert.equal(validState(data), false);
});
