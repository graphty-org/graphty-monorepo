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

- (2026-11-06) Chat switcher: my smaller proposal was decided almost whole (`tier6/decided.md`). What
  carried: the element already saves a chat only with its first message, the snapshot lacks `firstWords`,
  double-click cannot reach rename. Watch: the open-chat row after "+" needs its own test.
- (2026-11-06, round 2 closed) 11 of 12 finished, no false "done", Undo 2 of 2, every count held,
  0 confirmed severity 3. What is left has one shape: the screen says less than the graph did, or
  says it where the reader is not looking. Round 3 must show each of the 15 units credited alone.
- (2026-11-06) One change per problem held as the round's rule: scope gets only the placeholder,
  painting joins the existing "Computed" line (no Colored row), Autosave changes only its tooltip.
  Watch in round 3 that no unit sneaks a second form back in (scope words, a row under You).
- (2026-11-06) The 400% Settings failure is the only severity 3 candidate and counts only once
  `repro/settings-400/` holds the walks. Check that first; bar 9 stays open until it does.
- (2026-11-06) `run-says-it-painted` rests on `painting(id)` being settled after `awaitRun`; the
  painting is fire and forget. If it can read `pending`, the line lies. Demand the element test.
- (2026-11-06) `reply-end-in-view` is a measured fix: `position: relative` alone first, then a
  ResizeObserver only if that falls short. Refuse a build that skipped the measurement.
- (2026-11-06) Autosave tooltip is honest now but answers no session (nobody hovered); the label
  half stays open at 2. Do not let round 3 call finding 1 closed.
- (2026-11-06) Finding 6 (one name per measure) closes only on app lines; the model still gets
  `plainName` and may say "Reach". Grade replies separately.
- (2026-11-06) Show in table narrowing runs last and costs most; on a 24-node file it saves one
  scroll. Hold it to its acceptance (other six stay listed after a row click) or drop it.
- (2026-11-06) Instrument before sessions: "RETURNING" out of first-meeting prompts, CORS lines out
  of what participants read, `leaksIn` checked. Screen the prompt the tool renders, not the tasks.
- (2026-11-06) Hover counts measure the tool (hover is a deliberate command), so "nobody hovered"
  is never evidence for or against a tooltip. Report hover findings as untested.
- (2026-11-06) Bars fail on their own wording (bar 7 reads the session's end; r2-s09 closed the
  tab by persona rule). Audit the rule before counting; bars stay frozen.
- (2026-11-06) Budget: about 1,331 requests left, 480 reserved for 12 sessions. Re-run T92 A and
  T90 after units 3 and 7 so bar 5 can be attributed; check `--gate` refuses before spend.
- (2026-11-06) Still owed, not units: the 193-screen audit for bars 10 and 11, and whether the
  conversation returns with a key after reopen.
- Standing: one model plays everyone -- a failure is strong, a pass weak; avoidance is not
  comprehension; a code reading is not a 3; fix by removing, one source of truth per fact;
  rejected stays rejected without new evidence; task words are never product requirements.
- Standing: a rule needs a refusing gate at the point of spend; every build defect needs a repro
  made the way a person would; tool artifacts recur.

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

- **2026-11-06, chat switcher.** I let "a bare number at rest has no unit" keep the count off the closed
  header; the owner and every QA walk then missed that chats are plural. Lesson: when I object to a
  form, propose the unit, not the removal. Now "Chats {N}" shows at rest.
- **2026-11-06, tier 6 round 2 closed.** The director took one path per problem and refused the
  rest once (decisions.md "Refused"): scope placeholder only, keyed on `scope.kind`; painted fact on
  the existing line via `session.runs.painting(id)`, also in `summarizeRun`; Autosave tooltip only;
  failure words "failed or the key was refused" keyed on `requiresKey`, Send again kept; `wordsFor`
  with no `plainName` fallback. Rulings: rollback leaves no selection or Redo; closing the panel
  does not end the scope x. Reason: my challenge that stacked forms blur credit; it held.
- **2026-11-05, tier 6 round 2 critique.** Reversed my "refuse a Colored line unless a session shows
  it misleads": r2-s02/29 and r2-s10/05 are that evidence, but the answer is one fact on the run's
  line, not a row. Rejected: "Only selection", a You-turn scope row, "Autosave: no changes", the
  open-file handle in this pass, scrollToRow, selected-first sort, the failure glyph, the Esc rider
  on the focus fix, the reply gap. Kept: second button on the status-less failure (a named cause
  with no door is a notice). Closed a false lead: "Bridges (visible)" is `work.json`'s record; the
  screen column reads "Betweenness (visible)" (r2-s05 transcript line 72). Reason: each rejection
  adds a state or a row on evidence from one session, or misses the mechanism in source.
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
- **2026-10-17 to 2026-10-20, five tier 3 criteria passes (summarized 2026-11-05):** route bar
  counts folder or several only; refreeze on the commit that holds golden; the gate counts a half
  only with its walks on the frozen build; expert severity 3-4 confirmed by repro only; bar 4 fixed
  with no derivation from data; colors scored by hue bands; T37 reworded and dropped from judging;
  T50 "color them". Not adopted: T50 A's rule hidden by names; over-budget screens gated. Reason:
  each was a rule written and not run, or a bar passing with the thing studied unused.
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

