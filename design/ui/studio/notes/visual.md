# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-13 (tier 3 paused for the owner's review after iteration 3).

## Top of mind

0. (2026-10-13 tier 3 paused for the owner) Built and frozen: iteration 3 (`tier3-i3-617b43b270`,
   https://dev.ato.ms:9373/?next). Decided, not built: iteration 4 (`tier3/iterations/3/review.md`,
   "Decided for iteration 4"). Visual answers to the owner's three questions:
   (1) Unset = the minus on a set field (tooltip names what comes back) or empty + Enter; Undo
   restores. Covering something beneath is a different act: an ordinary entry set to nothing
   ("Hide label from Key people" in the "+" menu). Two acts, two controls -- keep them apart.
   (2) No split parent exists or is planned: two row kinds, layer and folder. Per-group colors are
   entries of an ordinary binding; the same rows serve College football's conference, so they
   are reusable, not community-only.
   (3) Figma: taken -- one-line rows, effect rows (chip, name, settings, eye, minus), Selection
   colors, Mixed only for multi-select, popovers beside the panel. Next -- one settings button per
   section (Figma's Type settings), 1 px inner swatch border, opacity inline in the color row,
   icon-grid shape picker, draggable color popover. Kept as ours -- vary glyph at rest and the
   painted-over mark (Figma does not stack paints).
   Watch at the owner review: cut names ("Sh...", "C.") are still on screen -- iteration 4's fix,
   not built; painted-over values still drawn at full strength; lower layers' entries repeated on
   every layer above (110 px each). Ask whether a dimmed painted-over value reads as "not drawn".
   Watch in the study: whether readers find the minus vs "Hide ... from" without being told;
   whether anyone reads the per-section settings button; height at 900 x 700 after rows go
   own-entries-only. Re-walk with `tmp/visual-i3/walk.mjs` on the iteration 4 build first.
1. (2026-10-13 tier 3 iteration 3 walk) 25 findings in `tier3/iterations/3/visual.md`: 1 sev 3,
   10 sev 2. Both of iteration 2's sev 3 are fixed, and the panel now fits 900 x 700. The new
   sev 3 is the one-line rows' own cost: the settings gear sits in the name column
   (`PropertyRow.tsx` line 157), so Shape, Color and Head read "Sh...", "Co...", "He..." (and
   "C." when painted over) on every layer. Lead sev 2 theme: a value that names what the canvas
   does not draw (painted-over orange at full strength, "Varies" with a swatch, "Verdana" drawn
   serif, Head "Triangle" on an undirected graph, dark "None" as a white chip, label Clear back
   to world size 48). Walk script: `tmp/visual-i3/walk.mjs <out> <light|dark> <WxH>` in the
   studio worktree; no changes from i2's were needed.
2. (2026-10-12 tier 3 iteration 2 walk) 28 findings in `tier3/iterations/2/visual.md`: 2 sev 3
   (the route's Which elements prints a raw query with backticks; the Values tab numbers
   communities by raw value while the key says "Group N"). 5 of iteration 1's 7 sev 3 are fixed.
   New lead theme is height and rhythm, not Clear: every pair now stacks one field per row
   (about 48 px per field), five field widths, six left edges. Also new: effect rows clip their
   color to "FF"; a category's Clear shifts its count and eye; one value has 3-4 names on one
   panel (Bridging / Edge betweenness / Bridge edges); the selection ring vanishes on the route's
   black nodes. Walk script: `tmp/visual-i2/walk.mjs <out> <light|dark> <WxH>` (starting rows
   are now the app's default, no flag needed).
3. (2026-10-12 tier 3 iteration 1 walk) 34 findings in `tier3/iterations/1/visual.md`: 7 sev 3.
   Lead ones: Label settings 2,280 px tall with no scroll (compact-mantine `Popout.Panel` has no
   max height); Louvain category rows cover their own names (a hex field in a 96 px box); one
   community numbered by rank in the key and by value in Values; the real app never turns
   starting rows on, so Clear names an invisible "Node defaults"; Which elements hidden on run
   layers. Biggest sev 2 theme: field state drawn four ways (fill, gray, italic, "MIXED") and
   Clear drawn four ways (row-end minus, mid-row minus, in-field minus, "x").
4. (2026-10-12 tier 3) My answers to the owner's 12 questions are in
   `design/ui/studio/tier3/decide/visual.md`. Lead ideas: one Add strip per kind (pressed icon =
   the layer writes it) instead of "+" per section; icon-grid pickers that open on add; a ramp
   editor (histogram bars in their mapped colors, domain handles that can save as percentiles);
   named label looks; one "which elements" sentence with three ways in. Height is the panel's real
   problem: the empty section titles, not the written rows.
5. (2026-10-11 round 5 walk) Two sev 3 open, both old: drawn names over nodes and ties (element,
   owner's list) and the key covering "Depot" (app placement). Round 4's field-path name is fixed.
6. Lead candidate for the round 5 critique: the key's and strip's scope rule counts nodes only. A
   step that drops ties but keeps every node leaves a broken path under a plain "Shortest path" key
   and a strip reading "Ran on 20 nodes; 20 shown now" (`round-5/expert/visual/narrow/13.png`).
7. New sev 2 on a round 5 change: an off step's editor shows a blue "Save and turn on" with no
   edit, while an on step shows a disabled "Save step". One rule: no edit, no primary button.
8. New sev 2, mechanism unread: at 1280 x 800 Find path shrinks the drawing to half; not at 1440.
   Read the framing code at 8c015b806 before proposing anything.
9. Neighbor list ignoring the filter now shows a node with no tie after Filter to neighbors.
   Still needs a script to name the owner.
10. Bar 9 (b): the edge inspector is From, To, weight only on this build. Check the count on disk.
11. Held, first in line on a second session: one warning look for every load problem. Still two
    looks on this build.
12. Held, do not change: Values rows order, key placement, halo, selection two-looks, out-of-date
    mark, polish bundle, "Settings" rail label.
13. Rejected: "Filter to neighbors" as a pressed toggle. Do not re-propose without new evidence.
14. One path per problem: propose one fix, not variants.
15. Check what the element already offers before proposing.
16. A claim only one specialist made is scripted on the frozen build before fixing.
17. Words at rest never rise. Weight and position first. One mark per problem.
18. Never wrap `real.mjs --start` in `timeout`; start walks in the background and poll a file.
19. Escape does not blur the find box: click empty canvas before Shift+A, or keys type into it.

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

- 2026-10-11 (round 5 walk): Rated the broken path under a node-keeping filter severity 2, not 3:
  the layer list's clock and Rerun are on screen, so the stale state has a mark; what fails is the
  key and the strip's words (bar 5 kind, but marked). Owner graphty app, from round 3's reading of
  the scope rule; not re-read at 8c015b806.
- 2026-10-11 (round 5 walk): Rated "Save and turn on" severity 2: it is the most saturated element
  on the panel after the reader's own choice, and it is a round 5 change's neighbor.
- 2026-10-11 (round 5 walk): Left the 1280 x 800 reframe and the missing-column answer with no
  owner: I saw both on screen but did not read which package decides.
- 2026-10-11 (round 5 walk): Counted 52 against 42 and said why (new walks at 1280, a filter after
  a path, new screens), as the round 4 count lesson asks.

- 2026-10-11 (round 4 closed): Adopted from my critique: the table under a filter step (change 8,
  as proposed, one word plus the "of" count), the bare-number suggestion fixed in the element
  (change 3), and the column spelling moved into the element as `rulePath` (change 9; the red team
  asked for no new export, the director kept it because deleting the app copy is the point).
  Held: my one-warning-look rule (one session). Reason given: one problem, one path; second
  session decides.
- 2026-10-11 (round 4 closed): My "treat the `atLeast` text change as breaking" was wrong: the
  commit is in no released tag, so the director decided it as a team change. Lesson: run
  `git tag --contains` on the commit that introduced the exact behavior, not a neighbor.
- 2026-10-11 (round 4 closed): Agreed that scope words on the edge inspector stay even if bar 9 (b)
  fails: a true fact that prevents a wrong reading is not cut to pass a count.

- 2026-10-11 (round 4 critique): Proposed four changes: the table under a filter (app, scope
  "visible"); the refused backtick suggestion (element); the "or more" layer name (element, owner
  list for the text change); the problem mark following the reader's choice (app). Reason: the
  first two sit on bars 5 and 10 with session or two-specialist evidence; the third is mine,
  weakened to 2, but a one-helper move that also deletes an app duplicate; the fourth closes a
  session-confirmed sev 2 and my inversion finding with one rule.
- 2026-10-11 (round 4 critique): Held the Values-row order: insights weakened it to 2, no task met
  it, and moving the rows changes what four returning participants learned this round.
- 2026-10-11 (round 4 critique): Treated the `atLeast` target text change as breaking: it shipped in
  graphty-element 3.23.0 and changes what an existing field returns, though the selection is equal.

- 2026-10-11 (round 4 walk): Rated the "data.minutes" layer name severity 3: the criteria rate a raw
  field path on a success path 3, and T22's new "or more" row is that path
  (`round-4/expert/visual/find/07.png`). Owner graphty-element, read from `atLeastOf` at 5277e2cbe.
- 2026-10-11 (round 4 walk): Raised the toolbar covering the bottom node from 1 to 2: it now covers,
  not touches (`longnames/04.png`).
- 2026-10-11 (round 4 walk): Kept the warning finding at 2 though the glyph landed: the page still
  shows a green check and a warning about one table, and the unmatched line has no glyph.
- 2026-10-11 (round 4 walk): Left the neighbor-list-vs-filter finding with an open owner: I saw it
  on screen but did not read which package asks for the unfiltered neighborhood.

- 2026-10-11 (round 3 closed): Of my five critique proposals, three were adopted as proposed (toolbar
  Filters icon, one "Start here" badge, warning glyph on the repeated-ties line -- plus Load's
  `aria-describedby`), one in a smaller form (Values row: drop "Select where" from the visible text
  instead of a second line; the accessible name keeps it), one rejected (pressed toggle for "Filter
  to neighbors": it would undo round 2's command change with no new evidence). Accept all: the
  smaller form changes less of what a returning user remembers.
- 2026-10-11: The key's label-aware overlap ask held until a script rules out `autoFrame`. Agreed:
  a mechanism I named from source but did not reproduce is still one specialist's claim.
- 2026-10-11: Drawn-name overlap stays the only confirmed sev 3 (bar 10), on the owner's list.
  The rise in walk findings (124 to 139) was newly walked screens, not decay -- compare like for like.

- 2026-10-10 (round 3 critique): Proposed the Values row as name + second line, the shape the hit
  rows above it already use (`FindBox.tsx` `ResultRow` `match`), instead of a wider panel or a
  smaller font. Reason: 4 of 4 met the cut row (`r3-s10/02.png`); the hit rows never cut.
- 2026-10-10 (round 3 critique): Filter entry goes in the canvas toolbar as an icon, not the header
  chip at rest. Reason: r3-s33, s34, s38 went to the toolbar's Layout button; an icon adds no word
  at rest (bar 9 fails by one word).
- 2026-10-10 (round 3 critique): "Start here" shown once while a search is typed. Reason: the rule
  "one per heading" put two equal badges on screen for "linked" (`expert/visual/path/02.png`).
  Ranking Shortest path first is the content designer's; the badge is mine.
- 2026-10-10 (round 3 critique): "Filter to neighbors" on = pressed (the chosen-state look),
  never the disabled gray. Reason: one idea, one look; r3-s45, s48 plus four experts.
- 2026-10-10 (round 3 critique): No app hint for Shift-click and no move of "Select endpoints"
  until the element fix lands: the menu finding is confounded with the Shift-click defect.

- 2026-10-10 (round 3 walk): Rated the key covering a node severity 3 (criteria: "text or the key
  covering a node"); owner graphty app, since the key is the app's overlay
  (`round-3/expert/visual/find/07.png`).
- 2026-10-10 (round 3 walk): Rated the doubling warning severity 2, not 3: the count and the words
  are on screen; what fails is weight and distance from Replace (`replace/04.png`).
- 2026-10-10 (round 3 walk): Counted the "Filter to neighbors" done state as a visual defect (gray =
  unavailable), even though the command change itself was right.
- 2026-10-10 (round 3 walk): Found the key's run-scope rule compares node counts only; reported it
  with the filter chip as one finding so the fix is one rule for chip, step line and key.

- 2026-10-10 (round 2 closed): My "+" starting-value fix was adopted in a better form: not an app
  choice of color, but the element's own highlight look exposed additively
  (`highlightStyle(target)`), so the app invents no graph value. Accept: it keeps "one idea, one
  look" (a styled selection looks like the selection did).
- 2026-10-10: Rule-named selection layer adopted as I proposed (`selectionName`, rule without "=").
- 2026-10-10: Doubling warning adopted as element fact (repeat-edge count from `data.prepare()`)
  plus one app line and a Replace button beside Load. App file-name matching rejected; agreed.
- 2026-10-10: Find-box fix ships as one path (example line after "No match", suggestion with "=",
  shown rule becomes Enter's option); "Select where..." on a column held unless 3+ of 8 still stall.
- 2026-10-10: Label overlap, bare numbers and edge-width units stay on the owner's list; no app
  font, seed or offset workaround. Agreed: an app fix would hide an element defect.
- 2026-10-10: Polish bundle, halo and out-of-date mark still held so round 3 measures one change
  per problem.

- 2026-10-09 (round 2 walk): Out-of-date mark lowered from 3 to 2: the inspector strip now holds a
  blue primary Rerun, the panel's most saturated element, so the state is no longer the quietest
  thing there; the canvas key's words are still not distinct, so it stays open.
- 2026-10-09 (round 2 walk): Selection halo stays severity 2 under a new mechanism: own color kept,
  but the translucent disc tints the node behind it. Owner graphty-element.
- 2026-10-09 (round 2 walk): Missing "..." on the two-table source inspector rated 2 (one inspector
  kind, two headers; it hides Replace from a reader who loaded two tables). Owner graphty app.

- 2026-10-09: Rated the out-of-date mark severity 3: bar 5 counts a stale value shown without its
  mark, and a mark nobody sees is not a mark (`tier2/rounds/round-1/expert/visual/replace/07.png`).
- 2026-10-09: Rated label collisions severity 3 even though layout overlap is an open design
  question: the criteria's rule is that text covering a node or a name a reader needs is severity
  3 (`visual/path/06.png`).
- 2026-10-09: Owner for SegmentedControl's chosen state is compact-mantine (its theme draws the
  segment, `compact-mantine/src/theme/components/controls.ts`); owner for the selection halo and
  fill tint is graphty-element (`graphty-element/src/Node.ts`).

- 2026-10-09: Round 2 change list limited to five verified problems (selection halo, stale mark,
  source inspector menu, find refusal line, segmented control); polish findings held back because
  no session was slowed by them and each change risks moving what a returning user remembers.
- 2026-10-09: Selection halo fix belongs in graphty-element's rendering, not in an option: the
  schema's own words say a scale above 1 "puts a ring around the node", and an enclosing
  translucent sphere breaks that documented intent. Not an API change.

- 2026-10-09: Accepted the team's single out-of-date mark (key title words) over my four-mark
  proposal. Reason: one state, one mark, and dimming the drawing from the app would be appearance
  outside style layers. If round 2 shows nobody sees the words, raise the mark's weight next.
- 2026-10-09: Accepted deferring SegmentedControl and label overlap. Reason: a compact-mantine
  change touches every caller's baselines and would blur what round 2's changes achieved; label
  placement is too large for between rounds.
- 2026-10-09: Selection halo downgraded from build defect to severity 2 by the skeptics (the
  highlight taking priority may look intended); the fix still lands because the schema documents
  it as a ring.

- 2026-10-09 (round 2 critique): Proposed four changes only: a visible starting value for an
  added Line color and width (app, `row.ts`); a selection layer named by its rule (app,
  `StyleTab.tsx`); a warning line above Load when an Add repeats existing ties (element fact plus
  app words); the find box's "No match" line leading to the rule hint (with content and interaction).
  Reason: each is on a confirmed severity 2-3 problem that participants met despite the facilitator
  text leak, and each is one function. Evidence: `r2-s14/15.png`, `r2-s12/03.png`, `r2-s33/05.png`.
- 2026-10-09 (round 2 critique): Held back the out-of-date mark, halo, selection color and label
  overlap: no session misread a stale value, and the rest are element changes too large between
  rounds that would move what a returning user remembers.

## Tried: worked / did not work

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

- 2026-10-11 worked: walking the 1280 x 800 session past the find list (path, then a filter, then
  the run) found two sev 2s the round 4 narrow walk could not; keep the narrow walk a full walk.
- 2026-10-11 worked: adding a filter AFTER a path, not before, showed the node-only scope rule on
  the drawing itself.
- 2026-10-11 did not work: Escape then Shift+A from the find box typed "A path..." into it (the
  same trap as round 1's "/"); click empty canvas first.
- 2026-10-11 worked: a separate short session for the table under a step checked the round's
  headline fix in four steps without disturbing the main walk.

- 2026-10-11 did not work: four variants per problem in a critique. The director picked one path
  each and listed the rest as held; variants cost review time and none survived beside the main one.
- 2026-10-11 did not work: citing word lists for bar 9 that were not on disk. Write the
  `bars.mjs` output to the round folder before citing it.

- 2026-10-11 worked: grepping the element's `Scope` union before proposing the table fix showed
  "visible" exists; the fix shrank from a new element query to one word in the app.
- 2026-10-11 worked: `git tag --contains` on the commit that added `atLeastOf` settled whether its
  text change is breaking (shipped in 3.23.0) instead of guessing.

- 2026-10-11 worked: typing a bare number (not only a rule) in the find box and following the new
  row through to a styled layer found the field-path name; checking a change only on its own row
  would have passed it.
- 2026-10-11 worked: comparing the two import pages' problem lines side by side showed the glyph fix
  inverted the inconsistency rather than closing it.
- 2026-10-11 did not work: the Add page is not reached from Tables "+" on Edit source (that is the
  Replace page); Control+O with a file while a graph is open opens "Add to <name>".
- 2026-10-11 worked: one session per walk, several screens per session (path walk covered filters,
  path, neighbors, notes and edge) kept within the browser slots while others' sessions held three.

- 2026-10-11 worked: proposing the smallest visual change per problem; 4 of 5 landed. Did not work:
  proposing a new look for a state another role had settled a round earlier (the pressed toggle).
  Check the previous round's decisions before proposing a state treatment.
- 2026-10-11 lesson: a round can fail on the study, not the app (T24's prompt and key disagreed).
  When I read a failed task's screenshots, first ask whether the participant's end state answers
  the prompt as written.

- 2026-10-10 worked: reading the key's refit code at the frozen commit before proposing a placement
  change. The fix is a missing label in an overlap test, not a new dock or a smaller key.
- 2026-10-10 worked: filtering my 34 walk findings through the skeptics' insights first; only
  findings a session paid for became proposals, which kept the list to five.

- 2026-10-10 worked: checking each round 3 change on screen first, then walking every control
  around it; four of the new findings sit right beside the changes.
- 2026-10-10 worked: reading the app source at the frozen commit (`git show 26f3bb968:<path>`) to
  name a mechanism (key compares nodes only; the neighbor button is aria-disabled when on).
- 2026-10-10 did not work: `timeout 590` around `real.mjs --start` while slots were full; it killed
  the waiting start. Start in the background and poll the output file instead.
- 2026-10-10 worked: `REAL_VIEWPORT=1280x800` on `--start` for the narrow check.

- 2026-10-10 worked: proposing one function-sized change per confirmed problem; all three of my
  round 2 proposals were adopted. Reading the element first turned up a better owner (the element
  already had a neutral highlight look nobody could read).
- 2026-10-10 did not work: the round 2 study leaked the task file; my reading of which routes
  "worked" must be discounted, and my severity was not held one level down for opinion-only items.

- 2026-10-09 did not work (again): the dry run walked styling a run, not styling a selection, and
  participants went the unwalked route; the first dry run had even ruled width 8 "works as designed".
  A triage ruling made without a reader's eyes is provisional.
- 2026-10-09 worked: reading `startingValue` before proposing the fix showed the gray and the 8 come
  from the app taking the element's default verbatim, so the fix is the app's choice, not a breaking
  element default change.

- 2026-10-09 worked (round 2): re-walking round 1's eight walks on the new build and checking each
  round 1 finding off one by one gave a clean fixed / persists list; plus two detours (many nodes
  selected via Hops 2, a two-table source) found two new findings.
- 2026-10-09 worked: `real.mjs --start` takes its own browser slot; starting the next walk in the
  background while stepping another kept within the 4-slot cap. Slots were held by other agents
  for about 15 minutes once -- wait, do not wrap or bypass.
- 2026-10-09 did not work: `--key Escape --key /` in the find box typed "/" into the box (Escape
  does not blur it); use Control+a and type over instead.

- 2026-10-09 worked: walking each task's success path from the answer key with `real.mjs` and a
  task setup file reached every bar 8 screen in eight sessions; one browser at a time.
- 2026-10-09 worked: cropping and enlarging a region (PIL, 2x to 3x) to read 9 px labels and
  measure left edges; the 1440 x 900 screenshots are at device scale 1.
- 2026-10-09 did not work: 1280 x 800 is not reachable with `real.mjs` (viewport fixed); leave it
  to the scripted audit.

- 2026-10-09 worked: reading the renderer before naming the fix. "Selection repaints the fill" was
  wrong as a mechanism; the code showed a see-through sphere around the node, which changes the
  fix from "stop tinting" to "draw only the back faces".

- 2026-10-09 did not work: my round 1 walks followed the answer key only, the same blind spot as
  the dry run. Detours found the selection and styling defects; the experts and participants did.
- 2026-10-09 did not work: proposing several marks for one state; the director takes the smallest
  mark that makes the state true on screen. Lead with one mark, keep the others as a fallback.

## Thinking

- The app's dense Figma look leans on 9 px labels and gray-on-gray. That is fine for field labels,
  wrong for states and warnings. A rule of thumb to propose: state text never below body size.
- Stale marking might be best on the values themselves (dimmed, with the strip as the action),
  matching how the drawing could dim; that is a design question for the content and interaction
  designers too.

## Sources

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

- `design/ui/studio/tier2/rounds/round-5/expert/visual.md` (round 5 findings, 52)

- `design/ui/studio/tier2/rounds/round-4/insights.md`, `scores.md` (verified round 4 problems)
- `graphty/src/workspace/table/TableDock.tsx` line 349 at 5277e2cbe (table scope); `graphty/src/workspace/graph-place/FindBox.tsx` `columnText`, `ruleFromText`

- `design/ui/studio/tier2/rounds/round-4/expert/visual.md` (round 4 findings)
- `graphty-element/src/session/query.ts` `atLeastOf` at 5277e2cbe (the "or more" target text)

- `design/ui/studio/tier2/rounds/round-3/decisions.md` (round 4 change list, held items)

- `design/ui/studio/tier2/rounds/round-3/insights.md`, `scores.md` (verified round 3 problems)
- `graphty/src/workspace/canvas/LegendCard.tsx` `useReservedMargin`; `graphty-element/src/graphty-element.ts` `nodesInRect`
- `design/ui/studio/tier2/rounds/round-3/expert/visual.md` (round 3 findings)
- `design/ui/studio/tier2/rounds/round-2/insights.md`, `decisions.md` (round 3 change list)

- `design/ui/studio/tier2/criteria.md` (bar 8 screens, bar 10 scoring)
- `design/ui/studio/tier2/answers.md` (success paths)
- `design/ui/studio/tier2/rounds/round-1/expert/visual.md` (round 1 findings)
- `design/ui/studio/tier2/rounds/round-1/insights.md` (what held after the skeptics)
- `design/ui/studio/tier2/rounds/round-1/decisions.md` (round 2 change list and deferrals)
- `graphty-element/src/Node.ts`, `graphty-element/src/config/GraphStyle.ts` (selection halo)
