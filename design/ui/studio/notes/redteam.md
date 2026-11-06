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

- (2026-11-05, tier 6 round 1) No reader has met the Assistant. 24 of 24 sessions were refused at
  `--start`; every finding is four expert walks plus source reading. It says what is on screen,
  never what a reader paid. Bars 1 to 7 and 11 have nothing to count: never quote them as pass or
  fail.
- (2026-11-05) A gate that refuses at the door still let the money go. `plan.md` said the gate
  fails, the run launched, 12 re-runs repeated one cause. Check `--gate` before launch and stop on
  the first refusal; a shared-cause void must not spend re-runs.
- (2026-11-05) Raising the cap alone buys nothing: it is 1 of 7 preconditions. Also needed: 26
  walks on the session build, the key matched to it, T92 A's plant confirmed, `leaksIn` fixed,
  "RETURNING" out of the prompts, the gate check at launch. Attack any restart missing one.
- (2026-11-05) "A RETURNING user" was in the first prompt of 24 of 24 sessions; 9 of 12 are first
  meetings. I screened tasks and briefings, never the prompt the tool renders. Screen that text.
- (2026-11-05) "Far above what 12 sessions need" was never measured: dry runs spent 2,892 of 3,000
  and the walks the last 108. Any budget claim needs a per-phase ledger; "never re-set a limit from
  data" covers bars, not spend. The cap also has a side door: 4 real requests went past it through
  a private count file. Close it before raising it.
- (2026-11-05) My plant idea held on a walk with no plant: the model's own selection survived an
  Undo and narrowed "Color by role" to 5 nodes; later a removal took 1 of 16. Replies were honest
  and the scope line read Selection. Whether a reader catches it is still untested; keep the bar
  counting only sessions with something to doubt.
- (2026-11-05) A code reading is not a 3. The 400% claim is CSS arithmetic, never measured; no
  skeptic re-ran anything. It counts only once `repro/` holds it, which needs no Gemini request.
  Talk fell to 2 by the test that held Done at 2: the belief corrects itself.
- (2026-11-05) Bars failed on their own wording again: bar 8's Settings row (returning to the
  opener is right), bar 11 ("every session", 0 ran), bar 10 (a list not reached). Audit the rule
  before counting: tiers 1, 3 and 4 did the same.
- (2026-11-05) Smallest fixes to hold to: one additive selection effect; one focus rule for Remove,
  Answer, Undo (not five cases); the app replaces the name by id; `fullWidth` on starters. Refuse
  a Colored row on painting runs unless a session shows the "Computed" line misleads.
- (2026-11-05) Text size, the chip in a change line and scope drift as harm are questions for T90
  and T92, not findings. Build nothing from them on two walks and a 2 px gap.
- (2026-11-05) A question to the owner must carry live numbers: the open entry says 145 left, 0 are.
- (2026-11-05, criteria) A prompt that asks for the check cannot measure it; a first-time reader
  cannot miss a layer list they never met, so T91 keeps the by-hand tweak.
- Standing: rounds are one model playing everyone -- a failure is strong, a pass weak; success
  saturates, so score cost and routes; avoidance is not comprehension; discount "unprompted".
- Standing: a rule needs a refusing gate at the point of spend; after adoption read the code, not
  the rule. Every build defect needs a repro made the way a person would; tool artifacts recur.
- Standing: fix by removing, not adding; one change per problem; one source of truth per fact;
  rejected stays rejected without new evidence; task words are never product requirements.

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

