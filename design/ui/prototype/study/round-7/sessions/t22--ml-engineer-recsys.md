# Session: size hosts by unfixed critical vulnerabilities -- Chris, ML engineer (recommendation systems)

Task as given by the moderator: "Among the 69 things recorded about each host, pick out the one
that tallies serious security holes left unfixed for more than a month, and make hosts with more
of them look bigger in the drawing."

All commands were run from `design/ui/prototype`. Every `--try` replays from the start screen.
Renders are in `tmp/round-7-sessions/t22--ml-engineer-recsys/`.

## Think-aloud

**01 (start screen, `shots/tasks/t22/01.png`).** OK, 300 nodes, 1,105 edges, directed, weight is
bytes_total_24h. Good, it tells me the denominator up front. There is a chip on the canvas saying
"Nothing is colored or sized by a row". "By a row"? I'd have said "by a column". Bottom right says
"Columns: 8 of 69" -- that is where the 69 fields live. Right panel has Style / Data tabs. I want
"size by column", so Style first.

**02 -- `--click "Style"`.** This is canvas stuff: background, print-safe colors, layout method,
seed. No node size anywhere. So this Style tab is for the graph as a whole, not the nodes. Fine.

**03 -- `--click "Nothing is colored or sized by a row"`.** The chip looks like a status pill, maybe
it opens the sizing control. Clicked it: nothing happened. It is just a label. Pity -- that was the
most obvious "start here" on screen.

**04 -- `--click "Columns: 8 of 69"`.** Column picker with a "Find attribute" box, plus the table
opened under the canvas. Good, this is the spreadsheet-style column chooser I know.

**05, 06 -- `--type "vuln"` (with and without clicking the box first).** Nothing typed. (Harness
did not take that; I switched to typing key by key.)

**07 -- `--key v --key u --key l --key n`.** "vuln" -> 7 matches. There it is:
`vuln_count_critical_unremediated_over_30_days`, numeric (#). Exactly the field the task describes.
Easy find, the search did its job.

**08 -- clicked that name.** It ticked the checkbox and the count went to 9 of 69. So this list
only decides which columns show in the table. Not sizing.

**09 -- `--key Escape`.** Closed the popup AND the table. Lost my view of the table, slightly
annoying.

**10 -- `--click "Close"` then the column name.** Table is collapsed after closing, so the header
isn't there. Reopen.

**11 -- `--click "Table"` then the header.** Clicking the header sorts descending; top hosts have
6. There's a small chevron next to the header -- column menu, probably "size by" in there.

**12 -- `--click "Column menu"`.** Opened a menu -- but for `id`, the first column, not mine. It does
have "Color by / Size by (Not a number) / Label by / Show as groups / Filter to...". So "Size by"
on a column header is a thing; I just can't get the menu for my column (the chevron on my header
had no name I could hit).

**13 -- hover on my column header.** Tooltip shows the full name; the chevron appears. Still no way
for me to open that particular chevron. (Tried three guessed names: none exist.) Giving up on
this route after ~30 seconds.

**15 -- `--click "Everything"` in the left list.** Right panel now shows "Everything, Built-in row,
Paints 300 nodes, 1,105 edges, Default look". Nodes/Edges toggle, Fill Color 6366F1, Shape Faceted
sphere, Size 1. That's the node style. OK.

**16 -- `--click "Size"`.** A little database icon appears next to the size field. That smells like
"bind to data". Icon-only, though.

**17, 18 -- guessing the icon's name with --hover.** Tried thirteen names ("Bind to data", "Size by",
"From data", ...). None. In real life I'd just have hovered it; I lost a minute here.

**19, 20 -- `--key Tab --key Enter` after hovering "Size".** Opened a popover titled "Color from
data", not size. Picked my vuln field anyway: it set up an Orange-to-brown palette, range 0 to 6.
Wrong property. Canvas didn't change either. I backed out.

**21 -- `--click "Size" --key Tab`.** Focus lands on the icon and the tooltip reads "Use a field or
result for Size". That's the one.

