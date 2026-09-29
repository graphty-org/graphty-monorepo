# Session: "who matters most, and how sure are you" -- Jordan, marketing network analyst

- **Participant:** Jordan, growth-marketing analyst who "does the network stuff" one or two days a
  week (persona: `study/personas/marketing-analyst.md`). Simulated.
- **Task as read by the moderator:** "Your manager wants the people who matter most in this network,
  and how sure you are."
- **Screens, in order:** the Results panel (its running, not-run, finished, finished-sampled,
  unpainted and table states), the Inspector, the frame at rest. All at 1440 by 900.
- **Outcome:** got a ranked list, a CSV button and a confidence statement she could say out loud,
  but only after picking an algorithm by name with nothing telling her which one means "matters".
- **Single Ease Question:** 4 of 7.

## Think-aloud transcript

**Moderator:** Your manager wants the people who matter most in this network, and how sure you are.

**Jordan:** OK. "Matter most." That's the whole brief, isn't it -- that's what my VP says too. So
I want an influencer list. Top 20, 30, with a reason each.

### 1. The Results panel, first look (running state)

**Jordan:** Right, so... this is patent citations? It's not people. Fine, I'll pretend the patents
are accounts. 124,000 nodes, 1.4 million edges -- that's a real-size file for me, that's like a
big mention export. Good.

There's something already running, PageRank, "Running on WebGPU, under a minute." I don't know what
WebGPU is and I don't care, but "under a minute" -- thank you. That's the thing Gephi never told
me. There's a bar. I can live with that.

*(She reads the pink strip at the top.)* "Running: the row carries the run; the held edit waits."
I have no idea what that sentence means. *(Moderator: that strip is part of the mock, not the
product.)* Oh. OK, ignoring it.

Left side. "Catalog." Centrality, Community, Path, Structure, Flow, Prediction. I'm looking for
something that says "influencers" or "key accounts" or even "who matters" and it's all... algorithm
names. Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank. I know three of those.
I don't know what Katz is. HITS sounds like a web thing.

And -- hang on. Betweenness says "hours." Closeness says "hours." Harmonic, "hours." The one I
actually want, the bridge one, is hours. PageRank and Eigenvector are "under a minute." So the tool
is kind of steering me to PageRank just by the timings. Is PageRank the same as eigenvector? I
always thought they were basically the same thing.

*(Expects: a "Find influencers" button. Finds: a list of method names with run times.)*

I'd probably just go with PageRank because it's already running and it's fast. But the brief is
"people who matter," and for me that's the connectors, not just the popular ones. Degree tells you
the top twenty are all big. PageRank kind of does the same thing in my experience.

### 2. Not run -- "Betweenness (sampled)"

**Jordan:** Oh wait, there's a second thing in "In this project": "Betweenness (sampled)." Under a
minute. So there IS a fast betweenness. Why isn't it in the catalog where I was looking? The
catalog says hours. I only found this because someone already put it in the project. If I'd
started fresh I'd have seen "hours" and walked away from betweenness entirely.

*(Clicks it.)* "Not run. Run takes under a minute. Edges read as undirected. Sampled, 50 sources."
Sample size 50, seed 7. I'm leaving those alone. What's a seed? Doesn't matter. Run.

*(She presses Run.)*

### 3. Finished, sampled

**Jordan:** OK. Top nodes. #1 5879702, #2 5902311, and then... "#3 to #7" three times? Oh -- it's
saying it doesn't know the exact order for those. "Ranks below #2 may swap between runs." Huh.

You know what, that's actually the sentence. That's the "how sure are you" answer. "The top two are
solid, three to seven are a pack, don't fight me on the order." My manager would get that.
Honestly more than I'd get from Brandwatch, which just gives you a list like it's gospel.

But the IDs. 5879702. These are just numbers. If these were accounts I'd need the handle. Is there
a name column somewhere? I can't sanity-check a number. I always check that our own brand handle is
where I'd expect -- I can't do that with 5879702.

*(Hovers the little i next to "Sampled, 50 sources.")* "Estimated from 50 randomly chosen sources,
seed 7, not from every node. Each value is within plus or minus 0.00035 of the exact value in 95
runs out of 100." OK. That's a stats sentence. I'd rewrite it for the deck. But it's honest and it
has a number on it, I'll give it that.

