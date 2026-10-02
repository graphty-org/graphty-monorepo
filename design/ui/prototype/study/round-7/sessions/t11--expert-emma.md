# Session: t11, Expert Emma

Task as given by the moderator: "Last month you picked out rings of accounts in March's data.
April's data is in now. How much did the rings change between the two months, and which ones
grew the most?"

Participant: Expert Emma (network scientist, consultant on fraud graphs, lives in notebooks).
All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t11--expert-emma/.

## Step 0 -- start screen (shots/tasks/t11/01.png)

"Right. Transfers, March 2026, Louvain, 35 groups, modularity 0.688, seed 11, weight is
amount. Good, it says which weight and the seed. 'Local only' up top, I will take that at face
value for now. So I need April loaded and then a comparison of two partitions. In a notebook
this is: load April, run Louvain with the same parameters, then ARI or NMI plus a contingency
table. Let me see whether this thing knows what a second snapshot is. First guess: the project
menu, maybe there is an 'open' or 'add month'."

## Step 1 -- project menu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/01.png task:t11 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, Apply recipe or style file, Version history, Close project. No
'open' or 'new graph'. 'Apply recipe' might be how you re-run March's steps on April, but I do
not have April in here yet. Data first."

## Step 2 -- Data

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/02.png task:t11 --click "Data"

"Two sources, accounts-2026-03.csv and transfers-2026-03.csv. Fine. Hold on: there is a filter
on, 'amount is at least 1,000', 812 of 3,000 nodes, and the top bar now says '812 of 3,000
nodes' where on the Graph tab it said 'Full graph'. Which one did Louvain run on? The Louvain
header said 3,000-ish accounts in its sizes, so the full graph, I think. That is the sort of
thing I would have to check before I put a number in a report. Moving on: where do I put April?"

## Step 3 -- the plus next to Sources

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/03.png task:t11 --click "Data" --hover "Add source"
    (nothing on screen is called "Add source")
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/04.png task:t11 --click "Data" --hover "Add"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/05.png task:t11 --click "Data" --click "Add data to this graph"

"'Add data to this graph': File, From a URL, Paste, Set collection. No. I do not want April's
edges merged into March's graph; that gives me a two-month aggregate, which is exactly the
wrong thing for a snapshot comparison. I need a second graph. Let me try the graph name, that
little 'Transfers' dropdown."

## Step 4 -- the graph switcher

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/06.png task:t11 --click "Transfers"

"One graph, 'Transfers, 3,000 nodes', and 'Compare graphs...'. There is no April graph listed,
so I am expecting this to ask me for a file. Let us see."

## Step 5 -- Compare graphs

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/07.png task:t11 --click "Transfers" --click "Compare graphs..."

"Oh. It already has 'Louvain communities, April data'. 3,093 accounts, 65 communities. I never
loaded April and the switcher only listed one graph, so where did that come from? I will assume
somebody on the team loaded it, but the app should say so.

The panel on the right is the useful part:
- 'Descriptive only; no statistical test.' Good. Honest.
- Agreement 0.449 over 2,961 accounts in both. 1 is the same, 0 is chance. That reads like the
  adjusted Rand index, but it does not say. ARI or AMI? It matters; they are not comparable
  numbers. Tell me which.
- The gray band: reruns of March on the same data score 0.759 to 0.768. Now that I like. That
  is a baseline for Louvain's own run-to-run noise, which nobody ever gives you. So 0.449 is
  well below what seed noise alone produces. That is a real change, at least descriptively.
- 35 communities in March, 65 in April. 26 matched pairs, 13 new in April (773 accounts), 26
  singletons (accounts with no April transfers), 9 gone. 26 + 13 + 26 = 65 and 26 + 9 = 35, so
  the books balance. Good.
- Size change: Community 1, 297 to 359; Community 27, 52 to 107; Community 15, 84 to 116;
  Community 31, 37 to 64; 16, 81 to 102; 23, 67 to 83; 14, 84 to 98.

It is sorted by absolute growth. Community 1 grew by 62 accounts, but Community 27 more than
doubled, 52 to 107. For fraud rings, relative growth is the interesting one. I can read both off
the list, but I would want a sort toggle or a column with the ratio."

## Step 6 -- what parameters did April use?

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/08.png task:t11 --click "Transfers" --click "Compare graphs..." --click "Louvain communities, April data"

"The run picker lists runs, groups, rows, 'A time window'. It does not show me the parameters
of the April run. Was it the same weight, the same resolution, the same seed? If April ran
unweighted, then 0.449 tells me nothing. Let me click 'April data' at the top of the right
side, maybe it opens the run."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/09.png task:t11 --click "Transfers" --click "Compare graphs..." --click "April data"

"What. That is Les Miserables. A different project, the co-appearance network, with a Louvain
menu open. My transfers data is gone from the screen. That link did not take me to April's data
or April's run, it took me to someone's demo. If I were on a client call I would close the tab
here. I will go back and not touch that link again."

## Step 7 -- the growing ring

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t11--expert-emma/10.png task:t11 --click "Transfers" --click "Compare graphs..." --click "Community 27"

"Clicking Community 27 says 'Select Community 27 on both sides'. In both hairballs I cannot see
anything selected; at this size the node-link picture is soup anyway. What I would actually
want is the member list: who is in 27 in April that was not in March. There is a 'Keep as row'
button, which I guess saves the comparison. I did not try it; I have my answer."

## Answer I would give

The partition changed a lot: agreement 0.449 between March and April, against 0.76 for reruns
of March on the same data, so this is well beyond Louvain's own noise. 35 communities became 65:
26 carried over, 9 disappeared, 13 are new (773 accounts) and 26 are single accounts that had no
transfers in April. By absolute size, Community 1 grew most (297 to 359, +62); by relative size,
Community 27 grew most (52 to 107, it doubled), then Community 31 (37 to 64).

Caveats I would put in the report: I could not confirm April was run with the same weight,
resolution and seed, the agreement measure is not named, and "matched by overlap" does not say
what overlap threshold.

## Did I succeed?

Mostly. I have numbers I would repeat to a colleague, with the caveats above. I would not put
them in a paper until I knew which agreement index it is and what parameters the April run used.

## Single Ease Question

5 out of 7. Finding the comparison took four tries through menus that were the wrong place
(project menu, add data) and the comparison was behind a "Compare graphs..." item in a
switcher that only listed one graph. Once there, the panel did the job. Minus a point for the
link that threw me into a different project.

## Would I use this instead of my current tool?

For the hand-off, yes, possibly. The comparison panel with the rerun baseline is better than
what I build in a notebook in an afternoon, and an investigator could read it. For my own
analysis, no: I need the agreement measure named, the April run's parameters next to the
number, the member list of each matched pair exported to CSV, and the same thing callable from
code. As it stands it is a nice screen, not something I can reproduce.
