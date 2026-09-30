# Session: a graph too big to draw -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, Gephi user since
0.8, NetworkX for anything she must reproduce. Simulated session, played at 1440x900.

**Task as given by the moderator:** "This citation data is too big to draw. Is anything here worth
a look?"

**Screens used:** "Past the drawing limit" in all its states (not drawn, isolates opened in the
table, Narrow the graph..., Keep top rows, the 200 kept and drawn, the rule editor, narrowed and
drawn, top 3 plus their neighbors); "Find" with three patent numbers searched on the undrawn
graph; the table dock at the drawing limit with a set column; "Selection over the cap" (a
different data set, bank transfers), its first two states.

Renders: shots/record/r6-mara-t2d-pdl.png, r6-mara-t2d-pdl-{isolates,narrow,keep,kept,rule,drawn,sample}.png,
r6-mara-t2d-find-s7.png, r6-mara-t2d-td-limit.png, r6-mara-t2d-soc.png, r6-mara-t2d-soc-e2.png.

---

## Think-aloud transcript

### 1. The not-drawn screen

> "Patent citations. 124,318 nodes, 1,480,221 edges. 'Nodes not drawn. More than this browser
> draws at once (50,000).' All right. Gephi would load this -- after I edit gephi.conf and give it
> twelve gigabytes -- and then I'd sit through OpenOrd for twenty minutes to get a hairball I
> can't read anyway. So I'm not going to cry about the picture. What I care about is whether it
> counted what it loaded."
>
> "Right panel, Statistics: density 0.0000958, average total degree 23.8. Check: 1,480,221 times
> two over 124,318 is 23.81. Good, that's total degree, directed, and it says so. Isolates 2,406.
> Weak components 3,912, the giant one 116,905 nodes, 94.0 percent. That is a normal citation
> network. 3,908 more components with 19 nodes or fewer -- fine, it didn't make me scroll through
> them."
>
> "Degree distribution, In selected, 'nodes with in-degree k or more, both axes log'. A CCDF.
> Thank you -- someone here has read Clauset. Max 236. 41,873 with in-degree zero, 'never cited by
> a patent in this sample'. That's a third of the graph never cited inside the sample, which is
> what you'd expect with a 1999-2001 grant window: the citations come later."

### 2. The table -- and a number that doesn't match

> "The table is right there under the canvas, every row, sorted by citationsReceived. So this is
> my Data Laboratory, docked. Good. Top patent 6117075, Drugs and medical, 779 citations."
>
> "Wait. 779? The chart just told me max in-degree is 236. Those should be the same thing in a
> citation graph. Either the column is from somewhere else or one of them is wrong."
>
> [She clicks the isolates count, 2,406.]
>
> "'None of these patents cites or is cited by another patent in this sample. Their
> citationsReceived counts citations from patents outside it.' Okay. So citationsReceived is the
> USPTO attribute that came in the file, and in-degree is inside the sample. That's fine, that's
> actually correct -- but I only found out because I clicked the isolates. The first screen sorts
> the whole table by a column that looks like in-degree and isn't. A student would put 779 in a
> paper as 'most cited in our network'. That sentence belongs on the column header, not on the
> isolates panel."
>
> "And where is in-degree in the table? There are four columns: id, grantYear, category,
> citationsReceived. The statistics panel knows everybody's in-degree -- it drew the distribution
> -- but I can't sort by it. In Gephi I run Degree and it's a column. That's the first thing I
> would sort by here, and it isn't there."

### 3. Narrow the graph...

> "Blue button in the middle: Narrow the graph. Filter steps. 'No filter steps. Every number reads
> the full graph.' -- good, it tells me the scope before I change it. Suggested: 'Keep top rows by
> citationsReceived' and 'Neighbors of a node'. Again citationsReceived. I'd rather keep top rows by
> in-degree in the sample, but I can't, because it's not a column."
>
> [Keep top rows.]
>
> "Keep the first 200, in the table's order, citationsReceived, highest first. 'Row 200 has
> citationsReceived 358; 1 more patent also has 358 and is left out.' Oh, that is nice. It tells
> me about the tie at the cut. Gephi's top-N filters never tell you that. '200 nodes, 288 edges,
> will draw.' It told me the edges before I committed. Keep these 200 rows."

### 4. The 200 drawn

> "Now there's a drawing. Chip says '200 of 124K nodes, 1 step'. Undo on the toast. Statistics
> now: 'Describes the 200 most cited patents, not a random sample. Density reads high: highly
> cited patents cite each other.' Edges '288 of 1,480,221'."
>
> "This is exactly the thing I test every tool for. In Gephi, once the filter's on, the
> statistics describe what's showing and nothing says so; here it says so, in a sentence, with
> the denominator. I'd still like the full-graph numbers next to these rather than replaced by
> them -- now I've lost the 94 percent and the 23.8 to compare against -- but at least I can't
> confuse the two."
>
> "The drawing itself: 21 components, 174 nodes in the big one, a tight knot around 6117075 and
> 6231106 -- the drug patents. And which layout is this? The ForceAtlas2 row says 'Engine: WebGPU'
> and there's a play button next to it. So did ForceAtlas2 already run, or is this something else
> and I press play to get ForceAtlas2? If it ran, with what -- scaling, gravity, LinLog? I can't see
> a single parameter from here. I'm not reading a map I can't name the layout of."

### 5. A rule instead

