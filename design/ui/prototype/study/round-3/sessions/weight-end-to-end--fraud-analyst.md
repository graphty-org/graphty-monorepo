# Session: a weighted route and a hub, end to end -- Sarah, fraud analyst

Participant: Sarah, level-2 financial crime investigator (see study/personas/fraud-analyst.md).
Mode: first impression, not mandated. She was not told her manager wants the tool.
Screens, in order: the Apply recipe dialog (binding-step), the measure options with the weight
question (option-form-cost), the Results panel (results-panel). All three mocks show a
300-protein interaction network, not transactions; the participant was asked to imagine her own
account data with an amount column on the transactions.

Moderator task, read once: "Your edges have an amount column. Find the cheapest route between two
accounts and who is most central, and say what each result used."

## Transcript

### 1. The Apply recipe dialog

> "OK, first thing. This is proteins. Fold change, genes, qPCR. Not my world, but fine, I'll
> pretend 'confidence' is my amount column."

She skims the grey paragraph at the top of the page without reading it, goes to the dialog.

> "Apply recipe. A recipe is... someone's saved analysis? So I didn't build this, somebody sent
> it. I wouldn't start here -- I'd start with my account export. Nobody sends me recipes. My team
> lead sends me an escalation with a spreadsheet attached."

She finds the table "What it reads from the data" and reads the rows.

> "Need, Your column, On your data, Used by. That's a mapping table, like the i2 import spec,
> but shorter. Good. I like that it tells me what's found: 'keeps 1,059 of 1,262'. That's a
> count I can check."

She stops on the Weight row: "For confidence, a higher number means [a closer or stronger link]
similarity -- the recipe's answer".

> "Here's my column. For amount, a higher number means... a closer or stronger link. Yeah, I'd
> say that. Ten grand between two accounts is a stronger link than fifty bucks. That's how I read
> a link chart: thicker line, more money, more important."

Looks at the second variant, where the select is open with four choices.

> "A longer or costlier step, distance. More can pass through, capacity. Don't use.
> Hmm. 'Costlier step'. The moderator said cheapest route. So is cheap... small amounts? That
> doesn't make sense for money. I'm not looking for the route with the smallest transfers, I'm
> looking for where the big money went."

She pauses a long time.

> "I don't know what 'cheapest route' means with money, honestly. In my job the route is the
> route the funds took. If you mean fewest hops, say fewest hops."

She picks "a closer or stronger link" (similarity) because that matches how she thinks about
amounts. She notices the fine print under the page title, "asked once, on the column".

> "Wait -- once? For everything? So whatever I pick here, every other thing uses it too?
> I'll come back to that."

### 2. Measure options -- the refusal and the question

She looks at the first render: the Betweenness panel with a yellow warning.

> "Betweenness. I would never click that. What is it? I'm looking for the hub, the account
> everything touches. Is that Betweenness? PageRank? Katz? Sounds like a law firm. There's no
> 'hub' anywhere in this list."

Moderator gives no help. She guesses.

> "PageRank is Google, it's the 'important' one, right? But the screen already has Betweenness
> open, so I'll go with whatever it's showing me."

She reads the warning: "Can't weight paths by confidence: confidence isn't set up as a length
yet... Until you say what a higher confidence means, no measure uses it, PageRank included."

> "OK, it refused instead of guessing. I actually respect that. An examiner asks me 'what did
> this number use' and I need an answer. But 'set up as a length'? Amount isn't a length. It's
> dollars."

She clicks "Set up confidence" (the next render opens the question under Weight by).

> "Examples: 0.99, 0.79, 0.40. On my data it would say 9,800.00, 250.00, 12.50. That's helpful,
> seeing real values."

Now she hits the problem she flagged earlier.

> "So I already said amount means 'stronger link' in the recipe screen. And this says 'the
> answer is kept on confidence: every measure and the Path tool read it'. So the path tool reads
> bigger amount as stronger. Does 'cheapest route' then mean the route through the biggest
> transfers? Or does it flip it? I have no idea what the path is going to do with 'stronger'."

> "And if I want the hub to be counted by money -- who moved the most -- but the route to be the
> fewest hops, I can't. One answer for the whole column. In Excel I'd just have two pivots."

She considers switching to "a longer or costlier step".

> "If I pick costlier, then a 10,000 transfer is a 'long' step and the route avoids the big
> money. That's backwards for a mule chain. The money that matters would look far away. No."

She leaves it on "stronger link" and presses Run in her head.

