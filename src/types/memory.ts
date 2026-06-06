/**
 * Core data model types for the Recall app.
 * Single source of truth for all memory-related types.
 */

export type MemoryType = 'note' | 'voice' | 'screenshot' | 'photo' | 'link' | 'place';

export interface AiTag {
  id: string;
  label: string;
  kind: 'person' | 'place' | 'topic' | 'event' | 'action';
  aiExtracted: boolean;
}

export interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  body?: string;
  source?: string;
  createdAt: Date;
  media?: string;
  aiTags: AiTag[];
}

export interface DayGroup {
  date: string;
  items: Memory[];
}

export type SearchStatus = 'idle' | 'thinking' | 'answered' | 'empty';

export interface SearchState {
  query: string;
  status: SearchStatus;
  answer?: string;
  sources: Memory[];
  related: Memory[];
  recents: string[];
}

export interface FollowUp {
  id: string;
  memoryId: string;
  prompt: string;
}

export interface DigestState {
  capturedCount: number;
  followUps: FollowUp[];
  theme?: string;
  reminderCount: number;
}

export interface CaptureState {
  draft: string;
  extractedTags: AiTag[];
}

export type FeedLayout = 'card' | 'rows' | 'rail';
export type CardStyle = 'elevated' | 'hairline' | 'edge';
export type AppTheme = 'light' | 'dark' | 'system';
