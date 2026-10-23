# Tier 3 round 1 plan: first use and styling

Round 1 runs on the frozen study build 758b8e8081, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081` with `REAL_DIST=<that folder>`
on every `tool/real.mjs` command (the first line of `../../criteria.md`). The bars, how they are
scored and what round 1 can conclude are in `../../criteria.md`; who takes which task is
`../../roster.md`, "Who takes which task in round 1". This plan changes neither.

- 56 sessions, 12 tasks: the core tasks (T39, T40, T47, T48) at 6, three per half; T38,
  T41, T43, T45, T46, T49, T50 and T51 at 4, two per half. T37, T42 and T44 do not run in round 1.
- Every session starts on the empty start screen (`empty`); Sam's start `empty --keys`, which
  refuses every pointer step. Brought files reach the app by the participant's own `--upload`;
  T50's saved projects are opened by the participant, as part of the task.
- T49's sessions get the task's follow-up after the participant stops, word for word from
  `../../tasks.md`.
- Run order is the table's: the core tasks first, then the rest, at most 4 sessions at once.
- A session that ends with no `01.png` or on a model API error is re-run from a clean folder as
  `<id>b`, which takes this row.

| Session | Task | Half: dataset | Persona | Start |
| ------- | ---- | ------------- | ------- | ----- |
| r1-s01 | T39 | A: Les Miserables | Elena | `empty` |
| r1-s02 | T39 | B: College football | Dev | `empty` |
| r1-s03 | T39 | A: Les Miserables | Tom | `empty` |
| r1-s04 | T39 | B: College football | Nadia | `empty` |
| r1-s05 | T39 | A: Les Miserables | Sam | `empty --keys` |
| r1-s06 | T39 | B: College football | Ruth | `empty` |
| r1-s07 | T40 | A: Les Miserables | Ruth | `empty` |
| r1-s08 | T40 | B: yeast genes, yeast-galactose.graphml | Maren | `empty` |
| r1-s09 | T40 | A: Les Miserables | Tom | `empty` |
| r1-s10 | T40 | B: yeast genes, yeast-galactose.graphml | Dev | `empty` |
| r1-s11 | T40 | A: Les Miserables | Sam | `empty --keys` |
| r1-s12 | T40 | B: yeast genes, yeast-galactose.graphml | Grace | `empty` |
| r1-s13 | T47 | A: Les Miserables | Grace | `empty` |
| r1-s14 | T47 | B: College football | Nadia | `empty` |
| r1-s15 | T47 | A: Les Miserables | Elena | `empty` |
| r1-s16 | T47 | B: College football | Ruth | `empty` |
| r1-s17 | T47 | A: Les Miserables | Alex | `empty` |
| r1-s18 | T47 | B: College football | Sam | `empty --keys` |
| r1-s19 | T48 | A: volunteers, volunteers.graphml | Sam | `empty --keys` |
| r1-s20 | T48 | B: sources, sources.graphml | Nadia | `empty` |
| r1-s21 | T48 | A: volunteers, volunteers.graphml | Dev | `empty` |
| r1-s22 | T48 | B: sources, sources.graphml | Grace | `empty` |
| r1-s23 | T48 | A: volunteers, volunteers.graphml | Ruth | `empty` |
| r1-s24 | T48 | B: sources, sources.graphml | Elena | `empty` |
| r1-s25 | T38 | A: volunteers, volunteers.graphml | Alex | `empty` |
| r1-s26 | T38 | B: sources, sources.graphml | Ruth | `empty` |
| r1-s27 | T38 | A: volunteers, volunteers.graphml | Dev | `empty` |
| r1-s28 | T38 | B: sources, sources.graphml | Elena | `empty` |
| r1-s29 | T41 | A: volunteers, volunteers.graphml | Nadia | `empty` |
| r1-s30 | T41 | B: sources, sources.graphml | Grace | `empty` |
| r1-s31 | T41 | A: volunteers, volunteers.graphml | Tom | `empty` |
| r1-s32 | T41 | B: sources, sources.graphml | Alex | `empty` |
| r1-s33 | T43 | A: volunteers, volunteers.graphml | Maren | `empty` |
| r1-s34 | T43 | B: sources, sources.graphml | Dev | `empty` |
| r1-s35 | T43 | A: volunteers, volunteers.graphml | Elena | `empty` |
| r1-s36 | T43 | B: sources, sources.graphml | Nadia | `empty` |
| r1-s37 | T45 | A: neighbors, neighbors.csv | Alex | `empty` |
| r1-s38 | T45 | B: Les Miserables | Tom | `empty` |
| r1-s39 | T45 | A: neighbors, neighbors.csv | Grace | `empty` |
| r1-s40 | T45 | B: Les Miserables | Dev | `empty` |
| r1-s41 | T46 | A: Les Miserables | Alex | `empty` |
| r1-s42 | T46 | B: College football | Elena | `empty` |
| r1-s43 | T46 | A: Les Miserables | Nadia | `empty` |
| r1-s44 | T46 | B: College football | Grace | `empty` |
| r1-s45 | T49 | A: Les Miserables | Dev | `empty` |
| r1-s46 | T49 | B: karate club | Alex | `empty` |
| r1-s47 | T49 | A: Les Miserables | Tom | `empty` |
| r1-s48 | T49 | B: karate club | Ruth | `empty` |
| r1-s49 | T50 | A: lesmis-poster, lesmis-poster.graphty.json | Tom | `empty` |
| r1-s50 | T50 | B: volunteers-thanks, volunteers-thanks.graphty.json | Ruth | `empty` |
| r1-s51 | T50 | A: lesmis-poster, lesmis-poster.graphty.json | Elena | `empty` |
| r1-s52 | T50 | B: volunteers-thanks, volunteers-thanks.graphty.json | Dev | `empty` |
| r1-s53 | T51 | A: volunteers, volunteers.graphml | Elena | `empty` |
| r1-s54 | T51 | B: sources, sources.graphml | Grace | `empty` |
| r1-s55 | T51 | A: volunteers, volunteers.graphml | Nadia | `empty` |
| r1-s56 | T51 | B: sources, sources.graphml | Alex | `empty` |

## Gate evidence

Checked by `real.mjs --gate` on 2026-10-21, build 758b8e8081:

- pilot T38A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T38A/r1d2-r4-success/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T38A/detours/
- pilot T38B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T38B/r1d2-758b-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T38B/detours/
- pilot T39A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T39A/r1d2-j-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T39A/r1d2-j-detours/, keyboard /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T39A/keys/
- pilot T39B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T39B/r1d2-758b-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T39B/r1d2-m-detours/
- pilot T40A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T40A/r1d2-r3-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T40A/detours-filter/, keyboard /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T40A/keys/
- pilot T40B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T40B/r1d2-p2-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T40B/r1d2-p2-detour-find/
- pilot T41A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T41A/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T41A/r1d2-758-detour-find-phone/
- pilot T41B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T41B/r1d2-p3-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T41B/detours/
- pilot T43A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T43A/p2-success/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T43A/p2-detours/
- pilot T43B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T43B/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T43B/p2-detours-file/
- pilot T45A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T45A/r1d2-758-success-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T45A/r1d2-758-detour-replace-undo/
- pilot T45B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T45B/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T45B/r1d2-758-detour-find-newlayer/
- pilot T46A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T46A/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T46A/r1d2-758-detour-find-layer-edit/
- pilot T46B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T46B/r1d2-rp-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T46B/p3-detours/
- pilot T47A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T47A/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T47A/p3-detours/
- pilot T47B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T47B/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T47B/p3-detours/, keyboard /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T47B/p3-keys/
- pilot T48A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T48A/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T48A/detours-file/, keyboard /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T48A/keys/
- pilot T48B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T48B/r1d2-p758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T48B/r1d2-detour-cover-plus-layer/
- pilot T49A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T49A/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T49A/detours-layer/
- pilot T49B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T49B/r1d2-p-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T49B/r1d2-q-detour-color/
- pilot T50A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T50A/r1d2-758-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T50A/r1d2-758-detour-label/
- pilot T50B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T50B/r1d2-p1-pointer/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T50B/r1d2-p2-detours/
- pilot T51A: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T51A/r1d2-rp-success/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T51A/p2-detours/
- pilot T51B: success /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T51B/r1d2-r3-success/, detours /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/pilot/T51B/r1d2-rp-detour-findlayer-condition/
- bars on 758b8e8081dc graphty@0.8.91: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/bars/bars.json
- bars-light on 758b8e8081dc graphty@0.8.91: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/round-1/bars-light/bars.json
