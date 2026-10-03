# Session: first sitting with the Les Miserables sample -- Expert Emma

Participant: Expert Emma (network scientist, notebook user, Gephi for final figures).
Task as given: get the Les Miserables network on screen, have the program work out something
about the characters, make the drawing show it in colors or sizes, get the names written on the
drawing, and finish with a picture file for a document. Say when each part is done.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t01--expert-emma/ (01 is the start screen, shots/tasks/r8-t01/01.png).

## Step by step, thinking aloud

### 01 -- start screen
(Read shots/tasks/r8-t01/01.png)

"First thing I look for: where does the data go. Left column says 'Files are read on this
computer and never uploaded.' Top right says 'Local only'. Good, that is the sentence I want,
and it is on the first screen. Then a banner asking to collect usage data. At least it says
nothing is collected until I answer. No thanks. Samples on the right, Les Miserables, 77
characters. 'Opens with worked examples: measures, groups, paths and notes already added.' Hm.
I did not ask for someone else's analysis, but fine, I will open it."

### 02 -- open the sample
```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t01 --click "No thanks" --click "Les Miserables"
```
"OK, a graph, 77 nodes. Already colored -- legend top left says 'Color: PageRank 0.00330 to
0.0754'. A list on the left with PageRank, Louvain 6 groups, shortest paths, density, link
prediction, two groups 'for the report', a Betweenness with a crossed-out eye. That is a lot of
somebody else's work. Part one -- network on screen -- done."

"Part two technically is done for me already, which is cheating. I want to run something myself
and see the parameters."

### 03 -- I clicked "Louvain" (it opened the table tab, not the list row)
```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Louvain"
```
"A table of 6 communities with size, density, edges inside, edges leaving. Useful. But no
modularity Q anywhere, and no resolution, no seed. Which Louvain is this?"

### 04 -- the Louvain row in the list
```
timeout 120 node app-b/study.mjs --try .../04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note"
```
"Right panel: 'Run from Louvain, Sep 28'. 'Covered by PageRank for Color on 77 of 77'. So the
Louvain colors exist but PageRank paints over them. That at least tells me why I do not see
groups. Layers, I suppose."

### 05-06 -- find where to run things
```
timeout 120 node app-b/study.mjs --try .../05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
timeout 120 node app-b/study.mjs --try .../06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"
```
"The flask icon is 'Analyze, Shift+A'. Keyboard shortcut, good. The palette lists recent runs
with their settings -- 'Louvain, last run: resolution 1.0, weight value', 'PageRank, damping
0.85, weight value'. That is the thing I want to see after every run. And on the right: 77
nodes, 254 edges, undirected, weight 'value, stronger', density 0.0868, 1 connected component,
average degree 6.60, max 36, a log-log degree distribution. That is my first minute, done for
me. I am almost annoyed how much I like that."

### 07 -- betweenness, because I know its answer (Valjean on top by a mile)
```
timeout 120 node app-b/study.mjs --try .../07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
  -> ambiguous, clicked the hidden list row instead; the click timed out
timeout 120 node app-b/study.mjs --try .../07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"
```
"Weight: value (loaded weight). Higher means: Stronger / Farther / Capacity. 'Betweenness reads
a weight as distance: it uses 1/value.' THANK you. That is exactly the line networkx makes me
dig for. What I do not see: normalized or raw? Endpoints counted? That is the column I would
have to reconcile with my notebook. 'Under a second.' Run."

