/**
 * Core data model types for the Wardrobe app.
 * Single source of truth for all wardrobe-related types.
 */

export type Category = 'Tops' | 'Bottoms' | 'Outerwear' | 'Shoes' | 'Accessories';

export type Season = 'all' | 'spring' | 'summer' | 'fall' | 'winter';

export interface Item {
  id: string;
  name: string;
  category: Category;
  /** Dominant hex color. */
  color: string;
  /** Detected colors. */
  swatches: string[];
  season: Season;
  /** file:// URI (null → flat-color placeholder). */
  photoUri: string | null;
  wornCount: number;
  isFavorite: boolean;
  /** ISO timestamp. */
  createdAt: string;
}

export interface Outfit {
  id: string;
  name: string;
  /** 0–100. */
  vibe: number;
  itemIds: string[];
  /** ISO timestamp. */
  savedAt: string;
}

export interface OutfitDraft {
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  extra: string | null;
}

/**
 * Chat bubble union for the Coach tab (APP-21/APP-30).
 * - `text` from 'system' renders as the italic in-chat error/status note.
 * - `outfit` is an ephemeral AI proposal (itemIds, not a saved outfitId);
 *   it becomes an `Outfit` only when the user taps "Save look".
 */
export type ChatMessage =
  | { id: string; from: 'user' | 'ai' | 'system'; kind: 'text'; text: string; at: string }
  | {
      id: string;
      from: 'ai';
      kind: 'outfit';
      itemIds: string[];
      name: string;
      /** 0–100, shown in the gold vibe pill. */
      vibe: number;
      note?: string;
      at: string;
    }
  | { id: string; from: 'ai'; kind: 'palette'; swatches: string[]; note?: string; at: string };

export interface StyleProfile {
  /** e.g. "Warm Autumn". */
  paletteName: string;
  tagline: string;
  /** Donut segments. */
  palette: { hex: string; name: string; pct: number }[];
  /** "Iris noticed" callout. */
  insight?: string;
}
