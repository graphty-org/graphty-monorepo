# Session: compare March and April rings -- Chris, ML engineer (recommendation systems)

Task as given by the moderator: "Last month you picked out rings of accounts in March's data.
April's data is in now. How much did the rings change between the two months, and which ones
grew the most?" The data is a sample of card and bank transfers; I read accounts as my users and
transfers as interactions.

All commands were run from `design/ui/prototype`. `D` stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t11--ml-engineer-recsys`.

## Start screen (shots/tasks/t11/01.png)

Title says "Transfers, March 2026". Louvain is selected on the left, 35 groups, modularity 0.688,
sizes 297 down to 120 for the top 7 and "Other 1,851". OK, that's my March clustering. Nothing
on screen says April anywhere. So step one in my head: load the April file. Then rerun Louvain
on it, then figure out how to match clusters across runs, which is the annoying part -- Louvain
labels are arbitrary, cluster 3 in March means nothing in April. In a notebook I'd do a
contingency table and a Jaccard match. Let's see if this thing does it.

## Step 1 -- the title menu

    timeout 120 node app-b/study.mjs --try $D/01.png task:t11 --click "Transfers, March 2026"

Rename, Save, Save as, Export, "Apply recipe or style file...", Version history, Close project.
No "Open April" or "replace data". "Apply recipe" is interesting -- maybe I'd apply the March
recipe to an April file -- but I don't have the April file loaded yet. Moving on.

## Step 2 -- Data

    timeout 120 node app-b/study.mjs --try $D/02.png task:t11 --click "Data"

Sources: accounts-2026-03.csv (3,000 nodes) and transfers-2026-03.csv (9,113 rows, 9,113 edges).
Good, it shows rows and edges, I like that. A filter "amount is at least 1,000" leaves 812 of
3,000 nodes -- wait, was my Louvain run on 812 or 3,000? Making a mental note. No April file
here. There's a "+" next to Sources.

## Step 3 -- poking at the March transfers source

    timeout 120 node app-b/study.mjs --try $D/03.png task:t11 --click "Data" --hover "Add source"
    (nothing on screen is called "Add source")
    timeout 120 node app-b/study.mjs --try $D/03.png task:t11 --click "Data" --click "transfers-2026-03.csv"

That opened an import editor for the March file: column mapping, from/to, amount as weight,
timestamp as time, a match report (9,113 rows became 9,113 edges). Nice, honest import report.
But it's the March file, and there's no "swap this file for a newer one" that I can see. Not
what I want.

## Step 4 -- the hamburger menu

    timeout 120 node app-b/study.mjs --try $D/04.png task:t11 --hover "Menu"
    timeout 120 node app-b/study.mjs --try $D/04.png task:t11 --click "Menu"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t11 --click "Menu" --click "Open recent"

New project, Open, Open recent. Recent has "Mule ring review", "Knockdown screen, September",
"March transfers", "Patent citations 1999-2001". No April. Dead end.

## Step 5 -- clicked the run link by accident

    timeout 120 node app-b/study.mjs --try $D/06.png task:t11 --click "from Louvain, Sep 28"

I expected the run details. It opened an "Analyze" picker instead (Louvain, PageRank, shortest
path...). That's not what a link labeled with a run date should do. Closed it in my head.

## Step 6 -- adding a file

    for n in "Add" "More" "Add a source" "Add data"; do timeout 120 node app-b/study.mjs --try $D/07.png task:t11 --click "Data" --hover "$n"; done
    timeout 120 node app-b/study.mjs --try $D/07.png task:t11 --click "Data" --hover "Add data"
    timeout 120 node app-b/study.mjs --try $D/08.png task:t11 --click "Data" --click "Add data to this graph"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t11 --click "Data" --click "Add data to this graph" --click "File..."
    timeout 120 node app-b/study.mjs --try $D/10.png task:t11 --click "Data" --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"

The plus is "Add data to this graph" -> File / From a URL / Paste / Set collection. I picked a
data file and got... the March transfers file again, under a header that says "Open as a new
graph". Two problems: I said "add to this graph" and it says "new graph", and the file it
offered me is March, not April. I don't actually want April merged INTO the March graph anyway
-- that would union two months of edges and the clusters would be meaningless for a
month-over-month comparison. So this path feels wrong. Backing out.

## Step 7 -- the actions menu on the Louvain run

    for n in "More actions" "Source actions" "Actions" "Options" "More options"; do timeout 120 node app-b/study.mjs --try $D/11.png task:t11 --click "Data" --hover "$n"; done
    timeout 120 node app-b/study.mjs --try $D/11.png task:t11 --click "Data" --hover "More actions"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t11 --click "More actions"

The "..." on the Louvain run: Rerun, Run as copy, Restore the suggested look, Show members in
table, Lay out by these groups, "Compare with another run...". That's the one. I don't have an
April run that I know of, but let's see what it offers.

## Step 8 -- Compare

    timeout 120 node app-b/study.mjs --try $D/13.png task:t11 --click "More actions" --click "Compare with another run..."

Huh. It's already set to "Louvain communities, March data" vs "Louvain communities, April
data". Somebody (the app? a nightly?) already loaded April and ran Louvain on it. I never saw
April anywhere before this -- not in Sources, not in Open recent. I'd want to know where that
run came from and whether it used the same settings (weight = amount, seed 11, same amount
filter) before I trust any of this. There's an "April data" link at the top, which presumably
answers that, but I didn't chase it.

What it tells me:

- March: 3,000 accounts, 35 communities. April: 3,093 accounts, 65 communities.
- Agreement 0.449 over the 2,961 accounts in both months. Reruns of March on the same data
  score 0.759 to 0.768. That is exactly the baseline I'd have asked for -- it tells me 0.449
  isn't Louvain's own seed noise, the structure really moved. Good. It doesn't say WHICH
  agreement score (ARI? NMI?), and I'd want that on hover.
- 26 March/April pairs matched, 9 March communities gone, 13 new April communities holding 773
  accounts, plus 26 one-account singles with no April transfers.
- Size change, matched pairs, sorted by how much they grew: Community 1 297 -> 359 (+62),
  Community 27 52 -> 107 (+55, roughly doubled), Community 15 84 -> 116 (+32), Community 31
  37 -> 64 (+27, +73%), Community 16 81 -> 102, Community 23 67 -> 83, Community 14 84 -> 98.

    timeout 120 node app-b/study.mjs --try $D/14.png task:t11 --click "More actions" --click "Compare with another run..." --click "Community 27"

Clicking Community 27 gave a toast "Select Community 27 on both sides". On a 3,000-node hairball
I couldn't actually see the selection in either panel at this size. I'd need it to zoom to the
group, or dim the rest.

## My answer

The rings changed a lot: agreement between the months is 0.449, against about 0.76 for March
rerun on itself, so it's real change and not algorithm jitter. 35 groups became 65; 26 carried
over, 9 vanished, 13 genuinely new groups appeared with 773 accounts between them. Biggest
growth in raw count: Community 1 (297 to 359). Biggest relative growth: Community 27, which
roughly doubled (52 to 107), then Community 31 (37 to 64). Caveat: the new April groups aren't in
the growth list at all, and 773 accounts in new groups is more than any single "grown" ring --
for fraud that's arguably the bigger story.

## Debrief

- **Succeeded?** Mostly yes. I got the numbers. I'm not 100% sure the April run used the same
  settings and the same amount filter as March, and I couldn't see where it came from.
- **Single Ease Question:** 4 of 7. Once I found Compare it was a 6 -- the rerun baseline band is
  something I'd have had to code myself. Getting there was a 2: I spent most of the session
  hunting for "how do I get April in", and the answer was hidden in a "..." menu on the run, and
  April was never visible anywhere until that screen.
- **Would I use it instead of my notebook?** For this specific question, maybe. Cluster
  matching across two runs with a same-data rerun baseline is the part I always get lazy about
  in a notebook, and here it's one screen. But I'd want: the name of the agreement metric, the
  run settings of both sides next to each other, a percent-change sort option, the new and gone
  groups listed with their sizes, and an export of the matching table with original account ids.
  Without the export it's a nice screenshot, not something my pipeline can use.

## Problems I hit

1. Nothing anywhere says April data exists until the Compare screen. Data/Sources, Open recent
   and the title menu all only show March.
2. "Add data to this graph" leads to a screen titled "Open as a new graph" -- and offered the
   March file, not a new one.
3. The "from Louvain, Sep 28" link opens the Analyze picker instead of the run's details.
4. Compare is buried in a "..." menu; for a month-over-month question it's the main feature.
5. Size change list only covers matched pairs and sorts by absolute growth; no percent, no
   entry for the 13 new groups.
6. Agreement metric isn't named.
7. Clicking a community in the list said it selected it on both sides, but I couldn't see it in
   either hairball.
