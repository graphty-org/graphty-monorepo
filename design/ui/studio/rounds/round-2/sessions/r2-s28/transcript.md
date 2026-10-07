# Session r2-s28 -- Dev (class-project student), T9 Prompt A (Les Miserables)

Task: use the ready-made Les Miserables network; make the dots bigger for characters the network
depends on most; then say what the sizes and the colors now stand for.

Commands run from design/ui/studio with S=rounds/round-2/sessions/r2-s28.

## Steps

Step 1. `node tool/real.mjs --start $S empty` -- waited for a free browser slot first.
  Saw (01.png): a start page. Left: Open project or file, New from data. Right: Samples, with
  "Les Miserables, 77 characters. Good for a first look at communities and who holds the story
  together." A "Your data is yours" usage-data box at the bottom.
  Dev: "Okay, the sample is right there, nice. I'll say No thanks to the data thing and open Les
  Miserables."

Step 2. `--step $S --click "No thanks" --click "Les Miserables"` -> 02.png
  Saw: the drawing right away -- 77 blue-purple dots, all the same size and color, gray lines.
  Left panel: "Graph Les Miserables", a find box, Selection, Everything, and at the bottom
  "Analyze (flask icon) in the toolbar (Shift+A) to add results here". Right panel: Overview with
  Nodes 77, Edges 254, Density, Components 1. Bottom toolbar: flask, a chart icon, 3D, magnifier.
  Dev: "Oh nice, it drew it already. Everything is the same size though. In the tutorial the next
  step is statistics -- betweenness centrality. There's no 'Statistics', but the hint says
  Analyze is the flask. I'll click the flask."

