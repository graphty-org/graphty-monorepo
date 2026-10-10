# Session r1-s12 -- Alex (regular analyst), task T17, prompt B (Les Miserables)

Prompt: "You have used this program a few times. The ready-made network of characters from Les
Miserables is already open; each tie counts the chapters two characters share. For a short essay
you care only about pairs who share 5 or more chapters. Change the drawing so it has only those
pairs, tell us how many characters are still in it, and then bring every character back."

Build: frozen build 946256efb876 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`).

Commands below use `T=design/ui/studio/tool` and `S=<this session folder>`, run from `design/ui/studio/tier2`.

## Steps

### 01 -- start
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ ../tool/with-browser.sh node ../tool/real.mjs --start $S setup:lesmis-ranked.txt`

Les Mis is open, colored and sized by PageRank, 77 nodes listed next to the PageRank row. In Gephi
this is the Filters panel, edge weight range. I don't see a filter panel here. The toolbar at the
bottom has a flask (the analysis list I know), a chart-ish icon I have not used, 3D, and a magnifier.
I'll hover the chart-ish icon to see what it is.

### 02 -- hover the chart icon
`node ../tool/real.mjs --step $S --hover-at 728,864` -> button "Layout".

Just layout. Not what I want. In Gephi the data laboratory has the edge weights; here the left rail
has "Data". I'll open that and see if it lets me cut by the weight column.

### 03 -- open Data
`node ../tool/real.mjs --step $S --click "Data"`

There it is: a "Filters" row with a plus, and the edge attribute "shared_chapters". 77 nodes, 254
edges to start. I'll press the plus next to Filters.

### 04 -- Add filter step
`node ../tool/real.mjs --step $S --click-at 276,285` -> button "Add filter step".

A "New filter step" panel on the right: Keep = "an attribute's value", Attribute = empty, "Add
step" greyed out. Fine, that reads like Gephi's attribute range filter. I'll open the Attribute
dropdown.

### 05 -- Attribute list
`node ../tool/real.mjs --step $S --click "Attribute"`

The list splits Nodes (id, name) and Edges (shared_chapters). I want shared_chapters.

### 06 -- pick shared_chapters
`node ../tool/real.mjs --step $S --click-at 1270,319` -> option "shared_chapters".

Now "Is: at least" is already chosen and there is a Value box. The small print says "Keeps edges
that pass and the nodes at their ends" -- good, that is exactly the behavior I want (characters with
no strong tie drop out). I'll click Value and type 5.

### 07 -- type 5
`node ../tool/real.mjs --step $S --click "Value" --type "5"`

Value shows 5 and "Add step" turned blue. No preview count before I commit -- Gephi would show the
count live, but fine. Clicking Add step.

### 08 -- Add step
`node ../tool/real.mjs --step $S --click "Add step"`

The drawing thinned out. Top bar says "26 of 77 nodes", the filter row on the left says
"shared_chapters is at least 5 -- 77 to 26 nodes", and the right panel says Nodes showing 26 of 77,
Edges showing 51 of 254. Three places agree: **26 characters** are left. The dots stayed where they
were rather than re-laying out, which I actually like -- I can see who dropped. (The "Components 1"
below is labeled as the whole graph, though the drawing clearly has three pieces now; I'd want
that number for the filtered view too, but it said so, so OK.)

Now bring everyone back. There's a checkbox on the filter row; I'll untick it rather than delete it,
since I'll probably want it again.

### 09 -- untick the filter
`node ../tool/real.mjs --step $S --click-at 274,326` -> input "Apply step: shared_chapters is at least 5".

Everybody is back: the row says "off", the top bar no longer shows a count, the panel says Nodes 77,
Edges 254. Prompt done: 26 characters share 5+ chapters with someone.

**Follow-up given:** "Now the same for pairs who share 8 or more chapters: how many characters are
in the drawing then? Bring every character back when you are done."

I don't want a second filter; I want to change 5 to 8 on the one I have. I'll click the filter row's
text and see if it opens for editing.

### 10 -- open the filter for editing
`node ../tool/real.mjs --step $S --click-at 180,319` -> treeitem "shared_chapters is at least 5".

The right panel shows the filter's settings with Value 5 and a "Save and turn on" button. Exactly
what I want: replace 5 with 8.

### 11 -- change 5 to 8
`node ../tool/real.mjs --step $S --click "Value" --key Control+a --type "8"`

Value now reads 8 (the panel title still says "at least 5" until I save, which makes sense).
Clicking "Save and turn on".

### 12 -- Save and turn on
`node ../tool/real.mjs --step $S --click "Save and turn on"`

Top bar "17 of 77 nodes", row "shared_chapters is at least 8 -- 77 to 17 nodes", panel Nodes
showing 17 of 77, Edges showing 19 of 254. **17 characters** at 8 or more. Unticking the box again to
bring everyone back.

### 13 -- untick again
`node ../tool/real.mjs --step $S --click-at 274,326` -> input "Apply step: shared_chapters is at least 8".

All 77 characters and 254 ties are back; the row reads "off". Done.

### end
`node ../tool/real.mjs --end $S`

## Debrief (in character)

- **Finished?** Yes, both parts. 5 or more shared chapters: **26 characters** (51 ties). Follow-up,
  8 or more: **17 characters** (19 ties). Everyone brought back both times by unticking the filter.
- **Ease: 6 of 7.**
- **What went well:** Once I found "Filters" under Data it was the Gephi attribute-range filter I
  expected: pick the edge column, "at least", a number. The hint "Keeps edges that pass and the nodes
  at their ends" told me in advance what would happen to characters with only weak ties. The count
  showed in three places and they agreed. Changing 5 to 8 was a click on the row and "Save and turn
  on" -- no re-doing the whole thing, which is what I care about week to week. The checkbox to turn
  it off without losing it is right.
- **What confused or slowed me:**
  - Finding it. My first guess was the bottom toolbar (the second icon is Layout, not filters);
    filtering living under "Data" was a guess that paid off. Nothing on the Graph page I start on
    hints that filters exist.
  - No live count while typing the value; I had to commit the step to learn the number. Gephi shows
    it as you drag the range.
  - "Components 1" in the overview is for the whole graph even while the drawing plainly has three
    separate pieces. It says so, but for an essay I'd want the filtered view's number right there.
  - The PageRank legend keeps the whole-graph range while filtered. Probably correct, but I noticed.
- No errors or broken behavior hit; nothing in the way was an implementation problem.
