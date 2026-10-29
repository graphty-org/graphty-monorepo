# Red Team Critic -- designer's notes

The studio's Red Team Critic attacks clutter, features grown from one persona's task, unjustified
divergence from Figma or from our own patterns, and findings that are artifacts of simulated users
or of a broken prototype. Every objection comes with a sharper, usually smaller, alternative.
Read "Top of mind" first at the start of every session; update it whenever a decision or a result
changes it.

Words used below: "the element" is graphty-element, the web component that owns all graph logic;
"the app" is the graphty app, chrome around it. "Tier 1" is a first-time user's core path from an
empty app (open a sample or file, read it, run an analysis, color/size by a value, labels from an
attribute, a readable layout, find a node and its neighbors, export picture and numbers, save and
reopen, and the whole session chained). "The mock" is the clickable skeleton of the app structure
the owner chose ("refined structure B"); "the real app" is the tier 1 build merged 2026-10-06 and
served at `/?next`.

## Top of mind

- (2026-10-29) Tier 4 (data management, one round, returning users) criteria review: nothing is
  frozen yet (criteria.md's first line is the `<sha>` placeholder) and answers.md paths name
  e52d7c4f57, before R1-R15. Task prompts echo success-path words: "stronger"/"farther" (the
  "Higher weight means" options), "at least" (the filter card's own summary words), "web address"
  (the box's label). T62 passes on the time role alone, so column kinds may go untested.
- (2026-10-29) Watch in tier 4: success-by-default. T63's place is designated by the program at
  load; T66/T61 prompts hand over the fact the task should find. A bar that passes when the
  participant did nothing is not measuring. Each decided fix (R2-R15) names a re-test; most have
  no task that runs it -- report those "not re-tested", never "passed".
- (2026-10-23, issue #3315) Attacked the one-per-kind ruling: six location items make the
  nodes' "+" menu ten long, and a reader can list Latitude, Coordinates and City at once. Answers
  adopted: the menu is still one flat list of short nouns with type-ahead; a listed kind the
  element is not reading is marked unused by the element's code, so the screen never claims a
  column is placing nodes when it is not. Still open, watch in a study: does a reader with one
  "location" column of "48.85, 2.35" find "Coordinates" (detection lists it with no action, so
  only a mis-detected file tests it).
- (2026-10-21) Round 1 closed at its 1-round cap, bars unmet. 55 of 56 sessions succeeded,
  median wrong turns <= 1: success is saturated. Next round must score cost (steps over the key),
  routes and problems, and must screen tasks for leading before spending sessions -- the answer
  key names most problems the graders cite.
- (2026-10-21) The round's only F came from the grading rule, not the reader: `colorWord` returns
  a CSS keyword before hue, so FFD700 is "gold", not "yellow". Fix the rule (hue band set before
  the round) and the shared table in compact-mantine, which also speaks those names aloud; never
  add a per-task synonym.
- (2026-10-21) Bar 5 fails only on two backlog severity 3 items (node Fill "+" one-node layer;
  folder chain icon) that no or few sessions reached. A frozen rule counted them on 1 rating; ask
  for a repro or a reach before a backlog row gates a round.
- (2026-10-21) Best real findings, all severity 2: newcomers look for node color in the Graph
  inspector first (9 sessions); a new style line starts at the current value so it looks broken;
  layer membership is checked by eye (ids, no row marking). Fix by moving or defaulting, not by
  hints: a new line should start at a visibly different value.
- (2026-10-21) Avoiding the `<<Layer>>` token was counted as understanding it. A bar that cannot
  tell avoidance from comprehension is not measuring; demand a separating measure.
- (2026-10-21) Tool artifacts caught by skeptics: one synthetic wheel event read as "barely
  zooms"; storage notice caused by the automation's quota. Every build defect needs a repro made
  the way a person would make it before it is counted.
- (2026-10-21) Rejected generality traps: a "cube" shape synonym, a "cluster" ranking tweak,
  currency or task wording in the product. Task words are not product requirements.
- (2026-10-20) Owed and still unverified: build-equivalence and half-folder gate checks,
  bars.mjs spoken/typing checks, wording.mjs stem; score.mjs bar 4 start point is now owed too.
- (2026-10-17) Accepted by the Director, not re-raised without new evidence: T50 A guessable from
  "Mlle"; bar 8 screens over budget as severity 2; T47's "around" route counts against bulk.
- Standing: rounds are one model playing everyone -- a failure is strong, a pass weak; discount
  every "unprompted" count. A process rule without a refusing gate is a wish.
- Standing: after a rule is adopted, read the gate code and the tool, not the rule.
- Standing: fix by removing, not adding; one change per problem; words at rest never rise;
  rejected stays rejected without new evidence; never re-set a limit from data.

## Priorities and values

- (2026-10-06) Less on screen beats more help on screen. The owner's founding complaint (2026-09-25)
  was that graphty "looks complex and cluttered compared to figma" with "more cognitive load".
  Every addition must beat that cost, and the burden of proof is on the addition.
- (2026-10-06) The intermediate weekly analyst is the design target. Novices and experts are served
  only by aids everyone gets: undo, working defaults, (i) icons, waiting tooltips, Quick actions
  with aliases, samples, documentation.
- (2026-10-06) Evidence over taste, and the right evidence. A finding counts only when observed in
  two or more participants, on a screen that actually did what the design says, with task words
  that did not echo the target. "Ours is clearer" is taste.
- (2026-10-06) Owner items outrank simulated findings. Do not re-ask decided questions; check the
  owner feedback file before raising any owner question.
- (2026-10-06) Honesty of the readout over a quiet screen: a count that is not computed from live
  state is removed, not reworded (the fixed "64 hidden" string was the top trust-killer in round 8).
- (2026-10-06) Studies are expensive (owner, 2026-09-29): a round must not launch until its decisions
  are drawn and its preflight proves the build reaches every task's end state.

## Design criteria

- (2026-10-06) One home per capability; other entries are doors that run the same registered
  command with identical words. Two controls that set the same state are a defect. Reason: owner,
  2026-09-12 and 2026-09-30, "why the duplicate locations for functionality?"
- (2026-10-06) A fix names its cause. If a finding traces to a missing label, an undrawn decision or
  a mock fault, the fix is that, not a new control. Reason: round 4-8 triage repeatedly found
  proposals that built new features around an unwired picker.
- (2026-10-06) Nothing exists only for a beginner or only for the first few uses. Reason:
  `framework/principles.md`, "How every skill level is served" test; the owner's v1 lesson.
- (2026-10-06) The tool states facts, never verdicts or recommendations ("real change or noise",
  "treat them as tied" with a made-up 2%). Reason: principle 1 and the methods-section voice; a
  verdict the tool cannot defend costs trust.
- (2026-10-06) An algorithm's suggested style paints only its own result; dimming the rest is the
  reader's choice. Reason: repository rule "Algorithm Styles"; owner 2026-09-16.
- (2026-10-06) Every count names its unit and its whole, and comes from live state. Reason: rounds
  2-7 had numbers disagreeing between screens every round.
- (2026-10-06) A text-only tree-test miss is not enough to restructure; corroborate with a
  click-through first. Reason: round 8 tree "run betweenness" 29% direct but 99.7% correct overall
  and the click-through did not fail there.
- (2026-10-06) An unbuilt thing is not drawn: no "Coming" tags, no disabled promises. Reason: tier 1
  design rule; v1 had `ComingTag`.
- (2026-10-06) Words: industry terms (betweenness, not brokers); friendly words only as search
  aliases; no two reachable controls share an accessible name. Reason: owner 2026-09-26; round 8
  "Data" named both a rail place and a tab and dropped the selection in 12 of 12.
- (2026-10-06) Screen at rest with a graph loaded: at most 50 words of app text; a selected object's
  inspector about 30, 40 max. Reason: principle 5, measurable on the real app.

## Decisions and reasons

- **2026-10-29, tier 4 criteria review (data management):** proposed 8 changes: freeze after the
  R fixes and rewrite answers.md paths on that build (T67's path is still the table, against
  "table view-only" and R9); reword T64 (stronger/farther), T65 (at least) and vary T60 B's
  "web address"; T62 succeeds only on a changed kind, the time role alone is P; T63 needs a half
  whose place the program does not designate, or grade the place as unverified; a coverage table
  from every R decision to the task half that re-tests it (R2's re-test quotes "T65 B words" that
  T65 B does not have; R15 asks "open the longest", T62 asks "most recently"); bar 4/6 audit
  confirms only what it measures, approved surfaces listed, words at rest a counted bar; T65's
  two halves are both people networks, move B to the gauges; cost and first-move measures for
  returning users, T66 detour table lists its own success path, T68 reported per half. Reason:
  each lets a bar pass while the thing studied was not exercised, or checks a build nobody froze.
- **2026-10-23, menu sections (issue #3315, director ruled).** I pressed three points. (1)
  "Other" is a junk drawer (Keep positions, Map, Clusters, Treemap); accepted as the honest name
  for the catalog's `special` family and for plugins, since inventing a heading per row is worse.
  (2) Random under "Shapes" is the catalog's call (`geometric`), not ours; we read the fact and
  do not re-sort it in the app. (3) The engine-in-the-form alternative was not tested; it stays
  open as a separate question, not reason to keep the indent. Watch at the next round: whether
  readers look for Map under "Other".
- **2026-10-20, fifth tier 3 criteria review:** proposed 8 changes: refreeze on the commit
  that holds golden (or strike the golden entry) and re-read answers.md on it; make preflight 9's
  refusals real (half folder, three walks, `--keys`, bar 6 screen coverage, spoken.json) and the
  gate's missing list the pilot queue; build the owed bars.mjs and wording.mjs items or report
  T43, T47, T51 as primed; drop T37 from the judged set and report round 1 per bar; a keyboard
  block on Sam's halves is a blocked task, and backlog rows carry a severity counted in bar 5;
  experts feed bars 5 and 7 only, and the key-and-drawing check runs by script after sessions;
  settle T50 B's summary reading; score asked colors by hue bands. Reason: each is a rule written
  and not run, or a judgment left to one grader's eye, on a one-round study.

- **2026-10-19, fourth tier 3 criteria review:** proposed 7 changes: the round 1 build is not
  ready until a full pass on 1fa51e2b0b meets the exit test (T40 B's discarded letters after
  "Starts with" is on a success path); the gate counts a half only with a success, detours and
  `keyboardOnlyMode: true` walk under `pilot/<half>/` on the frozen build; run preflight 6, 7, 9
  on 1fa51e2b0b and name round 1's wording baseline; T41 B varies "missing" so wording and
  dataset can be split; T50 "draw them" to "color them"; bar 7's "cannot reach" confirmed by a
  `--keys` repro; the change log's freeze entries carry an "owed" list. Reason: each is a rule
  written but not run or not refused on the build under study.
- **2026-10-18, third tier 3 criteria review:** proposed 7 changes: preflight 4 takes the
  skill's exit test and a pass is incomplete while any round 1 half lacks its three walks; run
  wording.mjs on 52cb47a85a and re-justify or reword "drawn" and B's "clusters"; settle the four
  deferred grading questions, with a Route value for T48 B's Filters route; bar 4 states 12 with
  no derivation; expert severity 3-4 confirmed by repro only; T49's look compared by script with
  revision stripped; status of the study told as "not started, dry run pass 5". Reason: each is a
  rule the round cannot follow as written, or a check that has not run on the build under study.
- **2026-10-17, second tier 3 criteria review:** proposed 8 changes: route bar for T47 and T48
  counts folder or several only; kept words re-checked per build; T37 reworded off "connected";
  info-circle text joins the vocabulary and T48 varies its noun; newcomers hold each half (swap
  Alex off T40 B); bar 4 excludes `--keys` sessions and needs the asked color; expert and audit
  findings get a checklist, a dark-mode bar 6 run and a counted measure; one bar numbering.
  Reason throughout: each lets a bar pass while the thing studied failed or was never used.
- **2026-10-17, first tier 3 criteria review:** bar 1 `!judged` hole, bar 4 dropping never,
  T47 around route, T49 red never drawn, COMMON hiding control words, Sam with no file or folder.
  Adopted (change logs of criteria, tasks, answers, roster, 2026-10-17). Not adopted: T50 A's
  rule hidden by names (per-half reporting instead); words-over-budget screens gated.
- **2026-10-14, round 6:** repaint test reads what was painted, not explain(); restore a run layer
  without rerunning; one `otherwise` value, no copy into a binding; "draws nothing" over the whole
  stack; no Alt+drag. Open: whether a reader's edit to a highlight layer survives the next run.
- **2026-10-13:** no split parent; unset and cover separate; Figma divergence only where Figma has
  no stacking. Objected on record: dim-for-painted-over vs dim-for-locked; kind-change memory.
- **2026-10-12, tier 3 decide phase:** reject canEncode/canBind/speaks/kindsOf (duplicate existing
  answers); one find-query selector form over eight text-match inventions; static shape glyphs as
  catalog data; on/off as a two-word select, empty = not set; hide a kind the layer cannot reach;
  "Split into layers" on any categorical layer; no disabled vary buttons.
- **2026-09-26 to 2026-10-11 (summarized 2026-10-17):** personas validate, never generate
  features; no wizards or first-run UI; the app adds no look of its own; task words never reuse a
  fix's words (round 6 money task); route existing commands rather than add lists; element fix
  over app guard (refused suggestion, rulePath export lost my "no new export" on a better reason:
  an export that deletes app-copied logic wins); one FindResult.atLeast field; table scope
  "visible", no notice; gate refusal inside `--start`; briefings stripped of file contents;
  one-source claims scripted first. Rejected: notices, second homes, stacked variants, app palette
  or width before the units test, opt-in bareNumbers flag, Hops grouping.

## Tried: worked / did not work

- 2026-10-29 -- Grepping the app source for each prompt's key words (Fields.tsx "Higher weight
  means" with "farther"; filterWords.ts "is at least") found echoes the task file's own word list
  missed: the avoided list holds interface nouns, not option values or summary words. Worked:
  cheap, one command. Owed: wording.mjs must read the frozen build's strings, not a hand list.
- (2026-10-21) Did not work: a single studio round with frozen grading rules. The cap ended the
  tier with the bars failing on a grading-table artifact (gold vs yellow) and on backlog rows no
  session reached; the round could not distinguish product failure from rule failure. Worked: two
  independent skeptic checks, which caught the wheel artifact, the automation storage notice, and
  task-wording-driven findings (cube, cluster) before they became product changes.
- 2026-10-20 -- Fourth review's proposals: partly adopted in the text (gate by half, three
  walks, spoken.json, irregular forms, T50 "color them", T51 judged). Did not work: none of the
  tool parts was built (gateCheck, bars.mjs, wording.mjs unchanged), and the build was refrozen
  twice more and then overtaken by the golden merge. Checking `git merge-base --is-ancestor` of
  the change log's merge against the first line's build caught the contradiction in one command.

- 2026-10-19 -- Third review's proposals: worked -- all seven adopted in criteria.md (exit test,
  bar 4 fixed 10, repro-only confirmation, the four grading calls, "drawn" dropped). Did not
  work: the exit test was written but the build was renamed "round 1" before a pass met it, and
  the gate that should refuse it keys pilots by the wrong folder level. Taught: after a rule is
  adopted, read the next freeze entry and the gate code, not the rule.
- 2026-10-18 -- Second review's route bar: worked (score.mjs BULK_ROUTES folder, several, T48
  included). Re-read of the change log as a to-do list: worked -- five entries said "for the
  Director to settle between rounds" with no round coming, so the deferrals pile up.
- 2026-10-17 -- First tier 3 criteria review: worked -- every scoring hole I named that had a
  scripted fix was adopted and has a planted case in score.mjs self-test. Did not work: the T47
  route bar was adopted at "not around" rather than "folder or several", so the hole moved.
  Taught: re-read the code after a fix is adopted; the fix can land one notch short.
- 2026-09-06 to 2026-10-11 (summarized 2026-10-17) -- Worked: routing existing commands (T12 0 of
  8 -> 8 of 8); Shift-click (T24 2 of 4 -> 7 of 7); toolbar Filters (7 of 7); "units question
  first" on width. Did not work: v1 help text; copying Figma literally; rules written but not
  enforced (leak check read 0 logs and passed; round 4 started without the gate); a leak fix that
  only supplied the right file. Taught: test end states; a rule needs a refusing gate; check the
  refusal myself.

## Thinking

- (2026-10-17) The bulk tasks are the study's point, and every softening of their bars (around,
  one by one, a cover layer as SD) is reasonable alone and together lets the study pass while
  nobody used the folder. The honest measure is question 3's count; make it the bar.
- (2026-10-17) Keep lines are a snapshot of one build's screen; the fixes this study will make
  are exactly the ones most likely to borrow participants' (and so the prompts') words. The check
  must fail on that drift, not wave it through.
