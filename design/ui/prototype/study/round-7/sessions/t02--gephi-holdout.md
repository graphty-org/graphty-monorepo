# Session: Gephi holdout (Dr. Mara Lindqvist), task t02

Task as given: "Someone on your team already worked on this project. Work out which five
characters their work says matter most to the whole story, in order, and how the drawing shows
it. The data on screen is a sample: characters of the novel Les Miserables, linked when they
appear in the same chapter."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t02--gephi-holdout/.

## 01 -- start screen (shots/tasks/t02/01.png)

"Les Mis co-appearance. I know this one -- Knuth's list, 77 nodes, 254 edges. I teach it. A
legend in the corner: color is PageRank, 0.0033 to 0.0754, size is degree. Fine, that is a
ranking on color and a ranking on size, which is what I would have done in Appearance. The left
panel is some kind of tree with PageRank, Louvain with six communities, shortest paths, a
watchlist, a folder called For the report with a hidden Betweenness. So the colleague ran
several things. The question is which one is 'their work says matters most'. The picture is
colored by PageRank, so that is my first guess. But I want the table, not the picture."

## 02 -- click the PageRank row

    timeout 120 node app-b/study.mjs --try .../02.png task:t02 --click "PageRank"

"Right panel: PageRank, 'Measure from Analyze', paints 77 nodes, every node with a value, orange
to brown. Good, it says it covered everything. It does not say damping factor or iterations.
I will come back to that."

## 03 -- click Notes in the tree

    timeout 120 node app-b/study.mjs --try .../03.png task:t02 --click "Notes"

"Notes from the colleague. 'Highest betweenness in the book, 0.57, next is Myriel at 0.177.'
'Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side.'
So they used both betweenness and PageRank. Annoying -- two measures, which one is 'their work'?
The drawing is PageRank, the For the report folder has Betweenness but it is switched off. I go
with what is painted. The right side shows 'Connected components 1', 'Direction Undirected' --
good, so a giant-component filter is not an issue here."

## 04 -- open the table

    timeout 120 node app-b/study.mjs --try .../04.png task:t02 --click "Table"

"There's my Data Lab, at the bottom. Columns say 'Degree (full graph)', 'PageRank (full graph)',
'Betweenness (full graph)'. Thank you. That is exactly the thing Gephi never tells me -- what it
ran on. It is sorted by degree right now: Valjean 36, Gavroche 22, Marius 19, Javert 17,
Thenardier 16. There is also a 'Rank by PageRank' column, and rank 2 is not on screen. That is
Myriel, I would bet money. There is a sentence above the table, 'Valjean is first on all three
measures; Gavroche is in the top 3 on all three'. Who wrote that? The colleague or the software?
If the software is writing conclusions for me I want to know. I skip it and sort myself."

## 05 -- sort by PageRank

    timeout 120 node app-b/study.mjs --try .../05.png task:t02 --click "Table" --click "PageRank (full graph)"

"Sorted descending, one click, arrow on the header. Valjean 0.0754, Myriel 0.0428, Gavroche
0.0358, Marius 0.0309, Javert 0.0303. Myriel second, as expected -- the bishop has only ten links
but they are to a closed little star of people who only know him, and PageRank rewards that.
Those values look like NetworkX's pagerank with alpha 0.85, roughly; I would check. Note Javert
and Marius are 0.0006 apart, so fourth and fifth is a coin toss and I would not put that in a
paper without the parameters."

## 06 -- check Views, in case the colleague saved the answer

    timeout 120 node app-b/study.mjs --try .../06.png task:t02 --click "Views"

"Whole cast, Valjean's circle, From above. Saved camera positions, like bookmarks. Nothing that
says 'ranking'. From above sounds like 3D, which I will not touch. Nothing changes my answer."

## 07 -- try to see what PageRank ran with

    timeout 120 node app-b/study.mjs --try .../07.png task:t02 --click "PageRank" --click "Data"

"I wanted the Data tab of PageRank in the right panel and it took me to the Data rail instead --
sources, filters, attributes. 'No filters. Filters change what is computed' -- fine, that answers
my 'on what' question, whole graph. But the attributes list says 'group -- Color (group)' and
'degree -- Size (Degree)'. The legend says color is PageRank. So which is it? Is group painting
color somewhere under PageRank? That is the kind of contradiction that makes me distrust the
picture."

## 08 -- the 'from Analyze' link on PageRank

    timeout 120 node app-b/study.mjs --try .../08.png task:t02 --click "PageRank" --click "from Analyze"

"I clicked 'from Analyze' hoping for the run: damping, tolerance, weights or not. It opened a
menu of algorithms to run instead, with marketing one-liners -- 'Which nodes are connected to
other well-connected nodes'. That is not what I asked. Edge weights are 'value' -- did PageRank
use them? It does not say. I stop here; I have the answer, and I could not get the parameters."

## Answer given

Ranked by PageRank, the measure the drawing is colored by, on the full graph:

1. Valjean (0.0754)
2. Myriel (0.0428)
3. Gavroche (0.0358)
4. Marius (0.0309)
5. Javert (0.0303)

How the drawing shows it: node color is PageRank on an orange-to-brown ramp, darker means
higher -- Valjean is the near-black node in the middle, Myriel is visibly darker than his
neighbors despite being small. Node size is degree, not PageRank, which is why Myriel is small
but dark and Gavroche is large. Honestly, past the top two the ramp is useless: Gavroche,
Marius and Javert are the same orange to my eye. I needed the table.

## Debrief

- Succeeded? Yes, I think so, with one reservation: the colleague's notes lean on betweenness
  as well, and on betweenness Javert is not top five (0.0543; Thenardier 0.0749 is above him).
  I picked PageRank because it is what is painted. If they meant betweenness, I am wrong on
  number five.
- Single Ease Question: 5 of 7. The table with "(full graph)" in the headers and one-click sort
  was quick. Losing points for: no PageRank parameters anywhere I looked, an attribute list that
  says color is group while the legend says PageRank, a color ramp that cannot separate ranks 3
  to 5, and a sentence over the table that reads like a conclusion I did not write.
- Would I use this instead of Gephi? No. For teaching this dataset, maybe -- no Java, the
  "(full graph)" labels are better than anything Gephi does, and undo is in the top bar. But I
  cannot cite a PageRank whose damping factor and weighting I cannot see, and the link that
  should have shown me the run opened a menu instead. I'd stay on Gephi for the paper.
