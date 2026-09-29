# Keyboard walk -- screen-reader analyst session

Participant: Morgan Reyes (composite persona: blind senior analyst, NVDA on Windows, Chrome,
keyboard only, NetworkX user). Simulated session.

Moderator's task, as given: "Without the mouse, start at TP53, find its best-connected neighbour,
tell me that neighbour's score, and select two of its neighbours."

Screen: the keyboard walk mock on the protein network (33 of 300 nodes shown, filtered). What
Morgan "hears" is taken from the mock's live-region and focus text; the magenta strip in the
renders is that text for a sighted observer. Morgan does not see the screen.

Mock note for the analysts: the renders in shots/ (for example the "Selection of two" frame) are
older than the page. They say "by confidence" and "Shift+Up back"; the page now says "by weight"
and names Shift+Enter as the back key, with Shift+Up as a second binding. This transcript follows
the page.

## Transcript (think-aloud)

**Page title.** "Keyboard walk on the protein network." Fine. H for headings... I get the region
names, not much else. Graphs, Sets and paths, Styles, Views. Nothing that says "graph drawing" as
a heading. Moving on; I'll Tab.

**Tab order.** Rail first -- "Main, toolbar. Graph, 1 of 4." Tab: "Graphs, list. ppi-core-300..."
Tab, Tab, the inspector, Help, Tools toolbar, then the drawing. Seven or so stops. Every one
announced as one stop with arrows inside. That's the grown-up way to do it. Shift+Tab goes back the
way it came. Good.

**Landing on the drawing.** It says: "Graph drawing, application. Protein interactions, 33 of 300
nodes shown. Nothing selected. The walk starts at TP53. Shift+Arrow: next neighbor. Space: select.
Question mark: keys."

-- "Application." That's the word that switches my reading keys off. I don't love it. But in the
same breath it told me the start node, which is TP53, which is what I was asked for, and it told me
the three keys I need. So it's earned a minute. "33 of 300 shown" -- so something is filtered. I'll
keep that in my head; that's going to matter.

**Keys first.** Question mark. "Keys, dialog." I arrow through it. On the canvas: arrows move the
view, Shift+Down starts the walk, Enter opens the inspector. Walking: Shift+Right next neighbour,
Shift+Left previous, Shift+Down into this node's neighbours, Shift+Enter back one step, Shift+Home
back to the start. "O: Order: weight, degree, name." Selection: Space. Leaving: Esc ends the walk,
again clears the selection; Tab to the Nodes table.

-- OK. That's a keymap I can write in my text file. "Back to the start" as its own key -- somebody
listened. The O key is the one I want: "best-connected" to me means degree, and I bet it doesn't
start on degree. Esc to close the sheet.

**First step.** Shift+Down. "PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight
0.98, degree 5, rank 247 of 300. Shift+Enter goes back, Esc ends the walk, Tab leaves the canvas,
? lists the keys."

-- Called it. It's ordered by weight. Weight of what? The edge, I assume, TP53 to PALB2. It doesn't
say what the weight is -- confidence? a count? I only know it's "confidence" because I tabbed past
"edge weight, confidence" in the inspector earlier and happened to remember. And "rank 247 of 300"
-- rank by what? Degree, I'd guess. It doesn't say. That's two undefined numbers in one sentence.
The exits tail is long, but it said it once, and it hasn't said it again. Fine.

**Reorder by degree.** O. "Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53,
weight 0.80, degree 21, rank 7 of 300."

-- There it is. Important word first -- "Neighbors by degree" -- then the node. UBC, degree 21. So
TP53's best-connected neighbour is UBC. Let me press Shift+Right once to be sure it's descending:
"RPS8, 2 of 32, weight 0.42, degree 17, rank 11 of 300." Yes, going down. Shift+Left: "UBC, 1 of
32, weight 0.80, degree 21, rank 7 of 300." Same numbers the second time. Good.

**Answering the moderator.** "UBC. Degree 21, rank 7 of 300. The edge from TP53 carries a weight
of 0.80, which I think is confidence." -- And I'd like to ask you which of those is "the score",
because the tool gave me three numbers and named none of them properly.

-- Also: is 21 the degree in the 300-node graph or in the 33 I'm looking at? It said "33 of 300
shown" when I arrived. I'm about to find out.

**Into UBC's neighbours.** Shift+Down. "TP53, neighbor 1 of 3 of UBC in filtered graph, by
degree, highest first. Weight 0.80, degree 32, rank 2 of 300, where you came from."

