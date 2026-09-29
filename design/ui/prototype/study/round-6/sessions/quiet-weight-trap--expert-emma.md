# Session: "The Les Miserables edges carry a number. Rank the characters, then tell me whether you trust the ranking." -- Emma, network scientist

Participant: Emma, network scientist and consultant; lives in Jupyter with networkx and igraph,
uses Gephi for final figures (persona: study/personas/expert-emma.md). 14-inch laptop, Firefox,
100 percent zoom today.

Screens used, in the order she met them (participant view, rendered 2026-09-29): the six frames of
the weight question on a betweenness run (screens/weight-role-trap.html, frames A1 to A6: the load
step, the empty run form, its open answer list, the first result, the result editor with the answer
changed, the re-run). She also looked at the node table ranked by degree and betweenness
(screens/table-dock.html), and at the results panel, the run-and-read catalog and the data panel
(screens/results-panel.html, screens/run-and-read.html, screens/data-panel.html), which on this task
open on other datasets (a protein network, a payments file).

Moderator's task, as given: "The Les Miserables edges carry a number. Rank the characters, then tell
me whether you trust the ranking and why."

Before starting she said: "I know this graph. 77 nodes, 254 edges, unweighted betweenness has Valjean
at 0.570 in networkx, normalized. Myriel second at about 0.177, Gavroche third. The 'value' column is
the number of chapters two characters share. So the trap is obvious to me: a count of co-appearances
is a strength, not a length. If the tool feeds it straight into Dijkstra as a distance, you get
nonsense that looks fine. Let's see whether it does."

## Transcript (thinking aloud)

### 1. Loading miserables.json (A1)

"Read as JSON, nodes and links. 77 nodes, 254 edges, undirected, 0 isolated. Right numbers. Good,
that is step one done and I did not have to count."

"Edge attribute value: whole numbers, 1 to 31, most edges 1 to 3. A histogram. Fine, that is the
right shape -- heavy on 1, long tail up to Valjean and Cosette or whoever it is at 31."

"'A measure that reads value asks, each time it runs, what a bigger value means.' Hm. So it is not
going to guess. That is the right answer to the question I was about to ask, although I'd have
phrased it 'we will not assume weight semantics'. I'll hold them to it."

"Top left: 'Nothing has been sent from this project.' And the rail says Assistant off, nothing is
sent. Good. That's my first question answered without a click. I'd still want to read what 'sent'
covers -- telemetry, crash reports -- but the link is right there. Load."

### 2. Betweenness, empty form (A2)

"Results, Catalog, Centrality, Betweenness. Clicked it. Form: Scope full graph 77. Weight: value. It
picked the column itself. OK. 'In this run, a bigger value means: Choose...' and Run is grey. The
tooltip over Run: 'Choose what a bigger value means first.'"

"Good. That is exactly the right place for the friction. Gephi never asked me this in my life."

"Normalized: on. Normalized HOW? For betweenness that's 2 / ((n-1)(n-2)) for undirected in
networkx, igraph doesn't normalize by default and when it does people get it wrong. There's no
formula, no hover, nothing. I'll assume networkx's convention for now and check against the number
I know."

"Can I set Weight to nothing, to get the unweighted baseline first? The field is a dropdown, so
presumably there's a 'none' in it. I'd open it. I'm not going to, because I want the weighted
version first -- but I'm noting that nothing on the form says unweighted is an option."

"Now -- wait. The table at the bottom. 'Full graph: 77 nodes. Sorted by degree.' Valjean 36,
Gavroche 22, Javert 17, Myriel 10, Thenardier 16, Fantine 15, Mabeuf 11. That is not sorted by
degree. Myriel at 10 sits above Thenardier at 16. And Marius has degree 19 in this graph -- he
should be third and he isn't in the first seven rows at all. So either the sort is wrong or the
label is wrong. Either way the first table I look at says something false about its own ordering.
This is exactly the kind of thing that makes me stop trusting the rest of the screen."

"And top right, Statistics: 'Weight: value, shared scenes, 1 to 31.' So somewhere the tool KNOWS
it's shared scenes. Then why does the load step say it doesn't know what the number means? Where
did 'shared scenes' come from, the file? If it came from the file, fine, say 'from the file'. If
it's a label someone typed, it contradicts the 'we don't assume' story."

### 3. The answer list (A3)

"Choose... Two answers. 'A longer or costlier step -- Distance = value.' 'A closer or stronger link
-- Distance = 1 / value, such as a count of shared scenes.'"

"Now that is good. Each answer tells me the actual transform. I don't have to guess whether 'strong'
means 1/w or -log w or max minus w. It says 1 / value. I can write that in a methods section and I
can reproduce it: networkx takes a weight function, so it's
betweenness_centrality(G, weight=lambda u, v, d: 1 / d['value']). One line."

"The example -- 'such as a count of shared scenes' -- basically gives away the answer for this file.
For me that's fine. For a junior it's a nice nudge."

