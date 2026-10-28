# Grade: session r1-s22 -- Dev, back for the class project, finds the fewest families between the Strozzi and the Pazzi (Florentine families)

**Grade: S** (success). The last screen shows a Shortest path run from Strozzi to Pazzi with
Weight "None" ("Each edge counts as 1."), and its Nodes in order are Strozzi 1, Ridolfi 2,
Medici 3, Salviati 4, Pazzi 5: the answer key's only chain of that length. Dev's answer names the
same families in the same order, with the Ridolfi, the Medici and the Salviati in between and four
marriages in all. He reached it in 9 deliberate steps with no recovery needed.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The setup (`florentine-ranked.txt`) ended where the
answer key says a ranked setup ends: the PageRank inspector, Style tab, PageRank on color and size
(`01.png`). The tool ran every step and every screenshot matches its command; the session is not
void.

## What the last screen shows (`11.png`)

- The run's Values: Summary "Path 5 nodes, 4 edges".
- Nodes in order: Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5.
- Made with: Analysis Shortest path, Ran Oct 8, 11:30:47 PM, From Strozzi, To Pazzi, Weight None
  with "Each edge counts as 1." under it; Advanced run settings closed. No Follow row, as expected
  for the undirected Florentine graph.
- The Graph tree lists Selection, Shortest path (4 hops), PageRank (15), Everything.
- The canvas draws the five path nodes and four path edges in black, thick; the other nodes keep
  their PageRank orange and size. The legend adds "Shortest path: On the path" (black) above the
  PageRank size and color keys.
- `11.png` is identical to `10.png` (same file size, same pixels on inspection): the hover on the
  top path node changed nothing on screen.

## Measures

- **Steps:** 10 after the start (`02.png` to `11.png`). The answer first appears at step 10
  (`10.png`); step 11 was a check by hover.
- **Wrong turns: 1.**
    1. Step 2 (`02.png`): pointed at the main menu icon by mistake (tooltip "Main menu: open, save,
       export, settings"); nothing changed and he moved on.
       Scrolling the Analyze list (step 4) was looking, not a wrong turn: the path entry sits below the
       visible part of the list.
- **False "done": none.** His final answer (Strozzi, Ridolfi, Medici, Salviati, Pazzi) matches the
  Nodes in order on screen. He said he could not check the drawing against the list and chose to
  trust the list; that is stated as a limit, not claimed as checked. truth-on-screen: no wrong
  claim. His essay line ("the Medici sit in the middle even of this route") matches position 3 of 5.
- **Wrong answers avoided:** he left Weight on "None" and read "Each edge counts as 1." as how it
  counted; Florentine has no weight column, so no `meaning-wrong` trap was in reach on B.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None is confirmed by this session alone; none is a build
defect.

1. **Severity 2 -- with names off, nothing on the canvas tells which drawn node is which, and
   hovering a node shows nothing.** The pointer turns into a hand but no name appears, so the
   reader cannot check the black path against the numbered list or point at it in a figure. The
   tooltip is an opt-in style row (Style tab, "Tooltip +", `03.png`), which Dev's history never
   used. Evidence: step 11 command output (`node "Pazzi", cursor pointer, tooltip null`), `10.png`
   and `11.png` identical, step 11 remark.
2. **Severity 1 -- Shortest path is below the visible part of the Analyze list.** The list opens on
   Recent and "Rank nodes and edges"; "Find paths and edge sets" comes after the group methods and
   needs a scroll. Three entries carry a "Start here" badge (PageRank, Louvain, Shortest path), so
   the badge does not single out a first choice. He found it on the first scroll and did not try
   the filter box ("wouldn't have known which word to type"). Evidence: `03.png`, `04.png`, debrief.
3. **Severity 1 (opinion, held down) -- the path paints its nodes solid black, hiding their PageRank
   color.** The size still shows (the Medici is still the largest dot) and the rest of the graph
   kept its colors, which is the intended scoping of the path's style; he only worried the figure
   would not show the Medici's rank on the path. Evidence: `10.png`, debrief.
4. **Severity 1 (opinion, held down) -- three words for one count: "4 hops" in the Graph tree,
   "4 edges" in the Summary, and "marriages" in his own words.** He worked out they agree.
   Evidence: `11.png`, debrief.

What worked: the Analyze entry's description ("The fewest steps, or the shortest route by weight,
between two nodes") matched "as few families as possible" word for word; From and To suggested the
family names as he typed and moved focus from From to To (`06.png` to `09.png`); "Made with" with
"Each edge counts as 1." gave him a sentence to cite for how the path was counted; and the path
style left the PageRank styling on every other node.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, nothing failed or
errored, and no step was spent on a broken control. The one problem worth carrying is the canvas
offering no way to name a node on hover without first adding a tooltip or labels, which leaves the
drawn result unreadable for a reader who has not set either.
