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

- (2026-11-03) Tier 5 closed at the one-round cap, bars 1, 3, 4, 8, 9 failing. The editor is
  doubted, not failed: Or-group sessions all succeeded at overwhelm 2-3. Attack cost and doubt.
- (2026-11-03) Grade the key before the build: T73 0 of 4 measured an answer key that wanted a
  rule the task never asked for. A task must ask for what only the feature gives, in plain words.
- (2026-11-03) A picker entry must name what it binds: "Connected components" from a visible-only
  run bound a whole-graph run (severity 3). One run, one scope fact from the element, app words it.
- (2026-11-03) Speak only from the surface showing: a covered panel's count written to the same
  status region was the other severity 3.
- (2026-11-03) An empty control must still show its unit and direction, and its error may only
  claim what is applied (By position: "highest 10" from a default nobody set).
- (2026-11-03) Empty-state defects cluster: empty color box, "Is exactly" on empty text, Clear
  then Escape deleting a saved card. Walk every control empty, then reopened.
- (2026-11-03) "Least sure?" makes everyone name something; count only what repeats across halves.
- (2026-11-03) Fixtures pre-colored in the task's color and leading follow-ups ("would you rather")
  inflate findings. Vary the asked color; ask neutral questions.
- (2026-11-03) Unmeasured is not held: bars 6 and 7 had no walks, calm-first did not run, so bar
  9's count is a floor. A bar with no feed is reported "not measured".
- (2026-11-03) Two decided rules can collide; ask decided.md which wins before calling a defect.
- (2026-11-03) Every bespoke twin of a shared control breaks Tab, Escape and speech at once.
- (2026-11-03) Only hand word counts decide the words budget; tool FAIL lines quoted by
  participants trip the leak check.
- (2026-10-30) Audit keys before counting; one source of truth per fact; defaults applied after
  the act get attacked in every design.
- (2026-10-29) Fixes with no task that re-runs them report "not re-tested", never "passed".
- (2026-10-21) Avoidance is not comprehension; no synonyms, task words or domain special cases.

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

- **2026-11-02, second tier 5 criteria review (after the rating and calm-first checks):**
  proposed 7 changes: do not start round 1 on d3fda9f2b6 (calm-first-frozen fails bar 9's limits;
  the 50k matches strip fails "Large graphs"; item 8 lists the old build's candidates; line 18
  says "first build" of the sixth) -- audit and two skeptics on the calm-first screenshots now,
  gate on both files; define "two counts of one result" by quantity per spec section 2/3.0
  (finding 1 is ruled a different fact at spec 144-148 with two cards on; finding 2 is a spec gap:
  extend "so far only where it differs" to a one-step group); re-run the calm-first calibration
  blind and per complaint; words at rest counted by bars.mjs for tier 5; a pass rule for the two
  "+"; named reasons at any rating (the frozen sessions' Fill color box); calm-first on the 50k
  and reference screens, with the rejected build's "While has nodes" as the positive control.
  Reason: the first review's changes were adopted as text, but the checks they produced already
  fail the frozen build, and two of them (count duplication, calibration) cannot tell a real
  defect from a decided rule or from the build the owner rejected.
- **2026-11-02, tier 5 criteria review (selection workspace):** proposed 8 changes: freeze
  only a build with no blocked half (T75 A) and no build note that already fails a bar (false
  "covered" warning, table plus matches strip), with one path-step number per core half; calibrate
  bar 9's rating on the owner-rejected cards and gate on it only if it separates them; make the
  calm-first check countable (needed-controls list per screen, words-at-rest budget, two counts of
  one result) since the audit cannot confirm "the eye lands"; a scripted 50k walk of every list
  (reference picker, Selected (N), matches strip, outline summaries); neutral follow-ups with the
  rating asked first, in every task; a coverage table from each of the owner's six complaints to
  the check that re-tests it; wrong turns before success only and a written hover/tool rule; the
  accessibility walk's keyboard blocks count in bar 5 with a `--keys` repro, and "Either" checked
  against T73 B / T78 B. Reason: each lets bar 9 or bar 1 pass or fail on the instrument, not on
  what the owner complained about.
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
- **2026-10-17 to 2026-10-20, five tier 3 criteria reviews (summarized 2026-11-02):** each
  proposed 7-8 changes of one kind: a rule written but not run or not refused on the build under
  study (exit test, gate by half, three walks, `--keys`, spoken.json, wording.mjs on the frozen
  strings, refreeze on the commit that holds the merge), a bar a grader's eye decides (asked color
  by hue bands, expert severity 3-4 only by repro), and task words that echo a screen (T37
  "connected", "drawn", T50 "color them"). Most text adopted; the tool parts mostly not built.

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

