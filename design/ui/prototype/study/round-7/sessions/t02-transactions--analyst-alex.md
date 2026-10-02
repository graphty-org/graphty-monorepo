# Session: top ten accounts by number of distinct senders -- Analyst Alex

Task as given: "Which ten accounts receive transfers from the greatest number of other accounts
this month? Get graphty to work it out so you can hand the list on."

All commands were run from `design/ui/prototype`. D is
`tmp/round-7-sessions/t02-transactions--analyst-alex`.

## 01 -- start screen (shots/tasks/t02-transactions/01.png)

> OK, "Transfers, March 2026". March is "this month" as far as this file goes. A gray blob of
> hexagons -- the hairball, as usual. First thing I check is the counts: 3,000 nodes, 9,113 edges,
> directed. Good, it knows direction, which matters for "receive". "Local only" up top -- I take
> that to mean my data is not going anywhere. Good, that is the first thing I would have asked.
>
> What I want is in-degree. Actually, careful: "from the greatest number of other accounts" is not
> the same as "the most transfers". If one account pays another five times, that is five transfers
> but one sender. I need to know whether edges here are one per transfer or one per pair. Park
> that. There's an "Analyze" link on the left. That's the obvious door.

## 02 -- clicked Analyze

    timeout 120 node app-b/study.mjs --try $D/02.png task:t02-transactions --click "Analyze"