"The first answer is highlighted, though. Is that just hover, or is it the default? If I press Enter
here I get Distance = value. With an empty 'Choose...' I'd expect nothing highlighted. Someone
tabbing through gets the wrong answer on a count column. Small, but it's precisely the mistake this
screen exists to prevent."

"I'll do what the task probably wants people to do by accident and pick the first one -- no. I'm
not a test subject pretending to be naive. Actually, yes: I want to see whether the tool lets me
see the difference afterwards. Distance = value first, then change it. That's my trust check
anyway: run both conventions and see how much the ranking moves."

### 4. Run 1, distance = value (A4)

"Ran. Runs list: 'Betweenness 10:12, Run 1. Distance = value.' Good -- the conversion is on the run
itself, not buried in a log. The table now has a betweenness column, header '0 to 0.454', and it
says 'Sorted by betweenness'."

"Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177, Thenardier 0.129, Fantine 0.114, Mabeuf
0.089."

"And now I see what happened in step 2: that 'sorted by degree' table was already in THIS order.
Same seven names, same order. So the earlier table was showing the betweenness order with a degree
label, before betweenness existed. That's a mock error or a real bug, and I can't tell which from
here. Noting it again because it's the first thing I'd put in a bug report."

"Is 0.454 plausible for Valjean with value as distance? Yes, direction is right: using counts as
lengths punishes his strongest ties, so paths route around his heavy edges and he loses share to
people with many light ties -- Gavroche up, Javert up. It looks fine. Which is the whole problem:
nothing here looks wrong. Nobody reading this table would know it measures the opposite of what the
data means."

"I can't check 0.454 against my notebook from memory. The unweighted 0.570 I know; the weighted
numbers I'd have to compute. So I'd run the one-liner and compare. Until then these are numbers,
not results."

### 5. Changing the answer on the result (A5)

"Clicked the run. The same form opens, with my answer in it, and 'Top nodes, Run 1 (Distance =
value)' underneath with the five top values and 'Details'. Good -- I edit where I answered."

"Changed it to 'a closer or stronger link'. The button turns into 'Re-run (keeps Run 1)'. Good, it
won't overwrite. The runs list says 'Run 1. Out of date', with a warning triangle, and the table
column header says 'Out of date' too."

"I don't like 'out of date'. Run 1 is not out of date. The data hasn't changed. Run 1 is a correct
answer to a different question, distance = value. 'Out of date' tells a reader 'this is stale, the
graph moved under it'. What actually happened is I have an edited, not yet run, form. Call it
'settings changed, not re-run' or just leave Run 1 alone and show the pending change on the form.
If I send this project to a co-author and they see 'out of date' on Run 1, they will think the data
changed."

"'Details' -- I'd click it. If it tells me the normalization and whether this is exact Brandes or
sampled, that's where I'd look. The frames don't show it open."

### 6. Run 2, distance = 1 / value (A6)

"Re-run. Runs list: 'Run 2. Distance = 1 / value, 10:15' on top, 'Run 1. Distance = value, 10:12'
under it. Both kept, each labelled with its conversion. That's what I want. That is actually what
I want."

"Table: 'Sorted by betweenness, Run 2.' Range 0 to 0.795. Valjean 0.795, Marius 0.499, Myriel
0.224, Fantine 0.193, Courfeyrac 0.177, Thenardier 0.172, Gavroche 0.102."

"Marius second. That makes sense with the story: his heavy ties are Cosette and the students, and
with strong ties short he's the bridge between Valjean's household and the barricade. Gavroche falls
from second to seventh: lots of light, one-scene ties -- exactly what 1/value demotes. Javert is gone
from the top seven. Valjean jumps to 0.795 because his heavy ties become the cheapest paths
through the whole book. Direction of every change is right."

"But the table only shows one betweenness column: Run 2. To compare the two runs side by side --
and the unweighted one -- I have to go somewhere else. In the node table screen, there's a column
header 'Betweenness exact, unweighted, full graph' with 0.570 for Valjean and #3 for Gavroche --
that matches networkx, good -- and a 'Compare rankings...' link and a 'rank of 77' column. So the
tool can show ranks next to each other. I'd want Run 1, Run 2 and unweighted as three columns with
three rank columns, and I'd want the sentence it wrote there ('Valjean is #1 on both measures. At #2
they part...') for these three runs. The weight frames don't show me that, so I don't know if Run 1
and Run 2 can both be columns or whether one replaces the other."

"The other three screens I was pointed at -- results panel, run-and-read, data panel -- open on a
protein network and a payments file. They show the same machinery (a catalog, Betweenness with a
one-line definition, 'amount not used yet, a run that can use it asks what a larger amount means'),
which is consistent, but I can't do this task on them. I ignored them after a look."

### 7. The ranking, and whether I trust it

"Ranking, by betweenness with co-appearance counts read as strength (distance = 1 / value),
normalized: Valjean, Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche."

"Do I trust it? Conditionally, and for specific reasons."

