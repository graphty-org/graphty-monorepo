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

1. (2026-11-05) **Tier 6 round 1 closed with no reader having seen the Assistant.** All 24 sessions
   were refused at the start and the Gemini request cap is spent, so the studio waits on the
   owner's spending decision. Everything known comes from four expert walks and frozen source:
   what is on screen, never what a reader paid. Treat every Assistant finding as unproven on cost.
2. (2026-11-05) **After Undo, Remove or Answer in the log, focus returns to the composer.** Today it
   lands on the disabled top-bar Undo or on Jump to newest, and typed keys go nowhere or act.
   `Waiting.tsx` raises `composerCalls` only for Change this. One rule, three cases; Settings
   stays out (returning to the opener is right). The one confirmed flow defect that is clearly mine.
3. (2026-11-05) **Scope must not move unasked; the composer line decides what a message is about.**
   Esc closing Settings and Esc on a focused chip each clear the selection, with no undo: a direct
   break of my Esc ladder (an Esc that closes something does nothing else). Fix these first. A
   surviving model selection turned "color the nodes" into 5 of them and a removal into 1 of 16.
4. (2026-11-05) **Every effect gets its line.** The model selected five nodes and no line said so:
   the element's `results` `top` action returns only `foundEffects`. Add a selection effect
   (additive, element), and word "Selected {N} nodes" in the app.
5. (2026-11-05) **A claim of no change must be true of the whole state.** "Nothing changed." sat
   beside a lit Redo and a selection the reader never made. Same for "Listening" emitted before any
   microphone opens (`VoiceSession.ts`) and no Declined line after Keep them: state words follow
   the event, and every ending of a flow leaves a line.
6. (2026-11-05) **A closing verb must not silently drop typed input.** Done discards a typed key;
   only Save writes it. Severity 2 until T90 shows whether readers press Done; it bears on bar 3.
7. (2026-11-05) **Three open rulings, my view:** a rollback is not an Undo the reader asked for, so
   the kept "selection survives Undo" should not cover it; closing the panel neither sends a
   message nor changes the selection, so by design 5.2 the x should last; a painting run keeps
   "Computed ..." with no Colored row until sessions show a need. None is a one-way door.
8. (2026-11-05) **Settings at a short, narrow window has a zero-height page** (`frame.css`, the
   only open severity 3, every section). Read from CSS, not measured: `repro/` needs no Gemini
   request. Not counted until it holds.
9. (2026-11-05) **Study gates:** check the remaining request count before launching a round, and
   never read the tool's live-region log as what a screen reader says. A bar's wording can fail
   right behavior: settle whether it is a defect before counting it.
10. (2026-10-30) **Show what an act will do, and decide before it, not after with a default
    applied.** Join's preview tags must equal its result row for row; unknown ends are decided only
    after Join; a new filter card should start on the non-destructive effect; every choice names
    its consequence. Also: a new style line starts where the reader can see it act.
11. (2026-10-30) **One fact, one drawing; column work starts at the table header.** One result with
    two names on one screen (Influence and PageRank, tier 6) is the same defect as the header
    glyph against timeline dates. A count should be a link that selects what it counts.
12. (2026-10-30) **Keyboard debts:** the header "..." is not a Tab stop; the issue mark is not
    spoken on focus; Export's format warning drops focus (needs its own repro); a repeat's menu
    marks no current choice; a popover press on its own scrollbar must not count as outside.
13. (2026-10-21) Owed traces from tier 3: the 130 px drawing move on first color, the off-center
    reopen of a saved project, a real-notch wheel repro. Name the mechanism before any fix.
14. Standing: one model plays every persona -- a failure is strong evidence, a pass weak; trust
    repros and code causes over tool text; a decided change unverified on the served build is not
    done.
15. Standing: graph facts in graphty-element, flows/focus/words in the app, shared control defects
    in compact-mantine; location entries behave like Label and Weight ("+", minus, Escape drops).

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

- 2026-10-12 Tier 3 proposals, mine (owner approves the built UI before any study). "+" only on
  repeatable lists; 0-or-1 properties as always-shown core fields or one "Add style" menu with
  glyphs; switches added flipped with a minus (a switch cannot say "not written"). One scroll, no
  accordions (owner ruled popovers, never accordions) and no Nodes/Edges tabs (hide half a route);
  sticky group headings, a scroll-to SegmentedControl only on overflow. Hide a kind the rule cannot
  reach; keep it live with "0 edges now" when it can (no dead controls). Field picker: In use, then
  by origin, fitting first, the rest disabled with the element's reason. Gradient: a shared
  compact-mantine ramp-over-histogram editor (domain, clamp, midpoint, step handles as APG
  sliders). Split parent is a layer with its own glyph, never a folder; folders never scope. One
  rule per layer with a Nodes/Edges/Both first control. Labels: source, named look, size, position
  inline; looks are named and reusable (element). Manual picking: find-style text first, the
  Filters rule editor behind it, selection as a fixed set; no algorithm favored. Element asks
  (additive): `agreement` below a layer, reachable kinds from `validate`, a fit check, a
  distribution with paint steps, named label looks, a RuleTree text leaf, `FindResult.rule`,
  bindable label size, color and background. Reason: one pattern per job, words at rest down,
  every element fact from the element.

- 2026-10-12 Owner feedback 1, mine. Split parent replaced by Split into layers (ordinary folder,
  empty ordinary layers above the original); minus is the one unset gesture for every field,
  including label settings (drops "Edited"/Reset); inherited list entries visible; per-entry eye on
  list entries only. Element asks (additive): keep a layer that sets nothing, `split`, a rule on an
  arbitrary label that follows members across re-runs, `agreement` naming the source row. Given up:
  a group's rule is copied at split time. Reason: two row kinds, one gesture per job.

