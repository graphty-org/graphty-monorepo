# Session: label every character (Les Miserables sample) -- Dr. Chen, computational biologist

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on your
own data. Right now only a few characters have their names written on the drawing. Get every character's
name written next to its dot."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t10--bioinformatics-researcher/`. `$D` below stands for that folder's absolute
path. Every run restarts from the start screen and replays the steps listed.

Outcome: succeeded, after about twelve attempts. SEQ 3.

## Think-aloud

**01 (start screen).** Start page. Open, New from data, Samples on the right. There is a usage-data
banner at the bottom. "Only ever used by the author of the application and his Claude Code sessions"
-- no. No thanks. Les Miserables, 77 characters. Fine, that is the toy dataset everyone uses.

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t10 --click "No thanks" --click "Les Miserables"
```

**02.** That is a lot of stuff at once. A left list with Selection, Notes, "Labels show... 1 node",
PageRank, Louvain, Shortest paths, Density, a folder "For the report", and "Everything" at the bottom.
The dots are orange by PageRank -- I did not ask for that, but it is a sample, fine. About fifteen names
on the drawing: Valjean, Javert, Marius, Fantine, Myriel... the hubs, presumably. In Cytoscape this is
the Style panel, Node Label, passthrough mapping on "name". So I am looking for where labels are set.
The row that says "Labels show..." is the obvious candidate.

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels show"
```

**03.** A message at the bottom: "Labels shown anyway (this file): Valjean. Opens in the inspector (not
available yet)." So that row is a list containing one node, Valjean. That does not explain why fifteen
names are showing. "Not available yet" -- dead end. The panel on the right still shows PageRank.

The right panel has Style with Fill, Shape, Effects, Label, Tooltip. That is closer to the Cytoscape
style panel. But it is PageRank's style. I want the style for all nodes. "Everything" at the bottom of
the list sounds like the default style.

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything"
```

**04.** "Everything -- Built-in row. Paints 77 nodes, 254 edges." Good, this is the default style. Color
808080, shape "Faceted sphere" -- why is a 2D network a sphere? Whatever. Label, with a plus. Click Label.

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"
```

**05.** Nothing happened. The heading is not a control. The plus, then. I do not know what it is called.

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add label"
  -> nothing on screen is called "Add label"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "+"
  -> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Label"
  -> tooltip: null
```

**06-08.** Nothing. I assumed the plus was broken. Maybe it is PageRank's panel I should use after all,
since it "paints 77 nodes (every node with a value)".

```
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "PageRank" --click "Label"
```

**09.** Same. Let me look for a menu or a setting instead -- in some tools label visibility is a global
"show all labels" or a level-of-detail setting, which would explain only the hubs being named.
Resting the pointer on the icons: "Main menu", "List options", "Options for PageRank", "Table options".

```
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Menu"      -> tooltip "Main menu"
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "More"      -> nothing called "More"
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Options"   -> tooltip "List options"
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Settings"  -> nothing called "Settings"
timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Main menu"
timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels show" --click "Options for Labels"
```

**10.** Main menu: New project, Open, Save, Export, "Apply recipe or style file", Version history,
Select where, Settings, Keyboard shortcuts, Help. Nothing about labels. The right panel switched to the
graph, "Co-appearances", with a Data tab -- 77 nodes, 254 edges, density 0.0868. That I like, the
numbers are stated. It also has a Style tab.

**11.** The Labels row's menu: rename, select members, analyze, create set, lock, delete. Nothing like
"label all".

```
timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Settings..."
```

**12.** Settings: General, Privacy, Accessibility, Performance, Assistant, Headset. Theme says "the canvas
background is a graph setting, in the graph's Canvas section". So graph-level drawing settings live
on the graph's Style tab. Try to get there.

```
timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Co-appearances" --click "Style"
  -> could not click "Style" (a dropdown of graphs was covering it)
timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Co-appearances" --key Escape --click "Style"
timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Co-appearances" --click "Co-appearances" --click "Style"
timeout 120 node app-b/study.mjs --try $D/16.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Co-appearances" --click "Co-appearances 77 nodes" --click "Style"
timeout 120 node app-b/study.mjs --try $D/17.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Style"
```

**13-17.** Clicking the graph name opens a dropdown of graphs ("Compare graphs...", "New graph from...")
instead of selecting the graph. Every time I close something, the right panel snaps back to PageRank.
I could see the graph's Style tab but never get my pointer on it. This is the point where in a real
session I would start thinking about igraph. I go back to "Everything" and try harder with that plus.

```
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Show labels"  -> nothing called that
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Labels"       -> tooltip "Labels shown anyway (this file) Double-click to rename"
timeout 120 node app-b/study.mjs --try $D/18.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Options for Everything"  -> nothing called that
timeout 120 node app-b/study.mjs --try $D/scratch.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Add"
  -> "Add" matches "Add to Effects", "Add to Label", "Add to Tooltip"
```

**18.** Ah. The plus buttons are "Add to Label" and so on. Fine.

```
timeout 120 node app-b/study.mjs --try $D/19.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label"
```

**19.** A small menu: "Label line", "Show labels". "Show labels" is what I want.

```
timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels"
timeout 120 node app-b/study.mjs --try $D/21.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"
```

**20-21.** It added an unticked "Show labels" checkbox. Why add a property and then make me tick it?
Ticked it. The drawing did not change -- same fifteen names. So "show labels" is on and labels are not
shown. Either something else overrides it or it does not know what text to show. There is a cylinder
icon next to it; I guessed it was "pick a column".

```
timeout 120 node app-b/study.mjs --try $D/scratch.png ... --hover "column"  -> tooltip null
timeout 120 node app-b/study.mjs --try $D/scratch.png ... --hover "Remove"  -> "Remove Show labels"
timeout 120 node app-b/study.mjs --try $D/22.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "column"
```

**22.** That opened the node table and a Columns list instead (label, group, betweenness, degree). Useful
to know the table exists -- "label" is "in use" as "Name, Label". So the name column is there. Not what
I clicked for, though. Back to the plus.

```
timeout 120 node app-b/study.mjs --try $D/23.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label"
```

**23.** This time the plus did not show a menu; it added a "Label line" called "Above" with "Pick an
attribute", and an attribute list opened: label, group, betweenness, degree, Louvain, PageRank, Latest
note, Note count. That is the passthrough mapping, finally. Pick "label".

```
timeout 120 node app-b/study.mjs --try $D/24.png ... --click "Add to Label" --click "label Name, Label"  -> nothing called that
timeout 120 node app-b/study.mjs --try $D/25.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "label"
```

**25.** Every dot now has a name: Zephine, Dahlia, Listolier, Gribier, MotherPlutarch, Child1, Child2,
Jondrette. Done. The middle is unreadable -- Champmathieu, Brevet, Judge, Cochepaille piled on each other,
and around Bossuet/Courfeyrac the names overlap into mush -- but every name is written next to its dot,
which was the task.

I did not check whether the "Show labels" tick was needed at all, or whether picking the attribute alone
would have done it. I also do not know why fifteen names were showing before: no row said "label the
hubs".

## Verdict

**Did I succeed?** Yes. All 77 names are drawn. Readability in the dense center is poor, but that is a
layout and zoom problem, not the task.

**Single Ease Question: 3 / 7.** It is the right model -- a default style for every node, a Label section,
"show the value of column X" -- which is exactly Cytoscape's passthrough mapping, so once I found it it
made sense. Getting there was not easy:

- The row literally called "Labels..." is the wrong place; it is a list of one node, and its inspector
  says "not available yet".
- "Label" in the style panel is a heading, and its plus has no visible name. I took it for broken for
  several minutes.
- The plus behaves differently on the second click (menu first, then it silently adds a "Label line").
- Ticking "Show labels" changed nothing on screen. A checkbox that does nothing is the kind of thing that
  makes me distrust the rest of the panel.
- I could see the graph's own Style tab but every route to it snapped the panel back to PageRank.
- Nothing told me why the first fifteen names were showing. Labels I did not choose are like colors I did
  not choose.

**Would I use this instead of my current tool?** Not on this evidence. Labelling every node is a
ten-second job in Cytoscape (Style, Label, passthrough, name) and in igraph it is one argument. This took
me a dozen tries. What I did like: the graph's Data tab states node count, edge count, density and
components plainly; the attribute picker distinguishes my columns from computed results and notes; there
is a node table with ranks spelled out ("#1 of 77"). If those numbers come out as a TSV and there is a
scripting path, I would give it a second session as a figure viewer -- but the first five minutes did
not earn it.
