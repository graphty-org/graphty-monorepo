# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-11-03 (tier 5 round 1 closed). Summarized on 2026-10-21: the tier 2
rounds (2026-10-09 to 2026-10-11) and the bulk-edit iterations are condensed below; the full text is
in git history of this file.

## Top of mind

1. (2026-11-03, round 1 close) Tier 5 stopped at the 1-round cap with bars 1, 3, 4, 8 and 9
   failing. Every severity 3 was behavior (speech from a hidden panel, a picker entry bound to a
   different run), never pure look. Visual weight alone did not move a bar.
2. The visual findings that counted were legibility of meaning: an untouched range drawn full while
   it reads "0 so far" (Or group first state), By position's box with no direction or unit and a
   9 px "of all nodes", an empty Fill color box with no cue. Rule: an empty or default state must
   look empty and say what it wants.
3. A control's drawing must never contradict its count or its text (full range bar vs 0 so far; the
   "highest 10" error vs 24 of 24). Check drawn state against the count on every first state.
4. Small helper text carrying the unit is a defect source: if the unit decides the answer, it is
   not 9 px caption text.
5. Bar 9 counts elements named by two sessions on different halves; the editor's Or group, the
   Condition.../Or... words and By position's box are my share. Re-walk each on the next frozen
   build.
6. Skeptic checks weaken findings the fixture or task wording causes (orange in an orange ramp,
   "top N" sending everyone to one box). Before rating, ask whether the fixture made it.
7. compact-mantine's swatches and color input are Figma-locked: "no orange" was dropped; an
   empty-box click bug in the shared color input goes to compact-mantine, not a local fix.
8. Bar 7 consistency still open at sev 2: value picker jumping over its field and Done
   (`decided.md` 734), Clear renaming a card "a selection" (631-632), a two-step card resting as
   one row with no caret.
9. 900 x 700: the preview is a 44 px sliver and the title loses the rule name; propose the
   small-width rule rather than rate a gap as 3.
10. Measure, then rate; cite a `decided.md` line or name the gap. Hover fakes theme defects.
11. A visual finding keeps sev 3 only with a paying reader or a scripted repro.
12. Same frozen build: replay old routes (`real.mjs --replay`) instead of re-walking.
13. Known and still open: Table "on" and Done share green (Figma lock), blank band under the
    preview, key over a node, 1 px focus ring, Except column 1226 vs 1247.
14. Open from tiers 3 and 4: `colorWord` hue names, the purple "Layer" token, the link glyph doing
    two jobs.
15. Tool habits: `--click "role=option:<name>"`; `--click "Edit#1"`; a diverged replay stays open:
    look, `--step`, then `--end`.

## Priorities and values

- The most important fact on a screen gets the most visual weight; a warning is never the smallest
  text on the panel.
- One idea, one look: selection, "on", "chosen" and "out of date" each have one treatment across
  the app.
- Encoding colors on the drawing belong to the reader's style layers; chrome and state marks add
  to them and never replace them.
- Alignment to a small number of edges; spacing from the theme scale.
- Shared controls are fixed in compact-mantine, never restyled in place.

## Design criteria (how I judge a screen)

- Squint test: what do I see first, second, third? Does that order match what the reader needs?
- Count left edges and text sizes per panel; more than two or three of either is noise.
- Every state a control can be in is distinguishable without hovering.
- Text never covers a node, a name or another control; long text ellipsizes and is readable whole
  somewhere.
- Numbers in a column share decimals and align.

## Decisions (dated, with reasons)

- 2026-11-03 (tier 5 round 1 close): Empty and default states must look empty and name what they
  want (a range not yet set is not drawn full; an empty color box shows a cue). Reason: the Or
  group's first state and the Fill color box were the two most repeated sev 2 visual findings,
  7 sessions on 6 halves for the color box alone.
- 2026-11-03: A unit or direction that decides the answer is never caption-size text. Reason: By
  position's "of all nodes" at about 9 px; three T74 sessions typed "top 5".
- 2026-11-03: Tried: rating my findings without sessions. Worked for finding them (every sev 2
  editor issue I had flagged was met by people); did not work for severity (none of mine reached 3;
  behavior findings did).

