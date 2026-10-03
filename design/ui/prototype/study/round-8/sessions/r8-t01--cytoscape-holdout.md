# Session: Les Miserables from first open to a picture file -- Renata, the Cytoscape holdout

Task as given by the moderator: "You have never used this program before. A friend said it turns a
list of connections into a picture that shows who matters and how people cluster. You have no file
of your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

Start screen: shots/tasks/r8-t01/01.png. Every command below was run from
design/ui/prototype/ and replays from the start screen. Renders are in
tmp/round-8-sessions/r8-t01--cytoscape-holdout/ (written NN below).

Command prefix for every step:
`timeout 120 node app-b/study.mjs --try $D/NN.png task:r8-t01 ...`
with `D=tmp/round-8-sessions/r8-t01--cytoscape-holdout` (absolute path in the real runs).

---

## 1. Start screen (01.png)

Think-aloud: "No File menu across the top. Fine, it's a web thing. 'Open project or file', 'New from
data', samples on the right. And a consent banner in my face before I've done anything. No thanks.
'Files are read on this computer and never uploaded' and 'Local only' in the corner -- good, that's
the first thing I'd ask about client data. Les Miserables, 77 characters. That's the standard one.
'Opens with worked examples: measures, groups, paths and notes already added.' Hm. I don't want
somebody else's analysis on it, I want a clean network. Let's see."

## 2. Open the sample (02.png)

`--click "No thanks" --click "Les Miserables"`

"Network's on screen. 77 nodes, the usual shape, Valjean in the middle. **Part one done.**

But it's not clean. There's a whole tree on the left -- PageRank, Louvain 6 groups, Shortest paths,
Density, Link prediction, Top 9 by degree, Watchlist, 'For the report', Betweenness with a crossed
eye, 'Everything' at the bottom. And it's already colored, orange to brown, 'Color: PageRank 0.00330
to 0.0754' floating in the corner. So the sample came pre-analyzed. That's like opening somebody
else's .cys. I'll do my own measure so I know what I'm looking at."

"The right panel says PageRank, 'Measure from Analyze', 'Paints 77 nodes (every node with a
value)', Fill Color 'Orange to brown'. So that row is a continuous mapping, PageRank to fill color.
That reads like a Style to me -- or a mapping inside one. Which? Not sure yet."

## 3. Find where to compute (03.png, 04.png)

`... --hover "Analyze"` -> tooltip "Analyze Shift+A"
`... --click "Analyze"` (04.png)

"Flask icon at the bottom is Analyze. Opens a list: Recent (Louvain, PageRank, Shortest path),
then 'Rank nodes and edges': PageRank 'Start here', Degree, Total value, Betweenness, Closeness,
Eigenvector. Plain English one-liners under each. This is my Tools > NetworkAnalyzer, more or less.
I always start with betweenness for 'who bridges', so that one."

## 4. Betweenness settings (05.png)

`... --click "Betweenness Which nodes sit"` (my first try with just "Betweenness" hit the tree row
behind the menu and timed out -- two things on screen with the same name)

"Weight: value (loaded weight). Higher means: Stronger / Farther / Capacity. 'Betweenness reads a
weight as distance: it uses 1/value.' -- OK, that I like. NetworkAnalyzer never tells you what it
does with your edge weight, I've had students report betweenness on co-occurrence counts as if they
were distances. 'All 254 edges have value set; none is left out.' Good, a count. 'Under a second.'
Run."

## 5. Run it (06.png, 07.png, 09.png)

`... --click "Run"` (06.png)
`... --click "Run" --click "Betweenness 2"` (07.png)
`... --click "Run" --click "Betweenness 2" --click "Betweenness 2"` (09.png)

"A new row 'Betweenness 2' at the top with a spinner and a progress bar. The picture hasn't
changed -- still PageRank colors. I click the row: still spinning, and the right panel didn't even
switch to it, it's still showing the graph summary. It said under a second. It's still going.
Called it 'Betweenness 2' -- so there's already a Betweenness, the hidden one under 'For the report'.
I didn't ask for a second copy, I asked for betweenness."

## 6. Look at the table (08.png)

`... --click "Run" --click "Table"`

"There IS a node table. Label, Notes, group, Degree (full graph), Rank by degree, PageRank, ...
'Columns: 9 of 9'. Sorted by degree. Typed headers -- 'Abc', '#'. That's the first thing that
makes me take it seriously. But no betweenness column from my run, and the row's still spinning.
Two tries, nothing finished. I'm not going to sit here."

## 7. Fall back to PageRank (10.png, 11.png, 12.png)

`... --click "Analyze" --click "PageRank Start here"` (10.png)
`... --click "Update PageRank row" --click "PageRank"` (11.png)
`... --click "Update PageRank row" --click "Labels show"` (12.png, the right panel kept PageRank's
Data tab)

"Fine, PageRank, the one they say to start with. Same weight explanation, Damping 0.85. Two buttons:
'Run as copy' and 'Update PageRank row'. Update. The drawing is the same orange. Right panel, Data
tab: Top 10 -- Valjean 0.0754, Myriel, Gavroche, Marius, Javert... that's the answer to 'who matters
most'. But 'Ran Sep 28, on the CPU' -- I just pressed Update. Did it rerun or not? If it did, the
date should say today. I can't tell whether this is my result or the sample's.

I'll call **part two done, with an asterisk**: the program has worked out PageRank and shows me a
ranking. I didn't get my own betweenness out of it.

**Part three** -- it's already colored by PageRank, continuous orange to brown, and there's a legend
box with the range. So yes, done, but not by me. And honestly, orange to brown on 77 orange dots --
I can see Valjean is darker and that's about it. I'd want size mapped too. Didn't go looking."

## 8. Names on the drawing (12.png through 24.png)

