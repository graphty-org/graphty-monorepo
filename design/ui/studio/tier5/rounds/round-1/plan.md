# Tier 5 round 1 plan: returning users choosing which nodes

Round 1 runs on the frozen study build 1e123d7d33, served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33` with
`REAL_DIST=<that folder>` on every `tool/real.mjs` command (the first line of `../../criteria.md`).
The bars, how they are scored and what the round can conclude are in `../../criteria.md`; who takes
which task is `../../roster.md`, "Who takes which task", and where each task half starts is its
"Where each session starts" table. This plan changes neither.

- 30 sessions, 9 tasks (the round's cap): the core tasks (T70, T71, T73, T74, T78) at 4 pointer
  sessions, two per half; T72, T75, T77 and T79 at 2, one per half; T76 has no sessions (piloted in
  the dry run only); Sam's two keyboard-only sessions (T70 A and T71 A) last, counted only in bar 5.
- Every session starts from the person's saved project or one shared with them (a `setup:` file in
  `../../../rounds/tier-5/setups/`, never shown to the participant). Sam's starts add `--keys`,
  which refuses every pointer step. The two 50,000-node starts (T79) read the files
  `tool/files/big-50k.py` wrote (present in `tool/files/`).
- Every session gets its task half's follow-up after the participant's first `--end`, word for word
  from `../../tasks.md` (the overwhelm rating first, with the moment the person was least sure
  where to look or what to do next; in T70 and T71 then the question about the drawing or the
  screen); the tool gives it, and the participant never sees it before.
- No session starts before the round's start gate (`real.mjs --gate <this round's folder>`) has
  passed and written its "Gate evidence" section at the end of this file. If the first sessions are
  all refused with the same tool line, the round stops there; a refused start is not re-run.
- Run order is the table's: the core tasks first, A and B alternating, then the rest, then Sam; at
  most 8 sessions at once.
- A session that ends with no `01.png` or on a model API error is re-run from a clean folder as
  `<id>b`, which takes this row.
- No step cap: a session ends when the participant is done, gives up, or repeats without
  progress. Step notes are one or two sentences, in character. A session re-run after an API error
  runs the same prompt from a clean folder, then once on Sonnet; the grade records the model, and
  Sonnet sessions are counted apart.

| Session | Task | Half: dataset | Persona | Start |
| ------- | ---- | ------------- | ------- | ----- |
| r1-s01 | T70 | A: volunteers, volunteers.graphml (ranked) | Grace | `setup:volunteers.txt` |
| r1-s02 | T70 | B: river gauges, gauges + flows (tidied) | Tom | `setup:gauges-clean.txt` |
| r1-s03 | T70 | A: volunteers, volunteers.graphml (ranked) | Dana | `setup:volunteers.txt` |
| r1-s04 | T70 | B: river gauges, gauges + flows (tidied) | Maren | `setup:gauges-clean.txt` |
| r1-s05 | T71 | A: volunteers, volunteers.graphml (ranked) | Grace | `setup:volunteers.txt` |
| r1-s06 | T71 | B: river gauges, gauges + flows (tidied) | Tom | `setup:gauges-clean.txt` |
| r1-s07 | T71 | A: volunteers, volunteers.graphml (ranked) | Dana | `setup:volunteers.txt` |
| r1-s08 | T71 | B: river gauges, gauges + flows (tidied) | Alex | `setup:gauges-clean.txt` |
| r1-s09 | T73 | A: volunteers, volunteers.graphml (ranked) | Grace | `setup:volunteers.txt` |
| r1-s10 | T73 | B: river gauges, gauges + flows (tidied) | Maren | `setup:gauges-clean.txt` |
| r1-s11 | T73 | A: volunteers, volunteers.graphml (ranked) | Dana | `setup:volunteers.txt` |
| r1-s12 | T73 | B: river gauges, gauges + flows (tidied) | Alex | `setup:gauges-clean.txt` |
| r1-s13 | T74 | A: volunteers, volunteers.graphml (ranked) | Grace | `setup:volunteers.txt` |
| r1-s14 | T74 | B: river gauges, gauges + flows (tidied) | Maren | `setup:gauges-clean.txt` |
| r1-s15 | T74 | A: volunteers, volunteers.graphml (ranked) | Dana | `setup:volunteers.txt` |
| r1-s16 | T74 | B: river gauges, gauges + flows (tidied) | Alex | `setup:gauges-clean.txt` |
| r1-s17 | T78 | A: volunteers with shifts, volunteers-shifts.graphml | Grace | `setup:volunteers-shifts.txt` |
| r1-s18 | T78 | B: river gauges, gauges + flows (tidied) | Tom | `setup:gauges-clean.txt` |
| r1-s19 | T78 | A: volunteers with shifts, volunteers-shifts.graphml | Dana | `setup:volunteers-shifts.txt` |
| r1-s20 | T78 | B: river gauges, gauges + flows (tidied) | Maren | `setup:gauges-clean.txt` |
| r1-s21 | T72 | A: sources network, sources.graphml | Ruth | `setup:sources.txt` |
| r1-s22 | T72 | B: river gauges, gauges + flows (tidied) | Tom | `setup:gauges-clean.txt` |
| r1-s23 | T75 | A: graph researchers sample (549 people) | Alex | `setup:researchers.txt` |
| r1-s24 | T75 | B: yeast genes, yeast-galactose.graphml | Maren | `setup:yeast.txt` |
| r1-s25 | T77 | A: volunteers, the thank-you event project | Grace | `setup:volunteers-thanks.txt` |
| r1-s26 | T77 | B: river gauges, the readings project | Tom | `setup:gauges-telemetry.txt` |
| r1-s27 | T79 | A: research office staff, 50,000 people | Alex | `setup:staff-50k.txt` |
| r1-s28 | T79 | B: state river sensors, 50,000 sensors | Tom | `setup:sensors-50k.txt` |
| r1-s29 | T70 | A: volunteers, volunteers.graphml (ranked) | Sam | `setup:volunteers.txt --keys` |
| r1-s30 | T71 | A: volunteers, volunteers.graphml (ranked) | Sam | `setup:volunteers.txt --keys` |