- **2026-11-03 (tier 5 round 1 rerun):** Moved the value picker's cut list from 2 to 1 and kept
  the Except column at 2, following the void round's skeptic check on the same build. Added the
  two-group card title (2, known) because the card's boldest text contradicts its own count.
- **2026-11-03 (rerun):** Rated the date box's 20 px height 1, citing `decided.md` 519 (pane
  controls 24 px) and the cause in source (`Autocomplete size="xs"` in the date card), so the fix
  is one prop. Rated the reference picker's 3.9:1 secondary text 1 with the width finding, since
  both go away if it is built on the value picker's list.
- **2026-11-03 (rerun):** Dropped "dark section titles lose their dim state" after finding it was
  hover; dropped "so far shortens the field" as decided (`decided.md` 523).

- **2026-11-03 (tier 5 round 1 closed):** After two skeptic checks, 1 of my 8 sev 2s held (Except
  out of line, weakly); number mix and cut strip fell to 1; nothing visual gates a bar. Reason:
  decided rules (short counts, widths to 1280) absorb findings I rated without citing them. From
  now on each rating cites the decided line it breaks, or the gap it proposes to fill.
- **2026-11-03 (tier 5 round 1 walk):** Rated nothing 3. Rated the No match chit 2, not 1: on a
  filter card it sits one row under the card's real on box with the same shape, and with one group
  nothing else in the outline has a chit (measured: grey 206 vs the canvas's lavender 209/210/232,
  so it is not a legend either). Fix proposed: the preview's non-member color, no edge.
- **2026-11-03:** Rated the sidebar Except row 2 and named what would make it 3 (a reader who
  applies Except to both groups). Reason: spec 3.1 says the same rows draw both outlines; the
  workspace keeps a 40 px verb column, the sidebar does not.
- **2026-11-03:** Kept the blank preview band at 2 although `decided.md` calls it cosmetic: it is
  the calm-first "blank pane the step does not use" and four task halves start with the node
  table open. Proved the cause by closing the table and reopening (`v2/11.png` fills the cell).
- **2026-11-03:** Marked Within hops' unmarked center "watch" at 2 and proposed the existing ring,
  through the preview's style layer, so no element API is needed.

- **2026-10-30 (tier 4 round 1 walk):** Rated nothing 3. The kind-glyph conflict (`opened` a
  calendar in the picker while text in the table) could mislead T62, but no reader has paid for it
  yet; marked "watch". Same for Select/Hide cards looking alike (T65).
- **2026-10-30:** Reported the join chips and the address box as "decision not finished on the
  build" (R13, R8) rather than new proposals, so the fix list points at the decision already made.
- **2026-10-30:** Listed known backlog items (cut source names, the lost issue chip after a join,
  "Advanced") by screen but did not re-propose them: R11 is binding and the rest are queued.
- **2026-10-30:** Owned the link glyph by the app from source (`SourceRow.tsx:19`), not by
  screenshot guess; read source at the frozen commit with `git show 79ed770292:<path>`.

- **2026-10-21 (tier 3 round 1 walk):** Rated the zero-match picker severity 3, not 2: the closed
  state's chips actively print positive counts, so a reader is told the opposite of the result, and
  the next step (setting a color) shows nothing. Owner graphty app; no element change needed (the
  counts already exist).
- **2026-10-21 (tier 3 round 1 walk):** Kept the key at severity 3 although it is in the backlog and
  a decision says the key never moves the drawing: it hid a node on three of three styled screens.
  Proposed only the key's own size, which respects that decision.
- **2026-10-21 (tier 3 round 1 walk):** Rated the 900 x 700 squeeze 2, not 3: not a study size.
  Rated the size overlap 2 and owned it by graphty-element (layout spacing), flagging that a
  smaller default range would be a breaking default change.
- **2026-10-21 (tier 3 round 1 walk):** Did not report gaps inside words; the notes' 2026-10-12
  lesson says they come from the capture's font hinting.

- **Tier 2 rounds 1 to 5 (2026-10-09 to 2026-10-11), condensed:** the selection halo was owned by
  graphty-element's renderer (draw only back faces), not an option; one out-of-date mark (the key
  title's words) was accepted over four; a rule-named selection layer (`selectionName`) and the
  doubling warning as an element fact were adopted as proposed; the key covering a node was rated 3
  from round 3 on; label overlap, bare numbers and edge-width units stayed on the owner's list;
  "Filter to neighbors" as a pressed toggle was rejected (do not re-propose); Values row order, key
  placement, halo, selection two-looks, polish bundle and the "Settings" rail label were held; a
  primary button with no edit ("Save and turn on") was rated 2; the `atLeast` text change was not
  breaking (shipped in 3.23.0). Severity follows what misleads, not how much was fixed.