*(Clicks Details.)* "Run record." Brandes betweenness from 50 random sources, scaled up. Normalization
divided by (n-1)(n-2)/2 -- no, skip. But there's a Copy button. I'd copy this whole thing into the
appendix slide, the one nobody reads but the data-science guy checks. That actually saves me a
conversation. That's useful.

Distribution: "middle ~0, highest ~0.016, zero ~79,554 nodes." What am I supposed to do with that?
Most of the network scores zero? I guess that's normal for bridges -- most people aren't one. I'd
skip this box.

And "124,318 nodes not drawn: more than this browser draws at once (50,000)." So... there's no
map. My big files are 80,000. So for my bigger jobs I'd get no picture at all? At least it says so
instead of freezing -- Gephi would have just died. But my VP slide needs a picture. "Narrow the
graph..." -- I'd have to go figure out what that means.

### 4. Finished (the small protein graph), and the unpainted version

**Jordan:** OK, switching to the smaller one, 300 nodes. This one has a map. Everything is...
orange-brown. Big brown ones in the middle labelled MAPK1, TP53, AKT1. The legend says "Log scale;
the 10 proteins at 0 take the lightest color." So light orange is nobody and dark brown is
somebody. On a projector those are going to look the same. And in greyscale print it's all mid-grey
dots. Size is degree, colour is betweenness -- two different things on one dot. My VP would ask
"so is big important or is dark important?"

*(Looks at the unpainted state.)* Oh, here the dots are grey and there's an eye icon crossed out,
"not shown." So I ran it and the map didn't change? I'd have thought it was broken for a second.
The list still shows, so fine. I'd click the eye.

Top nodes: 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ... No "#3 to #7" here, because it's "Exact".
*(Hovers the i by Exact.)* "Computed on every node, not estimated. It does not say the ranking is
meaningful." Ha. OK, that's weirdly honest. But then -- what DOES say it's meaningful? I was hoping
"exact" meant "sure." Now I have to explain to my manager that exact isn't the same as sure. That's
a harder conversation, not an easier one.

### 5. The table

**Jordan:** "295 more in the table." Click. There it is. Nodes tab, sorted by betweenness, highest
first. id, module, degree, betweenness, "betweenness rank, #1 of 300, ties share." And top right:
"Export table as CSV..."

That. That is the thing. If this gives me the table exactly as sorted, I'm done in thirty seconds.
That's the hand-off test and it passes. The rank column is nice -- I'd paste "#2 of 300" into the
brief, people understand ranks, nobody understands 0.1139.

But "module, from the file" -- that's the cluster, right? Most of them say "Unassigned." If these
were my creators I'd want my segment names there, and I don't see how I'd get the Louvain groups
into this column. *(Moderator skips ahead to the Louvain table state briefly; she nods.)* OK, so a
community run can add a column. Fine.

What's missing is a "why." MAPK1 is #1 -- because what? "Sits between the signalling and the
cell-cycle groups" would be my sentence. I'd have to work that out myself from the map.

### 6. Inspector -- clicking TP53

**Jordan:** Click TP53. Right side: degree 32, "#2 of 300"; betweenness 0.113, "#2 of 30..." --
it's cut off at the edge on my screen but I assume 300; pagerank 0.0113, #2. OK so TP53 is #2 on
everything. That's how I'd check it. If something's top on three different measures, I believe it.
If it's top on one and nowhere on the others, I'd flag it. This panel lets me do that one node at
a time, which is slow for 30 people, but for the top five it's what I'd actually do before a
meeting.

"32 neighbors." "Select neighbors, 1 hop: 33 nodes." Fine.

Still no plain-words reason. It's numbers with ranks. Better than numbers without ranks.

### 7. Frame at rest

**Jordan:** Top left: "This browser. Nothing sent." And "Assistant: Off. Nothing is sent." OK --
that was going to be my first question. If that's true, I could put CRM data in without calling
legal. I'd still want to hear it from IT, but seeing it right under the file name is the right
place.

Legend down here for groups: 2, 8, 4, 1, 3, 5, 0, Other. Numbers as group names. "What's purple?"
all over again -- well, "what's group 8?" Same thing.

