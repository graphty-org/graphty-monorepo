# Session: weighted door-swipe import -- Expert Emma

Task, as the moderator gave it: "In the door-swipe data, a person who went into a building 40
times should be treated as more tightly tied to it than someone who went in once, in every later
analysis. Also, taller buildings matter more. Set that up as you bring the data in."

Start screen: shots/tasks/t20/01.png (the import view for "Door entries, March 2026", the
entries table open, "One edge per: Row" selected, "Weight: none (each edge counts 1)").

Renders: tmp/round-7-sessions/t20--expert-emma/02.png to 08.png. Every command was run from
design/ui/prototype.

## Step 1 -- start screen (01.png)

"Local only" in the toolbar: fine, that is my first question answered, at least as a claim. The
entries table says "Weight: none (each edge counts 1)" and "One edge per: Row | Pair". With Row,
forty swipes are forty parallel edges and most algorithms will either count them or silently
drop them, depending on the tool. I want one edge per person-building pair, with the count as
the weight. Pair is the obvious control.

## Step 2 -- one edge per pair (02.png)

    timeout 120 node app-b/study.mjs --try .../t20--expert-emma/02.png task:t20 --click "Pair"

"One row per pair: each is one edge, its count the rows it merged." 4,180 rows became 1,306
edges. A derived "count" column appeared, already set to Weight, with "Higher means: Stronger |
Farther | Capacity", Stronger selected. Good: that is the question every tool should ask and
almost none does -- shortest paths want distance, centrality wants strength. 1001-B1 has 22,
plausible. It also kept earliest and latest time, which I did not ask for but would have wanted.
First half done in one click.

## Step 3 -- building height (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t20 --click "Pair" --click "buildings"

The buildings table has "floors", already marked Weight; the report says "floors is each
building's node weight". Floors is a fair proxy for height. I did not set it: the tool guessed.
Right guess, but I want to know what "node weight" feeds downstream, because few algorithms take
a node weight at all. B9 has no floors value and "its weight reads 1", with a 1 | 0 switch.
Neither is honest -- missing is missing -- but 1 is the less damaging default, so I leave it.
Also noticed: "site" is the Name column, and three site names cover nine buildings, so labels
will repeat. Not my task; I would fix it later.

## Step 4 -- check the role menu (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:t20 --click "Pair" --click "buildings" --click "Weight"

Key, Links to, Subtype, Name, Time, Weight (checked), Position, Attribute. Weight is the right
role. Closed it.

## Step 5 -- direction and Load (05.png, 07.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:t20 --click "Pair" --click "buildings" --click "Weight" --key Escape --click "Undirected" --click "Load"
    timeout 120 node app-b/study.mjs --try .../07.png task:t20 --click "Pair" --click "buildings" --click "Weight" --key Escape --click "Undirected"

Not asked for, but I would do it: person -> building is directed only trivially, and with
direction kept every building is a sink, which distorts PageRank and anything walk-based. I chose
Undirected; 07.png confirms the import view took it (the "Makes" line changed from "-->" to "--").
Loading showed "421 nodes, 1,306 edges" with a progress bar and a Cancel. 412 + 9 = 421. Counts
add up.

## Step 6 -- does the weight reach an analysis? (06.png, 08.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:t20 ... --click "Load" --click "Analyze"
    timeout 120 node app-b/study.mjs --try .../08.png task:t20 ... --click "Load" --click "Analyze" --click "PageRank"

The graph summary on the right reads "Weight: count, stronger" and "Node weight: floors
(building)". So the two settings are graph-wide defaults, not attached to one run. Good.

But it also reads "Direction: Directed". I set Undirected at import and the import screen showed
it. After Load it is Directed. That is the failure I write tools off for: I set a parameter and the
result reports something else. If this is real, I would file it with these exact steps.

PageRank comes pre-filled: "Weight: count (loaded weight)", "Higher means: Stronger", "Node
weight: floors (building, loaded)" with the line "Restart weights: each building weighs its
floors; each person weighs 1 (no weight column)." That tells me exactly what node weight means
here -- the personalization vector -- which I can cite and reproduce in networkx
(personalization=..., weight="count"). Damping 0.85 shown. "Direction: Follow", consistent with
the wrong "Directed" summary, not with what I picked. I could set it to Ignore here, per run, but I
should not have to.

I stopped here.

## Outcome

Did I succeed? Yes, for what was asked: swipes became one weighted edge per person-building pair
with count as a strength, floors became the building node weight, both are recorded as graph
defaults and are picked up by the next analysis I opened, with the meaning spelled out. The
direction I chose did not survive the load, which is outside the task but would cost me trust.

Single Ease Question: 6 of 7. The weighting itself took one click and one look; points off for
the direction mismatch and for having to open an algorithm to learn what "node weight" means.

Would I use this instead of my current tool? For this kind of job -- turning a raw event log into
a weighted bipartite graph -- it is faster than my pandas groupby plus networkx, and much clearer
than Gephi's merge-parallel-edges option, which never tells me what it summed. I would still
redo the numbers in the notebook, and the Directed/Undirected mismatch has to be explained before
I hand anything from it to a client. "Fine, that is good" for the import screen; not a yes yet for
the whole tool.

## Problems noted

1. After choosing Undirected at import, the loaded graph's summary says "Direction: Directed" and
   PageRank defaults to "Follow". The setting is lost or misreported at Load. (Severe for me.)
2. A missing node weight is silently filled with 1 (or 0); there is no "leave missing" option.
3. "Node weight" on import does not say what analyses use it or how (I only learned it is the
   PageRank restart vector by opening PageRank).
4. The Name column was auto-chosen as "site", which repeats across buildings; the unique "bldg"
   would be a better label. The report warns, but the default is still the repeating one.
5. Floors was auto-marked as node weight without my asking; right here, but a guessed weight that
   changes every later analysis should be more visibly a guess.
