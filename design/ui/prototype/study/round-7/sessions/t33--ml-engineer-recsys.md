# Session: t33, ML engineer (recommendation systems)

Task given: "Before lunch you asked graphty to redo the rings of accounts on April's data. See how
that went, and which month the drawing is showing you now."

Renders are in design/ui/prototype/tmp/round-7-sessions/t33--ml-engineer-recsys/. Every command was
run from design/ui/prototype.

## Start screen (shots/tasks/t33/01.png)

"OK. Title says Transfers, March 2026. Inspector says Louvain, 35 communities, modularity 0.688,
'Run from Louvain, Sep 28'. Seed 11, weight = amount. Fine, I like that it shows the seed. But
nothing here says April. No job status, no 'your run finished', no toast. If I kicked off a rerun
before lunch I expect a job list or at least a status line. 'Rings of accounts' -- I assume that
means the Louvain communities."

## Step 1: the title menu

    timeout 120 node app-b/study.mjs --try .../01.png task:t33 --click "Transfers, March 2026"

"Project menu: Save, Export, Version history, Close. Version history is for the project, not runs.
Not here."

## Step 2: the "from Louvain, Sep 28" link

    timeout 120 node app-b/study.mjs --try .../02.png task:t33 --click "from Louvain, Sep 28"

"That opened an Analyze palette with Recent: Louvain, PageRank, Shortest path. That is the catalog,
not the run history. I expected a link labeled 'Run ... Sep 28' to take me to that run's record
(inputs, time, data version). Also: Sep 28 is a date, but I don't know which month of DATA it ran
on. That is the provenance I actually care about."

## Step 3: Assistant (I 'asked graphty', so maybe it was a chat)

    timeout 120 node app-b/study.mjs --try .../03.png task:t33 --click "Assistant"

"Assistant is off, 'Nothing is sent'. Fine, local-only, good. So I did not ask it through here.
Oddly the Louvain coloring vanished when I switched panels -- now it's a gray hexbin and 'Nothing
is colored'. Weird but whatever."

## Step 4: Data panel

    timeout 120 node app-b/study.mjs --try .../04.png task:t33 --click "Data"

"Sources: accounts-2026-03.csv, transfers-2026-03.csv. So the loaded graph is March. 3,000 nodes,
9,113 edges. No April file anywhere. And now there's a filter 'amount is at least 1,000, 812 of
3,000 nodes' that is on, and the top bar says '812 of 3,000 nodes' -- on the start screen it said
'Full graph'. Did clicking Data turn on a filter? That makes me nervous about which denominator the
Louvain numbers used."

## Step 5-6: the inspector's three-dot menu

    timeout 120 node app-b/study.mjs --try .../05.png task:t33 --hover "More"
    timeout 120 node app-b/study.mjs --try .../06.png task:t33 --click "More actions"

"Tooltip: More actions, Shift+F10. Menu: Rerun, Run as copy, Restore suggested look, Show members,
Lay out by these groups, Compare with another run... -- 'Compare with another run' is the closest
thing to 'where is my other run'. Odd that the menu pops out next to the row on the left instead of
under the button I clicked on the right."

## Step 7: Compare with another run

    timeout 120 node app-b/study.mjs --try .../07.png task:t33 --click "More actions" --click "Compare with another run..."

"There it is. 'Louvain communities, April data': 3,093 accounts, 65 communities, vs March 3,000
accounts, 35 communities. Agreement 0.449 over 2,961 accounts in both -- presumably ARI or NMI, it
says 1 = same, 0 = chance. Reruns of March on the same data score 0.759 to 0.768, so April is way
outside the seed-noise band. Good, that's exactly the baseline I'd want: they showed me the noise
floor. 26 of the 65 are singletons -- accounts with no April transfers -- so the real count is
more like 39. 13 new groups (773 accounts), 9 gone. I'd want the metric name though: is 0.449 ARI
or NMI?"

## Step 8: the run picker

    timeout 120 node app-b/study.mjs --try .../08.png task:t33 --click "More actions" --click "Compare with another run..." --click "Louvain communities, April data"

"Runs: March data, April data, PageRank, Betweenness. So the April run exists and completed. No
timestamp, no seed, no 'finished at 11:52'. I'm inferring 'it went fine' from the fact that it has
results."

## Step 9: the "April data" link

    timeout 120 node app-b/study.mjs --try .../09.png task:t33 --click "More actions" --click "Compare with another run..." --click "April data"

"What. That threw me into a completely different project -- 'Les Miserables', co-appearances, with
a menu open. I clicked a link that said April data. If that happened with real data I'd assume the
tool lost my session. Stopping here."

## Verdict

Answer I would give: the April rerun finished -- 65 communities over 3,093 accounts (26 of them
one-account groups with no April transfers), agreement 0.449 with March, well below the 0.76
same-data rerun band, so the structure changed a lot. The drawing on screen is still March
(title, source files accounts-2026-03 / transfers-2026-03, 35 communities in the legend).

Succeeded? Mostly, yes. I found both answers, but only by guessing that "Compare with another run"
was where the April run lived. Nothing on the main screen said an April run existed.

Single Ease Question: 3 of 7.

Would I use this instead of my notebook? Not yet. The compare panel is genuinely better than what
I'd hack in 15 lines -- the rerun noise band next to the cross-month score is the right baseline and
I would not bother computing it myself. But a run's provenance (which data month, when it ran,
whether it finished) should be on the run itself, not buried in a compare dialog, and a link that
dumps me into another project would end my trust fast.
