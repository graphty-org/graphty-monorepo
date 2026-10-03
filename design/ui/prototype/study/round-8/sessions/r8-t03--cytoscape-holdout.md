# Session: import miserables.gexf and check it all arrived -- Renata (Cytoscape holdout)

Task as given: "You have never used this program before. A colleague sent you a network file of
the characters in Les Miserables and the chapters they share; you saved it as miserables.gexf in
your Downloads folder. Bring it into the program and, before you do anything else with it, check
that all of it arrived: how many characters, how many connections, and that nothing was dropped on
the way in."

All commands run from
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype.
Renders are in tmp/round-8-sessions/r8-t03--cytoscape-holdout/ (written as `OUT/` below).

## Start screen (shots/tasks/r8-t03/01.png)

> Start column on the left: "Open project or file...", Ctrl+O. Good, that's my File > Import.
> There's a Les Miserables sample on the right with "77 characters" -- I'm not touching that, I
> want my colleague's file, not theirs. "Files are read on this computer and never uploaded" --
> noted, I'll hold them to it. Usage-data banner at the bottom: no thanks.

## Step 1 -- open the file dialog

```
timeout 120 node app-b/study.mjs --try OUT/01.png task:r8-t03 --click "No thanks" --click "Open project or file..."
```

> A file picker on Downloads. miserables.gexf, 22 KB, Sep 27. There's also a
> miserables-edited.graphml from the 29th -- not mine to care about. Checkbox next to each, Open
> grayed out until I pick one. Fine.

## Step 2 -- pick miserables.gexf, Open

```
timeout 120 node app-b/study.mjs --try OUT/02.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"
```

> OK, this I like. Before it loads anything it shows me what it read: "Makes Les Miserables: 77
> nodes, 254 edges". Format GEXF, detected automatically. Node table preview: id, label, group.
> "Match report: nodes -- 77 rows; every id is unique." That's the line I'd want from Cytoscape's
> import dialog and never get.
>
> Two things I don't like. "group" is typed Abc -- text -- and the values are 1, 1, 1... In my
> world that's the Integer-versus-String thing all over again. If the file declared it as an
> integer and this made it a string, that's a silent type change. I can't tell from here which
> the file said. And it's only showing me 8 of 77 rows, which is fine for a preview.
> Also the title bar already says "Les Miserables" -- how does it know that? From the file, I
> assume.

## Step 3 -- look at the edges in the preview

```
timeout 120 node app-b/study.mjs --try OUT/03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"
```

