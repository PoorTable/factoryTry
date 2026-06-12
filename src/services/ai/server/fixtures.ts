/**
 * Canned fixtures returned by API routes when mock mode is on
 * (`EXPO_PUBLIC_AI_MOCK=1` — see ./anthropic.ts `isMockMode`).
 *
 * Content matches the design handoff so screen tickets and the factory
 * reviewer render the spec'd data without a live Claude key: the garment tag
 * set ("Cashmere mock"), the "Quiet luxury" outfit reply, and the
 * "Warm Autumn" palette (reused verbatim from the seed data, which was
 * itself ported from the handoff).
 */

import { SEED_PROFILE } from '@/data/seed';
import type { StyleProfile } from '@/types/wardrobe';

import type { ChatReply, CoachResponse, GarmentTags, IdentifyResult } from '../schemas';

/** Vision-tagging fixture — the handoff's signature garment, "Cashmere mock". */
export const MOCK_GARMENT_TAGS: GarmentTags = {
  name: 'Cashmere mock',
  category: 'Tops',
  color: '#A35836',
  swatches: ['#A35836', '#8A4426'],
  season: 'fall',
};

/**
 * Identify fixture — the camera screen's design-spec "Linen camp shirt" set
 * (APP-29). Matches the screen-camera.png tag pills (item / mood / palette /
 * season) and the "LOOKS LIKE" confirm-panel chips exactly.
 */
export const MOCK_IDENTIFY_RESULT: IdentifyResult = {
  name: 'Linen camp shirt',
  category: 'Tops',
  season: 'spring',
  mood: 'Casual',
  paletteLabel: 'Warm neutral',
  swatches: ['#D8C3A5', '#B8A285', '#8A6F52'],
  confidence: 0.93,
};

/** Coach-chat fixture — the design handoff's "Quiet luxury" outfit reply. */
export const MOCK_OUTFIT_REPLY: ChatReply = {
  reply:
    'For tonight I would reach for your "Quiet luxury" look — the wool trench over the ' +
    'pleated trouser, finished with the suede loafer. Quiet, layered, tactile, and it ' +
    'leans on the cognac-and-camel core of your palette.',
};

/** Palette-analysis fixture — the handoff's "Warm Autumn" profile. */
export const MOCK_PALETTE_ANALYSIS: StyleProfile = SEED_PROFILE;

/**
 * Coach conversation fixture (APP-30) — the design-handoff reply set the
 * chat screen renders for screenshot review: an Iris text bubble, the
 * "Quiet luxury" outfit card (seed outfit o5 — itemIds i2/i3/i5, vibe 91),
 * and a palette swatch bubble drawn from the "Warm Autumn" seed palette.
 */
export const MOCK_COACH_CONVERSATION: CoachResponse = {
  messages: [
    {
      kind: 'text',
      text:
        'For tonight I would lean into the quiet-luxury core of your wardrobe — ' +
        'layered, tactile, and unmistakably yours.',
    },
    {
      kind: 'outfit',
      itemIds: ['i2', 'i3', 'i5'],
      name: 'Quiet luxury',
      vibe: 91,
      note:
        'The wool trench over the pleated trouser, finished with the suede loafer. ' +
        'Quiet, layered, tactile.',
    },
    {
      kind: 'palette',
      swatches: ['#A35836', '#B89368', '#2A2520'],
      note: 'Cognac, camel, and ink — the trio doing the heavy lifting in this look.',
    },
  ],
};
