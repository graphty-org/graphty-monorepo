# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-11-05 (tier 6 round 2 critique). Summarized on 2026-10-21 and 2026-11-05: the tier 2
rounds, the bulk-edit iterations and the tier 3 iterations are condensed below; the full text is
in git history of this file.

## Top of mind

1. (2026-11-05) Tier 6 round 2 closed with readers: 11 of 12 succeeded, no confirmed sev 3. My critique
   proposes: `position: relative` on the log, the question at body size, a blank line between a turn's
   replies, the composer's words agreeing with the scope line, a selected count in the table.
2. Two scrollbars and the reply's hidden end are probably one defect: a chip's absolute hidden span
   escapes the log (no `position` on `.ws-assistant-log`), `.ws-panel-body` overflows, its bar narrows
   the log after it reached the foot, the whole log rewraps, and `following` stays true so no Jump shows.
   Traced in source and on `r2-s01/18.png`, not measured. Check `.ws-panel-body` scrollHeight first.
3. My "scope line at 9 px" size fix would not have saved Dev: he read the line at step 2 and asked
   anyway. Size is still design 8, but the words are what failed, and the placeholder contradicts it.
4. A reader paying changes what a fix must do: ask of every old proposal whether it would have changed
   that reader's path, not only whether the rule asks for it.
5. Chip-hover evidence is void: hovering is a deliberate tool command, so "nobody hovered" measures the
   tool. The same goes for "no reader saw the tooltip": a true tooltip fixes the promise, not r2-s09.
6. The question card is traced: `Radio.Group label` draws `.cm-field-label`, 9/14 secondary. Fix in
   `Waiting.tsx` with `<Text span size="sm" fw={600}>` as the label; never touch the locked token.
7. Keep the failure row's warning glyph proposal small: no reader paid for its look; it rides on the
   rewrite the row needs anyway.
8. One result, two names is confirmed by readers (Closeness over Reach, Louvain over Communities). The
   line's name is not in `words.ts`; it comes from the catalog. Content and engineer own the fix.
9. Name the cause only after tracing it to the rendered CSS. A prop already set did nothing in round 1.
10. A visual finding needs a reader who paid or a scripted repro to hold sev 3; mark "watch" otherwise.
11. Check previews and approved surfaces against the outcome first: tier 4's worst problems were there.
12. compact-mantine is Figma-locked: no finding here touches it. `DataTable` already has `scrollToRow`;
    what I could not find is an element fact giving a selected row's place in the table's order.
13. Read `decided.md` before rating, every clause. Unfinished decisions are not new findings.
14. Open from earlier tiers: the join preview's tags, the clipped join ratio, focus visibility,
    `colorWord` hue names, the purple "Layer" token.
15. Tool habits: `REAL_SLOT_WAIT_SECONDS=500` on `--start`; crop with PIL in `tmp/<task>/`; `--hover-at`
    on the name text itself; check a point still holds its control after the log grew.

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

- **2026-11-05 (tier 6 round 2 critique):** Merged insights 7's two halves. Reason: the insights call the
  scrollbars cosmetic and the cut reply a separate cost, but `r2-s01/18.png` shows the log about 75 px
  short of its foot (by the thumb) with no Jump to newest, which is what a late rewrap would give.
- **2026-11-05:** Dropped size as the fix for scope finding 5, kept it for design 8. Reason: Dev read the
  line. Proposed the placeholder agreeing with the line, not a warning that fires on every selection.
- **2026-11-05:** Said yes to a Colored row on the open ruling: the key shows the paint while the turn
  says only Computed (`r2-s10/05.png`). It is the existing row, so no new look.
- **2026-11-05:** Challenged the Autosave label's 2 as a separate look defect: after Undo "saved" is true.

- **2026-11-05 (tier 6 round 1 closed):** Withdrew "fix the marks first". Reason: `decided.md` says a turn
  with a real change keeps its line alone, 6.6 draws no chip, and the line sits on the Open run and Undo
  row, so "cannot be told" overstated it. It stays a question for the sessions.
- **2026-11-05:** Accepted the 9 px claim as a hypothesis, and the alignment items at severity 1. The
  one-word `size="sm"` fix still stands for the scope and microphone lines, where design 8 clearly
  applies.

- **2026-11-05 (tier 6 round 1 walk):** Rated nothing 3. The change line looking like prose and the
  scope line at 9 px are the likeliest to rise, but no reader has paid yet; marked "watch" with T92,
  T95 and T92 A.
- **2026-11-05:** Rated the failure row 2 though the design's text sizes allow body ink for errors:
  the design also names error ink for danger, and a failure left in the log reads as a reply. Proposed
  reusing the empty result's warning row, so a problem has one look.