> "Back to the full graph -- undo -- and write a rule. Keep nodes where category is Drugs and
> medical AND citationsReceived >= 25. '612 nodes, 1,843 edges, will draw'. Before I commit.
> That's the thing Gephi's filter panel should have done for fifteen years."
>
> "Filtered: 612, 44 weak components, 31 isolates, and the small ones parked in a grid on the
> right so they don't float around the big one. The big one is a hairball at this zoom, but it's
> 545 nodes and ungrouped -- that's where I'd run modularity next. It even says why there are so
> many components now: a rule on attributes doesn't follow citations. Correct."

### 6. Top three and their neighbors

> "The last state: the three most cited, then their neighbors, two steps. 586 nodes. Three stars:
> 6117075 on the right, drugs; 6031111 and 5960121 on the left, computers and communications. And
> in between, a handful of patents citing both sides -- 6228917, 5882034, 6018952, 5907468,
> 6112268. That's the first thing all session I'd call worth a look: patents that cite into both
> the drug hub and the computing hubs. That's a bridge, and that's what visual network analysis is
> for."
>
> "And the statistics say 'favors hubs, so density and clustering read high'. Yes. Someone knows
> that snowball samples lie about clustering."

### 7. Find, without a drawing

> "Search box: three patent numbers. '3 results in all 124,318 nodes.' The right panel: 'Not
> drawn: the graph is past the drawing limit. Counted everywhere.' Attributes, memberships, no
> sets. Fine. But no degree, no in-degree, no neighbor count on the node itself. I found it; now
> what? There's a filter icon and an arrow with a dropdown at the top of the panel -- I'd guess the
> filter one is 'neighbors of this node'. I'd guess. They don't say."

### 8. The table with a set column

> "Same full graph, still not drawn, but now 'Drug patents cited 25+' is a set, 612 members, a
> column in the table saying 'member', and it's in the Style stack as a highlight. So I can mark
> things on a graph nobody can see. And 'Export table...' -- that's the one I need. The node table
> to CSV to R is half my papers. If that export has in-degree in it, I'm happy. From what's on
> screen, it wouldn't."

### 9. The selection screen

> "This one is bank transfers, not patents. 3,000 nodes -- why is this 'over the cap'? Select all:
> a big circle and a badge saying 12,113. The panel says 3,000 nodes, 9,113 edges. So 12,113 is
> nodes plus edges? A number with no unit on it. I would not have worked that out if I hadn't
> added them. And the density hexagons -- fine, that's honest for a crowd of dots. But I don't see
> what this has to do with my citations."

---

## Her answer to the task

> "Worth a look: yes, two things. One, the structure is ordinary -- 94 percent in one weak
> component, a heavy-tailed in-degree, a third never cited inside the window -- so nothing is
> broken in the data. Two, the three most cited patents are one drug patent and two computing
> patents, and a handful of patents cite across both. I'd pull those five out and read them. What
> I can't tell you is anything about communities in the whole thing, because I never saw a place
> to run modularity on all 124,000 -- only on what I'd narrowed to."

## Single Ease Question

**5 of 7.**

> "The part that matters to me went well: it counted everything, told me what every number was
> computed on, and told me the size of a cut before I made it. I lose two points for the column
> that looks like in-degree and isn't, for in-degree not being a column at all, and for a layout I
> can't name or tune from the screen."

## Would she use this instead of her current tool?

> "Not instead. Beside it, for this. For a graph Gephi can't open without me editing a config
> file, this is a better first hour: the counts are right, the table is there, and the filter
> tells me what it will cost. But my Mastodon networks are 60,000 nodes -- over your 50,000 --
> and I need them drawn, whole, in ForceAtlas2 with LinLog, for a figure. If this can't draw
> them, then for my papers I'd stay on Gephi. For triage on something too big for Gephi, I'd open
> this first."

---

## Observed problems (moderator summary)

1. **The table's default sort column looks like in-degree and is not.** citationsReceived (max
   779) comes from the source file and counts citations from outside the sample; the in-degree
   chart says max 236. The only explanation is on the isolates panel, reached by a click. Severity
   3 of 4 -- a participant who does not click would report the wrong number.
2. **In-degree and out-degree are not table columns.** The statistics panel computes the in-degree
   distribution but the table cannot be sorted by it, and Keep top rows can only rank by the file's
   attribute. Severity 3.
3. **The layout on the narrowed drawing is unnamed.** The ForceAtlas2 row shows the engine and a
   play button after the drawing already has positions; nothing says whether ForceAtlas2 ran or
   with which parameters. Severity 3 for this participant.
4. **No visible way to run a whole-graph statistic past the drawing limit.** Statistics shows a
   fixed overview; "Change overview..." does not say what it offers, and she never found where
   modularity or PageRank would run on all 124,318 nodes. Severity 2.
5. **Filtering replaces the full-graph statistics instead of sitting beside them.** The scope is
   labeled clearly ("Describes the 200 most cited patents", "288 of 1,480,221"), but the full
   graph's density, degree and component share are gone for comparison. Severity 2.
6. **A found node shows no degree or neighbor count**, and the two icons at the top of its panel
   are unlabeled. Severity 2.
7. **The selection badge "12,113" has no unit.** It is nodes plus edges; she worked that out by
   adding. The screen's data set (bank transfers) also made it unclear why it was part of this
   task. Severity 1.

## What she liked

- Every number on the first screen checked out by hand, and the scope sentence ("Every number
  reads the full graph") came before any filtering.
- The CCDF of in-degree on log axes, and "never cited by a patent in this sample" under it.
- Keep top rows naming the tie at the cut ("1 more patent also has 358 and is left out") and
  counting nodes and edges before the commit.
- Statistics saying what they describe after a filter, with the full-graph denominator -- the
  opposite of her Gephi complaint.
- The warning that a hub-and-neighbors sample inflates density and clustering.
- A set column and Export table... on a graph that was never drawn.