"Now labels. About thirteen names are showing -- Valjean, Javert, Fantine, Myriel, Cosette, Marius,
the Friends of the ABC... The rest are bare dots. I want every name."

`... --click "Labels show"` (12.png) -> toast "Labels shown anyway (this file): Valjean. Opens in
the inspector (not available yet)"

"'Labels shown anyway... not available yet.' OK."

`... --click "Label"` (13.png), `... --click "Label" --click "Label"` (14.png),
`... --click "Everything"` (15.png), `... --click "Everything" --click "Label"` (16.png)

"There's a 'Label +' section on the right for the PageRank row. Clicking it does nothing. Then
'Everything' at the bottom -- 'Built-in row', 'Paints 77 nodes, 254 edges', gray 808080, Faceted
sphere, 'Covered by PageRank for Color on 77 of 77 nodes'. That's my Default style. Nice that it
tells me what's covering it -- Cytoscape never tells you a bypass is winning. 'Label +' here too.
Clicked. Nothing opens."

`... --hover "Actions"` -> "Quick actions Ctrl+K" (hovering the lightning icon)
`... --click "Quick actions"` (17.png)
`... --click "Quick actions" --type "label"` (18.png) -> "Add label line -- Attribute menu > Add
label line"
`... --click "Quick actions" --type "label" --click "Add label line"` (19.png)

"Command palette. Typed 'label'. 'Add label line'. Sounds right.

...And now I'm in something called 'IT estate, March 2026'. Three hundred hosts, a column called
vuln_count_critical_unremediated_over_30_days, nothing colored. Where is my network? I didn't open
this. That is exactly the thing I would never forgive -- I picked a command and it threw my
workspace away and loaded somebody else's. If that had been client work I'd be closing the tab
right now. Since it's practice, I'll start over."

`... --click "Data"` (20.png)

"Data rail on the Les Mis one: Sources -- miserables.gexf, 77 nodes, 254 edges, 'Weight: value, a
higher value is a stronger tie'. Attributes: Nodes 'In use (2)': label 'Name, Label', group 'Color
(gro...'. Other: betweenness, degree. Edges: value. Results: Louvain, PageRank. Typed, counted.
That's the summary I want after an import. Good."

`... --click "Data" --click "label"` (21.png)

"label: Read as Category, 77 of 77 nodes have a value, 77 distinct, In use: Name, Label. 'Painted
by: No row paints from label.' So it IS the label already? Then why are 64 dots blank?"

`... --hover "More"` -> "More actions Shift+F10"
`... --click "label" --click "More actions"` (23.png)
`... --click "More actions" --click "Add label line"` (24.png) -> "Add label line: label (not
available yet)"

"Same 'Add label line' from the menu. 'Not available yet.' Three ways in, none of them works.
I'll give up on getting every name. **Part four: not done.** About thirteen names are on it, the
program chose which."

## 9. Export (25.png through 31.png)

`... --click "Main menu"` (25.png)

"Hamburger: New project, Open, Save Ctrl+S, Export Ctrl+E, 'Apply recipe or style file...',
Version history. 'Apply ... style file' -- if that took my styles.xml I'd stay another hour. No
file with me today."

`... --click "Main menu" --click "Export..."` (26.png)

"Export: Image .png, 'Full graph, with the legend'. Preview has the legend box in the corner. And:
'64 labels hidden to avoid overlap: show list'. So that's why -- it hides labels so they don't
collide. Cytoscape won't do that at all, I nudge them by hand, so I'll grant that's a real
feature. But it should be my choice, and I found no way to say 'show them all anyway'."

`... --click "Print"` (27.png)

"Print look: side by side, as written and in gray, and it says the legend prints the value at each
gray step -- 0.00330, 0.0213, 0.0393, 0.0574, 0.0754. That is thoughtful. Reviewers print things."

`... --click "Format"` (28.png), `... --click "PNG"` (29.png) -> PNG, JPEG, WebP, SVG
`... --click "show list"` (30.png) -> Thenardier degree 16, Joly 12, Mabeuf 11, Combeferre...

"SVG is there. Good -- if it's real text in the SVG I can fix labels in Illustrator, which is
what I'd end up doing anyway. Hidden list: Thenardier with degree 16 is hidden but Mme.Thenardier
is shown. A list I can read but can't act on."

`... --click "PNG" --click "SVG" --click "Export"` (31.png) -> toast "Exported les-miserables.svg
to Downloads"

"'Exported les-miserables.svg to Downloads.' 'Saved to this computer only; nothing is uploaded.'
**Part five done.** Done here."

---

## Verdict

**Did I succeed?** Partly. Network on screen: yes. Something worked out: PageRank, yes, but it was
the sample's own -- my betweenness run spun and never finished, and when I re-ran PageRank the
panel still said Sep 28, so I can't swear any number on screen is mine. Colors from the result:
yes, but they were already there when I opened it. Names: no -- thirteen of 77; every way I found
to add the rest said "not available yet", and one of them dropped me into an unrelated IT
project. Picture file: yes, an SVG, with a legend, which is better than Cytoscape gives me without
an app.

**Single Ease Question: 3 out of 7.**

**Would I use this instead of Cytoscape?** No. Not for client work. What I liked, specifically:
the typed attribute list with counts, the node table being right there, the analyze dialog that
says what it does with my edge weights, the "covered by PageRank" line on the default row, the
print-in-gray legend, and "nothing is uploaded" stated where it matters. What stops me: a command
that swaps my workspace for another project without asking is the one thing I can't have; a run
that says "under a second" and never finishes; labels I can't switch on. And the sample opening
already analyzed made it hard to tell what I did from what was there. I'd look at it again for the
first hour of the workshop, once labels work -- nobody has to install Java. Client work stays in
Cytoscape.