Step 3. `--step $S --click-at 679,863` (the flask) -> 03.png. Printed: button "Analyze".
  Saw: a list "Rank nodes and edges": Degree, Betweenness ("Which nodes sit on the most shortest
  paths between others"), Edge betweenness, Closeness, PageRank with a "Start here" tag,
  Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (grayed, "Select a node
  first"), Most flow...
  Dev: "Wait -- Betweenness! That's the tutorial word. PageRank says 'Start here', hmm, but my
  slides say betweenness centrality is the one for who the network depends on, the go-betweens.
  I'll go with Betweenness."
  Hesitation: brief, between the "Start here" tag on PageRank and the tutorial's Betweenness.

Step 4. `--step $S --click "Betweenness"` -> 04.png
  Saw: a small card "Betweenness -- Which nodes sit on the most shortest paths between others.",
  a collapsed "Advanced", "Under a second", and a blue Run button.
  Dev: "Okay, a Run button and it says under a second. I won't touch Advanced. Run."

Step 5. `--step $S --click "Run"` -> 05.png
  Saw: all the dots turned orange, a few darker (the one in the middle almost black-brown, one at
  the bottom left darker). A legend at top left: "Color: Bridges, 0 [orange bar] 1624". The left
  list now has "Bridges 77" between Selection and Everything. Dot sizes did not change.
  Dev: "Wait, it's called Bridges now, not Betweenness? I guess bridges = betweenness, people who
  sit between. Okay the colors mean something now, darker is more. But the dots are all still
  the same size, and the task wants the important ones bigger. In Gephi this is 'Ranking' ->
  size. I'll click on Bridges in the left list to see if it has a size option."
  Hesitation: the rename from Betweenness to Bridges -- he had to guess they are the same thing.

Step 6. `--step $S --click "Bridges"` -> 06.png
  Saw: Bridges highlighted with an eye icon. The right panel became "Bridges -- Measure from
  Bridges, Oct 6" with a Style tab: Nodes/Edges switch, Fill (+), Color = Bridges (-), Shape (+),
  Effects (+), Label (+), Tooltip (+).
  Dev: "Okay so the color comes from Bridges. I'm looking for Size, there's no 'Size' row. Size
  is kind of a shape thing? I'll press the + next to Shape."
  Hesitation: no row called Size; guessed Shape.

Step 7. `--step $S --click-at 1419,234` -> 07.png. Printed: button "Add to Shape".
  Saw: a little menu with Size (highlighted) and Shape.
  Dev: "Yes! Size is in there. Click Size."

Step 8. `--step $S --click "Size"` -> 08.png
  Saw: a new row "Size [1] (chain-link icon) (-)". The number box has focus. The dots did not
  change.
  Dev: "Hmm, it's just the number 1. That would make ALL dots the same size. Color has 'Bridges'
  in its box, so Size should be hooked to Bridges too. The little chain-link icon next to it --
  link to data? Let me hover it first to see what it says."

Step 9. `--step $S --hover-at 1380,264` -> 09.png. Printed: button "Size by attribute", tooltip
  "Size by attribute".
  Dev: "'Size by attribute' -- that's the Gephi ranking thing. Clicking it."

Step 10. `--step $S --click "Size by attribute"` -> 10.png
  Saw: a "Size by attribute" popup with a find box, a "Bridges" group: Bridges, Bridges rank,
  Bridges percentile; then "Cannot be used: Holds groups, not amounts" with id and name grayed.
  Dev: "Okay -- Bridges, rank, percentile. Just plain Bridges, same as the color, so more bridge
  = bigger dot."

Step 11. `--step $S --click-at 1189,372` (option "Bridges") -> 11.png
  Saw: the dots are different sizes now. One big dark-brown dot in the middle stands out, a
  medium one at the bottom left (the center of the fan), and a slightly bigger one up top.
  Most others are small. The Size box reads "1 to 3". The legend at top left now has two rows:
  "Size: Bridges 0 -- 1624" (gray wedge) and "Color: Bridges 0 -- 1624" (orange bar).
  Dev: "Oh nice, that's it! The big one in the middle is the one everything goes through.
  The sizing part is done. I'd like to know who the big one is for my sentence -- I'll hover it."

Step 12. `--step $S --hover-at 768,447` -> 12.png. Printed: node with id "Valjean", tooltip: null.
  Saw: nothing changed on screen -- no name, no tooltip pops up over the big dot. (The tool
  reported the node underneath is "Valjean", but nothing on screen showed it to me.)
  Dev: "Hmm, hovering doesn't tell me who it is. That's the labels step though, and the task
  only asks what the sizes and colors mean, so I'll stop here."
  Hesitation: expected a name on hover; there was none.

Step 13. `node tool/real.mjs --end $S` -- session closed.

## Result, in character

Did I finish? Yes. The dots are now sized by "Bridges", the result of the Betweenness analysis,
from small (0) to big (1624): the bigger the dot, the more the network depends on that character
to connect everyone else. The color is ALSO Bridges -- light orange for 0 up to dark brown for
1624 -- so size and color say the same thing twice. The legend at the top left says exactly
that: "Size: Bridges 0 -- 1624" and "Color: Bridges 0 -- 1624".

The sentence I'd put in the essay: "I ran betweenness centrality ('Bridges' in graphty): one
character in the middle of the network has by far the highest score (up to 1624), so the
network depends on him most to connect the other characters; both dot size and dot color show
this score." (I'd need the labels step to name him -- hovering the big dot showed no name.)

Ease: 6 out of 7 (7 = very easy). Twelve steps, no dead ends. The flask hint on the left told
me where Analyze was, Betweenness was in the list by its tutorial name, and Run colored the
graph by itself.

What confused me:
- The analysis is called "Betweenness" in the list but "Bridges" everywhere after I ran it
  (the left list, the legend, the Color box). I had to guess they were the same thing.
- There's no "Size" row in the style panel; Size is hidden under the + next to "Shape". I found
  it on the first guess but only because size felt shape-ish.
- Adding Size first gave me a plain number "1" that changed nothing; I had to notice the little
  chain-link icon ("Size by attribute") to hook it to Bridges. Color was hooked automatically, so
  I expected Size to offer Bridges right away too.
- "Bridges rank" and "Bridges percentile" -- I didn't know which to pick, took plain Bridges.
- PageRank had a "Start here" tag, which made me second-guess going with Betweenness.
- Hovering the biggest dot shows no name, so I could not say who the key character is without
  going looking for labels.
