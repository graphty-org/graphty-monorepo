# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-09 (tier 2 round 2 expert walkthrough on build 8f0d5a6f7791).

## Top of mind

1. (2026-10-09, round 2 walk) 27 confirmed visual findings (round 1: 30); one severity 3 open,
   drawn-name overlap (graphty-element, deferred). Report: `tier2/rounds/round-2/expert/visual.md`.
2. (2026-10-09) Selection halo: own color now kept, but the halo is a see-through disc that tints
   the node BEHIND it (Farah reads mustard behind Chloe's halo, `round-2/expert/visual/path/07.png`)
   and big discs cover edges and labels when many are selected. Next fix: an opaque ring (or a
   ring drawn only outside the node's silhouette), not a translucent sphere. graphty-element.
3. (2026-10-09) Selection has two looks: yellow halo on nodes, blue double rails on edges. One idea,
   one look -- propose one selection color for both (graphty-element default style).
4. (2026-10-09) Out-of-date mark: the key words ", out of date" exist but in the key's smallest
   type, same color; the inspector strip now has a blue Rerun, so severity 2. Filter-stale says
   "on 20 nodes" -- a second phrasing. Watch whether sessions see either before acting.
5. (2026-10-09) The two-table source's inspector lacks the "..." menu the single-file one has
   (`twotables/11.png` vs `replace/05.png`). Check it before the next round: a T4-then-T21 reader
   cannot reach Replace from the header there.
6. (2026-10-09) Long names: the find list is fixed; the inspector's selected-edges list still cuts
   names so rows read identical and its "Edge" header collapses to one stroke. Same rule, new place.
7. (2026-10-09) Verified fixed: segmented chosen state, import footer jump, left-out icon,
   histogram width, Overview note alignment, find hint in monospace, source "..." menu.
8. (2026-10-09) Still parked polish: three left edges in the right panel (1217/1225/1233), ragged
   Top 10 digits, header colors, label-vs-value emphasis rule. Bundle them as one consistency pass
   when the round rule allows polish.
9. (2026-10-09) Canvas key does not avoid what is drawn under it; which name it covers depends on
   the unseeded layout -- never cite a specific collision as a count.
10. (2026-10-09) Edge width reading thinner than its number is NOT a defect until a script measures
    it (`EdgeMesh.ts` scales by *20 and /40).
11. (2026-10-09) A pass in a simulated study is weak evidence. Judge visual findings by
    screenshots, not by session counts.
12. (2026-10-09) Device scale 1 screenshots break letter spacing; confirm at scale 2 before filing
    a font fault.
13. (2026-10-09) Walk detours, not only answer-key routes: the halo-behind and the missing source
    menu were both off the main path (many selected; a two-table source).

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

## Tried: worked / did not work

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

- `design/ui/studio/tier2/criteria.md` (bar 8 screens, bar 10 scoring)
- `design/ui/studio/tier2/answers.md` (success paths)
- `design/ui/studio/tier2/rounds/round-1/expert/visual.md` (round 1 findings)
- `design/ui/studio/tier2/rounds/round-1/insights.md` (what held after the skeptics)
- `design/ui/studio/tier2/rounds/round-1/decisions.md` (round 2 change list and deferrals)
- `graphty-element/src/Node.ts`, `graphty-element/src/config/GraphStyle.ts` (selection halo)
