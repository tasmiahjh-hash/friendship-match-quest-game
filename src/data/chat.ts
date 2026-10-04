export const ICEBREAKERS = [
  'What’s your ideal weekend?',
  'What’s something you’ve always wanted to try?',
  'Favourite place on campus?',
  'What’s your comfort food?',
];

/** Keyword-triggered replies for the simulated match. Order matters: first match wins. */
export const KEYWORD_REPLIES: { match: RegExp; reply: string }[] = [
  {
    match: /weekend/i,
    reply: 'Ideal weekend = slow café breakfast, badminton in the afternoon, anime marathon at night 🏸☕ What about you?',
  },
  {
    match: /always wanted to try|\btry\b/i,
    reply: 'Pottery!! I keep seeing those wheel videos and getting jealous 😭 Craft & Connect might be my gateway lol. You?',
  },
  {
    match: /campus|place|spot/i,
    reply: 'Third floor of the library by the big window. Elite study-nap spot. Also the Student Union café does a great chai 👀',
  },
  {
    match: /food|eat|hungry|ramen|pizza/i,
    reply: 'Ramen. Always ramen. There’s a place near campus with a ridiculous spicy miso 🍜',
  },
  {
    match: /halloween|costume|event|meet/i,
    reply: 'I’m going as a very low-effort ghost 👻 honestly the pumpkin carving is the main reason I signed up',
  },
  {
    match: /week|today/i,
    reply: 'Finally finished a lab report I’d been avoiding for days. Celebrated with a boba 🧋 how about yours?',
  },
  {
    match: /^(hi|hey|hello|yo|hiya|heyy+)\b/i,
    reply: 'Heyy! 👋 So glad we matched, your profile was very same-vibe energy',
  },
  {
    match: /\?\s*$/,
    reply: 'Ooh good question… honestly, people who make things feel easy. What made you sign up for Friendship Quest?',
  },
];

export const FALLBACK_REPLIES = [
  'Haha okay that’s amazing 😂',
  'Wait same!! I feel like we’d get along',
  'That’s so cool. Tell me more?',
  'Love that. It’s nice talking to someone who gets it ✨',
  'Okay you’ve sold me 😄',
];
