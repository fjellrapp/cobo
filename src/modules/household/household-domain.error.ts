export type HouseholdErrorCode =
  | 'CLIENT_APP_URL_INVALID'
  | 'CLIENT_APP_URL_MISSING'
  | 'CONFIGURATION_ERROR'
  | 'INVITATION_RATE_LIMITED'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_REVOKED'
  | 'LAST_OWNER_REQUIRED'
  | 'MEMBER_NOT_ACTIVE'
  | 'MEMBERSHIP_SELF_DELETE_ONLY'
  | 'HOUSEHOLD_NOT_FOUND'
  | 'HOUSEHOLD_OWNER_REQUIRED'
  | 'VALIDATION_ERROR';

export class HouseholdDomainError extends Error {
  constructor(
    readonly code: HouseholdErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HouseholdDomainError';
  }
}
