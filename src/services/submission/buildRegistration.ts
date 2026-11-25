import { PRIVACY_POLICY_VERSION } from '../../config';
import { UNIVERSITY } from '../../data/campus';
import type { PlayerProfile } from '../../types';
import { normaliseEmail, normaliseInstagram } from '../../utils';
import { SCHEMA_VERSION, type RegistrationPayload } from './types';

/** Turns the player's answers into the wire format. `submissionKey` is added per attempt. */
export function buildRegistration(profile: PlayerProfile, consent: boolean, trap = ''): Omit<RegistrationPayload, 'submissionKey'> {
  return {
    schemaVersion: SCHEMA_VERSION,
    universityId: UNIVERSITY.id,
    campusId: profile.campus.campusId ?? '',
    firstName: profile.contact.firstName.trim(),
    email: normaliseEmail(profile.contact.email),
    avatar: profile.contact.avatar,
    instagram: normaliseInstagram(profile.contact.instagram),
    program: profile.campus.program.trim(),
    year: profile.campus.year ?? '',
    courses: profile.campus.courses,
    styleAnswers: profile.styleAnswers,
    interests: profile.interests,
    meetPreference: profile.meetPreference ?? '',
    campusMatch: profile.campusMatch ?? '',
    hangouts: profile.hangoutIds,
    availability: profile.availability,
    studentAttestation: profile.contact.isStudent,
    guidelinesAccepted: profile.contact.agreedToGuidelines,
    consent,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    trap,
  };
}
