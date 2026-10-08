# Session r1-s24 -- Elena, task T9A (Les Miserables)

Participant: Elena, a product manager with no graph training. Task: make the dots bigger for the
characters the network depends on most, then say what the sizes and colors stand for.

All commands ran from `design/ui/studio` with the session folder
`rounds/round-1/sessions/r1-s24`. The start waited several minutes for a free browser slot.

## Steps

1. `--start ... empty` -> 01.png. A start page: "Open project or file...", "New from data...",
   Recent projects (empty), and Samples, with Les Miserables first ("77 characters"). A data
   collection notice at the bottom.
   _Elena:_ "There's a box asking about usage data -- no thanks. Les Miserables is right there."

2. `--click "No thanks"` -> 02.png. Notice gone.

3. `--click "Les Miserables"` -> 03.png. A network of 77 identical blue dots. Left: a search box,
   "Selection", "Everything", and at the bottom "Analyze (Shift+A) to add results here". Right
   panel: Graph, Values tab open (Nodes 77, Edges 254, Density, Components, "Edges per ...").
   Toolbar at the bottom with five icons and no words.
   _Elena:_ "All the dots are the same. Bigger dots sounds like styling, and there's a Style tab."

4. `--click "Style"` -> 04.png. Style shows only Canvas Background, plus "Method: Force -
   Recommended" and "Seed: 1".
   _Elena:_ "Only the background and some 'Method' and 'Seed' thing. Nothing about dot size."
   (First dead end. "Seed" means nothing to her.)

5. `--click-at 659,864` (the flask icon; the tool named it "Analyze") -> 05.png. A popover list
   "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (tagged
   "Start here"), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (grayed, "Select
   a node first"), Most flow...
   _Elena:_ "Lots of words I don't know. The one-line descriptions help a little. Betweenness
   sounds like 'sitting in the middle', which might be what 'depends on' means, but PageRank says
   'Start here', so I'll trust that." (Hesitation: she could not tell which one answers "depends
   on most"; the badge decided for her.)

6. `--click-at 536,600` (PageRank) -> 06.png. A small form: "Damping factor 0.85", "Under a
   second", Run.
   _Elena:_ "No idea what damping is. Leaving it. 'Under a second' is nice to know."

7. `--click "Run"` -> 07.png. All dots turned orange; a legend box top left "Color: Influence,
   0.003299 to 0.07543". A new row "Influence 77" on the left. Sizes unchanged.
   _Elena:_ "It colored everything, but the shades are so close I can barely see a difference.
   Only a couple of dots look darker. And the dots are still the same size. I clicked PageRank --
   why is it called Influence now?"

8. `--click "Influence"` -> 08.png. Right panel now about Influence: a histogram, "Top 10"
   (Valjean 0.07543, Myriel, Gavroche, Marius, Javert, Thenardier, Fantine, Enjolras, Cosette,
   MmeThenardier), and "Made with: Influence, Oct 6, Damping Factor 0.85".
   _Elena:_ "Oh, a top 10 -- Valjean first, that makes sense, he's the hero. This is useful.
   But still no sizes."

9. `--click "Style"` -> 09.png. Nodes / Edges toggle; Fill: Color = Influence; then Shape,
   Effects, Label, Tooltip, each with a plus.
   _Elena:_ "Color says Influence. There's no 'Size' row. Is size part of 'Shape'? I'll try its
   plus." (Hesitation: size hidden under Shape.)

10. `--click-at 1419,226` (Add to Shape) -> 10.png. A menu: Size, Shape.
    _Elena:_ "There it is."

11. `--click-at 1355,262` (Size) -> 11.png. A Size row: "1" with a dropdown arrow and a
    chain-link icon. The drawing did not change.
    _Elena:_ "Size 1. Color says Influence; I want Size to say Influence too."

12. `--click-at 1352,256` (the dropdown arrow, "Open list") -> 12.png. An empty, tiny list
    opened under the field.
    _Elena:_ "An empty list? That's broken, or I'm doing it wrong." (Second dead end.)

13. `--key Escape --hover-at 1380,256` -> 13.png. Tooltip: "Size by attribute".
    _Elena:_ "'Attribute' isn't my word, but 'size by' is what I want."

14. `--click-at 1380,256` -> 14.png. A picker "Find an attribute": Influence, Influence rank,
    Influence percentile; grayed under "Cannot be used: Holds groups, not amounts": id, name.
    _Elena:_ "Plain Influence, same as the color."

15. `--click-at 1193,324` (Influence) -> 15.png. Dots now vary in size: one big dark dot in the
    middle, a big one at the bottom with a fan of spokes, some medium ones. Size row reads
    "1 to 3". Legend: "Size: Influence 0.003299 to 0.07543" (a gray wedge) above "Color:
    Influence".
    _Elena:_ "Now it shows something. The big dark ones jump out."

16. `--hover-at 768,447` -> 16.png, and `--hover-at 631,676` -> 17.png. No tooltip appeared on
    either dot; nothing on screen named them.
    _Elena:_ "I want to know who the big ones are. Hovering shows nothing. I'll go by the Top 10:
    the biggest is probably Valjean." (She cannot confirm from the drawing; no names are shown.)

17. `--end` -- session ended.

## In character, at the end

**Did I finish?** Yes, I think so. The dots are sized by "Influence", which the program worked
out when I ran PageRank.

**What do the sizes and colors stand for now?** Both stand for the same thing, "Influence": how
much the network depends on that character. Bigger and darker means more influential; small and
light orange means less. The numbers run from about 0.003 to 0.075, but I don't know what those
numbers mean -- they're not percentages and not counts. Valjean is the top one, then Myriel and
Gavroche.

**How hard was it? 4 of 7.** Getting the colors was easy once I found the flask. Getting the
sizes took a detour.

**What confused me:**

- The first Style tab had nothing about dots, just background, "Method" and "Seed".
- The flask button has no label; I only found it because the hint at the bottom left said
  "Analyze".
- The analysis list is jargon. I picked PageRank only because of "Start here"; I could not tell
  whether "depends on most" meant PageRank or Betweenness.
- I picked "PageRank" and everything after calls it "Influence". I wasn't sure it was the same
  thing.
- Running it colored the dots but didn't size them, even though "important = bigger" is the
  obvious picture. The orange shades are hard to tell apart.
- Size hides under "Shape".
- The Size dropdown opened an empty list. The thing that worked was an unlabeled chain icon
  ("Size by attribute").
- The size legend's numbers mean nothing to me, and the size row says "1 to 3", a different
  scale again.
- Hovering a big dot doesn't tell me who it is, so I can't check the drawing against the Top 10.