- **2026-10-16, bulk iteration 7:** Purple (--cm-text-component) for the "Layer" source, not brand
  blue: blue fails 4.5:1 on white and already means selected/focused; purple is unused in the app and
  is Figma's "value supplied from elsewhere" color. Strip shows hues, legend shows count; one never
  repeats the other's job.

- **2026-10-14, round 6:** Round 6: per-group chits show the group's whole look (shape in its color); when a palette runs out, color and shape cycles are offset so no two groups share both; clamped histogram ranges hatched; degree histogram bins chosen by the element with a budget so large graphs never draw thousands of slivers.

- **Tier 3 iterations 1 to 4 (2026-10-12 to 2026-10-13), condensed:** cut property names rated 3
  (the name is a row's only identifier; the gear moved to the right-hand columns); painted-over
  mark as a dimmed value plus tooltip, not a glyph; Verdana fallback owned by graphty-element;
  selection ring kept at 2; "one community, two names" kept at 3 (severity follows what misleads);
  route's raw query 3, element first; stacked fields 2 (three reserved 24 px columns in a 240 px
  panel); Label settings' unreachable half 3, compact-mantine's Popout clamp; "no starting rows" 3,
  app; one Add strip of toggle icons per kind; group visibility follows the rule; shape icons from
  graphty-element (`previewStyle`); domain and clamp as one gesture; saved label looks are copies.
  Full text in this file's git history.

- 2026-10-21 (round 1 closed): a visual finding keeps sev 3 only with a reader who paid for it
  or a scripted repro; both my sev 3 claims (key over nodes, empty picker) fell to 2 without one.
  Next time I attach a repro to every sev 3 before scoring.
- 2026-10-21: "a change must be visible" joins my criteria -- a new line at the inherited value
  read as broken in 9 sessions. Proposal (app choice, not element): start the line empty or show
  the inherited value as a placeholder, so accepting a real value is the visible change.

- 2026-10-30: Tier 4 closed after round 1. Decided: treat a clipped approved fact as removed
  (bar 6 failed on the joined source row though its text held the ratio); a preview must draw
  exactly the outcome (the join preview was the most severe problem); a header glyph must follow
  the designated kind. Reason: the settled insights, after two skeptic checks.

## Tried: worked / did not work

- 2026-11-03 worked: replaying the void walk's routes on the same build; every check point matched
  but one click that landed on the closing workspace (the table's Close button sits under the
  pane while it closes). Carried on by hand from the open session.
- 2026-11-03 worked: a script file (`tmp/visual-t5/v4.sh`) for a whole new walk run in the
  background, with a Monitor on its log; `ledge.py` (left text edge per row) and `px.py`
  (contrast of the darkest pixel against the commonest) in the worktree's `tmp/visual-t5/`.
- 2026-11-03 did not work: chaining two replays with `&&`: the first diverged (exit 5) and the
  second never ran. Run each replay as its own background command.

- 2026-11-03: Rating from screenshots without pixel measures or decided-line citations -- did
  not work; skeptics cut most sev 2s. Measuring offsets (985 vs 1006) -- worked, the one survivor.
- 2026-11-03 worked: three sessions (light 1440 volunteers, dark 1280 x 800 colleague's river
  project with the node table open, light 50,000 nodes in the background while the first two ran)
  covered every tier 5 screen in about 50 steps.
- 2026-11-03 worked: a small `tmp/visual-t5/crop.py` (crop + scale) and PIL `getpixel` for chit,
  switch and field fills; measured the Except switch's thumb at 3.6:1 and dropped a contrast claim.
- 2026-11-03 worked: an accidental Done with no value gave the "pick yes or no" card for free; a
  wrong turn is a screen too.
- 2026-11-03 did not work: `--click Yes` with a layer's outline also holding "Yes" (ambiguous, and
  the batch's next step still ran: Done closed a half-made card). Name options by role.
