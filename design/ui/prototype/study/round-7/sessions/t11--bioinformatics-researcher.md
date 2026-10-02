# Session: compare March and April communities -- computational biologist (Dr. Chen)

Task as given: "Last month you picked out rings of accounts in March's data. April's data is in now.
How much did the rings change between the two months, and which ones grew the most?"

Working directory for every command: design/ui/prototype. Renders are in
tmp/round-7-sessions/t11--bioinformatics-researcher/.

## Start screen (shots/tasks/t11/01.png)

"Transfers, March 2026. 3,000 accounts, Louvain already run, 35 communities, modularity 0.688, seed 11.
Good, there is a seed and a weight column, that is more than Cytoscape tells me. For me these are
modules and the accounts are genes; fine. Now -- where is April? I don't see a second network
anywhere. In Cytoscape I'd have two networks in the Network panel. Let me try the title menu
first, that's usually where 'open' lives."

## Step 1 -- the project title menu

    timeout 120 node app-b/study.mjs --try .../01.png task:t11 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, Apply recipe or style file, Version history, Close project. No
Open, no Import. 'Apply recipe' -- maybe that reruns my Louvain on another file? Too vague, I'm
not clicking something I can't predict. Version history is versions of this project, not a second
month. Close it. The 'Graph: Transfers' dropdown on the left looks like the network list."

## Step 2 -- the graph dropdown

    timeout 120 node app-b/study.mjs --try .../02.png task:t11 --click "Transfers"

"One graph, Transfers, 3,000 nodes. And 'Compare graphs...'. That is the word I want. I am a bit
worried there is only one graph listed -- where would April come from? Try it."

## Step 3 -- Compare graphs

    timeout 120 node app-b/study.mjs --try .../03.png task:t11 --click "Transfers" --click "Compare graphs..."

"Oh. It already has 'Louvain communities, March data' with 'Louvain communities, April data'. So
April was imported and Louvain was run on it already, by someone. I'd want to know by whom and
with what -- the March run said weight = amount, seed 11; nothing here tells me the April run used
the same settings. If April ran unweighted, this whole comparison is meaningless.

The numbers:
- March 3,000 accounts, 35 communities; April 3,093 accounts, 65 communities.
- Agreement 0.449 over 2,961 accounts in both. And -- this is the part I actually like -- it tells
  me reruns of March on the same data score 0.759 to 0.768. So I have a null-ish baseline: the
  run-to-run noise floor is about 0.76, and 0.449 is well below it. That's real change, not
  Louvain's randomness. That's the first thing a reviewer would ask and it's answered.
- But which agreement? Adjusted Rand? NMI? Variation of information? 'Agreement' is not a measure
  name. I can't put '0.449' in a methods section without the index. It says 'no better than chance
  is 0', which smells like adjusted Rand, but I'm guessing.
- 26 matched pairs, 13 new groups in April (773 accounts), 26 singletons with no transfers in April,
  9 March groups gone.

The 65 is inflated by those 26 one-account 'groups' -- good that it says so; without that line I'd
have reported the community count nearly doubled, which is wrong. Without singletons it's 39 vs 35.

Size change, March to April: Community 1 297 to 359 (+62), Community 27 52 to 107 (+55, doubled),
Community 15 84 to 116 (+32), Community 31 37 to 64 (+27, +73%), Community 16 81 to 102,
Community 23 67 to 83, Community 14 84 to 98. It's sorted by absolute gain, not stated anywhere, I
had to do the subtraction. For 'grew the most' I'd report both: Community 1 the most accounts,
Community 27 the most relative (more than doubled), then 31."

## Step 4 -- checking the April side settings

    timeout 120 node app-b/study.mjs --try .../04.png task:t11 --click "Transfers" --click "Compare graphs..." --click "Louvain communities, April data"

"The dropdown lists runs, groups, rows, 'a time window...'. No parameters shown for the April run.
Not what I wanted. Closing."

## Step 5 -- clicking the community that doubled

    timeout 120 node app-b/study.mjs --try .../05.png task:t11 --click "Transfers" --click "Compare graphs..." --click "Community 27"

"Row is highlighted, a tooltip says 'Select Community 27 on both sides'. The two hairballs look
identical to me afterwards -- I can't see 27 picked out in either. At this size I wouldn't expect
much, but I wanted the member list. Where did the 55 new accounts come from -- were they new
accounts, or pulled out of another March module? That's the actual rewiring question and nothing
here answers it."

## Step 6 -- 'April data' link

    timeout 120 node app-b/study.mjs --try .../06.png task:t11 --click "Transfers" --click "Compare graphs..." --click "April data"

"I clicked the 'April data' link above the right panel to see how April was built... and I'm in a
completely different project: 'Les Miserables', Co-appearances, Valjean, Javert, a Louvain menu
open. That is not April's transfers. What happened to my comparison? Did it just close it? If this
were my data I would now be worried I'd lost the session. Stopping here; I have my answer from
step 3 anyway."

## Verdict

Succeeded? Mostly yes. Answer I'd give: the partition changed a lot -- agreement 0.449 against a
rerun noise band of about 0.76; 26 of 35 March communities have an April match, 9 vanished, 13 new
ones appeared holding 773 accounts (plus 26 single-account groups that are just inactive accounts).
Grew most: Community 1 by absolute count (297 to 359), Community 27 by proportion (52 to 107, more
than doubled), then Community 31 (37 to 64).

Single Ease Question: 5 of 7. Finding it was two clicks, which is fast. Lost points for: the
agreement index is not named; I can't see that April's run used the same weight and seed as March;
the size list's sort order is unstated and gives no difference or percent column; selecting a
community did nothing I could see; no way to get that size-change table out as a TSV; and the
'April data' link threw me into an unrelated project.

Would I use this instead of my current tool? For this specific job, more than Cytoscape -- Cytoscape
has no built-in partition comparison at all, I'd be in R with igraph's compare(method = "adjusted.rand")
and a hand-rolled overlap match. The rerun band is genuinely useful, I'd have to script that myself.
But I'd still redo it in R before publishing, because I can't cite an unnamed 'agreement', I can't
verify the April parameters, and I can't export the matched-pair table. If it named the index,
showed both runs' parameters side by side, and let me download the matched pairs with
before/after/gained-from columns, I'd use it for the first look.
