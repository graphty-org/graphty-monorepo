# Session: wide-table filter task -- Expert Emma

Task as given by the moderator: "You want to work only with production hosts that talk to at
least three other hosts. How many hosts does that leave, and how many would there have been if
you had not first limited it to production?"

Outcome: gave up. No number found for either question.

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t07-wide--expert-emma/. In the commands below, OUT stands for that folder's
absolute path.

## Think-aloud

**Start screen (shots/tasks/t07-wide/01.png).** "IT estate, March 2026". 300 nodes, 1,105 edges,
directed, weight on bytes_total_24h. "Local only" chip at the top -- good, that is the first
thing I look for. Average total degree 7.37, highest 25. So the app already knows the degrees;
it just shows me summary numbers. Isolated nodes 7.

Before I touch anything: "talks to at least three other hosts" is ambiguous on a directed
multigraph. Total degree counts edges, not distinct neighbors; A->B and B->A count twice. And
the more interesting point is the second half of the question: if I filter to prod first and
then count degree, I am counting links among prod hosts only. If I count degree first, it is
degree in the whole estate. Those give different answers. Let us see if the tool even lets me
make that distinction.

There is a chip that says "Full graph" with a funnel. That is the filter, presumably.

**01** `--click "Full graph"` -> switches to a Data panel with Sources, Filters, Attributes. The
Filters section says "Filters change what is computed; the eye in the Graph tree only hides."
Good, someone thought about it -- that is exactly my order-of-operations question. "Add filter
step" link.

**02** `--click "Add filter step"` -> a "New step" row, and a menu: "By an attribute or computed
value", "Top of a computed value", "Largest component", "k-core", "Neighbors of the selection".
k-core is not the same as degree >= 3 (it is iterative), so no. Attribute first.

**03** `--click "By an attribute or computed value"` -> a field picker with a search box and the
whole 69-column list. environment is not visible; it is way down.

**04** `--click "environment"` -> wrong one. That clicked the environment row in the left
Attributes list, not the picker, and the inspector now shows the attribute itself: prod 187,
staging 67, dev 46. Useful to know -- 187 prod hosts. But my filter step lost its picker.

**05** `--click "prod"` on that attribute page -> nothing. I half expected "filter to this
value". No.

**06** `--click "New step" --click "Pick a field"` -> back on the step, picker did not open (or
opened and closed).

**07** `--key Escape --click "Pick a field"` -> picker open again. I will just type.

**08** `--key e --key n --key v` -> "1 match", environment. Fine.

**09** `--key Enter` -> "environment is [ ]". Value box focused, empty. No list of the three
values here, even though the attribute page knew them. I have to know to type "prod" rather
than "production".

**10** `--key p r o d --key Enter` -> "environment is prod". And: "Kept all 300 nodes", "This
step 300 of 300 nodes". That is wrong. The attribute page told me 187 hosts are prod. Either the
filter did not apply or the count is stale.

**11** `--key Tab` instead of Enter -> still 300 of 300. The top chip still says "Full graph".

**12-13** `--click "is" --click "is one of"` -> operators are is / is not / is one of / is empty
/ is not empty. "is one of" gives the same empty text box, no value list. Still 300.

At this point I do not trust the counts, but I will see whether I can even build the second
step.

**14** `--click "Add filter step"` (after Tab) -> a second "New step" appears, "2 steps, 2 on",
but the inspector stays on step one and there is no menu.

