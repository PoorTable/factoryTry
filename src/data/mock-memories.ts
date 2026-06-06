/**
 * Realistic mock data for development.
 * Covers all memory types: note, voice, link, place, photo, screenshot.
 * Spread across 3 days.
 */

import { Memory } from '@/types/memory';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(today.getDate() - 2);

export const mockMemories: Memory[] = [
  // --- Today ---
  {
    id: 'mem-001',
    type: 'note',
    title: 'Product meeting notes',
    body: 'Decided to move the launch date to Q3. Need to sync with design team on the onboarding flow. Action items: write spec, book design review.',
    source: 'Quick capture',
    createdAt: new Date(today.setHours(10, 30)),
    aiTags: [
      { id: 'tag-001', label: 'Product launch', kind: 'event', aiExtracted: true },
      { id: 'tag-002', label: 'Design review', kind: 'action', aiExtracted: true },
      { id: 'tag-003', label: 'Q3', kind: 'topic', aiExtracted: true },
    ],
  },
  {
    id: 'mem-002',
    type: 'voice',
    title: 'Idea: ambient notification system',
    body: 'Voice memo about designing a low-friction notification layer that adapts to user context.',
    source: 'Voice recorder',
    createdAt: new Date(today.setHours(9, 15)),
    aiTags: [
      { id: 'tag-004', label: 'Notifications', kind: 'topic', aiExtracted: true },
      { id: 'tag-005', label: 'UX idea', kind: 'topic', aiExtracted: true },
    ],
  },
  {
    id: 'mem-003',
    type: 'link',
    title: 'The future of AI memory systems',
    body: 'Article from MIT Technology Review discussing how AI assistants will handle long-term user context.',
    source: 'Safari · share sheet',
    createdAt: new Date(today.setHours(8, 0)),
    media: 'https://placehold.co/600x320/4F7CFF/FFFFFF?text=Article',
    aiTags: [
      { id: 'tag-006', label: 'AI memory', kind: 'topic', aiExtracted: true },
      { id: 'tag-007', label: 'MIT', kind: 'place', aiExtracted: true },
    ],
  },

  // --- Yesterday ---
  {
    id: 'mem-004',
    type: 'photo',
    title: 'Whiteboard session — architecture diagram',
    body: 'Context architecture whiteboard from the team offsite.',
    source: 'Camera',
    createdAt: new Date(yesterday.setHours(16, 45)),
    media: 'https://placehold.co/600x400/5BB98C/FFFFFF?text=Photo',
    aiTags: [
      { id: 'tag-008', label: 'Architecture', kind: 'topic', aiExtracted: true },
      { id: 'tag-009', label: 'Offsite', kind: 'event', aiExtracted: true },
    ],
  },
  {
    id: 'mem-005',
    type: 'place',
    title: 'Blue Bottle Coffee — Mission',
    body: 'Had a great 1:1 with Sarah here. Discussed roadmap priorities for H2.',
    source: 'Maps',
    createdAt: new Date(yesterday.setHours(14, 0)),
    aiTags: [
      { id: 'tag-010', label: 'Sarah', kind: 'person', aiExtracted: true },
      { id: 'tag-011', label: 'Blue Bottle Coffee', kind: 'place', aiExtracted: true },
      { id: 'tag-012', label: 'Roadmap', kind: 'topic', aiExtracted: true },
    ],
  },
  {
    id: 'mem-006',
    type: 'screenshot',
    title: 'Stripe dashboard — MRR milestone',
    body: 'Screenshot showing MRR hitting $50k.',
    source: 'Screenshot · Stripe',
    createdAt: new Date(yesterday.setHours(11, 30)),
    media: 'https://placehold.co/600x340/9A9DA4/FFFFFF?text=Screenshot',
    aiTags: [
      { id: 'tag-013', label: 'Revenue milestone', kind: 'event', aiExtracted: true },
      { id: 'tag-014', label: 'Stripe', kind: 'topic', aiExtracted: true },
    ],
  },

  // --- Two days ago ---
  {
    id: 'mem-007',
    type: 'note',
    title: 'Book recommendations from Alex',
    body: '"The Mom Test" by Rob Fitzpatrick. "Shape Up" by Ryan Singer. "Continuous Discovery Habits" by Teresa Torres.',
    source: 'Alex · Slack',
    createdAt: new Date(twoDaysAgo.setHours(18, 0)),
    aiTags: [
      { id: 'tag-015', label: 'Alex', kind: 'person', aiExtracted: true },
      { id: 'tag-016', label: 'Books', kind: 'topic', aiExtracted: true },
      { id: 'tag-017', label: 'Reading list', kind: 'action', aiExtracted: true },
    ],
  },
  {
    id: 'mem-008',
    type: 'voice',
    title: 'Reflection on user interviews',
    body: 'Voice note summarising patterns from last week\'s user interviews. Key insight: users want passive capture, not active logging.',
    source: 'Voice recorder',
    createdAt: new Date(twoDaysAgo.setHours(13, 20)),
    aiTags: [
      { id: 'tag-018', label: 'User research', kind: 'topic', aiExtracted: true },
      { id: 'tag-019', label: 'Passive capture', kind: 'topic', aiExtracted: true },
    ],
  },
];
