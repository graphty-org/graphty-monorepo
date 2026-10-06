# The CI/CD plan is adopted: a batched merge queue, a batch-aware visual gate, a daily release train

Date: 2026-10-04
Decided by: the owner
Changes: how pull requests are checked, merged and released, as laid out in
`design/ci/ci-cd-plan.md`, and the "CI/CD Pipeline", "Merging" and "Release versioning" sections of
`CLAUDE.md`. It supersedes `2026-09-19-no-nightly-gpu-lane.md` for the T4 lane: the plan adds a
nightly full GPU run on master's tip on spot tenancy. That record is NOT edited.

## The decision

The plan in `design/ci/ci-cd-plan.md` is adopted as written. In short:

- Pull requests run the affected CI as today, with fewer and longer jobs and no CI on drafts.
- Mergify checks batches of up to 4 pull requests, 2 batches at once, with the full un-selected
  suite on the combined tree and bisection on failure, in place of one pull request at a time.
- A red master freezes the queue and opens a revert pull request automatically.
- The T4 GPU lane runs once on each pull request that affects webgpu-graph-algorithms, before it
  enters the queue, on master commits that affect it, and nightly.

The owner made three choices explicit:

1. **The visual-review gate accepts a batch.** A queue run passes when every captured image equals
   the owner-approved image of some pull request in the batch, with no new approval in the queue.
   An agent may make this change to `visual-review/trusted/gate.mjs`,
   `visual-review/trusted/lib/approval.mjs` and the ci.yml gate step. This authorization covers
   this change only. Agents still never press Accept or Finish, never write `visual-baselines/`,
   never edit `visual-review/passkeys.json` and never register passkeys.
2. **Releases go out on a daily train.** Once a day, release.yml opens a release pull request from
   the newest commit green on every lane. Mergify merges it, and release.yml publishes it with npm
   trusted publishing. The direct version-commit push and its deploy key go away.
3. **An ad hoc release exists for anything that cannot wait a day.** It is a `workflow_dispatch`
   of the same workflow that cuts the release pull request at once, at `priority:critical`. An
   optional input limits it to named packages through the `release-hold.json` mechanism. It goes
   through the same gates, and only the owner (or an agent the owner asks) starts one.

The order of work: fix the red master first, then implement the plan, because CI/CD is the
bottleneck for all other work.

## Why

The queue was at its ceiling. A serial in-place check of 30 to 40 minutes allows about 40 merges
a day, and 1 to 3 October ran at that ceiling. Releasing on every merge produced about 30 npm
versions a day. Every version commit pushed outside the queue reset it. Master went red four
times in two days, each time from a check that ran only after the merge or from skew between
pull requests. A queue that tests the combined tree catches both kinds.

## Rejected

- **Requiring approval on the queue's own commit.** Nobody looked at that synthetic commit, and
  every visual-testing vendor that tried it stalled or asked for a second approval. Approval stays
  on the pull request, bound to image contents. The queue only proves the images are unchanged.
- **Keeping the gate single-pull-request and running the queue with `batch_size: 1` for good.**
  It is safe, but it keeps about a third of the capacity and none of the batching. It remains the
  interim setting until the gate change lands.
- **Releasing on every merge (today), or weekly.** Every merge is the version noise and the queue
  resets above. Weekly would make a consumer waiting for a fix wait days. Daily, plus the ad hoc
  dispatch, is the smallest change that ends the noise without adding a wait.
- **A `next` dist-tag or per-pull-request previews.** That is a contract with consumers, and no
  consumer has asked for one.
