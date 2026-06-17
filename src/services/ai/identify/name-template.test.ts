/**
 * Vanilla node:test suite for the name templating (APP-29 GATE-5).
 *
 * GATE-5: the template, given a Category + palette label / dominant color,
 * MUST return a non-empty string (length ≥ 3), AND different categories must
 * produce different name shapes (the template uses the category to vary the
 * noun).
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { Category } from '../../../types/wardrobe.ts';

import { templateName } from './name-template.ts';

const PALETTE = 'Warm neutral';

test('templateName: returns a non-empty string (length ≥ 3) for every category', () => {
  const categories: Category[] = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];
  for (const c of categories) {
    const name = templateName(c, PALETTE);
    assert.equal(typeof name, 'string', `${c} returns a string`);
    assert.ok(name.length >= 3, `${c} → "${name}" has length ≥ 3`);
  }
});

test('templateName: different categories produce different name shapes (noun varies by category)', () => {
  const top = templateName('Tops', PALETTE);
  const bottom = templateName('Bottoms', PALETTE);
  const outer = templateName('Outerwear', PALETTE);
  const shoes = templateName('Shoes', PALETTE);
  const acc = templateName('Accessories', PALETTE);

  const names = [top, bottom, outer, shoes, acc];
  const uniq = new Set(names);
  assert.equal(uniq.size, names.length, `all five category names are distinct: ${names.join(' | ')}`);
});

test('templateName: capitalizes the first letter (boutique-editorial style)', () => {
  const name = templateName('Tops', PALETTE);
  assert.match(name, /^[A-Z]/, `name "${name}" starts with an uppercase letter`);
});

test('templateName: different palette labels can vary the noun within a category', () => {
  // The template hashes the palette label to pick a noun from the per-category
  // set, so changing the palette should sometimes produce a different noun.
  // We try several palette labels and assert at least two distinct results.
  const labels = ['Warm neutral', 'Cognac', 'Cool blue', 'Sage', 'Charcoal', 'Navy', 'Burgundy'];
  const names = labels.map((l) => templateName('Tops', l));
  const uniq = new Set(names);
  assert.ok(
    uniq.size >= 2,
    `at least two distinct Tops names across palettes: ${[...uniq].join(' | ')}`,
  );
});

test('templateName: deterministic — same inputs produce the same output', () => {
  const a = templateName('Outerwear', 'Cognac');
  const b = templateName('Outerwear', 'Cognac');
  assert.equal(a, b);
});

test('templateName: empty palette label still produces a valid non-empty name', () => {
  const name = templateName('Tops', '');
  assert.ok(name.length >= 3, `even empty palette label produces a name: "${name}"`);
});
