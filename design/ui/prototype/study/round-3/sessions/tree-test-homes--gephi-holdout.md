# Tree test: where things live -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional composite persona: associate professor, Gephi user
since 0.8, teaches it every year).
Screens shown, in order: start screen, bottom table dock, filter chip and its steps, styles list.
Laptop size, 1440 by 900.

Moderator's task, as given: "Where would you go to: update with new data, open the table, keep
only one date range, see each node's degree, see neighbors past the drawing limit?"

## Think-aloud

**Start screen.** "Open a graph. Samples, Open..., Connect to data source. Fine. 'Files stay on
this computer' -- good, that is the first thing I'd ask for my IRB data, so I'll take it. No File
menu, there's a hamburger in the corner. That's where I'd expect File to be."

**1. Update with new data.** "In Gephi I'd import the new edge list and choose 'append to existing
workspace', or honestly I'd open a new workspace and redo the Appearance panel by hand, which is
the thing I hate. Here... there is nothing on the start screen that says 'update' or 'replace'.
Recent projects are rows -- if I click 'March transfers' I get March, not April. Open... puts me
in a new project, I assume. So inside a project: the hamburger? The little arrow next to the
project name, 'Les Miserables' with a chevron -- maybe that's the project menu? Or the plus next
to Graphs, which would add a second graph beside the first, which is not the same thing as new
data in the same graph."

Clicks the hamburger in her head. "I can't see what's in it on any of these pictures. I'm
guessing. I'd say: hamburger, then something like Import or Replace. If that isn't there I'd drop
the file on the window and pray it asks me whether to replace or open new. And the question I
actually care about -- do my styles and my filter steps survive the new file -- nothing here
tells me." Verdict on this item: guessed, not found.

**2. Open the table.** Table dock screen. "Oh, it's right there. Nodes, Edges, under the map.
So this is my Data Lab, except it's under Overview instead of on a separate tab, which is better,
I never have to switch perspectives and wait for Java to hang. Sort by degree, a histogram in the
header, 'Export table as CSV...' on the right. That's the right place for it." On the filter-chip
screen the same tabs are there. "If someone collapsed it, the notes say there's a strip labeled
Table left behind. Good, as long as it's actually visible and not two pixels high." Found in
under ten seconds.

**3. Keep only one date range.** Filter chip screen. "The funnel with '27 of 77 nodes, 3 steps'
-- that's the filter stack. On the first screen it just said 'Full graph' with a funnel, and I
read that as a picker for which graph, not a filter. Now that it's open, it's clearly my Filters
panel: Filter to degree >= 2, took out 17, 60 left. I like the 'took out, left' counts; Gephi
makes me squint at the bottom bar for that."

Looks below the screen. "And here's a timestamp histogram, transfers per day, drag a window,
'Filter to Mar 8 to Mar 14'. That's what I want for a dynamic network. The step then says 'Filter
to timestamp between Mar 8, 2026 and Mar 14, 2026, Scope: full graph'. It says what it ran on.
Fine. But where does that histogram live in the real app? Is it in 'Add step', or in the column
menu in the table? I'd go Add step, pick timestamp, between. Or the column header menu, which
has 'Filter to...'. Two doors to the same room is fine as long as both are real." Found, with
one misread of the chip on the way.

**4. See each node's degree.** "In the table there's a 'degree (full graph)' column and on the
filtered screen two columns, 'degree' and 'degree on: full graph'. Valjean 17 filtered, 36
full. THAT is the thing Gephi gets wrong and never tells you -- degree follows the filter
silently. Here the header says which graph. I'll check 36 against NetworkX for Valjean when I get
the real thing, but it's the right number for the co-appearance graph as I remember it."

"But these samples already have degree because a style reads it. On my own GEXF, where do I
compute it? In Gephi it's Statistics, Average Degree, Run. Here, I suppose the flask icon,
'Results', in the rail. I'd have guessed 'Results' means outputs I already have, not 'run a
statistic'. I'd click it anyway because it's the only thing that looks like a lab." Found the
column; guessed where to compute it.

**5. See neighbors past the drawing limit.** Patent citations state. "124,318 nodes not drawn.
'Narrow the graph...' Fine, at least it says so instead of melting like the web tools I've
tried. And the table is full of rows, sorted by citations received. So I can read the graph as a
table. Good."

"But the task says neighbors. I pick patent 6117075 in the table -- then what? In Gephi I'd
right-click, 'select in Data Lab', or use the Ego Network filter with depth 1. I don't see an
inspector listing neighbors on this screen, the right side just shows graph statistics. Maybe
selecting a row puts neighbors in the inspector, maybe there's an 'Edges' tab filtered to that
node, maybe it's a filter step, 'neighbors of'. I'd try the Edges tab and search for the id.
That gives me edges, not a list of neighbors with their attributes. And the note under the
screen says the rows past the drawing limit depend on something not built yet, so the table may
only show headers. If I load my 60k retweet network and get headers only, that's a toy."
Verdict on this item: gave up, guessed the Edges tab.

**Styles list.** Glanced, not needed for the task. "Size by degree, Group color, Base style --
that's Appearance with a history. No ranking and partition words though; I'd have called 'Size
by degree' a ranking."

## After the task

**Single Ease Question: 4 of 7.** Two of five I found without thinking (table, degree), one with a
misread (the chip looked like a graph picker until it opened), and two I guessed at (new data,
neighbors on a graph too big to draw).

**Would I use it instead of Gephi?** "Not for a paper yet. The table under the map and the degree
column that says 'full graph' or 'filtered' are the two things I'd show my students tomorrow --
that filter-then-statistics trap costs me a lecture every year. But the thing I do every month,
re-running the map on next month's crawl, I couldn't even find the door for. And 'past the
drawing limit' is where my retweet networks live; if the neighbors of a node aren't one click
from its row, I'm back in Gephi with the Ego filter. Second session, yes. Switch, no."

## Problems observed

1. No visible home for "update with new data" on any screen shown. Start screen offers only new
   opens; the project menu and main menu contents are never shown. Participant guessed. Severity 3.
2. The filter chip at rest reads "Full graph" with a chevron and looked like a graph picker, not a
   filter, until opened. Severity 2.
3. Past the drawing limit, no visible route from a table row to that node's neighbors; the
   inspector shows only graph statistics. Participant gave up and guessed the Edges tab.
   Severity 3.
4. Rows past the drawing limit are noted as waiting on graphty-element, so the table may show
   headers only -- which would make the whole state useless at her data sizes. Severity 3.
5. Where to compute a statistic (degree) on her own data is unclear; "Results" reads as outputs,
   not as the place to run one. Severity 2.