- **2026-11-05, tier 6 round 1 closed, no session ran.** Positions: restart only on all seven
  preconditions in `scores.md`, from clean folders with no re-run spent (the Director's call);
  close the private count file before any cap rise; on the open rulings, a rollback that changed
  nothing should not leave a lit Redo, and a painting run keeps one line. Reason: raising the cap
  alone reruns a primed study on a build with no walks.
- **2026-11-05, tier 6 criteria review (the Assistant):** proposed 8 changes: T92 and T95 stop
  ordering the doubt (questions to a follow-up, Dev on T92 A, Ruth on T91 A, bar 5 counts only
  sessions with something to doubt); a colleague's selection as the planted wrong number; T91 adds
  a by-hand tweak and T91, T94 use the returning persona files; T93 stops asking the count and bar 6
  turns on `Card: read`; T90's key loses "expired", the prompt loses "stopped working", the
  follow-up asks what they would keep back and what they would do with no key; T94 B makes two
  changes; experts walk a state list and the Figma and visual walks get a bar; "done" gets a
  re-walk test and the known defects a fix-or-keep call before the freeze. Reason: most bars could
  pass with the thing studied never exercised. Domains passed: every task has two, though T90 and
  T94 are both people networks; no change asked, since the wordings at stake meet yeast in T91, T93.
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
- **2026-10-17 to 2026-10-20, five tier 3 criteria passes (summarized 2026-11-05):** route bar
  counts folder or several only; refreeze on the commit that holds golden; the gate counts a half
  only with its walks on the frozen build; expert severity 3-4 confirmed by repro only; bar 4 fixed
  with no derivation from data; colors scored by hue bands; T37 reworded and dropped from judging;
  T50 "color them". Not adopted: T50 A's rule hidden by names; over-budget screens gated. Reason:
  each was a rule written and not run, or a bar passing with the thing studied unused.
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

- 2026-11-05 -- Did not work: my prompt screen read tasks and briefings, so it missed "RETURNING"
  in every rendered prompt. Worked: the planted-selection idea (a walk reached it unplanted); the
  skeptics settling a fact at its source (the route log named who made the selection). Did not
  work: the gate as a stop, since nothing checked it before launch.
- 2026-11-05 -- Worked: a plain grep of the avoided words over the prompts and the briefing text
  in place of wording.mjs, which needs a vocabulary.json no tier 6 walk writes. One prompt hit
  ("stopped", T90) and five each of message, send, stop, step in the roster's briefing lines.
  Worked: recounting the key from the files (9, 7, 9, 7, T92 A's seven names all agree).
  Carried from Top of mind: a backlog row should not gate a round without a repro or a reach.
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
- 2026-10-17 to 2026-10-20 (summarized 2026-11-05) -- Worked: scripted fixes with planted cases in
  score.mjs; reading the change log as a to-do list; `git merge-base --is-ancestor` to catch a
  freeze contradiction. Did not work: rules adopted in text with the tool parts unbuilt; a fix
  landing one notch short (T47 "not around"). Taught: re-read the code after adoption.
- 2026-09-06 to 2026-10-11 (summarized 2026-10-17) -- Worked: routing existing commands (T12 0 of
  8 -> 8 of 8); Shift-click (T24 2 of 4 -> 7 of 7); toolbar Filters (7 of 7); "units question
  first" on width. Did not work: v1 help text; copying Figma literally; rules written but not
  enforced (leak check read 0 logs and passed; round 4 started without the gate); a leak fix that
  only supplied the right file. Taught: test end states; a rule needs a refusing gate; check the
  refusal myself.

## Thinking

- (carried 2026-11-05 from Top of mind) Open watches: does a "48.85, 2.35" column find
  "Coordinates"; do readers look for Map under "Other"; choices that arrive after the act with a
  default applied (Join's unknown end, a filter card on Hide; the planned "Select | Filter to |
  Filter out" keeps it). Owed: build-equivalence, half-folder gate, bars.mjs spoken/typing checks,
  wording.mjs stem and frozen-build strings, score.mjs bar 4 start point. Tier 4 open: join preview
  tags wrong rows (sev 2), `tooltip: null` over popovers, source-row clip, axe panel name.
  Accepted, not re-raised: T50 A guessable from "Mlle"; bar 8 screens over budget as severity 2;
  T47's "around" counts against bulk. Tier 3: newcomers look for node color in Graph first; a new
  style line must start at a visibly different value.
- (2026-11-05) Expert walks kept their worth with no sessions: mechanisms and owners were found,
  and the skeptics corrected the owner of the 400% defect and the source of the selection. But a
  walk of a capped build shows failure states inflated: the pile-up in accessibility 5 came from
  every message failing.
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

- tier6/rounds/round-1/{insights,scores,plan}.md, `owner-decisions.md` top entry (2026-11-05)
- tier6 criteria, tasks, answers, roster, decided, design, connected-*.txt;
  `design/ai/assistant-chat-research.md`; `tool/real.mjs` lines 293-300, 976 (follow-up for any
  task), `--reopen`, `--shift-click`, node click by label; `tool/tier6.mjs`; tool README "Tier 6
  sessions" (REAL_GEMINI_COUNT); `ToolExecutor.ts` largePreview; `graphty/src/workspace/assistant/words.ts`
  line 155; `tool/files/*.graphml`; notes/researcher.md (2026-11-05) (2026-11-05)
- tier 2 to 4 criteria, tasks, answers, roster, decided, round insights and scores; `tool/real.mjs`
  gateCheck, `tool/score.mjs`, `tool/wording.mjs`, `tool/bars.mjs` (summarized 2026-11-05)

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
