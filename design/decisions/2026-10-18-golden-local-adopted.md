# Changes land through a local integration branch, golden, and one standing pull request

> Status: Deprecated 2026-10-21 by design/ci/fast-pipeline.md (issue #3262). The landing model it adopted is replaced; the rest of design/ci/golden-local.md remains in force, and the tools follow it until the fast pipeline is built.

Date: 2026-10-18
Decided by: the owner
Changes: how a change reaches master, as laid out in `design/ci/golden-local.md`. It supersedes
the merge half of `2026-10-04-ci-cd-plan-adopted.md` (per-pull-request CI as the merge path,
Mergify batching, the batch-aware visual gate) and the githerd design in `design/githerd/`. The
release train in that record is unchanged. That record is NOT edited.

## The decision

Every change is landed on this machine into one integration branch, `golden`, by
`node tools/land.mjs land <branch>`, which merges it and pushes `golden` to GitHub through the
existing push queue and its full pre-push gate. One standing draft pull request carries `golden`
into master. The owner reviews that pull request's screenshots on the local review page whenever
convenient; `node tools/land.mjs ship` then marks it ready and turns on GitHub auto-merge, CI runs
the affected suite once on it as a clean-machine double check, and GitHub merges it. Because the
golden pull request's diff against master is every change landed since the last ship, that suite
covers every package any landed change touched.

In short:

- No per-change pull requests, no stacked pull requests, no merge queue.
- Master stays protected exactly as now; only the golden pull request and the release train's
  deploy key change it.
- Mergify (`.mergify.yml`) is removed, the githerd daemon is no longer run, its MCP server leaves
  `.mcp.json`, and `githerd-watchdog.yml` is deleted.
- The pre-push gate, the push queue, visual-review with the owner's passkey approvals, the release
  train, `master-guard.yml` and the pr-status broker stay.

## Why

The stalls were before the merge queue, not in it. A census found 574 product commits on 70
branches that never reached master, 139 of them fixes to code still on master; 203 of 237 unlanded
items had no pull request at all. Mergify, over the same week, merged 371 of 418 pull requests with
a 23-minute median and none stuck. Each change was tested three or four times on limited runners,
screenshot approvals tied to individual pull requests broke whenever changes were combined or
master moved, and githerd, built to push work through, added its own failures. The owner's
summary: "we have created a huge mess of complex mechanisms that are creating problems for us and
now we are just adding more mechanisms on top." Golden-local has one local gate per change, one
review per batch of changes, and one CI run of the affected suite before master.

## Rejected

- **Keep Mergify as it is.** The queue itself was healthy, but it sits after every hand-off that
  dropped work: a per-change pull request, its CI, its own screenshot review. Keeping it keeps
  those hand-offs and the third and fourth test run of every change.
- **GitHub's merge queue, first in first out.** It replaces Mergify with a platform feature but
  keeps the same per-change pull requests, per-change CI and per-change screenshot reviews. At
  about 2 merges an hour a merge queue buys nothing over auto-merge.
- **A local lander that merges straight to master, with a GitHub App posting the required
  check.** It would remove the pull request, but the owner declined to give up the protected
  master and its pull-request-only rule, and an app that can post the required check is a
  credential that can bypass every gate.
- **Review after push.** Landing changes on master first and reviewing screenshots afterwards
  would put unreviewed images on master and turn every rejection into a push, review and re-push
  loop. The owner requires the review before anything is offered to master, and the review must
  not hold up landing -- the golden pull request satisfies both.
