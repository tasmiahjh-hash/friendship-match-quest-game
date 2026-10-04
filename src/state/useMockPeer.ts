import { useCallback, useEffect, useRef, useState } from 'react';
import { eventById } from '../data/events';
import { PEER_TIMINGS, replyTo, typingDurationFor } from '../services/mockPeer';
import { useGame } from './GameContext';

/**
 * Drives the simulated match: typing indicator, replies, meetup consent and contact sharing.
 * Swap this hook for a realtime subscription (e.g. Supabase channel) when going multiplayer;
 * the components only rely on { typing, send }.
 */
export function useMockPeer() {
  const { state, dispatch } = useGame();
  const [pendingReplies, setPendingReplies] = useState(0);
  const timers = useRef<number[]>([]);
  const replyCount = useRef(0);
  const active = state.relationship === 'active';

  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Stop all simulated activity when unmounting or when the match ends.
  useEffect(() => {
    if (active) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPendingReplies(0);
  }, [active]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const send = useCallback(
    (text: string, icebreaker = false) => {
      if (!text.trim() || !active) return;
      dispatch({ type: 'SEND_MESSAGE', text, icebreaker });
      const reply = replyTo(text, replyCount.current++);
      setPendingReplies((n) => n + 1);
      schedule(() => {
        dispatch({ type: 'RECEIVE_MESSAGE', text: reply });
        setPendingReplies((n) => Math.max(0, n - 1));
      }, PEER_TIMINGS.replyStartDelay + typingDurationFor(reply));
    },
    [active, dispatch, schedule],
  );

  // The match independently decides about the meetup (simulated: they say yes).
  const meetupWaiting = state.meetup.status === 'waiting';
  const meetupEventId = state.meetup.eventId;
  useEffect(() => {
    if (!meetupWaiting || !active) return;
    const t = window.setTimeout(() => {
      dispatch({ type: 'MEETUP_PEER_CONSENT' });
      const e = eventById(meetupEventId);
      window.setTimeout(
        () => dispatch({ type: 'RECEIVE_MESSAGE', text: `Yay!! See you at ${e?.name ?? 'the event'} ${e?.emoji ?? ''} I’ll look for the FAC check-in table` }),
        1400,
      );
    }, PEER_TIMINGS.meetupConsent);
    return () => window.clearTimeout(t);
  }, [meetupWaiting, meetupEventId, active, dispatch]);

  // Once the player makes a connection choice, the match makes their own (simulated: shares Instagram).
  const decided = state.sharing.decided;
  const theirsShared = Boolean(state.sharing.theirs.instagram);
  const theirInstagram = state.match?.student.private.instagram;
  useEffect(() => {
    if (!decided || theirsShared || !active || !theirInstagram) return;
    const t = window.setTimeout(
      () => dispatch({ type: 'PEER_SHARED_CONTACT', channel: 'instagram', value: theirInstagram }),
      PEER_TIMINGS.contactDecision,
    );
    return () => window.clearTimeout(t);
  }, [decided, theirsShared, active, theirInstagram, dispatch]);

  return { typing: pendingReplies > 0 && active, send };
}
