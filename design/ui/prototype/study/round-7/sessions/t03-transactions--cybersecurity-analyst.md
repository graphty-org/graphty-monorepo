# Session: transfer rings -- Priya, threat hunter (cybersecurity analyst)

Task as given by the moderator: "Do the accounts fall into rings that send money mostly among
themselves? Get graphty to pick them out, then say how many there are and how big the largest few
are. The data on screen is a sample: one month of card and bank transfers between accounts."

Outcome: failed. The grouping ran (as far as the screen said), but no result ever appeared, so I
could not say how many rings there are or how big they are.

All commands were run from design/ui/prototype. `D` is
`$PWD/tmp/round-7-sessions/t03-transactions--cybersecurity-analyst`.

## 01 -- start screen (shots/tasks/t03-transactions/01.png)

Gray hexagon blob, title "Transfers, March 2026". Right side: 3,000 nodes, 9,113 edges, directed,
weighted by amount. One weak component. Reciprocity 0. Okay, so nobody ever sends money back to
someone who sent to them -- worth remembering, because "rings that send mostly among themselves"
with zero back-and-forth means any ring is one-way chains or bigger loops.

Before I touch data, my three questions: is this approved, where does it run, does it phone home?
There's a "Local only" chip at the top. Let's see what it actually means.

## 02 -- click "Local only"

    timeout 120 node app-b/study.mjs --try $D/02.png task:t03-transactions --click "Local only"

Settings, Privacy. "Where your data goes": files read on this computer, never uploaded. The
Assistant only sends when I ask it something, and it sends node names and statistics to
Anthropic. Usage data off. That's a straight answer and I could hand it to my lead. Good. A real
trial still dies at "not on the approved list", but this page is what I'd attach to the request.
Note to self: never click Assistant, because node names leaving is exactly my account IDs leaving.

## 03 -- click "Analyze"

    timeout 120 node app-b/study.mjs --try $D/03.png task:t03-transactions --click "Analyze"

A command palette. "Search, or say what to find." Recent: Louvain -- "Which nodes form densely
connected groups." That's community detection, i.e. clusters. Not quite the same thing as "a ring
that mostly sends among itself", but it's the closest thing on offer, and Louvain is what I'd run
in my notebook anyway (networkx / community). I'd rather type it, but fine.

## 04 -- click "Louvain"

    timeout 120 node app-b/study.mjs --try $D/04.png task:t03-transactions --click "Analyze" --click "Louvain"

Settings: weight = amount (loaded weight), higher means Stronger, direction Follow, resolution 1.0.
"Under a second." Defaults look sane for money flow. I don't know what Follow does to Louvain on a
directed graph -- plain Louvain is undirected -- but I'll take the default and check the output.

## 05 -- click "Run"

    timeout 120 node app-b/study.mjs --try $D/05.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run"

Popover is still sitting there. A dark tooltip: "Would add Louvain at the top of the list,
running". Would? Did it or didn't it? The graph is still all gray, left list still says "Analyze
... to add results here". No count, no progress, no list of groups.

## 06 -- click "4 more readings not computed" (looking for a community count in the summary)

    timeout 120 node app-b/study.mjs --try $D/06.png task:t03-transactions --click "4 more readings not computed"

That opened a "Transfers" action menu instead (select all, re-run layout, compute the overview,
clear graph data...). Not what the link said it would do, but "Compute the overview" sounds like
where the missing numbers are.

## 07 -- click "Table"

    timeout 120 node app-b/study.mjs --try $D/07.png task:t03-transactions --click "Table"

Node table, 3,000 rows from accounts-2026-03.csv, sorted by total links. Familiar. Opens at "Rows
381 to 420 of 3,000" though -- why not row 1? Top rows show 0 in, 11-15 out: businesses that only
pay out. No group column.

## 08 -- "4 more readings not computed", then "Compute the overview"

    timeout 120 node app-b/study.mjs --try $D/08.png task:t03-transactions --click "4 more readings not computed" --click "Compute the overview"

This is bad. The right panel now says "Co-appearances, from miserables.gexf", 77 nodes, 254 edges,
undirected. The title bar still says Transfers, March 2026 and the canvas is the same blob. So
which data am I looking at? If I had copied a number off this panel into a case I'd have been
reporting a different file. This is the "your graph is fiction" moment. If this happened for real
I'd close the tab.

## 09 -- Run Louvain again, then Escape

    timeout 120 node app-b/study.mjs --try $D/09.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --key Escape

Escape takes me back to the Analyze list, still with the "Would add Louvain..." tooltip. Nothing on
the canvas, nothing on the left. No results.

## 10 -- "Views"

    timeout 120 node app-b/study.mjs --try $D/10.png task:t03-transactions --click "Views"

"No saved views." Nothing here.

## 11 -- Run, then try to click "Everything" on the left

    timeout 120 node app-b/study.mjs --try $D/11.png task:t03-transactions --hover "Louvain" --click "Analyze" --click "Louvain" --click "Run" --click "Everything"

(The leading hover was a slip; it reported "nothing on screen is called Louvain" because the
palette wasn't open yet.) With the Louvain popover up, "Everything" on the left could not be
clicked ("nothing on screen is called Everything") even though I can see it. So the popover blocks
the rest of the app, and the result still isn't anywhere.

## 12 -- "Columns: 10 of 12", hoping for a group column

    timeout 120 node app-b/study.mjs --try $D/12.png task:t03-transactions --click "Columns: 10 of 12"

Columns: id, kind, alertRule, alertTime, country, flagged, riskScore. No community or group
column. Also: "kind" is marked "Color (kind)", but the chip on the canvas says "Nothing is colored
or sized by a row", and everything on screen is gray. Those two can't both be true.

I'm stopping here. Ninety seconds on a control that doesn't give me output is my limit, and I'm
past it.

## Verdict

- Succeeded? No. I found the right algorithm (Louvain) in about two clicks and the settings were
  reasonable, but Run never produced anything I could see: no colors, no list of groups, no count,
  no sizes. I cannot say how many rings there are or how big the biggest are.
- Single Ease Question: 2 of 7. Finding the button was easy; getting an answer was impossible.
- Would I use it instead of my notebook? No, not on this showing. In the notebook, Louvain gives me
  a dict of node -> community in one line and I can value_counts() it. Here the run vanished, and
  one panel silently swapped to a different dataset (Les Miserables) under the Transfers title,
  which is a trust-ender. What I did like: the Privacy page answered "does it phone home" in plain
  terms before I asked, and the Analyze palette described each algorithm in one line.
- What I'd need to see: after Run, a table of groups -- group id, member count, internal vs
  outgoing amount -- sorted by size, exportable to CSV, and the graph colored by group with a
  legend. And for "rings" specifically, the share of each group's money that stays inside it,
  because Louvain alone just tells me "clustered", not "launders among itself". Also, Reciprocity 0
  means no two-way pairs at all -- I'd want to know if a cycle finder exists, since a money ring
  shows up as loops, not just a dense blob.
