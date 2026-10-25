# Contradictions between the drafts, and how they were settled

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

The appendices were drafted separately and disagreed in these places. Each line gives the two
positions and the one the design keeps. The appendices have been edited to match; a paragraph
that still says otherwise is marked superseded where it stands.

1. Store names: `tools/test-store/`, `TEST_STORE_TOKEN` vs `tools/results-service/`, `graphty-results`,
   `GRAPHTY_RESULTS_TOKEN`. The latter.
2. D1 cost: free plan vs about 110,000 rows a day. Workers Paid, an owner action.
3. Durations: a Worker cron polling into `duration` vs a `timings` job posting keyed rows. One table
   in the budgets shape, written by `timings` (`if: always()` sees killed jobs); no cron poll.
4. Production repository: `graphty-production` vs graphty-site (exists). graphty-site.
5. Site delivery: release assets in the site repositories through a Pages App vs a git commit per
   promotion through deploy keys. Git cannot carry 373 MB four times a day and deploy keys cannot
   create releases: the tarball is a prerelease asset in graphty-monorepo, and a deploy key pushes
   only `deployed.json`, which starts the site's deploy. No App.
6. Dataset overlay: appended at nightly time (which needs the production key outside the owner's
   approval) vs at production promotion. At promotion; a `next` consumer on the default URL gets a
   404 for a dataset newer than production.
7. Promotion as a job in release.yml (to avoid new trusted publishers) vs `promote.yml`.
   `promote.yml`: it never runs `npm publish`. Trusted publishers: unchanged vs bound to environment
   `release`. Bound, because a branch can edit and dispatch release.yml; the publish job declares the
   environment first, then the owner binds the entries.
8. `NPM_DIST_TAG_TOKEN` over `NPM_PROMOTE_TOKEN`.
9. Drafts kept vs deleted. Deleted.
10. Pre-push with format, lint and typecheck vs a seconds-only pre-push plus the quick check. The
    latter.
11. SonarQube only as the master watcher vs in the quick check. Both.
12. `branch-note.mjs` deleted vs kept. Kept without sync fields: unfinished branches have no pull
    request yet.
13. Mergify trigger: three master failures a week vs two skew breaks in 7 days or one red over
    6 hours. The latter: it counts only breaks a queue would stop.
14. Required checks: two vs more. Four, with integrity, proof, review and the breaking-change guard
    in `pr-integrity.yml` so review events do not re-run ci.yml.
15. Fresh review "before auto-merge" vs `pr-open.sh` arming auto-merge at once. The review runs
    before `pr-open.sh`, which posts it.
16. Four CODEOWNERS lists, the broadest owning all of `tools/` and every CLAUDE.md. The narrow list
    in the main document (section 6.2): 27 of 117 recent landings would have waited instead of 43.
17. Agent git identity per worktree with a token in `.env` vs `GH_CONFIG_DIR` and global config in
    `.claude/settings.json`. The latter covers every checkout and the review server.
18. `site.json` in the site repositories vs `graphty/sites/` in this repository. The latter, read
    from master's tip at each deploy.
19. On-configuration stories without screenshots vs compared with Off baselines. Compared: stronger,
    and adds no images.
20. Canary domain first vs at the domain swap. A Pages site has one custom domain, so at the swap;
    graphty.app is frozen on the flushed release meanwhile.
21. Shadow full run vs straight to red handling. The full run bisects and reverts but publishes
    nothing until nightly is turned on; `latest` stays put until the first promotion.
22. Stories shadow: 5 full runs overall vs two clean runs per project. Per project, two, after the
    parity spike.
23. Fail-open timeouts 3 s vs 5 and 2 s. The latter; 10 s for `timings`.
24. Build reuse: the old "Reuse" step deleted for the cache vs `reuse_build_run`. Both: the old step
    goes; the full run reuses the master build it tests.
25. Budget numbers differed between merging and budgets. One file; the budget is the warn line.
26. "Zero changed screenshots" for a flag's first pull request was not enforced, since changed
    images pass. The Stories job fails such a pull request on any changed existing story.
27. Red full-run priority `high` vs `critical`. Critical: canary is master.
28. master-guard's revert job deleted vs kept. Kept, as the agent, exempt from Proof and review as a
    mechanical revert.
29. Mergify Test Insights kept vs deleted. Deleted once store reads are live.
30. "Prevent self-review" on the `production` environment vs the owner dispatching `promote.yml`
    himself. Off: GitHub would refuse his own approval of a run he started, and the agent is no
    reviewer, so his approval is already the control.
31. Bisect dispatched by the Worker vs started by the pipeline round. The Worker, once per full run;
    the round runs only GPU bisects on the local card, and only when the bisect records that it needs
    one.
32. `require_last_push_approval` on vs off. Off: with 0 required approvals its effect is unverified,
    and dismissing stale reviews already stops an approval surviving a push.
