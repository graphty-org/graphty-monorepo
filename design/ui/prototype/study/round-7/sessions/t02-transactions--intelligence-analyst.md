# Session: top ten receiving accounts -- Marcus, criminal intelligence analyst

Task given by the moderator: "Which ten accounts receive transfers from the greatest number of
other accounts this month? Get graphty to work it out so you can hand the list on."

Start screen: shots/tasks/t02-transactions/01.png. All commands run from
design/ui/prototype; renders in tmp/round-7-sessions/t02-transactions--intelligence-analyst/.

## Think-aloud

**Start screen.** "Transfers, March 2026." A gray blob of hexagons -- 3,000 accounts, 9,113
transfers, directed. Fine, that's a money dump. I don't care about the blob. What I want is a
pivot: count of senders per receiving account, sort descending, top ten. Left side says
"Analyze (Shift+A) to add results here." That's the only thing that sounds like doing work, so.

    timeout 120 node app-b/study.mjs --try tmp/.../01.png task:t02-transactions --click "Analyze"

**01.** A list. "Links in (count) -- How many edges come into each node." That's my column, give
or take. Question I always ask: is that counting transfers or counting accounts? If one guy wires
the same account ten times, Excel pivot with Count gives me ten; I want one. "Edges" here --
is an edge a transfer or a pair? Doesn't say. I'll pick it and see what it offers.

    ... --click "Analyze" --click "Links in (count)"                        -> 02.png
    ... --click "Analyze" --click "Links in (count)" --click "Measure"       -> 03.png (nothing)
    ... --click "Analyze" --click "Links in (count)" --click "Links in (count)" -> 04.png

**02-04.** A little form, one dropdown: Links (count), Links in (count), Links out (count). No
"distinct" or "unique senders" option. "Under a second." OK, Run.

    ... --click "Analyze" --click "Links in (count)" --click "Run"          -> 05.png

**05.** A black tag pops up: "Would add Links in (count) at the top of the list, running."
"Would"? Did it run or not? Nothing on the chart changed. Nothing in the left panel changed
either, and that's where it told me results go. First grumble.

    ... --click "Run" --click "Table"                     -> 06.png ("nothing on screen is called Table")
    ... --click "Run" --key Escape --click "Table"        -> 07.png (Escape just went back to the list)
    ... --click "Run" --key Escape --key Escape --click "Table"  -> 08.png

**06-08.** Had to hit Escape twice to get that box off the Table button. Table opens at the
bottom. There's already a "Links in (count, full graph)" column -- was that there before I hit
Run, or did Run put it there? Can't tell. It's sorted by "Links total" for some reason and it
says "Rows 381 to 420 of 3,000". Why am I on row 381? Sort by my column.

    ... --click "Table" --click "Links in (count, full graph)"              -> 09.png

**09.** Arrow says descending. Top row shows 4. Still "Rows 381 to 420". So I'm looking at the
middle of the list. I need rows 1 to 10. Back arrow.

    ... --hover "Previous page"  -> 10.png (nothing called that)
    ... --hover "Previous rows"  -> 11.png (tooltip "Previous rows")
    ... --click "Previous rows"  -> 12.png

**12.** Clicked it. Still "Rows 381 to 420", and some note popped up about the next rows and
"the skeleton holds one page". I don't know what a skeleton is. The pager doesn't page. Second
problem. Is there a way to just... get the top ten? Column menu, maybe.

    ... --click "Column menu"    -> 13.png ("The id column menu" -- wrong column, nothing opened)
    ... --click "The Links in (count, full graph) column menu" -> 14.png (nothing called that)

**13-14.** The little caret on my column doesn't give me anything I can find. No "top 10",
no filter.

Back to the thing nagging me: transfers versus accounts.

    ... --click "Table" --click "Edges"                                     -> 15.png

**15.** Edges table: from_account, to_account, timestamp, amount. One row per transfer. So "Links
in" counts transfers. If somebody pays the same account twice that's two. Does the tool have a
count of distinct senders anywhere?

    ... --click "Analyze" --click "Neighbors in" / "Senders" / "distinct" / "Unique"  -> 16.png
    ... --click "Analyze" --hover "Total amount in" --key PageDown --key PageDown -> 17.png
    ... --click "Analyze" --hover "Total amount in" --key PageDown              -> 18.png

**16-18.** Scrolled the whole list. Totals of amount, betweenness, closeness, eigenvector, Katz,
HITS, core number, a pile of group-finders, paths, flow, cuts. Nothing called senders, unique,
distinct. The thing I'd do in Excel in two minutes is not on the menu by name.

Last idea: "from 2 tables" link on the right, maybe that's how it built the edges.

    ... --click "from 2 tables"                                             -> 19.png

**19.** This is actually good. "Each row is an edge, account to account. One edge per Row | Pair."
And underneath in plain words: "No two transfers share both ends, so One edge per Pair would
change nothing." That answers my question -- in this sample, transfers in equals distinct senders
in, so "Links in" is the right number. I'd have liked that sentence next to the Links in measure,
not buried in the import screen, but it's there and I can say it in a briefing. Good.

So I know which column. Now I just need the top of it.

    ... --click "Table" --click "Links in (count, full graph)" --click "Links in (count, full graph)" -> 20.png

**20.** Flipped to ascending: zeros. Still "Rows 381 to 420". Whichever way I sort, I land on the
same slice in the middle and the back arrow doesn't move. I've never seen the top row of this
table. I can't hand anyone a top-ten list I can't see. That's three strikes. I'm done.

## Outcome

- Did I succeed? No. I found the right measure (Links in), and the import screen convinced me it
  counts distinct sending accounts for this data, but I never got the ten accounts on screen. The
  table always showed rows 381-420 and paging back did nothing, so I have no list to hand on.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? Not for this. This is a pivot table question;
  Excel does it in two minutes and gives me a list I can paste. Things I liked: it says "Local
  only" up top, and the import screen told me in one plain sentence that no two transfers share
  both ends -- that's the kind of line I can repeat to a sergeant. Things that lost me: "Run"
  that says "would add" and doesn't visibly do anything; a results column that may have already
  been there; a table that opens on row 381; a back arrow that doesn't go back; no "top N" or
  "count distinct" anywhere I could find.

## Problems seen

1. Run on the measure shows "Would add Links in (count) at the top of the list, running" and
   nothing visible changes; the left panel ("add results here") stays empty. (05.png)
2. The Analyze dialog has to be dismissed twice with Escape before Table can be reached. (06-08)
3. The node table opens sorted by an unrequested column and on rows 381-420, not row 1. (08)
4. Sorting does not return to row 1, and "Previous rows" does not page; a note about "the
   skeleton" appears instead. The top of the ranking is never reachable. (09, 12, 20)
5. The incoming-links column is already in the table before Run; unclear whether running did
   anything. (08)
6. Whether "Links in" counts transfers or distinct accounts is only answered in the import
   screen's match report, not next to the measure. (02, 19)
7. No "top 10" or row-limit control on a column; the column menu caret did not open for the
   measure column by any name I tried. (13-14)
