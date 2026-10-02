# Session: t33, Expert Emma (network scientist)

Task as given: "Before lunch you asked graphty to redo the rings of accounts on April's data. See
how that went, and which month the drawing is showing you now."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t33--expert-emma/.

## Step 1 -- start screen (shots/tasks/t33/01.png)

Think-aloud: "Title bar says 'Transfers, March 2026'. Fine, that is the file name, or is it the
data? The right panel is the Louvain result: 35 communities, Q 0.688, run 'from Louvain, Sep 28',
seed 11, weight = amount. Good, it names the method, the weight and the seed. That is more than
Gephi gives me. But Sep 28 is not 'before lunch' -- today's run would be later. And nothing here
says 'out of date' or 'April'. Let me add up the sizes: 297+182+147+141+139+123+120 = 1,149, plus
1,851 in the rest = 3,000 accounts. That is a round March-sized number. So this panel is a March
result, or at least a result on 3,000 nodes. Where is my rerun?"

"The 'from Louvain, Sep 28' link looks like it should take me to the run."

## Step 2 -- click the run link

    timeout 120 node app-b/study.mjs --try .../t33--expert-emma/02.png task:t33 --click "from Louvain, Sep 28"

Think-aloud: "No. That opened an 'Analyze' picker -- Louvain, PageRank, shortest path. I wanted the
run's provenance, not a menu to start a new run. A link that says 'from X, date' should go to that
run. Close it. Try the title -- the document menu is where Gephi and everybody else keep history."

## Step 3 -- the title menu

    timeout 120 node app-b/study.mjs --try .../03.png task:t33 --click "Transfers, March 2026"

Think-aloud: "Rename, Save, Save as, Export, Apply recipe, Version history, Close. 'Version
history' -- that is the only thing here that might know about this morning."

## Step 4 -- Version history

    timeout 120 node app-b/study.mjs --try .../04.png task:t33 --click "Transfers, March 2026" --click "Version history"

Think-aloud: "Right, here it is. The current version is 'April data', replaced from
accounts-2026-04.csv and transfers-2026-04.csv on Sep 30: 3,093 accounts (was 3,000), 8,370
transfers (was 9,113), 132 new, 39 gone. Then a 'Louvain communities, rerun': 65 communities,
modularity 0.742, March result kept as an earlier result. And 'Replaced the data with April --
runs on March data were marked out of date'."

"Now the honest part, which I like: 'large change, 27 components (was 1): 26 accounts have no
transfers in this version, each a component of its own' and '65 communities (was 35): 26 of
them are those single accounts; 39 hold accounts with transfers'. So the jump from 35 to 65 is
mostly isolates counted as their own community. That is exactly the thing I would have had to
find in the notebook myself. 39 real communities against 35 -- that I can work with. Q 0.742 vs
0.688 is not comparable across two different graphs, and it does not claim it is, fine."

"'Community numbers carried over from March: a community keeps its number when most of its
members stay.' Good, that is matching, not relabeling from scratch. I would want to know the
threshold for 'most', but OK."

"Two things missing on the rerun line: the seed and the weight. March says 'Seed 11'. The rerun
line does not. Same seed? Did it reuse the amount weight? I cannot tell from here."

"Also 'Asked the assistant -- Sent to api.anthropic.com, Oct 1: your question, 14 account ids,
3 statistics.' Hm. Someone on this project sent account ids off the machine while the button
up top says 'Local only'. At least it is written down. I would want that to be impossible on a
client file, not logged after the fact."

## Step 5 -- Runs filter

    timeout 120 node app-b/study.mjs --try .../05.png task:t33 --click "Transfers, March 2026" --click "Version history" --click "Runs"

Think-aloud: "Same list without the noise. Still no seed on the rerun. Let me open the rerun
entry, it might have the parameters."

## Step 6 -- click the rerun entry

    timeout 120 node app-b/study.mjs --try .../06.png task:t33 --click "Transfers, March 2026" --click "Version history" --click "Runs" --click "Louvain communities, rerun"

Think-aloud: "What. I am now in a project called 'Les Miserables', co-appearances, with a Louvain
menu open (Rerun, Run as copy, Restore the suggested look...). Seed 7. That is not my data and not
my run. Clicking a history entry switched the whole document. If I had done this in front of a
client I would close the tab. I am not going to dig further into this; I have what I came for
from the log."

## Where I stopped and my answer

- How the rerun went: it ran on April (3,093 accounts, 8,370 transfers). 65 communities, Q 0.742,
  but 26 of those are single accounts with no transfers in April, so 39 communities that mean
  anything. Numbers were carried over from March by member overlap. I could not confirm the seed
  or weight used.
- Which month the drawing shows: the history says the current version is April. But the main
  screen I started on shows 35 communities, Q 0.688, Sep 28, seed 11, sizes summing to exactly
  3,000 -- that is the March result. Its title says March 2026. Nothing on that main screen says
  "out of date" even though the log claims March runs were marked out of date. So my answer is:
  the main drawing is colored by the March Louvain result; whether the nodes underneath are March
  or April, the screen does not tell me, and the title and the history disagree.

Did I succeed? Partly. I found the rerun and its result, but I am not confident which month the
main drawing is showing, because the screen and the history contradict each other.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? Not for this. The version log itself is better than
anything Gephi has -- it tells me why the community count jumped, and it records what left the
machine. But I had to find it under the file-name menu, the run link on the panel opened a "start
a new analysis" picker instead of the run, the panel did not warn me it was showing a stale March
result on what the app thinks is April data, and clicking a log entry threw me into a different
project. Stale results shown without a flag are exactly how a wrong number ends up in a report.
In the notebook the variable name tells me which month I am looking at.
