# Every change reaches master through its own pull request; golden is retired

Date: 2026-10-25
Decided by: the owner (relayed in issue #3418)
Changes: how a change travels from a branch to master, graphty.app and npm, as laid out in
`design/ci/channels-pipeline.md` and its appendices in `design/ci/channels-pipeline/`. It replaces
`2026-10-18-golden-local-adopted.md`, `2026-10-21-fast-pipeline-adopted.md` and
`2026-10-23-full-tests-in-ci-adopted.md`, and the design documents they adopted
(`design/ci/golden-local.md`, `design/ci/fast-pipeline.md`, `design/ci/ci-full-testing.md`). Each of
those records carries a status banner pointing here.

## The decision

1. **One pull request per change, straight into master, with auto-merge on.** CI's light check on
   the pull request is the only gate; a green pull request merges. Nothing lands through an
   integration branch, and `golden` takes no new landings ("flush golden without adding anything
   more to it").
2. **Three channels.** Every green master build deploys canary.graphty.app. A 6-hour full run on
   master's newest green build promotes to nightly.graphty.app and npm `next`, at once when no
   screenshot changed and after the owner's approval when one did. Only the owner's `promote.yml`
   moves graphty.app and npm `latest`.
3. **A red full run is bisected and reverted by pull request**, or fixed forward.

The live rules are in the root `CLAUDE.md` ("Shipping a change") and `.github/workflows/README.md`.
The golden landing tools were removed afterwards: `tools/branch-sync.mjs` on 2026-10-25 (commit
0c011ef28f), and `tools/land.mjs`, `tools/verify.mjs`, `tools/prepush.sh` and
`tools/prepush-tests.mjs` on 2026-11-02 (commit d99cdf5060).

## Rejected

**Keep landing through `golden` with a local gate, verified in full afterwards.** It funnelled every
change through one machine-wide queue on the development server: landings waited on each other and
on the local gate, a broken landing held everything behind it until verification caught up, and a
large landing could lose its gate to a run of small ones. Per-change pull requests give each change
its own CI run and its own revert, and leave the development machine free.
