import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useShallow } from 'zustand/react/shallow';

import {
  collectDraftSwatches,
  type DraftSlot,
  draftItemIds,
  useWardrobeStore,
  vibeScoreFor,
} from '@/store/wardrobe-store';
import { Colors } from '@/theme/tokens';
import type { Category, Item } from '@/types/wardrobe';

// SafeAreaView, expo-image, LinearGradient, and Reanimated views are not
// NativeWind-aware by default; map className → style so this screen stays
// className-only (AGENTS.md strict styling rule).
cssInterop(SafeAreaView, { className: 'style' });
cssInterop(Image, { className: 'style' });
cssInterop(LinearGradient, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Slot eyebrow labels in render order — also the order the design shows. */
const SLOTS: { key: DraftSlot; label: 'TOP' | 'BOTTOM' | 'SHOES' | 'EXTRA' }[] = [
  { key: 'top', label: 'TOP' },
  { key: 'bottom', label: 'BOTTOM' },
  { key: 'shoes', label: 'SHOES' },
  { key: 'extra', label: 'EXTRA' },
];

/** Slot → wardrobe category mapping for the AI suggestion rail. */
const SLOT_CATEGORIES: Record<DraftSlot, Category[]> = {
  top: ['Tops'],
  bottom: ['Bottoms'],
  shoes: ['Shoes'],
  extra: ['Outerwear', 'Accessories'],
};

/** VibeScore badge geometry. */
const VIBE_SIZE = 64;
const VIBE_STROKE = 3;
const VIBE_RADIUS = (VIBE_SIZE - VIBE_STROKE * 2) / 2;
const VIBE_CIRCUMFERENCE = 2 * Math.PI * VIBE_RADIUS;

/** Slot row photo block. */
const SLOT_PHOTO_W = 78;
const SLOT_PHOTO_H = 96;

/** AI rail thumbnail block. */
const RAIL_THUMB_W = 80;
const RAIL_THUMB_H = 92;

/** Vibe ring animation duration (per task spec — 400ms ease on slot fill).
 *  The 200ms slot-activate ease is expressed inline via the NativeWind
 *  `transition duration-[200ms] ease-out` utilities on each SlotRow. */
const RING_ANIMATION_MS = 400;

/** Sized frame for the "Surprise me" tail card — lifted out of JSX so the
 *  style prop is a referenced variable, not an inline object literal
 *  (AGENTS.md / GATE-9). */
const surpriseFrame = { width: RAIL_THUMB_W, height: RAIL_THUMB_H };

/**
 * Deterministically shuffle items by a numeric seed (Fisher–Yates with a
 * simple linear-congruential PRNG). The Shuffle button increments the seed,
 * giving a stable, repeatable reorder per press without screen-local state
 * leaking between renders.
 */
function shuffleBySeed<T>(input: T[], seed: number): T[] {
  if (input.length <= 1 || seed === 0) return input;
  const out = [...input];
  let state = (seed * 9301 + 49297) % 233280;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** VibeScore — circular amber ring + Cormorant number + mono caption.
 *  Amber is used ONLY here (AGENTS.md / GATE-3). */
function VibeScoreBadge({ score }: { score: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: RING_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, score]);

  const animatedProps = useAnimatedProps(() => {
    const dash = VIBE_CIRCUMFERENCE * progress.value;
    return {
      strokeDasharray: `${dash} ${VIBE_CIRCUMFERENCE - dash}`,
    };
  });

  return (
    <View
      accessibilityLabel={`Vibe score ${score}`}
      className="relative h-[64px] w-[64px] items-center justify-center"
    >
      <Svg
        width={VIBE_SIZE}
        height={VIBE_SIZE}
        className="absolute inset-0"
      >
        {/* Track (hairline) — sits beneath the amber progress arc. */}
        <Circle
          cx={VIBE_SIZE / 2}
          cy={VIBE_SIZE / 2}
          r={VIBE_RADIUS}
          stroke={Colors.hairline}
          strokeWidth={VIBE_STROKE}
          fill="none"
        />
        {/* Amber progress arc — the only place amber is allowed in this screen. */}
        <AnimatedCircle
          cx={VIBE_SIZE / 2}
          cy={VIBE_SIZE / 2}
          r={VIBE_RADIUS}
          stroke={Colors.amber}
          strokeWidth={VIBE_STROKE}
          fill="none"
          strokeLinecap="round"
          rotation={-90}
          origin={`${VIBE_SIZE / 2}, ${VIBE_SIZE / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Text className="font-serif text-[22px] leading-[24px] text-ink">{score}</Text>
      <Text className="mt-0.5 font-mono text-[8px] tracking-[1.4px] text-muted">VIBE</Text>
    </View>
  );
}

/** One swatch dot with a runtime hex background — pattern from item-card.tsx. */
function SwatchDot({ hex, size = 6 }: { hex: string; size?: number }) {
  const dotStyle = { backgroundColor: hex, width: size, height: size };
  return (
    <View
      accessibilityLabel={`Swatch ${hex}`}
      className="rounded-full border-[0.5px] border-ink/10"
      style={dotStyle}
    />
  );
}

type SlotRowProps = {
  label: string;
  slotKey: DraftSlot;
  item: Item | null;
  active: boolean;
  onActivate: () => void;
  onClear: () => void;
};

/** SlotRow — 78×96 photo / dashed placeholder + eyebrow + name + swatches.
 *  Active state: white card bg + cognac hairline border + clear-X. */
function SlotRow({ label, item, active, onActivate, onClear }: SlotRowProps) {
  const photoFrame = { width: SLOT_PHOTO_W, height: SLOT_PHOTO_H };
  const placeholderColor = item?.color ? { backgroundColor: item.color } : undefined;

  // Active card = white + cognac hairline border + soft cognac shadow.
  // Inactive = transparent (sits directly on paper) — matches the design.
  const cardClass = active
    ? 'flex-row items-center gap-4 rounded-card border border-cognac/40 bg-white px-3 py-3 shadow-[0_6px_18px_rgba(163,88,54,0.10)]'
    : 'flex-row items-center gap-4 rounded-card border border-transparent bg-transparent px-3 py-3';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} slot${item ? `, ${item.name}` : ', empty'}`}
      onPress={onActivate}
      className={`${cardClass} transition duration-[200ms] ease-out active:opacity-90`}
    >
      {/* Photo OR dashed placeholder */}
      {item && item.photoUri ? (
        <Image
          source={{ uri: item.photoUri }}
          contentFit="cover"
          accessibilityLabel={item.name}
          className="rounded-item"
          style={photoFrame}
        />
      ) : item ? (
        <View
          className="rounded-item"
          style={[photoFrame, placeholderColor]}
        />
      ) : (
        <View
          className="items-center justify-center rounded-item border-[1.4px] border-dashed border-stone bg-paper-2"
          style={photoFrame}
        >
          <Text className="font-mono text-[22px] leading-[22px] text-stone">+</Text>
        </View>
      )}

      {/* Eyebrow + name + swatches */}
      <View className="flex-1">
        <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">{label}</Text>
        {item ? (
          <Text
            numberOfLines={1}
            className="mt-1 font-serif text-[19px] leading-6 text-ink"
          >
            {item.name}
          </Text>
        ) : (
          <Text className="mt-1 font-serif text-[19px] italic leading-6 text-muted">
            Add a piece
          </Text>
        )}
        {item && item.swatches.length > 0 ? (
          <View className="mt-1.5 flex-row items-center gap-1">
            {item.swatches.slice(0, 6).map((hex, index) => (
              <SwatchDot key={`${hex}-${index}`} hex={hex} />
            ))}
          </View>
        ) : null}
      </View>

      {/* Active slot clear-X */}
      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label}`}
          hitSlop={10}
          onPress={onClear}
          className="h-[26px] w-[26px] items-center justify-center rounded-full border border-ink/15 bg-paper active:opacity-70"
        >
          <Text className="font-mono text-[14px] leading-none text-ink">×</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

type RailThumbProps = {
  item: Item;
  onPress: () => void;
};

function RailThumb({ item, onPress }: RailThumbProps) {
  const photoFrame = { width: RAIL_THUMB_W, height: RAIL_THUMB_H };
  const placeholderColor = { backgroundColor: item.color };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${item.name}`}
      onPress={onPress}
      className="w-[80px] active:opacity-80"
    >
      {item.photoUri ? (
        <Image
          source={{ uri: item.photoUri }}
          contentFit="cover"
          accessibilityLabel={item.name}
          className="rounded-item"
          style={photoFrame}
        />
      ) : (
        <View className="rounded-item" style={[photoFrame, placeholderColor]} />
      )}
      <Text
        numberOfLines={1}
        className="mt-1.5 font-sans text-[11px] text-ink-soft"
      >
        {item.name}
      </Text>
    </Pressable>
  );
}

