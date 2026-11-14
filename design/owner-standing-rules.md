# Owner's standing rules (2026-11-13)

The owner of graphty-org/graphty-monorepo adopted these eight rules on 2026-11-13 so that agents stop asking him
about the cases they cover. Each rule's quoted text is his wording. When a rule decides a question, an agent acts on
it and tells him in one line; it does not ask.

"Owner label" below means a label that holds an issue for the owner: `needs-decision` or `ux-owner`.

## 1. Recorded decisions release the label

"When an issue records my decision, or a standing rule already decides it, agents remove the owner label, proceed,
and tell me in one line."

## 2. Additive work is ordered

"A non-breaking change to graphty-element or a library package whose default leaves everything the graphty app shows
unchanged is ux-safe; agents build it without my order."

## 3. My report is the order

"An issue I filed that states the result I expect is already ordered; agents pick the remaining reversible details
and state them in the pull request."

## 4. Accessibility is ordered

"Accessibility additions with no visible change, and contrast fixes to defaults, are ordered; the screenshot review is
my decision on the look."

## 5. Free CI and tooling choices

"CI and dev-tooling changes that spend no money and drop no coverage, dependency majors in dev tooling, and following
upstream rendering changes in reference libraries go ahead; changed screenshots come to review as usual."

## 6. Carry small, name large

As amended by his save-file decisions of the same day:

- Small built-in data is carried in save files: the resolved palette name, the overflow order, sample 3D models,
  label looks, palettes.
- Code-backed built-ins are named and recorded as exceptions: shapes, arrowheads, line patterns, closed choices,
  transitions, basemaps.
- Behaviors are not saved as results and run again on open: layout, algorithm, edge routes, sample source, place
  lookup.
- "a change that only removes exceptions merges on agent review."

The merge-on-review part needs a change to the PR Integrity check (`tools/pr-integrity.mjs`), tracked in its own
issue; until it lands, such a pull request goes through the check as before.

## 7. Superseded branches

"A superseded branch is folded into its successor and kept, not deleted."

## 8. Outside pull requests

"For an outside contributor's pull request, agents re-file the idea as our own issue from its title, and I only reply
to the person."
