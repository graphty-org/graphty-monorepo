# Session: size hosts by unremediated critical vulnerabilities -- Priya (threat hunter)

Task as given: "Among the 69 things recorded about each host, pick out the one that tallies
serious security holes left unfixed for more than a month, and make hosts with more of them look
bigger in the drawing."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t22--cybersecurity-analyst/. Each run replays from the start screen.

## Start screen (shots/tasks/t22/01.png)

"OK. Top bar says 'Local only'. Good, that's the first thing I'd ask -- I'd want to know what it
means exactly, but it's there. 300 nodes, 1,105 edges. A pill on the canvas says 'Nothing is
colored or sized by a row'. Bottom right: 'Columns: 8 of 69'. That's my 69. There's a Style tab on
the right. Sizing is style, so I'll try that first."

## Step 1 -- Style tab

    timeout 120 node app-b/study.mjs --try .../01.png task:t22 --click "Style"

"Background, print-safe colors, layout method, seed. That's settings for the whole canvas. Nothing
about node size. Not here."

## Step 2 -- the canvas pill

    timeout 120 node app-b/study.mjs --try .../02.png task:t22 --click "Nothing is colored or sized by a row"

"It tells me nothing is sized, so I figured clicking it would let me size something. Nothing
happened. It's a status label, not a button. Fine, but then why does it look like a chip?"

## Step 3 -- the column count

    timeout 120 node app-b/study.mjs --try .../03.png task:t22 --click "Columns: 8 of 69"

"There we go. Column list with a 'Find attribute' box, and the table opened underneath. Typing,
not scrolling 69 rows. Good."

## Step 4 -- type "vuln"

    timeout 120 node app-b/study.mjs --try .../04.png task:t22 --click "Columns: 8 of 69" --type "vuln"
    (nothing changed -- the box stayed empty)
    timeout 120 node app-b/study.mjs --try .../05.png task:t22 --click "Columns: 8 of 69" --key v --key u --key l --key n

"Seven matches. vuln_count_critical, _high, _medium, _low, and
vuln_count_critical_unremediated_over_30_days. That's the one -- critical, unremediated, over 30
days. Clear name, I don't have to guess. The scan-timestamp column shows 93%, which I read as 7% of
hosts with no scan date -- I'd want to know which ones, but not today."

## Step 5 -- click the attribute

    timeout 120 node app-b/study.mjs --try .../06.png task:t22 ... --click "vuln_count_critical_unremediated_over_30_days"

"Ticked the box. Columns now 9 of 69. So this list only shows or hides columns. It doesn't style
anything. That's fine, at least I can see the numbers now."

## Step 6 -- close the list and get back to the table

    timeout 120 node app-b/study.mjs --try .../07.png task:t22 ... --key Escape
    timeout 120 node app-b/study.mjs --try .../08.png task:t22 ... --click "Close"

"Escape closed the list AND the table. So did the X. Annoying -- I wanted the table to stay open.
Reopen it."

## Step 7 -- click the column header

    timeout 120 node app-b/study.mjs --try .../09.png task:t22 ... --click "Table" --click "vuln_count_critical_unremediated_over_30_days"

"Sorted descending. Top hosts have 6, 6, 6, 5, 4, 4. That's actually what I'd do in Splunk --
sort and work from the top. There's a little chevron next to the header. That's probably the menu."

## Step 8 -- trying to open that column's menu

    timeout 120 node app-b/study.mjs --try .../10.png task:t22 ... --click "Column menu"
    (a menu opened -- for the "id" column, not mine. It does show "Size by", greyed "Not a number")
    timeout 120 node app-b/study.mjs --try .../11.png task:t22 ... --click "vuln_count_critical_unremediated_over_30_days menu"
    -> nothing on screen is called "vuln_count_critical_unremediated_over_30_days menu"
    timeout 120 node app-b/study.mjs --try .../12.png task:t22 ... --hover "vuln_count_critical_unremediated_over_30_days"
    (tooltip shows the full column name, nothing else)
    timeout 120 node app-b/study.mjs --try .../13.png task:t22 ... --click "vuln_count_critical_unremediated_over_30_days column menu"
    -> nothing on screen is called that
    timeout 120 node app-b/study.mjs --try .../14.png task:t22 ... --click "Column menu: vuln_count_critical_unremediated_over_30_days"
    -> nothing on screen is called that
    timeout 120 node app-b/study.mjs --try .../15.png task:t22 --click "Table" --hover "Table options"
    (the "..." by the column count is "Table options")
    timeout 120 node app-b/study.mjs --try .../16.png task:t22 ... --click "vuln_count_critical_unremediated_over_30_days options"
    -> nothing on screen is called that
    timeout 120 node app-b/study.mjs --try .../17.png task:t22 ... --hover "Column menu"

"OK, so the menu exists, and 'Size by' is in it -- I saw it on the id column. I just couldn't get
the one on MY column. Every header has the same 'Column menu' chevron and nothing says which one is
which. I burned a couple of minutes on this. Then the tooltip on the chevron says 'Column menu
Alt+Down'. A keyboard shortcut. I'll take that."

## Step 9 -- keyboard

    timeout 120 node app-b/study.mjs --try .../18.png task:t22 ... --click "vuln_count_critical_unremediated_over_30_days" --key Alt+ArrowDown

"Menu titled vuln_count_critical_unremediated_over_30_days. Color by, Size by, Label by, Show as
groups, Filter to, Create set. Size by is right there."

## Step 10 -- Size by

    timeout 120 node app-b/study.mjs --try .../19.png task:t22 ... --click "Size by"

"Done. Legend top-left: 'Size: vuln_count_...er_30_days', 0, 2, 4, 6, 'Linear scale (radius), 0
to 6'. Right panel says 'Paints 300 hosts (every host with a value)', size 0.5 to 3. And it shows
up as its own entry in the left list. A dozen or so big dots, mostly in that dense cluster on the
right. I can read that.

Two complaints. One: a host with zero is now a speck. Most of the estate just vanished. I didn't
ask you to hide the clean hosts, and now I can't see the network context the edges are supposed to
give me. I'd want the minimum bigger. Two: which date is this count as of? The file says
hosts-2026-03.csv, so March, I guess. 'Over 30 days' as of when? I wouldn't put that in a report
without knowing the scan date. And the legend truncates the column name -- in a screenshot for my
lead, '...er_30_days' is not good enough."

## Verdict

- Succeeded: yes. Hosts are sized by vuln_count_critical_unremediated_over_30_days, and there is a
  legend.
- Single Ease Question: 4 of 7. Finding the attribute was easy (the column count and a type-to-find
  box). Getting from "I found the column" to "size by it" was not: the Style tab is canvas-only, the
  canvas status chip is not clickable, the column list only shows and hides columns, and the header
  chevrons are all named "Column menu" with nothing tying one to its column. I got there only
  through the Alt+Down shortcut in a tooltip.
- Would I use this instead of my current tool? "For this question, maybe. In my notebook this is a
  pandas sort plus a scatter that tells me nothing about the network. Here the sorted column and
  the sizing on the graph together are useful: I see that the worst hosts sit in one cluster. But I
  wouldn't hand it to my lead until the legend shows the full column name and the date the count is
  as of, and until the zero hosts stop disappearing."