- 2026-11-03 did not work: typing a value ("Grants") into the attribute picker's search finds
  nothing; type the attribute first.

- 2026-10-30: Worked: rating no visual finding at sev 3 without a paying reader -- the skeptics cut
  every other team's sev 3 candidates to 2 or 1. Did not work: my "kind glyphs differ" finding (36)
  had no reader trip on it; ended at 1. Missed: the join preview's wrong tags and the clipped ratio
  were bigger than anything on my walk; check previews and approved surfaces against the outcome
  first next time.

- 2026-10-30 worked: four sessions (light 1440 two files joined, dark 1440 one file with fixes and
  two cards, light 900 x 700 T68 state, dark 900 x 700 join) covered every tier 4 screen in about 45
  steps. Batching steps (`--click A --click B`) kept the step count low.
- 2026-10-30 worked: sampling pixel fills (PIL `getpixel`) to prove hover and selected share a fill,
  instead of judging two light grays by eye.
- 2026-10-30 did not work: `--hover-at` on a source row's glyph returned no tooltip; on the name
  text it did. I nearly reported a missing tooltip.
- 2026-10-30 did not work: `--click "role=button:<accessible name>"` with the row's long name;
  `--click-at` on the row was simpler.

- 2026-10-21 worked: three sessions (light 1440 Les Miserables, light 1440 volunteers file, dark
  900 x 700 saved project) covered every tier 3 screen, each card type, a folder, several layers
  picked together, bound color and size, and "Why this look" in about 75 steps.
- 2026-10-21 worked: building a picker whose cards together leave nothing (role + trained + no
  phone), then closing it. The open state looked fine; the closed state was the finding.
- 2026-10-21 worked: reading `owner-decisions.md` and the backlog before rating the key, which
  turned the proposal from "move the drawing" (decided against) into "shrink the key".
- 2026-10-21 did not work: `REAL_SLOT_WAIT_SECONDS=90` while other agents held all four slots;
  the start exited 4. Re-ran in the background with 900 s and kept working on the report.
- 2026-10-21 did not work: `--click "Samples"` on the start page is ambiguous (a button and a nav
  link); use `role=button:Samples`.

- 2026-10-12 worked: driving the served build with my own Playwright script (own context, through
  `with-browser.sh`) and building the scene through `element.session` the way the review stories
  do; then every screen by real clicks. One script, four passes (light, dark, 900 x 700, no
  starting rows) in one run each.
- 2026-10-12 did not work: the first pass ran without `--font-render-hinting=none
--disable-lcd-text` and drew gaps inside words; I nearly reported it. Use visual-review's
  `CHROMIUM_ARGS` for every capture.
- 2026-10-12 worked: reading `getComputedStyle` (and `::placeholder`) for contrast and type sizes
  instead of sampling antialiased pixels; pixel sampling of 9 px italic text under-reads contrast.
- 2026-10-12 worked: checking a tall popover's `scrollHeight` and focusing its last field to prove
  "unreachable" rather than inferring it from one screenshot.
- 2026-10-12 worked: walking the app with its own defaults (no starting rows) as well as the
  review state; the gap between them was a severity 3 finding.

- 2026-10-12 worked: adding up the mock's row heights (40 / 32 / 28 px) before claiming a height
  saving; my first guess (330 px) was wrong, the sum gave 520.
- 2026-10-12 worked: reading `proposeEncoding` and `data.attributes()` first turned the field
  picker from an element request into app-only work.
- 2026-10-12 did not work: a first draft at 1,900 words for a 1,500 budget. Write each answer as
  options, one recommendation, one element line; cut the rest.

- Tier 2 lessons (2026-10-09 to 2026-10-11), condensed: walk detours, not only the answer key's
  path (detours found the selection and styling defects); add a step after the change under test
  (a filter after a path showed the node-only scope rule); read the renderer or app source at the
  frozen commit before naming a mechanism (`git show <commit>:<path>`); grep the element's types
  before proposing an element change (the table fix shrank to one word); one session per walk with
  several screens, one browser at a time; never wrap `real.mjs --start` in `timeout`; `--key Escape`
  does not blur the find box; propose one smallest change per confirmed problem (4 of 5 and 3 of 3
  landed that way), never variants; check the previous round's decisions before proposing a state
  treatment; when a task fails, first ask whether the prompt and the answer key agree; write
  `bars.mjs` output to disk before citing it.

