# Session: an amount column, from binding it to reading two results -- supply chain analyst

Participant: Dana Okafor (composite persona), supply chain risk analyst. Laptop screen, browser at 110%.

Task as given by the moderator: "Your edges have an amount column. Find the cheapest route between two
accounts and who is most central, and say what each result used."

Screens, in order: the recipe dialog's binding step, the measure option form with cost, the Results panel.
Every mock shows a protein network or a patent network; none has an amount column or accounts. Dana was
told to treat "confidence" as her amount column.

## Think-aloud transcript

**Before starting.** "Accounts? I don't have accounts. OK, you mean suppliers and sites. And amount is what
we pay on that link. Fine -- spend. Let's go."

### Screen 1: the binding step ("Apply recipe")

"Apply recipe. I didn't ask for a recipe. I've got a file and a column. Someone sent me a saved analysis,
is that the idea? OK."

"Top half: 'Brings 2 styles, 1 filter, 1 run.' I don't know what a run is yet. 'What it reads from the
data' -- this is a table, good, I read tables. Need, Your column, On your data, Used by. Weight --
confidence -- 10 communities -- Communities run. So the weight is my column, and it's used by something
called communities."

"Under it: 'For confidence, a higher number means...' and a drop-down that says 'a closer or stronger link,
similarity, the recipe's answer.' Hm. That's the question, isn't it. Does a higher amount mean more or less?
Let me open it." [opens the list]

"'A closer or stronger link.' 'A longer or costlier step.' 'More can pass through.' 'Don't use.'"

"This is actually the right question, and I'd get it wrong half the time. Is a big spend a strong link --
that supplier matters, we're tied to them -- or is it costlier? If I'm looking for a critical supplier,
big spend is a strong tie. The moderator said 'cheapest route', so for THIS task the amount is a cost and
I want the smallest total. I'll pick 'a longer or costlier step'."

"The grey words after -- similarity, distance, capacity -- I'm skipping those. The first words carry it."

"What I don't like: I'm answering this for the whole column, not for the question. What if next week I
want 'biggest spend chokepoint' and that needs the other answer? It says 'Every measure and the Path tool
read this one answer' -- no, wait, that sentence was in the paragraph at the top, I didn't read it the first
time. So if I flip it, everything flips. That's a little scary but at least it's one place."

"Apply button, bottom right. 'Everything was found by name. One Undo takes it all back.' OK, good, one undo."

### Screen 2: the measure form with cost ("Betweenness")

"Now I'm in the thing with the network picture. Left side: Results. Catalog: Betweenness, Closeness,
Eigenvector, Harmonic centrality, HITS, Katz, PageRank. Seven ways to be 'central'. I know betweenness --
chokepoint, from the webinar. I'll click that. Everything else is noise to me; there's no sentence saying
which business question each answers."

"First state: yellow warning. 'Can't weight paths by confidence: confidence isn't set up as a length yet.'
Length? It's money. What's a length? I read the first line and it's telling me no. Then the blue button
'Set up confidence'. OK, I press the blue button, that's what you do."

"Second state: the same four choices again, inline this time. 'For confidence, a higher number means...
Examples: 0.99, 0.79, 0.40.' That's good -- showing me example numbers makes me think about my actual data.
My amounts would be 12,400 and 380, so I'd know instantly those aren't similarity scores."

"But hang on -- in my version of events I already answered this on the first screen. If I'd said 'costlier'
there, would this warning even show up? I think no -- the warning says 'isn't set up yet'. So in my flow I'd
skip this. If it DID show up after I answered, I'd assume the first screen didn't save, and I'd stop
trusting it."

"'Nothing runs until you answer.' Good. I hate things that run on their own."

"'Run' button is grey until I pick. Fine."

"The 'over the time limit' stuff with hours and sampled -- not my scale, a couple thousand suppliers. I'd
never see it. Moving on."

### Screen 3: the Results panel

"Finished betweenness. The card says: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted,
undirected. WebGPU. Details.' That line IS the answer to 'what did it use' -- if I can read it. It's small
and grey and I need my glasses. 'Unweighted' -- I'd read that as 'it didn't use my amounts'. Which for a
chokepoint count might be wrong for me, so I'd go back. Components -- don't know. WebGPU -- don't care,
that's IT's business."

"Under that: Weight drop-down, 'None declared'. OK so two places say it: the sentence and the drop-down.
Good, I'd find one of them."

"Top nodes -- a list. MAPK1 0.1379. Cut off at the bottom of the card. I want that list bigger and I want it
out to Excel. The 'Export...' button top right, I assume that's it."

