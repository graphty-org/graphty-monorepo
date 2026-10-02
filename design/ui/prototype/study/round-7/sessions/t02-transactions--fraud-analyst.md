# Session: top ten receiving accounts -- Sarah, fraud analyst

Task as given by the moderator: "Which ten accounts receive transfers from the greatest number of
other accounts this month? Get graphty to work it out so you can hand the list on. The data on
screen is a sample: one month of card and bank transfers between accounts."

Mode: first impression (not mandated). Renders are in
design/ui/prototype/tmp/round-7-sessions/t02-transactions--fraud-analyst/.

All commands were run from design/ui/prototype, with
`D=tmp/round-7-sessions/t02-transactions--fraud-analyst`.

## Think-aloud

**01 (start screen, shots/tasks/t02-transactions/01.png).** A gray blob of hexagons. 3,000
"nodes", 9,113 "edges". I am going to read that as 3,000 accounts and 9,113 transfers. "Highest
total degree 907" -- so something touches 907 times. That is my payment processor or my mule
collector, but it says total, so in and out together, and I want in. There is a "Table" at the
bottom. That is where I would start, because a table is a pivot table to me.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:t02-transactions --click "Table"
```

**02.** Good, a table of accounts. Columns: "Links in (count, full graph)", "Links out",
"Links total". "Links in" is close to what I want. But it is sorted by total, and the row
counter says "Rows 381 to 420 of 3,000". Why am I on row 381? I did not scroll. I'll sort by
Links in.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:t02-transactions --click "Table" --click "Links in (count, full graph)"
```

**03.** The arrow says it is sorted descending, and the first number I can see is 4. That cannot
be the top of the list when the right panel says something has 907 links. I am still on "Rows
381 to 420". So it sorted and left me in the middle. Let me try Home to jump to the top.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --key Home
```

**04.** Home did nothing except put a box around the header. Still 381 to 420. In Excel, Ctrl+Home
gets me to A1. Fine, try the "Analyze" link on the left, it says it "adds results".

```
timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:t02-transactions --click "Analyze"
```

**05.** A list. Louvain, PageRank -- no idea, not touching those. "Links in (count): How many
edges come into each node." Edges coming in is transfers coming in. That is a transaction count,
not a counterparty count. If one sender pays the same account forty times, that is forty, and I
asked for how many different accounts. I'll open it and see whether it lets me count distinct
senders.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:t02-transactions --click "Analyze" --click "Links in (count)"
timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Measure"
```

**06, 07.** One setting, "Measure: Links in (count)". Clicking the word "Measure" did nothing.
"Under a second" -- fine. Run it.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run"
```

**08.** A black tip: "Would add Links in (count) at the top of the list, running". So in the real
thing it would add a result. But the table already had a Links in column, so I am not sure what
this gives me that the column did not. Back to the table, I need to get to row 1.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Rows 381 to 420 of 3,000"
timeout 120 node app-b/study.mjs --try $PWD/$D/10.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Previous page"
```

**09, 10.** Clicking the row counter does nothing. "Previous page" -- nothing on screen is called
that. I hovered around the little arrows and the header to find what they were called (the left
arrow turned out to be "Previous rows", and there is a "Column menu").

```
(probe, hover only) --hover "Previous rows" / "Earlier rows" / "Back" / "First page" / "Column menu" / "Column options"
timeout 120 node app-b/study.mjs --try $PWD/$D/11.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Column menu"
timeout 120 node app-b/study.mjs --try $PWD/$D/12.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Previous rows"
```

**11.** "Column menu" was the menu for the id column, not the one I sorted. It only showed a tip.
**12.** "Previous rows": tip says "Shows the next rows (the skeleton holds one page)". The left
arrow says "next"? And I still cannot see the top of my own sort. This is where I would normally
say "this is broken" and go back to Excel.

