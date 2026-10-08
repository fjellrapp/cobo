# Household Membership And Invitations

**Status:** Approved design; not yet implemented  
**Roadmap:** Phase 0, Product And Technical Foundation  
**Audience:** Backend and future client-app developers

## User Goal

Create a household, invite people to it, and let one account participate in multiple households. Members should be able to see and switch household context; owners should be able to manage membership without granting a shared link permanent or unlimited use.

## Scope

- Create a household with a required display name.
- Creator becomes an owner; household is usable immediately without inviting anyone.
- Account can be a member of multiple households.
- Household roles are `owner` and `member`.
- Owners create/revoke invitations, change member roles, and remove members.
- Members can leave a household themselves.
- Invitation is a single-use bearer link/code, expires seven days after creation, and is accepted explicitly after authentication.
- Client stores active household selection locally. API paths carry explicit household context.
- Former members lose access; their historical activity remains attributed to their account.

Out of scope: chores, shopping, events, household settings beyond display name, fine-grained roles, email-bound invitations, and a server-persisted active-household preference.

## Domain Terms And State

- **Account:** an authenticated Cobo user.
- **Household:** shared workspace and authorization boundary.
- **Membership:** relation between one account and one household, with role `owner` or `member` and a current/former state.
- **Invitation:** a revocable, single-use bearer credential for joining one household. Lifecycle states are `pending`, `accepted`, `revoked`, and `expired`. Expiration is determined from `expiresAt`; clients may display an expired state even if the server has not stored a separate transition.
- **Active household:** client-local selection among the account's current memberships. It is not an authorization claim; every request is independently authorized by the server.

These are product/API concepts and do not prescribe the eventual database schema.

## Actors And Permissions

| Operation | Unauthenticated | Member | Owner |
| --- | --- | --- | --- |
| Create household | No | Yes | Yes |
| List own household memberships | No | Yes | Yes |
| Read household details or current members | No | Yes | Yes |
| Create or revoke invitations | No | No | Yes |
| Preview a valid invitation | Yes | Yes | Yes |
| Accept an invitation | No | Yes | Yes |
| Promote/demote a member | No | No | Yes |
| Remove another member's membership | No | No | Yes |
| Delete own membership (leave) | No | Yes | Yes, if at least one other owner remains |

An invitee becomes a `member`, never an `owner`, by accepting an invitation. An account may not have duplicate current memberships for one household. A household must always have at least one owner.

## API Conventions

- Protected operations require the existing authenticated access-token mechanism.
- Household-owned resources use household-scoped paths, such as `/households/{householdId}/...`.
- The server checks current membership and role for every operation. A household ID supplied by the client is a selector, not proof of access.
- IDs are opaque strings in client code; clients must not assume they are sequential integers.
- JSON timestamps are ISO-8601 UTC strings. `expiresAt` is an absolute timestamp.
- Responses omit password hashes, token hashes, refresh-token values, and other credential material.
- Error responses use a stable machine-readable `code` and human-readable `message`. Exact framework-specific envelope wrapping is an implementation detail; clients branch on `code`, not message text.
- The raw invitation token is returned only when an owner creates the invitation. Persist only a secure hash server-side. Do not log tokens. The invite link can carry the token as a fragment/deep-link value; the client submits it in a request body so it does not appear in API paths or normal request logs.

## API Operations

### Create Household

`POST /households` (authenticated)

Request:

```json
{
  "displayName": "Maple Street Home"
}
```

Response `201 Created`:

```json
{
  "id": "hh_01J...",
  "displayName": "Maple Street Home",
  "createdAt": "2026-10-06T12:00:00Z",
  "membership": {
    "role": "owner",
    "joinedAt": "2026-10-06T12:00:00Z"
  }
}
```

`displayName` is required and non-empty after trimming. No other field is required to create a household. The creator's owner membership is established atomically with household creation.

### List My Households

`GET /households` (authenticated)

