# Session: first picture from the Les Miserables sample -- screen-reader analyst (Morgan)

Task as given by the moderator: "You have never used this program before. A friend said it turns a
list of connections into a picture that shows who matters and how people cluster. You have no file
of your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

Participant: Morgan Reyes, blind data analyst, NVDA and keyboard only, NetworkX at work.

Method note for the reader: the session runs on a click-through of the skeleton. Each step below is
what Morgan would reach by keyboard and hear read out; the name in quotes is the accessible name of
the control as the tool reported it. Morgan cannot see the drawing; where the drawing changed and
no text said so, Morgan does not know it changed, and the transcript says so. Renders are in
`design/ui/prototype/tmp/round-8-sessions/r8-t01--screen-reader-analyst/`.

All commands were run from `design/ui/prototype` as
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:r8-t01 <steps>`. The common prefix used
from step 17 on is written `$S`:

```
S='--click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely"
   --click "Update Louvain row" --click "More actions" --click "Show only this row" --click "Style"
   --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "label"'
```

## Start screen (shots/tasks/r8-t01/01.png)

"Title says graphty. Headings: Start, Recent projects, Samples. Good, it has named its parts. There
is a line 'Files are read on this computer and never uploaded' and a 'Local only' button in the top
bar. That is the first thing I ask about any web tool, so it answered before I asked. I like that
more than I want to admit.

Then a dialog at the bottom: 'Your data is yours, but please help us.' Usage data. I am declining,
I always decline. 'No thanks'."

## Part 1: get the network on screen

```
01.png  --click "No thanks" --click "Les Miserables"
```

"Under Samples: 'Les Miserables, 77 characters. Opens with worked examples: measures, groups, paths
and notes already added.' Fine, open it.

It opened. There is a tree on the left. It reads Selection, Notes 4 items, Labels show... 1 node,
PageRank, Louvain 6 groups, Shortest paths, Density, Link prediction, Top 9 by degree, Watchlist,
For the report, Group 2, Group 8, Betweenness, Everything. That is a lot of somebody else's work.
There is a legend: 'Color: PageRank, PageRank 0.00330 to 0.0754.' So the drawing is already colored
by PageRank. The task says I should have the program work something out. Somebody already did. I
will do my own anyway, otherwise I am just reading the friend's homework.

Part 1 done: the network is on screen. 77 characters, I was told before I opened it."

```
03.png  --click "No thanks" --click "Les Miserables" --click "Table"
```

"I went looking for a table first, as I always do. 'Table' -- two things had that name, a button and
a section, I got the button. The table says '77 nodes, sorted by degree', and a sentence on top:
'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Columns: label,
Notes, group, Degree (full graph), Rank by degree, PageRank (full graph). Valjean 36, Gavroche 22,
Marius 19, Javert 17. That matches what NetworkX gives for this graph for degree. Good. This is the
part of the tool I would actually live in."

## Part 2: have the program work something out

```
02.png  ... --hover "Analyze"          -> tooltip "Analyze Shift+A"
04.png  ... --click "Analyze"
```

"The bottom toolbar is icon buttons. The first is called 'Analyze, Shift+A'. Named, with its
shortcut. Opened it. It has a search box 'Search, or say what to find', then 'Recent': Louvain,
PageRank, Shortest path, then 'Rank nodes and edges': PageRank (start here), Degree, Total value,
Betweenness, Closeness, Eigenvector. Each one has a one-line definition. 'Betweenness: which nodes
sit on the most shortest paths between others.'

Meanwhile the side panel now reads a summary: 77 nodes, 254 edges, undirected, weighted by value,
density 0.0868, one connected component, average degree 6.60, highest degree 36. That is exactly the
overview I want, before anything else, and it says undirected and weighted out loud. Nobody had to
count."

```
05.png  ... --click "Analyze" --click "Betweenness"
        -> ambiguous: treeitem "Betweenness" and button "Betweenness Which nodes sit on ..."; click timed out
06.png  ... --click "Analyze" --click "Betweenness Which nodes sit on the most"
```

"I asked for Betweenness and there are two of them: the old row in the tree, and the one in the
dialog. They sound the same. I had to use the long name. Once in: 'Weight: value (loaded weight).
Higher means: Stronger. Betweenness reads a weight as distance: it uses 1/value.' That is the first
graph tool that ever told me how it treats the weight before I ran it. It does not say whether the
number is normalized. That is the question I always ask, and it is not answered here. 'Under a
second.' Run."

```
07.png  ... --click "Betweenness Which nodes sit on the most" --click "Run"
08.png  ... --click "Run" --click "Betweenness 2"
09.png  ... --click "Run" --click "Table"
```

"A new row appeared at the top of the tree: 'Betweenness 2'. It said under a second. I moved to the
row: it is still a spinner, nothing in the side panel changed, the table has no betweenness column.
Nothing told me it finished, nothing told me it failed. 'Betweenness 2' -- I did not name it, and
I now have 'Betweenness' and 'Betweenness 2'. That is a dead end. Not counting it as done.

I will try the other kind of question instead: who belongs together."

```
10.png  ... --click "Analyze" --click "Louvain"
        -> ambiguous: 4 controls (tab, treeitem "Louvain, 1 note", button "Louvain Last run: ...",
           button "Louvain Which nodes form densely connect"); click timed out
