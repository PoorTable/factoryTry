import { useRef, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useWardrobeStore, vibeScoreFor } from '@/store/wardrobe-store';
import type { Item, OutfitDraft } from '@/types/wardrobe';

/**
 * Build the suggested outfit name from the drafted items — a soft pairing of
 * the top + bottom names ("Cashmere mock & Pleated trouser"), or the first
 * non-null slot's name if only one is filled. Pure — no store access.
 *
 * Matches the design's "suggested name from item names" — keeping it short
 * (two pieces max) so the serif TextInput line never wraps. Returns an empty
 * string when the draft is empty (the caller falls back to "New look").
 */
export function suggestOutfitName(draft: OutfitDraft, items: Item[]): string {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ids = [draft.top, draft.bottom, draft.shoes, draft.extra].filter(
    (id): id is string => id !== null
  );
  const names = ids
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => typeof name === 'string');
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names[0]} & ${names[1]}`;
}

type SaveLookSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Fired after `saveOutfit` succeeds — used to show the cognac toast. */
  onSaved: (name: string) => void;
};

let idCounter = 0;
function makeOutfitId(): string {
  idCounter += 1;
  return `o${Date.now().toString(36)}${idCounter}`;
}

/**
 * SaveLookSheet — bottom sheet (Modal w/ slide animation) that lets the user
 * name and persist the current Outfit Builder draft.
 *
 * Renders a paper card with a mono eyebrow, a serif TextInput pre-filled with
 * the suggested name from item names (`suggestOutfitName`), a vibe readout,
 * and Cancel / Save look actions. Save calls `saveOutfit` with the draft's
 * vibe score and item ids in slot order, then `resetDraft()`, then fires
 * `onSaved(finalName)` so the parent screen can flash a cognac toast.
 *
 * Design refs: docs/design-screenshots/screen-outfit.png (Save look CTA),
 * docs/design-screenshots/component-typography.png (serif input).
 */
export function SaveLookSheet({ visible, onDismiss, onSaved }: SaveLookSheetProps) {
  const draft = useWardrobeStore((state) => state.draft);
  const items = useWardrobeStore((state) => state.items);
  const saveOutfit = useWardrobeStore((state) => state.saveOutfit);
  const resetDraft = useWardrobeStore((state) => state.resetDraft);

  const inputRef = useRef<TextInput>(null);
  // Derive-in-render pattern (https://react.dev/learn/you-might-not-need-an-effect)
  // — when `visible` flips false → true, seed the local name from the
  // suggestion. We track the previous `visible` value as state so the update
  // happens during render without an effect (avoids the cascading-render
  // and setState-in-effect lint rules).
  const [prevVisible, setPrevVisible] = useState(false);
  const [name, setName] = useState('');
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setName(suggestOutfitName(draft, items));
    }
  }

  const vibe = vibeScoreFor(draft);
  const itemIds = [draft.top, draft.bottom, draft.shoes, draft.extra].filter(
    (id): id is string => id !== null
  );
  const canSave = itemIds.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const finalName = name.trim().length > 0 ? name.trim() : 'New look';
    saveOutfit({
      id: makeOutfitId(),
      name: finalName,
      vibe,
      itemIds,
      savedAt: new Date().toISOString(),
      lastWornAt: null,
    });
    resetDraft();
    onSaved(finalName);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Scrim — taps dismiss the sheet (design: dimmed paper backdrop). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss save sheet"
        onPress={onDismiss}
        className="flex-1 justify-end bg-ink/40"
      >
        {/* Sheet card — paper, top-rounded, pinned to the bottom. */}
        <Pressable
          onPress={() => {}}
          accessibilityRole="none"
          className="rounded-t-[28px] bg-paper px-screen-h pb-10 pt-5"
        >
          {/* Grabber */}
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-stone" />

          <Text className="font-mono text-[10px] tracking-[1.8px] text-muted">
            NAME THIS LOOK
          </Text>

          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="New look"
            placeholderTextColor="#8A7C6E"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            className="mt-2 border-b border-ink/20 pb-1 font-serif text-[26px] text-ink"
          />

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">
              {`VIBE ${vibe}`}
            </Text>
            <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">
              {`${itemIds.length} PIECES`}
            </Text>
          </View>

          <View className="mt-6 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onDismiss}
              className="flex-1 items-center rounded-pill border border-stone py-3 active:opacity-70"
            >
              <Text className="font-sans text-[14px] font-medium text-ink">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save look"
              disabled={!canSave}
              onPress={handleSave}
              className="flex-1 items-center rounded-pill bg-cognac py-3 active:opacity-90 disabled:opacity-50"
            >
              <Text className="font-sans text-[14px] font-medium text-paper">
                Save look
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