- (2026-10-12) Eight roles wrote element additions in their own words; consolidate to one list,
  one name each, before any build plan.
- (2026-10-11) Hunt one question answered by two tests (round 4's two defects were both that);
  a fix aligning one view must list every other view of the same state.
- (2026-10-06) After a real-app failure prefer rename, move or make visible over a hint, notice
  or second route; add only after a removal failed on two domains. Every local fix: would a
  third-party consumer of the element need this too? Then it is the element's.
- (2026-10-06) Simulated participants share blind spots and are generous on ease; report
  end-state success with and without build defects rather than chase ease.

## Sources

- tier4/{criteria,tasks,answers,roster,decided}.md (2026-10-29, first line `<sha>`), setups under
  `rounds/tier-4/setups/`, `graphty/src/workspace/data-place/Fields.tsx:559`, `filterWords.ts:75`,
  `words.ts:429`, `DataPlace.stories.tsx:153-159` (worktree head 68919794d2) (2026-10-29)
- criteria.md (first line 3ef9e6c1ec, change log 2026-10-20), decided.md (2026-10-20 golden
  entries), backlog.md, tasks.md, roster.md, answers.md (lines 53, 723-760, 987-989);
  `tool/real.mjs` gateCheck 523-571; `tool/bars.mjs` (no spoken, no "Starts with"); `tool/wording.mjs`
  stem; `git merge-base --is-ancestor f9d8b44b9 3ef9e6c1ec` (false); session.json commits under
  `tier3/rounds/` (34 on 3ef9, all in r1d1: T37-T41A); golden commit c2757912e (marks for routes,
  not communities) (2026-10-20)
- criteria.md first line and change log (1fa51e2b0b), `tier3/rounds/r1/pilot/` (session.json
  commits: 33 on 1fa51e2b0b, 94 on 58556989e8; T40B/report.md defects 1-10), `tool/real.mjs`
  gateCheck lines 523-571, `tool/wording.mjs` stem lines 29-34, `git diff 52cb47a85a 1fa51e2b0`
  (docs only), tasks.md T41, T50 (2026-10-19)
- tier3 criteria (first line 52cb47a85a), tasks, answers (T46 613-617, T48 731), roster;
  `tool/score.mjs` lines 38-39, 122; `tool/measure.mjs` (no revision strip); compact-mantine
  `src/i18n/labels.ts:482` ("drawn ${hex}"); `tmp/tier3-dryrun-analysis/summary.txt`,
  `match_p3_p4_summary.md`; commit 4a01f1747 (dry-run exit test, chore/studio-convergence-rules);
  `tier3/rounds/r1d3/pilot/` (T37, T38 only) (2026-10-18)
- `tool/score.mjs` (ROUTE_TASKS, firstStyledOf `own`), `tool/wording.mjs` (ownKept, everywhere),
  `tool/bars.mjs` (--scheme tier 1 only; internal bars 8-10), `graphty/src/components/shell/panel/AnalyzePanel.tsx`
  (SUGGESTED_CARDS), tier3 criteria/tasks/answers/roster after 6ddcb6c7c (2026-10-17)
- `design/ui/studio/tier3/{criteria,tasks,answers,roster,README}.md`, `tool/score.mjs` (bar 1
  `judged`, `firstStyledOf`), `tool/wording.mjs` (COMMON), `tool/bars-limits.json` (2026-10-17)
- `design/ui/studio/tier3/decide/*.md` (eight role answers), the source lines named in the
  2026-10-12 decision entry (2026-10-12)
- `design/ui/studio/tier2/rounds/round-4/decisions.md`, `insights.md` (closed, 2026-10-11)
- `design/ui/studio/tier2/rounds/round-4/insights.md`, `scores.md`, the eight role critiques;
  source files named in the 2026-10-11 decision entry (2026-10-11)
- `design/ui/studio/tier2/rounds/round-3/insights.md`, `decisions.md` (closed, 2026-10-11)
- `design/ui/studio/tier2/rounds/round-3/insights.md`, `scores.md`, the eight role critiques (2026-10-10)

- `design/ui/studio/tier2/rounds/round-2/decisions.md`, `insights.md` (2026-10-10)

- `design/ui/studio/tier2/rounds/round-2/insights.md`, `scores.md`, `preflight.md`, the eight
  role proposals (2026-10-09)
- `design/ui/studio/tier2/rounds/round-1/insights.md`, the eight role proposals (2026-10-09)

- `design/ui/studio/digests/decisions.md`, `framework.md`, `owner-voice.md`, `study-rounds.md`,
  `tier1.md` (studio worktree, 2026-10-06)
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` (sections 1, 9,
  "Adversarial review changes")
- `design/ui/framework/principles.md`, `research/graphty-today.md` (v1 app concepts, insights strip)
- `CLAUDE.md` (Architectural Principles; presentation neutrality; Algorithm Styles)
- `design/ui/studio/tier2/` (criteria, tasks, answers, roster, pilot/final.md),
  `next-steps/tier2-design.md`, `report.md`, `rounds/tier-2/setups/` (2026-10-08)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/wf_6818e34f-76d/`
  agent-ac9e91d557cc3b736.jsonl, agent-aa30730227c88a984.jsonl (Red Team, round 4 triage,
  2026-09-29)
- same folder `wf_6959c5f6-35c/` agent-ae69d664fbc74a440.jsonl, agent-ac0403d0aa41761eb.jsonl,
  agent-a91113b54f3db043f.jsonl (Red Team, round 6 triage, 2026-09-29)
- same folder `wf_93e7ffbb-6da/` agent-a6298d323066f9d83.jsonl, agent-ac66deacd37fef795.jsonl,
  agent-a733e3a4d8bf28eb5.jsonl (Red Team, round 8 triage, 2026-10-03)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl`, owner messages 2026-09-25 to
  2026-10-06 (via `design/ui/studio/tmp/owner-all.jsonl`)
- Extraction scripts: `design/ui/studio/tmp/redteam/scan.py`, `group.py`, `triage.py`
