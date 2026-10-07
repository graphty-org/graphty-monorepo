# Pilot: T8, circles of characters (Les Miserables)

Build under study: commit a1e6b91ff, build `0196d46212aa graphty@0.8.53`, opened at `/?next`,
empty start. Screenshots are in this folder, numbered by step.

## Result

**The end state is reached**, but not by the answer key's path. The key's keyboard steps for
picking Louvain (`--type Louvain`, `--key Enter`) do nothing on this build; clicking the entry
works.

What the screen shows at the end (`09.png`, `10.png`):

- The run row is called **Communities**, with **6** groups (row badge and Summary > Groups 6,
  Modularity 0.5556).
- Sizes: Group 1 20, Group 2 17, Group 3 11, Group 4 11, Group 5 10, Group 6 8 (adds to 77).
  The largest group is **Group 1, 20 characters**.
- Group 1's Members list (first 10 shown): MlleBaptistine, MmeMagloire, Valjean, Labarre,
  Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois.

So the grader values for this build are: 6 groups, largest 20, and any three of the ten names above
(or any Group 1 member the participant gets on screen another way).

## Steps

| # | Step | Screenshot | What happened |
|---|------|------------|---------------|
| 1 | `--start ... empty` | 01.png | Start page, usage card at the bottom. |
| 2 | `--click "Les Miserables"` | 02.png | Sample opens: 77 nodes, 254 edges, 1 component. The usage card is gone, never answered. |
| 3 | `--key Shift+A` | 03.png | Analyze popover opens, filter field focused. |
| 4 | `--type Louvain` | 04.png | List filters to one entry, "Louvain - Start here" under "Find groups". |
| 5 | `--key Enter` | 05.png | **Nothing happens.** Popover unchanged. |
| 6 | `--key ArrowDown --key Enter` | 06.png | **Nothing happens.** Popover unchanged. |
| 7 | `--click "Louvain"` | 07.png | Short form: Resolution 1, "Under a second", Run button. |
| 8 | `--click "Run"` | 08.png | Row "Communities 6" with Groups 1-6 and sizes in the left list; drawing recolored by group; a legend "Color: Communities" appears. Inspector still shows the Graph. |
| 9 | `--click "Communities"` | 09.png | Inspector: Summary (Groups 6, Modularity 0.5556), Sizes bar chart and list, Made with. |
| 10 | `--click "Group 1"` | 10.png | Inspector: Size 20, Made by Communities, Members "First 10". Tool printed `ambiguous` (see below). |
| 11-12 | `--wait 3000` twice, no input | 11.png, 12.png | The drawing changes in each (see below). |

No script errors, `console.error` lines or failed requests were printed at any step.

## Blockers and defects

1. **App defect -- the Analyze filter ignores Enter and the arrow keys.** Steps 5 and 6
   (`05.png`, `06.png`): with one entry left in the list, Enter and ArrowDown then Enter leave the
   popover as it was. In `graphty/src/workspace/analyze/AnalyzePopover.tsx` the popover's
   `onKeyDown` handles only Escape, and the entries are plain buttons with no active-option
   state, so the filter field has no way to pick an entry from the keyboard. A sighted mouse
   user clicks past it; a keyboard-only or screen-reader participant can only Tab through every
   entry. This also breaks the same Shift+A, type, Enter path the key gives for T7 (PageRank).

2. **Wrong answer key -- the T8 path in `answers.md`.** "`--key Shift+A`; `--type Louvain`;
   `--key Enter`; `--click "Run"`" fails at Enter on this build. Working path (6 steps):
   `--click "Les Miserables"`; `--key Shift+A`; `--type Louvain`; `--click "Louvain"`;
   `--click "Run"`; `--click "Communities"`; then `--click "Group 1"` for the members. The key also
   tells graders to look for a "Louvain" run; the row, the Made with section and Group 1's
   "Made by" all say **Communities**, and the word Louvain appears only in the popover. Graders
   should accept a row named Communities. The opening step `--click "Open the Les Miserables
   sample"` was not tried; `--click "Les Miserables"` worked.

3. **Study-tool defect (or graphty-element defect) -- the drawing keeps moving with no input and
   the tool does not say so.** Each screenshot shows the same graph turned to a new angle: compare
   `10.png`, `11.png`, `12.png` (the pink star of Group 6 is right in 10, top in 12), taken with
   only `--wait 3000` between them; the canvas differs by a pixel diff each time. The tool's
   settle check (`real.mjs`, `settle()`, which calls graphty-element's `waitForStableFrame`)
   reported nothing, so either the view rotates by design and `waitForStableFrame` resolves while
   it rotates, or the drawing never settles and the check misses it. Either way a
   `--click-at x,y` aimed from the last screenshot may hit a different node than the participant
   saw. Not a blocker for T8 (no point clicks needed), but it is for any task that clicks a dot.
   Not root-caused; reproduce by `--wait` steps on any open sample.

4. **Study-tool ambiguity -- `--click "Group 1"` matched 4 controls** (treeitem, two spans,
   button "Group 1 20": the list row, the legend entry, the inspector's Sizes entry) and took the
   first, which was the right one. A participant naming the group the obvious way gets an
   `ambiguous` print that the answer key should expect.

## Smaller observations (not blocking T8)

- Selecting Group 1 (`10.png`) does not mark its members on the canvas; the drawing only shows
  the group colors, so "show me who is in it" relies on the color legend.
- The legend "Color: Communities" (`08.png` onward) covers the top-left of the canvas and hides
  nodes under it (`08.png`, nodes near 330-550, 60-270).
- The Members list shows only "First 10" of 20 with no way shown to see the rest; enough for
  three names.
- The usage card disappeared when the sample opened (`01.png` to `02.png`) without being
  answered; the answer key asks graders to record how it was answered.
- The Overview line "Undirected, from the file: directed 0" is cut at the right edge, and
  "Edges per ..." is truncated (`02.png`). Edges are drawn with arrowheads although the graph is
  called undirected.

## Task wording

The prompt ("circles of characters who keep turning up together", "how many circles", "how big the
largest one is", "three of the characters in it") maps cleanly onto what the screen shows:
"Find groups" in the popover, the group count, the Sizes list and the Members list. No wording
problem found.
