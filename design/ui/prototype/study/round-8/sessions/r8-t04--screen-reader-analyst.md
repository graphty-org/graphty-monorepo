# Session: load two spreadsheets as one network -- Morgan Reyes (screen-reader analyst)

Task as given: "You have never used this program before. Two spreadsheets from your team are in
your Downloads folder: one lists the machines on the office network, one lists which machine talks
to which. You want them in as one network and you want to know that every machine and every
connection arrived."

All commands were run from design/ui/prototype. S stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t04--screen-reader-analyst

## Start screen (shots/tasks/r8-t04/01.png)

Morgan: Page title, then headings. I get "Start", "Recent projects", "Samples". Fine, it named its
parts. Under Start: "Open project or file..." with Ctrl+O, and "New from data...". Then a line
"Files are read on this computer and never uploaded." Good -- that is my first question answered
before I asked it, and there is a "Local only" up top too. I'll believe it more when IT reads the
network log, but it is the right thing to say first.

Two spreadsheets, and I want to build something from them, not open a project. "New from data"
sounds like the door. "Open project or file" might also work, but "file" is singular and I have
two. Going with New from data.

## Step 1 -- New from data

    timeout 120 node app-b/study.mjs --try $S/01.png task:r8-t04 --click "New from data..."

Morgan: A dialog, "Choose files". Downloads > it-estate. Three rows with checkboxes:
hosts-2026-03.csv (214 KB), connections-2026-03.csv (187 KB), and estate-diagram.png, which is
dimmed -- I assume that means it cannot be picked. I hope the screen reader says "unavailable"
rather than just reading it like the others; a dimmed row is a visual-only signal otherwise. Open is
disabled until I pick something. "Choose files", plural, checkboxes -- so I can take both at once.
Good, that's the platform file picker shape I know.

## Step 2 -- tick both files, Open

    timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Morgan: Now I'm on something called "Open as a new graph", Esc to leave. Good, it tells me how to
get out. There's a list "Tables": hosts 300, connections 1,105. And a line at the top, "Makes:
host (300) --connections (1,105)--> host (300)". That is exactly the sentence I wanted, and it is
plain text I can arrow through. Fast reading: 300 hosts, 1,105 connections, connections go host to
host.

The hosts table is open: "Each row is a node", type host, id column marked Key, hostname marked
Name, 69 columns. Then a grid with eight sample rows, "Showing the first 8 of 300 rows." I'd want
to know the grid has real column headers when I Ctrl+Alt+arrow through it; I can't tell that from
here. At the bottom: "Match report: hosts. 300 rows; every key is unique." Good -- that is the
check I'd otherwise do in pandas with a duplicated() call.

Also at the bottom: Direction -- "As the file says" (dimmed), "Directed" (looks selected),
"Undirected". It picked directed for me. I care about this. It is stated, at least, which is more
than most tools do. I'd want the screen reader to say "Directed, selected", not leave me to guess
from a highlight.

I haven't seen the connections side yet. I'm not pressing Load on a report I've only read half of.

## Step 3 -- open the connections table

    timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Morgan: Connections: each row is an edge, host to host, one edge per row. source is "From -> host",
target is "To -> host", bytes_total_24h was picked as the Weight, "Higher means: Stronger". 26
columns. I did not ask for a weight. It says so plainly, which I'll take, but I'll remember it
chose one for me.

Match report: connections.
- 1,105 rows; every row has both ends.
- 1,105 of 1,105 source found in hosts.
- 1,105 of 1,105 target found in hosts.
- bytes_total_24h is each edge's weight; every row has a value.
- 1,105 rows became 1,105 edges.

That is the answer to my task, before I even load. Every connection's two ends match a machine, no
row dropped. This is the report I'd write by hand with a merge and a value_counts. It's in text,
it's in the document (not a toast that vanishes), and the important word -- the count -- comes
first on each line. The one thing I'd change: the weight line is long and has a little "1 / 0"
control in the middle of a sentence, which will read oddly at my speed.

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Morgan: Now the main window. Title "IT estate, March 2026" -- it named my project itself; fine, I
can rename it. There is a drawing I can't see; I'll skip it for this task. On the right, a
"Summary" under "Hosts, Graph from 2 tables":
- Nodes: 300 nodes
- Edges: 1,105 connections
- Attributes: 69 node attributes, 26 edge attributes
- Direction: Directed
- Weight: bytes_total_24h, stronger
- Isolated nodes: 7
- Average total degree 7.37, Highest total degree 25
- "4 more readings not computed"

So: 300 machines in, 300 nodes; 1,105 rows in, 1,105 edges. Columns 69 and 26 match the two
tables. That's everything arrived. Overview first, in text, without running anything -- that is
what I ask for in minute two of every tool and almost never get.

Seven isolated nodes: seven machines in the hosts list that nothing connects to. That's not a load
failure -- the report said every connection found both its ends -- but it is the first thing my
manager will ask about. "7" looks like a link; I'd hope it takes me to which seven.

Things I noticed and don't like: there's a legend over the drawing, "Size: vuln_count..._over_30_days",
with the name cut off in the middle. It decided to size machines by vulnerability count without me
asking. That's a decision about my data that I'd want stated in the summary, not only in a
floating box over a picture. Also the toolbar along the bottom of the drawing is five icons; I
didn't hover them, but if they're unlabeled to the screen reader I'll be annoyed.

## Step 5 -- check where it came from

    timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "from 2 tables"

Morgan: "from 2 tables" takes me back to the same mapping screen, now titled "Edit:
hosts-2026-03.csv", with the same match reports and an "Apply" that is off because "Nothing has
changed yet". So the report I relied on is still there after loading -- I can come back in ten
minutes and read it again. That's the thing most tools get wrong. Good. I'm done.

## Verdict

Succeeded? Yes. 300 hosts became 300 nodes, 1,105 connection rows became 1,105 edges, and the
match report says every source and every target was found in the hosts table. I didn't have to
count anything myself.

Single Ease Question: 6 of 7. It was short and the numbers were where I needed them. Not a 7
because the tool made choices I didn't ask for -- directed, a weight column, sizing by
vulnerability count -- and two of them I only found by reading carefully; and because I'm judging
from what's on screen, and whether the dimmed file, the selected direction and the grid headers are
actually spoken is unproven.

Would I use this instead of my current tool? For this job -- getting two CSVs into a network and
proving nothing was lost -- yes, I'd try it before writing the pandas merge again, provided the
match report really reads that way with NVDA and the "files never leave this computer" claim
survives our security review. The match report is the thing NetworkX doesn't give me for free.
For the analysis afterwards, not yet: I haven't seen the drawing or the tables say anything, and
my scripts already work.

## Observations for the record (Morgan's words)

- "Files are read on this computer and never uploaded" on the start screen answered my first
  question before I asked it.
- The "Makes: host (300) --connections (1,105)--> host (300)" line is the summary I wanted, in one
  line.
- The match report before Load answered the task: every source and target found, rows equal edges.
- The same report is still there after loading, behind "from 2 tables".
- It picked directed, a weight column, and a size-by-vulnerability legend without asking. The
  first two are stated; the last only appears as a floating legend with its name cut off.
- Dimmed file row and selected-looking direction button: I can't tell if those are spoken or only
  shown.
- The weight sentence in the report has a control in the middle of it; long at my speed.
- "Isolated nodes 7" -- I want to know which seven, and whether that number leads there.
