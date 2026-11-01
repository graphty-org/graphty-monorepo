# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-30 (tier 4 closed after round 1). Summarized on 2026-10-21: the tier 2
rounds (2026-10-09 to 2026-10-11) and the bulk-edit iterations are condensed below; the full text is
in git history of this file.

## Top of mind

0. (2026-10-31) Tier 5 panel: selection groups and steps (mock J). My proposal is
   `tier5/panel/visual.md`: no automatic table, a picking view owned by the element with a visible
   "Group colors" toggle, monochrome Figma boolean icons, one picker and one count chip look for
   both surfaces, group color only as a chit (A2). Live drift found: two picker headings, two
   count-chip looks, 8 px effect words, the Louvain column's number glyph on a category.
1. (2026-10-30) Tier 4 closed after one round without meeting its bars; the studio is stopped.
   Settled result: `tier4/rounds/round-1/insights.md`. Next tier starts from it.
2. The most severe open problem is visual: the join preview tags the wrong rows and leaves the
   unknown-end row untagged beside "1 not in graph", which 3 of 4 read as "left out". A preview
   must draw exactly what the act will do, mark by mark.
3. Bar 6 fails on layout, not removal: the joined source row's "17/19 rows joined" ratio and second
   name are clipped out of sight while the text still holds them. Clipped equals removed for a
   reader. One layout fix (counts win, R11) covers both; "17 of 19 joined" next to 18 edges also
   needs to agree.
4. One fact drawn two ways costs a second menu: setting the time leaves the header's text glyph
   while the timeline draws dates (four sessions named it). The header glyph must follow the
   column's designated role/kind.
5. The header is where readers do column work (3 of 4 on T62); put the state there (role chips for
   place roles are missing).
6. A new filter card starts on Hide and the deciding words are about 8 px; the default bit 5 of 5
   who meant to mark. Give the effect control enough weight to be seen before it acts.
7. Issue mark still has a default cursor and image role; fix with a pointer cursor and a name.
8. Downgraded this round, do not re-raise without new evidence: "With issues 11" (sev 1), the Hide
   label (sev 1), differing kind glyphs (sev 1, no reader tripped), the name cut alone.
9. A study-tool defect (hover popovers reported as `tooltip: null`) made false findings. Before
   trusting any "nothing appeared on hover", look at the screenshot.
10. Lesson held: a visual finding needs a reader who paid for it or a scripted repro to hold sev 3;
    none held at 3 this round, and two skeptics cut most candidates by one level.
11. The link glyph doubles as "web address" and "joined" (`SourceRow.tsx`); cheapest fix still open.
12. Focus visibility, `colorWord` hue names and the purple "Layer" token are still open from tier 3.
13. compact-mantine is Figma-locked: PageList hover = selected fill, dark dropdown with no edge go to
    the owner, never into code.
14. Read `decided.md` (R1-R15) before rating: unfinished decisions are not new findings.
15. Tool habits: `REAL_SLOT_WAIT_SECONDS=600` on `--start`; crop with `tmp/visual-t4/crop.py`;
    `--hover-at` on the name text itself.

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

- 2026-10-13 (tier 3 pause): Backed iteration 4's plan to move every property's settings into one
  button per kind section instead of my single-row proposal (gear at the row's end): it frees the
  name column entirely and matches Figma's Type settings, at the cost of one more click for rare
  settings. Reason: the name is the row's only identifier; rare settings can afford a click.
- 2026-10-13 (tier 3 pause): Kept the painted-over mark against Figma, but inside the field as a
  dimmed value plus tooltip, not a separate glyph in the name column. Reason: one mark per problem,
  and the value itself is what misleads.
- 2026-10-13 (tier 3 iteration 3): Rated the cut property names severity 3, not 2: the name is the
  only thing that says what a row is, it is cut on three of seven rows of every layer in both
  themes and at every width, and "C." next to "Comm..." leaves a row with no readable word. One
  path proposed: move the gear to the right-hand columns, where effect entries already put it.
- 2026-10-13 (tier 3 iteration 3): Grouped "the value says what the canvas does not draw" as the
  sev 2 theme instead of six separate polish items; each is a different owner (app, element,
  compact-mantine), so they stay separate findings with one shared heading in the summary.
- 2026-10-13 (tier 3 iteration 3): Owned the Verdana fallback by graphty-element and flagged that
  the fix changes a default string (the element decides whether that is breaking); the app may set
  a font with a fallback as its own choice meanwhile. Read in source: label looks already use
  "Verdana, sans-serif", the bare default does not.
- 2026-10-13 (tier 3 iteration 3): Kept the selection ring at severity 2: it now meets contrast on
  Fantine, but on the route's hub at size 1 it is still lost under edges and the label, which is
  the case iteration 2 named.

- 2026-10-12 (tier 3 iteration 2): Kept "one community, two names" at severity 3 though it went
  from three names to two: the Values tab is where a reader goes to read groups, and its "5" is
  the key's "Group 2". Severity follows what misleads, not how much was fixed.
- 2026-10-12 (tier 3 iteration 2): Rated the route's raw query severity 3 (criteria: a raw field
  path on a success path). Owned it by graphty-element first, since the iteration's decision was
  that every run layer's rule is readable; the app's verbatim printing of expressions is second.
- 2026-10-12 (tier 3 iteration 2): Kept new labels at about 4 px at severity 2, unchanged, rather
  than raising it: same evidence as iteration 1, no new reason.
- 2026-10-12 (tier 3 iteration 2): Rated the stacked fields severity 2 and tied it to the owner's
  panel-length question and to Figma's paired rows; the cause is three reserved 24 px columns in a
  240 px panel, so the wrap rule never pairs. One path: let the reserved columns be shared by a
  pair, not per field. Proposed in the critique, not here.

- 2026-10-12 (tier 3 iteration 1): Rated Label settings' unreachable lower half severity 3, not 4:
  the top half (color, type, box) holds the common fields and nothing a task needs is lost yet,
  but 60% of the label's settings cannot be seen. Owner compact-mantine, because the clamp is in
  the shared Popout and every tall popout inherits it.
- 2026-10-12 (tier 3 iteration 1): Rated "real app has no starting rows" severity 3 and owned it by
  the app: the reviewed stories set `startingRows`, the app never does, so the owner approved a
  tree no reader meets and every Clear tooltip names a hidden layer.
- 2026-10-12 (tier 3 iteration 1): Grouped field-state and Clear inconsistencies as one theme with
  one rule to fix, not twenty fixes, per "one path per problem".

- 2026-10-12 (tier 3): Proposed one Add strip of toggle icons per kind over "+" per section and
  over always-shown empty rows. Reason: on the mock's grid the dimmed titles cost about 440 px of
  the route layer's 770; the strip is the owner's "toggle on/off" without a toggle on every row.
- 2026-10-12 (tier 3): Group visibility follows the rule, not today's count, so sections do not
  jump while data loads; disabled stays reserved for "unavailable".
- 2026-10-12 (tier 3): Shape, arrow and pattern icons should come from graphty-element
  (`previewStyle`), since an app icon cannot tell icosphere from sphere and plugin shapes would
  have none. Proposed, not decided.
- 2026-10-12 (tier 3): Domain and clamp become one handle gesture; "keep as percentiles on re-run"
  picks which is saved. Needs the element to say what a binding paints (`styles.paintAt`), so the
  app does not compute a scale.
- 2026-10-12 (tier 3): Saved label looks are copies (a reader preference) until the element keeps
  linked looks in the style document.

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
