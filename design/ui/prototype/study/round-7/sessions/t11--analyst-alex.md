# Session: Analyst Alex, comparing March rings with April

Task given: "Last month you picked out rings of accounts in March's data. April's data is in now. How
much did the rings change between the two months, and which ones grew the most?"

All commands run from design/ui/prototype. Renders are in tmp/round-7-sessions/t11--analyst-alex/.

## 01 -- start screen (shots/tasks/t11/01.png)

"OK, 'Transfers, March 2026', Louvain is on, 35 groups, seed 11 shown -- good, I like seeing the
seed. Modularity 0.688. These colored communities are my rings from last month. Now I need April.
I'd expect an Open or Import somewhere. The title has a little arrow -- that's usually where the
file stuff lives."

## 02 -- the project title menu

    timeout 120 node app-b/study.mjs --try .../02.png task:t11 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, Apply recipe or style file, Version history, Close project. No Open,
no Import. 'Apply recipe' -- maybe that's run last month's steps on new data? But I don't have the
April data in yet, so that's step two. Where do files go in? There's a 'Data' button on the left."

## 03 -- Data

    timeout 120 node app-b/study.mjs --try .../03.png task:t11 --click "Data"

"Sources: accounts-2026-03.csv and transfers-2026-03.csv. 3,000 nodes, 9,113 edges. That's March.
There's a plus next to Sources, so I could add April files there, but would that merge them into
one graph? I don't want March and April mashed together. There's a 'Transfers' dropdown next to
'Data' at the top -- maybe that's a list of graphs."

Side note: "Why did the picture turn into gray hexagons? And the top bar now says 812 of 3,000
nodes, because of an 'amount at least 1,000' filter. On the Graph screen it said 'Full graph'. Is
my Louvain run on the 812 or the 3,000? I'd want to know that before I quote a number."

## 04 -- the graph dropdown

    timeout 120 node app-b/study.mjs --try .../04.png task:t11 --click "Data" --click "Transfers"

"Only one graph, 'Transfers, 3,000 nodes', and 'Compare graphs...'. That's literally my question.
Let's see what it wants to compare against -- if April isn't loaded it'll probably ask me for it."

## 05 -- Compare

    timeout 120 node app-b/study.mjs --try .../05.png task:t11 --click "Data" --click "Transfers" --click "Compare graphs..."

"Oh. It's already set: 'Louvain communities, March data' with 'Louvain communities, April data'.
Somebody already loaded April and ran Louvain on it? Fine, I'll take it, but I'd want to check how
April got in -- I never saw an April file in Sources. Which seed did April use? Same 11? It doesn't
say here.

The numbers: March 3,000 accounts, 35 communities. April 3,093 accounts, 65 communities.
Agreement 0.449 over 2,961 accounts that are in both months. And it tells me reruns of March on
the same data land at 0.759 to 0.768. So it's not just Louvain being random -- the grouping really
moved. That's the sentence I need for my director: 'reruns agree about 0.76 with themselves,
March to April agree 0.45, so the change is real, not noise.' I like that a lot. That's the
stability thing I've never been able to say out loud. I don't know what 'agreement' is exactly --
adjusted Rand? NMI? I'd want the name on hover so I can match it in Python.

Communities: 26 matched pairs, 13 new in April with 773 accounts, 26 'singles' -- one-account
groups with no transfers in April, so that's most of the jump from 35 to 65 -- and 9 gone after
March. So really it's 35 to 39 real groups, not 35 to 65. Glad it split that out, the 65 alone
would have scared somebody.

Size change, March to April: Community 1 297 to 359, Community 27 52 to 107, Community 15 84 to
116, Community 31 37 to 64, Community 16 81 to 102, Community 23 67 to 83, Community 14 84 to 98.
Sorted by how many accounts they gained, looks like. By count Community 1 grew most (+62), but
Community 27 doubled (+55, about 2x) and 31 went up about 70 percent. For rings I care more about
27 -- a ring doubling in a month is the story. I'd want a percent column so I don't do it in my
head.

The April legend says 'Colors matched by overlap with the left.' Good -- so Community 27 in April
is the same ring as 27 in March, not just a reused number. That's the thing that burned me in
Gephi."

## 06 -- click Community 27 in the size list

    timeout 120 node app-b/study.mjs --try .../06.png task:t11 --click "Data" --click "Transfers" --click "Compare graphs..." --click "Community 27"

"A tooltip-ish thing says 'Select Community 27 on both sides', the row highlights, but I honestly
can't see anything in the two pictures change. Both hairballs look the same to me. Maybe it
selected and I just can't pick it out in that ball. I'd need to see who joined -- the 55 new
accounts -- as a list. And I'd want this size table as a CSV. All I see is 'Keep as row', which I
don't know what that means."

I stop here. I have my answer.

## Answer

The rings changed a lot more than chance: agreement between March and April is 0.449, where
rerunning March alone gives about 0.76. Of 35 March communities, 26 carry over, 9 are gone, and
13 new real groups appeared in April (773 accounts), plus 26 one-account leftovers. The ones that
grew most: Community 1 (297 to 359, +62), Community 27 (52 to 107, doubled), Community 15 (84 to
116), Community 31 (37 to 64).

## Verdict

- Succeeded? Yes, I think so. The comparison screen gave me the numbers directly.
- Single Ease Question: 5 of 7. Finding it took four clicks through a menu named after the graph
  (Data, then the graph-name dropdown) -- I'd never have guessed 'Compare' lives there; I went to
  the project menu first. Once there it was easy.
- Would I use this instead of my current tool? For this job, yes. In Python I'd have to match
  the community ids between months by hand, and Gephi just gives you new colors. The rerun band
  next to the score is something I can't get anywhere else. But I'd still want: the agreement
  measure named, the April seed shown, a percent-change column, a CSV of the size table, and to
  see where April's data came from.
