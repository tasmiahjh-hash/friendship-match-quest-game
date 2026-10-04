import type { Student } from '../types';

export const PLAYER_AVATARS = ['🦊', '🐼', '🦉', '🐸', '🐧', '🦦', '🐨', '🦋'];
export const PLAYER_AVATAR_GRADIENT: [string, string] = ['#ff8a6b', '#ffb36b'];

// Fictional mock students in the matching pool. Not real people.
// In a real deployment this pool lives server-side and `private` fields never leave the server
// unless the student explicitly chooses to share them.
export const MOCK_STUDENTS: Student[] = [
  {
    id: 'stu-maya',
    firstName: 'Maya',
    avatar: '🦢',
    avatarGradient: ['#a78bfa', '#ff7eb6'],
    pronouns: 'she/her',
    program: 'Psychology',
    year: '2nd',
    bio: 'Badminton on Tuesdays, café hopping on Sundays, anime in between.',
    interests: ['badminton', 'cafes', 'anime', 'reading', 'music', 'crafts'],
    styleAnswers: { night: 'quiet', planning: 'planner', texting: 'occasional', group: 'small', values: 'loyalty' },
    availableEventIds: ['halloween-social', 'craft-connect', 'games-night'],
    meetPreference: 'either',
    private: { email: 'maya.l@mapleridge.edu', instagram: '@maya.rallies' },
  },
  {
    id: 'stu-jordan',
    firstName: 'Jordan',
    avatar: '🐺',
    avatarGradient: ['#6cc6ff', '#5ee2b5'],
    pronouns: 'he/him',
    program: 'Computer Science',
    year: '3rd',
    bio: 'Will absolutely destroy you at Mario Kart. Gym at 7am, somehow.',
    interests: ['gaming', 'gym', 'movies', 'food', 'studying', 'music'],
    styleAnswers: { night: 'mix', planning: 'spontaneous', texting: 'frequent', group: 'small', values: 'humour' },
    availableEventIds: ['games-night', 'karaoke-night', 'halloween-social'],
    meetPreference: 'event',
    private: { email: 'jordan.k@mapleridge.edu', instagram: '@jordan.plays' },
  },
  {
    id: 'stu-priya',
    firstName: 'Priya',
    avatar: '🦚',
    avatarGradient: ['#ff9f43', '#ff5e62'],
    pronouns: 'she/they',
    program: 'Fine Arts',
    year: '1st',
    bio: 'Sketchbook always in my bag. Looking for museum and matcha buddies.',
    interests: ['art', 'crafts', 'cafes', 'photography', 'travel', 'movies'],
    styleAnswers: { night: 'quiet', planning: 'spontaneous', texting: 'occasional', group: 'one-on-one', values: 'growth' },
    availableEventIds: ['craft-connect', 'halloween-social'],
    meetPreference: 'chat-first',
    private: { email: 'priya.s@mapleridge.edu', instagram: '@priya.draws' },
  },
  {
    id: 'stu-leo',
    firstName: 'Leo',
    avatar: '🦁',
    avatarGradient: ['#ffd166', '#ff8a6b'],
    pronouns: 'he/they',
    program: 'Business',
    year: '2nd',
    bio: 'Karaoke enthusiast, hiking organiser, will try any restaurant once.',
    interests: ['parties', 'outdoors', 'travel', 'food', 'music', 'gym'],
    styleAnswers: { night: 'social', planning: 'planner', texting: 'frequent', group: 'group', values: 'adventure' },
    availableEventIds: ['karaoke-night', 'halloween-social', 'games-night'],
    meetPreference: 'event',
    private: { email: 'leo.m@mapleridge.edu', instagram: '@leo.goes.outside' },
  },
  {
    id: 'stu-sam',
    firstName: 'Sam',
    avatar: '🐢',
    avatarGradient: ['#5ee2b5', '#a78bfa'],
    pronouns: 'they/them',
    program: 'Biology',
    year: '4th',
    bio: 'Bookworm with a soft spot for long walks and terrible puns.',
    interests: ['reading', 'outdoors', 'studying', 'movies', 'badminton', 'cafes'],
    styleAnswers: { night: 'quiet', planning: 'planner', texting: 'occasional', group: 'one-on-one', values: 'loyalty' },
    availableEventIds: ['craft-connect', 'games-night', 'halloween-social'],
    meetPreference: 'either',
    private: { email: 'sam.r@mapleridge.edu', instagram: '@sam.reads.things' },
  },
];

/** Sample profile used by the presenter shortcut ("Skip to match"). */
export const DEMO_PROFILE = {
  interests: ['badminton', 'cafes', 'anime', 'music', 'movies'],
  styleAnswers: { night: 'quiet', planning: 'planner', texting: 'occasional', group: 'small', values: 'loyalty' },
  campus: { universityId: 'maple', program: 'Computer Science', year: '2nd' as const, courses: ['CS 201', 'PSYC 100'] },
  meetPreference: 'either' as const,
  availableEventIds: ['halloween-social', 'karaoke-night'],
  contact: {
    firstName: 'Alex',
    email: 'alex.c@mapleridge.edu',
    instagram: '@alex.quests',
    agreedToGuidelines: true,
    avatar: '🦊',
  },
};
