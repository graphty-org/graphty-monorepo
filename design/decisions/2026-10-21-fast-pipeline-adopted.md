# Changes land after a fast check and are verified in full after landing

Date: 2026-10-21
Decided by: the owner
Changes: how a change travels from a development branch to master, graphty.app and npm, as laid
out in `design/ci/fast-pipeline.md` (issue #3262). It replaces the landing model of
`2026-10-18-golden-local-adopted.md` (the full pre-push gate on every landing under one
machine-wide lock, screenshot review at the cut, one pipeline round before reverting a broken
landing) and the parts of `design/ci/ci-cd-plan.md` that section names. The release train is
unchanged. Neither earlier record is edited.

## The decision

A branch lands in `golden` after a fast check that runs only the tests its change can affect,
under a lock held only long enough to merge and push. The full checks (the whole gate, the local
GPU run, screenshots, SonarQube) then run on golden after landing, as a verification run the
landing script starts. A failing run bisects over the landings it covers and the pipeline round
reverts the culprit at once. A cut for master takes a verified commit, or a named commit that passes the
full gate as `cut-fix` does, and GitHub CI still checks it once before it merges.

The owner's decisions:

- **Composed screenshot approvals.** An image is approved when one of the owner's passkey
  signatures covers that exact image and no later signed reject revokes it. The rule covers every
  changed path under `visual-baselines/` (images, story settings files, deletions) except the
  `reviews/` records; "later" is the time inside the signed statement; rejects count from
  `golden`, `master` and every `review/*` ref (section 6.3 of the design). Screenshots are
  captured and signed on the branch, so two branches that each changed images need no second
  review when they combine. This changes `visual-review/trusted/gate.mjs` and `lib/approval.mjs`,
  which the owner authorized for this purpose only.
- **Golden may be briefly broken.** "Nothing merges with known errors" governs master. Golden is
  protected by verification, bisect and revert.
- **A beta site.** Every green master build deploys to beta.graphty.app, served from the
  `graphty-beta` repository. The owner promotes a beta build to graphty.app by hand. Docs and
  Storybooks wait for promotion with the code they describe; only the append-only hosted data
  deploys to graphty.app on every green master build.
- **No npm beta channel.** The release train publishes as it does today.
- **Verification watches itself.** A run starts its own follow-up when golden moved, until
  `golden-verified` reaches golden's tip, and keeps a durable state file (`tmp/golden/verify.json`:
  range, process id, status, bisect progress, culprit). The pipeline round is its watchdog: it
  restarts a dead run, resumes a stopped bisect from the file, reverts the culprit, comments on
  the issues, and keeps a lessons file of resolved failure modes. Its loop wakes when the file
  records a failure, with a 30-minute fallback, so a broken golden is reverted within minutes.

Old rules, as now decided:

- Kept: no daemon; sessions drive the pipeline. The landing script starts verification runs and
  the pipeline round makes reverts.
- Narrowed: "nothing merges with known errors" governs master only. "Review locally before
  pushing" becomes "before anything is offered to master". "No nightly or fixed-interval jobs"
  applies only to jobs that gate something, and the nightly Hosts run moves off the release
  train's hours. A GPU lane is stable after three consecutive green release-train runs.
- Changed: graphty.app no longer deploys on every master build; beta does. Approvals of one exact
  tree become composed approvals.
- Dropped: "waiting for runners is the problem" (measured waits are 2 to 4 seconds);
  per-pull-request screenshot approvals (replaced by signed trees); Hosts on pull requests and
  ci.yml's Mergify merge-queue handling, both to be removed.

## Why

Big features took days to land. From 2026-10-15 to 2026-10-21 every landing held one lock while
the full gate ran (median 34 minutes, up to 102), about 20 landings a day queued for it, and only
47% of golden landing pushes passed, each failure paying the whole gate again. The same code was
tested three or four times because passes were stored by branch name rather than by input, and
screenshot approvals repeated whenever two changed branches landed together. GitHub's runners were
never the limit; this machine was. Moving the full checks after landing, beside new landings
instead of in front of them, keeps every check and removes the queue.

## Rejected

- **Keep the full gate on every landing.** It is what produces the 34 to 102-minute serial queue
  and the 47% pass rate. Master stays as strict as before; only golden takes the risk, and bisect
  and an immediate revert bound it.
- **Drop the lock entirely, as Anthropic's monorepo did.** At about 20 landings a day we are at the
  scale where Anthropic still keeps a merge queue. The lock stays, but short.
- **Reduce CI and catch errors at the release** (the owner's own suggestion). Runner use is under
  half the limit and CI found real defects on three of the last five cuts. Revisit if queue time
  passes 10 minutes.
- **An npm `next` or beta dist-tag.** A dist-tag is a consumer contract, rejected on 2026-10-04;
  beta.graphty.app gives early access to the site without one.
- **Deploy docs and Storybooks on every master build.** They would describe code npm has not
  published yet; they wait for promotion with the app.
- **A standing verification daemon.** Retiring githerd showed a daemon adds its own failures;
  self-chaining runs plus a watchdog session that wakes on a recorded failure give the same speed.