-- There. "1 of 3 of UBC in filtered graph." So UBC has 21 neighbours in the real graph and 3 in
this view. So "degree 21" is the full-graph degree and the walk only walks the filtered one. It
told me, to be fair -- "in filtered graph" -- but only here, one step later, not when it read me
"degree 21". If I'd stopped at the answer I'd have reported 21 and never known the view only has
three. That's the normalised-betweenness trap in a new coat. And "where you came from" on TP53:
that's genuinely useful. I know where the door is.

-- Which two of its neighbours? The task says two of its neighbours. TP53 is one, technically, but
that's the node I came from and I don't think that's what you meant. I'll take the other two.

**Selecting.** Shift+Right. "NDUFS7, 2 of 3, weight 0.73, degree 9, rank 94 of 300." Space.
"NDUFS7 added. 1 selected on canvas. ] and [ step through the selection."

Shift+Right. "RPL14, 3 of 3, weight 0.79, degree 7, rank 172 of 300." Space. "RPL14 added. 2
selected on canvas."

-- Wait. By degree, NDUFS7 before RPL14, fine. But RPL14's edge weight is 0.79 and NDUFS7's is
0.73 -- I only notice because I'm in degree order now. Not a problem, just noting the order word
stays on "by degree" for the rest of the walk. I'd forget that next time and read "1 of 3" as
"strongest".

**Checking what I picked.** ]. "NDUFS7, selected 1 of 2." ] again. "RPL14, selected 2 of 2."
-- Good. I can hear my selection without leaving. That is the thing I never get.

**Checking it somewhere I can reread.** Tab. "Nodes table, filtered graph, 33 rows, sorted by
degree. NDUFS7, Complex I, degree 9, rank 94 of 300, selected. Row 17 of 33. 1 of 2 selected."
-- The walk ended when I tabbed out; it didn't tell me that, but the keys sheet did. The table
landed on my selection, not on row 1. And the row says "selected". I can arrow down and find RPL14
with "selected" on it. That's where the answer lives after the announcement is gone. Good.

Column headers: "degree, 4 to 32" -- so the table's degree column is also the full-graph degree
(UBC shows 21 here too) while the header range says 4 to 32 and the caption says "Filtered graph".
Nothing in the header says "full graph". I'd have to know.

## Result

- Task completed: yes. TP53's best-connected neighbour is UBC (degree 21, rank 7 of 300; edge
  weight 0.80). Selected NDUFS7 and RPL14, two of UBC's neighbours.
- Time: a few minutes, most of it reading the key sheet. No dead ends. Did not ask the moderator
  what was on screen.
- Single Ease Question: 5 of 7.

## Problems

1. **"Best-connected" is not the default order.** The walk opens in edge-weight order, so the
   first neighbour it offers (PALB2, degree 5) is the strongest edge, not the best-connected node.
   Morgan found O only because they read the key sheet first; someone who didn't would have
   reported PALB2. Severity 2.
2. **Undefined numbers in every step.** "Weight 0.98" does not say what the weight is (the
   inspector says "edge weight: confidence", but the walk never does). "Rank 247 of 300" does not
   say rank of what, or how ties are ranked (RPL14 and four others all say 172). For someone who
   checks every number against NetworkX, an undefined number is a number they will not report.
   Severity 3.
3. **Degree is the full graph's, the walk is the filtered graph's, and the tool says so a step
   late.** UBC is read as "degree 21" with no qualifier; only on stepping in does "1 of 3 of UBC in
   filtered graph" reveal that 18 of those 21 are not reachable here. The Nodes table's "degree"
   column has the same gap. Severity 3.
4. **"Score" has no single answer.** The step reading gives weight, degree and rank side by side
   with none named as the node's score, so the analyst had to guess what the moderator meant.
   (Partly the task's wording.) Severity 1.
5. **The order word does not travel.** After O, every later step list is in degree order, but
   short step readings ("RPL14, 3 of 3, ...") no longer say so; next session the analyst would
   read "1 of 3" as "strongest". Severity 1.
6. **"Application" on entry.** Accepted this time because the entry reading names the way out and
   the key sheet exists, but it is the word that makes screen reader users wary. Severity 1.

## In Morgan's words

"It told me where I was, where I came from, and how to get back to the start. That's three things
no graph tool has ever told me. Then it read me 'degree 21' about a node that has three neighbours
in the view I'm walking, and didn't mention it until I stepped in. If you're going to give me
numbers, tell me what they're numbers of."

**Would I use it instead of my scripts?** Not instead. Alongside, for one thing: the manager's
"who's connected to this clinic, and through whom?" I can answer that here faster than I can write
the NetworkX for it, and I can hear my selection back. For anything that ends up in a report I'd
still export the table and check the degree and the ranks in Python, because until the tool says
what "weight" and "rank" are and which graph the degree was counted on, it's a rumour.
