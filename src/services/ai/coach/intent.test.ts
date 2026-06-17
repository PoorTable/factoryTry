/**
 * Vanilla node:test suite for the coach intent classifier (APP-30 GATE-4).
 *
 * Runs under `node --experimental-strip-types --test`; uses relative imports
 * so the strip-types loader can resolve everything without bundler help.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { classifyIntent } from './intent.ts';

test('classifyIntent: routes explicit outfit asks to "outfit"', () => {
  const asks = [
    'What should I wear tonight?',
    'Build me an outfit for dinner',
    'Put together a look for me',
    'Suggest an outfit please',
    'fit check?',
    'Surprise me',
    'style me for a date',
  ];
  for (const a of asks) {
    assert.equal(classifyIntent(a), 'outfit', `"${a}" should classify as outfit`);
  }
});

test('classifyIntent: routes explicit color/palette asks to "palette"', () => {
  const asks = [
    'What colors go with cognac?',
    'Which colours work with this top?',
    'Do these colors clash?',
    'What palette suits me?',
    'show me the swatches',
    'what matches with the trench?',
  ];
  for (const a of asks) {
    assert.equal(classifyIntent(a), 'palette', `"${a}" should classify as palette`);
  }
});

test('classifyIntent: defaults conversational input to "text"', () => {
  const asks = [
    'Hi Iris',
    'I love the look from yesterday',
    'How are you?',
    'thanks',
    'what do you think about quiet luxury',
  ];
  for (const a of asks) {
    assert.equal(classifyIntent(a), 'text', `"${a}" should default to text`);
  }
});

test('classifyIntent: prefers palette over outfit when both phrases appear', () => {
  // "what colors go with this outfit" — palette wins.
  assert.equal(classifyIntent('what colors go with this outfit?'), 'palette');
  assert.equal(classifyIntent('which colours pair with the look?'), 'palette');
});

test('classifyIntent: handles empty / whitespace / non-string defensively', () => {
  assert.equal(classifyIntent(''), 'text');
  assert.equal(classifyIntent('   '), 'text');
  // @ts-expect-error — defensive guard against runtime callers passing junk
  assert.equal(classifyIntent(null), 'text');
  // @ts-expect-error — defensive guard against runtime callers passing junk
  assert.equal(classifyIntent(undefined), 'text');
});

test('classifyIntent: case-insensitive', () => {
  assert.equal(classifyIntent('WHAT SHOULD I WEAR??'), 'outfit');
  assert.equal(classifyIntent('WHAT COLORS WORK?'), 'palette');
});

test('classifyIntent: deterministic — same input → same output', () => {
  assert.equal(classifyIntent('build me a look'), classifyIntent('build me a look'));
  assert.equal(classifyIntent('hi there'), classifyIntent('hi there'));
});