### 3. Results panel -- reading what each result used

She looks at the Finished render.

> "Betweenness finished. Grey text: 'on: full graph, 300 nodes, 3 components. Exact.
> Unweighted, undirected. WebGPU.' Unweighted. So it did NOT use my amounts? Or is that the old
> one? And undirected -- money has a direction. A sends to B. If it's ignoring direction, the
> hub is wrong for me. Where do I say direction? It says 'undirected, as the graph'. My graph is
> not undirected."

> "WebGPU, I don't care. Take it off my screen, or tell my IT guy, not me."

She scrolls to Top nodes.

> "MAPK1, 0.1370. What's 0.137? Of what? If this was an account I'd want 'receives from 47
> accounts, sent out 212,000 in 9 days'. A number with four decimals goes nowhere in a SAR."

She looks for the path result. The only path she finds is in the out-of-date render: "Shortest
path TP53 to SMAD3" with a dashed line on the chart.

> "There's my route. The dashed line. TP53, MSH2... how many hops is that? Two? Three? What's the
> total? There's no total amount anywhere. The legend says 'Shortest path TP53 to SMAD3' and a
> yellow mark, that's it."

She reads the "Review out of date" box: "confidence is now read as a similarity; these read it as
a distance. Louvain; Shortest path TP53 to SMAD3. Betweenness and Closeness read no weight, so
they stay current."

> "OK, this is actually the thing the moderator asked. It tells me the path used it as a distance
> and now it's a similarity, so the path is stale. And it tells me Betweenness used no weight at
> all. So that's my 'what did each result use' -- but I only found it because something went out
> of date. On the normal finished screen I have to read small grey text."

> "And 'Louvain'? Never heard of it. Is that a ring finder? Say ring."

She tries to answer the task.

> "Cheapest route: I think it's the dashed line, and I think it used amount as... a distance, the
> first time, then I changed it. Honestly I'm guessing on the direction of it. Most central:
> Betweenness, which used no amounts and ignored direction. So my 'hub' is by count of links, not
> money. If I wrote that in a case file my QA reviewer would send it back."

## After the task

Single Ease Question: 3 of 7.

> "It's honest, I'll give it that -- it stops and asks instead of making something up, and the
> out-of-date box tells you exactly which result read what. That's more than i2 does. But I had
> to translate everything. Proteins, 'length', 'similarity', 'Betweenness', four-decimal scores,
> WebGPU. The one question it asks me -- what a bigger amount means -- I answered one way for the
> route and would have answered the other way for the hub, and it won't let me. And there's no
> total, no hop count, no direction on money."

Would she use it instead of her current tool?

> "Not instead of Excel. Maybe instead of i2 for the one case a quarter with forty accounts, if it
> could show me the route with hops and a total and name the hub as 'receives from 47 accounts'.
> Right now I'd still rebuild the numbers in a pivot for the reviewer, so what did it save me?"

## Observed problems (for the studio)

1. "Cheapest route" has no meaning for money in her work; neither weight answer maps cleanly.
   "Stronger link" fits how she reads amounts, "costlier step" is what a cheapest route needs,
   and the screen never says what the Path tool does with a similarity answer. Severity 3.
2. One answer per column for every measure and the Path tool: she wanted amount as strength for
   the hub and plain hop count for the route, and could not have both without flipping the
   column and making earlier results stale. Severity 3.
3. The path result shows no hop count and no total amount; only a dashed line and a name.
   Severity 3.
4. Algorithm names (Betweenness, PageRank, Katz, Louvain, HITS) with no plain description; she
   guessed which one is "the hub". Severity 3.
5. Direction: centrality shows "undirected, as the graph"; money is directed and she saw no
   obvious place to change it. Severity 2.
6. "What each result used" is only prominent in the out-of-date review; on a finished result it
   is small grey text mixing "Unweighted" with "WebGPU" and "Exact". Severity 2.
7. Scores are unexplained decimals (0.1370) with no unit or count she could put in a SAR.
   Severity 2.
8. "Set up as a length" -- the refusal speaks of lengths for a column of dollars. Severity 2.
9. Entry point: a received recipe from a colleague is not how her cases start. Severity 1.

## What worked

- The run refused instead of silently dropping the weight, and said which measures would not use
  the column. She called that defensible to an examiner.
- Real example values in the weight question.
- The out-of-date review naming which results read the column as what, and which read no weight.
- The matched counts in the binding step ("keeps 1,059 of 1,262") are numbers she can check.
