# Tier 6 round 1 plan: meeting the Assistant

Round 1 runs on the frozen study build 3b2a7f0649, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier6-r1d2-3b2a7f0649` with `REAL_DIST=<that folder>`
and `REAL_TIER=6` on every `tool/real.mjs` command (the first line of `../../criteria.md`). The bars,
how they are scored and what the round can conclude are in `../../criteria.md`; who takes which task
is `../../roster.md`, "Who takes which task", and where each half starts is its "Where each session
starts" table. This plan changes neither.

- 12 sessions, 6 tasks, one session per task half; no persona takes both halves of a task. A real
  model (Gemini) answers in every session.
- T90 starts on the empty start screen, and its file reaches the app by the participant's own
  `--upload`. Every other session starts from a `setup:` file in `../..`, never shown to the
  participant, with the file open and the AI connected. T91 A, T94 A and T94 B are returning readers,
  so their setups hold the saved work their history describes.
- Sam's starts add `--keys`, which refuses every pointer step.
- T90, T91 A, T92, T93 and T95 sessions are asked the task's follow-up after the participant stops,
  word for word from `../../tasks.md`. T91 B and T94 have none.
- Run order is the table's: T90 first, then the rest, at most 4 sessions at once.
- A void session, or one ending on an API error of the participant's own model, is re-run from a
  clean folder as `<id>b`, which takes this row and does not count against the 12.

| Session | Task | Half: dataset | Persona | Start |
| ------- | ---- | ------------- | ------- | ----- |
| r1-s01 | T90 | A: volunteers, volunteers.graphml | Grace | `empty` |
| r1-s02 | T90 | B: sources, sources.graphml | Sam | `empty --keys` |
| r1-s03 | T91 | A: volunteers as saved, volunteers.graphml | Ruth | `setup:connected-volunteers-sized.txt` |
| r1-s04 | T91 | B: yeast genes, yeast-galactose.graphml | Maren | `setup:connected-yeast.txt` |
| r1-s05 | T92 | A: sources left selected, sources.graphml | Dev | `setup:connected-sources-open.txt` |
| r1-s06 | T92 | B: yeast genes, yeast-galactose.graphml | Maren | `setup:connected-yeast.txt` |
| r1-s07 | T93 | A: volunteers, volunteers.graphml | Dev | `setup:connected-volunteers.txt` |
| r1-s08 | T93 | B: yeast genes, yeast-galactose.graphml | Sam | `setup:connected-yeast.txt --keys` |
| r1-s09 | T94 | A: Les Miserables poster, lesmis-poster project | Ruth | `setup:connected-lesmis-poster.txt` |
| r1-s10 | T94 | B: volunteers thanks, volunteers-thanks project | Grace-returning | `setup:connected-volunteers-thanks.txt` |
| r1-s11 | T95 | A: volunteers, volunteers.graphml | Grace | `setup:connected-volunteers.txt` |
| r1-s12 | T95 | B: yeast genes, yeast-galactose.graphml | Dev | `setup:connected-yeast.txt` |

## Open before the first session

The plan above is complete and all 12 briefings write, but three of the criteria's "Before the round
may start" items do not hold on this build yet (checked 2026-11-05).

1. `real.mjs --gate` on this folder exits 1, and `--start` refuses every session here until it passes.
   No half has a walk on 3b2a7f0649, T90 B's and T93 B's keyboard walks included, and fewer Gemini
   requests are left than the 12 sessions may use. The second dry run left only its scripted pass under `r1d2/`, and walks of 48879618c4
   do not count, because the app code differs. Never write the "Gate evidence" section by hand.
2. `../../answers.md` was last matched to 48879618c4, and this build holds the fixes for what several
   of its lines describe: T92 A after the x, T92 B's "at least 6", T91 A's chip of 15. A session graded
   on those lines would be marked `Build decided` for defects that may be gone.
3. T92 A's reply has not been seen narrowed to the selection on this build. If it is not, the plant
   is dropped, r1-s05 starts from `setup:connected-sources.txt` instead, and the report's first limit
   says so.
