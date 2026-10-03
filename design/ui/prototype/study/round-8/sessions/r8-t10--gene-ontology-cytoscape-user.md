# Session: show every character's name on the Les Miserables sample

Participant: Joaquin (gene-ontology-cytoscape-user persona), first time using the program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

All commands ran from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t10--gene-ontology-cytoscape-user/`. Each `--try` starts again from the
start screen and replays every listed step.

## Think-aloud

**Start screen** (`shots/tasks/r8-t10/01.png`). A home page with Start, Recent and Samples.
Les Miserables is the first sample, "77 characters". A banner across the bottom asks about usage
data. I'll say no; I don't read those.

**Step 1.** Dismiss the banner and open the sample.

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t10 --click "No thanks" --click "Les Miserables"

Busy. A left list with about twenty rows: Selection, Notes, "Labels show... 1 node", PageRank,
Louvain, Shortest paths, Density, Link prediction, Top 9, Watchlist, a "For the report" folder,
Betweenness, Everything. About fourteen names on the drawing (Valjean, Javert, Fantine, Myriel,
Marius, Gavroche...). On the right, a PageRank panel with Fill, Shape, Effects, Label and Tooltip.
In Cytoscape this is Style > Label > passthrough on `name`. I need to find where that lives here.

**Step 2.** "Labels show... 1 node" looks like the obvious thing.

    ... --click "No thanks" --click "Les Miserables" --click "Labels show"

A tooltip: "Labels shown anyway (this file): Valjean. Opens in the inspector (not available
yet)." So it's a list of exceptions, one node, and I can't open it. Not what I want. Also odd:
it says 1 node, yet fourteen names are showing. Where do the other thirteen come from?

**Step 3.** "Everything" at the bottom sounds like Cytoscape's default style.

    ... --click "Everything"

Yes: "Built-in row, paints 77 nodes, 254 edges", Fill color 808080, Shape: faceted sphere, and
sections Effects, Label and Tooltip, each with a plus. This is my default style. Label it is.

**Step 4.** Click Label.

    ... --click "Everything" --click "Label"

Nothing. The word is not a button.

**Steps 5-8.** Try to find the plus by name.

    ... --hover "Add label"        -> nothing on screen is called "Add label"
    ... --click "+"                -> nothing on screen is called "+"
    ... --hover "Label"            -> tooltip: null
    ... --hover "Add Label" / "Expand Label" / "Label settings" -> nothing

The plus doesn't announce itself. I'll look elsewhere.

**Steps 9-10.** Look for a labels toggle on the toolbar under the drawing (flask, play, cube,
list, lightning bolt).

    ... --hover "Labels"      -> "Labels shown anyway (this file) Double-click to rename" (the same exception row)
    ... --hover "Show labels" / "Names" -> nothing
    ... --hover "Layers" / "Layer list" / "Experiment" / "3D" / "Run" / "More" -> nothing
    ... --hover "Layout"      -> "Layout"
    ... --hover "Actions"     -> two matches: "Quick actions" and "Actions for PageRank"

**Step 11.** Quick actions.

    ... --click "Quick actions"

A command box: "Type a command or a place". Recent: Re-run layout, PageRank, Replace with file,
Data: Attributes. Go to: Graph, Data, Views... Nothing about labels in view, and I can't type
here. Meanwhile the right-hand panel has switched to the graph itself, "Co-appearances", with
Style, Layout and Data tabs. A graph-level Style tab is where I'd look next.

**Steps 12-14.** Get to that graph Style tab.

    ... --click "Quick actions" --key Escape --click "Style"   -> back on PageRank's Style
    ... --click "Co-appearanc" --click "Style"                  -> a dropdown (Co-appearances, Compare graphs..., "New graph from..." disabled) covers it; click times out
    ... --click "Co-appearanc" --key Escape --click "Style"     -> back on PageRank again

The graph panel shows up only while that dropdown is open, and closing the dropdown takes the
panel with it. I gave up on it.

**Steps 15-17.** Row menus.

    ... --click "Everything" --click "Actions for Everything"   -> no such thing
    ... --click "Labels show" --click "Actions for Labels"      -> no such thing
    ... --click "Labels show" --hover "Actions for"             -> "Actions for PageRank Shift+F10"

Only PageRank has a "..." menu.

**Step 18.** PageRank's own "Label" section.

    ... --click "Label"   -> nothing (PageRank inspector, same dead word)

**Steps 19-20.** PageRank's menu and the "..." by the search box.

    ... --click "Actions for PageRank"
    ... --hover "Add"           -> four matches: "Add to Shape", "Add to Effects", "Add to Label", "Add to Tooltip"
    ... --hover "New row"       -> nothing
    ... --hover "List options"  -> "List options"

There it is. The plus is called "Add to Label". I'd never have guessed that name; I found it
by resting the pointer on things.

**Step 21.** Back to Everything and press it.

    ... --click "Everything" --click "Add to Label"

A small menu: "Label line" and "Show labels". I want "Show labels". No idea what "Label line"
means.

**Step 22.**

    ... --click "Add to Label" --click "Show labels"

A row appears, "Show labels", with an empty checkbox, a database icon and a minus. So choosing
it from the menu didn't switch it on; it added the switch.

**Step 23.** Tick it.

    ... --click "Show labels" --click "Show labels"

Ticked. The drawing has not changed: the same fourteen names. Like a label switch in Cytoscape
with no column mapped. Maybe "Label line" says which column the text comes from.

**Step 24.** Press the plus again.

    ... --click "Show labels" --click "Show labels" --click "Add to Label" --click "Label line"

This time no menu ("nothing on screen is called Label line"). The plus went straight to a new
line, "Above", with "Pick an attribute", and a list opened: Typed text; In use: label (Name,
Label), group (Color (group)); other attributes: betweenness, degree; Results: Louvain,
PageRank; Notes: Latest note, Note count. Types are marked Abc and #, good. "label" is the name.

**Step 25.** Pick it.

    ... --click "Add to Label" --click "label"

Every dot now has a name: Zephine, Dahlia, Favourite, Napoleon, Champtercier, Jondrette,
Child1, Child2, MotherPlutarch, Boulatruelle, Mme.Burgon. The inspector reads "Label: Above:
Abc label; Show labels: [x]". Done.

The middle is a pile of overlapping text: around Valjean, Javert and the Thenardiers, names run
into each other ("Mme.Thenardie", "Cos...", "...e.deR"). At 77 nodes that's survivable. At my 350
GO terms it would be the hairball of labels I always get. No collision handling that I can see.

## Verdict

**Succeeded?** Yes. Every character has its name next to its dot.

**Single Ease Question (1-7):** 3. The end state is right and the mapping (pick a column, see its
type) is better than Cytoscape's. Getting there took about twenty attempts:

- The row called "Labels shown anyway" is the first thing anyone would click. It's an exception
  list I couldn't open, and it says "1 node" while fourteen names are visible.
- The plus beside Label has no tooltip, and clicking the word does nothing. I found its name,
  "Add to Label", only by accident, while hovering something else.
- "Show labels" from the menu adds an unticked box. Ticking it changed nothing until I also
  added a line and picked the "label" column. Two steps for one setting, and the first one gives
  no feedback at all.
- The second press of the same plus skipped the menu and went straight to a column picker.
  Same button, different behavior.
- The graph's own Style tab vanished whenever I closed the dropdown that revealed it.

**Would I use this instead of my current tool?** Not for this. Labeling is the thing I fight
hardest in Cytoscape, and here labeling everything was harder to find and gives the same overlap.
What would move me is labeling only what matters: the significant terms, or one term's lineage.
Nothing in this task told me whether it can. The column picker that shows types and separates
results from source attributes is the part I'd want to see more of. If it also keeps a GO id a
string, that's worth a second look.
