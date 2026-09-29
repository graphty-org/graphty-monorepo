# Session: "Who matters most, and how sure are you" -- Jordan, marketing network analyst

Participant: Jordan (simulated), growth-marketing analyst, Gephi and NodeXL user.
Task given by the moderator, and nothing more: "Your manager wants the people who
matter most in this network, and how sure you are."
Screens worked through, in order: the Results panel (all its states), the right-hand
column describing a selected node, and the app with nothing selected.
Laptop width (1440 by 900).

## Transcript (thinking aloud)

**Results panel, first look (a run in progress on "Patent citations").**

"OK. So... this isn't my data, it's patents. Fine, pretend it's our mention
export. 124,000 nodes, that's about my biggest file. First thing I'm looking for
is a button that says, like, 'Find influencers' or 'Key people'. There isn't one.
There's a list on the left called Catalog -- Betweenness, Closeness, Eigenvector,
Harmonic centrality, HITS, Katz, PageRank. That's the Gephi statistics panel with
nicer fonts. I know betweenness, that's my bridge people. I don't know what HITS
is and I'm not going to find out today."

"Next to them it says 'hours', 'under a minute', 'over a day'. Huh. That's
actually useful -- Gephi never told me that, it just spun. But 'hours' next to
Betweenness, which is the one I want? Great."

"There's a PageRank thing already running in the middle. 'Running on WebGPU,
under a minute' and a blue bar. I don't know what WebGPU is, but there's a bar, so
I'll wait. Good. 'Damping 0.5 has not run. Run queues it after this run.' I did
not touch damping. I would never touch damping. Moving on."

**I click Betweenness in the catalog (the refused state).**

"Red box: 'Takes hours; exact runs stop at 30 seconds.' So it won't do it. Then
three choices: 'Sampled, 50 sources -- under a minute', 'Exact on Drug patent...
-- under a minute', and 'Exact on the full graph -- hours'. And a blue button
'Run sampled'."

"OK, honestly, I like that it gave me options instead of just freezing. But 50
sources? Out of 124,000? That sounds like asking fifty people and calling it a
survey of the country. If my manager asks 'how sure are you' and I say 'we
sampled 50', she's going to say 'fifty what'. There's a 'Details' link. I click
it." [The mock shows nothing for Details.] "...Nothing. OK."

"The 'Exact on Drug patent...' one is cut off. I guess that's a smaller piece of
the graph? I'd need to know what I'm cutting out. I'm taking the sampled one
because it's the blue button and it's first."

**The sampled row, not yet run.**

"Sample size 50, Seed 7. What's a seed. Leaving it. 'Edges read as undirected.'
Our replies are directed -- someone replies to someone. Does that matter for
bridges? I genuinely don't know, and nothing here tells me whether it changes who
comes out on top. I press Run."

**Finished result (the protein data, 300 nodes).**

"Now it's proteins. Whatever. The map went all orange. Everything is basically the
same burnt orange, a few darker ones in the middle. The legend at the bottom says
'Log scale; the 10 proteins at 0 take the lightest colour.' I can't tell who
matters from the map at all -- it's the hairball in one colour. My VP would look
at this and ask what she's looking at."

"On the panel: 'Distribution, 300 nodes', a little bar chart, 'bar height: square
root of the count'. Skipping that. 'middle 0.0038, highest 0.138, zero 10
nodes.' OK, so most nodes are basically nothing and a few are huge. That's
actually the story I'd tell -- a handful of connectors."

"Then 'Top nodes': MAPK1 0.1379, TP53 0.1139, YWHAZ, CDK1, AKT1. There's my
answer to part one. Five names. '295 more in the table.' Where's the table? I
don't see a table anywhere on this screen. I need the top 40 in the brief, not
five. And a number like 0.1379 means nothing to my manager -- is that good? Is
0.11 basically the same as 0.14?"

"'Exact. Unweighted, undirected. WebGPU.' So this one was exact, not sampled?
Then which one am I looking at -- the sampled one I ran or an exact one? The
header just says 'Betweenness'. If I'm reporting 'how sure', I need to know if
it's the estimate or the real thing, and it's one grey line of small text."

**The "Closeness (WF-corrected)" state, with its explanation popup.**

"'WF-corrected.' Wasserman-Faust corrected. The popup is a paragraph -- 'Each
score is multiplied by the share of the other proteins the node can reach... no
rank changes.' OK, the last bit I get: 'no rank changes'. That's the only part I
care about. That kind of sentence -- 'the order didn't change' -- is exactly what
I'd want for the sampled betweenness too. 'Would the top ten change if you ran it
again?' That's 'how sure'. It's not here."

**The right-hand column with TP53 selected.**

