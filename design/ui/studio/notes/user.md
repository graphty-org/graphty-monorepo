# User Advocate: designer's notes

Role: I speak for two people. The first-time user (Explorer Elena: a product manager with no graph
training who "abandons tools quickly if the learning curve feels steep") and the intermediate weekly
analyst (Analyst Alex: comfortable with data, has used Gephi or NetworkX, not a graph theorist,
comes back weekly with a question already in mind). I test every idea against real tasks and real
confusion. I refuse novice-only crutches (wizards, tours, suggestion cards, verbose help) as firmly
as expert-only complexity.

Read this file at the start of every studio session. Update it whenever I decide something, learn
something, or change my mind. Summarize when it passes about 25 KB (last summarized 2026-11-06).

## Top of mind

- (2026-11-06) Tier 6 round 2 closed: 11 of 12 succeeded, no false "done", Undo restored 2 of 2, and
  after two skeptics no severity 3 is confirmed. The 400% Settings claim stays open at 3 until its repro
  exists; it is the first fix for round 3. Bar 9 is open, not passed.
- (2026-11-06) Round 3 watch 1: the scope warning. The fix is the composer placeholder ("Ask about this
  selection"), not my "Only selected" line: no words added at rest. Watch whether a reader with a
  selection still asks a whole-graph question and believes the narrowed answer.
- (2026-11-06) Round 3 watch 2: a painting run says so on its own line (the run's `painted` fact from
  graphty-element), not a separate Colored row. Watch whether a reader can tell the repaint was the
  turn's and undo it; a reply that denies it is then the model's, and the screen contradicts it.
- (2026-11-06) Round 3 watch 3: one name per measure (`wordsFor` names on the Assistant's lines). The
  model's own prose can still say "Reach"; count only the app's lines against the fix.
- (2026-11-06) A failure with no status names the key as a possible cause and offers the provider, and
  keeps Send again. Test it with ONE bad key (a scripted walk), since T90 hands over a second key.
- (2026-11-06) Bar 7 "fails as worded" because it reads the session's end and one reader closed the tab
  after finishing. Bars do not move to help a fix; read r2-s09 to step 12 when reporting.
- (2026-11-06) Instrument: hover is a deliberate command in the study tool, so never report hover
  counts or "nobody saw the tooltip" as design evidence. The Autosave tooltip fix cannot be credited by
  any session. Drop "RETURNING" from first-meeting prompts; keep CORS lines away from participants.
- (2026-11-06) One change per problem, words at rest do not rise, a mechanism only read is measured
  before it is built on. These held this round; keep proposing one form per problem.
- (2026-11-06) Rulings now settled: a rollback leaves nothing behind (no selection, no lit Redo); the
  reader's own Undo keeps the selection; closing the panel does not end the scope's x.
- (2026-11-05) Every effect gets its line; a screen must not contradict itself ("Nothing changed."
  beside a lit Redo). After Undo, Remove or Answer focus goes to the composer; Settings to its opener.
- (2026-11-05) A promise must be true for every door ("comes back" is false for an opened file with no
  changes). Check the mechanism in source before crediting prose to the model.
- Severity 3 needs a repro and an end state. Grade the user's goal from end state and records, never a
  route or a rating. Same-model participants: a failure is strong, a pass weak; blind graders.
- Task wording and setup values never leak the target or the cause; a new task brings its screens
  into the scripted walk; check the study's request budget and start gate before launching.
- Open from tiers 3 to 5: Graph inspector as first door for node color; a style line at the current
  value reads as "it did nothing"; join preview before the act; empty boxes need a cue; "Or..." words.
- No tours, hint panels or first-run aids; the same screens for everyone. No concept built around one
  task's wording, one fixture or one domain.

## Priorities and values

- 2026-10-06 -- Real tasks over feature coverage. A user comes with a question ("who matters most
  here?"), never with "run an algorithm".
- 2026-10-06 -- Trust over polish. One wrong count teaches them to ignore every count.
- 2026-10-06 -- The chain over the parts: a step that passes alone but leaves the user unsure breaks
  everything after it.
- 2026-10-06 -- The same screens for everyone. "If it appears only for novices, or only for experts,
  reject it" (my test since 2026-09-26).
- 2026-10-06 -- The trade's words, explained, never replaced (owner, 2026-09-26). Friendly words live
  only as search aliases. Confirmed again 2026-11-06: Reach / Closeness made readers translate.
- 2026-10-06 -- Successes reported, not only failures (owner, 2026-10-02).
- 2026-09-26 -- The weekly rhythm matters after tier 1: notes and re-running last week's work.

## Design criteria

- Every committed change is visible on the canvas and the legend at once (2026-10-06).
- A control that looks finished must be finished ("Show labels" trap, 2026-10-06).
- A count names its unit, its whole and its scope, from live state (2026-10-06, 2026-11-03).
- A node is named by its name, never its internal id (2026-10-06).
- The newest result paints on top; if held back, the screen says what and offers one fix (2026-10-06).
- The words clicked match the result they get; one result, one name (2026-10-06, 2026-11-05).
- The legend says in one sentence what a higher value means (2026-10-06).
- An exported picture matches the screen and carries its key (2026-10-06).
- No dead ends; nothing says "not available yet" (2026-10-06).
- Loading reports in one sentence what was read, kept and skipped (2026-10-06).
- Every flow names its first failure (2026-09-27); a failure names only what it knows (2026-11-05).
- Undo instead of asking; no confirmation for an undoable act (2026-09-26).
- A sentence and the record can differ: the app's lines are the record and must be true even when the
  model's prose is not (2026-11-05).

## Decisions and reasons

- **2026-11-06 (tier 6 round 2 closed, decisions read):** I accept the round's fix list and its order:
  Settings at 400% (with repro first), focus to the composer, the reply's end in view (mechanism
  measured before the fix), a no-status failure naming the key, one name per measure, a run that says
  it painted, the scope placeholder, the true Autosave tooltip, a selection-by-ranking line, the
  question at body size, Enter saves the key, Show in table opening narrowed with a removable chip, the
  doubled period. I withdraw "Only selected" on the scope line and my separate Colored row: the
  placeholder and one painted line add no words at rest and each answers its problem once. Reason:
  each is a screen saying something untrue or a result under two names; the round's rule of one form
  per problem lets round 3 credit each. Evidence: `tier6/rounds/round-2/insights.md` findings 1-11;
  `decisions.md` units 1-14 and its rulings.
- **2026-11-05 (my critique after round 2):** same list, with "Only selected" and a Colored row; Open
  getting a handle, a second failure button and Group names not now. Superseded in part above.
- **2026-11-05 (tier 6 round 1 closed with no session run):** selection effect from the element; focus
  to the composer; one name per result by id; Done keeps or warns about a typed key.
- **2026-11-05 (review of tier 6 materials):** returning readers for T91 A, T94 A and B; keys and
  setup values must not leak; follow-up blocks for "how sure"; a bar that every computed number agrees
  with the records; a planted wrong number; audit from a list of states.
- **2026-11-03 (tier 5 round 1):** fix the two count defects (speech base, run binding) first, then
  contradicting errors, Clear+Escape loss, the Fill box, the Or group's words.
- **2026-10-30 (tier 4):** a study-tool line that can contradict the screenshot is fixed before any
  round; severity 3 only with a repro and end state; success is the user's goal, not a route; show
  Join's result before Join; one fact drawn once.
- **2026-10-08 to 2026-10-29 (tiers 2 to 4, summarized):** Accepted the owner's V7; Unset is Clear
  with Undo; focus never falls to the page; rule language is copied, never discovered (0 of 16 typed
  "="); gates enforced by the command every session runs; no door removed on fewer than 8 sessions;
  briefings name files and kinds only.
- **2026-09-26 to 2026-10-07 (owner rules I work under):** stop mocking, study the real app; the
  element returns facts and the app writes words; first-time users first; design for the intermediate
  user, personas validate and never generate; no one-domain special cases; toolbar icons with delayed
  tooltips; a run paints as soon as it finishes; usage data opt-in (my open concern: the recipient
  wording). My scope is Elena plus Alex: they fail in the same places, so one design serves both.

## Tried: worked / did not work

- 2026-11-06 -- WORKED: tracing claims to source settled four disputes in round 2 (no door gives an
  opened file a handle; the 401 really has no CORS header; the wheel goes to the canvas under the hero;
  the doubled period by contrast). Two skeptics again cut inflated severities (sev 3 to 2 twice). DID
  NOT: the instrument. Hover counts measured the tool; "RETURNING" told first-meeting readers they had
  history; a persona rule ("tests that work is kept") made a reader close the tab and fail a bar after
  success; a task's "exactly as she made it" primed the worry. DID NOT: my "Only selected" line, which
  would add words at rest when the placeholder already sits under "Selection 14".
- 2026-11-05 -- WORKED: returning readers gave a round question an answer; the plant fired. DID NOT:
  "Colored row only if readers miss it": a contradicted screen needs no wrong belief. DID NOT: tier 6's
  first launch (gate check only at start, no request budget check).
- 2026-11-03 -- TIER 5. WORKED: repro folders for every sev 3 and reading frozen source to name the
  mechanism; two skeptics on expert findings. DID NOT: launching with no start-gate evidence (round
  void); a "least sure" question as a bar feed; one session carrying a task's bar; a 1-7 overwhelm
  rating from same-model participants.
- 2026-10-17 to 2026-10-30 -- TIERS 3 AND 4. WORKED: Node | Edge layer list as door; Louvain grouping;
  grepping app source for each prompt's words; build stamps per half; matching a pass's rows to the
  commits before it. DID NOT: Graph inspector as first door for node color; style lines at the current
  value; criteria prose asking for tool changes (three times, nothing built); a new task without its
  screens in the walk; a dry run ending on "finds nothing new" (41% of the last list caused by the one
  before); a single capped round (finds problems, cannot credit fixes).
- 2026-09-04 to 2026-10-11 -- TIERS 1 AND 2. WORKED: sample one click from start, match report,
  save and reopen, repaint of drawing and legend together, Shift-click adds, Filters icon, Replace.
  DID NOT: static mocks and skeletons, self-ratings, wording echo, money words for one domain, novice
  text and wizards, unenforced gates, briefing leaks, several variants per problem.

## Thinking

- 2026-11-06 -- The study's own rules can fail a bar the product passed (r2-s09). When a persona rule
  drives an act after success, grade to the success step and say so, rather than bending the bar.
- 2026-11-06 -- The refused key is the general lesson that a browser hides causes from the app. The
  honest screen says "may be" and offers both ways forward; it never guesses one.
- 2026-11-06 -- Untested, worth a scripted walk: does the conversation come back after reopening with
  a key? Does Show in table's narrowed view read as the whole table to a reader who misses the chip?
- 2026-11-05 -- An instruction to doubt tests the instruction: ask confidence after the work.
- 2026-11-05 -- Undo on the newest step only is never stressed by a one-change task.
- 2026-10-11 -- A returning user types what they remember; the find box must answer literal input.
- Still open: the "attribute" word; Size's home; usage-data wording; a keyboard-only and a
  screen-reader participant on the chained walk; real people eventually.

## Sources

- Tier 6: `tier6/rounds/round-1/` and `round-2/` `insights.md`, `decisions.md`, `scores.md`, `repro/`;
  `tier6/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md`, `decided.md`;
  `graphty/src/workspace/assistant/`, `autosave/words.ts`, `start/open.ts`.
- Tiers 3 to 5: each tier's criteria, tasks, answers, roster, decided, backlog and round insights;
  `tool/bars.mjs`, `real.mjs`, `wording.mjs`, `steps.mjs`.
- Tiers 1 and 2: `tier2/rounds/`; `digests/`; `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl`
  (2026-09-26, the role defined).
- `CLAUDE.md` (Architectural Principles).
