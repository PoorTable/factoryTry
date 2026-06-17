/**
 * Persisted Zustand store — the single client-side state layer for the
 * Wardrobe app. Screens must not own domain state; they read/write here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_ITEMS, SEED_OUTFITS, SEED_PROFILE } from '@/data/seed';
import { deletePhoto } from '@/services/photo-store';
import { computeProfile, profileCacheKey } from '@/services/styling/palette';
import { vibeScore as engineVibeScore } from '@/services/styling/suggest';
import {
  Category,
  ChatMessage,
  Item,
  Outfit,
  OutfitDraft,
  StyleProfile,
} from '@/types/wardrobe';

// ---------------------------------------------------------------------------
// Constants & pure helpers
// ---------------------------------------------------------------------------

/** Max swatch dots shown on the palette-read card. */
export const MAX_DRAFT_SWATCHES = 6;

export type DraftSlot = keyof OutfitDraft;

export const EMPTY_DRAFT: OutfitDraft = {
  top: null,
  bottom: null,
  shoes: null,
  extra: null,
};

/** Item ids currently filling draft slots, in slot order. Pure. */
export function draftItemIds(draft: OutfitDraft): string[] {
  return [draft.top, draft.bottom, draft.shoes, draft.extra].filter(
    (id): id is string => id !== null
  );
}

/**
 * Aggregates the unique swatch colors of the items filling a draft,
 * capped at MAX_DRAFT_SWATCHES. Pure — no store or React access.
 */
export function collectDraftSwatches(draft: OutfitDraft, items: Item[]): string[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const swatches: string[] = [];
  for (const id of draftItemIds(draft)) {
    const item = byId.get(id);
    if (!item) continue;
    for (const hex of item.swatches) {
      if (!swatches.includes(hex)) {
        swatches.push(hex);
        if (swatches.length >= MAX_DRAFT_SWATCHES) return swatches;
      }
    }
  }
  return swatches;
}

/**
 * Vibe score for the active draft, 0..100. Thin wrapper that preserves the
 * legacy `(draft) => number` signature so callers (the Outfit Builder ring,
 * Coach proposals, saved-outfit metadata) stay untouched while the real
 * scoring lives in the pure engine (`src/services/styling/suggest.ts`, APP-31).
 *
 * The engine needs the items list to read swatches and seasons; we read it
 * from the store at call time so the wrapper signature stays `(draft) => number`.
 */
export function vibeScoreFor(draft: OutfitDraft): number {
  return engineVibeScore(draft, useWardrobeStore.getState().items);
}

// ---------------------------------------------------------------------------
// Profile recompute (APP-32)
// ---------------------------------------------------------------------------

/**
 * Memoization key of the most recent successful `recomputeProfile` call.
 * Module-scoped so any path through item mutations short-circuits when the
 * wardrobe content that drives palette/classification hasn't changed.
 */
let lastProfileKey: string | null = null;

/**
 * Recompute `profile` from the current `items` and write it back to the
 * store — but only if the wardrobe content actually changed since the last
 * recompute. `lastProfileKey` is keyed on item ids + wornCount + swatches
 * (see `profileCacheKey`), so unrelated slices (chat, draft, favorites) do
 * not retrigger work. The synchronous (templated-insight) path is used
 * here; the async on-device LLM seam is reserved for APP-35.
 */
