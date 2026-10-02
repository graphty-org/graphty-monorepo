# Session: transaction rings -- Analyst Alex

Task as given by the moderator: "Do the accounts fall into rings that send money mostly among
themselves? Get graphty to pick them out, then say how many there are and how big the largest few
are. The data on screen is a sample: one month of card and bank transfers between accounts."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t03-transactions--analyst-alex/`. `T` stands for
`timeout 120 node app-b/study.mjs --try <render> task:t03-transactions`.

## Steps, thinking aloud

**01 (start screen, shots/tasks/t03-transactions/01.png).** "OK, 'Transfers, March 2026'. Top bar
says 'Local only' -- good, I'll take that as the data not leaving my machine. Right side: 3,000
nodes, 9,113 edges, directed, weight is amount. Weak components 1, reciprocity 0. Gray hexagon
blob in the middle, no colors. On the left there's an 'Analyze (Shift+A) to add results here'
link. Groups is what I want, so Analyze."

**02.** `T 02.png --click "Analyze"`
"A list. Recent: Louvain -- 'which nodes form densely connected groups'. That's my modularity
from Gephi. Good that there's a one-liner under each."

**03.** `T 03.png --click "Analyze" --click "Louvain"`
"Settings: weight = amount, higher means stronger, direction follow, resolution 1.0. 'Under a
second' -- nice, I like being told. No seed anywhere though. If I run it twice do I get the same
rings? Run."

**04.** `T 04.png --click "Analyze" --click "Louvain" --click "Run"`
"A black bubble: 'Would add Louvain at the top of the list, running'. Would? Is it running or
not? The picture didn't change. The badge still says 'Nothing is colored or sized by a row'."

**05.** `T 05.png ... --click "Run" --key Escape`
"Escape just drops me back into the list. Nothing appeared in the left column where it said
results would go. So where did the result go? This is exactly the Bloom thing -- I ran it and
nothing changed."

**06.** `T 06.png --click "Analyze" --click "Search, or say what to find" --key r --key i --key n --key g`
(the tool said nothing is called the search box's placeholder, but the box already had focus and
my typing landed in it)
"Search for 'ring'. Only 'Bipartite matching -- this graph is not bipartite', grayed out.
Matching the letters, not what I mean. Fair, 'ring' is my word, not a graph word."

**07.** `T 07.png --click "Analyze" --key c --key o --key m --key m --key u --key n`
"'commun' gives a 'Find groups' section: Louvain, Leiden marked 'Start here', Label
propagation, Girvan-Newman with a clock icon (slow, I assume). If they say start with Leiden,
fine."

**08.** `T 08.png ... --click "Leiden"` -- same form as Louvain, 'under a second'.

**09.** `T 09.png ... --click "Leiden" --click "Run"`
"'Would add Leiden at the top of the list, running'. Same as before. Still gray, still nothing
on the left."

**10.** `T 10.png ... --click "Run" --key Escape --key Escape --click "Table"`
(the tool said nothing is called "Table" -- the Analyze box was still covering it)
"I can't even get out of this box with Escape to look at the table. I'd have to find the little
X."

**11.** `T 11.png --click "Table"`
"Plain table, no run: 3,000 nodes 'from the node file accounts-2026-03.csv', columns id, links
in, links out, links total, kind, country. Count matches the summary. No group column, because
nothing has actually run. Also: reciprocity was 0, so nobody pays anyone straight back. A 'ring'
is money going round A to B to C back to A. That's cycles -- strongly connected components, not
modularity. Maybe I picked the wrong algorithm anyway."

**12.** `T 12.png --click "Analyze" --key c --key y --key c --key l`
"'cycl' finds 'Strongly connected components -- groups in which every node reaches every other.'
That's the definition of a ring. It has a little arrow on the right the others don't."

**13.** `T 13.png --click "Analyze" --key c --key o --key m --key p --key o --key n`
"'compon' shows Connected components too. I already know that answer: weak components 1. So
strongly connected is the one."

**14.** `T 14.png ... --click "Strongly connected components"`
"Direction: follow. 'Nothing to set.' Under a second. Good, simple."

**15.** `T 15.png ... --click "Strongly connected components" --click "Run"`
"'Would add Strongly connected components at the top of the list, running'. Same story. Three
algorithms run, zero results on screen. No count, no sizes, no colors."

**16.** `T 16.png --click "4 more readings not computed"`
"Hoping one of the unread readings is a group count. Instead I get a menu: select all, re-run
layout, reshuffle layout seed, 'Compute the overview', add node, 'Clear graph data'. Nothing
about groups. I'm not touching 'Clear graph data'."

**17.** `T 17.png --click "Assistant"`
"Assistant is off, 'Nothing is sent. Turn on in Settings.' Good that it's off by default. I'm
not turning on an AI with transaction data in it to ask it a question a button should answer."

Stopped here, about seven or eight minutes in -- already past what I'd give a new tool.

## Outcome

**Did I succeed?** No. I found the right algorithm -- strongly connected components, which I'd
argue is the right reading of "ring" given reciprocity is 0 -- and I found Louvain and Leiden for
the looser "send mostly among themselves" reading. But no run ever gave me anything: no count of
rings, no sizes, no colors, no new column in the table, nothing in the left panel where it said
results would go. I can't say how many rings there are or how big the biggest are.

**Single Ease Question: 2 / 7.** Finding the algorithms was OK once I guessed the right words.
Getting an answer out was impossible.

**Would I use this instead of my current tool?** Not on this showing. In NetworkX it's one line:
`sorted(nx.strongly_connected_components(G), key=len, reverse=True)`, then len() of the list and
of the first few. Here I clicked Run three times and got a message that says "would". Things I
did like: 'Local only' up top, the summary counts on load, the one-line description under every
algorithm, 'under a second' before running, and the Assistant being off by default.

## Problems, in my words

1. **Run gives nothing back.** After Run there is only a bubble that says "Would add X at the top
   of the list, running". No colors, no legend, no group count, no sizes. "Where did the result
   go?" (severity: blocks the task)
2. **"Would" reads as "didn't".** Even as a status message it sounds hypothetical. I can't tell if
   it ran, is running or never will. (high)
3. **My word "ring" finds nothing useful.** Search for "ring" returns only Bipartite matching. I
   only got to strongly connected components by guessing "cycl". A first-timer who says "ring",
   "loop" or "fraud" won't find it. (high)
4. **Nothing helps me pick between groups and cycles.** Louvain and Leiden ("densely connected")
   and strongly connected components ("every node reaches every other") both sound like "rings".
   Nothing says which fits money going round in a loop. Leiden is marked "Start here", which
   pushed me the wrong way first. (medium)
5. **Escape won't close the Analyze box.** It goes back to the list instead, and the box covers
   Table, so I couldn't check the table after a run. (medium)
6. **No seed on Louvain or Leiden.** I'd want to know whether the groups come out the same if I
   rerun it. (low, but I'd ask before putting it in a deck)
7. **"4 more readings not computed" opened a general menu** with "Clear graph data" in it, not
   the readings. (medium -- confusing, and a destructive item one click away)