## Thinking

- (2026-10-21) The picker repeats the closed/open problem I saw in tier 2's key: a
  summary written per part reads as the whole. Any summary of combined conditions should print
  the combined result once and the parts without numbers.
- The app's dense Figma look leans on 9 px labels and gray-on-gray. That is fine for field labels,
  wrong for states and warnings. A rule of thumb to propose: state text never below body size.
- Stale marking might be best on the values themselves (dimmed, with the strip as the action),
  matching how the drawing could dim; that is a design question for the content and interaction
  designers too.

## Sources

- `design/ui/studio/tier5/rounds/round-1/expert/visual.md` (tier 5 round 1 rerun, 23 findings);
  sessions `expert/visual/v1..v4` (v1-v3 replay the void walk on 1e123d7d33); crops in
  `tmp/visual-t5/r1/`; `decided.md` 519 (pane controls 24 px), 523, 734, 768, 774, 786, 877

- `design/ui/studio/tier5/rounds/round-1/expert/visual.md` (tier 5 round 1 walkthrough, 19
  findings); sessions `expert/visual/v1..v3`; crops in the worktree's `tmp/visual-t5/`
- `design/ui/selection-groups/spec.md` 3.0 (workspace layout, canvas takes the preview cell), 3.1
  (row anatomy: 40 px verb column, No match faint chit); `tier5/decided.md` workspace polish 2-3;
  `tier5/rounds/round-1/calm-first-frozen.md` (calm-first findings 1-7)

- `design/ui/studio/tier4/rounds/round-1/expert/visual.md` (tier 4 round 1 walkthrough, 29
  findings); sessions in `expert/visual/v1..v4`
- `design/ui/studio/tier4/decided.md` R1-R15 (data screen decisions), owner rules for data UI
- `graphty/src/workspace/data-place/SourceRow.tsx:15-19` (source glyphs); `table/HeaderCell.tsx`,
  `table/typeIcons.ts`, `style/WhichPicker.tsx` (`VALUE_GLYPHS`), `data-place/TypeGlyphIcon.tsx`
  (three kind-glyph maps); `export/ExportDialog.tsx` (compact-mantine `PageList`)

- `design/ui/studio/tier3/iterations/1/visual.md` (iteration 1 findings, 34);
  screenshots in `design/ui/studio/tier3/build/i1-visual/` (local, ignored by git)
- `compact-mantine/src/components/popout/PopoutPanel.tsx` (top clamp, no max height);
  `compact-mantine/src/components/StyleSelect.tsx:239` (grid has no check);
  `compact-mantine/src/theme/css/color.css.ts:164` (uppercase hex, "MIXED")
- `graphty/src/workspace/style/BindingPopover.tsx` `ValueRow`; `StylePanel.tsx:149-161` (`own`);
  `graphty/src/workspace/canvas/legendWords.ts:130` (Group by rank)

- `design/ui/studio/tier3/decide/visual.md` (my tier 3 answers)
- `design/ui/studio/tier3/style-catalog.md`; `design/ui/unified-style-layers.md`;
  `design/ui/style-panel-organization.md` on branch `mock/style-panel`
- `graphty-element/src/catalog/types.ts:674-691` (Selector), `:985-1031` (AttributeDescriptor);
  `graphty-element/src/session/styles/StylesApi.ts:375-388` (proposeEncoding);
  `compact-mantine/src/components/StyleSelect.tsx:31`, `GradientEditor.tsx`, `rows/ChartRow.tsx:154`
- `design/ui/studio/tier3/rounds/round-1/expert/visual.md` (round 1 walkthrough, 27 findings)
- `design/ui/studio/owner-decisions.md` 2026-10-19 "the key never moves the drawing";
  `design/ui/studio/tier3/backlog.md` lines 120, 164 (key covers nodes, seen in the dry runs)
- Tier 2 sources: `design/ui/studio/tier2/rounds/round-{1..5}/expert/visual.md`, `insights.md`,
  `decisions.md`; `graphty/src/workspace/canvas/LegendCard.tsx` `useReservedMargin`;
  `graphty-element/src/Node.ts`, `graphty-element/src/config/GraphStyle.ts` (selection halo)
