# Session: "Is this file worth my afternoon?" -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does the network work on her team one or two
days a week (Gephi, NodeXL, a colleague's networkx notebook). Simulated participant.

Task as the moderator gave it: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

Screens used, in order: the start screen, the load step (reading, then the file with a problem in
it), the main window with a graph open. Played at 1440 by 900 (laptop width).

Note for the study team: the moderator's script carried a facilitator note naming the planted
problem (a weight column read as text). Jordan did not hear it; she found the problem on her own,
because the screen flagged it in red. Treat the discovery as unprompted but easy.

## Transcript (think-aloud)

**Start screen.**

"OK. 'Open a graph.' Four little pictures -- karate club, Les Miserables, proteins, bank
transfers. Those are samples, I'm not here for samples, my colleague sent me a file."

"First thing I read -- the line with the lock: 'Your files stay on this computer. graphty reads
them in this browser and uploads nothing.' Good. That's literally the question I'd ask. I'd still
want IT to confirm it, honestly, but that's the first tool that answers it before I ask. That's
worth something."

"'Your data -- Open... or drop a file here.' Fine, I'll just drag it in." (Drop state.) "Blue box,
'Drop to open as a new project, the columns are checked before anything loads.' OK, checked by
what? Me? Fine."

"'Connect to data source... sends only your query, to the source you name.' Wait -- sends where?
I thought nothing leaves. I mean I get it, if you connect to a database it talks to the database,
but if I skim that line it reads like the opposite of the lock line. Not clicking it."

**Load step, while it reads.**

"Progress bar, 38%, 'Reading ... as CSV'. Nodes and edges greyed out while it counts. OK, that I
like. Gephi just sits there. 'Load is off: waiting for the node and edge counts.' Fair."

**Load step, the colleague's file (ppi-core-300-evidence.tsv).**

"Hm. It's proteins. PSMA4, PSMD2. Not my world -- did she send me the wrong thing? Whatever, the
question is is it usable."

"Left side: Format TSV, each row is an edge, ends protein_a and protein_b, undirected. That's
more setup than Gephi's import wizard shows me, but it guessed everything, I don't have to touch
it. I'm not defining a schema, which is the thing that makes me quit."

"Right side, 'Issues 2'. Red one first: 'confidence is read as text, so it cannot weigh edges.
150 of 2,298 values are NA; the rest are numbers between 0 and 1.' OK. So that's what's off with
the file -- somebody's export wrote NA instead of leaving it blank. Classic. That's the thing I'd
tell my colleague. And the Load button is grey with 'Load is off: choose how to read confidence'
at the bottom, so I can't miss it."

"Little table of the NA rows, lines 29, 31, 44... all 'coexpression' in the source column.
Interesting -- so it's one source that doesn't give a confidence. That's actually useful, I
would not have spotted that in Excel without a pivot."

"I click the dropdown. 'Number, NA as missing -- 2,298 edges; 150 of them without a weight.'
'Number, drop the rows with NA -- 2,148 edges.' 'Text -- cannot weigh edges.' I'd take the first
one, I don't want to lose rows I don't understand. Clear enough, the numbers tell me what I get."

"Then there's this 'confidence as a weight means: Similarity, Distance, Capacity, Not set'.
Um. Similarity I guess? Bigger is closer? 'Capacity' -- no idea, like bandwidth? I'd leave the
default. And the other file screen I saw said 'Unknown' where this one says 'Not set' -- same
thing? I'd just ignore that box, honestly."

"Yellow one: '1,036 extra parallel edges. Several rows join the same two proteins, one per
evidence source.' Parallel edges... duplicates, basically? It says keep all, 2,298 edges, and
the other choice merges them. The explanation says degree 'counts every source'. So if I kept
all, the hubs would look bigger than they are? That seems like the kind of thing that WOULD
change my top 20 and nobody tells you. I'd probably keep the default and not think about it,
which is probably wrong. I'd want it to just tell me which one to pick for finding who's
important."

"'What will load: 298 nodes, 2,298 edges, rows dropped 0.' Good -- that's the number I check
before I waste time. 300-ish nodes loads in anything. So far: worth opening."

"'Filter at import...' next to Cancel -- don't need it, it's tiny."

I pick "Number, NA as missing", keep "Keep all", click Load.

**Main window.**

"...That's Les Miserables. I loaded the protein file. Is this -- did it open the sample? OK, the
moderator says it's a mock and this is just what a loaded graph looks like. Fine, I'll pretend
it's my file, but in real life, if I loaded a file and saw a different graph, I'd close the tab."

"OK, map in the middle, coloured and sized, with names on the big ones. Not a hairball. That's
better than Gephi's first render, where it's a grey blob until you run ForceAtlas."

"Legend bottom left, 'Group color': 2, 8, 4, 1, 3, 5, 0, Other. So the groups are... numbers.
If I put this in a deck the VP says 'what's group 8?' That's the 'what's purple' problem again,
just with a key this time. At least there IS a key, and counts next to each -- that's more than
Gephi gives me. 'Size by degree' 1, 10, 36 -- OK."

"(Another state.) Now the legend says 'Color by group' instead of 'Group color'. Same thing?
Picky, but I notice labels."

"Right panel: 'Statistics, Overview: General', Nodes 77, Edges 254, Density 0.0868, Connected
components 2 (1 isolate), degree distribution. Density 0.0868 -- is that good? No idea. I can
say 'one isolate', that's the lonely dot on the left. 'Edges: undirected, weight: value' -- the
weight is called 'value'? In my file it was confidence. Mock thing, probably."

"There's a 'Replace' next to 'Overview: General'. Replace what? Replace my overview? I'm not
clicking that, it sounds like it throws something away."

"What I actually want now: who's the most connected -- the top 20 in a list. Where's the table?
Left rail: Graph, Assistant (greyed out), Results, Notes. Results maybe? That's the flask icon.
Results of what, I haven't run anything. Left panel: Graphs, 'Sets and paths', Styles, Views --
no table. Bottom toolbar: pointer, some wavy icon, a page icon, a lightning bolt, '2D'. Which of
these is the table? I'd click the lightning bolt first because it looks like 'do something', and
the page icon second. I'm guessing."

"'Export...' is the only blue button, top right. If that gives me a picture, fine, but I want the
CSV of the ranked list. There's also an 'Export +' at the bottom of the right panel. Two exports.
Which one gives me the table?"

"Clicked the file chip, 'miserables.json': 'Opened from this computer, Read Sep 28, 10:42,
Replace data...'. OK -- it confirms it's local. Good, that closes the loop from the first
screen."

"'4 Still measuring': Connected components and degree distribution say 'not yet measured' with a
little spinner. For 77 nodes? Fine, but tell me how long it'll take when it's 80,000."

**Verdict.**

"Is the file worth my afternoon? The file, yes -- it opened, it's small, and the one thing wrong
with it, the NA confidence, got flagged in red before I'd wasted anything. And it showed me which
source the NAs come from. I'd tell my colleague 'your export wrote NA for coexpression, fix it or
I'm treating it as missing'. That took me maybe two minutes, which is good."

"Is the TOOL worth my afternoon? Don't know yet. I can see a map and a legend, but I couldn't
find a table or a ranking in two minutes, and that's my whole job. And I'd want the parallel-edge
question answered for me, not handed to me as a choice."

"What happens with the full customer base, like two million? I saw a progress bar, I didn't see
an answer to that."

"Also, unrelated, this is the problem with everything now -- I get whatever CSV the vendor
feels like exporting, with NA in one column and blank in the next, since the Twitter API went
paid. So a tool that checks columns before loading is actually the part I'd pay attention to."

## Single Ease Question

4 out of 7. "The load part was easy, a 6. Finding what to do after it loaded was a 3. The
afternoon is the after part."

## Would she use this instead of her current tool?

"Instead of Gephi for opening a file I've never seen -- yes, maybe, because it tells me what's
wrong with it before loading, it says the file stays on my laptop, and it doesn't need Java. My
manager could open it. Instead of the listening suite for influencers -- not yet. I didn't see a
ranked list or a CSV out, and until I get the top 40 into a brief without Excel, it's a nicer
file checker. Also nobody told me what it costs."

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Main window | No visible table or ranked list; she guessed among Results, the lightning bolt and the page icon and did not find one in about two minutes | 3 |
| Load step to main window | The graph shown after loading her file was a different dataset; in a live product she would have abandoned | 3 (prototype continuity) |
| Load step | "1,036 extra parallel edges" and the Keep all / Merge choice: she could not tell which choice is right for finding important nodes, suspected it changes the ranking, kept the default | 2 |
| Load step | Weight meaning control "Similarity / Distance / Capacity / Not set": "Capacity" meaningless to her; the same state is "Unknown" on another file | 2 |
| Main window | Legend groups named by numbers (2, 8, 4...); VP would ask what group 8 is. Legend title changes between "Group color" and "Color by group" | 2 |
| Main window | Two exports (blue "Export..." and "Export +" in the right panel); cannot tell which gives a table and which a picture | 2 |
| Main window | "Replace" beside "Overview: General" reads as destructive; she would not click it | 2 |
| Start screen | "Connect to data source... sends only your query" reads, when skimmed, as contradicting the local-only lock line | 1 |
| Main window | Density 0.0868 with no plain meaning; edge weight shown as "value" rather than her column name | 1 |

## What she liked

- The lock line on the start screen answered "does my data leave my laptop?" before she asked.
- The load step flagged the NA confidence column in red, showed the offending rows, and kept
  Load off with the reason at the bottom -- she found what was wrong with the file unprompted.
- Every read-as choice said what would load ("2,148 edges; the 150 rows are not loaded").
- "What will load: 298 nodes, 2,298 edges, rows dropped 0" is the number she checks first.
- A progress bar with a percentage while the file is read.
- The first render was readable (colour, size, labels, a legend with counts), not a hairball.
- The file chip confirmed "Opened from this computer".
