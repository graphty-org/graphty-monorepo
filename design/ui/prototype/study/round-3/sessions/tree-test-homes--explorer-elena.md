# Where things live -- Explorer Elena

**Participant.** Elena, a product manager who explores relationship data now and then, from a
spreadsheet export, with no graph training (persona: `study/personas/explorer-elena.md`).

**Task, as the moderator gave it.** "Where would you go to: update with new data, open the table,
keep only one date range, see each node's degree, see neighbors past the drawing limit?"

**What she saw.** The start screen, the bottom table, the filter chip and its steps, and the styles
list, in the study view (design notes hidden):

- `shots/record/screens__start-screen--study.png`, `shots/record/start-screen--s2.png`
- `shots/record/screens__table-dock--study.png`, `shots/record/r3-elena-homes-table-stale.png`,
  `shots/record/r3-elena-homes-table-limit.png`
- `shots/record/screens__filter-chip--study.png`, `shots/record/r3-elena-homes-filter-full.png`
- `shots/screens__styles-list.png`

## Think-aloud

**Start screen.** "OK, 'Open a graph.' Four samples, Open..., Connect to data source. Nice that it
says my files stay on my computer, that's the first thing IT would ask me."

**1. Update with new data.** "So, 'update' -- I'm picturing I already built something last week and
now I have this week's export. Here there's nothing about updating. There's Open... and that's it.
If I'd been here before I guess my old project would show up at the top? I'd click that, then...
I don't know. Probably I'd drag the new CSV onto the window." (She reads what the drop does.) "It
opens it as a new project. So I'd lose the colors and whatever I set up last time? That's exactly
what happens with our dashboard exports and I hate it. I'd look in that little menu top-left, the
'graphty' one, or the three lines -- the tooltip on the other screen says there's a File menu. I'd
hope for 'Replace data' or 'Refresh' in there, but I can't see one. I'm guessing. Honestly I'd
probably just start over and redo it."
Result: not found. Guessed the app menu; no screen shows an update or replace-data command, and a
dropped file becomes a new project.

**2. Open the table.** (Table screen.) "Oh, it's just there, along the bottom -- Nodes, Edges, rows
with names. That's a spreadsheet, I get that. And the designers wrote that if you close it there's
a strip that says Table, fine. On the start screen there's obviously no table because there's no
data yet, that's fair." Result: found quickly.

**3. Keep only one date range.** "Date range... I'd look for a filter. Top-left there's a button
with a funnel, 'Full graph'. Funnel means filter, I know that from Sheets." (Filter screen.) "It
opens 'Filter steps' -- 'Filter to degree >= 2', 'took out 17, 60 left'. Hm, that's not dates.
'Add step' I guess." (She scrolls down.) "Oh, here, this little bar chart, 'transfers per day',
with a blue box dragged over the middle, and a button 'Filter to Mar 8 to Mar 14'. That's the one.
That's actually nice, it's like a date slicer in our dashboard. And then the button at the top says
'Filtered: 1,852 of 3,000 accounts, 1 step', so I know it worked. But where does that bar chart
live? Is it at the top of the date column in the table? I wouldn't have found it by clicking the
funnel -- from the funnel I'd have to pick 'timestamp' and 'between' and type dates in, which is
fine I guess, it's a form." Result: found, after one wrong look; the drag-a-range chart is the
route she likes but she could not say where it sits in the app.

**4. See each node's degree.** "The word 'degree' I only know because you just said it. In the
table there's a column called degree, sorted, Valjean 17. Good." (Filter screen table.) "Wait,
there's 'degree' 17 and then 'degree on: full graph' 36. Which one is his degree? Two numbers for
the same thing. I think one is after my filter? I'd have to ask somebody." (Styles list.) "Over
here there's 'Size by degree' -- so bigger dots mean more of it. I'd hover a dot and hope it tells
me." Result: found in the table; confused by two degree columns with different values.

**5. See neighbors past the drawing limit.** "I don't know what a drawing limit is." (Table screen,
the patent example.) "'124,318 nodes not drawn. Narrow the graph...' So it just... doesn't draw.
The picture is empty and the table has 124,000 rows. Neighbors of what? If I wanted what one row is
connected to, I'd... search? There's a magnifier on the table. Or click a row and look on the
right? The right side only shows statistics. I don't see 'connected to' anywhere. 'Narrow the
graph' -- I'd click that and hope it asks me which one I care about." Result: gave up. No visible
route from a row to its connections when nothing is drawn.

## After the task

**Single Ease Question: 3 of 7.** "Two of the five were easy -- the table, the degree column. The
date one I found by luck scrolling. The first and the last I just don't know."

**Would she use it instead of her current tool?** "For a look at the shape, maybe -- it's in the
browser and it says my data stays here, and that date slicer is the thing I'd actually use. But my
current tool for this is basically a spreadsheet and a Slides chart, and in both of those
'update with this week's data' is one step. If every week I have to rebuild it from scratch, I'd
use it once for a meeting and not come back."

## Findings

| Where | What happened | Severity (1-4) |
|---|---|---|
| Start screen, app menu | No visible command to bring new data into an existing project; a dropped file always opens a new project, so she expects to lose her setup and would rebuild. | 3 |
| Past the drawing limit | "Drawing limit" means nothing to her; from a row in the table there is no visible way to see what it connects to. Gave up. | 3 |
| Filter chip and steps | The funnel chip is findable, but its first view is rules ("degree >= 2"), not dates; the date-range chart that she liked is not reachable from anything she saw, so she could not say where it lives. | 2 |
| Table, degree columns | Two degree columns with different values ("degree" 17 and "degree on: full graph" 36) for the same person; she could not tell which one is "his degree". | 2 |
| Filter step wording | "took out 17 / 60 left" reads fine; "Filter to" and "Filter out" side by side made her slow down. | 1 |
