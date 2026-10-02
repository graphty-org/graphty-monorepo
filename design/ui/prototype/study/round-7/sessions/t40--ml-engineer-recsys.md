# Session: open a very large patent citation network (participant: Chris, ML engineer, recommendation systems)

Task as given: "The full patent citation network your group keeps -- every patent and the earlier
patents it cites, well over a hundred thousand of them -- is in your Downloads folder. Get a first
look at it in graphty. The file is a sample: a very big network of patents. If that is not your
line of work, treat it as your own biggest export."

Outcome: gave up. The patent network never opened. SEQ 1 of 7.

All commands run from design/ui/prototype. D = tmp/round-7-sessions/t40--ml-engineer-recsys.
Every --try run starts again from the start screen.

## Start screen (shots/tasks/t40/01.png)

Think-aloud: "Start, Recent projects, Samples. 'Files are read on this computer and never
uploaded' -- good, that's the first thing privacy review asks. I'm looking for the import. Open
project or file, Ctrl+O. And hey, the Recent list already has 'Patent citations 1999-2001,
124,318 patents, ~/Downloads/Patent citat...' dated Sep 19. 124k matches 'well over a hundred
thousand'. Either path should work. I'll go the normal way first: Open."

## Step 1 -- Open project or file

    timeout 120 node app-b/study.mjs --try $D/01.png task:t40 --click "Open project or file..."

Screen: the Les Miserables sample, fully styled (PageRank colors, Louvain, shortest paths,
watchlist).

"Wait. I clicked Open and I'm in Les Miserables? No file dialog, nothing asking me for a file.
I didn't ask for a toy sample. Back out."

## Step 2 -- the recent entry for the patent file

    timeout 120 node app-b/study.mjs --try $D/02.png task:t40 --click "Patent citations 1999-2001"
    timeout 120 node app-b/study.mjs --try $D/03.png task:t40 --click "Patent citations 1999-2001"

Screen: Les Miserables again, both times.

"That row literally says ~/Downloads, 124,318 patents. I click it and get 77 characters from a
novel. Either my click didn't register or the recent list is decoration. No error, no 'file
moved', nothing."

## Step 3 -- sanity check, and New from data

    timeout 120 node app-b/study.mjs --try $D/04.png task:t40
    timeout 120 node app-b/study.mjs --try $D/05.png task:t40 --click "New from data..."

04: the start screen, unchanged. 05: a mapping screen for "Door entries, March 2026" -- people,
buildings, entries.csv, 4,212 rows, a match report about person_id values not in people.

"New from data drops me into somebody's door-entry CSV. The mapping screen itself is decent --
'4,212 rows; 4,180 have both ends', From/To column roles, a Directed toggle, a real match report.
That's the denominator I want. But it's not my file and I never picked a file."

## Step 4 -- the count on the recent row, and drag-and-drop

    timeout 120 node app-b/study.mjs --try $D/06.png task:t40 --click "124,318 patents"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t40 --click "or drop a file anywhere in this window"

06: Les Miserables again. 07: a full-window "Drop to open" overlay listing CSV, GraphML, GEXF,
GML, DOT, Pajek, JSON, Neo4j, "read here and never uploaded".

"OK, drop target. No Parquet in that list -- so I'm writing a conversion script for my real data
anyway. For this one, I drop the patent file."

    timeout 120 node app-b/study.mjs --try $D/08.png task:t40 --click "or drop a file anywhere in this window" --click "Drop to open"

08: mapping screen for transfers-2026-03.csv: from_account / to_account, ACC-863727 style ids,
9,113 rows, 3,000 ids.

"I dropped patents and it's showing me bank transfers. ACC- ids, amounts. That is not what I
dropped. If this were real I'd assume it read the wrong file from my disk, which is worse than an
error."

## Step 5 -- keyboard and the "3 more" list

    timeout 120 node app-b/study.mjs --try $D/09.png task:t40 --key Control+o
    timeout 120 node app-b/study.mjs --try $D/10.png task:t40 --click "3 more"

09: the same transfers mapping screen. 10: start screen with a toast "3 more recent projects";
the list did not visibly expand.

"Ctrl+O, the VS Code reflex. Same transfers file. '3 more' just flashes a toast and doesn't show
me anything more."

## Step 6 -- hover the patent row; load anyway to see the loader; the row's menu

    timeout 120 node app-b/study.mjs --try $D/11.png task:t40 --hover "Patent citations 1999-2001"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t40 --key Control+o --click "Load"
    timeout 120 node app-b/study.mjs --try $D/13.png task:t40 --hover "Patent citations 1999-2001" --click "..."

11: the row highlights and shows a "..." button; no tooltip, no warning. 12: "Reading
transfers-2026-03.csv, 3,000 nodes, 9,113 edges..." with a progress bar and Cancel. 13: Les
Miserables again.

"The loader is the kind of thing I like -- numbers, a bar, Cancel. If it did that on 124k
patents and 16 million citations I'd wait. But it's loading the transfers file. And the '...'
on my patent row puts me back in Les Mis. I've tried Open, Ctrl+O, drop, New from data, the
recent row three ways. Six paths, zero of them get me my file. I'm done."

## Debrief

- Did I succeed? No. I never saw the patent network. I never got to the part I actually cared
  about: does it refuse to draw a 124k-node hairball by default, does it tell me nodes/edges and
  what it left out, can I search one patent id and see its citation neighborhood.
- Single Ease Question: 1 out of 7.
- Would I use this instead of my current tool (networkx + a notebook, ego graphs only)? Not on
  this showing. Opening my own file is step one of my five minutes; if step one fails, the
  session is over. The pieces I glimpsed are promising -- local-only reading stated up front, a
  mapping screen that reports rows vs. edges and unmatched ids, a loader with live counts -- and
  those are exactly what a notebook doesn't give me for free. But a recent-file entry that opens
  a different dataset, and a drop that shows a different file than the one dropped, would make
  me distrust every number after it. Also no Parquet in the format list.

## What went wrong, plainly

1. The recent entry for the patent file (title, count, and its "..." menu) opened the Les
   Miserables sample every time, with no message.
2. "Open project or file..." opened Les Miserables instead of a file chooser.
3. Dropping a file, Ctrl+O and "New from data..." each showed a different canned file
   (transfers, door entries), never the patent network.
4. "3 more" showed a toast instead of expanding the list.
5. The drop overlay lists no Parquet.