Returns only the caller's current memberships. This response populates the household switcher. It may include a small household summary and the caller's role; it does not return invitation secrets or former memberships as accessible households.

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "hh_01J...",
      "displayName": "Maple Street Home",
      "role": "owner",
      "memberCount": 3
    }
  ]
}
```

An account with no households receives `200 OK` and an empty `items` array.

### Get Household And Members

- `GET /households/{householdId}` (authenticated current member)
- `GET /households/{householdId}/members` (authenticated current member)

The members response contains current members only, with a stable account/member ID, display name, role, and joined date. It must not expose email or phone to ordinary household members unless a separate product decision explicitly permits it.

### Create Invitation

`POST /households/{householdId}/invitations` (owner only)

Request body is empty. The server generates a cryptographically random, unguessable token, stores only a secure hash, and sets expiry to seven days after creation.

Response `201 Created`:

```json
{
  "id": "inv_01J...",
  "householdId": "hh_01J...",
  "inviteUrl": "https://app.example/invite#token=<opaque-token>",
  "expiresAt": "2026-10-13T12:00:00Z",
  "status": "pending"
}
```

The response containing `inviteUrl` is the only normal API response containing the raw token. The client can share this URL using the platform share sheet. Do not include the token in analytics, crash reports, referrers, or server logs.

### List Pending Invitations

`GET /households/{householdId}/invitations` (owner only)

Response `200 OK` lists pending invitation metadata (`id`, `createdAt`, `expiresAt`, `status`). It never returns a token, token hash, or invite URL. Expired, revoked, and accepted invitations are not listed as pending.

### Preview Invitation

`POST /invitation-previews` (public; token required in body)

Request:

```json
{
  "token": "<opaque-token>"
}
```

Response `200 OK` for a valid pending invitation:

```json
{
  "household": {
    "id": "hh_01J...",
    "displayName": "Maple Street Home"
  },
  "expiresAt": "2026-10-13T12:00:00Z",
  "status": "pending"
}
```

Preview returns only information needed for informed acceptance. It does not reveal member contact details or permit access to household content.

### Accept Invitation And Create Membership

`POST /household-memberships` (authenticated; invitation token required in body)

Request:

```json
{
  "token": "<opaque-token>"
}
```

The client presents the household name and requires an explicit user action to accept. A successful accept atomically consumes the single-use invitation and creates a `member` membership.

Response `200 OK`:

```json
{
  "household": {
    "id": "hh_01J...",
    "displayName": "Maple Street Home"
  },
  "membership": {
    "role": "member",
    "joinedAt": "2026-10-06T12:30:00Z"
  }
}
```

If the authenticated account is already a current member of the target household, acceptance is idempotent: return the existing membership and do not create a duplicate. If another account has already consumed the invitation, return an invitation-used error.

### Revoke Invitation

`DELETE /households/{householdId}/invitations/{invitationId}` (owner only)

Response `204 No Content` on success. Revoking an already-revoked invitation is idempotent. Accepted invitations cannot be revoked; change membership through member management instead.

### Change A Member's Role

`PATCH /households/{householdId}/members/{membershipId}` (owner only)

Request:

```json
{
  "role": "owner"
}
```

Allowed role values are `owner` and `member`. A request that would leave the household with no owner is rejected. The API does not support role types beyond owner/member in this release.

Response `200 OK` returns the updated member summary.

### Remove Or Leave A Membership

`DELETE /households/{householdId}/members/{membershipId}` (owner removing another member, or a member deleting their own membership)

Response `204 No Content` on success. An owner cannot remove another owner if that would leave no owner. A member can delete only their own membership. An owner can delete their own membership only if another owner remains. Deleting a membership revokes future access immediately and preserves historical attribution.

## Errors And Client Handling

| HTTP | Code | Meaning | Client behavior |
| --- | --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Missing/invalid household display name, role, or request field | Show field-level or form error; do not retry unchanged input. |
| `401` | `AUTHENTICATION_REQUIRED` | Access token missing, expired, or invalid | Run the normal sign-in/refresh flow, then retry only if safe. |
| `403` | `HOUSEHOLD_OWNER_REQUIRED` | Current member lacks owner permission | Refresh household/member state; explain that an owner is required. |
| `403` | `LAST_OWNER_REQUIRED` | An owner change would leave no owner | Ask an owner to promote another member first. |
| `403` | `MEMBERSHIP_SELF_DELETE_ONLY` | A member attempted to delete another member's membership | Explain that only an owner can remove another member. |
| `404` | `HOUSEHOLD_NOT_FOUND` | Household is absent or not visible to caller | Show unavailable-household state; do not distinguish unauthorized IDs from absent IDs. |
| `404` | `INVITATION_NOT_FOUND` | Invitation token/ID is unknown or invalid | Offer to request a fresh invite. |
| `409` | `INVITATION_EXPIRED` | Invitation is past its seven-day expiry | Offer to ask an owner for a new invite. |
| `409` | `INVITATION_REVOKED` | Owner revoked the invitation | Offer to ask an owner for a new invite. |
| `409` | `INVITATION_ALREADY_USED` | Another account accepted the one-time invitation | Explain it has already been used and request a fresh invite if needed. |
| `409` | `MEMBERSHIP_ALREADY_EXISTS` | Not applicable for accept; reserved for conflicting membership administration | Refresh membership list. Accepting one's own existing membership instead succeeds idempotently. |
| `409` | `OWNER_TRANSFER_REQUIRED` | Last owner tried to leave | Explain the need to promote another owner first. |
| `409` | `MEMBER_NOT_ACTIVE` | Target is not a current member for a role/removal operation | Refresh current members. |
| `429` | `RATE_LIMITED` | Invitation preview/accept or creation rate limit reached | Respect retry guidance; do not repeatedly submit token guesses. |

For security, the server may return the same generic invalid-invitation response for unknown, malformed, or invalid token values. Expired, revoked, and used states can be distinguished only after a valid token record is located, if that distinction does not enable token enumeration.

## Client Behavior

- On sign-in, load the household list. If empty, show household creation and invitation acceptance entry points.
- Persist selected household locally. If it is no longer in the returned household list, clear it and select another household or show the no-household state.
- Do not treat a locally selected household ID or a prior membership response as authorization for later requests.
- A shared invitation URL opens an invitation preview. Preserve the opaque token locally across sign-in/sign-up, then submit it in the accept request body. Clear it after success, expiry, revocation, or explicit cancellation.
- Never display or log the raw token after the share flow, and do not place it in ordinary application analytics.
- Refresh household/member state after create, accept, role change, removal, or leave.
- For network ambiguity during accept, refetch the user's household list and retry acceptance safely; the operation is idempotent for an existing membership.
- Show no-household, loading, invite-invalid/expired, invitation-accepted, and access-removed states.

## Acceptance Criteria

1. An authenticated account creates a household with a display name, becomes its first owner, and can use it without inviting anyone.
2. The same account can own or join multiple households and list them without duplicates.
3. A non-member cannot read or mutate a household by supplying or guessing its ID.
4. An owner creates a single-use invitation that expires exactly seven days after creation and can share its URL.
5. Invitation preview discloses the household name but no member contact details or household task/list/event content.
6. An invitee can open an invitation before authentication, authenticate or sign up, return to the invitation, and explicitly accept it as a member.
7. A consumed invitation cannot add a second account. Re-accepting it as the already-joined account returns the existing membership without duplication.
8. Owners can revoke pending invitations; revoked invitations cannot be previewed as valid or accepted.
9. Only owners can create/revoke invitations, change roles, or delete another member's membership.
10. Members can delete their own membership to leave. The final owner cannot leave, be removed, or be demoted until another owner exists.
11. Removing/leaving immediately blocks future household access while historical activity remains attributed to the former member.
12. Switching active household changes the client context only; all server authorization remains based on the authenticated account's current membership.

## Implementation Decisions

- Owners can list pending invitation metadata; the list never returns a token or invite URL.
- No maximum household size is introduced in this release.
- Feature errors use `{ "code": "...", "message": "..." }`; this does not establish a repository-wide error envelope for unrelated endpoints.
- Any authenticated account can accept an invitation; contact verification is not required by this feature.
- Former membership remains stored for historical attribution. Broader account erasure/retention policy remains outside this feature.

## Change Log

- Initial approved contract based on product decisions: multiple household membership, owner/member roles, owner-only bearer invitations, seven-day expiry, explicit post-auth acceptance, self-leave, at least one owner, client-local active household, and household-scoped API paths.
- Route refinement: invitation preview uses `POST /invitation-previews`; invitation acceptance creates a membership through `POST /household-memberships`; owners remove members and members leave by deleting `/households/{householdId}/members/{membershipId}`.
