# Session: a graph too big to draw -- knowledge graph engineer

**Participant:** Dr. Min-ji Kim, knowledge graph engineer (composite persona, see
`../../personas/knowledge-engineer.md`).
**Task as given by the moderator:** "Here is last period's citation data. Find anything worth a
closer look."
**Screens used, in order:** past the drawing limit (all six states), Find (the state with the
patent data), the filter chip and its steps.
**Result:** finished with difficulty. She found two things worth a closer look and one thing she
calls a trust problem with the tool itself.
**Single Ease Question:** 4 of 7.

## Think-aloud transcript

### 1. The file opens and nothing is drawn

> "OK. It is already loaded, so I do not get to see the import. I would want to. 'Last import:
> patent-citations-s...' -- truncated, fine, I will hover it later.
>
> The canvas is empty and there is one line: '124,318 nodes not drawn: more than this browser
> draws at once (50,000).' Good. That is the first thing I actually like. It told me before it
> tried, not after my tab froze. That is exactly what the Neo4j browser never did.
>
> But it says the limit is 50,000 *nodes*. There are 1.48 million edges. Is the limit really
> only nodes? If I narrow to 49,000 nodes with a million edges, does it hang? It should say what
> the limit is made of."

She reads the Statistics panel top to bottom, slowly.

> "Nodes 124,318, edges 1,480,221, directed, weight not set. Density 0.0000958 -- let me check.
> 1.48 million over n times n minus one... yes, that is right for a directed graph. Average
> degree 23.8, that is two times edges over nodes, so it is in plus out. Fine, but it should say
> 'in plus out'. 'Degree' on a directed graph without saying which is the kind of thing I get
> asked about in a meeting.
>
> Isolates 2,406. Components 3,912, and one of them is 94% of the patents. That is normal for
> citations. The 41-node, 23-node and 19-node components are what I would actually look at --
> a cluster of 41 patents that cites nothing outside itself in a three-year window is either a
> single assignee citing its own family or a data problem."

She tries to click "41 nodes".

> "Nothing. It is just a row. So the most interesting number on the screen is a dead end. I
> want to click that and get those 41 patents, in the table or drawn -- they would draw, 41 is
> nothing. Instead I have to go and invent a rule for it, and there is no attribute for
> component, so I cannot."

The 2,406 isolates:

> "And the isolates: 2,406 patents with no citations in or out inside this sample. For a
> citation window that is expected at the edges of the window -- the 2001 patents have had no
> time to be cited. I would want to see grantYear for the isolates. Again, no way to click
> through."

The layout row: "ForceAtlas2 -- Waits for a narrower graph."

> "Fine. At least it is not pretending. I do not care about the layout yet anyway."

The Zoom control is greyed out and there is an avatar and a big blue Export button.

> "Export what? There is nothing drawn. I would not click it, but it should not be the loudest
> thing on the screen when there is no picture."

### 2. Narrow the graph...

She clicks the link in the canvas message.

> "A popover called 'Filter steps'. 'No filter steps. Every number reads the full graph.' Good,
> it tells me the scope of the numbers. Then 'Suggested for this graph: Top 3 by degree, with
> neighbors -- a sample: favors hubs -- 586.'
>
> I respect that it calls itself a sample and says it favors hubs. Most tools would call that
> 'Smart view' and not tell me anything. But: degree. Which degree? In, out, total? For
> citations that is the whole question. In-degree is 'cited a lot', out-degree is 'cites a lot'
> and that second one is where you find the weird patents with a thousand references."

She notices "Create rule set" in grey in the header and ignores it.

### 3. Writing her own rule

She chooses Add step rather than the suggestion.

> "New rule. Keep Nodes / Edges. Where category is Drugs and medical, AND citationsReceived at
> least 25. And at the bottom, before I commit: '612 nodes, 1,843 edges will draw.' That is the
> right design. That is the LIMIT in the query, not a display limit. I would use that.
>
> 'Scope: Full graph, no steps above.' OK, so steps chain. Fine.
>
> The operator is typed as '>='. My stakeholders would read that fine; I read it fine."

She hesitates at the button.

> "'Filter to'. Filter to... what? It is the button. It means 'apply'. Fine."

### 4. Drawn

> "It drew. 612 nodes, one big ball in the middle and a grid of little pieces on the right.
> Chip at the top left: 'Filtered: 612 of 124K nodes, 1 step'. The toast says 'Filtered to 612
> of 124,318 nodes -- Undo'. Statistics: edges '1,843 of 1,480,221'. Good, every number says
> what it is out of.
>
> Is position meaningful? It is ForceAtlas2 on WebGPU, so no, it is a force layout, and the grid
> on the right is where it parks the small components. I would like it to say that the grid is
> the small components. A stakeholder will ask why those dots are in rows.
>
> Labels are patent numbers. I have no titles in this file, so that is my data, not the tool.
>
> Components 44, the big one 545 nodes. Isolates 31."

Now she compares the numbers across states.