### 08-11 -- the run never finishes for me
```
timeout 120 node app-b/study.mjs --try .../08.png ... --click "Run"
timeout 120 node app-b/study.mjs --try .../09.png ... --click "Run" --click "Betweenness 2"
timeout 120 node app-b/study.mjs --try .../10.png ... --click "Run" --click "Nodes" --click "Betweenness 2"
timeout 120 node app-b/study.mjs --try .../11.png ... --click "Run" --hover "Betweenness 2" --hover "Notes" --hover "Analyze" --click "Betweenness 2"
```
"A row 'Betweenness 2' appears near the top with a spinner and a progress line. It said under a
second. I click the row: the right panel does not change, it still shows the graph summary, not
my run. I open the node table -- degree, rank by degree, PageRank, no betweenness column. I
wait, hover around, click again: still spinning. The drawing is still PageRank. Hovering the
name only tells me runs are numbered. So I cannot see my number, I cannot see its parameters,
and nothing on the drawing changed. That is the exact thing that makes me close a tool."

(The node table header line did say 'Valjean is first on all three measures; Gavroche is in the
top 3 on all three', which is a nice sentence, but I did not ask for it and it is not about my
run.)

### 12-14 -- try the old, hidden Betweenness instead
```
timeout 120 node app-b/study.mjs --try .../12.png ... --click "Run" --click "Betweenness"
timeout 120 node app-b/study.mjs --try .../13.png ... --click "Betweenness" --click "Move above"
timeout 120 node app-b/study.mjs --try .../14.png ... --click "Move above" --click "Show Betweenness"
```
"The old Betweenness says 'Covered by PageRank for Color -- Move above'. Clear enough. Move above:
toast says 'Moved Betweenness above PageRank, Undo'. But the row did not move in the list, the
legend still says PageRank, the nodes are still the same orange-to-brown. Oh -- its eye is
crossed out. Show it. Eye is open now. Drawing: identical. Legend: PageRank. So either the
drawing is lying or the panel is. I do not know which, and that is worse than either."

### 15-16 -- try my own Louvain run instead
```
timeout 120 node app-b/study.mjs --try .../15.png ... --click "Analyze" --click "Louvain Last run"
timeout 120 node app-b/study.mjs --try .../16.png ... --click "Louvain Last run" --click "Run as copy"
```
"Louvain opens with the last run's settings. Weight, higher means stronger, resolution 1.0.
No seed. No word on whether resolution is the multiplier on the null term. No Q. 'Run as copy'
or 'Update Louvain row' -- sensible distinction. Run as copy: the toast says 'Would add Louvain
as a copy at the top of the list, running'. Would? Did it or did it not? Nothing new in the
list."

### 17 -- hide PageRank so the groups show
```
timeout 120 node app-b/study.mjs --try .../17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Hide PageRank"
```
"Eye crossed on PageRank. Drawing unchanged, legend still 'Color: PageRank'. Nothing I do on the
list changes the picture. Fine. Deadline voice: the picture IS colored by a computed centrality,
PageRank, damping 0.85, weighted, with a legend that gives the range. I did not run it, the
sample did. I will call part two and three 'done, by the sample, not by me'. My own betweenness
run never showed up."

### 18-22 -- names on the drawing
```
timeout 120 node app-b/study.mjs --try .../18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels"
timeout 120 node app-b/study.mjs --try .../19.png ... --click "Everything" --click "Label"
timeout 120 node app-b/study.mjs --try .../20.png ... --click "Everything" --click "Add label"   -> nothing on screen is called "Add label"
  (also tried "+", "Add" -> ambiguous: Add to Effects / Add to Label / Add to Tooltip)
timeout 120 node app-b/study.mjs --try .../20.png ... --click "Everything" --click "Add to Label"
timeout 120 node app-b/study.mjs --try .../21.png ... --click "Add to Label" --click "Show labels"
timeout 120 node app-b/study.mjs --try .../22.png ... --click "Show labels" --click "Show labels"
```
"About 14 names are already on the drawing -- Valjean, Javert, Marius, Myriel and so on. I want
all 77. The 'Labels shown anyway: 1 node' row just says 'not available yet' when I click it.
The bottom row 'Everything' looks like the base style. Its Label section has a plus; the plus
offers 'Label line' and 'Show labels'. Show labels gives a checkbox, and I tick it. Drawing:
same 14 names. It does not tell me which column the text comes from or why the rest are
missing. I would have expected all 77 names, overlapping or not -- that is what I asked for."

