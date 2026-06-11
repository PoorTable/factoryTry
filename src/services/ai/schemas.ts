/**
 * Shared zod schemas for the AI service layer.
 *
 * These define the wire contract between the Expo Router API routes
 * (`src/app/api/*+api.ts`) and the typed client (`src/services/ai/client.ts`).
 * Response shapes are pinned to the store types in `src/types/wardrobe.ts`
 * via explicit `z.ZodType<...>` annotations, so screen tickets can consume
 * parsed payloads directly without re-mapping.
 *
 * This module is platform-neutral (no Anthropic SDK, no Expo APIs) so it is
 * safe to import from both server routes and client code.
 */

import { z } from 'zod';

import type { Category, Item, Season, StyleProfile } from '@/types/wardrobe';

/** Wardrobe categories, mirroring `Category` in src/types/wardrobe.ts. */
export const categorySchema: z.ZodType<Category> = z.enum([
  'Tops',
  'Bottoms',
  'Outerwear',
  'Shoes',
  'Accessories',
]);

/** Seasons, mirroring `Season` in src/types/wardrobe.ts. */
export const seasonSchema: z.ZodType<Season> = z.enum([
  'all',
  'spring',
  'summer',
  'fall',
  'winter',
]);

/**
 * Garment tags produced by vision tagging — exactly the `Item` fields the AI
 * fills in when a photo is captured (the rest are set client-side).
 */
export type GarmentTags = Pick<Item, 'name' | 'category' | 'color' | 'swatches' | 'season'>;

export const garmentTagsSchema: z.ZodType<GarmentTags> = z.object({
  name: z.string().min(1),
  category: categorySchema,
  color: z.string().min(1),
  swatches: z.array(z.string()),
  season: seasonSchema,
});

/** One donut segment of the style-profile palette. */
export const paletteSegmentSchema: z.ZodType<StyleProfile['palette'][number]> = z.object({
  hex: z.string().min(1),
  name: z.string().min(1),
  pct: z.number(),
});

/** Palette analysis response — matches `StyleProfile` from the store types. */
export const paletteAnalysisSchema: z.ZodType<StyleProfile> = z.object({
  paletteName: z.string().min(1),
  tagline: z.string().min(1),
  palette: z.array(paletteSegmentSchema),
  insight: z.string().optional(),
});

/** Request body for `POST /api/chat`. */
export const chatRequestSchema = z.object({
  /** The user's message to the AI stylist. */
  message: z.string().min(1, 'message must not be empty'),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Response body for `POST /api/chat`. Screens turn `reply` into a
 * `ChatMessage` of kind `text` (see src/types/wardrobe.ts).
 */
export const chatReplySchema = z.object({
  reply: z.string().min(1),
});

export type ChatReply = z.infer<typeof chatReplySchema>;