Statistics: nodes, edges, density, connected components. Nothing on this screen says "who matters."
It's a nice clean map. If I opened a file and landed here, I wouldn't know the Results button is
where the influencer stuff lives -- it's a flask icon. A flask is science. I'm not doing science.

### 8. Wrap-up

**Moderator:** So, who matters most, and how sure are you?

**Jordan:** On the protein one: MAPK1 and TP53, clearly, top two on betweenness and TP53 is #2 on
degree and PageRank too. After that YWHAZ, CDK1, AKT1 are close. How sure: very sure on the top two,
the next handful could shuffle -- on the big patent one the tool literally told me "#3 to #7," which
is what I'd say. And I'd attach the run record so the data-science guy can check it.

What I can't tell my manager is WHY they matter in a sentence, or whether betweenness was even the
right choice versus PageRank. The tool made me pick the method, and I picked partly on speed.

**Single Ease Question:** 4. I got there. But I got there because someone had already added the
sampled betweenness to the project, and because I know what betweenness is. A junior on my team
would've clicked PageRank because it said "under a minute" and called it a day.

**Would you use this instead of what you use now?** For the mid-size mention exports, maybe --
the CSV with a rank column, the "#3 to #7" thing and the copyable run record are three things I
currently do by hand in Excel and a Google Doc. And "Nothing sent" might get me past legal. But I
wouldn't drop Brandwatch for it; I'd use it next to it, for the shortlist. And if my 80,000-node
files don't draw a map, I'm back in Gephi for the slide picture. Also -- and this isn't your fault
-- half my data doesn't exist anymore since the Twitter API went paid, so I'm going to be feeding
this whatever CSV the vendor coughs up. It'd better open those.

## Problems observed

| Where | What happened | Severity (1 low - 4 high) |
|---|---|---|
| Results panel, catalog | Only method names (Betweenness, Katz, HITS...). No task words like "find influencers" or "bridges between groups". She chose partly by run time, not by meaning. | 3 |
| Results panel, catalog | Exact betweenness reads "hours" on a big graph; the "under a minute" sampled version was only reachable because it already sat in the project. From a fresh start she would have abandoned her preferred measure. | 3 |
| Results panel, finished-sampled | Top nodes are shown by bare id (5879702); no name or label to recognise, so she could not do her "is our brand where I expect" sanity check. | 2 |
| Results panel, Exact tooltip | "It does not say the ranking is meaningful" is honest but leaves her with no way to answer "how sure" for an exact run; exact runs show no confidence cue at all. | 2 |
| Results panel, finished | Colour (betweenness, log orange-brown ramp) and size (degree) encode two different measures on one dot; nearly all nodes look the same brown; will not survive a projector or greyscale print. | 2 |
| Results panel, big graph | 124,318 nodes "not drawn" over a 50,000 limit. Her typical files are 5,000 to 80,000, so her larger jobs get no map for the slide. Honest message, but a gap. | 3 |
| Results panel, finished-unpainted | A finished run that leaves the map grey read as "broken" for a moment until she found the crossed-out eye. | 1 |
| Results panel, distribution | "middle ~0, zero ~79,554 nodes" meant nothing to her; she skipped it. | 1 |
| Results panel, table and inspector | No plain-language reason per node ("bridges group A and group B"); she has to write every "why" herself. | 2 |
| Results panel, table | Group column shows "Unassigned" or numbers; group legend on the frame reads "2, 8, 4, 1..." -- the "what's group 8?" problem. | 2 |
| Frame at rest | The Results rail icon is a flask; nothing on the resting frame points to "who matters". | 2 |
| Inspector | Rank column is clipped at the right edge ("#2 of 30") at 1440 wide. | 1 |

## What worked for her

- "#3 to #7" rank ranges and "Ranks below #2 may swap between runs" -- the confidence answer in one
  sentence she would say to a VP.
- "Export table as CSV..." on the table, sorted as shown, with a "#N of 300, ties share" rank
  column.
- The run record with a Copy button, for the methods appendix.
- Time estimates in the catalog and on the run ("under a minute").
- "This browser. Nothing sent." and "Assistant: Off. Nothing is sent." beside the file name.
- The Inspector showing the same node's rank on degree, betweenness and PageRank together, which is
  how she cross-checks a name before a meeting.
