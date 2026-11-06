# Interaction Designer's notes

I own flows, states, feedback and recovery in the graphty app: what happens on every click, what
the reader sees while something runs, how errors and undo work, and the keyboard paths. These
notes are my memory across studio sessions. Read "Top of mind" first; update it whenever a
decision or a finding changes it.

Terms used below: the **graphty app** is the React shell (chrome only); **graphty-element** is
the web component that owns every graph capability. The **real app** is the tier 1 workspace
served at `/?next` from a local production build. The **skeleton** (or **mock**) is the clickable
prototype `prototype/app-b/` that rounds 7 and 8 were run on. **Tier 1** is a first-time user's
core path from an empty app: pick a sample or bring a file, read what loaded, run one analysis,
color or size by it, put names on, find a node and its neighbors, save a picture and the numbers,
save and reopen.

## Top of mind

1. (2026-11-06) **Chat switcher decided** (`tier6/decided.md`): header names the open chat; whole-row
   button opens it; "..." menu Rename F2 / Delete. My double-click and header-F2 rename, filter field and
   roving focus were cut: a click opens the chat or toggles the list before a double-click lands.
1. (2026-11-06) **Tier 6 round 2 closed: 11 of 12 succeeded, 0 false "done", 0 confirmed severity 3,
   Undo restored all in 2 of 2.** What is left has one shape: the screen says less than the graph did,
   or says it where the reader is not looking. Round 3 runs on build a80da6d62e with 15 units, one fix
   per problem so each can be credited.
1. (2026-11-06) **Focus after a press that removes its own button goes to the composer** (unit
   `focus-after-a-press`, fails bar 8). All approval buttons, Answer, a turn's Undo, the scope x, Use
   selection, Send again. Settings still returns to its opener. Round 3 check: a typed letter after each
   lands in the composer; a second Enter changes nothing.
1. (2026-11-06) **The reply's foot: measure before building.** Step (a) is `position: relative` on
   `.ws-assistant-log` (the hidden chip span escapes and adds the outer scrollbar). Step (b), a
   ResizeObserver calling `toFoot` while following, only if (a) falls short. Watch: one scrollbar, chips
   and Undo in view, and the three deferred routes (T93 B, T95 A, T90 B).
1. (2026-11-06) **The placeholder follows `scope.kind`** ("Ask about this selection"); scope on the You
   turn and "only" wording are refused until T92 A's plant is retested on this alone. If the plant still
   lands, the You-turn scope is the next step.
1. (2026-11-06) **A painting run says so on its existing line**, "Computed X for N nodes, colored by it",
   from `painted` on `AI_EFFECT_RUN`; no separate Colored row (rows at rest do not rise). Default stays
   painting. Watch: `painting()` must not read `pending` in `settleRun`; any leftover "Changed the graph"
   gets its tool named.
1. (2026-11-06) **A failure with two causes says both:** "the connection failed or the key was refused",
   Send again plus AI provider..., keyed on `requiresKey`. A browser truly hides a 401 with no CORS header.
