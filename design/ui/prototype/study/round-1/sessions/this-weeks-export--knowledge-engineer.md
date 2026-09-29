# Session: this week's export -- Dr. Min-ji Kim, knowledge graph engineer

**Task given by the moderator:** "This week's export arrived. Do what you did last week, and show
your manager what changed."

**Screens used, in order:** the load step (open and add data), the Results panel (out-of-date
state), the comparison surface (two data versions), version history.

**Setup note from the moderator:** the prototype holds a payments data set (accounts and
transfers), not her knowledge graph. She was asked to treat "accounts" as her entities and
"transfers" as her object-property statements, exported from SPARQL as a
subject, predicate, object CSV the way she did last week.

## Transcript

**Load step, first frame ("Open a graph").**

"Right. First thing: there is no Turtle, no JSON-LD, no endpoint. I knew that from last week. So
this is my SELECT result flattened to CSV again, which means datatypes, language tags and named
graphs are already gone before this tool sees anything. Fine. I did that last week; I am doing it
again.

"I see 'Open a graph', a Recent list and 'Open...'. The recent item is my project from last time.
But I do not want to open a new graph. I want this week's file to become the current data of the
project I already have. There is no button that says that here. 'Open...' would make a second
project, and then I have two unrelated graphs and no comparison. I'll open the recent project
first and look for it inside."

**Load step, the dialog itself.**

"The dialog is good, I will say that. Format detected, 'Each row is: An edge', the two ends
picked, direction stated. Each column has 'Read as' and 'Role'. Nothing guessed from the column
name -- amount sits at 'Unknown' until I say what it means. That is correct behaviour and rare.

"My file has a predicate column. What role do I give it? On this frame I only see Weight and Time
role. I had to go to the protein example further down to find a category column set to 'Edge
type'. So I can map the predicate. It is called 'Edge type', which is wrong -- it is a predicate,
and in my graph the type of an edge is not the same thing as its predicate -- but it will carry
the value. That is one of my two tests passed, grudgingly.

"Second test: can I keep literal-valued rows from becoming nodes? I look for it. 'Each row is: An
edge' is the only option shown for my rows. There is no 'object is a literal, put it on the
subject'. 'Filter at import' appears only on the too-large frames and the note says it is not
there yet. So every rdfs:label I forgot to strip becomes a node called 'Acme Holdings Ltd'. Last
week I stripped them in the query. The tool gave me no way to do it here. That is a fail. I am
staying only because the query workaround exists."

**Load step, "Add data" frame.**

"This is the closest thing to 'the new week's file'. 'Add data from transfers-2026-04.csv'. It
says matched 2,961, new 132. Matched on what? It does not say which column is the key. For me it
is the IRI; if it matched on a label I have a problem. I assume the source and target columns.

"Now 'After the merge: nodes 3,132, edges 17,483. Adds 132 nodes and 8,370 edges to 3,000 and
9,113.' Stop. That is a union. My export is a full snapshot. If a triple was deleted in the store
this week, a union keeps it. If an entity was merged away by entity resolution, it survives here
as a ghost. 17,483 edges is not my graph this week; it is last week plus this week. And there is
no count of what was in the project but is not in the file -- that is exactly the number I care
about, the removals. I would not press 'Add data'. I cancel.

"So where is 'replace'? The small print in the corner of the design notes says the dialog also
does 'Replace data', but I have no frame of it and no idea which menu it lives in. I would go
looking in a project menu. As a participant I cannot find it. I am guessing it exists because of
what comes next."

**Results panel, out-of-date state.**

"Suppose the data was replaced. Last week I ran components, degree and the community detection.
Here there is 'Needs action 2' with 'Review out of date' and 'Re-run all', and the popover says
why each is stale and which results stay current because they do not read the thing that changed.
That is honest. I like that it tells me what it will NOT re-run and why. This is the 'do what you
did last week' part, and it is one button. Good.

"The catalog shows costs in words -- 'under a minute', 'hours', 'over a day'. On my laptop with
integrated graphics, fine, I would rather know. Weakly connected components shows 3,912 on the
citation example; on my data that number is my first quality check, so I want it at the top, and
it is.

"But note: this frame shows results going stale because a weight role changed, not because the
data was replaced. I am assuming the same thing happens after a replace."

**Comparison surface, "Two data versions".**

"Now the manager part. Two sides, 'March data' and 'April data', each named with its file. One
colour scale for both sides -- they say so in the legend, 'one scale, both sides'. Purple to
yellow; no red against green, so I can read it.

"The right column: Spearman 0.876 over the 2,961 in both, top 50 in both 49 of 50. 'Not matched:
only in March, closed 39; only in April, opened 132.' THIS is the removal count I wanted on the
load step, and it is here, three screens later. And 'absent' rather than a dash or a zero for an
entity that did not exist -- correct. Absent is not low.

"The half-ring for 'only in March' versus 'only in April' is a shape, not a colour. Good for me.
At 3,000 dots I cannot actually see them, but the counts are there.

"What it compares is one measure's ranking. My manager does not ask 'did PageRank move'. My
manager asks 'how many entities were added and removed, which classes grew, did entity
resolution merge anything it should not have'. This screen answers the first question, per
entity, and nothing about predicates or classes. 'Moved 1,487 places' is interesting to me; it is
noise to a manager.

"And at the top of the page it says 'Not buildable yet' -- the whole comparison waits on the
component underneath. I read that. So this part I am evaluating a promise, not a tool.

"To show the manager: 'Save comparison', 'Done', and Export is behind the three dots. If I export
this, the manager gets two hairballs side by side. I will not put two hairballs in front of an
executive. I would take the numbers from the right column and put them in a slide myself."

**Version history.**

"How would I get here? I do not see the entry point on the screens I was given; I found it because
the moderator gave me the page. Once here: 'April data, current', 'Replace data from
transfers-2026-04.csv'. So Replace exists. The report: accounts 3,093, transfers 8,370, found by
id 2,961 of 3,000, new 132, not in April 39, rows dropped 0. That is the import report I wanted
at the moment of import, before I committed. It says 'found by id', so the key is the id. Good --
that answers my question from the Add data frame, one screen too late.

"'Methods, one sentence per run' -- the algorithm, weighting, direction, seed, resolution, the
counts, the software version, CPU or GPU. That is provenance. I would copy that straight into the
ticket. And 'Louvain replayed: 65 communities, was 35.' Nearly double with 3 percent more nodes.
I would not show that to a manager without checking whether the partition is stable; the
comparison screen says a seeded method gets a re-run agreement number, which is the right idea.

"'Restore version' adds a new version on top instead of rewriting history. That is how I would
want it. 'Export log' -- if that is a change list I can turn back into SPARQL UPDATE, I am
interested. It does not say what format."

## After the task

**Single Ease Question (1-7):** 3.

"The re-run and the reporting are better than anything I have in a viewer. The part the task
started with -- putting this week's file in place of last week's -- I could not find. The one path
I did find, Add data, would have silently unioned two snapshots, and it hid the removals until
after I had committed. That is the dangerous kind of easy."

**Would she use it instead of her current tool?**

"No, not instead of SPARQL and a spreadsheet. Those give me the added and removed counts per class
and per predicate in one query, and the query is the audit trail. I would use this for one thing:
version history's methods text and the out-of-date re-run, if I could load my graph without
flattening it and without every literal turning into a node. Give me Turtle import, literals on
the entity, 'predicate' instead of 'edge type', and a replace step that shows added, removed and
matched-by-what before I press the button, and I would come back for a second session."