**15** `--click "New step" --click "Pick one"` -> "nothing on screen is called Pick one". The
click on "New step" only produced a tooltip ("Keeps everything until it has a rule; pick a field
in its inspector") and the inspector still showed step one.

**16** `--click "Kept all 300 nodes"` -> hit the first step's row. Same thing.

**17** With Escape before and after "Add filter step", then `--click "New step"` -> finally step
two is selected with its menu open. Took three tries.

**18** `--click "By an attribute or computed value" --key d e g` -> "No match for deg". The
picker is called "attribute or computed value" and the summary already shows degree, but there
is no degree to filter on. I need to compute it first, apparently.

**19** `--key Escape --click "Graph" --click "Analyze"` -> Analyze palette. "Links (count): how
many edges each node has." That is total degree. Also Links in / Links out. I would call it
degree, but fine. It does not say whether it counts edges or distinct neighbors, which is
exactly my "three other hosts" question.

**20** `--click "Links (count)"` -> a small form: Measure = Links (count), "Under a second", Run.
Nothing about which graph it runs on: the 300, or the filtered set. After the "filters change
what is computed" line in the Data panel I expected it to say "on 187 nodes after filters" or
similar. Nothing.

**21** `--click "Run"` -> "Would add Links (count) at the top of the list, running". Nothing
actually computed. No column, no number.

**22** `--click "Table"` (fresh start) -> node table, 300 nodes, 8 of 69 columns: id, hostname,
fqdn, ip_address, mac_address, role... No degree column. Nothing to sort on.

**23** `--click "Readings not computed"` -> opens the graph's menu with "Compute the overview"
highlighted. That is not per-node degree, it is graph-level readings. Not what I need.

**24** `--click "Full graph" --click "Add filter step" --click "Top of a computed value"` ->
"Top 10 by degree". So degree exists as a computed value here, but only as top N, not as a
threshold. And it still says "300 of 300 nodes" for a top-10 filter, which confirms the count
next to a step is not live. Degree is offered in "Top of" but not in the attribute-or-computed
picker where I need ">= 3". Inconsistent.

I stop here. I have spent more steps than this deserves, the counts the tool shows me are
demonstrably wrong (187 prod hosts on one page, "kept all 300" on the next), and I cannot get a
degree threshold at all. In a notebook this is two lines:

    prod = G.subgraph(n for n, d in G.nodes(data=True) if d["environment"] == "prod")
    sum(1 for _, k in prod.degree() if k >= 3), sum(1 for _, k in G.degree() if k >= 3)

and I would also check the distinct-neighbor version with nx.Graph(G).

## Verdict

- Succeeded? No. Neither number. The only number I got was 187 production hosts, from the
  attribute page, which the filter then contradicted.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? Not for this. The Data panel's one line --
  "filters change what is computed" -- is the right idea and more than Gephi tells you, and
  "Local only" up top is good. But the filter step reports a count I can prove is wrong, degree
  is not available as a filter threshold, the Analyze run does not say which node set it runs
  on, and it does not say whether "links" means edges or distinct neighbors. Patience for a
  wrong count is zero; I would go back to the notebook.

## Problems, in my words

1. Filter step says "Kept all 300 nodes" / "300 of 300" after "environment is prod", while the
   attribute page says 187 prod hosts. Same for "Top 10 by degree". A wrong count is worse than
   no count.
2. Value box for a categorical attribute is a free text box with no list of the three values the
   app already knows.
3. Degree is not in the "attribute or computed value" picker. It appears only under "Top of a
   computed value", which has no threshold. "At least three" cannot be expressed.
4. Analyze -> Links (count) gives no indication whether it runs on the full graph or the
   filtered set, which is the whole point of the second half of the task. And "Run" did not
   produce a column.
5. After adding a second filter step, clicking it did not select it (twice); only a tooltip
   appeared. Took three attempts.
6. In the field picker, clicking a name that is also in the left Attributes list hit the left
   list instead, and threw away the step I was building.
7. "Links (count)" does not say edges vs distinct neighbors, or how a reciprocal pair counts on
   a directed graph.
8. The top chip still reads "Full graph" with two filter steps on.

## Commands

    timeout 120 node app-b/study.mjs --try OUT/01.png task:t07-wide --click "Full graph"
    timeout 120 node app-b/study.mjs --try OUT/02.png task:t07-wide --click "Full graph" --click "Add filter step"
    timeout 120 node app-b/study.mjs --try OUT/03.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"
    timeout 120 node app-b/study.mjs --try OUT/04.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "environment"
    timeout 120 node app-b/study.mjs --try OUT/05.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "environment" --click "prod"
    timeout 120 node app-b/study.mjs --try OUT/06.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "environment" --click "New step" --click "Pick a field"
    timeout 120 node app-b/study.mjs --try OUT/07.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key Escape --click "Pick a field"
    timeout 120 node app-b/study.mjs --try OUT/08.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v
    timeout 120 node app-b/study.mjs --try OUT/09.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter
    timeout 120 node app-b/study.mjs --try OUT/10.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --key p --key r --key o --key d --key Enter
    timeout 120 node app-b/study.mjs --try OUT/11.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --key p --key r --key o --key d --key Tab
    timeout 120 node app-b/study.mjs --try OUT/12.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --click "is"
    timeout 120 node app-b/study.mjs --try OUT/13.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --click "is" --click "is one of"
    timeout 120 node app-b/study.mjs --try OUT/14.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --key p --key r --key o --key d --key Tab --click "Add filter step"
    timeout 120 node app-b/study.mjs --try OUT/15.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --key p --key r --key o --key d --key Tab --click "Add filter step" --click "New step" --click "Pick one"
      (output: nothing on screen is called "Pick one")
    timeout 120 node app-b/study.mjs --try OUT/16.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --key p --key r --key o --key d --key Enter --click "Add filter step" --click "Kept all 300 nodes"
    timeout 120 node app-b/study.mjs --try OUT/17.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v --key Enter --key p --key r --key o --key d --key Enter --key Escape --click "Add filter step" --key Escape --click "New step"
    timeout 120 node app-b/study.mjs --try OUT/18.png task:t07-wide [steps of 17] --click "By an attribute or computed value" --key d --key e --key g
    timeout 120 node app-b/study.mjs --try OUT/19.png task:t07-wide [steps of 17] --key Escape --click "Graph" --click "Analyze"
    timeout 120 node app-b/study.mjs --try OUT/20.png task:t07-wide [steps of 19] --click "Links (count)"
    timeout 120 node app-b/study.mjs --try OUT/21.png task:t07-wide [steps of 20] --click "Run"
    timeout 120 node app-b/study.mjs --try OUT/22.png task:t07-wide --click "Table"
    timeout 120 node app-b/study.mjs --try OUT/23.png task:t07-wide --click "Readings not computed"
    timeout 120 node app-b/study.mjs --try OUT/24.png task:t07-wide --click "Full graph" --click "Add filter step" --click "Top of a computed value"
