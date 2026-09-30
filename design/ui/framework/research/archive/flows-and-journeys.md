# Flows and journeys

**Job.** Why the analyst's movement through graphty is described in two documents, a journey and
a flow, and the one rule that ties them together. It owns those two things only. **Not here:** the
journeys (`user-journeys.md`); the flows (`task-flows.md`); how each grows (the header of each);
the owner's questions and their answering sections (`README.md`). **Owner:** design director.
**Ceiling:** the README's table. **Validated by:** the flows check for the rule below, and the
framework lint for this page's section pointers; the reader findability trial
(`research/study-schedule.md`, "Findability of the flows and journeys") is planned, not run. Until
it runs, this page is a routing aid whose routing nobody has tested.

## Two documents, not one

Flows and journeys are broken out of the information architecture, where they sat as end-to-end
routes, and into two documents because a journey and a flow count different things and are
checked by different methods:

| | `user-journeys.md` | `task-flows.md` |
|---|---|---|
| Unit | a piece of work across many sessions, and sometimes between two people | one task in one sitting |
| Names | tasks, objects and places; never a click | places, devices and commands |
| Answers | "does the analyst end the work with a finding they can trust and hand on?" | "does this task reach its answer through places that exist, and in how many steps?" |

Owners and validation methods are in each document's header.

A single file was considered and rejected. The case for it was that every journey stage points at
a flow, and links across files can break unseen. The flows check reduces that risk; it does not
close it, because it runs only when someone runs the framework lint, and no hook or CI job does
(`README.md`, "Validation of the set"). One file would invite the failure both documents are
written to prevent: journey stages that collect clicks, and flows that span sessions.

A **task flow** is a design artifact, a step sequence. It is not Figma's prototype Flow, whose
counterpart in graphty is a saved view (`glossary.md`, "flow").

## How the two are tied together

- **Stage to flow.** This is the one home of the rule; the other documents point here. Each
  journey stage inside a sitting names, in its Flow column, one of three things: a flow of
  `task-flows.md` by section number; `10.3`, when its route is still owed, and then a 10.3 row
  names that journey and stage; or `journey N`, when another journey's stages serve it, and
  journey N exists. Between-session rows name none. Each flow lists the stages it serves under
  "Serves", and each 10.3 row names its stage, so every link runs both ways.
- **Flow to structure and to Figma.** How a single flow is written, including its Figma route and
  where an extra step is recorded, is `task-flows.md` 1 ("Header" and "Labels"). A place the
  outline lacks is a gap for the information architecture (`task-flows.md` 11), never a new place.
- **The check.** `research/scripts/check-flows.mjs` enforces the rule above, every workflow's row in
  `user-journeys.md`, "Workflows and where they run", and each flow's Keyboard line, Figma route and
  departure pointers. Run it with the framework lint, which runs its `--self-test` first:
  `node design/ui/framework/research/scripts/check-framework.mjs`, non-zero on failure. Run it
  before claiming a gap: a missing place may only be a label spelled differently. It checks
  spelling and links, not structure; what that leaves to the tree test is `task-flows.md` 12, "The
  limit of this validation".

How these documents depend on the others: the README's dependency graph.

## Where to look

Selective; the full list of flows is the table of contents of `task-flows.md`. The owner's
questions and their answering sections: `README.md`.

| Question | Where |
|---|---|
| What rhythms of work are there, and who is in them? | `user-journeys.md`: 1 the first look, 2 the weekly return, 3 the alert investigation, 4 a starting point travels; the variant entries of journeys 1 and 3 |
| Which rhythm a workflow belongs to, or that none does | `user-journeys.md`, "Workflows and where they run" |
| Is publishing its own journey? | No: `user-journeys.md`, "How to read a journey" |
| How is a flow drawn, and what does each shape mean? | `task-flows.md` 1 |
| A flow's keyboard-only route | its Keyboard line; the frame, `task-flows.md` 1 |
| Where a route departs from Figma's, and why | each flow's Figma route; `figma-crosswalk.md` 4 |
| How does a route change on a large graph? | the rules, `state-matrix.md` 4 and 5; each flow's Scale field; the reversed route, `user-journeys.md` 3 |
| Sets, and a path as an ordered set, at work | `task-flows.md` 10.1, 10.2 |
| Routes still owed, and in what order | `task-flows.md` 10.3 |
| Labels, places, patterns and element work the flows found missing | `task-flows.md` 11 |
| Which studies settle the open questions | `user-journeys.md` 5; `task-flows.md` 12 |

## Sources

- `README.md`, the document table, the dependency graph, the index of the owner's questions and
  "Validation of the set"
- `user-journeys.md`, header, "How to read a journey", "Workflows and where they run" and section 5
- `task-flows.md`, header and sections 1, 10.3, 11 and 12
- `figma-crosswalk.md` 2 and 4
- `research/study-schedule.md`, "Findability of the flows and journeys"
- `research/scripts/check-flows.mjs`, `research/scripts/check-framework.mjs`
- Nielsen Norman Group, "User journeys vs. user flows",
  https://www.nngroup.com/articles/user-journeys-vs-user-flows/