"Now the cheapest route. Where? Catalog, scrolling -- Path: All-pairs distance, Breadth-first search,
Depth-first search, Shortest path. 'Shortest' isn't 'cheapest'. Shortest to me is fewest hops. I'd hesitate
here. I'd probably click Shortest path because there's nothing called 'cheapest'. There's also a 'Path tool'
the first screen mentioned -- I didn't see a button called Path. There's a toolbar at the bottom with icons
and no words. I don't click unlabelled icons."

"I never saw a finished shortest path result card, so I can't tell you what it would say it used. What I
did see: the 'out of date' screen. Left side, 'Needs action 2', 'Shortest path TP53 to SMAD3, Out of date,
Re-run'. The box: 'confidence is now read as a similarity; these read it as a distance. Betweenness and
Closeness read no weight, so they stay current.' -- THAT is exactly what I want. Plain. It tells me which
result used my amount and how, and which ignored it. If every result said that, I'd trust it."

"But it also tells me something I didn't know: betweenness 'reads no weight'. So my chokepoint answer
didn't care what I pay anybody. OK -- that might be right for a chokepoint -- but nobody told me before I
ran it. And on screen 2, betweenness HAD a 'Weight by' box. Now it says it read no weight. Which is it? I
think it means that particular run was unweighted. That's the kind of thing I'd have to ask about."

"The path total. Nowhere did I see 'total amount: $X' for the route. For 'cheapest', the number I'd put on
a slide is the total. The dashed line on the picture is nice, but I need the number and the hops in a table."

## Where Dana ended up

- Weight meaning: answered correctly ("a longer or costlier step") on the first screen, after some thought
  about whether spend is a strength or a cost.
- Most central: picked Betweenness because it is the only name she knew; read "Unweighted, undirected" on
  the finished card and correctly said it did not use her amounts. Did not know what "3 components" or
  "WebGPU" meant.
- Cheapest route: found "Shortest path" in the catalog after scrolling, with doubt that "shortest" means
  cheapest. Never saw a finished path result with a total, so could only say what it used through the
  out-of-date message.
- Said correctly, for both, which read her amount and which did not -- mostly thanks to the out-of-date box.

## After the task

**Single Ease Question: 4 of 7.**

"The amount question is good -- honestly better than Gephi, which just assumes. And that out-of-date box
is the best thing I saw today, it tells me in English what each result used. But I had to hunt for
'cheapest', the word isn't there. The line that says what it used is tiny grey text full of words like
components and WebGPU. And I never got a total cost for the route, which is the one number I'd take to
the VP."

**Would she use it instead of her current tool?** "Not instead. For 'cheapest route through my
suppliers' I'd need the Tier 2 links anyway, which I don't have for most spend -- so where do I get
that data from? For a chokepoint list on Tier 1 it's closer, but I'd still need the table out to Excel or
Power BI, and I'd need IT to tell me where my supplier file goes when I load it. Right now it's a nice
side tool. Put the route total in a table I can export and name the measures in my words, and I'd try it
on the next disruption."

## Problems observed

1. Results panel -- no "cheapest" route: the path measures are named Shortest path, Breadth-first search,
   Depth-first search and All-pairs distance; "shortest" reads as fewest hops. Severity 3.
2. Results panel -- no finished path result showing the route's total amount and its steps as a table,
   so "what the route cost" cannot be answered. Severity 3.
3. Results panel -- the "what this used" line is small grey text and mixes her words with jargon
   ("3 components", "Exact", "WebGPU"). She found "Unweighted" but had to squint. Severity 2.
4. Measure form -- the warning says "isn't set up as a length yet"; "length" means nothing for money.
   Severity 2.
5. Measure form vs out-of-date message -- the form offers "Weight by" for Betweenness, the out-of-date
   message says Betweenness "read no weight". She could not tell whether betweenness can use amounts or
   not. Severity 2.
6. Binding step -- the weight meaning is one answer for the whole column; she worried that a later
   question needing the opposite answer (big spend = strong tie) would silently flip every earlier
   result. The out-of-date flow does answer this, but only after the fact. Severity 2.
7. Catalog -- seven centrality names with no business question beside them; she chose Betweenness only
   because a webinar taught her the word. Severity 2.
8. Binding step -- framed as "Apply recipe" with gene and protein wording; the column-meaning question is
   reached only through someone else's saved analysis. Severity 1.
9. Toolbar -- the "Path tool" is mentioned in text, but the bottom toolbar icons have no labels, and she
   would not click them. Severity 2.