"What I trust: the tool made me say what the weight means before it would run, it wrote the
conversion on the run, and it kept both conversions as separate, labelled runs. The unweighted
betweenness it shows elsewhere, 0.570 for Valjean, is the networkx number to three digits. That's
the step-seven check I do on every tool, and it passed."

"What I don't trust yet: I haven't reproduced 0.795 or 0.454. I'd run the networkx one-liner. The
normalization isn't stated anywhere I can see. And the table told me it was sorted by degree when it
wasn't -- a tool that mislabels its own sort order gets its numbers checked, every one."

"And the honest scientific answer: the ranking below first place is not robust to the weight
convention. Gavroche goes from second to seventh, Javert from third out of the top seven, Marius
from nowhere to second, depending on one modelling choice. 1 / value is defensible for counts, but
it's A choice -- -log(value / max) or 1 / (1 + value) would move it again. So what I'd report is:
Valjean first under every convention; the rest depends on how you read co-appearance, here are
unweighted and 1/value side by side. The tool got me to that sentence faster than Gephi would have,
because Gephi would never have shown me there was a choice."

## Single Ease Question

5 of 7.

"The core of it is easy: the form won't run until I say what the number means, and the answers
name their transform. Minus one for the table that claimed a sort order it didn't have, which cost
me a minute of doubt. Minus one because comparing the two runs and the unweighted baseline side by
side isn't where I did the work -- I'd have to go find it, and I'm not sure it's there for two
weighted runs."

## Would she use this instead of her current tool?

"For the analysis, no. The notebook wins: one line, and I can reproduce it. Nothing here tells me
there's an API I can call from the notebook, which is still the thing I'd ask first."

"For handing this to a co-author or a client who asks 'but which characters matter', yes, maybe --
and this weight question is the reason. It forces the decision I'd otherwise have to explain on a
call, and the run says 'Distance = 1 / value' where they can see it. Gephi would hand them the
wrong ranking without a word. If Details shows the normalization and the export carries the
conversion in the column name, I'd send them this instead of a screenshot."

## Problems found

1. **Table claims a sort it does not have.** (weight-role-trap, A2: "Full graph: 77 nodes. Sorted by
   degree." with Myriel 10 above Thenardier 16 and Marius, degree 19, missing from the first seven
   rows; the rows are the later Run 1 betweenness order.) The first number table she reads states
   something false about itself; she doubts every number after it. Severity 3.
2. **"Out of date" on a run whose data did not change.** (weight-role-trap, A5: "Run 1. Out of date",
   column header "Out of date" after she edits the answer in the result editor.) Reads as "the graph
   changed under this run"; Run 1 is a valid answer to a different setting. A co-author would
   misread it. Severity 2.
3. **Normalization not stated.** (weight-role-trap, A2 to A5: "Normalized" switch with no formula or
   convention.) She has to assume networkx's; igraph users would assume otherwise. Severity 2.
4. **Two weighted runs and the unweighted baseline not side by side.** (weight-role-trap, A6: one
   betweenness column, "Sorted by betweenness, Run 2"; the rank-comparison columns and sentence exist
   only on the table-dock screen, for an unweighted run.) The sensitivity of the ranking to the
   weight convention is the finding, and she cannot see it in one place. Severity 2.
5. **First answer highlighted in the empty choice list.** (weight-role-trap, A3: "a longer or
   costlier step" highlighted while the field reads "Choose...".) If that is keyboard focus, Enter
   picks the wrong reading for a count column -- the mistake the screen exists to prevent. Severity 2.
6. **Nothing says "no weight" is an option.** (weight-role-trap, A2: Weight dropdown shows "value"
   with no visible alternative.) She wanted the unweighted baseline first and had to assume it was
   in the dropdown. Severity 1.
7. **Graph statistics already describe the weight's meaning.** (weight-role-trap, right panel:
   "Weight: value, shared scenes, 1 to 31" while the load step says meaning is asked per run.) Unclear
   where "shared scenes" came from; contradicts the "we do not assume" message. Severity 1.
8. **Exact or sampled not said on the weighted runs.** (weight-role-trap, A4 to A6; the table-dock
   header says "exact" for the unweighted run.) Severity 1.
9. **Supporting screens open on other datasets.** (results-panel, run-and-read, data-panel for this
   task show a protein network or a payments file.) The task cannot be followed on them. Severity 1.

## What she liked

- Run stays disabled until she says what a bigger value means, and the tooltip says why.
- Each answer names its conversion: "Distance = value", "Distance = 1 / value". She can put it in a
  methods section and reproduce it in one line of networkx.
- The conversion is written on the run in the runs list, not hidden in a log.
- "Re-run (keeps Run 1)": changing the answer never overwrites the first result; both runs stay,
  each with its own label.
- The load step gives the right counts (77, 254, undirected, 0 isolated) and a histogram of value
  without asking her anything.
- The unweighted betweenness elsewhere in the product (0.570 for Valjean, Myriel second, Gavroche
  third) matches networkx.
- "Nothing has been sent from this project" and "Assistant off. Nothing is sent." visible before any
  click.
