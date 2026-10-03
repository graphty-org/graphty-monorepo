# Session: leave a note on a circle and on a traced chain (Joaquin, the Gene Ontology Cytoscape user)

Task as given by the moderator: "The Les Miserables network is open with the program's circles of
characters shown (example data, not your own). Leave one reminder on the whole circle around the
bishop Myriel, and one on the chain the program already traced between Valjean and Javert as a
whole, not on any one character. Then locate both reminders again."

Start screen: shots/tasks/r8-t23/01.png. Renders: tmp/round-8-sessions/r8-t23--gene-ontology-cytoscape-user/NN.png.
All commands were run from design/ui/prototype; `D` is the render folder above (absolute path).

## Step 1 -- look at the start screen (01.png)

Think-aloud: "OK, Les Mis co-appearance network, everything is orange because PageRank is on top.
On the left there's a list: Louvain, 6 groups, Community 1 to 6. That's my clustering -- 'circle'
must mean a Louvain community. There's also a 'Shortest paths' entry with 'Valjean t...' and
'Myriel to...'. So the chain is already there as a row. Good. Which community is Myriel's? The
names are truncated -- 'Community...', 'Comm...'. I have to guess. Myriel is the hub of that little
star at the upper right; I'll click him first and see."

## Step 2 -- click Myriel

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t23 --click "Myriel"

Result (02.png): it selected the "Myriel to Javert" path row, not the bishop and not his circle.
"Hm. Not what I wanted, I clicked a name and got a path. Fine, the side panel at least says 'Path,
from Shortest paths'. Not my circle though. I'll guess at the communities instead."

## Step 3 -- hover the truncated green row to read its name

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t23 --hover "Comm..."

Result: nothing on screen is called "Comm...". "Of course, I don't know what it's actually called.
The ten-node rows are the right size for that star. Let me just try Community 3."

## Step 4 -- click Community 3

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t23 --click "Community 3"

Result (03.png): right panel "Community 3, Group from Louvain", Summary: Size 10 nodes, Hub
"Myriel, 9 links inside", members Myriel, Mlle.Baptistine, Mme.Magloire, Napoleon, ... and at the
bottom "Notes: 2 notes -- Open in Notes". "There it is. 'Hub: Myriel' is exactly what I needed --
that's how I'd confirm it in Cytoscape too, by looking at the members. Somebody already left two
notes here. I need a third."

## Step 5 -- Add note on the community

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t23 --click "Community 3" --click "Add note"

Result (04.png): the left side switched to a Notes list with a compose box "Note on: Community 3",
a text field and Save (Ctrl+Enter). "Good, it attached the note to the group as a whole, it says so
in the chip. That's the thing I care about -- it's not stuck on Myriel."

## Step 6 -- write and save it

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t23 --click "Community 3" --click "Add note" --type "Bishop Myriel's circle: check whether Napoleon belongs here" --click "Save"

Result (05.png): "8 notes in this graph", my note on top with the "Community 3" chip and today's
date; the right panel now says "3 notes". "Done with the first one."

## Step 7 -- back to the layer list, pick the Valjean-Javert chain, Add note

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t23 --click "Community 3" --click "Add note" --type "Bishop Myriel's circle: check whether Napoleon belongs here" --click Save --click Graph --click "Valjean to Javert" --click "Add note"

Result (06.png): right panel "Valjean to Javert, Path from Shortest paths", Size 2 nodes, 1 edge,
From Valjean To Javert, edge value 17 shared chapters. Compose box says "Note on: Valjean to
Javert"; the right panel's Notes section says "Note on: Path Valjean to Javert". "OK, that's the
path, not either character. Slightly odd it's called two different things in two places but it's
obviously the same object. Also a 'chain' between them is just one edge -- they are directly
linked. Fine, the program says so honestly."

## Step 8 -- save the second note

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t23 <steps of 7> --type "Pursuit chain: they are directly linked, 17 shared chapters" --click Save

