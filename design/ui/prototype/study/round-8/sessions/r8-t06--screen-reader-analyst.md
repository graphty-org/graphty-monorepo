# Session: first look at the Les Miserables sample -- screen-reader analyst (Morgan)

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

Caveat for the reader: the session ran on rendered screenshots, not through a real screen reader.
Everything below about what Morgan "hears" is inferred from the visible text and the names the
click tool reported for controls (for example, when it said two controls share a name). Heading
structure, focus order and live-region behavior were not observable and are not judged here.

Renders: design/ui/prototype/tmp/round-8-sessions/r8-t06--screen-reader-analyst/ (01 is the start
screen at shots/tasks/r8-t06/01.png).

## Step 1 -- start screen (01.png)

Command: none (read the start screen).

Morgan: "Title says graphty. Three groups I can make out: Start, Recent projects, Samples. Good,
the sample list names Les Miserables with '77 characters' right next to it -- that's already one of
my numbers, before I've opened anything. Two sentences I like: 'Files are read on this computer and
never uploaded', and 'Local only' up top. That answers my first question. Then there's a big
consent box at the bottom asking to share usage data. I'll say no; I don't want it sitting there
reading itself to me every time."

## Step 2 -- decline usage data, open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

Morgan: "Okay, it opened. And I've landed in... a style. The thing on the right says 'PageRank',
'Measure from Analyze', 'Paints 77 nodes (every node with a value)', 'Covers Louvain for Color',
then Fill, Shape, Effects, Label, Tooltip. I asked for a graph and I'm being told about paint. The
left list is long: Selection, Notes 4 items, Labels, PageRank, Louvain 6 groups, Shortest paths,
Valjean t-something 2 nodes, Myriel to-something 3 nodes, Density, Link prediction, Top 9 by de-
something, Watchlist, For the report, Group 2, Group 8, Betweenness, Everything. Some of these are
truncated -- 'Valjean t...', 'Top 9 by de...' -- I hope the screen reader gets the full name and
not the dots. And a floating 'Color: PageRank, 0.00330 to 0.0754'. Someone has already done a lot
of work in here. That's fine for a sample, but it's not 'tell me how big it is first'. I've got
'77 nodes' from the paint line, which is a funny place to learn it. No edge count anywhere on this
screen. The left rail has Graph, Data, Views, Notes, Assistant. 'Data' is where I'd look for a
count."

## Step 3 -- the Data section (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

Tool note: "Data" matches 2 controls (button "Data", tab "Data"); clicked the first.

Morgan: "First thing: there are two things on this screen both called 'Data' -- the section
button on the left and a tab on the right. At my speed those sound identical. I got the one I
wanted, but I'm writing that down.

Now this is what I wanted. Under Sources: 'miserables.gexf, 77 nodes, 254 edges'. Then 'nodes,
node, 77 nodes'; 'edges, 254 rows, one edge per row, Weight: value, a higher value is a stronger
tie'. And on the right, a Summary in label-value pairs: Nodes 77. Edges 254, each a distinct pair.
Direction Undirected -- thank you for saying that out loud, people never do. Weight: value,
stronger. Density 0.0868. Connected components 1. Average degree 6.60. Highest degree 36. '4 more
readings not computed.' Then a degree-distribution chart, log-log, with a sentence under it saying
what it is. The chart itself I'll ignore; the sentence at least tells me what I'm missing.

Quick sanity check with my own arithmetic: 2 x 254 / 77 is 6.597. Matches 6.60. Density
254 / (77 x 76 / 2) = 254 / 2926 = 0.0868. Matches. So the summary is honest, and it's using the
undirected formula, which it said it would.

Connected components is 1, so yes, every character can reach every other. I'd still like it said
in words -- 'one piece, everyone reachable' -- because '1' as a link reads as 'one, link' and I'm
not sure whether the link takes me somewhere or is the number.

Attributes, left side: Nodes -- 'In use (2)': label (Name, Label), group (Color, gro-
something, truncated). 'Other attributes': betweenness, degree, each followed by an icon I can't
identify. Edges: value. Then 'Results': Louvain, PageRank, same icon. So recorded per character:
label, group, betweenness, degree. But betweenness and degree are things I'd compute. Are they in
the file, or did this thing compute them? And the unnamed icon next to them, the same one next to
Louvain and PageRank -- if that's what it means, then they're computed. I need to check."

## Step 4 -- the table (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "Table"

Tool note: "Table" matches 2 controls (button "Table", section "Table"); clicked the first.

Morgan: "Two things called 'Table' this time. Same complaint.