11.png  ... --click "Analyze" --click "Louvain Which nodes form densely"
12.png  ... --click "Update Louvain row"
```

"Four things called Louvain. A tab, a tree row, a recent item, a catalog item. At my speed they are
one sound. I took the catalog one. 'Which nodes form densely connected groups.' Weight, Resolution
1.0. I did not see a seed field, which worries me for a community method. Buttons: 'Run as copy'
and 'Update Louvain row'. I do not want a third Louvain, so Update.

And this time it answered: 'Updated just now: 6 communities, the same as before.' Then Summary: 6
communities, 0 unconnected nodes, modularity 0.565, 'Strong grouping: far more links fall inside
the communities than between them'. Sizes: Community 1 hub Gavroche 25, Community 2 hub Valjean 17,
Community 3 hub Myriel 10, Community 4 hub Fantine 10, Community 5 hub Thenardier 9, Community 6
hub Gillenormand 6. Made with: Louvain, weight value stronger, Seed 7. There is the seed, under
'Made with'. And 'the same as before' -- it re-ran and compared with the last run for me. That is
the reproducibility check I would have done by hand.

Part 2 done: the program worked out six communities, and the message stays on the panel where I can
read it again."

## Part 3: make the drawing show the result

```
13.png  ... --click "Update Louvain row" --click "Style"
```

"Style tab of the Louvain row: 'Paints 77 nodes. Covered by PageRank for Color on 77 of 77.' Plain
words: my groups are painted but PageRank is on top of them for color. So the drawing still shows
PageRank. I would never have learned that from the canvas. Credit for saying it."

```
14.png  ... --click "Style" --click "Hide PageRank"   -> nothing on screen is called "Hide PageRank"
14.png  ... --click "Style" --click "Hide"
```

"No 'Hide PageRank'. There is a 'Hide' button. I pressed it. It hid Louvain, the row I was on, not
PageRank. The button says 'Hide' and not what it hides. I had to undo that in my head."

```
15.png  ... --click "Style" --click "PageRank" --click "Hide"
        -> ambiguous: 3 controls called "PageRank"