Result (07.png): "9 notes in this graph", both of my notes at the top, each with its chip
("Valjean to Javert", "Community 3"); right panel "1 note -- Open in Notes".

## Step 9 -- find them again from the layer list

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t23 <steps of 8> --click Graph --click "Notes"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t23 <steps of 8> --click Graph --click "Community 3" --click "Open in Notes"
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t23 <steps of 8> --click Graph --click "Louvain" --click "Community 3"
    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t23 --click "Community 3" --click "Add note" --type "Bishop Myriel's circle" --click Save --click Graph

08: "Notes" was ambiguous (rail button and a list row); it hit the rail button, so I stayed in the
Notes list -- which does list both notes, so that's one way to find them. But the panel on the right
had jumped to PageRank, which I never clicked.

09 and 11: going back to the Graph list after saving a note, the list is not the one I left.
"Louvain 2, 7 groups" is gone from the list, Louvain is collapsed, and PageRank is highlighted and
selected. "Wait. Where did Louvain 2 go? Did adding a note delete something? I didn't touch it."
"Community 3" could not be clicked because Louvain was collapsed ("nothing on screen is called
'Community 3'"). The collapsed Louvain row shows "1 note" and a small circled "3" next to it -- "is
that three notes inside, or something else? It says 1 note and 3 at the same time."

On the plus side, the "Valjean ... 2 nodes" path row now shows "1 note" right on the row. That's
the chain note, found from the list without opening anything.

10: I clicked "Louvain" to expand it (it was ambiguous with a "Louvain" table tab; the table opened
at the bottom, which was not what I meant, but the group list also expanded). Clicking Community 3
again shows "3 notes -- Open in Notes" at the bottom of the right panel. So the circle note is
findable from the group. But the Community 3 row itself no longer showed a note count, while before
my note it had shown "2 notes" on the row. And the "Notes 4 items" row at the top of the list still
says 4 items even though the Notes panel says 9 notes in this graph. "Which number do I believe?"

## Outcome

Did I succeed? Yes, I think so: one note on Community 3 (Myriel's Louvain community, confirmed by
"Hub: Myriel") and one on the Valjean-to-Javert path as a path, and I found both again -- in the
Notes list with their chips, the chain note as "1 note" on its row, and the circle note as "3 notes"
in the group's side panel.

Single Ease Question: 5 of 7. Writing the notes was easy and the chips told me exactly what each
note was attached to. Finding Myriel's circle took a guess because the community rows are truncated
and clicking his name gave me a path instead. Finding the notes again was shakier: the list changed
under me when I came back (Louvain 2 vanished, Louvain collapsed, PageRank got selected), the
"Notes 4 items" count disagreed with "9 notes in this graph", and the circle row's note count
disappeared.

Would I use this instead of my current tool? For annotation, maybe. In Cytoscape I'd be writing a
column value or a text annotation on the canvas, and neither attaches to "the cluster" or "the
path" as an object; this does, and the chip makes it unambiguous. That's genuinely better for
"why did I keep this cluster" reminders on an enrichment map. But I wouldn't trust it yet: a layer
disappearing from my list after I added a note, and two different note counts, are the kind of
thing that makes me go back and redo everything by hand to check.

## Problems observed

- Clicking the label "Myriel" selected the "Myriel to Javert" path row, not the character or his
  community. There is no obvious way from a character to "the community he is in".
- Community rows are truncated ("Community...", "Comm..."), so Myriel's community had to be guessed.
- Returning to the Graph list after saving a note: the "Louvain 2" row disappeared, Louvain
  collapsed, and PageRank became selected without being clicked. Looked like data loss.
- "Notes 4 items" in the list never changed while the Notes panel said 8, then 9 notes.
- Community 3's row showed "2 notes" before the new note and no count after; the collapsed Louvain
  row shows "1 note" plus a circled "3", whose meaning is unclear.
- The same path is named "Valjean to Javert" in the compose chip and "Path Valjean to Javert" in
  the side panel.
- "Louvain" names both a list row and a table tab; "Notes" names both the rail button and a list row.
