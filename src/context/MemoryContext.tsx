/**
 * App-wide state management via React Context + useReducer.
 * Provides hooks: useMemories, useSearch, useCapture, useAppSettings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

import { mockMemories } from '@/data/mock-memories';
import {
  AiTag,
  AppTheme,
  CardStyle,
  CaptureState,
  DayGroup,
  FeedLayout,
  Memory,
  MemoryType,
  SearchState,
  SearchStatus,
} from '@/types/memory';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_THEME = '@recall/theme';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AppState {
  memories: Memory[];
  search: SearchState;
  capture: CaptureState;
  theme: AppTheme;
  feedLayout: FeedLayout;
  cardStyle: CardStyle;
}

const initialState: AppState = {
  memories: mockMemories,
  search: {
    query: '',
    status: 'idle' as SearchStatus,
    answer: undefined,
    sources: [],
    related: [],
    recents: [],
  },
  capture: {
    draft: '',
    extractedTags: [],
  },
  theme: 'system',
  feedLayout: 'card',
  cardStyle: 'elevated',
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'APPEND_MEMORY'; payload: Memory }
  | { type: 'SET_SEARCH_STATUS'; payload: { status: SearchStatus; query: string } }
  | {
      type: 'SET_SEARCH_ANSWER';
      payload: { answer: string; sources: Memory[]; related: Memory[] };
    }
  | { type: 'SET_SEARCH_EMPTY' }
  | { type: 'RESET_SEARCH' }
  | { type: 'SET_CAPTURE_DRAFT'; payload: { draft: string; extractedTags: AiTag[] } }
  | { type: 'SET_THEME'; payload: AppTheme }
  | { type: 'SET_FEED_LAYOUT'; payload: FeedLayout }
  | { type: 'SET_CARD_STYLE'; payload: CardStyle };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'APPEND_MEMORY':
      return { ...state, memories: [action.payload, ...state.memories] };
    case 'SET_SEARCH_STATUS':
      return {
        ...state,
        search: { ...state.search, status: action.payload.status, query: action.payload.query },
      };
    case 'SET_SEARCH_ANSWER':
      return {
        ...state,
        search: {
          ...state.search,
          status: 'answered',
          answer: action.payload.answer,
          sources: action.payload.sources,
          related: action.payload.related,
          recents: state.search.query
            ? Array.from(new Set([state.search.query, ...state.search.recents])).slice(0, 10)
            : state.search.recents,
        },
      };
    case 'SET_SEARCH_EMPTY':
      return { ...state, search: { ...state.search, status: 'empty', sources: [], related: [] } };
    case 'RESET_SEARCH':
      return {
        ...state,
        search: { ...initialState.search, recents: state.search.recents },
      };
    case 'SET_CAPTURE_DRAFT':
      return {
        ...state,
        capture: {
          draft: action.payload.draft,
          extractedTags: action.payload.extractedTags,
        },
      };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_FEED_LAYOUT':
      return { ...state, feedLayout: action.payload };
    case 'SET_CARD_STYLE':
      return { ...state, cardStyle: action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface MemoryContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const MemoryContext = createContext<MemoryContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate theme from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_THEME).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        dispatch({ type: 'SET_THEME', payload: stored as AppTheme });
      }
    });
  }, []);

  // Persist theme changes to AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_THEME, state.theme);
  }, [state.theme]);

  return <MemoryContext.Provider value={{ state, dispatch }}>{children}</MemoryContext.Provider>;
}

// ---------------------------------------------------------------------------
// Internal hook
// ---------------------------------------------------------------------------

function useMemoryContext(): MemoryContextValue {
  const ctx = useContext(MemoryContext);
  if (!ctx) {
    throw new Error('useMemoryContext must be used within a MemoryProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// useMemories — returns memories grouped by day
// ---------------------------------------------------------------------------

function groupByDay(memories: Memory[]): DayGroup[] {
  const map = new Map<string, Memory[]>();

  const sorted = [...memories].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  for (const memory of sorted) {
    const date = memory.createdAt.toISOString().slice(0, 10);
    const group = map.get(date);
    if (group) {
      group.push(memory);
    } else {
      map.set(date, [memory]);
    }
  }

  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export function useMemories(): DayGroup[] {
  const { state } = useMemoryContext();
  return groupByDay(state.memories);
}

// ---------------------------------------------------------------------------
// useSearch — search with simulated async states
// ---------------------------------------------------------------------------

interface UseSearchReturn {
  searchState: SearchState;
  search: (query: string) => void;
  reset: () => void;
}

export function useSearch(): UseSearchReturn {
  const { state, dispatch } = useMemoryContext();

  const search = useCallback(
    (query: string) => {
      if (!query.trim()) {
        dispatch({ type: 'RESET_SEARCH' });
        return;
      }

      dispatch({ type: 'SET_SEARCH_STATUS', payload: { status: 'thinking', query } });

      setTimeout(() => {
        const lower = query.toLowerCase();
        const matched = state.memories.filter(
          (m) =>
            m.title.toLowerCase().includes(lower) ||
            m.body?.toLowerCase().includes(lower) ||
            m.aiTags.some((t) => t.label.toLowerCase().includes(lower))
        );

        if (matched.length === 0) {
          dispatch({ type: 'SET_SEARCH_EMPTY' });
          return;
        }

        const sources = matched.slice(0, 3);
        const related = matched.slice(3, 6);

        dispatch({
          type: 'SET_SEARCH_ANSWER',
          payload: {
            answer: `Here's what I found about "${query}" across your memories.`,
            sources,
            related,
          },
        });
      }, 1200);
    },
    [state.memories, dispatch]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_SEARCH' });
  }, [dispatch]);

  return { searchState: state.search, search, reset };
}

// ---------------------------------------------------------------------------
// useCapture — capture composer with save
// ---------------------------------------------------------------------------

interface UseCaptureReturn {
  draft: string;
  extractedTags: AiTag[];
  setDraft: (draft: string) => void;
  save: (draft: string) => void;
}

let nextId = 1000;

function extractTags(text: string): AiTag[] {
  const tags: AiTag[] = [];
  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.startsWith('@')) {
      tags.push({
        id: `ai-${nextId++}`,
        label: word.slice(1),
        kind: 'person',
        aiExtracted: true,
      });
    } else if (word.startsWith('#')) {
      tags.push({
        id: `ai-${nextId++}`,
        label: word.slice(1),
        kind: 'topic',
        aiExtracted: true,
      });
    }
  }
  return tags;
}

export function useCapture(): UseCaptureReturn {
  const { state, dispatch } = useMemoryContext();

  const setDraft = useCallback(
    (draft: string) => {
      const extractedTags = extractTags(draft);
      dispatch({ type: 'SET_CAPTURE_DRAFT', payload: { draft, extractedTags } });
    },
    [dispatch]
  );

  const save = useCallback(
    (draft: string) => {
      if (!draft.trim()) return;

      const extractedTags = extractTags(draft);
      const memory: Memory = {
        id: `mem-capture-${nextId++}`,
        type: 'note' as MemoryType,
        title: draft.length > 60 ? draft.slice(0, 60) + '…' : draft,
        body: draft,
        source: 'Quick capture',
        createdAt: new Date(),
        aiTags: extractedTags,
      };

      dispatch({ type: 'APPEND_MEMORY', payload: memory });
      dispatch({ type: 'SET_CAPTURE_DRAFT', payload: { draft: '', extractedTags: [] } });
    },
    [dispatch]
  );

  return {
    draft: state.capture.draft,
    extractedTags: state.capture.extractedTags,
    setDraft,
    save,
  };
}

// ---------------------------------------------------------------------------
// useAppSettings — theme, feedLayout, cardStyle
// ---------------------------------------------------------------------------

interface UseAppSettingsReturn {
  theme: AppTheme;
  feedLayout: FeedLayout;
  cardStyle: CardStyle;
  setTheme: (theme: AppTheme) => void;
  setFeedLayout: (layout: FeedLayout) => void;
  setCardStyle: (style: CardStyle) => void;
}

export function useAppSettings(): UseAppSettingsReturn {
  const { state, dispatch } = useMemoryContext();

  const setTheme = useCallback(
    (theme: AppTheme) => {
      dispatch({ type: 'SET_THEME', payload: theme });
    },
    [dispatch]
  );

  const setFeedLayout = useCallback(
    (layout: FeedLayout) => {
      dispatch({ type: 'SET_FEED_LAYOUT', payload: layout });
    },
    [dispatch]
  );

  const setCardStyle = useCallback(
    (style: CardStyle) => {
      dispatch({ type: 'SET_CARD_STYLE', payload: style });
    },
    [dispatch]
  );

  return {
    theme: state.theme,
    feedLayout: state.feedLayout,
    cardStyle: state.cardStyle,
    setTheme,
    setFeedLayout,
    setCardStyle,
  };
}
