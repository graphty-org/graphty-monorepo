# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-10 (tier 2 round 2 closed: insights and decisions read).

## Top of mind

1. (2026-10-10) Round 3 watch: does a "+" Color or Width on a selection's layer now start at the
   highlight look (`session.styles.highlightStyle`, app black, 3x width) and stay visible after the
   selection clears? Pixel-check it myself on the frozen build; this was my top round 2 fix.
2. (2026-10-10) Round 3 watch: a rule selection's layer is named by its rule ("minutes >= `10`");
   check the key ellipsizes it and shows it whole on hover, and that backticks do not read as noise.
3. (2026-10-10) Round 3 watch: the doubling warning line sits above Load in body text with Replace
   beside it -- check it is not the smallest text on the page and Load is not still the only blue.
4. (2026-10-10) Round 3 watch: the find box's "No match" plus example line, and the rule as Enter's
   option -- the marked option must look like every other Enter option (one idea, one look).
5. (2026-10-10) Round 3 watch: extra-small checkbox's invisible 24 px hit area must not change the
   drawn box or steal the next 20 px row's click.
6. (2026-10-10) Words at rest must go down (bar 9 b failed: every tier 2 screen rose). Any visual
   proposal I make adds no word at rest; prefer weight and position over a new label.
7. (2026-10-10) Round 2 evidence: routes that worked are weak (participants read the facilitator
   file); problems found anyway are robust. Only cite round 2 problems, never round 2 successes.
8. (2026-10-10) Edge width is not a renderer bug: W draws as 10 x W / d px. It is on the owner's
   breaking list; the app must never scale widths to hide it.
9. (2026-10-10) Still severity 3 and not fixed: drawn names covering names and ties
   (`r2-s52/02.png`, "Stadium" over its tie). graphty-element, reported as a class, unseeded layout.
10. (2026-10-10) Held, re-measure clean before touching: out-of-date mark, Replace's place,
    "Higher means" at load, "Components 1" under a filter, halo, selection two-looks.
11. (2026-10-10) Dry runs now start from pilot routes, not last round's detours; when I walk,
    walk where pilots went plus every control on the screen, and fix before freeze.
12. (2026-10-10) "Stand out" removed from T22/T24 prompts: expect fewer styling detours, so the
    styling fix may be met only by the dry run -- make sure it walks it.
13. Parked polish: three left edges in the right panel, ragged Top 10 digits, header colors,
    label-vs-value rule, two-table inspector missing "...", inspector edge list cutting names.
14. Device scale 1 screenshots break letter spacing; confirm at scale 2.
15. Walk detours, not only answer-key routes.

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

- `design/ui/studio/tier2/rounds/round-2/insights.md`, `decisions.md` (round 3 change list)

- `design/ui/studio/tier2/criteria.md` (bar 8 screens, bar 10 scoring)
- `design/ui/studio/tier2/answers.md` (success paths)
- `design/ui/studio/tier2/rounds/round-1/expert/visual.md` (round 1 findings)
- `design/ui/studio/tier2/rounds/round-1/insights.md` (what held after the skeptics)
- `design/ui/studio/tier2/rounds/round-1/decisions.md` (round 2 change list and deferrals)
- `graphty-element/src/Node.ts`, `graphty-element/src/config/GraphStyle.ts` (selection halo)
