import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { cssInterop } from 'nativewind';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { CameraPermissionDenied } from '@/components/camera-permission-denied';
import { useGarmentCamera } from '@/hooks/use-garment-camera';
import { useAi } from '@/services/ai/client';
import type { IdentifyResult } from '@/services/ai/schemas';
import { isLowConfidence, mapIdentifyResultToTags } from '@/services/ai/tags';
import { savePhoto } from '@/services/photo-store';
import { useWardrobeStore } from '@/store/wardrobe-store';
import type { Item } from '@/types/wardrobe';

// Third-party views are not NativeWind-aware by default; map className → style
// so this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(CameraView, { className: 'style' });
cssInterop(Image, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });

/** Stagger between tag pill reveals, in ms (APP-19 spec: ~220ms). */
const TAG_STAGGER_MS = 220;

/** Tag reveal animation duration (APP-19 spec: 320ms cubic-bezier-ish ease). */
const TAG_REVEAL_DURATION_MS = 320;

/**
 * Pre-computed weave-line top offsets (sand-paper background overlay).
 * Pulled out of JSX so per-line `style` values are referenced variables,
 * not inline object literals (GATE-3 NativeWind strictness).
 */
const WEAVE_STYLES: { top: `${number}%` }[] = Array.from({ length: 40 }, (_, i) => ({
  top: `${(i + 1) * 2.4}%`,
}));

/**
 * Computes the `{ top, left }` style for a tag pill. Positions come from the
 * `mapIdentifyResultToTags` helper (percentages of the frame), which is too
 * dynamic to express as Tailwind arbitrary values. Returning a fresh object
 * from a helper keeps inline object-literal style props out of the JSX.
 */
function tagPositionStyle(position: { top: number; left: number }): {
  top: `${number}%`;
  left: `${number}%`;
} {
  return { top: `${position.top}%`, left: `${position.left}%` };
}

/** Per-swatch dot style — runtime hex + slight overlap for the palette tag. */
function swatchDotStyle(hex: string, index: number): { backgroundColor: string; marginLeft: number } {
  return { backgroundColor: hex, marginLeft: index === 0 ? 0 : -2 };
}

/** ArrayBuffer → base64 (no Buffer in RN; minimal btoa fallback). */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  // React Native ships a global btoa; fall back to a tiny encoder otherwise.
  if (typeof btoa === 'function') return btoa(binary);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  while (i < binary.length) {
    const c1 = binary.charCodeAt(i++) & 0xff;
    const c2 = binary.charCodeAt(i++) & 0xff;
    const c3 = binary.charCodeAt(i++) & 0xff;
    out +=
      chars.charAt(c1 >> 2) +
      chars.charAt(((c1 & 3) << 4) | (c2 >> 4)) +
      (isNaN(c2) ? '=' : chars.charAt(((c2 & 15) << 2) | (c3 >> 6))) +
      (isNaN(c3) ? '=' : chars.charAt(c3 & 63));
  }
  return out;
}

/** Generates a fresh wardrobe item id — matches the coach screen's pattern. */
let idCounter = 0;
function newItemId(): string {
  idCounter += 1;
  return `i-${Date.now().toString(36)}${idCounter}`;
}

/**
 * Camera Capture + AI Tagging Screen (APP-19).
 *
 * State A — live viewfinder over the back camera with 4 corner brackets,
 * an `ADD A PIECE` pill, and a 74px shutter.
 * State B — sand-colored freeze frame with 4 sequentially-revealed AI tags
 * (320ms tween, 220ms stagger) and a bottom confirm panel ("LOOKS LIKE …",
 * Retake + Add to wardrobe). The Edit affordance + low-confidence/error
 * path drops the user into a focused `TextInput` so the flow never dead-ends.
 */
