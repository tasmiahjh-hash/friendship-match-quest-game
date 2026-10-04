import { FALLBACK_REPLIES, KEYWORD_REPLIES } from '../data/chat';
import { eventById } from '../data/events';
import { interestById } from '../data/interests';
import type { ChatMessage, MatchResult } from '../types';
import { uid } from '../utils';

/**
 * Simulates the *other* student in a match.
 * In production this file disappears: replies, meetup consent and contact shares
 * arrive from the other user's client via a realtime channel.
 */

export function seedConversation(match: MatchResult, playerName: string): ChatMessage[] {
  const now = Date.now();
  const first = match.sharedInterests[0] ? interestById(match.sharedInterests[0])?.label.toLowerCase() : null;
  const event = match.sharedEventIds[0] ? eventById(match.sharedEventIds[0]) : null;
  const name = match.student.firstName;

  const messages: ChatMessage[] = [
    {
      id: uid('msg'),
      from: 'system',
      kind: 'notice',
      text: `You and ${name} matched at ${match.compatibility}% compatibility. Say hi! 👋`,
      at: now - 1000 * 60 * 4,
    },
    {
      id: uid('msg'),
      from: 'them',
      text: `Hi${playerName ? ` ${playerName}` : ''}! 👋 Friendship Quest says we're ${match.compatibility}% compatible, no pressure lol`,
      at: now - 1000 * 60 * 3,
    },
  ];
  if (first) {
    messages.push({
      id: uid('msg'),
      from: 'them',
      text: `I saw you're into ${first} too. How did you get into it?`,
      at: now - 1000 * 60 * 3 + 20_000,
    });
  }
  if (event) {
    messages.push({
      id: uid('msg'),
      from: 'them',
      text: `Also are you going to ${event.name}? ${event.emoji}`,
      at: now - 1000 * 60 * 2,
    });
  }
  return messages;
}

export function replyTo(text: string, replyCount: number): string {
  const keyword = KEYWORD_REPLIES.find((k) => k.match.test(text.trim()));
  if (keyword && replyCount < 6) return keyword.reply;
  return FALLBACK_REPLIES[replyCount % FALLBACK_REPLIES.length];
}

/** Rough "typing time" so replies feel human. */
export function typingDurationFor(reply: string) {
  return Math.min(2600, 900 + reply.length * 18);
}

export const PEER_TIMINGS = {
  replyStartDelay: 700,
  meetupConsent: 2800,
  contactDecision: 2400,
};
