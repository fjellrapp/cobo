# First Release: Connected Household Hub

## Goal

Help a family, couple, or group of roommates coordinate common household work and needs from one shared place. Keep household-of-one use possible without inventing other members.

## First-Release Scope

### 1. Household Membership And Invitations

- Accounts may belong to multiple households.
- A user can create a household and is its initial owner.
- Owners can issue an invitation link/code and manage household membership.
- Invitees can accept an invitation and join after authenticating or creating an account.
- Owners and members can select/switch the active household.
- Ordinary members can participate in chores, shopping, and events.
- Every read/write of shared data is authorized against household membership.

### 2. One-Off And Recurring Chores

- A household member can create a chore/task with a title, optional details, optional assignee, and optional due date.
- A member can view household chores, their assignee, due date, and current state.
- A member can mark an occurrence complete; the system records who completed it and when.
- Recurring chores support a simple schedule and create distinct actionable occurrences.
- First release does not include fairness scoring, advanced rotation policies, swaps, or complex recurrence exceptions.

### 3. Shared Shopping List

- Members can add an item with a name and optional quantity/note.
- Members can view open items and mark an item acquired.
- Completed/acquired items can be removed from the active view; retain history only if it is useful and explicitly specified in the feature contract.
- First release does not require inventory counts, store integrations, price tracking, or meal planning.

### 4. Household Events

- Members can add and view shared events with a title, start date/time, optional end date/time, and optional details.
- Events belong to a household and appear alongside due chores in date-oriented views.
- First release does not sync with Apple, Google, or other external calendars.

### 5. Household Home Overview

- The overview is scoped to the selected household.
- It surfaces upcoming chore occurrences, upcoming events, and open shopping needs.
- It provides clear empty states and direct navigation to the relevant feature.
- It does not attempt to become a general-purpose dashboard or analytics surface.

### 6. In-App Activity And Reminders

- Provide an in-app indication for relevant assignments, completions, and upcoming due items where needed by the hub workflows.
- Avoid duplicate/noisy activity for a single state change.
- Push and email delivery, granular preferences, and background reminder scheduling are deferred until their requirements are designed.

## Explicitly Deferred

- Chore rotation/fairness automation and swaps.
- Supply inventory, maintenance schedules, and meal planning.
- Push/email notification delivery and notification preference management.
- Shared expenses, settlements, and budgets.
- External calendar synchronization.
- Household reference/vault information.
- Fine-grained roles beyond owner and member.

## Data And Authorization Invariants

- Every shared entity has an owning household.
- A request must not disclose or mutate another household's entities by guessing identifiers.
- Household ownership and membership changes are explicit and auditable enough to support safe client state updates.
- Leaving/removing a member must not silently transfer ownership or orphan household data.
- Recurring definitions and their generated occurrences are distinct: completing one occurrence must not complete or erase the series.
- API timestamps use an agreed representation and preserve timezone intent for event display; the feature contract must make timezone semantics explicit before implementation.

## Suggested Delivery Slices

1. Household membership, owner/member authorization, invitation creation/acceptance, and active-household selection.
2. Household-scoped one-off chores, assignment, due dates, completion state, and history.
3. Recurrence definitions and occurrence lifecycle for simple recurring chores.
4. Shared shopping list.
5. Household events and date/time semantics.
6. Home overview that composes the previously shipped domains.
7. In-app activity/reminder behavior needed to complete the hub workflows.

Each slice is independently specified, tested, and documented before client implementation begins. A client can be developed against the contract and mocked examples while the server slice is in progress.

## Client Contract Template

Create one file per bounded feature slice under `docs/product/contracts/`, for example `household-membership.md` or `chores.md`.

Each contract contains:

1. **Status and version:** proposed, approved, implemented; link to roadmap phase and server change.
2. **User goal and flows:** user-visible behavior, normal flow, cancellation, and recovery.
3. **Actors and permissions:** owner/member requirements and household context.
4. **Domain terms and state:** entities, fields, enumerated states, and allowed transitions.
5. **API contract:** method/path, authentication, request/response examples, pagination/filtering, and idempotency expectations where applicable.
6. **Errors:** status/code, meaning, and client handling guidance.
7. **Client behavior:** loading, empty, success, stale data, offline/retry, and accessibility considerations.
8. **Acceptance criteria:** observable examples that can be tested by both server and client teams.
9. **Open decisions:** only unresolved product choices; no silent assumptions.

The contract is the handoff source for the future iOS client and any other client. API implementation changes that alter behavior or payloads require updating the corresponding contract.

## First-Release Success Signals

Validate whether the connected hub reduces coordination friction using qualitative feedback and simple product measures:

- A new household can be created and another member can join without support.
- Members can identify upcoming work, its owner, and its status from the shared overview.
- Households can complete common chore and shopping flows without duplicative coordination messages.
- Members understand event/task dates consistently across devices and timezones.
- Households return to update shared state rather than treating Cobo as a one-time setup tool.

Do not introduce competitive points or public household rankings as a success mechanism.