- **2026-11-05:** Rated the provider section's 64 words 2 because the criteria say so, and recommended
  keeping them: the disclosure is what bar 3 measures. Size is the fix, not fewer words.
- **2026-11-05:** Did not report the key over a node, the model label as text or the sparse rail dot:
  `decided.md` settles them.
- **2026-11-05:** Stopped spending Gemini requests once the shared count neared 3,000 and listed the
  unreached states as not clean, rather than use `REAL_GEMINI_COUNT` to get past a spending cap.

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

- **Tier 3 pause and iterations 1 to 3 (2026-10-12 to 2026-10-13), condensed:** settings moved to one
  button per kind section, freeing the name column; the painted-over mark sits inside the field as a dimmed
  value; cut names, the raw query, Label settings' unreachable half and "no starting rows" rated 3, stacked
  fields and new labels 2; one Add strip per kind; visibility follows the rule, not the count; shape icons
  should come from the element; severity follows what misleads, not how much was fixed.

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

- 2026-11-05 worked: reading a cited screen for what is absent (no Jump to newest) and the scrollbar thumb
  for what is below the fold; it joined two findings the insights kept apart.
- 2026-11-05 worked: reading other experts' round 1 reports; the engineer already held the hidden span.
- 2026-11-05 did not work: my round 1 scope fix, tested against what Dev actually did.

- 2026-11-05 did not work: proposing a prop without tracing it to the rendered CSS (starters); the prop
  was already set and did nothing.
- 2026-11-05 did not work: quoting the design's drawing without its table and `decided.md` (change-line
  chip); the three sources differ, and the drawing was the weakest.
- 2026-11-05 worked: "watch" instead of sev 3, and listing unreached states as not clean. The check
  found no overclaim in the ratings; the overclaims were in the mechanism and the wording.

- 2026-11-05 worked: three sessions (light 1440, dark 1440, 900 x 700 light then dark) in 76 steps and
  29 Gemini calls. Reaching failure through the OpenAI key and no provider through Forget key cost
  nothing.
- 2026-11-05 did not work: a hover whose point came from an older screenshot; opening the steps had
  moved Open run, so its `cursor: auto` was void and I dropped the claim.
- 2026-11-05 did not work: `--wait` under about 20 s after a change request; 8 steps ran past 20 s, so
  look at `session.log` before judging a screen as stuck.

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

- (2026-11-05) A round with no reader shows the limit of my walk: I can say what is smallest or
  alike, not what misleads. Without readers, a claim like "decides" or "reads as prose" is a
  hypothesis and should be written as one, with the task that would test it.
- (2026-11-05) My "no hue, so each state needs a shape" still stands as a thought, but needs a reader
  confusing a change line with prose before it becomes a proposal.

- (2026-11-05) "No hue" and "three marks" pull against each other: with no hue, the marks must come from
  shape (a chip, a glyph), so any line without one reads as prose. Each state needs a shape of its own.

- (2026-10-21) The picker repeats the closed/open problem I saw in tier 2's key: a
  summary written per part reads as the whole. Any summary of combined conditions should print
  the combined result once and the parts without numbers.
- The app's dense Figma look leans on 9 px labels and gray-on-gray. That is fine for field labels,
  wrong for states and warnings. A rule of thumb to propose: state text never below body size.
- Stale marking might be best on the values themselves (dimmed, with the strip as the action),
  matching how the drawing could dim; that is a design question for the content and interaction
  designers too.

## Sources

- `design/ui/studio/tier6/rounds/round-2/insights.md`, `scores.md`, `sessions/r2-s01/18.png`, `r2-s07/05.png`, `09.png`;
  `graphty/src/workspace/frame/frame.css:97`; `compact-mantine/src/theme/css/00-foundation.css.ts:201`
- `design/ui/studio/tier6/rounds/round-1/insights.md` (settled findings 5, 9, 10, 11, 12 are the visual ones)
- `design/ui/studio/tier6/rounds/round-1/expert/visual.md` (tier 6 round 1 walkthrough, 23 findings);
  sessions in `expert/visual/v1-light`, `v2-sources-dark`, `v3-yeast-900`
- `design/ui/studio/tier6/design.md` sections 4 and 8; `tier6/decided.md`
- `graphty/src/workspace/assistant/` at 3b2a7f0649: `assistant.css`, `Conversation.tsx`, `Checks.tsx`,
  `Composer.tsx`, `AiProviderSection.tsx`, `AssistantPanel.tsx`, `ConversationList.tsx`;
  `compact-mantine/src/theme/tokens.ts:395` (xs 9 px, sm 11 px)

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
