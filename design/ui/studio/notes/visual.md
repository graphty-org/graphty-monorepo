# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-09 (tier 2 round 1 walkthrough).

## Top of mind

1. (2026-10-09) Out-of-date is the quietest state on screen: a 9 px gray strip and a gray clock
   icon, while stale colors, key and values stay at full contrast. Push for a mark at the weight
   of the thing it qualifies (on the values, the key and the tree row), not a footnote.
2. (2026-10-09) Drawn names cover each other (Chloe over Farah, Dev over Eli) and a selection halo
   can ring the dot in front. Label placement is graphty-element's; the overlap question is open,
   but a hidden name is a severity 3 whatever the layout decision.
3. (2026-10-09) Selection repaints node fill (black to olive, blue to khaki). Selection should add
   (a halo) and never replace the encoding color. graphty-element.
4. (2026-10-09) The chosen segment of compact-mantine's SegmentedControl is an outline on the darker
   ground; the unchosen ones look filled. Two-option controls (Out / All) are unreadable. Fix once
   in compact-mantine; the import page's Add / Leave out pair should use the same control.
5. (2026-10-09) The right panel has four left edges (1217, 1225, 1233, plus wrapped notes). One
   inset for headings and one for rows.
6. (2026-10-09) One table, one emphasis rule: label dim, value bright, everywhere (the edge
   inspector inverts it for From and To).
7. (2026-10-09) Lists that change shape with a setting (neighbor list at 1 vs 2 hops) and pages that
   jump (import footer moving 418 px) cost a returning reader their place.
8. (2026-10-09) Truncation: find results are hard-clipped with a scrollbar; everything else
   ellipsizes and offers the full text somewhere. Hard clip is the one to remove.
9. (2026-10-09) Device scale 1 screenshots show broken letter spacing ("Attrib ute"). Confirm at
   scale 2 before filing anything about the font.

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

## Tried: worked / did not work

- 2026-10-09 worked: walking each task's success path from the answer key with `real.mjs` and a
  task setup file reached every bar 8 screen in eight sessions; one browser at a time.
- 2026-10-09 worked: cropping and enlarging a region (PIL, 2x to 3x) to read 9 px labels and
  measure left edges; the 1440 x 900 screenshots are at device scale 1.
- 2026-10-09 did not work: 1280 x 800 is not reachable with `real.mjs` (viewport fixed); leave it
  to the scripted audit.

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