### 23-24 -- the picture file
```
timeout 120 node app-b/study.mjs --try .../23.png ... --click "Show labels" --click "Show labels" --key Control+e
timeout 120 node app-b/study.mjs --try .../24.png ... --key Control+e --click "Export"
```
"Ctrl+E, on a guess. It worked: an Export dialog. Image .png, 'Full graph, with the legend'.
And here is my answer about labels: '64 labels hidden to avoid overlap: show list'. That should
have been next to the checkbox, not buried in export. 13 of 77 drawn. Preset 'To share -- PNG,
2x', 1802 x 1638. There is also a 'Recipe' export, which -- if it is what it sounds like -- is
the reproducibility thing I keep asking for. Footer: 'Saved to this computer only; nothing is
uploaded.' Export. Toast: 'Exported les-miserables.png to Downloads.' Part five done."

"After export the right panel jumped back to PageRank while 'Everything' was still highlighted
in the list. Small, but it is the kind of thing that makes me distrust what panel I am editing."

## Outcome, in her words

"Did I succeed? Partly. I have a PNG with a legend, colored by PageRank, 13 names out of 77. The
network was on screen in one click and the export was quick. But the 'have the program work out
something' part I did not do -- the sample did it before I arrived. My own betweenness run
spun forever, never showed a number, and never reached the drawing. Moving and showing the old
betweenness layer changed the list and the toasts but not the picture or the legend. And 'show
labels' showed the same 14 labels; the reason was only in the export dialog."

Parts, as she called them:
1. Network on screen -- done.
2. Program works something out -- done only by the sample's own PageRank; her own run did not finish.
3. Drawing shows the result -- only the sample's PageRank; she could not switch it to Louvain or betweenness.
4. Names on the drawing -- partly: 13 of 77, the rest hidden for overlap.
5. Picture file -- done (PNG, with legend).

Single Ease Question: 3 of 7.

Would she use it instead of her current tool? "Not instead of the notebook -- nothing is. Instead
of Gephi for the deck figure: maybe, if runs actually finish and repaint. What it got right is
rare: the local-only statement on the first screen and in export, the summary with counts,
density, components and degree distribution in the first minute, 'Betweenness uses 1/value',
the last-run parameters listed in the palette, a legend in the export, and a recipe export.
What would stop me: a run that says under a second and spins, a layer list whose clicks do not
change the picture, no normalization statement on betweenness, no seed and no Q on Louvain, and
a 'show labels' that silently shows 13. Patience for a bug I can reproduce is high -- this one I
can. Patience for not knowing whether the picture matches the list is zero."

## Problems observed (for the moderator)

- A new run (Betweenness) shows a spinner and never completes; the panel does not show the run
  when its row is selected; no new column appears in the node table. Estimate said "Under a
  second". Severity high.
- Layer list actions (Move above, Show, Hide PageRank) produce toasts and icon changes but the
  drawing and the legend do not change. Severity high (list and picture disagree).
- "Run as copy" toast says "Would add Louvain as a copy..."; nothing appears. Severity medium.
- Show labels checkbox gives no visible change; the overlap rule ("64 labels hidden") is only
  disclosed in the export dialog. No label source column shown. Severity medium.
- Betweenness dialog states weight-as-distance but not normalization or endpoints; Louvain shows
  resolution but not seed, convention, or Q. Severity medium for this persona.
- "Labels shown anyway" row: "not available yet". Severity low.
- Inspector switches back to PageRank after export while "Everything" stays selected. Severity low.
- The Analyze search item and a hidden list row share the name "Betweenness"; the plus beside
  Label has no visible name ("Add to Label" only as an accessible name). Severity low.
- Sample opens with someone else's analysis already applied; the task's compute step was
  pre-done, so the participant cannot tell what she did from what was there. Severity medium.
