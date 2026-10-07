# Session r1-s17b -- Elena (first-time product manager), Les Miserables

Task: open the ready-made Les Miserables network, go to the police inspector Javert, read what
the program knows about him, and say which characters he shares chapters with: who and how many.

Start: empty app. Tool: `node design/ui/studio/tool/real.mjs` (run from `design/ui/studio`),
session folder `rounds/round-1/sessions/r1-s17b`.

## Think-aloud and steps

**01.png -- `--start rounds/round-1/sessions/r1-s17b empty`**
Home page. "Start" on the left, "Samples" on the right, and Les Miserables is the first sample,
"77 characters". Good, that's the one they told me to use. There's a "Your data is yours" box at
the bottom; I'll get rid of it.

**02.png -- `--step ... --click "No thanks"`**
Box gone.

**03.png -- `--step ... --click "Les Miserables"`**
Ooh, OK, a cloud of blue dots with lines. Kind of pretty. No names on any of the dots though.
Right side says Nodes 77, Edges 254, Density, Components... I don't need those words. Left side
has a search box, "Find nodes, edges, values". But first I'll just click the busy one in the
middle -- everything goes into it, that's probably the main guy.

**04.png -- `--step ... --click-at 768,447`** (tool: node "Valjean")
Right panel now says "Valjean", id Valjean, name Valjean, Degree 36. So the middle one is
Valjean -- the hero, makes sense he's the most important. (Not Javert.) "Degree 36", not sure
what degree means, maybe how important he is?

**05.png -- `--step ... --click "Find nodes, edges, values" --type "Javert"`**
(Tool: nothing is called that -- the placeholder text is not the box's name; typed nothing.)
Screen unchanged.

**06.png -- `--step ... --click-at 175,90 --type "Javert"`** (tool: combobox "Find")
Typed Javert in the search box. A dropdown: under "Elements" there's "Javert", under "Values"
"Select where name is Javert (1)". I'll take the plain one.

**07.png -- `--step ... --click-at 114,153`** (option "Javert")
The drawing jumped/re-centered a bit, and a dot right of center is ringed in yellow. Right panel:
"Javert", Node, Summary: id Javert, name Javert, Degree 17. That's all it knows about him? His
name twice and a number. OK -- "Degree 17"... maybe that's the 17 people he's connected to? I'd
guess so but nothing says it. Now I need to see WHO.

**08.png -- `--step ... --click-at 1419,74`** (button "Node actions", the three dots)
A little menu: "Neighborhood", "Frame selection". Neighborhood sounds like "who's around him".

**09.png -- `--step ... --click "Neighborhood"`**
(Tool: two controls share the name -- a button and the menu item; it took the button. Same effect
from the reader's side: a neighborhood selection.)
A bunch of dots light up in yellow. Header now: "18 nodes, 0 edges", Selection. Summary: Nodes 18,
Edges 0, Edges among them 61, id "Babet (1)", name "Babet (1)". Hmm. 18 -- so Javert plus 17
others, that matches the 17 from before. But "0 edges" and then "61 edges among them"? Which is
it? And why does it only show me Babet? "(1)" -- one Babet? Is Babet the only one with a name?
I want a list of the 18.

Hesitation: stared at "Babet (1)" for a while; read it as "the first one of the list", hoping more
would show.

**10.png -- `--step ... --click-at 1393,244`** ("id Babet (1)")
Clicked on Babet hoping it opens the rest. Nothing happened.

**11.png -- `--step ... --click-at 28,132`** (left rail "Data")
Maybe "Data" is the spreadsheet. Left panel now: Sources -- "Les Mis... 77 nodes, 254 edges",
"Node t... 77 rows", "Ed... 254 rows"; Attributes -- Nodes: id, name; Edges: shared_chapters.
"shared_chapters" -- that's what the task is about! The table must be under "Node t...".

**12.png -- `--step ... --click-at 158,168`** (treeitem "Node table")
Whoa. Whole screen is now "Add to Les Miserables", "Drop a file here, or choose a file...",
Direction "As the file says", Cancel / Load. I didn't want to add anything. Did I break it? I
just wanted to see the table.

**13.png -- `--step ... --click "Cancel"`** then **14.png -- `--click-at 28,76`** (rail "Graph")
Back to the dots; the yellow ones are still lit, 18 selected. Phew.

**15.png -- `--step ... --click-at 121,124`** (left panel "Selection 18")
Clicked "Selection 18" on the left -- surely that lists them. Instead the right panel went almost
empty: just "Selection" at the top and nothing under it. Less than before.

**16.png -- `--step ... --hover-at 668,378`**
Last try: hover one of the yellow dots to see its name. Nothing appears on screen -- no name, no
tooltip. (The tool says it is Fantine, but I can't see that.) I'm not going to hover 17 dots
anyway.

**`--end`** -- stopped here.

## Where engagement dropped

After 12.png (the table click that opened "Add to Les Miserables") answers got shorter; after
15.png (empty Selection panel) and 16.png (no name on hover) she stopped trying new things.

## Verdict, in character

- **Did I finish?** Half. I found Javert and I think he shares chapters with 17 characters (it
  said Degree 17, and the neighborhood was 18 including him). But I could not get the names. The
  only name it showed me was "Babet (1)", which I think is one of them. I'd tell you "17, and one
  of them is Babet -- I couldn't find the rest."
- **How hard (1-7, 7 hardest):** 5. Finding Javert with the search was easy. Getting a plain
  list of who he's connected to was impossible for me.
- **What confused me:**
  - "Degree 17" -- nothing tells me that means 17 connected characters; I guessed.
  - "18 nodes, 0 edges" next to "Edges among them 61" -- two different edge counts for the same
    selection.
  - "Babet (1)" as the id and name of 18 people -- looks like the first name of a list I can't
    open.
  - Clicking "Node table" in Data opened an "Add to Les Miserables" file screen instead of the
    table.
  - Clicking "Selection 18" emptied the right panel instead of listing the 18.
  - No names on the dots and no name when I hover one, so the picture can't tell me who they are.
  - The search box's own label is just its grey hint text.
