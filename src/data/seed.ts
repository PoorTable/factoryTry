/**
 * Seed data for the Wardrobe store, ported verbatim from the design handoff
 * (`wardrobe-data.jsx`: W_ITEMS, W_OUTFITS, W_PALETTE) so all screens render
 * the spec'd content on first run. Mapping per the handoff notes:
 * `cat` → `category`, masonry hint `h` dropped, `photoUri: null`,
 * `isFavorite: false`, deterministic ISO timestamps.
 *
 * Worn counts reproduce the design's most-worn strip (`screen-profile.jsx`):
 * ids i4, i3, i5, i1, i9, i7, i16 are shown as 16/14/12/10/8/6/4× worn;
 * all other items start at 0.
 */

import { Item, Outfit, StyleProfile } from '@/types/wardrobe';

/** Fixed base instant so the seed is deterministic and unit-testable. */
const SEED_BASE_MS = Date.parse('2026-06-01T00:00:00.000Z');

/** Deterministic ISO timestamp, staggered one hour per index. */
function seedTimestamp(index: number): string {
  return new Date(SEED_BASE_MS + index * 60 * 60 * 1000).toISOString();
}

/** Worn counts per the design's most-worn strip; unlisted items start at 0. */
const SEED_WORN_COUNTS: Record<string, number> = {
  i4: 16,
  i3: 14,
  i5: 12,
  i1: 10,
  i9: 8,
  i7: 6,
  i16: 4,
};

type SeedItemSource = Pick<Item, 'id' | 'name' | 'category' | 'color' | 'swatches' | 'season'>;

const SEED_ITEM_SOURCES: SeedItemSource[] = [
  { id: 'i1',  name: 'Linen camp shirt',   category: 'Tops',        color: '#E7D9BE', swatches: ['#E7D9BE', '#C7B68F'], season: 'summer' },
  { id: 'i2',  name: 'Wool trench',        category: 'Outerwear',   color: '#B89368', swatches: ['#B89368', '#8E6F4B'], season: 'fall' },
  { id: 'i3',  name: 'Pleated trouser',    category: 'Bottoms',     color: '#6B5F52', swatches: ['#6B5F52'],            season: 'all' },
  { id: 'i4',  name: 'Cashmere mock',      category: 'Tops',        color: '#A35836', swatches: ['#A35836', '#8A4426'], season: 'fall' },
  { id: 'i5',  name: 'Suede loafer',       category: 'Shoes',       color: '#7C4A2A', swatches: ['#7C4A2A'],            season: 'all' },
  { id: 'i6',  name: 'Silk scarf',         category: 'Accessories', color: '#C97B5E', swatches: ['#C97B5E', '#E7D9BE', '#7A8454'], season: 'all' },
  { id: 'i7',  name: 'Denim, raw',         category: 'Bottoms',     color: '#3D4A5C', swatches: ['#3D4A5C'],            season: 'all' },
  { id: 'i8',  name: 'Boucle blazer',      category: 'Outerwear',   color: '#DDD3C0', swatches: ['#DDD3C0', '#B89368'], season: 'fall' },
  { id: 'i9',  name: 'Striped tee',        category: 'Tops',        color: '#F1EBE0', swatches: ['#F1EBE0', '#2A2520'], season: 'all' },
  { id: 'i10', name: 'Leather mule',       category: 'Shoes',       color: '#2A2520', swatches: ['#2A2520'],            season: 'all' },
  { id: 'i11', name: 'Olive chore coat',   category: 'Outerwear',   color: '#7A8454', swatches: ['#7A8454'],            season: 'fall' },
  { id: 'i12', name: 'Pleated midi skirt', category: 'Bottoms',     color: '#B86F4A', swatches: ['#B86F4A'],            season: 'fall' },
  { id: 'i13', name: 'Cotton oxford',      category: 'Tops',        color: '#E2EDE7', swatches: ['#E2EDE7', '#6E7A88'], season: 'all' },
  { id: 'i14', name: 'Tortoise hoops',     category: 'Accessories', color: '#8E6F4B', swatches: ['#8E6F4B', '#2A2520'], season: 'all' },
  { id: 'i15', name: 'Linen wide-leg',     category: 'Bottoms',     color: '#DDD3C0', swatches: ['#DDD3C0'],            season: 'summer' },
  { id: 'i16', name: 'White sneaker',      category: 'Shoes',       color: '#F1EBE0', swatches: ['#F1EBE0', '#2A2520'], season: 'all' },
];

export const SEED_ITEMS: Item[] = SEED_ITEM_SOURCES.map((source, index) => ({
  ...source,
  photoUri: null,
  wornCount: SEED_WORN_COUNTS[source.id] ?? 0,
  isFavorite: false,
  createdAt: seedTimestamp(index),
  lastWornAt: null,
}));

type SeedOutfitSource = Pick<Outfit, 'id' | 'name' | 'vibe' | 'itemIds'>;

const SEED_OUTFIT_SOURCES: SeedOutfitSource[] = [
  { id: 'o1', name: 'Sunday slow',     vibe: 88, itemIds: ['i1', 'i15', 'i16'] },
  { id: 'o2', name: 'Editor at large', vibe: 92, itemIds: ['i4', 'i3', 'i5'] },
  { id: 'o3', name: 'Gallery opening', vibe: 84, itemIds: ['i9', 'i7', 'i10'] },
  { id: 'o4', name: 'Coastal walk',    vibe: 79, itemIds: ['i8', 'i15', 'i16'] },
  { id: 'o5', name: 'Quiet luxury',    vibe: 91, itemIds: ['i2', 'i3', 'i5'] },
];

export const SEED_OUTFITS: Outfit[] = SEED_OUTFIT_SOURCES.map((source, index) => ({
  ...source,
  savedAt: seedTimestamp(SEED_ITEM_SOURCES.length + index),
  lastWornAt: null,
}));

/** Style-profile palette — most prominent colors derived from the wardrobe. */
export const SEED_PALETTE: StyleProfile['palette'] = [
  { hex: '#A35836', name: 'Cognac',     pct: 18 },
  { hex: '#B89368', name: 'Camel',      pct: 15 },
  { hex: '#E7D9BE', name: 'Sand',       pct: 13 },
  { hex: '#6B5F52', name: 'Espresso',   pct: 11 },
  { hex: '#7A8454', name: 'Olive',      pct: 9 },
  { hex: '#DDD3C0', name: 'Bone',       pct: 9 },
  { hex: '#2A2520', name: 'Ink',        pct: 8 },
  { hex: '#C97B5E', name: 'Terracotta', pct: 7 },
  { hex: '#3D4A5C', name: 'Indigo',     pct: 5 },
  { hex: '#6B4858', name: 'Plum',       pct: 5 },
];

/** First-run style profile per the design's profile screen + "Iris noticed" card. */
export const SEED_PROFILE: StyleProfile = {
  paletteName: 'Warm Autumn',
  tagline: 'quiet, layered, tactile',
  palette: SEED_PALETTE,
  insight:
    'You wear cognac and camel a lot. A soft sage knit would round out your palette nicely.',
};