- (2026-11-06) Worked: arguing one change per problem; the director adopted it as the round rule
  and refused every rider (scope words, You row, Colored row, "Autosave: no changes").
- (2026-11-06) Did not work: screening task text for priming; the rendered prompt said "RETURNING"
  to nine first-meeting readers. Screen the tool's rendered prompt.
- (2026-11-06) Worked (skeptics): settling facts at source corrected scores.md twice (no door opens
  a file with a handle; Show in table used in 6, not 9).
- 2026-11-05 -- Worked: checking each proposal's named site against source. It found the wrong path
  (`apply_suggestion` at style.ts:822 is not how `run_algorithm` paints), a false claim (DataTable
  does have `scrollToRow`), a void risk (`assistant/words.ts` already reaches `analyze/words` through
  `style/words`), and an existing public fact (`runs.painting`) nobody cited. Not tried: whether
  `painting()` is filled when `settleRun` reads it; nothing here was run.
- 2026-11-05 -- Did not work: my prompt screen read tasks and briefings, so it missed "RETURNING"
  in every rendered prompt. Worked: the planted-selection idea (a walk reached it unplanted); the
  skeptics settling a fact at its source (the route log named who made the selection). Did not
  work: the gate as a stop, since nothing checked it before launch.
- 2026-11-05 -- Worked: a plain grep of the avoided words over the prompts and the briefing text
  in place of wording.mjs, which needs a vocabulary.json no tier 6 walk writes. One prompt hit
  ("stopped", T90) and five each of message, send, stop, step in the roster's briefing lines.
  Worked: recounting the key from the files (9, 7, 9, 7, T92 A's seven names all agree).
  Carried from Top of mind: a backlog row should not gate a round without a repro or a reach.
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

- (2026-11-03) Tier 5 round 1 closed at the 1-round cap with every session void (start gate never
  ran). Did not work: launching without gate evidence. Worked: two independent skeptic checks cut
  the expert findings to one severity 3 and several 2s, and dropped decided behavior reported as
  defects. Lesson: the cheapest red-team move is to check the launch gate, not the screens.

## Thinking

- (carried 2026-11-06 from Top of mind) Tier 5: grade the key before the build; a picker entry
  names what it binds; speak only from the surface showing; empty controls show unit and direction,
  walk every control empty then reopened; "least sure?" counts only repeats; vary fixture colors;
  unmeasured is not held; ask decided.md which of two colliding rules wins; bespoke twins break Tab,
  Escape and speech; fixes with no re-run task report "not re-tested".
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

- tier6/rounds/round-2/{insights,scores}.md, r2-s05 transcript and grade; `assistant/Conversation.tsx`,
  `Checks.tsx`, `words.ts`, `table/TableDock.tsx`, `analyze/words.ts`, `autosave/words.ts`;
  element `ai/tools/effects.ts`, `families/algorithms.ts`, `families/style.ts`, `session/runs/types.ts` (2026-11-05)
- tier6/rounds/round-1/{insights,scores,plan}.md, `owner-decisions.md` top entry (2026-11-05)
- tier6 criteria, tasks, answers, roster, decided, design, connected-*.txt;
  `design/ai/assistant-chat-research.md`; `tool/real.mjs` lines 293-300, 976 (follow-up for any
  task), `--reopen`, `--shift-click`, node click by label; `tool/tier6.mjs`; tool README "Tier 6
  sessions" (REAL_GEMINI_COUNT); `ToolExecutor.ts` largePreview; `graphty/src/workspace/assistant/words.ts`
  line 155; `tool/files/*.graphml`; notes/researcher.md (2026-11-05) (2026-11-05)
- tier6/rounds/round-2/{insights,decisions}.md (2026-11-06)
- Older (tiers 1-5, 2026-09-29 to 2026-11-03): each tier's criteria, tasks, answers, roster,
  decided and round insights/scores/decisions; `tool/{real,score,wording,bars}.mjs`; framework
  principles; CLAUDE.md Architectural Principles; Red Team triage transcripts under
  `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/`; scripts in
  `design/ui/studio/tmp/redteam/`. Use git log on this file for the full list.

## Tier 5 round 1 lessons (2026-11-03, summarized 2026-11-06)

- The two-skeptic rule (both drop = drop, one = weaken) settles a round; it worked again in tier 6.
- A key may require only what the task words require (T73 graded correct answers P).
- Real cost lives in empty states and first states of added parts; give each its unit and a
  working first click before adding any aid.
