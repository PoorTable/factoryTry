/**
 * Vanilla node:test suite for the Iris persona prompt builder (APP-30 GATE-4).
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { CoachRequest } from '../schemas.ts';

import { buildIrisSystemPrompt } from './persona.ts';

const SEED_WARDROBE: CoachRequest['wardrobe'] = {
  items: [
    { id: 'i1', name: 'Linen camp shirt', category: 'Tops', swatches: ['#D8C3A5'], wornCount: 4 },
    { id: 'i2', name: 'Wool trench', category: 'Outerwear', swatches: ['#6B5F52'], wornCount: 1 },
    { id: 'i3', name: 'Pleated trouser', category: 'Bottoms', swatches: ['#B89368'], wornCount: 7 },
    { id: 'i5', name: 'Suede loafer', category: 'Shoes', swatches: ['#A35836'], wornCount: 2 },
  ],
  outfits: [
    { id: 'o5', name: 'Quiet luxury', vibe: 91, itemIds: ['i2', 'i3', 'i5'] },
  ],
  profile: {
    paletteName: 'Warm Autumn',
    tagline: 'quiet, layered, tactile',
    palette: [{ hex: '#A35836', name: 'Cognac', pct: 30 }],
    insight: 'You wear cognac and camel a lot.',
  },
};

test('buildIrisSystemPrompt: returns a non-empty string', () => {
  const out = buildIrisSystemPrompt(SEED_WARDROBE);
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 50, `prompt has substance — length ${out.length}`);
});

test('buildIrisSystemPrompt: declares the Iris persona', () => {
  const out = buildIrisSystemPrompt(SEED_WARDROBE);
  assert.match(out, /Iris/);
  assert.match(out, /warm|editorial|concise/i);
  assert.match(out, /never invent/i);
});

test('buildIrisSystemPrompt: includes every item id, name, and category', () => {
  const out = buildIrisSystemPrompt(SEED_WARDROBE);
  for (const it of SEED_WARDROBE.items) {
    assert.ok(out.includes(it.id), `prompt mentions ${it.id}`);
    assert.ok(out.includes(it.name), `prompt mentions "${it.name}"`);
    assert.ok(out.includes(it.category), `prompt mentions ${it.category}`);
  }
});

test('buildIrisSystemPrompt: includes the style profile name + tagline', () => {
  const out = buildIrisSystemPrompt(SEED_WARDROBE);
  assert.ok(out.includes(SEED_WARDROBE.profile.paletteName));
  assert.ok(out.includes(SEED_WARDROBE.profile.tagline));
});

test('buildIrisSystemPrompt: includes saved outfits with vibe + itemIds', () => {
  const out = buildIrisSystemPrompt(SEED_WARDROBE);
  for (const o of SEED_WARDROBE.outfits) {
    assert.ok(out.includes(o.name), `prompt mentions outfit "${o.name}"`);
    assert.ok(out.includes(String(o.vibe)), `prompt mentions vibe ${o.vibe}`);
    for (const id of o.itemIds) {
      assert.ok(out.includes(id), `prompt mentions outfit member ${id}`);
    }
  }
});

test('buildIrisSystemPrompt: includes the 20-turn windowing reminder', () => {
  const out = buildIrisSystemPrompt(SEED_WARDROBE);
  assert.match(out, /20/);
});

test('buildIrisSystemPrompt: empty wardrobe still produces a valid prompt', () => {
  const empty: CoachRequest['wardrobe'] = {
    items: [],
    outfits: [],
    profile: SEED_WARDROBE.profile,
  };
  const out = buildIrisSystemPrompt(empty);
  assert.ok(out.length > 50);
  assert.match(out, /empty/i);
});

test('buildIrisSystemPrompt: deterministic — same input → same output', () => {
  const a = buildIrisSystemPrompt(SEED_WARDROBE);
  const b = buildIrisSystemPrompt(SEED_WARDROBE);
  assert.equal(a, b);
});