/**
 * OutfitsScreen — APP-20 Outfit Builder (design: docs/design-screenshots/screen-outfit.png).
 *
 * Header eyebrow + "Build a look" title + VibeScore amber ring badge.
 * 4 slot rows (TOP / BOTTOM / SHOES / EXTRA) consuming `draft` from the
 * store; tapping a slot activates it (white card + cognac hairline), tapping
 * the clear-X calls `clearSlot(slot)`. The palette read card sits below the
 * slots, sourced from `draftSwatches()`. The AI suggestion rail is sticky
 * above the tab bar with a transparent→paper gradient fade overlay; it
 * filters store items by the active slot's category mapping and excludes
 * already-slotted item ids. Tapping a thumbnail calls
 * `setSlot(activeSlot, item.id)`. "Surprise me" picks a random remaining
 * suggestion; "Shuffle" reorders the rail.
 *
 * Vibe score is sourced from the store's `vibeScoreFor(draft)`; the canned
 * filled-slot ladder lives in one place (the store helper) and is never
 * duplicated inline in this screen.
 */
export default function OutfitsScreen() {
  const draft = useWardrobeStore((state) => state.draft);
  const items = useWardrobeStore(useShallow((state) => state.items));
  const setSlot = useWardrobeStore((state) => state.setSlot);
  const clearSlot = useWardrobeStore((state) => state.clearSlot);

  const [activeSlot, setActiveSlot] = useState<DraftSlot>('extra');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const itemsById = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  // Compute swatches locally instead of subscribing to a selector that calls
  // `state.draftSwatches()`. That selector returned a fresh array on every
  // store read, breaking Zustand's Object.is short-circuit and triggering
  // "Maximum update depth exceeded". `collectDraftSwatches` is the same pure
  // helper the store method delegates to (src/store/wardrobe-store.ts:196).
  const swatches = useMemo(
    () => collectDraftSwatches(draft, items),
    [draft, items]
  );

  const score = vibeScoreFor(draft);
  const activeLabel = SLOTS.find((s) => s.key === activeSlot)?.label ?? 'EXTRA';

  // Suggestion rail: filter by slot→category mapping AND exclude already
  // slotted item ids (GATE-7). Shuffle reorders deterministically by seed.
  const suggestions = useMemo(() => {
    const allowed = new Set<Category>(SLOT_CATEGORIES[activeSlot]);
    const slottedIds = new Set(draftItemIds(draft));
    const base = items.filter(
      (it) => allowed.has(it.category) && !slottedIds.has(it.id)
    );
    return shuffleBySeed(base, shuffleSeed);
  }, [activeSlot, draft, items, shuffleSeed]);

  const onSelectSuggestion = (item: Item) => {
    setSlot(activeSlot, item.id);
  };

  const onSurpriseMe = () => {
    if (suggestions.length === 0) return;
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    setSlot(activeSlot, pick.id);
  };

  // Lightweight tagline mirroring the design ("Warm autumn, low-contrast"); a
  // future ticket can derive this from the profile palette, but a single
  // placeholder line is enough to satisfy the design and the gate.
  const paletteTagline = '"Warm autumn, low-contrast"';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-paper">
      {/* Header — eyebrow + title + VibeScore */}
      <View className="flex-row items-start justify-between px-screen-h pt-2">
        <View>
          <Text className="font-mono text-[10px] tracking-[1.8px] text-muted">
            NEW OUTFIT · TUESDAY
          </Text>
          <Text className="mt-1 font-serif text-[34px] leading-[40px] text-ink">
            Build a look
          </Text>
        </View>
        <VibeScoreBadge score={score} />
      </View>

      {/* Slot rows + palette card — scrollable so the rail stays sticky. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-screen-h pt-4 pb-[220px]"
      >
        <View className="gap-2">
          {SLOTS.map(({ key, label }) => {
            const itemId = draft[key];
            const item = itemId ? itemsById.get(itemId) ?? null : null;
            return (
              <SlotRow
                key={key}
                label={label}
                slotKey={key}
                item={item}
                active={activeSlot === key}
                onActivate={() => setActiveSlot(key)}
                onClear={() => clearSlot(key)}
              />
            );
          })}
        </View>

        {/* Palette read card — mist bg, up to 6 swatch dots + italic Cormorant tagline. */}
        <View className="mt-5 rounded-card bg-mist p-4">
          <View className="flex-row items-center gap-1.5">
            {swatches.length > 0 ? (
              swatches.map((hex, index) => (
                <SwatchDot key={`palette-${hex}-${index}`} hex={hex} size={16} />
              ))
            ) : (
              <Text className="font-mono text-[10px] tracking-[1.6px] text-muted">
                PALETTE
              </Text>
            )}
          </View>
          <Text className="mt-2 font-serif text-[16px] italic leading-5 text-ink-soft">
            {paletteTagline}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky AI suggestion rail — fades into the screen with a
          transparent→paper gradient overlay above it, sits flush above the
          native tab bar. */}
      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0"
      >
        {/* Fade gradient overlay — transparent at the top, paper at the bottom,
            so the scroll content dissolves into the rail. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(248,244,238,0)', 'rgba(248,244,238,1)']}
          locations={[0, 1]}
          className="absolute -top-10 left-0 right-0 h-10"
        />

        <View className="bg-paper pb-2 pt-3">
          {/* Header row — eyebrow w/ cognac bullet + underlined Shuffle */}
          <View className="flex-row items-center justify-between px-screen-h">
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-cognac" />
              <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-soft">
                AI SUGGESTS FOR {activeLabel}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shuffle suggestions"
              hitSlop={10}
              onPress={() => setShuffleSeed((s) => s + 1)}
              className="active:opacity-70"
            >
              <Text className="font-sans text-[13px] text-cognac underline">
                Shuffle
              </Text>
            </Pressable>
          </View>

          {/* Horizontal scroll of thumbnails + dashed Surprise me tail */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 px-screen-h pt-3"
          >
            {suggestions.map((item) => (
              <RailThumb
                key={item.id}
                item={item}
                onPress={() => onSelectSuggestion(item)}
              />
            ))}
            {/* Surprise me — dashed tail card matching the rail thumb size. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Surprise me"
              onPress={onSurpriseMe}
              className="w-[80px] items-center active:opacity-70"
            >
              <View
                className="items-center justify-center rounded-item border-[1.4px] border-dashed border-stone bg-paper-2"
                style={surpriseFrame}
              >
                <Text className="font-mono text-[18px] leading-[18px] text-stone">?</Text>
              </View>
              <Text
                numberOfLines={1}
                className="mt-1.5 font-sans text-[11px] text-ink-soft"
              >
                Surprise me
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