Two more places before I give up: the overview list on the Analyze panel (maybe there is
something further down like "distinct senders"), and the Assistant.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/13.png task:t02-transactions --click "Analyze" --key End
timeout 120 node app-b/study.mjs --try $PWD/$D/14.png task:t02-transactions --click "Assistant"
```

**13.** End did not scroll the list. Same items. Nothing says "different accounts" or
"counterparties".
**14.** Assistant: "Off. Nothing is sent." Good. That is the right default for me and I am not
turning it on with customer data.

Let me check whether the transfers are one row per payment or already rolled up per pair. If
they are rolled up, "Links in" would be the counterparty count after all.

```
timeout 120 node app-b/study.mjs --try $PWD/$D/15.png task:t02-transactions --click "Table" --click "Edges"
timeout 120 node app-b/study.mjs --try $PWD/$D/16.png task:t02-transactions --click "4 more readings not computed"
```

**15.** Edges table: from_account, to_account, timestamp, amount. One row per transfer, with a
time. So these are individual payments, and ACC-502342 already appears twice in the first five
rows. "Links in" counts payments. It does NOT answer "from how many other accounts". The sum line
at the bottom ("Sum of amount, all 9,113 rows: 14,156,522") is nice -- that is the kind of
number I would check in a pivot.
**16.** "4 more readings not computed" opened a menu of graph commands (select all, re-run
layout, compute the overview, clear graph data). Not what I expected from a link that says
readings. I'm not clicking "Clear graph data" by accident.

Last thing: can I get it out? If I can get the transfers out, I can do the distinct count myself.

```
(probe) --click "Table options"  -> 18.png (menu: Time slider, Export table as CSV...)
timeout 120 node app-b/study.mjs --try $PWD/$D/19.png task:t02-transactions --click "Table" --click "Edges" --click "Table options" --click "Export table as CSV..."
```

**18.** The table's "..." has "Export table as CSV...". Good. (Also, opening that menu, my sort
on Links in seemed to be gone -- the header no longer had the arrow.)
**19.** The export dialog. "Saved to this computer only; nothing is uploaded." Good, I would show
that line to IT. But: I was on the Edges table and the dialog has "Table: Nodes" selected. And
the header says "Full graph, 77 nodes, 254 edges". I have 3,000 accounts and 9,113 transfers.
The preview reads "0,Myriel ... 1,Napoleon ... 2,Mlle.Baptistine". Who is Napoleon? That is not
my data. If an export shows me someone else's rows, I cannot put anything from this tool in a
case file. I stop here.

## Outcome

I did not get my list. I found a "Links in" column and sorted it, but the table left me on
rows 381 to 420 and I could not get to the top, so I never saw the ten accounts. And even if I
had, "Links in" counts transfers, not different sending accounts; nothing I found counts
distinct senders. My workaround would be the one I always use: export the transfers, pivot on
to_account with a distinct count of from_account, sort, take ten. And the export preview showed
the wrong data.

- Succeeded? No.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? No, not on this showing. Excel answers this
  question in ten minutes and I can show the reviewer exactly how. Here I could not see the top of
  my own sort, the count is the wrong count, and the export showed someone else's data. The "local
  only" and "nothing is sent" lines are the right instincts, and the Links in / out columns
  being already in the table is the right idea. Give me "number of different senders" as a column,
  put me at row 1 after a sort, and make the export match the screen, and I would look again.

## Problems seen

1. After sorting the account table, the view stayed on "Rows 381 to 420"; Home, the row counter
   and the arrows did not get me to row 1. I never saw the top ten. (02-04, 09, 12)
2. Nothing counts distinct counterparties. "Links in (count)" counts edges, and edges here are
   individual transfers, so the task's question ("from how many other accounts") has no direct
   answer. (05, 07, 15)
3. Export dialog opened on Nodes while I was on Edges, and its summary and preview showed a
   different graph (77 nodes, 254 edges, Myriel, Napoleon). Trust-breaking for anything going in a
   case file. (19)
4. The left arrow's tooltip says "Shows the next rows". (12)
5. "Column menu" opened the id column's menu, not the sorted column's. (11)
6. "4 more readings not computed" opens a general graph menu with "Clear graph data" in it. (16)
7. Opening the table's "..." menu appeared to drop the sort. (18)
8. Wording: nodes, edges, degree everywhere; I translate it every time. "Links in" was the only
   label I could map to my work.

## What worked

- "Local only" in the top bar, "Assistant: Off. Nothing is sent", and "Saved to this computer
  only; nothing is uploaded" in the export -- exactly what my IT people ask.
- The account table already carries Links in / Links out / Links total -- no import wizard.
- The transfers table shows from, to, timestamp and amount, with a running sum. That I trust.
