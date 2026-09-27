# Only the owner accepts Chromatic changes

Date: 2026-09-27
Decided by: the owner, in the comments of issue #217
Changes: how every Chromatic project in this repository is operated, and the Chromatic section of
`graphty-element/CLAUDE.md`. No design document is edited.

## The decision

A changed Chromatic snapshot is accepted by the owner and by nobody else. No agent, script, CI job
or Chromatic project setting accepts one -- not on a pull request, and not on master. Auto-accept on
master is switched off in each Chromatic project (Manage, then UI Tests), so every change on every
branch waits for the owner's review.

An agent may explain a diff, classify it as intended or a regression, and propose accepting it. It
never presses the button, and it never enables an option that presses it (`autoAcceptChanges`,
`--auto-accept-changes`, `exitZeroOnChanges` used to hide a change from review).

Running Chromatic is opt-in. `npm test` in graphty-element runs the Vitest shards only; a Chromatic
build is published by CI or by someone who asks for one with `npm run chromatic` or
`npm run test:visual`, because every build costs snapshots and every accepted build becomes the
baseline the next one is compared with.

The capture viewport is pinned in `graphty-element/.storybook/preview.ts`, so a snapshot's size is
a decision recorded in the repository rather than whatever Chromatic's default happens to be.

## Why

Chromatic compares a build with the previous build on the same branch. A change is reported once;
once it is accepted it becomes the baseline and every later build passes quietly. During the
graphty-element 2.0 work more than a hundred snapshots changed, builds went from pending to accepted
although every build reported `autoAcceptChanges: false`, and master's baseline ended up containing
2.0 changes that nobody had looked at story by story (#217). An acceptance is the only moment a
visual change is judged, so it has to be made by the person accountable for how the product looks.

## Rejected

- **Accept on pull requests, auto-accept on master.** This was the first answer recorded on #217.
  It still lets a change reach the baseline without a person seeing it -- a merge commit whose
  pull-request build was never reviewed, or a change that only appears on master -- which is how the
  unreviewed 2.0 baseline happened.
- **Let an agent accept changes it has classified as intended.** An agent's classification is
  evidence for the owner, not a substitute. An accepted wrong baseline hides the regression from
  every later build, so the cost of a mistaken acceptance is far larger than the cost of waiting.
