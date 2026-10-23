Launch a new session of our design studio for the tier 2 study: common repeat work for a
returning user (filters, the shortest path between two nodes, notes, joining more than one
table, weight set at load and used by every run, rerunning on new data, Select where and rule
queries, neighborhood distance, edge selection). ultracode

Context and memory:

- Every designer reads their notes in design/ui/studio/notes/ first, works from them, and
  updates them as they decide and learn (decisions with reasons, what worked and what didn't,
  "Top of mind" at the top, summarized when long). Commit the notes after every round.
- Read the tier 1 report (design/ui/studio/report.md), the tier 2 design
  (design/ui/studio/next-steps/tier2-design.md) and the tier 2 materials in
  design/ui/studio/tier2/ (criteria, tasks, answer key, roster, pilots) before planning.

Method:

- The success criteria in tier2/criteria.md were written before any session. Have the
  researcher, the user advocate and the red team review them once; change a bar only with a
  reason in the change log, then freeze them. No session runs before the criteria are frozen.
- Study the frozen build recorded at the top of tier2/criteria.md. Never change the build
  under a round. Fix and iterate locally between rounds on the studio branch, then freeze a
  new build for the next round. Pilot every task on each new build before its round, and
  make sure the answer key matches the screens exactly.
- Participants are returning users with a history: each starts from a saved project or a
  setup that reflects their earlier sessions, not an empty app (except where a task is about
  starting fresh).
- Every session calls design/ui/studio/tool/real.mjs directly with its own session folder.
  Never write a helper script around it, and never share one between sessions.
- Run sessions no faster than the browsers allow (at most 4 participants alive at once), so
  no session's clock runs while it waits. No step cap: a session ends when the participant is
  done, gives up, or keeps repeating without progress. Participants describe each step in one
  or two sentences (what they see, what they will try next). Retry a session that ends on an
  API error from a clean folder; record the model that ran it.
- Graders score only from the final screen and saved files, never from the participant's own
  rating. Two skeptics try to refute every finding before the studio acts on it.
- Besides the task sessions, each round the Figma designer, the visual designer and the
  accessibility specialist do an expert walkthrough of every tier 2 screen, and a screenshot
  audit checks truncation, spacing, wrong components and inconsistent patterns. Our tier 1
  study missed most of what a real person noticed on first use; I want to catch that kind
  of issue too.
- Share key insights with the owner as they arrive, and share screenshots and new versions of the application with the owner as changes are made.
- No touch profile and no keyboard-only study this time.

Iteration:

- After each round the studio critiques, the red team challenges, the director decides, and
  the engineers fix locally in the package that owns each problem (graph functionality in
  graphty-element as neutral facts, words in the app, shared components in compact-mantine),
  each fix with a test.
- API changes: additive changes (new methods, options, types, events) are the team's call --
  record the reasoning and keep going. Only a BREAKING change to a published API (removed or
  renamed exports, changed signatures, changed behavior or formats consumers rely on) goes on
  the owner-decisions list for me; don't block the study on it.
- Run as many rounds as it takes to meet the bars, but stop and tell me if a round makes no
  progress or a problem needs a one-way-door decision from me.
- Prioritize quality over time. Don't cut sessions short while they're still giving value.

When the studio is done, give me a summary report: what was tested (build, tasks,
participants, rounds), results per round against the frozen bars, what was learned, what was
changed and whether the next round confirmed it, what was deferred and why, the decisions
waiting on me, and next steps. You may merge to master when you are done. Merge using the minimum number of PRs to reduce screenshot conflicts, required testing, and to accelerate time to release.
