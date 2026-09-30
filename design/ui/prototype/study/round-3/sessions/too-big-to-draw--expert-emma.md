# Too big to draw -- Expert Emma

**Participant:** Expert Emma, a network scientist who works in Python notebooks (networkx, igraph)
and uses Gephi for final figures. The persona is described in
[../../personas/expert-emma.md](../../personas/expert-emma.md).

**Task, as the moderator gave it:** "Here is last period's citation data. Find anything worth a
closer look."

**Data:** a patent citation sample. 124,318 patents granted 1999 to 2001 and 1,480,221 citations,
from the file patent-citations-sample.csv.

**Screens, in the order she saw them.** Each one is the study view, with the design notes hidden.

| Step | Screen | Render |
|---|---|---|
| 1 | Opened, nothing drawn | [shot](../../../shots/record/study-r3-emma-too-big--pdl-not-drawn.png) |
| 2 | Isolates count clicked | [shot](../../../shots/record/study-r3-emma-too-big--pdl-isolates.png) |
| 3 | "Narrow the graph..." list | [shot](../../../shots/record/study-r3-emma-too-big--pdl-narrow.png) |
| 4 | New rule editor | [shot](../../../shots/record/study-r3-emma-too-big--pdl-rule.png) |
| 5 | Rule applied, 612 drawn | [shot](../../../shots/record/study-r3-emma-too-big--pdl-drawn.png) |
| 6 | Suggested step instead: top 3 with neighbors | [shot](../../../shots/record/study-r3-emma-too-big--pdl-sample.png) |
| 7 | Find, three patent numbers pasted | [shot](../../../shots/record/study-r3-emma-too-big--find-s7.png) |
| 8 | Filter steps list with several steps | [shot](../../../shots/record/study-r3-emma-too-big--filter-chip.png) |

Outcome: **success, with difficulty.** She found three things worth a closer look. On the way, she
nearly decided that the statistics panel was wrong.

---

## Transcript (thinking aloud)

### 1. The file opens and nothing is drawn

> OK. First: where did the file go? I see "Assistant: Off. Nothing is sent." on the left. That's
> about the assistant, not my file. Fine, better than nothing. But I would like one line that
> says "this file was read in the browser and nothing was uploaded". I'll come back to that.
>
> "124,318 nodes not drawn. More than this browser draws at once (50,000)." Good. That is an honest
> error message: it names the limit and the number. Gephi would have sat there for ten minutes
> with the fan going. I don't want a hairball of 124k nodes anyway.
>
> Statistics on the right. Let me check the numbers against what I'd get in networkx.
> 1,480,221 over 124,318 times 124,317 is about 9.6e-5. It says 0.0000958. That's the directed
> density. Correct. "Average total degree 23.8" is 2m/n, so in plus out. Good, it says "total".
> Most tools just say "average degree" and leave me to guess. "Weak components 3,912", and the
> largest holds 94.0%. Weak, because it's directed. Somebody here knows what they're doing.
>
> Degree distribution. In / Out / Total, log-log, complementary cumulative. Yes. That's the
> first plot I make, every time. It also says "In-degree 0, not on the log axis: 41,873" and
> explains it. I like that a lot. Most tools silently drop the zeros off a log plot.
>
> Wait. The tail stops at "max 238". But the table is sorted by citationsReceived and the top row
> is 6117075 with 779. So which is it? Is the in-degree of that patent 779 or at most 238? If
> the stats panel says 238 and the table says 779, one of them is wrong, or they are not the same
> quantity. Nothing on this screen tells me which. My guess: citationsReceived is a column from the
> file, counted over the full patent database, and in-degree is counted inside this three-year
> slice. But that's my guess. The screen doesn't say it.

*She stopped here for some time, comparing the table header with the chart.*

> If a junior showed me this, I'd make them explain it before going any further.

### 2. The isolates count

