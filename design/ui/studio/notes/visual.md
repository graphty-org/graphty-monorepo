# Designer notes: the Visual Designer

Role: I judge how graphty looks and reads: hierarchy, spacing, alignment, typography, color,
density and polish. I ask whether the most important thing on each screen is the most visible one,
and whether one idea always looks one way. Read this file at the start of every session; update it
as decisions land.

Last updated: 2026-10-11 (tier 2 round 3 closed; decisions read).

## Top of mind

1. (2026-10-11) Round 4 checks for me: the find box's value row with "Select where" dropped from
   its visible text must fit on both datasets (bars.mjs counts no cut row); a cut row left is a
   build fault before the freeze, not a cue for the two-line row.
2. (2026-10-11) Round 4: the new "at least" value row ("shared_chapters is 10 or more (N)") must
   look like a sibling of the "is" row -- same row shape, same glyph -- not a new pattern.
3. (2026-10-11) Round 4: the Filters toolbar icon is icon-only with a "Filters" tooltip; check it
   reads as one of the toolbar's family and that T17 first moves drop below round 3's 5 of 8.
4. (2026-10-11) Round 4: one "Start here" badge while a filter is typed, and Shortest path first
   for "path"; check no second badge appears for "linked".
5. (2026-10-11) Round 4: repeated-ties line gets the warning glyph in the danger color; check it
   matches the unmatched-row warning exactly (one idea, one look).
6. (2026-10-11) Rejected: "Filter to neighbors" as a pressed toggle. Round 2 made it a command whose
   state lives on the step's checkbox; the fix is a compact-mantine Tooltip that describes a
   disabled target, only if the check fails. Do not re-propose without new session evidence.
7. (2026-10-11) Held: the key's label-aware overlap test (`nodesInRect` with labels). Script first
   whether `autoFrame` was off; one specialist is not enough.
8. Only confirmed sev 3 left on screen: drawn names covering names and ties. graphty-element's;
   never a font, seed or offset change in the app.
9. Shift-click on a node is an element fix (Shift only, not Ctrl/Meta); no app hint, and
   re-measure "Select endpoints" in the "..." menu after it lands.
10. Words at rest never rise. Weight and position first; bar 9's counter now leaves out data names.
11. One variant per problem: lead with one mark; keep alternatives as a fallback, unstated.
12. A claim only one specialist made (mine included) is scripted on the frozen build before it is
    fixed; if the script does not reproduce it, it closes.
13. Held and still open: out-of-date mark, halo, selection two-looks, two-table "...", hop distance
    in the neighbor list, ragged digits, popover cover. No session paid for them.
14. Walk detours and every control on a screen, not only answer-key routes.
15. Never wrap `real.mjs --start` in `timeout`; start walks in the background and poll.

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
