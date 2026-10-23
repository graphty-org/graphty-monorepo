# Round 2 preflight: the tier 1 study on the real graphty app

Checked on 2026-10-06 against the nine items under "Before a round may start" in `criteria.md`,
on the studio worktree at commit 4a7a1a7fb (graphty 0.8.53, build stamp `4a7a1a7fbdba`).

## Verdict

**PASS: round 2 may start**, with two conditions on the runner (below). All nine items hold.
Three of them held only after fixes made during this check:

- **The served app was not the commit under study.** `graphty/dist` had been built from
  979449703, before the merge of interface fixes (34f1063de): a round run on it would have tested
  the round 1 fixes without the new Layout list, Export list, save, menu and Style pop-outs. Fixed:
  graphty-element and the graphty app were rebuilt from HEAD; the build stamp now matches.
- **The screen-reader mode did not meet item 2.** It printed every screenshot's path and accepted
  `--click`, so a blind participant could have been handed the screen. Fixed in `tool/real.mjs`:
  in `--sr` sessions every pointer step is refused with exit 2 before anything runs, and the
  screenshot is kept for graders without its path being printed; `--prove` gained the planted-click
  check. The tool's README says so.
- **The tool's save check was out of date** (the app now keeps a saved project in the browser
  instead of writing a file). The check was rewritten for the new save, and the whole proof
  passes.

**Conditions on the runner (not among the nine items, but round 1 voided 7 sessions on them):**