> The isolates count is a link. Clicking it.
>
> OK: 2,406 nodes selected, in-degree 0, out-degree 0, and here it is: "Their citationsReceived
> counts citations from patents outside it." So I was right. It's an external column. But the
> explanation is on the isolates panel. Nobody will click there to find out what the main table
> column means. It belongs on the column header, or next to the "max 238".
>
> A patent with 46 citations that is an isolate in this sample. So its citers are all outside the
> window. That's worth a closer look in itself: the sample cuts off most of the citation
> structure.

### 3. "Narrow the graph..."

> "No filter steps. Every number reads the full graph." Good. Suggested: "Top 3 by
> citationsReceived, with neighbors, 586. Follows the table's sort; favors hubs." At least it
> admits the bias. But "neighbors" in a directed graph: citers, cited, or both? And again it
> ranks by the imported column, not by anything the graph computed. That's fine if I know
> that's what I want. The other option is "Around a node...".
>
> I don't want either one. I want to type a query. `category == "Drugs and medical" and
> citationsReceived >= 25`. There's "Add step". Clicking it.

### 4. The rule editor

> Dropdowns. Keep: Nodes. Where: category is Drugs and medical. AND. Where: citationsReceived
> >= 25. It works, but it's a form. Three dropdowns for one line I could type in five seconds. Is
> there a text mode? I don't see one. Can I pick in-degree in the Where dropdown, or only the
> file's columns? The screen doesn't show the list, so I don't know. If I can't filter on
> something the graph computed, this is a spreadsheet filter.
>
> "612 nodes, 1,843 edges, will draw." Before I commit. Good, that's the right thing. I don't
> have to guess and wait. Filter to.

### 5. 612 patents drawn

> Chip says "612 of 124K nodes, 1 step". Toast: "Filtered to 612 of 124,318 nodes", with Undo.
> Stats updated: 612, "1,843 of 1,480,221" edges. Density 1,843 over 612 times 611 is 0.00493.
> Correct. Average total degree 6.0, correct. 44 weak components, 31 isolates.
>
> The picture is a hairball on the left and a grid of small pieces on the right. As I expected.
> ForceAtlas2, "Engine: WebGPU". What parameters? Gravity, scaling, iterations, seed? It ran
> without asking me, and nothing tells me the settings. If I run it again, do I get the same
> picture? I won't put it in a deck until I know. Also: the labels in the middle overlap each
> other. It's soup.
>
> The in-degree chart for the filtered graph goes to 158 now, and 326 nodes have in-degree 0
> inside the filter. That's more than half. So most of the heavily cited drug patents aren't
> cited by each other within this slice. That's interesting, actually. That would be my second
> "closer look".

### 6. The suggested step instead (Undo, then top 3 with neighbors)

> Three stars, 586 nodes. The side panel says "Describes the 3 most cited patents and all their
> neighbors, not a random sample. It favors hubs, so density and clustering read high." and
> puts a "reads high" tag on density. That is the most honest thing I've seen a graph tool say
> about a sample. Real praise: good.
>
> But: 6117075 has 779 in the table and about 240 neighbors in the drawing. Now I know why, but
> someone who didn't click on the isolates would think the tool lost edges.
>
> The picture: three stars, a few patents citing two of the hubs in between. 6018952,
> 5907468, 6112268 sit between the Computers and Drugs hubs. Those bridging patents are my third
> "closer look": things that cite both a drug patent and a communications patent.

### 7. Find, three patent numbers

> Paste three ids separated by spaces into Find. "3 results in all 124,318 nodes." That works on
> the undrawn graph, good. The inspector for 6117075: grantYear, category, citationsReceived
> 779. "Not drawn: the graph is past the drawing limit. Counted everywhere."
>
> Where's its in-degree and out-degree in this graph? The inspector shows only the file's
> attributes. That's exactly the number I needed an hour ago to settle the 779 versus 238 thing.
> Put the computed degree on the node.

### 8. The filter steps list

> Why am I in Les Miserables now? I was on patents. Fine, it's the same list with more steps.
> Checkboxes to turn a step off, "took out 17, 60 left" per step, and the table has "degree" next
> to "degree on: full graph". That two-column thing is what I wanted on the patent table:
> citationsReceived next to in-degree in this graph. Here it exists, for a toy dataset.
>
> Steps in order, each one saying what it removed. That's reproducible, as long as I can
> export the steps. Can I? "Create rule set" -- I don't know what that produces. I'd want to copy
> the steps as text.

---

## What she found worth a closer look

1. **The sample truncates the citation structure.** Heavily cited patents (779 citations on
   file) have at most about 240 citers inside the sample. 41,873 patents are never cited inside
   it, and 2,406 are complete isolates, even with up to 46 citations recorded. Any centrality
   computed on this sample says more about the three-year window than about the patents.
2. **Highly cited drug patents rarely cite each other inside the window.** After filtering to
   "Drugs and medical, citationsReceived at least 25", 326 of the 612 patents have in-degree 0
   within that set.
3. **Bridging patents between the Drugs and the Computers hubs** (6018952, 5907468, 6112268 in
   the top-3 sample). They are worth reading.

## After the task

**Single Ease Question (1 very hard to 7 very easy): 5.**

> Not hard. The counts, the distribution and "will draw" before commit carried me. I lost
> time on 779 versus 238. That's the tool being unclear about where a number comes from, and
> that's the one thing I don't forgive quickly.

**Would she use this instead of her current tool?**

> Instead of the notebook: no. I'd compute everything in igraph anyway. Instead of Gephi, for
> handing this to the patent attorney so she can find a patent by number and look at its
> neighborhood without me on the call: maybe, yes. That would save me a day. For that, I need
> three things. One line saying the file never leaves the browser. The node's computed degree
> next to the file's column, labelled so nobody confuses them. And the layout settings and
> filter steps shown, so the picture I hand over is one I can reproduce. And let me type the
> filter.

---

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Opened, nothing drawn | The table is sorted by citationsReceived (max 779) and the in-degree chart beside it says max 238. Nothing on the screen says the column counts citations from outside the sample. The only explanation is on the isolates panel. She thought, for a while, that the stats were wrong. | 3 |
| Find, node inspector | A node's inspector shows only the file's attributes, not its in-degree or out-degree in this graph, so she couldn't settle the mismatch on the node itself. | 2 |
| New rule editor | There's no way to type a filter expression. Three dropdowns for one condition. She couldn't tell whether computed measures (in-degree) are offered in "Where", or only file columns. | 2 |
| Rule applied, 612 drawn | ForceAtlas2 ran with no visible parameters or seed. She can't tell if a rerun gives the same picture, so she won't use it in a deck. The labels in the dense core overlap. | 2 |
| "Narrow the graph..." list | "With neighbors" on a directed graph doesn't say whether it means citers, cited or both. The suggested step ranks by an imported column, not by a measure the graph computed. | 2 |
| Opened, nothing drawn | "Assistant: Off. Nothing is sent." is the only privacy statement. It covers the assistant, not the file she opened. | 2 |
| Filter steps list | This part of the session switched to a different dataset (Les Miserables), which broke her context. The "value in this view / on full graph" column pair she wanted for patents appears only there. | 2 |
| Filter steps list | No visible way to copy or export the filter steps as text for the record. "Create rule set" is unexplained. | 2 |
| Degree distribution chart | The "max 238" label sits on the end of the curve. The captions are small and grey, and would get hard to read at her usual 125 percent zoom. | 1 |

## Delights

- The limit message names the limit and the count, and draws nothing instead of freezing.
- The statistics are correct and precisely named: directed density, "average total degree",
  "weak components", and the share held by the largest component.
- The degree distribution is a log-log complementary cumulative chart with In / Out / Total, and
  the zero-degree count stated beside it instead of dropped.
- "612 nodes, 1,843 edges, will draw" appears before she commits the filter.
- The sample says it favors hubs and tags density "reads high".
- "Edges: directed, weight not set" is stated outright.
- Isolates and component counts are links that open their rows.
- Find accepts several pasted ids on a graph that isn't drawn.
