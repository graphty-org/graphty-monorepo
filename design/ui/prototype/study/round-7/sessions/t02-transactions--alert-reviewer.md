# Session: top ten receiving accounts -- Nadia, level-1 alert reviewer

Task as given: "Which ten accounts receive transfers from the greatest number of other accounts
this month? Get graphty to work it out so you can hand the list on."

Start screen: shots/tasks/t02-transactions/01.png. Renders are in
tmp/round-7-sessions/t02-transactions--alert-reviewer/ (01.png to 13.png). Every command was run
from design/ui/prototype; D stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t02-transactions--alert-reviewer.

## Think-aloud

**Start screen.** "OK, a gray blob of hexagons. Transfers, March 2026, that's my month. Right
side says 3,000 nodes, 9,113 edges, highest total degree 907. So somebody has 907 of
something, but it doesn't say who. I don't want a picture, I want a list. There's a 'Table'
button at the bottom. That's the closest thing to my spreadsheet. Going there."

**01 -- `--click "Table"`.** "Good, a table. Columns: id, 'Links in (count, full graph)', 'Links
out', 'Links total', kind, country. 'Links in' -- I'm guessing that means transfers coming in.
But the question was how many *other accounts* send to it, not how many transfers. If one
account pays another ten times, is that ten links or one? Nothing tells me. I'll take 'links in'
as close enough and say so in the note. It's sorted by Links total, and the top row is 15 --
but the summary said 907. That's odd. Oh, it says 'Rows 381 to 420 of 3,000'. Why am I on row
381? I didn't scroll."

**02 -- `--click "Table" --click "Links in (count, full graph)"`.** "Sorted by links in, arrow
pointing down, so biggest first. Top row is 4. Four? And still 'Rows 381 to 420'. So the real
top is somewhere above me and I can't see it."

**03 -- `... --click "Previous"`.** "Clicking the back arrow. Tooltip: 'Shows the next rows (the
skeleton holds one page)'. I don't know what a skeleton is. The rows didn't move. I can't get to
row 1."

**04 -- `--click "Analyze"`.** "Try the blue 'Analyze' link instead. A list pops up: Louvain,
PageRank, Shortest path, then 'Links (count)', 'Links in (count): How many edges come into each
node', 'Links out', 'Total amount'... Again 'edges', not 'accounts'. Same worry. I'll pick Links
in. Total amount in is tempting but the question is count, not money."

**05 -- `... --click "Links in (count)"`.** "A small box: Measure 'Links in (count)', 'Under a
second', Run. Fine."

**06 -- `... --click "Measure"`.** "Checking if the dropdown has something like 'distinct
senders'. Nothing opened."

**07 -- `... --click "Run"`.** "Run. A black tooltip: 'Would add Links in (count) at the top of
the list, running'. Would? Did it or didn't it? Nothing changed on the screen. No list, no
result."

**08 -- `--click "Table" --click "Links in (count, full graph)" --click "Rows 381 to 420 of
3,000"`.** "Maybe clicking the row counter takes me to the top. No."

**09 -- `--click "Data"`.** "Left rail, 'Data'. Like a spreadsheet tab, I hoped. Instead: top bar
now says '812 of 3,000 nodes' and there's a filter 'amount is at least 1,000', ticked. Did I just
do that? I only clicked Data. If that filter was on when I ran anything, my top ten is wrong and
QA would catch it. I don't trust this. Also nodes went to 812 but edges still say 9,113, so
what got filtered?"

**10 -- `--click "Data" --click "Graph" --click "Table"`.** "Back to Graph. Now the picture is
colored, there's a 'Louvain 35 groups' and a 'Links in (count)' in the left list that weren't
there before, and the top bar says 'Full graph' again. So the filter is gone? Or not? The table
is back at rows 381 to 420, sorted by links total, top value 15."

**11 -- `--click "Data" --click "Graph" --click "Links in (count)"`.** "There's my Links in
(count) in the list. Click it. Tooltip 'Opens Links in (count) in the inspector', but the right
panel still shows Louvain communities. And the top bar is back to '812 of 3,000 nodes'. Every
time I look the filter state is different. I can't tell what I'm looking at."

**12 -- `--click "Assistant"`.** "Last idea, just ask it. 'Off. Nothing is sent. Turn on in
Settings.' I'm not turning on an AI thing on a bank laptop without asking IT. No."

**13 -- `--click "Table" --click "Links in (count, full graph)" --click "Links in (count, full
graph)"`.** "Clicking the column twice to see if it resets to the top. Now it's ascending, all
zeros. Still row 381. That's it. I've spent longer than an alert on this."

**Gave up.**

## Commands run

```
timeout 120 node app-b/study.mjs --try $D/01.png task:t02-transactions --click "Table"
timeout 120 node app-b/study.mjs --try $D/02.png task:t02-transactions --click "Table" --click "Links in (count, full graph)"
timeout 120 node app-b/study.mjs --try $D/03.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Previous"
timeout 120 node app-b/study.mjs --try $D/04.png task:t02-transactions --click "Analyze"
timeout 120 node app-b/study.mjs --try $D/05.png task:t02-transactions --click "Analyze" --click "Links in (count)"
timeout 120 node app-b/study.mjs --try $D/06.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Measure"
timeout 120 node app-b/study.mjs --try $D/07.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run"
timeout 120 node app-b/study.mjs --try $D/08.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Rows 381 to 420 of 3,000"
timeout 120 node app-b/study.mjs --try $D/09.png task:t02-transactions --click "Data"
timeout 120 node app-b/study.mjs --try $D/10.png task:t02-transactions --click "Data" --click "Graph" --click "Table"
timeout 120 node app-b/study.mjs --try $D/11.png task:t02-transactions --click "Data" --click "Graph" --click "Links in (count)"
timeout 120 node app-b/study.mjs --try $D/12.png task:t02-transactions --click "Assistant"
timeout 120 node app-b/study.mjs --try $D/13.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Links in (count, full graph)"
```

## Debrief

**Did I succeed?** No. I found the right column within a minute -- 'Links in' in the table --
but I never saw the top ten rows. The table opens on rows 381 to 420 and nothing I clicked got me
to row 1. Run in Analyze said it "would" add a result and nothing appeared. I have no list to
hand on.

**Single Ease Question:** 2 of 7. Finding the column was easy. Getting the answer out was not
possible for me.

**Would I use this instead of my current tool?** No. In the spreadsheet I'd paste the transfers,
pivot on receiver, count distinct senders, sort, copy ten rows. Five minutes, and I know
exactly what I counted. Here:
- 'Links in' says "edges", and I can't tell whether one sender paying twice counts once or twice.
  The question was about *accounts*. QA would ask, and I couldn't answer.
- A filter ('amount is at least 1,000') appeared after I clicked Data, and the top bar flipped
  between '812 of 3,000 nodes' and 'Full graph' between screens. If I can't tell whether my
  numbers are filtered, I can't put them in a file.
- Results (Louvain colors, a Links in entry) showed up that I don't remember making.
- There was no obvious "copy these ten rows" or export, and nowhere I'd get one picture plus a
  few lines for the alert file.
Maybe for Sarah on a level-2 case. Not for my queue.