> A search box and a list. "Rank nodes and edges": PageRank (with a "Start here" tag -- no, I
> don't want PageRank, someone always suggests PageRank), "Links (count)", "Links in (count)",
> "Links out (count)", Total amount... "Links in (count) -- how many edges come into each node."
> That's in-degree, they just don't call it that. "Links" is a bit odd, I'd have typed "in-degree"
> or "degree" into that search box.

## 03 -- hovered Links in (count)

    timeout 120 node app-b/study.mjs --try $D/03.png task:t02-transactions --click "Analyze" --hover "Links in (count)"

> A tooltip says "Degree" -- it seems to sit on the row above, "Links (count)". OK, so they do know
> the word. Fine.

## 04 -- clicked Links in (count)

    timeout 120 node app-b/study.mjs --try $D/04.png task:t02-transactions --click "Analyze" --click "Links in (count)"

> A small form: "How many edges come into each node." A Measure dropdown, "Under a second", Run.
> Under a second, good -- I'm not nervous about this one. Still says EDGES though, not accounts.

## 05 -- Run

    timeout 120 node app-b/study.mjs --try $D/05.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run"

> A black message: "Would add Links in (count) at the top of the list, running". Would? Did it or
> didn't it? The graph is the same gray blob, "Nothing is colored or sized by a row" is still up
> there, and nothing appeared on the left. This is exactly the "I ran it and nothing changed, where
> did the result go" thing.

## 06, 07 -- the Measure dropdown

    timeout 120 node app-b/study.mjs --try $D/06.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Measure"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Links in (count)"

> Clicking the word "Measure" did nothing; clicking the value opened it. Three choices: links,
> links in, links out. No "distinct senders" or "unique neighbors". So whether this answers my
> question depends on whether there are repeat transfers between the same two accounts.

## 08 -- Run, then Table

    timeout 120 node app-b/study.mjs --try $D/08.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run" --click "Table"

> Tried to get to the table at the bottom after running. The tool said nothing on screen is called
> "Table" -- the dialog was still in the way. Same screen as 05.

## 09 -- checked how the edges were built (clicked "from 2 tables")

    timeout 120 node app-b/study.mjs --try $D/09.png task:t02-transactions --click "from 2 tables"

> This is the bit I actually liked. It shows the transfers file, from_account, to_account, amount,
> timestamp, all March 2026. And the match report says, in plain words: "No two transfers share
> both ends, so One edge per Pair would change nothing. 9,113 rows became 9,113 edges." So every
> edge is a distinct sender-receiver pair, and links-in really is "number of other accounts that
> sent to it". That settles my worry, and I could quote that line to my manager. I'd have checked
> this in pandas with a groupby; here it was just written down.

## 10 -- Run, then Escape

    timeout 120 node app-b/study.mjs --try $D/10.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run" --key Escape

> Escape just went back to the Analyze list, with the "Would add..." message still showing. Still
> no result I can see.

## 11 -- opened the Nodes table instead

    timeout 120 node app-b/study.mjs --try $D/11.png task:t02-transactions --click "Nodes"

> Oh. The node table already HAS a column "Links in (count, full graph)", plus links out and links
> total. So I didn't need to run anything; it was already there. Would have been nice if the
> Analyze thing had told me that. It's sorted by Links total, descending, but it says "Rows 381 to
> 420 of 3,000" -- why am I on row 381?

## 12 -- sorted by Links in

    timeout 120 node app-b/study.mjs --try $D/12.png task:t02-transactions --click "Nodes" --click "Links in (count, full graph)"

> Sorted descending by links in. Down arrow on the header. But I'm STILL on rows 381 to 420, values
> 4, 4, 3, 3, 2... Those are not the top ten. The summary says the highest total degree is 907, so
> the real hubs are hundreds of rows above where I am.

## 13, 14, 15 -- trying to get to the top of the table

    timeout 120 node app-b/study.mjs --try $D/13.png task:t02-transactions --click "Nodes" --click "Links in (count, full graph)" --click "Previous page"
    timeout 120 node app-b/study.mjs --try $D/14.png task:t02-transactions --click "Nodes" --click "Links in (count, full graph)" --hover "Previous"
    timeout 120 node app-b/study.mjs --try $D/15.png task:t02-transactions --click "Nodes" --click "Links in (count, full graph)" --click "Previous rows"

> Nothing called "Previous page". Hovered the little back arrow: "Previous rows". Clicked it: a
> message "Shows the next rows (the skeleton holds one page)", and I'm still on 381 to 420. So I
> can't page. I can see the column, I can sort it, and I can't see the top of it.
> (Probes for other tooltip names, "Previous rows", "Back", "More", "Table options", "Column
> options", went to a scratch file I deleted; none of them changed anything.)

## 16 -- tried "More" for an export or "top 10"

    timeout 120 node app-b/study.mjs --try $D/16.png task:t02-transactions --click "Nodes" --click "Links in (count, full graph)" --click "More"

> That opened the graph's menu on the right (select all, fit, re-run layout, clear graph data...),
> not the table's. No export there. And my sort got thrown away -- it's back to Links total.
> "Clear graph data" sitting in that menu makes me nervous.

## 17 -- Assistant

    timeout 120 node app-b/study.mjs --try $D/17.png task:t02-transactions --click "Assistant"

> "Off. Nothing is sent. Turn on in Settings." Good that it's off by default. I'm not turning on an
> AI to get a top ten of a column I can already see. Not going there.

## 18 -- clicked the sort header again

    timeout 120 node app-b/study.mjs --try $D/18.png task:t02-transactions --click "Nodes" --click "Links in (count, full graph)" --click "Links in (count, full graph)"

> Now ascending, zeros, and STILL rows 381 to 420. That's it, I'm stopping here.

## Wrap-up

**Did I succeed?** No. I know exactly which number answers the question (links in, and the import
report proves each link is a distinct sender, so it is "number of other accounts"), and I sorted
the table by it. But I never saw the top ten account ids, the analysis run never produced anything
I could see, and I found no way to export the list. I have nothing to hand on.

**Single Ease Question: 3 / 7.** Finding the right measure was easy and the data-import page was
genuinely good. What took longest was everything after that: "Would add ... running" with nothing
changing, and a sorted table parked on row 381 with a back button that doesn't go back.

**Would I use this instead of my current tool?** Not for this, not yet. In pandas this is
`df.groupby('to_account').from_account.nunique().nlargest(10)` and a `to_csv`, two minutes. What
would pull me over is that import report -- "no two transfers share both ends", "9,113 rows became
9,113 edges" -- that's the data check I normally do by hand, and "Local only" up front answered my
first question before I asked it. If the table opened at row 1 when I sort, and there was an
obvious "export these rows" next to it, I'd use it for exactly this kind of question.