## Tried: worked / did not work

- 2026-11-05 Tier 6 round 1 (the Assistant; 0 of 24 sessions ran, four expert walks, frozen build
  3b2a7f0649). Held on the walks: the approval card, the peek, the rail dot and lasting notice, every
  count on a chip, card or line. Did not work: focus after Undo, Remove, Answer; two Esc routes
  clearing the selection; no line for a model's selection; rollback residue; Done dropping a key;
  Listening before the microphone; the log losing the reader's place (Undo half's mechanism not
  found). Six scope routes fell to about three mechanisms once checked: a chip click is the
  reader's own act, not a defect. Taught: a study that never reaches a reader still pays through
  walks, but only for what is on screen.
- 2026-10-30 Tier 4 round 1 (returning users managing data). Worked: the header Role menu for
  places (T63), the header "..." on hover (every T62 session found it), Hide for T66. Did not
  work: the join preview tags; deciding unknown ends after Join; Hide as a new card's default when
  marking first; "Set in Data" when the kind matters; the joined-source row layout (name and
  approved ratio clipped). Tool defect: popover-on-hover reported as "tooltip: null".
- 2026-10-21 Tier 3 round 1 (summarized): style "+" on the drawn default changed nothing (9
  sessions); node color looked for in the Graph inspector first; F6 stop with no focus ring; find
  pick became a fixed id list read as a rule; 6 of 10 went around the purple Layer token.

- 2026-09-13..29 (summarized) Did not work: v1 panel locks and autohide (one rule needed); a
  palette and search box that did not focus (initial focus goes to what opened); silent undo (5 of
  5 lost a step; Ctrl+Y must be Redo off macOS); a filter-step undo that DELETED the step
  (severity 4: undo unticks and keeps it -- applies to tier 2 Filters); Find focusing without
  selecting; a notice lasting "until the next action". Worked: Ctrl+Z restoring a cleared
  selection (0 of 8 wrong vs 5 of 8).
- 2026-09-30 My groups-list proposal (measures do not auto-paint; a run's group cannot be dragged
  out of its run; Space toggles paint; Alt+Up/Down moves a row): the owner overruled "measures do
  not paint"; the keyboard map for tree rows mostly survived into refined structure B.
- 2026-10-01 First clickable skeleton (round 7): ease fell to 3.54 because 18 of 61 tasks could
  not reach their end state and the tool could not type or modifier-click. Taught: a prototype
  that cannot reach the end state measures the prototype; and the end state is where interaction
  design lives.
- 2026-10-02..07 (summarized) Round 8 and the build comparison: a dead or silent second step
  decided every tier 1 failure; drift lands in the state lines a first-time user reads. Worked
  throughout: the load report, the broken-file refusal with line numbers, in-place reasons, "Note
  on: <thing>". Rounds 1-2 on the real app: two doors to one act must share one function; menu
  focus, row chevron, stale key, 2D Fit, the sizing chain, layouts failed and were fixed; a pointer
  pilot cannot certify focus and announcement fixes.
- 2026-10-09 (summarized) Tier 2 rounds 1-2 (55 valid each, both leaked): worked -- 0 false
  "done", the path run, Replace page, load-time "Higher means", Enter/Escape in step edits. Did
  not -- doors behind right-click, a find box answering only "No match", the stale key, the "start
  with =" hint, backticks, style "+" on the drawn default, layers named by count, a second Escape
  blurring the find box, Follow arrows landing on Hops. Taught: a dry run that walks only the
  answer key certifies only it; a keyboard finding handed to a bar is not fixed.

- 2026-10-10..11 (summarized) Tier 2 rounds 2-4. Worked: 0 false "done"; the find box's example
  line and kept "=" (copied, never discovered: 0 of 8 unprompted); focus fixes by keys; Shift-click
  adds (T24 7 of 7, median 4 steps against 7.5); the toolbar Filters icon first door 7 of 7. Did
  not: backticks, "start with =", a bare "10" offering only "is equal to", Shortest path ranked
  under Betweenness for "path", the table ignoring a filter step, an off step's editor turning it
  on, New project then Discard crashing. Taught: my focus walk covered what I fixed, not every
  route into a form; a fix matching a habit is used at once, but the briefing primed it.

- 2026-10-21 Tier 3 round 1 (55 of 56, frozen build 758b8e8081). Worked: every keyboard session
  finished (cost in key presses, not failure); the Which-nodes door after a run (T48 6 of 6, median
  0 wrong turns); color words typed into the hex box. Did not: new style lines at the current
  value; the empty-selection Style tab as a door to node color; focus after "Samples" and on the
  inspector's F6 stop; the picker's hue-bar click closing it; a "+" lost to a re-layout between
  press and release. Taught: a fix I have now made three times (start a line where it shows) needs
  a rule in the criteria, not another local patch; and avoidance passes a bar that should measure
  understanding.

## Thinking

- 2026-11-05 **A chat panel makes selection a hidden argument.** Everywhere else a selection only
  affects the next act the reader can see; at the composer it silently scopes a sentence. So
  anything that moves selection without a line (model, undo, rollback, Esc) changes what the next
  message does. Candidate criterion, once a reader confirms it: state that scopes a command is
  changed only by the reader or by an act that says so.

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
- `design/ui/studio/tier6/rounds/round-1/insights.md`, read 2026-11-05.
