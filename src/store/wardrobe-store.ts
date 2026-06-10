/**
 * Persisted Zustand store — the single client-side state layer for the
 * Wardrobe app. Screens must not own domain state; they read/write here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
 * Deterministic v1 vibe-score heuristic (per design README): filled slots
 * 0/1/2/3/4 → 0/48/72/87/91. Pure — no store or React access — and exported
 * so the AI engine ticket can swap the implementation without touching
 * screens.
 */
export function vibeScoreFor(draft: OutfitDraft): number {
  const filled = draftItemIds(draft).length;
  if (filled === 0) return 0;
  if (filled === 1) return 48;
  if (filled === 2) return 72;
  if (filled === 3) return 87;
  return 91;
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
}

/** Domain state persisted to AsyncStorage (actions and ephemeral UI excluded). */
type PersistedWardrobeState = Pick<
  WardrobeState,
  'items' | 'outfits' | 'draft' | 'messages' | 'profile'
>;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set, get) => ({
      // -- items slice --
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          draft: {
            top: state.draft.top === id ? null : state.draft.top,
            bottom: state.draft.bottom === id ? null : state.draft.bottom,
            shoes: state.draft.shoes === id ? null : state.draft.shoes,
            extra: state.draft.extra === id ? null : state.draft.extra,
          },
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
        })),
      incrementWorn: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, wornCount: item.wornCount + 1 } : item
          ),
        })),
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
    }),
    {
      name: 'wardrobe-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedWardrobeState => ({
        items: state.items,
        outfits: state.outfits,
        draft: state.draft,
        messages: state.messages,
        profile: state.profile,
      }),
    }
  )
);
