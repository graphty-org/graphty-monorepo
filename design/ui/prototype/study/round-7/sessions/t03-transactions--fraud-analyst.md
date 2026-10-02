# Session: t03-transactions, fraud analyst (Sarah)

Task as given: "Do the accounts fall into rings that send money mostly among themselves? Get
graphty to pick them out, then say how many there are and how big the largest few are."

Mode: not mandated (her own five minutes or so of patience).
All commands run from design/ui/prototype; renders in
tmp/round-7-sessions/t03-transactions--fraud-analyst/.

## Step 1 -- the start screen (shots/tasks/t03-transactions/01.png)

"Transfers, March 2026. Three thousand accounts, nine thousand transfers. And a gray blob.
Great, a hairball. The panel on the right is numbers I half understand: 'Weak components 1',
'Reciprocity 0', 'Density 0.00101'. Reciprocity zero -- nobody sends money back to anyone? That
is odd for round-tripping, but I don't know what it is counting. 'Weak components: 1' -- if
that means everything is one connected lump, then the rings are not going to just fall out on
their own.

Nothing here says 'rings' or 'clusters'. On the left there is a blue link, 'Analyze ... to add
results here'. That is the only thing that looks like it does something. I'll try it."

## Step 2 -- open Analyze (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:t03-transactions --click "Analyze"

"A list. Louvain, PageRank, Shortest path, then Links count, Links in, Links out, Total amount,
Total amount in. Louvain -- no idea who that is. But the line under it says 'Which nodes form
densely connected groups.' Groups. That's the closest thing to 'ring' on this screen. The
amount ones are interesting too -- total amount in per account is half my pivot table -- but
that is not the question today.

There's a search box: 'Search, or say what to find'. I'll type 'ring' in it."

## Step 3 -- type "ring" in the search (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t03-transactions --click "Analyze" --type "ring"

"Nothing changed. Still the same list, the box looks empty. Either it didn't take my typing or
'ring' means nothing to it. Fine, I'll go with the 'groups' one."

(Moderator note: the click-through tool may not support typing, so this may not be what a real
browser would do. Recorded as experienced.)

## Step 4 -- Louvain (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:t03-transactions --click "Analyze" --click "Louvain"

"A form. Weight: amount (loaded weight). Higher means: Stronger / Farther / Capacity. Direction:
Follow / Ignore. Resolution 1.0. 'Under a second', and a Run button.

Weight by amount, more money means closer -- OK, that's what I'd want, bigger flows tie
accounts together. Direction 'Follow' -- I suppose that respects who paid whom. Resolution I
don't know and won't touch. Run."

## Step 5 -- Run (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run"

"A black message: 'Would add Louvain at the top of the list, running'. Would? Is it running or
not? The picture didn't change, nothing colored, the left list is still empty, and the form is
still sitting there. No count of groups anywhere."

## Step 6 -- Escape to get rid of the form (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --key Escape

"Escape took me back to the Analyze list instead of closing it. The message is still there.
Still no result."

## Step 7 -- maybe it is under Views (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:t03-transactions --click "Views"

"'No saved views.' Not there."

## Step 8 -- look for something that says groups (08.png)

    timeout 120 node app-b/study.mjs --try .../08.png task:t03-transactions --click "Analyze" --click "Find groups"

"This one's 'Connected components: which parts of the graph are cut off from each other.' The
summary already told me there is 1 weak component. That's the whole sample in one lump, so
running this would tell me 'one ring of 3,000 accounts', which is useless. Not what I want."

## Step 9 -- the Assistant (09.png)

    timeout 120 node app-b/study.mjs --try .../09.png task:t03-transactions --click "Assistant"

"'Off. Nothing is sent. Turn on in Settings.' Good that it's off. I'm not turning on anything
that sends customer transactions somewhere. Closed."

## Step 10 -- run it again, close the form, check the table (10.png, 11.png, 12.png)

    timeout 120 node app-b/study.mjs --try .../10.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --click "Table"
    -> nothing on screen is called "Table"
    timeout 120 node app-b/study.mjs --try .../11.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --click "Close"
    timeout 120 node app-b/study.mjs --try .../12.png task:t03-transactions --click "Table"

"With the form open I couldn't even get to the table. After closing it: the left list is still
empty. The Run did nothing I can see. 'Add results here' -- nothing was added.

The table on its own: accounts, links in, links out, total, kind, country. ACC-633005, zero in,
fifteen out. That's useful-ish for a pivot, but there is no group or ring column. 3,000 rows,
paging 40 at a time."

## Step 11 -- the '4 more readings not computed' link (13.png)

    timeout 120 node app-b/study.mjs --try .../13.png task:t03-transactions --click "4 more readings not computed"

"I got a menu instead: select all, invert selection, re-run layout, compute the overview, add
node, clear graph data. Clear graph data -- right next to the stuff I'd click by accident. Not
what I wanted. Nothing about groups."

## Step 12 -- one last look for the result (14.png, 15.png)

    timeout 120 node app-b/study.mjs --try .../14.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --click "Close" --click "Louvain"
    -> nothing on screen is called "Louvain"
    timeout 120 node app-b/study.mjs --try .../15.png task:t03-transactions --hover "Lightning"
    -> nothing on screen is called "Lightning"

"After the run there's no 'Louvain' anywhere on the page. So it said it would add it and then
didn't. I'm done. I've spent my five minutes."

## Outcome

Gave up. I don't have a number of rings or the sizes of the biggest ones.

What I got: I found the thing that I think finds rings -- 'Louvain', which I only picked because
the line under it said 'densely connected groups' -- and I pressed Run. Then nothing: a message
that says 'would add ... running', no colors, nothing in the list on the left, no count, no
sizes.

Problems, in my words:
- The only way to "rings" is a name I've never heard of. If the description line hadn't said
  "groups", I would never have touched it. Call it "Find rings / clusters" and I'd have been
  there in one click.
- Run gave no result I could see and no count. 'Would add ... running' isn't English I can act
  on. Did it run? Is it still running? Where does the answer go?
- Escape took me back a step instead of closing the box, and the box blocked the rest of the
  screen.
- Search box ignored what I typed (or my word wasn't one it knows).
- The summary says "Weak components: 1" and "Reciprocity: 0" with no explanation. Reciprocity 0
  on a transfers sample makes me distrust it or misread it.
- Even if it had worked: I need the list of accounts in each ring as rows I can export, and a
  count I can trace. I didn't see any route to that.
- "Clear graph data" sits in the same menu as "Select all". One wrong click.

Did I succeed? No.

Single Ease Question: 2 out of 7.

Would I use this instead of my current tool? Not on this showing. Today I'd take the transfer
export, pivot sender by receiver, and eyeball who pays whom -- slow, but it gives me rows I can
put in the file. i2 at least shows me the link chart. Here I pressed the button that I think
finds rings and got nothing back. If it gave me "14 rings, the biggest 23, 17 and 12 accounts,
here are their account numbers, export to CSV", that would actually save hours on a mule case
and I'd ask my manager about it. Not yet.
