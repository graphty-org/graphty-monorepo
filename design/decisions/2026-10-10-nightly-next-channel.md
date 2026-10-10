# A nightly channel on npm's `next` dist-tag, with hand-picked graduation

Date: 2026-10-10 (decided by the owner on 2026-10-07 in issue #1020; recorded and built on 2026-10-10)
Decided by: the owner
Changes: the "Not now" list and the one-way-door note on dist-tag channels in section 10 of
`design/ci/ci-cd-plan.md`, section 11 (the ad hoc release), the decision ledger's "Dist-tags" row,
and the "Release versioning" section of `CLAUDE.md`. It supersedes the "A `next` dist-tag or
per-pull-request previews" rejection in `2026-10-04-ci-cd-plan-adopted.md`, which is NOT edited.

## The decision

- **The channel is npm's dist-tag `next`.** `npm install @graphty/<package>` keeps getting the
  stable version (`latest`); testers opt in with `@next`.
- **Versions are `X.Y.Z-next.<n>`.** `X.Y.Z` is the version the next stable release would give
  the package (nx's conventional-commit bump since its last `{projectName}@{version}` tag), and
  `<n>` is the release workflow's run number, which only grows. A stable `X.Y.Z` sorts above every
  `X.Y.Z-next.<n>`.
- **The existing release train publishes it.** release.yml, on a scheduled attempt or a restart of
  a held train, runs the same lanes as today (full CI, T4, Hosts, audit, LLM regression); when all
  pass it publishes each changed package under `next`, from the builds that run tested, with npm
  trusted publishing. No new workflow file, so npm's trusted-publisher entry for each package
  (`release.yml`) stays valid. A nightly makes no version commit, no git tag and no GitHub release,
  and never moves `latest`. A package that is not on npm yet gets no nightly: the registry would
  make its first version `latest`, and its first publish is the owner's manual step.
- **Nightlies replace the scheduled stable release.** While the channel is on, a scheduled attempt
  opens no stable release pull request. A stable release comes only from a person's dispatch of
  release.yml (the ad hoc release of section 11), which is the graduation.
- **Graduation is the ad hoc release pinned to a nightly's commit.** `gh workflow run release.yml
--ref master -f graduate=<full commit id>` cuts the stable release pull request from the commit
  that nightly was built from, so a stable version never ships code that was not in a nightly
  first. The workflow refuses a commit that is not on master, has no published nightly, or is older
  than the last stable release.
- **Off until the owner switches it on.** The repository variable `NIGHTLY_ENABLED` must be exactly
  `true`. Unset, the train behaves exactly as before this record.
- **Cadence:** every train attempt that passes on a commit that has no nightly yet.

## Not yet decided

- The site name (`nightly.graphty.app` or `beta.graphty.app`) and its DNS record, decided last.
- How graduation deploys the nightly's exact site build to the stable site. Today deploy-pages.yml
  deploys every green master build to graphty.app, unchanged by this record.

## The owner's checklist

1. Review and merge the pull request that adds the channel (it changes nothing while the switch is
   off).
2. Turn it on: Settings, Secrets and variables, Actions, Variables, `NIGHTLY_ENABLED` = `true`
   (`gh variable set NIGHTLY_ENABLED --body true`). Turning it off is deleting the variable or
   setting anything else.
3. Graduate a nightly when one is good: `gh workflow run release.yml --ref master -f
graduate=<full commit id>`. Each nightly's comment on the "Release status" issue prints this
   command with its commit.
4. Later, for the site: choose the nightly domain and add its DNS record; create the repository
   that will host the stable graphty.app site and give the release workflow the right to push to
   it. Until then graphty.app keeps deploying from every green master build.

## Why

The ad hoc release already exists and already runs every lane on the commit it releases, so
graduation is that release pointed at a chosen commit, not a new mechanism. Publishing nightlies
from release.yml reuses the trusted-publisher entries that already exist; a second workflow would
need ten manual edits on npmjs.com and would break publishing until they were done.

## Rejected

- **A `beta` or `nightly` dist-tag, or date-based versions (`-beta.<date>`).** `next` is the most
  common name for "the upcoming release" (React, Next.js, Nx). A date repeats when two attempts
  pass on one day; the run number never does.
- **A separate nightly workflow.** It would need its own npm trusted-publisher entry per package.
- **Keeping the scheduled stable release beside the nightly.** Graduation would then not be hand
  picked: every passing attempt would still release.
- **Reusing the nightly's builds for the stable publish.** The graduation run tests the commit
  again and publishes its own builds of that commit; reusing the nightly's would mean skipping the
  lanes, a larger change. It can follow if re-testing proves wasteful.
