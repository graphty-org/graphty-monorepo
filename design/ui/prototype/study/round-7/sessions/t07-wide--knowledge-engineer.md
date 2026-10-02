# Session: wide IT estate, production hosts with three or more neighbors -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona: study/personas/knowledge-engineer.md)

Task as given: "You want to work only with production hosts that talk to at least three other
hosts. How many hosts does that leave, and how many would there have been if you had not first
limited it to production?"

Start screen: shots/tasks/t07-wide/01.png. Renders: tmp/round-7-sessions/t07-wide--knowledge-engineer/01.png to 13.png.
Every command ran from design/ui/prototype; `D` stands for that render folder.

## Think-aloud

**Start screen.** "Hosts, 300 nodes, 1,105 edges, directed. Average total degree 7.37. I need an
environment column and a neighbor count. Before anything: 'talk to at least three other hosts'
means three DISTINCT neighbors, either direction, not three edges. If the tool gives me total
degree, that counts parallel edges and in plus out. I will want to know which one it is. Top
bar says 'Full graph' with a funnel. That looks like the filter state."

**01** `--click "Full graph"`
"It opened the Data panel: sources (hosts CSV, 300 nodes; connections CSV, 1,105 rows to 1,105
edges -- good, it says rows versus edges), Filters, Attributes. 'Filters change what is computed;
the eye in the Graph tree only hides.' Good, that is exactly the distinction I need: the
neighbor count after restricting to prod has to be computed on the prod subgraph, not on the
whole estate. Add filter step."

**02** `--click "Full graph" --click "Add filter step"`
"A step called 'New step' and a Keep menu: by an attribute or computed value, top of a computed
value, largest component, k-core, neighbors of the selection. k-core is interesting -- a 3-core
is NOT what I was asked, though, a 3-core is recursive. I will start with 'by an attribute'."

**03** `... --click "By an attribute or computed value"`
"Field picker with a search box. environment is below the fold in the picker; I can see it in
the left list."

**04** `... --click "environment"`
"That opened the environment attribute itself, not my condition. Fine, I clearly hit the copy in
the left list. Useful anyway: 3 distinct values, prod 187, staging 67, dev 46, 100% fill. The
value is 'prod', not 'production'. My step still says 'Kept all 300 nodes'."

**05** `... --click "New step" --click "Pick a field"`
"Back to the step. The 'Pick a field' dropdown did not open on that click."

**06** `... --click "Pick a field" --click "Pick a field"`
"Open now, but environment is still below the fold, and the same name sits in the left list."

**07** `--click "Full graph" --click "Attributes" --click "Add filter step" --click "By an attribute or computed value" --click "environment"`
"Collapsed the attribute list so there is only one environment to hit. Now it reads
'environment is [empty box]'. Side note: the attribute list says 95 attributes, the table footer
says 'Columns: 8 of 69'. Which is it? Probably the 95 counts the connection attributes too, but
nothing on screen says so. I notice numbers that disagree."

**08** `... --click "prod"`
"That selected a host called monitor-prod-iad-03 and threw me to the Graph panel. 'prod' matched a
hostname. My mistake, but a value box with no list of values invites it."

**09** `... --click "environment" --key p --key r --key o --key d --key Enter`
"Typed prod. The step now reads 'environment is prod'. And it still says 'Kept all 300 nodes',
'This step: 300 of 300 nodes'. The attribute panel told me 187 hosts are prod. So the condition
I can read is not the condition being applied, and nothing tells me why. Is 'prod' not a match?
Did it not re-run? No message, no zero, no error. That is a count I cannot defend."

**10** `... --key p --key r --key o --key d --key Tab`
"Tried leaving the box with Tab instead of Enter in case it commits on blur. Still 300 of 300."

**11** `... --key Enter --hover "Add filter step"`
"The plus next to Filters is 'Add filter step'. I want to see whether the second half -- three
or more neighbors -- is even expressible, and whether it runs on the filtered set."

**12** `... --click "Add filter step"`
"'2 steps, 2 on'. A second 'New step, kept all 300 nodes' appeared, but this time no Keep menu,
and the right side still shows the first step."

**13** `... --click "Add filter step" --click "New step" --click "Pick one"`
Tool: `nothing on screen is called "Pick one"`.
"Clicking the new step only gives me a tooltip: 'Keeps everything until it has a rule; pick a
field in its inspector'. Its inspector is not there; the right side still shows 'environment is
prod'. I cannot reach the second step's rule at all."

"That is two unexplained failures: a condition that is displayed but not applied, and a second
step whose rule I cannot open. I stop."

## Outcome

- Answer given: none. The only number I trust is 187 prod hosts, from the attribute's own value
  counts, and that is not what was asked. I never saw a neighbor count, filtered or unfiltered,
  and never found out whether the neighbor count would be distinct neighbors or total degree.
- Succeeded: no. Gave up.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool (SPARQL plus a spreadsheet)? No, not on this
  evidence. In SPARQL this is two GROUP BY ... HAVING (COUNT(DISTINCT ?n) >= 3) queries, one
  with the environment filter inside, and I know exactly what each number means. Here the
  pipeline idea is right -- ordered steps, "filters change what is computed", counts per step --
  and that is more than most graph viewers offer. But a step that says "environment is prod"
  and keeps 300 of 300 is worse than no step, because it looks like an answer.

## What worked

- "Filters change what is computed; the eye only hides" is the distinction I care about, said
  in one line where I needed it.
- Each step shows how many nodes it kept. That is the right place for the number.
- The attribute inspector gives distinct values with counts and fill. That is how I found that
  the value is "prod" and that there are 187.
- Sources say "1,105 rows, 1,105 edges", so nothing was silently merged on import.

## Problems I hit

1. A typed value condition ("environment is prod") is shown in the step title but the step still
   keeps all 300 nodes, with no message. 187 was expected. Severe: it is a wrong number dressed
   as a right one.
2. Selecting a second filter step does not open its rule in the inspector; the tooltip tells me
   to pick a field there, and the inspector keeps showing the first step. Blocks the task.
3. The value box is a blank text box. It does not offer the three known values, though the
   attribute already knows them (prod, staging, dev with counts). I had to guess "production"
   versus "prod".
4. The field picker opens with environment below the fold, and the same attribute name sits in
   the left list, so a click on the name opened the attribute instead of choosing it. The first
   click on "Pick a field" also did not open the picker.
5. "95 attributes" in the Data panel versus "Columns: 8 of 69" in the table footer, with nothing
   saying the 95 includes connection attributes.
6. Not reached, but my question for the designers: when a step keeps "at least three neighbors",
   does that mean distinct neighbors, in plus out, or total degree on a directed multigraph? The
   summary only offers "total degree".
