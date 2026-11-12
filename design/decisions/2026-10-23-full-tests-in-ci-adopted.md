# The full test suite runs in CI; the local gate is light

Date: 2026-10-23
Decided by: the owner
Changes: where the full test suite runs on the way from a branch to master, as laid out in
`design/ci/ci-full-testing.md` (issue #3316). It replaces the parts of
`2026-10-21-fast-pipeline-adopted.md` and `2026-10-18-golden-local-adopted.md` that run the full
suite on this machine (the landing gate's test stage, verification's full local gate, the cut's
full gate). Cut, ship, the screenshot review, the release train and master's protection are
unchanged. Neither earlier record is edited.

## The decision

The owner's request: "replace our local full-test gate with a lighter test that is lint, build,
sonarqube, and gpu and put our full testing in CI. make sure our plan ends up being more efficient
than our current plan."

- **A light gate on this machine.** Every landing, golden push, cut and cut-fix runs the source-only
  checks with SonarQube on changed lines, the affected build, knip, lint with the type-check, the
  deterministic docs and API checks, and the NVIDIA GPU tests when webgpu-graph-algorithms is
  affected. No test shard and no screenshot capture.
- **Verification in CI.** After landings, `tools/verify.mjs` pushes golden's newest commit to
  `golden-candidate`; `golden-verify.yml` calls `ci.yml` as a full run, its checks named
  `Verify / ...` so they never satisfy master's required check. A green run moves
  `golden-verified`, as before.
- **Failures are still found, explained and reverted here.** The failing tests come from the run's
  JUnit and are confirmed and bisected on this machine; a failure that only CI shows is re-run once
  in CI and then bisected in CI or quarantined, never re-run until green; a failure at the last
  verified commit too is an environment change and reverts nothing.
- **No silent fallback.** When CI is unavailable, landings go on through the light gate,
  `golden-verified` and cuts wait, and the pipeline round raises one `priority:high` issue. Local
  verification runs only after an explicit, recorded `verify.mjs backend local --reason`.
- **One switch.** `node tools/verify.mjs backend ci` turns verification to CI and the landing gate
  light together, so there is never a window in which nothing runs the tests.

## Why

From 2026-10-16 to 2026-10-23 the median change took 213.5 minutes from desktop to master, and the
slow parts were on this machine: the full suite ran three times per shipped commit (land check,
verification, ship), took 34 to 58 minutes alone here and 87 to 185 when gates overlapped, and
gates used 16.9 machine-hours a day. CI runs the same suite in 23 minutes across 25 parallel jobs at
no cost on a public repository, and about 19 of 22 local failures in tier-3 work never appeared in
CI. The plan's estimate is 89.8 minutes from desktop to master and 69% less gate time here.

## Rejected

- **Keep the full local gate and add machines.** This machine is never a CI runner, and GitHub's
  runners already wait seconds.
- **Run no tests before master but the cut pull request's.** A broken landing would then be found
  only at the cut, with a whole batch to bisect; verification on golden keeps the culprit to one
  landing.
- **Reuse the verification run as the cut pull request's check.** It needs the visual gate's
  capture download, an owner-protected step, to read another run's artifacts; left to the owner.
- **Move SonarQube or the NVIDIA tests to CI.** The SonarQube server is reachable only on the
  owner's network, and the paid T4 runs only on the release train.