```

"Went to PageRank (three things called PageRank) and pressed Hide there. The PageRank row now says
it is hidden. But the legend still reads 'Color: PageRank', and the PageRank panel still says
'Covers Louvain for Color'. And the Louvain row folded back up and my 'updated just now' message was
gone. So did hiding work or not? The text says no. Not done."

```
16.png  ... --click "Update Louvain row" --click "More actions"
17.png  ... --click "More actions" --click "Show only this row"
```

"'More actions' on the Louvain row: Rerun, Run as copy, Compare with another run, Restore the
suggested look, Lay out by these groups, Lock, Remove from list view, 'Show only this row, Alt+Space',
Add note, Show members in table, Delete. A real menu, with names. 'Show only this row'.

Now the legend says 'Color: Louvain: Community 1, 25 nodes; Community 2, 17 nodes; ...' through
Community 6. And the tree says 'Showing only Louvain. Show all.' That I believe: the legend is text,
it names the communities and their sizes. Color is not the only signal; the counts are there.

Part 3 done -- I think. It took me three tries and the obvious one, Hide, did the wrong thing."

## Part 4: names on the drawing

```
18.png  ... --click "Show only this row" --click "Labels"
```

"The tree had 'Labels show... 1 node'. I opened it. 'Labels shown anyway (this file): Valjean. Opens
in the inspector (not available yet).' Not available. Second dead end of the session."

```
19.png  ... --click "Style" --click "Label"            (nothing happened)
20.png  ... --hover "Add Label" / --click "Add label"  -> nothing on screen is called that
20.png  ... --hover "Add"  -> 4 controls: "Add to Shape", "Add to Effects", "Add to Label", "Add to Tooltip"
21.png  ... --click "Add to Label"
22.png  ... --click "Add to Label" --click "Show labels"
23.png  ... --click "Show labels" --click "Show labels"   (checkbox "Show labels" now checked)
```

"Back on Louvain's Style tab. There is a 'Label' heading. Pressing it does nothing. Tabbing, the
plus buttons are 'Add to Shape', 'Add to Effects', 'Add to Label', 'Add to Tooltip'. Named, good.
'Add to Label' gives two choices: 'Label line' and 'Show labels'. I chose Show labels and got a
checkbox, 'Show labels, not checked'. I checked it.

Checked. Show which labels? Of what? Nothing said '77 names shown' or 'labels from the label column'.
I would have stopped here and asked the moderator, and that would be my one question for this task."

```
24.png  ... --click "Show labels" --click "Add to Label"
26.png  ... --click "Add to Label" --click "label"
```

"I pressed 'Add to Label' again. Now there is a 'Label line, Above: Pick an attribute' with a list:
Typed text; In use (2): label (Name, Label), group (Color (group)); Other attributes: betweenness,
degree; Results: Louvain, PageRank; Notes: Latest note, Note count. Picked 'label'. Now the panel
reads 'Above: label. Show labels: checked.'

So the names are written above each node, I assume all 77. I cannot check that from here. Part 4
done, I think, but the checkbox on its own looked finished and was not -- the step that mattered
was picking which column the label shows, and nothing told me I still had to."

## Part 5: a picture file

```
27.png  $S --click "Export"       -> nothing on screen is called "Export"
27.png  $S --hover "Menu"         -> "Main menu" and "Les Miserables, project menu"
28.png  $S --click "Main menu"
29.png  $S --click "Main menu" --click "Export..."
30.png  ... --click "show list"
31.png  $S --key Control+e
32.png  $S --key Control+e --click "Print"
33.png  $S --key Control+e --click "Cancel"
34.png  $S --key Control+e --click "Export"
```

"No Export on the page itself. 'Main menu': New project, Open recent, Open project or file Ctrl+O,
Save Ctrl+S, 'Export... Ctrl+E', Apply recipe, Version history, Select where, Settings, 'Keyboard
shortcuts ?', Help. Proper menu, shortcuts listed. Export.

The Export dialog: Image, Video, Report, Recipe, Data. 'Image .png, Full graph, with the legend.'
'64 labels hidden to avoid overlap: show list.' Show list: Thenardier degree 16, Joly degree 12,
Mabeuf degree 11 ... So 64 of my 77 names will not be on the picture. It told me in words, which
is more than most tools do, but the task was to get the names on it. Thirteen out of 77 is not
'the characters' names'.

Then I noticed the page behind the dialog: the legend reads 'Color: PageRank' again. I switched the
Look to 'Print' to see what it would say, and it spelled it out: 'In gray, no categories need
telling apart: the colors are PageRank, a ramp.' PageRank. Not my communities. I cancelled and read
the page: legend 'Color: PageRank', the side panel is on PageRank, the tree no longer says 'Showing
only Louvain'. Opening the menu -- and Ctrl+E the same way -- put my Louvain coloring back under
PageRank, and nothing said so. My names were still there.

I am not going round that loop a third time. PageRank is something the program worked out too --
who matters most -- so the picture does show a computed result in color, just not the one I chose.
Export. 'Exported les-miserables.png to Downloads.' That message is a toast; I caught it once. The
dialog has a 'Recent exports' entry, so I could find it again. Part 5 done, with a picture I would
have to describe to my colleague as 'colored by the one I did not pick'."

## Outcome

- Did I succeed? Partly. I have a PNG of the network, colored by a result the program computed
  (PageRank, which was already there when I opened it), with 13 of the 77 names on it. The result I
  computed myself -- six Louvain communities -- was on the drawing for a while and silently fell
  back under PageRank before the export. My own betweenness run never finished as far as anything
  told me.
- Single Ease Question: 3 out of 7.
- Would I use this instead of my current tool? Not instead of NetworkX. For the numbers, no: my
  scripts give me the same degree and community answers, and I still do not know whether its
  betweenness is normalized. For one thing, maybe: handing a sighted colleague a figure, because
  the tool says in words what the figure is colored by, how many nodes each color has, and which
  names were dropped from it. That is the first time a graph tool let me check a picture's claims
  without asking someone. But only if what I set on screen is what gets exported.

## What worked, in Morgan's words

- "It told me my file stays on the computer before I asked."
- "Node count, edge count, direction, weight, components, all in the summary as soon as it opened."
- "Analyze said how it reads the weight -- 1/value as distance -- before I ran anything."
- "Louvain told me the result once and left it on the panel: 6 communities, the same as before,
  seed 7. And the legend names every community with its size."
- "'Covered by PageRank for Color on 77 of 77' -- it told me in words that my result was hidden."
- "The export told me 64 names were dropped, and listed them."

## What did not, in Morgan's words

1. "The colors I set were quietly replaced by PageRank when I opened the menu to export. Nothing said
   so. I only caught it because I read the legend again." (Export dialog and main menu, renders
   28-33.)
2. "64 of 77 names dropped from the picture. The task was names on the drawing." (Export dialog,
   render 29-30.)
3. "I ran Betweenness. It said under a second. It never told me it finished, and I never found the
   numbers." (Renders 07-09.)
4. "'Hide' does not say what it hides. I hid the wrong thing." (Render 14.)
5. "Hiding PageRank changed the row but the legend and the panel still said PageRank covers my
   groups." (Render 15.)
6. "'Show labels' as a checkbox looked finished. It was not; I had to pick a column, and only found
   that by pressing the same plus again." (Renders 22-26.)
7. "Four controls called Louvain, three called PageRank, two called Betweenness, two called Table,
   two called Show labels. At my speed they are the same word." (Renders 05, 10, 15, 23.)
8. "'Labels shown anyway ... not available yet.' A row that leads nowhere." (Render 18.)
9. "My new run was named 'Betweenness 2', next to a 'Betweenness' I did not make."
10. "No word on whether betweenness is normalized." (Render 06.)
11. "'Exported to Downloads' was a pop-up I hear once." (Render 34; 'Recent exports' in the dialog
    softens it.)
