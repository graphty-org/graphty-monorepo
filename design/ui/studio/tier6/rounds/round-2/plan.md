# Tier 6 round 2 plan: meeting the Assistant

Round 2 runs on the frozen study build 3b2a7f0649, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier6-r1d2-3b2a7f0649` with `REAL_DIST=<that folder>`
and `REAL_TIER=6` on every `tool/real.mjs` command (the first line of `../../criteria.md`). The bars,
how they are scored and what the round can conclude are in `../../criteria.md`; who takes which task
is `../../roster.md`, "Who takes which task", and where each half starts is its "Where each session
starts" table. This plan changes neither.

This folder holds the sessions round 1 could not run. Every round 1 session was refused before a
browser opened, so no reader has met the Assistant yet, and these are the first sessions of the
study, not a second look at anything. The expert walks of round 1 count here unchanged
(`expert/from-round-1.md`).

- 12 sessions, 6 tasks, one session per task half; no persona takes both halves of a task. A real
  model (Gemini) answers in every session.
- **Weighting.** Nothing to trade. All 12 halves missed their bars in round 1 with nothing to count
  (`../round-1/scores.md`), so each is owed a session, and the criteria hold the round to one session
  per half: bars 3, 6, 7 and 8 name both sessions of their task, and bar 5 needs T92 and T95 on both
  halves. No path changed: the only difference from this build to the branch under `graphty`,
  `graphty-element` and `compact-mantine` is one test file. No fix is on this build, so no prompt can
  echo a fix's words, and `../../tasks.md` is used as it stands.
- T90 starts on the empty start screen, and its file reaches the app by the participant's own
  `--upload`. Every other session starts from a `setup:` file in `../..`, never shown to the
  participant, with the file open and the AI connected. T91 A, T94 A and T94 B are returning readers,
  so their setups hold the saved work their history describes.
- Sam's starts add `--keys`, which refuses every pointer step.
- T90, T91 A, T92, T93 and T95 sessions are asked the task's follow-up after the participant stops,
  word for word from `../../tasks.md`. T91 B and T94 have none.
- Run order is the table's: T90 first, then the rest, at most 4 sessions at once.
- A void session, or one ending on an API error of the participant's own model, is re-run from a
  clean folder as `<id>b`, which takes this row and does not count against the 12. Every session here
  has its one re-run: round 1's were spent on `r1-` folders, on a refusal that said nothing about a session.

| Session | Task | Half: dataset | Persona | Start |
| ------- | ---- | ------------- | ------- | ----- |
| r2-s01 | T90 | A: volunteers, volunteers.graphml | Grace | `empty` |
| r2-s02 | T90 | B: sources, sources.graphml | Sam | `empty --keys` |
| r2-s03 | T91 | A: volunteers as saved, volunteers.graphml | Ruth | `setup:connected-volunteers-sized.txt` |
| r2-s04 | T91 | B: yeast genes, yeast-galactose.graphml | Maren | `setup:connected-yeast.txt` |
| r2-s05 | T92 | A: sources left selected, sources.graphml | Dev | `setup:connected-sources-open.txt` |
| r2-s06 | T92 | B: yeast genes, yeast-galactose.graphml | Maren | `setup:connected-yeast.txt` |
| r2-s07 | T93 | A: volunteers, volunteers.graphml | Dev | `setup:connected-volunteers.txt` |
| r2-s08 | T93 | B: yeast genes, yeast-galactose.graphml | Sam | `setup:connected-yeast.txt --keys` |
| r2-s09 | T94 | A: Les Miserables poster, lesmis-poster project | Ruth | `setup:connected-lesmis-poster.txt` |
| r2-s10 | T94 | B: volunteers thanks, volunteers-thanks project | Grace-returning | `setup:connected-volunteers-thanks.txt` |
| r2-s11 | T95 | A: volunteers, volunteers.graphml | Grace | `setup:connected-volunteers.txt` |
| r2-s12 | T95 | B: yeast genes, yeast-galactose.graphml | Dev | `setup:connected-yeast.txt` |

## Open before the first session

All 12 briefings write, but nothing below held on 2026-11-05, and the first item stops every session.

1. **`real.mjs --gate` on this folder exits 1, with 12 `FAIL` lines, and `--start` will refuse all 12
   sessions until it passes**, as it did in round 1. 12 of 12 halves have no walk on 3b2a7f0649: 26
   walks are needed, a success and a detours walk per half and a keyboard walk for T90 B and T93 B,
   under the main checkout's `tmp/design-studio/tier6/round-2/pilot/<half>/` (or `r2/`, `r2d1/`). The
   `r1d2` walks do not count for this round, and that folder holds only a scripted pass. Requests
   are no longer short: 3,000 of the 5,000 are spent, and 12 sessions may use 480. Launching before
   the walks exist repeats round 1's result. Never write the "Gate evidence" section by hand.
2. **`../../answers.md` is not matched to this build.** It was last matched to 48879618c4, and 125
   commits over the app code separate the two. This build holds the fixes for what several lines
   describe: T92 A after the x, T92 B's "at least 6", T91 A's chip of 15. Graded on those lines, a
   session would be marked `Build decided` for defects that may be gone.
3. **T92 A's plant has not been seen on this build.** If its reply is not narrowed to the selection,
   the plant is dropped, r2-s05 starts from `setup:connected-sources.txt`, and the report's first
   limit says so. The first walk of T92 A settles it.
4. **Every participant's first prompt still says "a RETURNING user of this app"**
   (`.claude/workflows/design-studio.js`, line 1039, when the run's `users` is `returning`). 3 of the 12
   are returning readers. The other 9 are told so against their own briefing, which primes them. A
   run started with `users: first-time` would mislabel the 3 instead; the line needs to say only
   "the person the briefing describes". Until then, no first-meeting result counts without this limit stated.
5. **`real.mjs --leaks` still reads quoted text as an opened file.** `leaksIn` runs over every string
   in a tool call's input, so a participant who writes a path into its transcript gets a false VOID.
   A VOID from `--leaks` needs its `what` read against the tool call before it stands.
6. **The restart is not logged in `../../criteria.md`.** Its change log has no line saying these 12
   sessions replace round 1's with no re-run spent. This plan assumes that reading; it is the
   Director's to log, before the first session, since nothing there changes after it.

## Gate evidence

Checked by `real.mjs --gate` on 2026-11-06, build 3b2a7f0649:

- pilot T90A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T90A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T90A/detour-1/
- pilot T90B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T90B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T90B/detour-1/, keyboard /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T90B/keyboard/
- pilot T91A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T91A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T91A/detour-1/
- pilot T91B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T91B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T91B/detour-1/
- pilot T92A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T92A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T92A/detour-1/
- pilot T92B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T92B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T92B/detour-1/
- pilot T93A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T93A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T93A/detour-1/
- pilot T93B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T93B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T93B/detour-1/, keyboard /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T93B/keyboard/
- pilot T94A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T94A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T94A/detour-1/
- pilot T94B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T94B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T94B/detour-1/
- pilot T95A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T95A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T95A/detour-1/
- pilot T95B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T95B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/round-2/pilot/T95B/detour-1/
