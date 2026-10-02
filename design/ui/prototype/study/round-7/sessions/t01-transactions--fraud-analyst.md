# Session: check what came in (March transfers) -- Sarah, fraud analyst

Task as given by the moderator: "Someone on your team brought this month's transfers into a project and has started on them; you were just looking at one account. Before anyone works the month, check what came in overall: how many accounts and transfers, whether the transfers run one way, whether everything hangs together or falls into separate pieces, and whether anything looks off."

Mode: first impression, not mandated. All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t01-transactions--fraud-analyst/.

## Start screen (shots/tasks/t01-transactions/01.png)

"Grey honeycomb. Great, a hairball, in hexagons this time. On the right is the account I was on, ACC-633005, business, GB, risk score 3, not flagged. Fine, but I'm asked about the whole month, not this one. Left side says Graph, Transfers, and a list: Selection, Notes, 'Louvain 35 groups' -- no idea what Louvain is, not clicking it -- 'Links in (count)', 'Everything'. Up top there's 'Full graph' and 'Local only'. Local only is good, I'll take that as nothing leaving the building. Where's the summary of the file? The rail has Data. That's where I'd expect row counts."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try .../01.png task:t01-transactions --click "Data"

"OK, this is more like it. Two files: accounts-2026-03.csv, 3,000 accounts, and transfers-2026-03.csv, 9,113 rows, 9,113 links. Rows match links, so nothing got dropped on import. Good, that's the first thing I'd check.

But hang on -- there's a filter on. 'amount is at least 1,000, 812 of 3,000 nodes.' My colleague left that on. The top bar says '812 of 3,000 nodes' too. Anyone opening this cold would think the month is 812 accounts. That's the first thing that looks off, and it's ours, not the data's.

Right panel: Nodes 812 of 3,000, Edges 9,113. So it's mixing filtered and unfiltered on the same panel? There's a line '5 readings are for all 3,000 nodes' with a 'Compute on 812' button. OK, so the numbers below are the whole month. I'll take it, but I had to read that twice.

Direction: Directed. Reciprocity 0. Weak components 1. Average total degree 6.08, highest 907.

So: one way? Reciprocity zero -- I'll hover it in a sec. 'Weak components' -- I assume 1 means it's all one blob. 907 against an average of six -- that's the account everything touches. Payroll or a processor, or a collector. That's what I'd want named."

## Step 2 -- the "4 more readings not computed" link

    timeout 120 node app-b/study.mjs --try .../02.png task:t01-transactions --click "Data" --click "4 more readings not computed"

"I click the blue link and I get... a menu. Select all, invert selection, re-run layout, reshuffle layout seed, clear graph data. That's not what I clicked for. There's 'Compute the overview', I'll try that."

## Step 3 -- Compute the overview

    timeout 120 node app-b/study.mjs --try .../03.png task:t01-transactions --click "Data" --click "4 more readings not computed" --click "Compute the overview"

"What. The right panel now says 'Co-appearances, from miserables.gexf', 77 nodes, 254 edges, Undirected, 1 note. The left side still says my two transfer files. That is not my data. Where did 77 come from? If I'd pasted that number into the case notes I'd be explaining it to QA. This is the moment I stop trusting the panel. I'll go back to the numbers I saw before it did that."

## Step 4 -- Compute on 812

    timeout 120 node app-b/study.mjs --try .../04.png task:t01-transactions --click "Data" --click "Compute on 812"

"Same junk menu as before. Fine. Not doing that."

## Step 5 -- click the 907

    timeout 120 node app-b/study.mjs --try .../05.png task:t01-transactions --click "Data" --click "907"

"Nothing. I want to know WHO is 907. It's the most important number on the screen and it doesn't go anywhere."

## Step 6-10 -- the table, looking for the hub

    timeout 120 node app-b/study.mjs --try .../06.png task:t01-transactions --click "Data" --click "Table"
    timeout 120 node app-b/study.mjs --try .../07.png task:t01-transactions --click "Data" --click "Table" --click "Links total (count, full graph)"
    timeout 120 node app-b/study.mjs --try .../08.png task:t01-transactions --click "Data" --click "Table" --click "Links total (count, full graph)" --click "Links total (count, full graph)"
    timeout 120 node app-b/study.mjs --try .../09.png task:t01-transactions --click "Data" --click "Table" --click "Previous page"   (nothing on screen is called "Previous page")
    timeout 120 node app-b/study.mjs --try .../09.png task:t01-transactions --click "Data" --click "Table" --click "Previous"
    timeout 120 node app-b/study.mjs --try .../10.png task:t01-transactions --click "Data" --click "Table" --click "Rows 381 to 420 of 3,000"