## Gate evidence

Checked by `real.mjs --gate` on 2026-11-03, build 1e123d7d33:

- pilot T70A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70A/touched-1/, keyboard /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T70A/keyboard-1e123d7d33/
- pilot T70B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70B/touched-2/
- pilot T71A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T71A/detour-1-1e123d7d33/, keyboard /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71A/keyboard/
- pilot T71B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71B/detour-1/
- pilot T72A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/touched-3/
- pilot T72B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72B/touched-4/
- pilot T73A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73A/touched-5/
- pilot T73B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73B/touched-12/
- pilot T74A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74A/touched-6/
- pilot T74B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/detour-1/
- pilot T75A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T75A/detour-1-1e123d7d33/
- pilot T75B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T75B/detour-1-1e123d7d33/
- pilot T77A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T77A/detour-1-1e123d7d33/
- pilot T77B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T77B/detour-1-1e123d7d33/
- pilot T78A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T78A/detour-1-1e123d7d33/
- pilot T78B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T78B/detour-1-1e123d7d33/
- pilot T79A: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79A/success-1e123d7d33/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79A/touched-10-1e123d7d33/
- pilot T79B: success /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/success/, detours /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/touched-11/
- setup volunteers.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70A/success/
- setup gauges-clean.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70B/success/
- setup volunteers-shifts.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/success/
- setup sources.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/success/
- setup researchers.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75A/success/
- setup yeast.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75B/success/
- setup volunteers-thanks.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77A/success/
- setup gauges-telemetry.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77B/success/
- setup staff-50k.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79A/success-1e123d7d33/
- setup sensors-50k.txt: started cleanly in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/success/
- end-state T70A: 6 items (4 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70A/success/
- end-state T70B: 6 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T70B/success/
- end-state T71A: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71A/success/
- end-state T71B: 5 items (2 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71B/success/
- end-state T72A: 4 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72A/success/
- end-state T72B: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72B/success/
- end-state T73A: 5 items (4 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73A/success/
- end-state T73B: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73B/success/
- end-state T74A: 5 items (4 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74A/success/
- end-state T74B: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/success/
- end-state T75A: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75A/success/
- end-state T75B: 4 items (2 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75B/success/
- end-state T77A: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77A/success/
- end-state T77B: 6 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77B/success/
- end-state T78A: 4 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/success/
- end-state T78B: 5 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78B/success/
- end-state T79A: 4 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79A/success-1e123d7d33/
- end-state T79B: 4 items (3 layers) hold in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/success/
- path steps: T70A 15, T70B 15, T71A 9, T71B 9, T73A 12, T73B 12, T74A 13, T74B 13, T78A 17, T78B 19
- reference screenshots: 4 listed in /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier5/design/ui/studio/tier5/decided.md
- rating check T70A: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T70A/rating-rejected/
- rating check T70A: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T70A/rating-frozen/
- rating check T70B: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T70B/rating-rejected/
- rating check T70B: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T70B/rating-frozen/
- calm-first check on the rejected build: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier5/design/ui/studio/tier5/rounds/round-1/calm-first-rejected.md
- bars on 1e123d7d33eb graphty@0.8.92: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier5/design/ui/studio/tier5/rounds/round-1/bars/bars.json
- bars-light on 1e123d7d33eb graphty@0.8.92: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier5/design/ui/studio/tier5/rounds/round-1/bars-light/bars.json
