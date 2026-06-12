import { cssInterop } from 'nativewind';
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatHeader } from '@/components/chat/chat-header';
import { ChatInput } from '@/components/chat/chat-input';
import { IrisTextBubble } from '@/components/chat/iris-text-bubble';
import { OutfitCardBubble } from '@/components/chat/outfit-card-bubble';
import { PaletteBubble } from '@/components/chat/palette-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { UserBubble } from '@/components/chat/user-bubble';
import { SEED_PROFILE } from '@/data/seed';
import { sendCoachMessage } from '@/services/ai/client';
import type { CoachReply, CoachTurn } from '@/services/ai/schemas';
import { useWardrobeStore } from '@/store/wardrobe-store';
import type { ChatMessage, Item } from '@/types/wardrobe';

// SafeAreaView is not NativeWind-aware by default; map className → style so
// this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(SafeAreaView, { className: 'style' });

/** Italic system note appended in-chat when a coach request fails. */
const OFFLINE_NOTE =
  'Iris is out of reach right now — check your connection and try again.';

/** Static greeting pinned above the conversation (not persisted, not sent). */
const GREETING =
  'Tell me where you are headed and I will pull a look from your closet.';

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter}`;
}

/**
 * Maps persisted chat history to compact wire turns. Outfit/palette bubbles
 * are summarized to plain text (the wire history is text-only) and system
 * notes are dropped — they were never part of the conversation.
 */
function toCoachTurns(messages: ChatMessage[]): CoachTurn[] {
  const turns: CoachTurn[] = [];
  for (const message of messages) {
    switch (message.kind) {
      case 'text':
        if (message.from === 'system') break;
        turns.push({ from: message.from === 'user' ? 'user' : 'ai', text: message.text });
        break;
      case 'outfit':
        turns.push({
          from: 'ai',
          text: `Proposed the outfit "${message.name}" (vibe ${message.vibe}).${
            message.note ? ` ${message.note}` : ''
          }`,
        });
        break;
      case 'palette':
        turns.push({
          from: 'ai',
          text: `Shared a palette of ${message.swatches.join(', ')}.${
            message.note ? ` ${message.note}` : ''
          }`,
        });
        break;
    }
  }
  return turns;
}

/** Turns one structured coach reply into a persisted chat bubble. */
function toChatMessage(reply: CoachReply): ChatMessage {
  const base = { id: makeId('m'), at: new Date().toISOString() } as const;
  switch (reply.kind) {
    case 'text':
      return { ...base, from: 'ai', kind: 'text', text: reply.text };
    case 'outfit':
      return {
        ...base,
        from: 'ai',
        kind: 'outfit',
        itemIds: reply.itemIds,
        name: reply.name,
        vibe: reply.vibe,
        note: reply.note,
      };
    case 'palette':
      return { ...base, from: 'ai', kind: 'palette', swatches: reply.swatches, note: reply.note };
  }
}

export default function CoachScreen() {
  const items = useWardrobeStore((state) => state.items);
  const outfits = useWardrobeStore((state) => state.outfits);
  const profile = useWardrobeStore((state) => state.profile);
  const messages = useWardrobeStore((state) => state.messages);
  const isTyping = useWardrobeStore((state) => state.isTyping);
  const appendMessage = useWardrobeStore((state) => state.appendMessage);
  const setTyping = useWardrobeStore((state) => state.setTyping);
  const saveOutfit = useWardrobeStore((state) => state.saveOutfit);

  const [draftText, setDraftText] = useState('');
  /** Message ids whose proposals were saved via "Save look" (receipt never saves). */
  const [savedMessageIds, setSavedMessageIds] = useState<string[]>([]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isTyping) return;
    setDraftText('');

    const userMessage: ChatMessage = {
      id: makeId('m'),
      from: 'user',
      kind: 'text',
      text,
      at: new Date().toISOString(),
    };
    appendMessage(userMessage);
    setTyping(true);

    // Full mapped history goes on the wire; the server windows to the last 20
    // turns, so multi-turn context holds without unbounded payloads.
    let result: Awaited<ReturnType<typeof sendCoachMessage>>;
    try {
      result = await sendCoachMessage({
        messages: toCoachTurns([...messages, userMessage]),
        wardrobe: {
          items: items.map(({ id, name, category, swatches, wornCount }) => ({
            id,
            name,
            category,
            swatches,
            wornCount,
          })),
          outfits: outfits.map(({ id, name, vibe, itemIds }) => ({ id, name, vibe, itemIds })),
          profile: profile ?? SEED_PROFILE,
        },
      });
    } catch {
      // sendCoachMessage resolves errors to { ok: false } by contract; this
      // belt-and-braces catch keeps isTyping from sticking (and the input
      // from locking) if it ever throws unexpectedly.
      result = { ok: false, error: { code: 'network', message: 'Unexpected client error.' } };
    } finally {
      setTyping(false);
    }

    if (!result.ok) {
      // Graceful failure: an italic in-chat note; the input stays usable.
      appendMessage({
        id: makeId('m'),
        from: 'system',
        kind: 'text',
        text: OFFLINE_NOTE,
        at: new Date().toISOString(),
      });
      return;
    }

    for (const reply of result.data.messages) {
      appendMessage(toChatMessage(reply));
    }
  }, [appendMessage, draftText, isTyping, items, messages, outfits, profile, setTyping]);

  const handleSaveLook = useCallback(
    (message: Extract<ChatMessage, { kind: 'outfit' }>) => {
      if (savedMessageIds.includes(message.id)) return;
      saveOutfit({
        id: makeId('o'),
        name: message.name,
        vibe: message.vibe,
        itemIds: message.itemIds,
        savedAt: new Date().toISOString(),
      });
      setSavedMessageIds((ids) => [...ids, message.id]);
    },
    [saveOutfit, savedMessageIds]
  );

  const renderMessage = useCallback(
    ({ item: message }: { item: ChatMessage }) => {
      switch (message.kind) {
        case 'text':
          if (message.from === 'user') return <UserBubble text={message.text} />;
          if (message.from === 'system') {
            return (
              <Text className="self-center px-6 text-center font-sans text-[12px] italic text-muted">
                {message.text}
              </Text>
            );
          }
          return <IrisTextBubble text={message.text} />;
        case 'outfit': {
          const byId = new Map(items.map((item) => [item.id, item]));
          const proposalItems = message.itemIds
            .map((id) => byId.get(id))
            .filter((item): item is Item => item !== undefined);
          return (
            <OutfitCardBubble
              name={message.name}
              vibe={message.vibe}
              note={message.note}
              items={proposalItems}
              saved={savedMessageIds.includes(message.id)}
              onSaveLook={() => handleSaveLook(message)}
            />
          );
        }
        case 'palette':
          return <PaletteBubble swatches={message.swatches} note={message.note} />;
      }
    },
    [handleSaveLook, items, savedMessageIds]
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-paper">
      <ChatHeader pieceCount={items.length} />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          renderItem={renderMessage}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          contentContainerClassName="gap-3 px-screen-h pb-4 pt-4"
          ListHeaderComponent={
            <View className="pb-1">
              <IrisTextBubble text={GREETING} />
            </View>
          }
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />
        <View className="px-screen-h pb-2 pt-1.5">
          <ChatInput value={draftText} onChangeText={setDraftText} onSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