> "Wait. The top row of the table: patent 6,117,075, citationsReceived 779. And in the sample
> view, the one with the three hubs, the whole sample -- three hubs and their neighbors -- is
> 586 nodes. If 779 was the in-degree in this graph, the hub alone would bring 779 neighbors.
> And in the other screen, the one where it runs on the CPU, max degree is 92.
>
> So citationsReceived is not the in-degree in this graph. It is an attribute that came with the
> file, probably counted over the whole patent database. That is fine -- but nothing on screen
> tells me that. There is a column called citationsReceived and a statistic called degree and
> they disagree by a factor of eight, and I only found out by doing arithmetic. That is exactly
> the thing I would find in a governance review and write a ticket about."

### 5. The same filter, different numbers

She looks at the screen where the browser has no WebGPU.

> "The layout row says 'on the CPU: this browser has no WebGPU'. Quiet, no red banner. Good.
> That is how it should be said.
>
> But the numbers. Same chip: 612 of 124,318 nodes. Here edges are 1,904. On the WebGPU screen
> they were 1,843. Here components is 1. There it was 44, with 31 isolates. Here density 0.0051,
> there 0.00493. And the category column header here says '6 values' and '0 to 779', while
> every row is Drugs and medical and the rule says at least 25. On the other screen it said
> '1 value' and '25 to 779'.
>
> So either this is a different filter wearing the same chip, or the counts depend on which
> engine ran. The chip does not say '1 step' here either, so I cannot see which rule it is. If a
> number changes when the GPU changes, I cannot defend any number it shows me. That is where I
> would stop trusting it."

(Moderator note: the mock text says "the drawing and every number are the same" in the two
browsers. They are not the same on screen. She found it without prompting.)

### 6. The offered sample

She goes back and takes the suggested step instead.

> "Sample: 586 of 124K nodes, 1 step. Three hubs, three star shapes. The statistics panel has a
> grey box: 'Describes a sample: top 3 by degree, with neighbors. It favors hubs, so density and
> clustering read high.' And density has a little tag, 'sample, reads high'. That is honest. I
> like that more than I expected to. I would still ask why it says clustering reads high when
> there is no clustering number on the panel.
>
> Components 1, isolates 0. Obviously -- that is how it was built. So the sample tells me
> nothing about the fragmentation I actually care about. It is a demo picture. It is fine for a
> demo."

The table under the sample: rows 4 onward have citationsReceived 178.

> "Patent 5,931,745, Chemical, 178; and a run of 178s. Several different patents with exactly 178
> citations received, in a row? Either that is a coincidence or the value was copied. That is
> worth a closer look in the source data, and it is the only thing in the table that jumped at me."

### 7. Find

She pastes three patent ids into Find, separated by spaces.

> "'3 results in all 124,318 nodes.' It took a pasted list. Good -- that is how I work, I have
> ids from a SPARQL result and I paste them. It selects the first one in the table and the
> inspector says 'Not drawn: the graph is past the drawing limit. Counted everywhere.' Clear.
>
> The second line of each hit says 'category Drugs and medical'. Why category? Because it is the
> first text attribute, I suppose. I would rather see citationsReceived, or nothing."

The other Find states are the Les Miserables co-appearance graph.

> "The rest of this is Les Miserables. I know that dataset, it is on every graph tool's front
> page. It does not tell me anything about my data. I skip it."

She notes in passing: "The group legend on that one uses a green and an orange next to each
other; I can read them only because the legend has numbers next to the swatches. Do not take
the numbers away."

### 8. The filter chip, on its own

> "Three steps, each with its count: 76, 41, 28. Tick one off and the counts below change.
> Okay. That is a pipeline I can reason about. I would want to export that list of steps as
> text so I can paste it into a ticket -- 'reproduced with these three filters' -- and I did
> not see a way to."

She reads the note about a step being recounted on a large graph.

> "'Counting...' with a spinner instead of an old number. Yes. That is right. What happens at ten
> million? Does 'Counting' ever end, and can I cancel it? It says each step can still be turned
> off while it counts, which is half an answer."

## What she found worth a closer look (her words)

1. "The small components -- 41, 23, 19 patents. Self-contained citation islands in a
   three-year window. I could not open them."
2. "The 2,406 isolates. Probably the edge of the window, but I would want grantYear for them."
3. "citationsReceived disagrees with the graph's own degree by a factor of eight. Someone
   should say where that column came from."
4. "A run of patents with exactly 178 citations received."
5. And about the tool: "The same filter gives two sets of numbers on two screens."

## Single Ease Question

**4 of 7.** "Getting to a picture was easy -- the count before commit is the best thing here.
Finding what is worth a look was not; I did it with a calculator, not with the tool, because
the interesting rows do not click."

## Would she use it instead of her current tool?

> "Not instead. Next to, maybe. For this data -- a citation graph, one relation, a CSV -- it is
> better than Neo4j Browser because it tells me the truth about what it will draw before it
> draws it, and the sample says it is a sample. I would open it to look at a subgraph I already
> chose in SPARQL. But my graph is RDF, and nothing here knows what a class is or where a
> literal goes, and for my own work that ends it. And if the WebGPU numbers and the CPU numbers
> really differ, it ends before that."