"Table opens. Sorted by links total, descending, good -- but it's on rows 381 to 420. It opened where my account sits, which I suppose is why. I want row 1. I flip the sort: still rows 381 to 420, now ascending. Flip back: same. The back arrow's tooltip says 'Shows the next rows (the skeleton holds one page)'. Skeleton? So I can't page. I cannot get to the top of the list. In Excel this is Ctrl+Home.

What I can see on this page is odd, though: every account at the top here is a business with links in 0 and only outgoing links -- 15, 14, 14, 14, 12, 11. Accounts that only send. With reciprocity at zero, I'm reading the month as money going one direction."

## Step 11-12 -- components and reciprocity

    timeout 120 node app-b/study.mjs --try .../11.png task:t01-transactions --click "Data" --click "Weak components"
    timeout 120 node app-b/study.mjs --try .../12.png task:t01-transactions --click "Data" --hover "Reciprocity"

"Clicking 'Weak components' does nothing I can see, the 1 just gets underlined. I'd have liked 'all 3,000 accounts are connected' in words. Hovering Reciprocity: 'The share of edges returned: A to B and also B to A.' OK, zero means no pair ever sends back. That answers 'one way'. Across nine thousand card and bank transfers, not one refund or return between the same pair? I'd flag that as odd in itself -- either the data's been cut to one direction or it's a synthetic set."

## Step 13-14 -- the transfers themselves

    timeout 120 node app-b/study.mjs --try .../13.png task:t01-transactions --click "Data" --click "Table" --click "Edges"
    timeout 120 node app-b/study.mjs --try .../14.png task:t01-transactions --click "Data" --click "Table" --click "Edges" --click "amount" --click "amount"

"Edges table: from_account, to_account, timestamp, amount. That's a statement. And at the bottom: 'Sum of amount, all 9,113 rows: 14,156,522.' That's the first thing that felt like my tools. 

I tried to sort by amount, and instead it opened the amount column's details on the right and flipped the table back to accounts. Still useful: 0.50 to 98,400, 14,156,522.28 total, 1,553.44 average, none missing. Most of the volume is small -- the bars pile up at the low end. A 98,400 in a month of mostly small card payments is worth a look; I couldn't get the row in front of me."

## Step 15-16 -- flagged and kind

    timeout 120 node app-b/study.mjs --try .../15.png task:t01-transactions --click "Data" --click "flagged"
    timeout 120 node app-b/study.mjs --try .../16.png task:t01-transactions --click "Data" --click "kind"

"I want to know how many accounts are flagged. I click 'flagged': the right side still shows amount. I click 'kind': still amount. The list says kind is 'Color (kind)' but the canvas says 'Nothing is colored or sized by a row.' Which is it? I'm done here."

## What I'd tell the team

- 3,000 accounts, 9,113 transfers, 14,156,522.28 moved, all rows loaded, no missing amounts.
- Directed, and nothing comes back: reciprocity 0. Money runs one way. Lots of business accounts that only send.
- One piece -- "weak components 1", which I read as everything connected.
- Off: one account with 907 links against an average of about 6. Could not find out which. A 98,400 top transfer. Zero returns in a month of card payments is itself suspicious of the extract.
- Off, ours: an "amount at least 1,000" filter left on, so the screen says 812 accounts.

## Debrief

Did I succeed? Partly. I have counts, direction and "one piece" -- I'm fairly confident of those. I could not name the 907 account or check flagged accounts, which is half of "does anything look off". And the compute link swapped in a different dataset (77 nodes, miserables.gexf), which means I'd re-check every number in Excel before I wrote any of it down.

Single Ease Question: 3 of 7. The Data panel got me most of the counts in one click, which is good. Everything after that fought me.

Would I use this instead of what I use? Not yet. For this job -- "what came in" -- a pivot on the two CSVs gives me counts, total, top senders and top receivers sorted from row 1 in ten minutes, and I trust it. What this has that a pivot doesn't is "one piece" and "nothing comes back" in one line, and I liked that. But a number I can't click through to the account, a table I can't get to the top of, and a panel that showed me somebody else's graph -- that's an examiner question I don't want to answer.