1. (2026-11-06) **Rulings, now settled:** a rollback leaves no selection and no lit Redo (it is not a
   reader's Undo); closing the panel does not end the scope x (design 5.2). Both are in `decided.md`.
1. (2026-11-06) **Esc and scope still owed:** Esc closing Settings or on a focused chip clears the
   selection with no undo. Not a round 3 unit; re-walk it, since selection is a hidden argument.
1. (2026-11-06) **A claim must be true of the whole state.** Autosave's tooltip promises a return that
   never happens for an opened file (no way of opening a file gets a handle). Round 3 fixes the string
   only; Recent projects for opened files is backlog.
1. (2026-11-06) **Small but mine:** Enter in the key box runs Save; the Undo notice loses its doubled
   period and stays off an open panel; a waiting question reads at body size; Show in table opens on
   the rows it names.
1. (2026-11-06) **Study instrument limits:** hover in the tool is a deliberate command, so hover counts
   measure the tool; first-meeting prompts no longer say "returning"; bar 7 fails as worded (a closed
   tab), not on Undo. Owed: 400% Settings repro, the 193-screen audit, the key-after-reopen test.
1. (2026-11-05) **Every effect gets its line; every ending leaves one.** No Declined line after Keep
   them; Done must not drop a typed key.
1. (2026-10-30) **Show what an act will do, and decide before it.** One fact, one drawing; a count is
   a link that selects what it counts. Keyboard debts: header "..." not a Tab stop, the workspace
   header has no F6 stop.
1. (2026-10-21) Owed traces from tier 3: the 130 px drawing move on first color, the off-center reopen,
   a real-notch wheel repro. Name the mechanism before any fix.
1. Standing: a failure is strong evidence, a pass weak; trust repros and code over tool text; graph
   facts in graphty-element, flows/focus/words in the app, shared defects in compact-mantine.

## Priorities and values

- 2026-10-06 **Safe exploration over protection.** The owner's founding brief: design for the
  intermediate user, make exploring safe through undo, not through wizards, warnings or confirm
  dialogs. A first-time user is served by aids everyone gets (undo, working defaults, tooltips
  with the key, (i) on technical terms, samples), never a first-run mode.
- 2026-10-06 **Feedback at the smallest scope that shows it.** The change itself first (the
  drawing and legend), then the object's row state, then one notice only when the effect is out of
  sight. A first-time user believes the screen; if the panel says one thing and the drawing
  another, they stop trusting both (round 8: "the panel said one thing and the drawing showed
  another" was the most common reason not to switch tools).
- 2026-10-06 **Every claim on screen is computed from live state.** Fixed counts ("64 hidden",
  "32 rows") were round 8's top trust-killer. A message that cannot be computed is removed.
- 2026-10-06 **One pattern per job, one home per feature.** The owner asked (2026-09-30, third
  review) to make interaction patterns the same everywhere. A command is registered once and
  every door to it (key, menu, Quick actions, selection bar) uses the same words; two controls
  that set the same state are a defect.
- 2026-10-06 **Keyboard and screen reader are first-class.** WCAG 2.2 AA in the default state;
  the table and inspector are the canvas's text equivalent; every task has a keyboard path.
- 2026-10-06 **Restraint.** The owner repeatedly rejected text-heavy, cluttered screens. My
  feedback must be short and in place, not banners and explanations.

## Design criteria

Each with its reason. A screen that breaks one is a defect.

1. **Visible on commit.** Every committed step changes the canvas and legend the moment it
   commits, or a line in place says why not. Reason: rounds 7-8, feedback gaps decided tasks.
2. **No preselection where the reader must choose; nothing starts unasked.** Opening a file shows
   the file; samples open with nothing run. Reason: framework principle 0; round 8 the pre-run
   PageRank on the sample blurred the reader's own results.
3. **One undoable step per act, labeled.** No confirm for undoable acts; confirm only for
   irreversible loss, as "[Verb] [thing]?" with one sentence on what is lost. Reason: owner,
   Figma convention; round 1 showed silent undo loses people (5 of 5 lost a good step).
4. **Esc ladder.** One thing per press, innermost first; an Esc that closes an overlay does
   nothing else. Reason: round 6, one Esc both closed a list and reset the page (4 sessions hit).
5. **Focus is never lost and never moves selection or paint.** Overlays focus their first field
   and return focus to the opener; focus never falls to the body. Reason: round 6-7 findings;
   owner 2026-09-13 ("can't type in text boxes or text entry not selected by default").
6. **Running work shows state on its own row;** over about 10 s it is cancellable and names its
   cost before it starts (estimate from graphty-element). Reason: framework cost classes; the
   stalled Betweenness run.
7. **A problem is one block:** what happened and what to do, at most one action, at the smallest
   scope (the field, the row, the page). No modal errors. Reason: the broken-file refusal with
   line numbers was one of the most trusted screens (8 of 8 would forward it).
8. **Disabled is explained.** Grayed, still focusable, reason in the tooltip or on a menu item's
   second line; nothing needed to finish a task lives only in a tooltip. Reason: icons-only
   toolbar; screen-reader users.
9. **No dead controls, no unbuilt promises.** An unbuilt item is not drawn; a drawn one acts.
   Reason: round 8 "not available yet" dead ends ended 12 of 12 label sessions on the mock.
10. **Every count names its unit and its whole, and is a link that selects what it counts.**
    Reason: round 7 rule; "17 neighbors" with no names failed 12 of 12.
11. **Notices:** one slot, one message, at most one action, never the only route back. Reason:
    the undo notice tests (round 6: notice alone lost the selection 5 of 8; with Ctrl+Z restore 0
    of 8).
12. **Words on a control match the result.** The verb clicked names the row produced; a door's
    label is its command's label word for word; no two reachable controls share an accessible
    name. Reason: "Data" on both rail and tab dropped the selection 12 of 12; "Show labels" vs
    "Label line".

## Decisions and reasons

- 2026-11-06 **Round 3 plan, from the round 2 decisions.** One change per problem; words at rest do not
  rise; a mechanism only read is measured before it is built on. Mine in it: the focus rule, the reply
  foot in two measured steps, the scope placeholder, the painted fact on the run line, the two-cause
  failure words, Enter saves the key, the notice period. Refused, with reason: a Colored row (stacks
  rows), "only selected" wording and You-turn scope (one planted reader; credit the placeholder first),
  selected-first sort for Show in table (reuse the members chip), `beforeunload` (nags clean projects),
  "Autosave: no changes" (flips on every Save), confirming Forget key (retyping recovers).
- 2026-11-03 **A picker entry binds exactly the run it names, scope included.** Evidence: r1-s23
  plus repro, Group 1 549 under 112 of 549; both skeptics kept severity 3.
- 2026-11-03 **Escape or Done on an emptied saved card reverts to the saved card.** Reason: Undo
  cannot restore the deleted card; `SelectionEditor.tsx:812` ignores `openedNew`.
- 2026-11-03 **An Or group's first state is untouched and its words name the join.** Evidence:
  3 sessions on 3 halves asked whether Condition/Or meant "and" or "or else".

- 2026-11-03 **One live region has one speaker: the surface on screen.** Evidence: tier 5 walk,
  workspace count replaced by a hidden inspector row's count; both skeptics kept it at 3.
- 2026-11-03 **Once a new card holds steps, Escape no longer takes it back;** undo covers Clear.
  Reason: two decided rules met and lost work with no undo; loss-safety outranks tidiness.
- 2026-11-03 **Every searchable picker is the one shared combobox.** Reason: the hand-built
  reference picker broke Tab, Escape and spoken counts that the value picker gets right.

- **2026-10-23, menu sections (issue #3315, director ruled).** Headings in both lists, no
  indent, every row in a section. My condition, adopted: headings are not stops. The Layout
  list becomes one Tab stop with roving focus (checked row first), ArrowUp/Down across
  sections skipping headings, Home/End, Enter/Space opens, Esc back then close -- the same
  model Analyze's list already has behind its filter box. No expanding parent rows: one
  interaction rule per list kind.
- 2026-10-11..16 (summarized from the old Top of mind) Tier 3 build decisions, mine: one card per
  field in the Which picker, a dashed unchosen card narrows nothing and is never written; bulk cards
  read a shared value or Mixed, ticking writes to every layer, a receipt names layers left matching
  nothing; the edge pick is independent of the node pick ("Both ends in this layer's nodes" card).
  Split is a command making an ordinary folder of empty ordinary layers (two row kinds only, the
  owner's consistency test). Set vs inherited by minus and primary text vs placeholder, never color
  alone; "None"/"Hidden" are blocking values, not unset. Figma taken: Mixed, multi-select, pill,
  one-line rows; rejected Detach. Tier 2 held: Shift-click adds, the toolbar Filters icon, the
  Degree link as a selection; label overlap is the element's; a study gate not enforced is not a
  gate; walk every key route before a task runs; a disabled done-state says why.
- **2026-10-14, round 6:** Round 6: "+" holds Layer, Folder and Analyze... (one command, two doors); Analyze's button names the state (Run / Update Leiden layer / Add Leiden layer) and restores a deleted layer from the stored result without recomputing; Which elements is a popover, live edits, one undo step per popover, outside click keeps, Escape restores; group rows rename by F2, menu or the Name field, never double-click (single click opens the group).

- 2026-09-13..10-03 (summarized; owner = decided by the owner) Panels stay open, no locks or
  autohide (owner). Algorithms layer styles and never mute the rest (owner). Every action undoable,
  history in graphty-element (owner). Shift+Arrow walks nodes (owner). Every undo and redo shows a
  notice (5 of 5 lost a step silently). Selection changes are not undo steps; Ctrl+Z restores a
  cleared selection from one slot (0 of 8 wrong vs 5 of 8). Esc does one thing per press,
  innermost first. A run paints when it finishes (owner). Rename by double-click and F2 (owner).
  Toolbar icons only (owner). Unset style values not drawn; "+" adds a property; popovers, never
  accordions (owner). Surfaces: dark menu picks, light popover edits live, page takes the
  workspace, modal only for Export, Settings, shortcuts, irreversible confirm. The graph is never
  put into the selection. No confirm before costly runs; cost, Stop and Undo instead. Label "+"
  adds a line and opens its list. Find box is one live list ("/" focuses it). A single node opens
  on Values; Degree opens the named neighbor list. Export > Data opens on the showing table. Build
  the real app (owner, 2026-10-03). Delete acts at once with Undo. A bind on a row edits that row.
  The element returns facts and codes; the app writes every word (owner).
- 2026-10-06 (summarized) Mine: notices pause on focus, polite region, never the only route back
  (not built). Round 1 held: Neighborhood on one node opens the named list (both doors share one
  function); Summary drops "Babet (1)"; "No crossings" refusal under Method from a code; focus to
  the new Style line; runs named by method. Rejected: Degree cue, Summary names, notice-slot changes.

- 2026-10-07..10-10 (summarized) Real-app rounds 2 and tier 2 rounds 1-2: menu focus fixed in
  compact-mantine's Menu, not per caller; row chevron in the hit area; key leaves out covered layers
  and says ", out of date" from `run.stale`; finished load and run announced in one polite region;
  source "..." header menu (Edit source, Replace); find hint decided by the element's refusal code,
  then the example line on a miss with "=" kept and Enter running it; Edges Color to Everything
  fixed at the root; three focus fixes; step edit commits on Tab/click-away; "Filter to neighbors"
  a plain command. Rejected: "Size arrives bound to the run", my find column rows (a second door),
  "+" opening the value picker (held). Owner: label overlap, bare numbers, edge width units.

- 2026-10-10..11 (summarized) Tier 2 rounds 3-4 critiques and closes, mine: Shift/Ctrl-click
  adds (element); forms focus their first field on every route in; the element offers only rules
  it accepts (a bare number gets an "is N or more" row); the table lists what a filter step keeps;
  an off step stays off when its editor closes unedited; New project then Discard never crashes;
  the briefings are checked for leaks before anything counts as unprompted.

- 2026-10-12 (summarized) Tier 3 proposals and owner feedback 1, mine. "+" only on repeatable lists;
  one scroll, no accordions, no Nodes/Edges tabs; hide a kind a rule cannot reach; field picker In use,
  then by origin; a shared ramp-over-histogram gradient editor; manual picking find-style first. Split
  into layers makes an ordinary folder of ordinary layers; minus is the one unset gesture; per-entry eye
  on list entries only. Reason: two row kinds, one gesture per job, element facts from the element.

- 2026-11-05 Tier 6 round 2 critique, mine. Proposed: focus rule; follow effect on the conversation
  plus `position: relative` on the log; placeholder and You-turn scope; two doors on the failed
  connection; one run line naming its paint; the change line reading the key's name; Show in table as
  a selected-first sort; Enter saves a key; strip the doubled period. Rejected: a warning sentence on
  the scope line, reversing apply-at-once, a Recent entry for opened files in this pass.

## Tried: worked / did not work

- 2026-11-06 Round 2 settled by two skeptics. Worked: my proposals mostly became units. Did not: my
  "the follow effect lacks the conversation dependency" was half the story -- `ChipRow` draws after an
  async count, so a dependency alone cannot fix it; and a failure's one-action rule broke on a failure
  with two unknowable causes. Taught: check a claimed reader behavior against code before accepting it.
- 2026-11-05 Tier 6 round 2 (12 sessions). Worked: the approval card, Undo in the reply as first
  choice, the disclosure once read, focus staying in the composer through send and failure, Sam's two
  keyboard sessions. Did not: the scope line alone (Dev read it and asked anyway); Show in table with
  no row in view; a failed key's cause; Enter in the key box; a reply's foot below the fold. Taught:
  a line that states a fact is not a line that warns, and readers check facts by rows, not chips.
- 2026-11-05 Tier 6 round 1 (the Assistant; 0 of 24 sessions ran, four expert walks, frozen build
  3b2a7f0649). Held on the walks: the approval card, the peek, the rail dot and lasting notice, every
  count on a chip, card or line. Did not work: focus after Undo, Remove, Answer; two Esc routes
  clearing the selection; no line for a model's selection; rollback residue; Done dropping a key;
  Listening before the microphone; the log losing the reader's place (Undo half's mechanism not
  found). Six scope routes fell to about three mechanisms once checked: a chip click is the
  reader's own act, not a defect. Taught: a study that never reaches a reader still pays through
  walks, but only for what is on screen.
- 2026-09-13..11-03 (summarized 2026-11-06) Tiers 1 to 5. Worked: 0 false "done" every tier; the
  load report and broken-file refusal with line numbers; Ctrl+Z restoring a cleared selection (0 of 8
  wrong vs 5 of 8 with a notice alone); Shift-click adds; the Which-nodes door after a run; header Role
  menu and hover "..."; keyboard sessions finishing (cost in presses, not failure). Did not: silent
  undo; a filter undo that deleted its step (severity 4); focus not following an opener; doors behind
  right-click; "No match" with no help; style "+" on the drawn default; new lines starting at the
  current value; join preview tags not matching the result; an empty color box committing on first
  click; an Or group's untouched state and unworded join; a picker binding a different run; Clear then
  Escape deleting a saved card; a round launched without its start gate (every session refused).
  Taught: a dry run or focus walk certifies only the routes it walks; a prototype that cannot reach
  the end state measures the prototype; a fix made three times needs a criterion; avoidance can pass
  a bar meant to measure understanding; schedule my own walk before launch.

## Thinking

- 2026-11-06 **Watch in round 3:** whether the placeholder alone stops T92 A's plant; whether the
  run line's "colored by it" is read by a reader who cannot see the drawing; whether focus in the
  composer after Answer causes a stray Enter to send. Each unit stands alone so each can be credited.
- 2026-11-05 **Check the mechanism before accepting "reader behavior".** The insights called "never
  scrolled" partly the participant; the code shows the log can stop short with no Jump to newest. And
  "the repaint is the model's" is half true: `run_algorithm` colors unless told `style: false`.

- 2026-11-05 **A chat panel makes selection a hidden argument.** Everywhere else a selection only
  affects the next act the reader can see; at the composer it silently scopes a sentence. So
  anything that moves selection without a line (model, undo, rollback, Esc) changes what the next
  message does. Candidate criterion, once a reader confirms it: state that scopes a command is
  changed only by the reader or by an act that says so.
- 2026-11-03 **Cost, not failure, is where the editor loses.** Every Or session succeeded at
  overwhelm 2 or 3; the round fails on steps and on named doubts. The fixes are first states,
  join words and unit labels -- small, in place -- not new controls.
- 2026-11-03 **A study fixture can manufacture a finding.** Fixtures pre-colored in an
  orange ramp made "new orange drowned" look common; vary the asked color before generalizing.

- 2026-10-30 **Skeptic checks move severities more than sessions do.** All four severity 3
  candidates fell to 2 or below once two skeptics re-read the evidence; a grader's "trap" often
  was the task's order or the answer key's definition. Ask "did a wrong result stand?" first.

- 2026-10-21 **Ceiling rounds need cost bars.** With success at 55 of 56, steps over the key and
  wrong turns per half are the only signal; a round whose bars are all success-based cannot move.
  The answer key may also lead graders: check task wording for leading before spending sessions.
- 2026-10-06 **The chained first session is the real test of my work.** Each tier 1 task passes
  in isolation far more often than the chain (round 8: 86% without the chain, 0% with it). The
  chain fails where one step's state leaks into the next: a popover still open, a selection that
  changes what Style edits, a run that is held back by an earlier layer, a notice that has
  vanished. I want the study to log, per step, what was open, selected and focused when the
  participant moved on.
- 2026-10-06 (summarized) Held-back run: a hand layer can win over a run's paint; the notice must
  name both layers and one action (owner question open). An empty label line says so in place;
  name-like ordering is a data fact from the element. A 6 s notice with Undo is a WCAG 2.2.1 risk:
  its action duplicates a route that never expires. Explicit Save makes a dirty state readers must
  notice. Mid-path starts isolate one step when a chain fails.
- 2026-10-06 **The "held back" run is the hardest feedback case.** When a reader colored
  Everything by hand and then runs Louvain, the owner's rule is that the run paints, yet the
  reader's own layer wins color. Today the canvas says "Hidden by your layer <name>" with Show
  anyway. Open owner question: should a run's suggested style land above a hand-written layer
  that colors everything? Until then, the notice must name both layers and the one action.
- 2026-10-06 (summarized 2026-11-03) Older tier 1 threads: label lines must say "Pick an
  attribute" in place, name-like ordering comes from graphty-element; neighbors one click from
  the node with names, not ids; a timed notice's action must duplicate a route that never expires
  (Ctrl+Z); explicit Save makes a dirty state readers must notice; mid-path starts isolate a step.
- 2026-11-03 **A round with no sessions still teaches through expert walks,** but only about what
  is wrong on screen, never how often it hurts. Gate the launch, not the grading.

## Sources

- `design/ui/studio/digests/` (decisions, framework, owner-voice, study-rounds, tier1), 2026-10-06.
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/` -- decision-log.md (rounds
  1-8), round-8/insights.md, structure-comparison/ (structure-b-refined.md 2.5, my groups-list spec).
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` sections 2.7, 4-6, 9.
- `design/ui/framework/interaction-patterns.md` sections 3.1-3.6.
- Built code: `graphty/src/workspace/frame/NoticeSlot.tsx`, `keys/keys.ts`,
  `project/ProjectDialogs.tsx`, `WorkspaceToolbar.tsx` (status region).
- Owner messages in `.claudehistory/` (sessions 3a19ea55 and fac8191f), extracted with
  `design/ui/studio/tmp/interaction_owner.py` and `interaction_agents.py`.
- `design/ui/studio/rounds/round-1/`, `round-2/` (insights, decisions, scores, repro r2-s07, s19,
  s56), `r2/pilot/T6-T16/pilot.md`, read 2026-10-07.
- `design/ui/studio/tier2/rounds/round-1/insights.md` and `decisions.md`, read 2026-10-09.
- `design/ui/studio/tier3/rounds/round-1/insights.md`, read 2026-10-21.
- `design/ui/studio/tier6/rounds/round-1/insights.md`, `round-2/insights.md`, `scores.md`, read 2026-11-05; round 2 `decisions.md`, read 2026-11-06.
