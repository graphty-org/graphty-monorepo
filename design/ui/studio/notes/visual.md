# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-09 (tier 2 round 1 closed: insights and decisions read).

## Top of mind

1. (2026-10-09) Round 2 starts only after a dry run that walks each task's commonest detours, by
   pointer AND keyboard, on the new frozen build. Every build defect participants met in round 1
   was on a detour (styling an edge from a run's Style tab, recoloring a selected node, selecting a
   path node). My visual walk must cover those same detours, not only the answer key's routes.
2. (2026-10-09) Selection halo (graphty-element `Node.ts`): draw only back faces so the node keeps
   its color; check the camera-inside case. Severity 2 after the skeptics. Watch in round 2: black
   path nodes read black, a new fill reads its own color while selected.
3. (2026-10-09) Out-of-date: the team chose ONE mark -- the canvas key title gains ", out of date"
   from `run.stale`. My warning color, dimmed Top 10, colored clock and dimmed range were rejected
   as four marks for one state. Watch: whether that quiet text is seen without the prompt hinting.
4. (2026-10-09) Source inspector gets the same header "..." menu as the other inspectors (Replace,
   Edit source). Watch: is it found at rest; does it look identical to the other inspectors' menus.
5. (2026-10-09) Find's empty line becomes a rule hint with the example in monospace. Watch its
   size and contrast: it must not be the gray small text "No match" was.
6. (2026-10-09) Find result rows: long names end in "..." and show whole on hover; no sideways
   scroll. If the row is compact-mantine's, the fix is there (`EllipsizedName`).
7. (2026-10-09) Deferred, not dropped: drawn-name overlap and frame-to-fit (graphty-element, filed
   as one issue; bar 10 expected to keep failing on it); SegmentedControl chosen state and Toast
   role (compact-mantine, later round so round 2 stays attributable).
8. (2026-10-09) Round 2 rule: words and marks at rest do not rise except the one menu and the one
   key mark; each change adds at most one door. Do not propose extra visual emphasis this round.
9. (2026-10-09) Canvas key does not avoid what is drawn under it (kept, severity 2); which name it
   covers depends on the unseeded layout -- never cite a specific collision as a count.
10. (2026-10-09) Edge width reading thinner than its number is NOT a defect until a script measures
    it (`EdgeMesh.ts` scales by *20 and /40); "thick only while selected" was refuted.
11. (2026-10-09) A pass in a simulated study is weak evidence; a first move that matches a
    persona's history says little. Judge visual findings by screenshots, not by session counts.
12. (2026-10-09) Device scale 1 screenshots break letter spacing; confirm at scale 2 before filing
    a font fault. Polish (left edges, ragged digits, header colors) stays parked.

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