function recomputeProfile(items: Item[]): StyleProfile {
  const key = profileCacheKey(items);
  const existing = useWardrobeStore.getState().profile;
  if (key === lastProfileKey && existing) return existing;
  const profile = computeProfile(items);
  lastProfileKey = key;
  return profile;
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface WardrobeState {
  // -- items slice --
  items: Item[];
  addItem: (item: Item) => void;
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void;
  removeItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  incrementWorn: (id: string) => void;
  /** Items in a category; null returns all items. */
  byCategory: (filter: Category | null) => Item[];
  favorites: () => Item[];
  mostWorn: (n: number) => Item[];
  totalCount: () => number;

  // -- outfits slice --
  outfits: Outfit[];
  saveOutfit: (outfit: Outfit) => void;
  removeOutfit: (id: string) => void;
  /** Alias of `removeOutfit` — semantic delete that never touches items. */
  deleteOutfit: (id: string) => void;
  /**
   * "Wear today" — increments `wornCount` and stamps `lastWornAt` for every
   * item in the outfit, and stamps the outfit's own `lastWornAt`. Idempotent
   * over time: each call bumps the count by 1 and writes the latest ISO stamp.
   */
  wearOutfit: (outfitId: string) => void;

  // -- draft slice --
  draft: OutfitDraft;
  setSlot: (slot: DraftSlot, itemId: string) => void;
  clearSlot: (slot: DraftSlot) => void;
  resetDraft: () => void;
  /** Unique swatches of the drafted items, capped at 6 dots. */
  draftSwatches: () => string[];

  // -- chat slice --
  messages: ChatMessage[];
  isTyping: boolean;
  appendMessage: (message: ChatMessage) => void;
  setTyping: (isTyping: boolean) => void;

  // -- profile slice --
  profile: StyleProfile | null;
  setProfile: (profile: StyleProfile) => void;

  // -- seed meta --
  /** True once first-run seed data has been applied; persisted so we never re-seed. */
  seeded: boolean;
}

/** Domain state persisted to AsyncStorage (actions and ephemeral UI excluded). */
type PersistedWardrobeState = Pick<
  WardrobeState,
  'items' | 'outfits' | 'draft' | 'messages' | 'profile' | 'seeded'
>;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set, get) => ({
      // -- items slice --
      items: [],
      addItem: (item) =>
        set((state) => {
          const items = [...state.items, item];
          return { items, profile: recomputeProfile(items) };
        }),
      updateItem: (id, patch) =>
        set((state) => {
          const items = state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          );
          return { items, profile: recomputeProfile(items) };
        }),
      removeItem: (id) => {
        // Orphan cleanup (APP-27): an item's photo file must not outlive the
        // item. Best-effort — a file-system failure never blocks removal.
        try {
          deletePhoto(id);
        } catch {
          // Photo may not exist or storage may be unavailable (e.g. web).
        }
        set((state) => {
          const items = state.items.filter((item) => item.id !== id);
          return {
            items,
            draft: {
              top: state.draft.top === id ? null : state.draft.top,
              bottom: state.draft.bottom === id ? null : state.draft.bottom,
              shoes: state.draft.shoes === id ? null : state.draft.shoes,
              extra: state.draft.extra === id ? null : state.draft.extra,
            },
            profile: recomputeProfile(items),
          };
        });
      },
      toggleFavorite: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
        })),
      incrementWorn: (id) =>
        set((state) => {
          const now = new Date().toISOString();
          const items = state.items.map((item) =>
            item.id === id
              ? { ...item, wornCount: item.wornCount + 1, lastWornAt: now }
              : item
          );
          return { items, profile: recomputeProfile(items) };
        }),
      byCategory: (filter) => {
        const { items } = get();
        return filter === null ? items : items.filter((item) => item.category === filter);
      },
      favorites: () => get().items.filter((item) => item.isFavorite),
      mostWorn: (n) =>
        [...get().items].sort((a, b) => b.wornCount - a.wornCount).slice(0, n),
      totalCount: () => get().items.length,

      // -- outfits slice --
      outfits: [],
      saveOutfit: (outfit) => set((state) => ({ outfits: [...state.outfits, outfit] })),
      removeOutfit: (id) =>
        set((state) => ({ outfits: state.outfits.filter((outfit) => outfit.id !== id) })),
      // Items are intentionally untouched — deleting a saved look never
      // removes the underlying wardrobe pieces (APP-33 acceptance criterion).
      deleteOutfit: (id) =>
        set((state) => ({ outfits: state.outfits.filter((outfit) => outfit.id !== id) })),
      wearOutfit: (outfitId) =>
        set((state) => {
          const outfit = state.outfits.find((o) => o.id === outfitId);
          if (!outfit) return state;
          const now = new Date().toISOString();
          const itemIds = new Set(outfit.itemIds);
          const items = state.items.map((item) =>
            itemIds.has(item.id)
              ? { ...item, wornCount: item.wornCount + 1, lastWornAt: now }
              : item
          );
          const outfits = state.outfits.map((o) =>
            o.id === outfitId ? { ...o, lastWornAt: now } : o
          );
          return { items, outfits, profile: recomputeProfile(items) };
        }),

      // -- draft slice --
      draft: EMPTY_DRAFT,
      setSlot: (slot, itemId) =>
        set((state) => ({ draft: { ...state.draft, [slot]: itemId } })),
      clearSlot: (slot) => set((state) => ({ draft: { ...state.draft, [slot]: null } })),
      resetDraft: () => set({ draft: EMPTY_DRAFT }),
      draftSwatches: () => collectDraftSwatches(get().draft, get().items),

      // -- chat slice --
      messages: [],
      isTyping: false,
      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setTyping: (isTyping) => set({ isTyping }),

      // -- profile slice --
      profile: null,
      setProfile: (profile) => set({ profile }),

      // -- seed meta --
      seeded: false,
    }),
    {
      name: 'wardrobe-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 → v2 (APP-33): `lastWornAt` added to Item and Outfit. Backfill the
      // field on every existing record so hydration never produces objects
      // missing the new key (selectors and the "worn this month" derivation
      // both read it).
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        if (version >= 2) return persisted;
        const state = persisted as Partial<PersistedWardrobeState>;
        const items = (state.items ?? []).map((item) =>
          item.lastWornAt === undefined ? { ...item, lastWornAt: null } : item
        );
        const outfits = (state.outfits ?? []).map((outfit) =>
          outfit.lastWornAt === undefined ? { ...outfit, lastWornAt: null } : outfit
        );
        return { ...state, items, outfits } as PersistedWardrobeState;
      },
      partialize: (state): PersistedWardrobeState => ({
        items: state.items,
        outfits: state.outfits,
        draft: state.draft,
        messages: state.messages,
        profile: state.profile,
        seeded: state.seeded,
      }),
      // Seed-once: runs after hydration. On first run AsyncStorage is empty,
      // so the hydrated state still has `seeded: false` and we apply the seed
      // content; the setState below is persisted immediately (with
      // `seeded: true`), so subsequent hydrations — even with an emptied
      // wardrobe — never re-seed or clobber user data.
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        if (!state.seeded) {
          // First run — apply seed content, then derive the live profile from
          // the seeded items so APP-32 classification + insight are visible
          // immediately. Falls back to SEED_PROFILE only if computeProfile
          // returns null/undefined (it never does in practice).
          const profile = recomputeProfile(SEED_ITEMS) ?? SEED_PROFILE;
          useWardrobeStore.setState({
            items: SEED_ITEMS,
            outfits: SEED_OUTFITS,
            profile,
            seeded: true,
          });
          return;
        }
        // Already seeded — recompute the live profile from the persisted
        // items so any wardrobe changes made on the previous session are
        // reflected in the wheel/classification immediately.
        if (state.items.length > 0) {
          useWardrobeStore.setState({ profile: recomputeProfile(state.items) });
        }
      },
    }
  )
);