1. At most 4 participants alive at once, every attempt followed by `real.mjs --end`. The round
   workflow's session runner (read 2026-10-06) keeps 3 session agents alive and ends every
   attempt; the tool closes any session nobody steps for 15 minutes (`--prove`: "a session nobody
   steps or ends closes itself"). A dry run of 8 queued sessions with one planted agent stop was
   not run in this check; whoever starts the round runs it first.
2. The runner must hand each participant the persona file named in its session record (a full
   path) and the one-or-two-sentences-per-step rule. The round 1 runner's prompt found personas
   by name in the round 8 folder, where Dev, Grace and Ruth have thinner files of the same names
   and Sam has none, and asked for a full think-aloud. The session records carry both, so a
   runner that passes the record through is enough.

## The nine items

| #   | Item                                                                                                   | Result                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The build under study is this worktree's commit, rebuilt; the commit is in every `session.json`        | PASS after a rebuild       | HEAD 4a7a1a7fb; `nx run graphty-element:build` then `nx run graphty:build` at about 22:25; `graphty/dist/index.html` carries `4a7a1a7fbdba graphty@0.8.53`; no uncommitted change under `graphty/` or `graphty-element/`. Every pilot `session.json` records commit 4a7a1a7fb. Studio documents and the tool have uncommitted edits from this check; a commit of those alone does not move the build (`plan.md`, "How a session runs", step 1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2   | `real.mjs --prove` prints only `ok`, including the screen-reader mode and a planted `--click` refused  | PASS after the tool fix    | `tmp/researcher/r2/prove3.out`: 30 checks, "every check passed", exit 0. Screen-reader checks: an `--sr` start prints the focused element and no screenshot path; a planted `--click "Find"` is refused with exit 2 and no screenshot is taken; every key step prints a focus line and no path; `/` gives `combobox "Find"`; typing prints the live region's "No match for "zzzz"". The first two runs failed on the save check (`prove.out`, `prove2.out`), then passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 3   | Every success path and every keyboard path runs on the build as a script and ends on its success state | PASS                       | Success paths: all 17 task halves walked on 4a7a1a7fb with `real.mjs` (`tmp/researcher/r2/walk.sh`, outputs `r2/*.out`, screenshots `rounds/round-2/pilot/<task>/`), and every one reached its end state. Six paths changed on this build and are rewritten in `answers.md` from the walks: T7 and T8 (a run or group row opens on Style; the Top 10 and Members are on Values), T11 (a method list, then Apply), T12 (Neighborhood by G or the canvas context menu), T13 (Export rows; the data file needs Format CSV and Table Nodes), T14 (Save asks for a name, keeps the project in the browser; Main menu > Back to start). Keyboard paths (`r2/keypaths.out`), keys and typing only, all reached their end state: T5 18 keys, T6 35, T9 (Les Miserables) 59, T10 56 and 58, T12 27 and 30 (26 by G), T14 103, T15 (Les Miserables) 107; the own file was opened and ranked by keys in screen-reader mode (`r2/kb-T15B/`). No step needed a pointer. |
| 4   | Every reference value recorded on the commit under test; none blank                                    | PASS                       | `r2/ranks.out`: every ranking on Les Miserables, Florentine families and friends.csv identical to the values in `answers.md`; Louvain 6 groups, sizes 20, 17, 11, 11, 10, 8, modularity 0.5556 on 3 of 3 fresh loads; the 20 members of Group 1 identical (nodes CSV). Label statements unchanged ("77 labels, 7 hidden", "115 labels, 14 hidden", "77 labels, 6 hidden" once sized). Javert's 17 and the Medici's 6 neighbors identical in the walks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 5   | Wording check on every screen a success path reaches; the script fails on a planted echo               | PASS                       | `r2/wording-dump.mjs` dumped 48 screens (one miss: the usage card's "What is collected" is no longer a button; its text is in the start screen's dump); `r2/wording-check.py` now includes T2, refuses fewer than 30 screens or 17 prompts, and caught the planted "analyze, export, save, picture". One echo reworded: T14's "bring it back" and "everything came back" ("Back to start" is now the close step). Every other shared word is kept with its reason in `tasks.md`; the re-check after the rewording is `r2/wording-check2.out`.                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | Persona files strengthened (Dev, Ruth, Grace), Nadia's checked, Sam's written                          | PASS, with round 1's limit | Unchanged since round 1 (SHA-256 below match round 1's). The studio files for Dev, Grace, Ruth and Sam have still had no skeptic review, so the round gives every first-time persona the same 6 sessions instead of loading more on the thicker files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | The tool can close the tab and reopen the same browser storage (T14)                                   | PASS                       | `--prove`: "a reopened tab keeps the browser storage: Recent projects reopens the saved file". The T14 walk saved "Les Mis work" in the browser, went Back to start and reopened it from Recent projects with the Influence colors and the names back (`rounds/round-2/pilot/T14-v2/08.png`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 8   | The exported image has a key                                                                           | PASS                       | T15 Les Miserables and own file: "Size: Influence" and "Color: Influence" with ranges (`T15-A/downloads/`, `T15-B/downloads/`); T13: "Color: Communities" with Group 1 to 6 (`T13-v2/downloads/`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 9   | Tasks and criteria frozen; a new round folder; participants get only the prompt and their persona file | PASS                       | `rounds/round-2/` is new. The changes made between rounds are logged: `criteria.md` change log (round 2 size), `tasks.md` (T14 rewording, the round 2 wording list), `answers.md` (round 2 paths and the re-recorded values), `roster.md` (round 2 allocation). Their SHA-256 are below; a session may start only if they still match. Participant rules: `plan.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Frozen files (SHA-256 at the end of this preflight)

Recompute in `design/ui/studio/` with `sha256sum criteria.md tasks.md answers.md roster.md
personas/*.md tool/real.mjs rounds/round-2/setups/*.txt`. A mismatch means a file changed after the
freeze: stop and find out why.

```
182e60abe77459e8335044a3222e3824d6f04f2b02c53c4bfe4381f33abe8984  criteria.md
707a4add27bfb31ef1a83665858b7a6c1cd6ea0da565656a62d3ced3cc688325  tasks.md
e176f092489963e79b6eea50d7477d33922f9e3cc8501d3c5658b4b53706121d  answers.md
ab2a6be4dc733f29aa93c40aee3964dfb9adcab8e93c733f204e400575330a89  roster.md
3a0a87789c5bff210e7c7032a1abebd2b0f95306e8ea1f484905e56c5ad6a0f3  personas/class-project-student.md
e24c20183436e7314ecda7d44e20fb99934c570a966bddea173daf9d091c2b37  personas/data-journalist.md
fb41423b1b958006dc9d5ee98f7077f4230159e26d7fb2c2fa6c43fffd4b950e  personas/keyboard-only-sam.md
05745739eb0bae0edfc52c93634afd4fd291d2234777d30a2ff9f2ec2eded954  personas/nonprofit-operations-analyst.md
4008cb7a7c9646559c270e73220710bca64d21d347ae71be2105b9631770e2fd  tool/real.mjs
df1d489610c065b31d58411caa6ef20630164dcda04ad12685152aef84e73c8c  rounds/round-2/setups/T13.txt
fe9245f07cf05c9f1ca874aa29a908a9bfb886776450b0c31240492ab0517453  rounds/round-2/setups/T14.txt
03939df715d4a00fdbee3ba0947670c35fc4443dacfcc2a32bdd091d3de36f18  rounds/round-2/setups/T7-B.txt
```

## Found while checking (none blocks the round; each goes to whoever owns the fix)

Graders record these as what a user meets; a bar is scored with build-decided sessions included.

- **The data file for a report now takes 9 steps, and both defaults are wrong for T13** (likely
  severity 3, graphty app). Export > Data opens on "Graphty JSON" (the whole project, a file Excel
  cannot open), and choosing CSV gives the Edges table (source, target, shared chapters: no
  computed column). The per-character numbers need Format CSV and then Table Nodes. Round 1's build
  reached the CSV in 3 steps. Expect `wrong-file-type` or "numbers without the computed column"
  in T13 and a detour in any T15 participant who exports data. T13 runs late in the order
  (r2-s38, s39), so a fix can land first; if it does, the path in `answers.md` must be walked
  again.
- **Two changes on the neighbors task at once.** Besides the Neighborhood route, the merged build
  draws a chevron on the Degree row ("Degree 17 >"), the cue round 1's decisions held back so round
  2 could tell which change helped. Graders record each participant's route; the report cannot
  credit either change alone.
- **graphty-element's English shown as is.** The Layout list greys No crossings with "the layout
  "planar" cannot draw this graph without crossings: G is not planar." (internal name "planar",
  "G"); the CSV export's box lists "node column "style.color" ... cannot be written" and "the
  generic dialect has no direction column". Both break the rule that the element returns codes
  and the app writes the words, and both put jargon in front of a first-time user (T11, T13).
- **The table's Communities column shows the algorithm's group ids (0 to 5), while the legend,
  the outline and the exported CSV number groups by size (Group 1 to 6)**: Napoleon is 0 in the
  table, 6 in the CSV (seen in the scripted dump, `r2/screens.json`, screen `main-menu`). A
  participant who reads groups from the table reads numbers that disagree with the legend (a bar 5
  risk on T8 and T13).
- **A run or group row opens on its Style tab.** The Top 10 (T7, T9, T15) and a group's Members
  (T8) are one click away on Values, and a group's Style tab holds only a color field. Watch for
  wrong turns there.
- **Accessibility (bar 8):** the canvas takes focus with no accessible name ("Canvas (no name)");
  "No nodes to draw" is announced while a file opens; focus still falls to the page body after
  "No thanks", a refused file, Back to start and reopening a project; no announcement says a run
  finished. Focus after a Style pick now lands on the new line (fixed).
- **Known and expected in sessions:** runs are still named by result ("Influence"), so the
  run-name change was not made; a reopened run still has no count; the Overview's "Undirected,
  from the file: directed 0"; "Edges per n..." cut off; T14's header name is an inline rename
  field, so clicking it edits the name.
- **For the study's own scripts:** editing a shell script while it runs breaks the run (bash reads
  it as it goes); three pilot sessions were left open that way and were ended by hand.