Table opened under the drawing. '77 nodes, sorted by degree, Rows 1 to 77 of 77.' Then a sentence:
'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' That's a nice
summary line, but which three measures? I'll guess degree, PageRank and betweenness. Columns: label,
Notes, group, Degree (full graph), Rank by degree (full graph), PageRank (full graph), Rank by
PageRank, and it runs off the side. 'Columns: 9 of 9.' Valjean, group 2, degree 36, number 1 of 77,
PageRank 0.0754. So the table mixes what the file says (label, group) with what has been computed
(degree, PageRank, ranks) and someone's notes. For 'what facts are recorded about each character'
that's exactly the wrong mix for me, unless the headers say which is which. '(full graph)' tells me
the scope, not the origin."

## Step 5 -- where did betweenness come from? (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "betweenness"

Morgan: "Clicked betweenness in the attribute list. Right side now: 'betweenness, Node attribute,
from miser...' -- truncated again. Summary: Name betweenness. Read as Number. From:
'miserables.gexf (imported, not computed)'. Good -- that's the sentence I wanted. On 77 nodes.
Fill: 100%, 77 of 77 nodes have a value. In use: nothing uses it. Values: range 0 to 0.57, median
0.

So betweenness came in with the file. Range 0 to 0.57 -- that looks normalized, but nothing says so,
and it's not this tool's number anyway, it's whoever made the file. I'd want that called out,
because the tool's own 'Betweenness' further up the Graph list is presumably a different thing
with the same name. Two betweennesses. I'll assume degree in the file is the same story, but I
haven't checked it, and I'm not going to click every row to find out. The icon next to it didn't
turn out to mean 'computed' after all, so I still don't know what that icon is."

## Stopping

Morgan: "I have what I came for. 77 characters. 254 connections, undirected, weighted by 'value'.
One connected component, so everyone is reachable from everyone. Recorded about each character in
the file: label, group, betweenness and degree; on each connection: value. The rest -- Louvain,
PageRank, the ranks -- the tool or a previous user worked out."

## Verdict

Succeeded: yes, I believe so. 77 characters, 254 connections, one component (everyone reachable),
and the file records label, group, betweenness and degree per character plus a weight ('value') per
connection.

Single Ease Question (1-7): 5. Once I found the Data section it was all there in label-value text,
and the numbers check out by hand. It lost points for where it drops you: in the middle of someone's
color settings with no counts, and the edge count only appears after you go looking. It also lost
points for two pairs of controls that share a name ('Data', 'Table'), for truncated names in the
lists, an icon I could not identify, and two different things both called betweenness.

Would I use this instead of NetworkX? For this question, maybe -- that summary block is
'nx.info' plus components and density without writing a line, and it said undirected and weighted
without my asking, which is more than most tools do. But I could not confirm from screenshots that
the summary is a real list a screen reader walks cleanly, and every other screen I hit was full
of style and paint vocabulary I don't need. My scripts already print those six lines. I'd
use it for a first look at a file someone hands me, if the summary turns out to read cleanly.
Not yet for anything I report on.

## Problems noted

1. On open, the first screen is a style inspector ('Paints 77 nodes...'), not an overview; no edge
   count or component count until you open Data. (severity: medium)
2. Two controls named 'Data' (section button and inspector tab) and two named 'Table' (button and
   section); indistinguishable by name. (severity: medium)
3. The same icon sits next to imported attributes (betweenness, degree) and computed results
   (Louvain, PageRank); its meaning is not stated. (severity: medium)
4. Whether an attribute is recorded in the file or computed is only learned by opening each one
   ('imported, not computed'); the table mixes file columns, computed columns and notes, and the
   headers say scope ('full graph'), not origin. (severity: medium)
5. An imported 'betweenness' attribute and a computed 'Betweenness' row in the Graph list share a
   name; the imported one's normalization is not stated. (severity: low-medium)
6. Truncated names: 'Valjean t...', 'Top 9 by de...', 'Labels show...', 'Color (gro...', 'from
   miser...'. (severity: low, assuming full accessible names; high if not)
7. 'Connected components: 1' is a link; reachability is not said in words. (severity: low)
8. Table summary 'first on all three measures' does not name the three. (severity: low)

## What worked

- 'Files are read on this computer and never uploaded' on the start screen, plus 'Local only'.
- The sample list gives the size (77 characters) before opening.
- The graph Summary: nodes, edges, Undirected, the weight attribute and its meaning, density,
  components, average and highest degree, as label-value text; all checked by hand.
- 'imported, not computed' on an attribute's details.
