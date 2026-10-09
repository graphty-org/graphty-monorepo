# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-09 (tier 2 round 1 critique after the sessions).

## Top of mind

1. (2026-10-09) The "selection tint" is not a repaint: the halo is a 40% gold sphere that ENCLOSES
   the node (`graphty-element/src/Node.ts` createOverlay), so the node is seen through it. Fix in the
   element by drawing only the halo's back faces; no option, no default change. 5 sessions met it.
2. (2026-10-09) Out-of-date is the quietest state on screen (9 px gray strip, gray clock). Raise
   the strip to body size in the warning color, put the same mark on the canvas key and the tree
   row, and dim the Top 10 numbers. Do not dim the drawing from the app (that would be appearance
   outside style layers).
3. (2026-10-09) The source inspector is the only inspector with no header "..." menu
   (`r1-s29/08.png` against `visual/replace/07.png`). Giving it the same menu, with Replace in it,
   is the smallest fix for "Replace not visible at rest" (8 of 8 hunted).
4. (2026-10-09) The find box's "No match" line is gray small text; a refused condition deserves a
   body-size line with the rule example in monospace (fixes backtick legibility too). Words are the
   content designer's.
5. (2026-10-09) Drawn names cover each other; label placement is graphty-element's. Severity 3 as
   a class; which names collide depends on the unseeded layout.
6. (2026-10-09) compact-mantine SegmentedControl: the chosen segment reads as the empty one. Fix
   once in compact-mantine (`cm-sc-*` classes).
7. (2026-10-09) The canvas key does not avoid what is drawn under it; it grows over names.
8. (2026-10-09) Dry runs walk only the answer key's routes. Every build defect participants met was
   on a detour (styling, selection). Visual walks must cover the commonest detours too.
9. (2026-10-09) Do NOT spend round 2 on polish (left edges, ragged digits, emphasis rules,
   section-header colors): no session was slowed by them.
10. (2026-10-09) Device scale 1 screenshots break letter spacing; confirm at scale 2 before filing
    a font fault.

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

## Tried: worked / did not work

- 2026-10-09 worked: walking each task's success path from the answer key with `real.mjs` and a
  task setup file reached every bar 8 screen in eight sessions; one browser at a time.
- 2026-10-09 worked: cropping and enlarging a region (PIL, 2x to 3x) to read 9 px labels and
  measure left edges; the 1440 x 900 screenshots are at device scale 1.
- 2026-10-09 did not work: 1280 x 800 is not reachable with `real.mjs` (viewport fixed); leave it
  to the scripted audit.

- 2026-10-09 worked: reading the renderer before naming the fix. "Selection repaints the fill" was
  wrong as a mechanism; the code showed a see-through sphere around the node, which changes the
  fix from "stop tinting" to "draw only the back faces".

## Thinking

- The app's dense Figma look leans on 9 px labels and gray-on-gray. That is fine for field labels,
  wrong for states and warnings. A rule of thumb to propose: state text never below body size.
- Stale marking might be best on the values themselves (dimmed, with the strip as the action),
  matching how the drawing could dim; that is a design question for the content and interaction
  designers too.

## Sources

- `design/ui/studio/tier2/criteria.md` (bar 8 screens, bar 10 scoring)
- `design/ui/studio/tier2/answers.md` (success paths)
- `design/ui/studio/tier2/rounds/round-1/expert/visual.md` (round 1 findings)
- `design/ui/studio/tier2/rounds/round-1/insights.md` (what held after the skeptics)
- `graphty-element/src/Node.ts`, `graphty-element/src/config/GraphStyle.ts` (selection halo)