export default function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, pictureSize, onCameraReady, takePhoto, retake, photoUri, state } =
    useGarmentCamera();
  const addItem = useWardrobeStore((s) => s.addItem);
  const { identify } = useAi();

  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(null);
  const [manualName, setManualName] = useState<string>('');
  const [manualEdit, setManualEdit] = useState<boolean>(false);
  const [identifyError, setIdentifyError] = useState<boolean>(false);
  const nameInputRef = useRef<TextInput>(null);

  // First visit: fire the system permission prompt once it can be shown.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Wraps `retake` so per-screen identify state is reset alongside the hook.
  const onRetake = useCallback(() => {
    setIdentifyResult(null);
    setIdentifyError(false);
    setManualEdit(false);
    setManualName('');
    retake();
  }, [retake]);

  // Kick off identify when a fresh photo lands; on low-confidence / error
  // drop into manual edit per the "never a dead end" rule.
  useEffect(() => {
    if (state !== 'frozen' || !photoUri) return;
    let cancelled = false;

    (async () => {
      try {
        const file = new File(photoUri);
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        const result = await identify(base64);
        if (cancelled) return;

        if (!result.ok) {
          setIdentifyError(true);
          setManualEdit(true);
          return;
        }
        setIdentifyResult(result.data);
        setManualName(result.data.name);
        if (isLowConfidence(result.data)) {
          setManualEdit(true);
        }
      } catch {
        if (cancelled) return;
        setIdentifyError(true);
        setManualEdit(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state, photoUri, identify]);

  // Focus the name field whenever the manual-edit affordance reveals.
  useEffect(() => {
    if (manualEdit) {
      // Tiny delay so the input is mounted before we focus it.
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [manualEdit]);

  const onAddToWardrobe = useCallback(async () => {
    if (!photoUri) return;
    const itemId = newItemId();
    const tags = identifyResult;
    const finalName =
      manualName.trim() || tags?.name || 'New piece';

    let savedUri: string | null = null;
    try {
      savedUri = await savePhoto(photoUri, itemId);
    } catch {
      // Photo persistence is best-effort; the item still gets added with a
      // null photoUri so the user is never stuck.
      savedUri = null;
    }

    const item: Item = {
      id: itemId,
      name: finalName,
      category: tags?.category ?? 'Tops',
      color: tags?.swatches[0] ?? '#A35836',
      swatches: tags?.swatches ?? ['#A35836'],
      season: tags?.season ?? 'all',
      photoUri: savedUri,
      wornCount: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      lastWornAt: null,
    };
    addItem(item);
    router.back();
  }, [photoUri, identifyResult, manualName, addItem, router]);

  // Permission still resolving, or the system prompt is on screen.
  if (!permission || (!permission.granted && permission.canAskAgain)) {
    return <View className="flex-1 bg-paper" />;
  }

  if (!permission.granted) {
    return <CameraPermissionDenied />;
  }

  // -----------------------------------------------------------------------
  // State A — live viewfinder
  // -----------------------------------------------------------------------
  if (state === 'viewfinder') {
    return (
      <View className="flex-1 bg-[#1A1612]">
        <CameraView
          ref={cameraRef}
          facing="back"
          pictureSize={pictureSize}
          onCameraReady={onCameraReady}
          className="absolute inset-0"
        />

        {/* Four corner brackets — 28px long, 1.4px stroke, paper @ 70%. */}
        <View
          accessibilityElementsHidden
          className="absolute left-[100px] top-[100px] h-7 w-7 border-l-[1.4px] border-t-[1.4px] border-paper/70 rounded-tl-[2px]"
          testID="bracket-tl"
        />
        <View
          accessibilityElementsHidden
          className="absolute right-[100px] top-[100px] h-7 w-7 border-r-[1.4px] border-t-[1.4px] border-paper/70 rounded-tr-[2px]"
          testID="bracket-tr"
        />
        <View
          accessibilityElementsHidden
          className="absolute bottom-[100px] left-[100px] h-7 w-7 border-b-[1.4px] border-l-[1.4px] border-paper/70 rounded-bl-[2px]"
          testID="bracket-bl"
        />
        <View
          accessibilityElementsHidden
          className="absolute bottom-[100px] right-[100px] h-7 w-7 border-b-[1.4px] border-r-[1.4px] border-paper/70 rounded-br-[2px]"
          testID="bracket-br"
        />

        {/* Top bar — close · ADD A PIECE · flash */}
        <View className="absolute left-0 right-0 top-16 flex-row items-center justify-between px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            hitSlop={12}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-paper/30 bg-paper/15 active:opacity-70"
          >
            <Text className="font-mono text-[16px] leading-none text-paper">×</Text>
          </Pressable>

          <View className="rounded-pill border border-paper/30 bg-paper/15 px-4 py-2">
            <Text className="font-mono text-[10px] uppercase tracking-[1.8px] text-paper">
              Add a piece
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle flash"
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full border border-paper/30 bg-paper/15 active:opacity-70"
          >
            <Text className="font-mono text-[14px] leading-none text-paper">⚡</Text>
          </Pressable>
        </View>

        {/* Shutter — 74px, transparent outer ring + paper inner disc */}
        <View className="absolute bottom-16 left-0 right-0 items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            hitSlop={20}
            onPress={() => {
              takePhoto().catch(() => {
                // Best-effort capture; the hook already swallows errors.
              });
            }}
            className="h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-paper active:opacity-70"
            testID="shutter"
          >
            <View className="h-[60px] w-[60px] rounded-full bg-paper" />
          </Pressable>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // State B — freeze frame + AI tags
  // -----------------------------------------------------------------------
  const tags = identifyResult ? mapIdentifyResultToTags(identifyResult) : [];
  const chips: string[] = identifyResult
    ? [
        `${identifyResult.category} · ${identifyResult.name.split(' ').slice(-1)[0]}`,
        `${identifyResult.season.charAt(0).toUpperCase()}${identifyResult.season.slice(1)} · Summer`,
        identifyResult.paletteLabel,
      ]
    : [];

  return (
    <View className="flex-1 bg-[#E7D9BE]">
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          contentFit="cover"
          accessibilityLabel="Captured garment photo"
          className="absolute inset-0 opacity-0"
        />
      ) : null}

      {/* Subtle weave overlay — repeated horizontal hairlines at 6% opacity. */}
      <View pointerEvents="none" className="absolute inset-0">
        {WEAVE_STYLES.map((weaveStyle, i) => (
          <View
            key={`weave-${i}`}
            className="absolute left-0 right-0 h-px bg-ink/[0.06]"
            style={weaveStyle}
          />
        ))}
      </View>

      {/* Top pill — IDENTIFIED · 0.4s */}
      <View className="absolute left-0 right-0 top-16 flex-row items-center justify-between px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-paper/70 active:opacity-70"
        >
          <Text className="font-mono text-[16px] leading-none text-ink">×</Text>
        </Pressable>

        <View className="rounded-pill border border-ink/10 bg-paper/70 px-4 py-2">
          <Text className="font-mono text-[10px] tracking-[1.8px] text-ink">
            IDENTIFIED · 0.4S
          </Text>
        </View>

        <View className="h-10 w-10" />
      </View>

      {/* Floating AI tag pills — positions from mapIdentifyResultToTags */}
      {tags.map((tag, index) => {
        const positionStyle = tagPositionStyle(tag.position);
        return (
          <Animated.View
            key={tag.key}
            entering={FadeInUp.duration(TAG_REVEAL_DURATION_MS).delay(index * TAG_STAGGER_MS)}
            className="absolute"
            style={positionStyle}
            testID={`tag-pill-${tag.key}`}
          >
            <View className="flex-row items-center gap-1.5 rounded-pill border border-ink/10 bg-paper/85 px-3 py-1.5 shadow">
              {tag.key === 'mood' ? (
                <View className="h-1.5 w-1.5 rounded-full bg-cognac" />
              ) : null}
              {tag.key === 'palette' && identifyResult ? (
                <View className="flex-row">
                  {identifyResult.swatches.slice(0, 2).map((hex, i) => {
                    const swatchStyle = swatchDotStyle(hex, i);
                    return (
                      <View
                        key={`${tag.key}-sw-${i}`}
                        className="h-1.5 w-1.5 rounded-full"
                        style={swatchStyle}
                      />
                    );
                  })}
                </View>
              ) : null}
              <Text className="font-sans text-[12px] text-ink">{tag.label}</Text>
            </View>
          </Animated.View>
        );
      })}

      {/* Bottom confirm panel — LOOKS LIKE … Retake · Add to wardrobe */}
      <View className="absolute bottom-0 left-0 right-0 px-[14px] pb-10">
        <View className="rounded-[28px] border border-ink/10 bg-paper/95 p-5 shadow-lg">
          <View className="flex-row items-center justify-between">
            <Text className="font-mono text-[10px] tracking-[1.8px] text-muted">
              LOOKS LIKE
            </Text>
            {identifyError ? (
              <Text className="font-mono text-[10px] uppercase tracking-[1.4px] text-cognac">
                Tap to name
              </Text>
            ) : null}
          </View>

          <View className="mt-2 flex-row items-end justify-between">
            {manualEdit ? (
              <TextInput
                ref={nameInputRef}
                value={manualName}
                onChangeText={setManualName}
                placeholder="Name this piece"
                placeholderTextColor="#8A7C6E"
                autoFocus
                returnKeyType="done"
                className="flex-1 border-b border-ink/20 pb-1 font-serif text-[26px] text-ink"
              />
            ) : (
              <Text className="flex-1 font-serif text-[26px] leading-8 text-ink">
                {identifyResult?.name ?? 'New piece'}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit name"
              hitSlop={10}
              onPress={() => setManualEdit((v) => !v)}
              className="ml-3 active:opacity-70"
            >
              <Text className="font-sans text-[13px] text-cognac underline">Edit</Text>
            </Pressable>
          </View>

          {/* Chips */}
          {chips.length > 0 ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {chips.map((label, i) => (
                <View
                  key={`chip-${i}`}
                  className="rounded-pill border border-stone bg-mist px-3 py-1.5"
                >
                  <Text className="font-sans-medium text-[11px] text-ink-soft">{label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Action row */}
          <View className="mt-5 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retake photo"
              hitSlop={12}
              onPress={onRetake}
              className="flex-1 items-center justify-center rounded-pill border border-ink/15 bg-paper px-5 py-3.5 active:opacity-70"
            >
              <Text className="font-sans-medium text-[14px] text-ink">Retake</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add to wardrobe"
              hitSlop={12}
              onPress={() => {
                onAddToWardrobe().catch(() => {
                  // Add is best-effort; persist failures still navigate back.
                });
              }}
              className="flex-[1.4] flex-row items-center justify-center gap-2 rounded-pill bg-cognac px-5 py-3.5 active:opacity-80"
            >
              <Text className="font-sans-medium text-[14px] text-paper">Add to wardrobe</Text>
              <Text className="font-sans-medium text-[14px] text-paper">→</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