- (2026-11-02) Reading bars.json's largeLists for ok:false and spec.md for the strip's search:
  worked -- one command found a sev 3 candidate on every 50k screen that no review had named.
  Checking calm-first findings against the spec's count rules: worked -- finding 1 contradicts a
  ruled count (spec 144-148). First review's 8 changes: adopted as text (rating check, calm-first
  counts, 50k walk, coverage table, wrong-turn rule, --keys); did not work: the round plan still
  targets a build those new checks fail.
- (2026-11-02) Grepping the app's option labels (not just nouns) for prompt words: worked --
  found "Either" (Edge ends) and "Either direction" (Connected) against "either direction" in two
  prompts. Reading the placement study's ratings beside the owner's verdict: worked -- showed the
  rating scale has no spread, so a bar on it is untested.
- (2026-10-30) Tier 4 round 1: the two-skeptic settle worked again -- it caught a study-tool defect (tooltip:null on popovers), a grading-key false done and inflated wrong turns. Did not work: screening tasks for leading before the round (prompts still echoed success words) and a frozen build that had not built the decided source-row fix.

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

- (2026-11-03) Tier 5 round 1 closed at the 1-round cap with every session void (start gate never
  ran). Did not work: launching without gate evidence. Worked: two independent skeptic checks cut
  the expert findings to one severity 3 and several 2s, and dropped decided behavior reported as
  defects. Lesson: the cheapest red-team move is to check the launch gate, not the screens.

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

- tier5/criteria.md (first line d3fda9f2b6, change log to the rating check), tier5/rounds/round-1/
  {plan,rating-check,calm-first-rejected,calm-first-frozen}.md, bars/bars.json (largeLists,
  wordsAtRest), bars/vocabulary.json, selection-groups/spec.md lines 52-55, 141-149, 446;
  tool/bars.mjs:1421 (2026-11-02, second review)
- tier5/{criteria,tasks,answers,roster,decided,placement-study,owner-feedback-2026-11-01}.md
  (2026-11-02, first line still `<sha>`), selection-groups/spec.md, main checkout
  `tmp/selection-redesign/study/{panel,results}.md`; `graphty/src/workspace/selection/StepPane.tsx`
  (Edge ends Both/Either), `selection/words.ts:156-171`, `analyze/words.ts:360` (2026-11-02)
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

## Tier 5 round 1 lessons (2026-11-03)

- Decision: insights.md's two-skeptic rule (both drop = drop, one = weaken) stands as the way to
  settle a round; it cut "no orange swatch" (task color, Figma-locked swatches) and kept the two
  severity 3s. Worked.
- Tried: grading T73 by rule-vs-picked-ids. Did not work: the key graded P on correct answers.
  Next time a key may require only what the task words require.
- Tried: "least sure" and "would you rather" follow-ups. Partly worked: they surface doubt but
  invite wishes; only cross-half repeats count.
- Thinking: the round's real cost lives in empty states (color row is T70's largest overage) and
  in first states of added parts (Or group at "B 0" with a full range bar). Smaller fix than any
  new aid: give each empty control its unit, direction and a working first click.
- Thinking: the single-round cap ended the studio with fixes known but unre-walked; the next
  tier should start by re-walking insights 1, 2, 4-7 by their repros on a new frozen build.
