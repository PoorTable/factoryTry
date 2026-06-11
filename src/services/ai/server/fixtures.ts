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

import type { ChatReply, GarmentTags } from '../schemas';

/** Vision-tagging fixture — the handoff's signature garment, "Cashmere mock". */
export const MOCK_GARMENT_TAGS: GarmentTags = {
  name: 'Cashmere mock',
  category: 'Tops',
  color: '#A35836',
  swatches: ['#A35836', '#8A4426'],
  season: 'fall',
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