> Edges: source, target, value. "254 rows; every edge has both ends." Good -- no dangling
> edges. value is typed numeric (#), 1, 8, 10, 6.
>
> But the header line says "Weight: none (each edge counts 1)". There is a value column sitting
> right there with weights in it. So does it use it or not? Is it going to throw my weights
> away? Direction is "As the file says", which is the right default. I'll press Load and see.

## Step 4 -- Load

```
timeout 120 node app-b/study.mjs --try OUT/04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"
```

> "Reading miserables.gexf -- 77 nodes, 254 edges..." with a progress bar. Summary on the right
> says "Reading...". I'll give it a moment.

## Step 5 -- wait (rest on Summary)

```
timeout 120 node app-b/study.mjs --try OUT/05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --hover "Summary"
```

> Still reading. Same spot on the bar. For 22 KB? Cytoscape loads this before I lift my finger.
> I'll poke at the source link -- maybe that's where the import report lives.

## Step 6 -- click "from miserables.gexf"

```
timeout 120 node app-b/study.mjs --try OUT/06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf"
```

> It took me back into the same import screen, now called "Edit: miserables.gexf", Apply
> grayed out, "Nothing has changed yet". Same numbers as before -- 77 / 254. That tells me what
> the file holds, not what landed in the graph. Not what I need. Escape.

## Step 7 -- Escape

```
timeout 120 node app-b/study.mjs --try OUT/07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf" --key Escape
```

> "Edit canceled: nothing changed", with an Undo. Fine. And it is STILL "Reading
> miserables.gexf". The canvas is empty. Let me try the Data button on the left -- I want my
> Node Table.

## Step 8 -- Data

```
timeout 120 node app-b/study.mjs --try OUT/08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Data"
```

> There it is. Whether it finished on its own or the click woke it up, I can't tell.
> Sources: miserables.gexf, 77 nodes, 254 edges. Summary on the right: Nodes 77, Edges "254
> edges, each a distinct pair", Undirected, connected components 1, average degree 6.60,
> highest 36. So 77 and 254 match the file. "Each a distinct pair" -- good, that means it didn't
> merge parallel edges, which is exactly the kind of quiet drop I check for.
>
> And now: "Weight: value, a higher value is a stronger tie." Two screens ago the import screen
> said "Weight: none". Which is it? Here I'd rather it use value, but it shouldn't tell me two
> different things.
>
> Now what bothers me. The nodes are colored by PageRank, with a legend. The attribute list has
> betweenness, degree, Louvain and PageRank in it. There's "1 note". I asked it to import a file.
> I didn't ask for PageRank. I didn't ask for a community detection. Somebody -- something -- ran
> four algorithms and styled my network before I had a chance to look at it. "Before you do
> anything else" was the whole instruction.

## Step 9 -- open the table

```
timeout 120 node app-b/study.mjs --try OUT/09.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Data" --click "Table"
```

> Node table under the canvas. "77 nodes", "Rows 1 to 77 of 77", "Columns: 9 of 9". OK, my
> count. label, Notes, group, degree, rank by degree, PageRank... Group here shows as Abc with a
> colored swatch, 2, 8, 8, 4. Still text. In the side list it says group is in use as "Color
> (gro...". So it's coloring by a categorical group -- if that's what it meant by text, maybe
> defensible, but I want to be told the file's own type.
>
> And Valjean has a "2" note icon. Javert has one. These are notes I did not write, on a file
> that came from my colleague. There's even a sentence over the table, "Valjean is first on all
> three measures". Who wrote that?

## Step 10 -- edges table

```
timeout 120 node app-b/study.mjs --try OUT/10.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Data" --click "Table" --click "Edges"
```

> "254 edges", "Rows 1 to 20 of 254", 4 columns: source, target, Notes, value. value is
> numeric and sorts as a number -- 31, 21, 19, 17. Good, it's not text. Source and target show
> the names, not the ids, which is fine. Javert-Valjean has a note on it too.
>
> So: 77 nodes, 254 edges, value stayed numeric, one component, no edges merged. On the counts,
> it all arrived.

## Step 11 -- what is this note?

```
timeout 120 node app-b/study.mjs --try OUT/11.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Data" --click "Open in Notes"
```

> "About this graph . 1 of 7 notes. Co-appearances counted per chapter, from Knuth's list."
> Dated Sep 28, 2026, 10:14. My file is from the 27th and I just opened it. Seven notes. A GEXF
> doesn't carry notes. So either this program merged my file into some project it already had --
> that sample on the start screen said "notes already added" -- or it's showing me someone
> else's work on top of mine. I can't tell which, and that's the problem. I'm stopping here.

## Wrap-up

**Did I succeed?** On the letter of the task, yes: 77 characters, 254 connections, every edge has
both ends, every id unique, no parallel edges merged, the weight column stayed numeric. The
import preview with its match report is the best part of this -- better than Cytoscape's import
dialog, which never tells me "every edge has both ends". But I don't fully trust it, for three
reasons:

1. Nowhere does it say "0 dropped" or list what was in the file that it did not keep. "Columns 9
   of 9" counts its own columns, half of which it invented. I inferred "nothing dropped" from
   matching numbers; I wasn't told.
2. The import screen said "Weight: none (each edge counts 1)" and the loaded graph says
   "Weight: value". One of those is wrong.
3. After loading, my network already had PageRank coloring, Louvain, betweenness, degree, a
   sentence of commentary and seven notes dated a day after I saved the file. That isn't my
   colleague's file anymore, and I can't see where my file ends and the program's additions
   begin. Also, "group" came in as text; I can't tell whether the file said that.

Plus it sat on "Reading..." for a 22 KB file until I clicked something.

**Single Ease Question:** 4 out of 7. The counts were easy to find; believing them was not.

**Would I use this instead of Cytoscape?** No. Not for client work. The import preview with a
match report is genuinely good and I'd steal the idea for my workshop handouts. But a tool that
runs algorithms, paints a style and attaches notes to a client's network before I've looked at
it is the opposite of what I need; I'd have to explain to a client why their figure has PageRank
on it. "Nice import screen. Then it did things to my data I didn't ask for."
