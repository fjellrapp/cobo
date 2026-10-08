# Cobo Product Roadmap

## Product Direction

Cobo helps people share a home with less coordination overhead. It gives household members a common understanding of what needs doing, what is coming up, and what the household needs, while making ownership and progress visible without turning home life into a competition.

The initial audience is families, couples, and roommates. The product should also remain useful to a person managing a home alone; household-of-one usage should not require artificial collaboration.

## Product Principles

- Make the household, not an individual account, the primary context for shared work.
- Prefer simple shared visibility and lightweight coordination over extensive role systems and automation.
- Support both recurring routines and one-off needs.
- Avoid punitive scoring or competitive chore rankings; fairness features should help the household discuss and adjust workload.
- Design the API as a client-neutral contract so a future iOS app can use the same capabilities.
- Each shipped feature gets a separate client handoff contract linked from its roadmap entry.

## Phases

### Phase 0: Product And Technical Foundation

Establish stable account and household boundaries before building the shared hub.

- An account can belong to multiple households.
- A household has one or more owners and ordinary members.
- Owners manage membership and household settings; all members can participate in day-to-day coordination.
- Members join through an invitation link or code.
- The client can select and switch the active household context.
- Define API conventions, authentication expectations, error responses, and client contract documentation before parallel client work.

**Exit outcome:** a member can create or accept an invitation to a household, switch household context, and access only data belonging to a household of which they are a member.

### Phase 1: Connected Household Hub (First Release)

Deliver a small, useful overview of household work and needs.

- One-off chores/tasks: create, assign, set a due date, complete, and review status.
- Recurring chores: define a schedule and produce actionable occurrences; begin with straightforward recurrence and assignment rather than advanced rotation rules.
- Shared shopping list: add items, mark them acquired, and keep the list visible to all household members.
- Household events: create and view shared events with date/time and optional details; no external calendar sync in this phase.
- Home overview: show upcoming chores, events, and open shopping needs in one household-scoped view.
- In-app activity/reminders for relevant household changes and upcoming work; defer push and email delivery.

**Exit outcome:** household members can coordinate common upcoming work and shopping from one shared place, with clear ownership and status.

### Phase 2: Reduce Recurring Friction

Improve how the household handles routines and changing availability.

- Chore rotation and fair distribution, with transparent and adjustable rules.
- Chore swap, delegation, and handoff workflows.
- Member preferences and temporary availability, without treating them as rigid restrictions.
- Household supplies and maintenance reminders for recurring replenishment and home upkeep.
- Meal planning that can add ingredients to the shared shopping list.
- User-configurable push and/or email notifications, selected by observed demand and platform needs.
- Shared household reference information for practical details such as appliance instructions and emergency contacts, with appropriate privacy controls.

**Exit outcome:** routines adapt to real household schedules and reduce repeated coordination conversations.

### Phase 3: Shared Finances

Add lightweight shared expense coordination without requiring bank integrations.

- Record an expense, payer, date, description, and household context.
- Split an expense equally or by explicit member shares.
- Show balances and settlement history clearly.
- Defer bank feeds, payments, and category budgeting until actual usage validates the need.

**Exit outcome:** members can understand household shared costs and who has paid, without Cobo moving money.

### Later Opportunities (Unprioritized)

These ideas are candidates, not commitments. Prioritize them only after learning from earlier phases:

- External calendar synchronization.
- Budget planning by category.
- More advanced household inventory and low-stock suggestions.
- Deeper maintenance planning and service records.
- Additional accessibility, localization, and household-specific workflows.

## Cross-Phase Dependencies

- Household membership and authorization underpin all shared records.
- Task occurrence/status semantics underpin the home overview, reminders, rotations, and completion history.
- Shopping items provide the integration point for supplies and meal planning.
- Household events and task due dates can share calendar presentation but should remain distinct domain concepts.
- Notification preferences should be introduced with notification channels rather than embedded into each feature's domain model.
- Expense splits depend on reliable household membership and member identity over time.

## Prioritization Rules

When scope competes, prioritize work that:

1. Improves the end-to-end connected hub for the first release.
2. Removes repeated household coordination or ambiguity about ownership/status.
3. Serves families, couples, roommates, and solo household management without requiring a specific household type.
4. Can be shipped and validated as a bounded feature with a client-ready contract.
5. Avoids external integrations until the underlying in-app workflow is validated.

## Client-App Handoff

Maintain a separate contract document for every feature slice under `docs/product/contracts/`. Each contract should cover user-visible behavior, household context and permissions, API operations and payloads, state transitions, errors/empty states, and acceptance criteria. Keep each contract aligned with implementation; the roadmap remains a summary and sequencing document rather than duplicating API details.

The first-release scope and contract template are in [`first-release.md`](first-release.md).