**23 -- `--click "Size" --click "Use a field or result for Size"`.** "Size from data" popover, Source
"Pick a field", list only shows numeric (#) fields. Nice -- it filtered out the strings.

**24 -- typed "vuln", picked `vuln_count_critical_unremediated_over_30_days`.** Popover shows Scale
Linear, Sizes 0.5 to 3 px, Values from Fit to data, Range 0 to 6, Clamp on, Below 0 "Sized by
absolute value", Smallest mark 2 px / print 1 pt. The canvas did NOT change while this was open,
and the chip still said "Nothing is colored or sized by a row". I wasn't sure it took.

**25 -- `--click "Close"`.** Now it applied: hosts with more unfixed criticals are visibly bigger, a
legend appeared top left ("Size: vuln_count_...er_30_days, 0 / 2 / 4 / 6, Linear scale (radius), 0
to 6") and Size reads "# 0.5 to 3". Panel says "Your change is in the Everything lay..." (cut off).
That's the task done.

## Commands run

```
timeout 120 node app-b/study.mjs --try .../02.png task:t22 --click "Style"
timeout 120 node app-b/study.mjs --try .../03.png task:t22 --click "Nothing is colored or sized by a row"
timeout 120 node app-b/study.mjs --try .../04.png task:t22 --click "Columns: 8 of 69"
timeout 120 node app-b/study.mjs --try .../05.png task:t22 --click "Columns: 8 of 69" --type "vuln"
timeout 120 node app-b/study.mjs --try .../06.png task:t22 --click "Columns: 8 of 69" --click "Find attribute" --type "vuln"
timeout 120 node app-b/study.mjs --try .../07.png task:t22 --click "Columns: 8 of 69" --click "Find attribute" --key v --key u --key l --key n
timeout 120 node app-b/study.mjs --try .../08.png task:t22 ...07 steps... --click "vuln_count_critical_unremediated_over_30_days"
timeout 120 node app-b/study.mjs --try .../09.png task:t22 ...08 steps... --key Escape
timeout 120 node app-b/study.mjs --try .../10.png task:t22 ...08 steps... --click "Close" --click "vuln_count_critical_unremediated_over_30_days"   (nothing on screen is called that)
timeout 120 node app-b/study.mjs --try .../11.png task:t22 ...08 steps... --click "Close" --click "Table" --click "vuln_count_critical_unremediated_over_30_days"
timeout 120 node app-b/study.mjs --try .../12.png task:t22 ...11 steps... --click "Column menu"
timeout 120 node app-b/study.mjs --try .../13.png task:t22 ...08 steps... --click "Close" --click "Table" --hover "vuln_count_critical_unremediated_over_30_days"
(14.png) same, then --click with each of: "vuln_count_critical_unremediated_over_30_days menu", "Column menu for vuln_count_critical_unremediated_over_30_days", "vuln_count_critical_unremediated_over_30_days options"   (none exist)
timeout 120 node app-b/study.mjs --try .../15.png task:t22 --click "Everything"
timeout 120 node app-b/study.mjs --try .../16.png task:t22 --click "Everything" --click "Size"
timeout 120 node app-b/study.mjs --try .../17.png task:t22 --click "Everything" --click "Size" --hover "Size from a column"   (none)
(18.png) --click "Everything" --click "Size" --hover with each of: "Bind to data", "Use a column", "From data", "Data", "Bind to column", "Size by", "Map to column", "Link to a column", "Size from column", "Size from data", "Use data", "Drive from a column", "Column"   (only "Data" and "Column" matched, and they hit other controls)
timeout 120 node app-b/study.mjs --try .../19.png task:t22 --click "Everything" --click "Size" --hover "Size" --key Tab --key Enter
timeout 120 node app-b/study.mjs --try .../20.png task:t22 ...19 steps... --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days"
timeout 120 node app-b/study.mjs --try .../21.png task:t22 --click "Everything" --click "Size" --key Tab
timeout 120 node app-b/study.mjs --try .../22.png task:t22 --click "Everything" --click "Use a field or result for Size"   (not on screen until Size is focused)
timeout 120 node app-b/study.mjs --try .../23.png task:t22 --click "Everything" --click "Size" --click "Use a field or result for Size"
timeout 120 node app-b/study.mjs --try .../24.png task:t22 ...23 steps... --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days"
timeout 120 node app-b/study.mjs --try .../25.png task:t22 ...24 steps... --click "Close"
```

(`...` = `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t22--ml-engineer-recsys`)

## Wrap-up, in Chris's words

**Succeeded?** Yes. Nodes are sized by `vuln_count_critical_unremediated_over_30_days`, linear,
0 to 6, with a legend. The field search was quick; finding *where* sizing lives was not.

**Single Ease Question:** 4 / 7. Finding the column: 7. Getting sizing onto it: a hunt.

**Would I use this instead of my notebook?** For this exact thing -- map a column to node size with
a legend and real ranges, in under a minute once you know the spot -- yes, that beats fiddling
with matplotlib `s=` and a hand-made legend. But I only found the spot by luck (tabbing into an
invisible icon). Next time I'd know, so it's a "learn once" cost, which I can live with.

## Problems I hit

1. The canvas chip "Nothing is colored or sized by a row" looks like the entry point but does
   nothing when clicked. And "by a row" reads wrong to me -- I size by a column.
2. The right panel's Style tab at the start (graph selected) has no node size at all; node size
   lives under a left-panel item called "Everything", described as a "Built-in row". Nothing tells
   you to go there.
3. The size data-binding control is an unlabeled icon that only appears after you click or focus
   the Size field. I couldn't find it by looking.
4. The column header menu has "Size by", which is what I wanted, but the menu I opened was for the
   first column (id), not the one I'd just added; I couldn't open it on my own column.
5. Tabbing from the Size field once opened "Color from data" -- I set a color palette by accident
   while trying to size. (Second attempt, the Tab landed correctly; I don't know why the first
   one differed.)
6. While the "Size from data" popover is open, the drawing doesn't update and the chip still says
   nothing is sized. It only applied when I closed it. I thought it hadn't worked.
7. Units muddle: the Size field said "1" with no unit, the popover says "0.5 to 3 px", the legend
   says "Linear scale (radius)". Is 3 px a radius or a diameter? Which number is the real one?
8. Escape on the column picker also collapsed the table underneath.
9. Minor: the Fill color reads 6366F1 (a purple) but nodes draw gray.
10. "Your change is in the Everything lay..." is cut off -- I can't read where my change went.

## What I liked

- "Find attribute" over 69 columns, with type icons (#, Abc, date) and fill rates (84%, 62%).
- The size picker lists numeric fields only.
- The popover is honest: range 0 to 6 from the data, clamp, linear, what happens below 0.
- A legend appeared on its own with the field name, values and scale. No guessing.
- Summary numbers up front (300 nodes, 1,105 edges, 7 isolated, weight column named).