"Oh, this I like. Click TP53, and it says degree 32, '#2 of 300'. Betweenness
0.1139, '#2 of 300'. PageRank '#2 of 300'. So it's second on three different
measures. That is actually how I'd say 'how sure' -- it's top on everything, not
just one metric. But I only found that by clicking a node one at a time. I want
that as a table: name, rank on each measure, side by side, and flag the ones
that are only high on one."

"Neighbours 32, in 2 sets, module DNA repair. For a creator that would be
'bridges the DNA repair crowd' -- I'd love the module name next to each person in
the top list, because that's the reason line for my shortlist. It's here on the
node, not on the list."

"There's an 'Export' row down the bottom with a copy icon and a plus. Copy what?
The node? I'm not pressing plus, I don't know what it adds."

**The app with nothing selected (Les Miserables).**

"This is the resting screen. Colour by group, size by degree, legend with
counts. Right side: Statistics -- nodes, edges, density, connected components.
Nothing on here says 'who matters'. If I landed here cold, I'd go to the flask
icon labelled Results, because it's the only thing that sounds like an answer.
The legend here with the counts, that's fine -- I'd screenshot it. But groups
called '2', '8', '4'? The VP will ask what group 8 is."

**Off-topic.**

"Honestly, half the reason I'm doing this at all is our Twitter pipeline died when
the API went paid, and Brandwatch doesn't do the bridge thing properly. So I'm
already starting from whatever CSV they'll give me. If this tool then tells me
'we sampled 50' I've got two layers of 'trust me' to explain."

**Scale question.**

"What happens with the full customer base, two million? The catalog says 'hours'
for betweenness on 124k. So I'm guessing 'never' for two million, and it'd push me
to the sampled one. At least it says hours instead of pretending."

## After the task

**Did she complete it?** Partly. She got a named top five (MAPK1, TP53, YWHAZ, CDK1,
AKT1) in about two minutes. She could not answer "how sure": the sampled run gave
no sign of how stable its ranking is, and the only confidence cue she found was
the per-node "#2 of 300" on three measures, one node at a time.

**Single Ease Question: 3 of 7.** "Getting a list: fine. Saying how sure I am: I'd
be making it up."

**Would she use this instead of her current tool?** "Not yet. It's better than
Gephi at telling me how long things take, and the refusal with options instead of a
frozen window is genuinely nice. But I'd still export to Excel, run it twice, and
eyeball whether the top ten moved -- that's how I'd get 'how sure' today, and this
didn't save me that step. Give me a table of the top 40 with ranks on two or three
measures and a line that says 'the top ten is stable' or 'it isn't', and I'd
switch for this job."

## Problems observed

1. **Nothing says how sure the ranking is.** (severity 4) The sampled betweenness
   route offers "50 sources" with no statement of how much the top of the list could
   move. The finished row shows scores to four decimals with no spread, no
   stability, no agreement check. The only honest line of that kind, "no rank
   changes", appears for the closeness correction, not for sampling.
   "Fifty what? If she asks how sure I am, I've got nothing to point at."
2. **No table or CSV in reach from the result.** (severity 3) "Top nodes" shows five
   and says "295 more in the table", but no table is on screen and no export of the
   list is visible from the result.
   "Where's the table? I need forty names, not five."
3. **Only algorithm names, no task words.** (severity 3) The catalog lists Betweenness,
   HITS, Katz, Harmonic centrality with no plain-words purpose ("bridges between
   groups", "reach").
   "It's the Gephi stats panel with nicer fonts."
4. **Cross-measure agreement is only per node.** (severity 3) The strongest confidence
   cue, a node's rank on degree, betweenness and PageRank, lives in the selected
   node's column; there is no view of the top list with its rank on each measure.
5. **Exact versus sampled is easy to miss.** (severity 2) After running the sampled
   route, the result header says "Betweenness" and the method is one grey line
   ("Exact. Unweighted, undirected. WebGPU.").
6. **The "Details" link does nothing visible.** (severity 2) On the refusal, the
   one place she went for an explanation.
7. **The colour map does not show who matters.** (severity 2) The log-scale colour
   makes nearly every node the same dark orange; the map cannot be read without the
   list.
8. **Jargon in labels.** (severity 2) "WF-corrected", "Seed", "Damping", "Edges read
   as undirected" with no word on whether it changes the answer; group names "2",
   "8", "4" in the resting legend.
9. **The Export row's icons are unexplained.** (severity 1) A copy icon and a plus on
   the selected-node column, with no label.

## What she liked

- Time estimates beside every method ("under a minute", "hours") before she ran
  anything.
- The refusal offering three routes, cheapest first, instead of freezing.
- A progress bar with an estimate while PageRank ran.
- "#2 of 300" beside each score on the selected node, across three measures.
- The legend on the map with counts per colour.
