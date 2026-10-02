# Session: bring in two wide CSVs, find the critical-vulnerability column -- Analyst Alex

Participant: Analyst Alex (intermediate graph analyst, Gephi and NetworkX habits).
Task as given: "The configuration database exported two spreadsheets: one line per host, with 69
things recorded about each, and one line per network connection, with 26 things recorded about
each. They are in your Downloads folder and graphty has never seen them. Bring them in so each
connection is drawn between the two hosts it runs between, with busier connections tying hosts
more tightly. Before you bring them in, find which of the 69 things recorded about each host tells
how many serious security holes it has."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t23--analyst-alex/.

## Step 0 -- start screen (shots/tasks/t23/01.png)

Think-aloud: "OK, first thing -- where does my data go. Top right says 'Local only', and under
the Open button: 'Files are read on this computer and never uploaded.' Good, that's where I
wanted it, right next to the button. Not reading the samples. I have two CSVs, so... 'Open
project or file' or 'New from data'. I'm not opening a project, I'm making one from data. New
from data."

## Step 1 -- New from data

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/01.png task:t23 --click "New from data..."

Render 01: a file chooser, Downloads > it-estate, with hosts-2026-03.csv (214 KB),
connections-2026-03.csv (187 KB) and a grayed-out png. Checkboxes, so I can take both at once.

Think-aloud: "Checkboxes. Nice, it wants both at once -- Gephi makes me do nodes then edges as two
separate imports and I always get the order wrong. Tick both, Open."

## Step 2 -- pick both files, Open

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/02.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Render 02: an import screen. Left: Tables -- hosts 300, connections 1,105, both with a green
check. Strip at the top: "Makes host (300) --connections (1,105)--> host (300)". Hosts table
preview: id marked Key, hostname marked Name, "69 columns", "Showing the first 8 of 300 rows",
match report "300 rows; every key is unique." Cancel and Load at the bottom.

Think-aloud: "Oh, it already worked out that hosts are the nodes and connections go host to host.
300 and 1,105 -- I'd check those against the row counts in SQL, and those are the numbers I'd
expect from the exports. 'Every key is unique' -- good, that's my first sanity check done for me.
Now, before I load, which column is the critical vulns one. 69 columns, I'm not scrolling
sideways through that. There's a 'Find a column' box. Typing 'vuln'."

## Step 3 -- open the column finder (first attempt at typing did not register)

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/03.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "Find a column" --type "vuln"
    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/04.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "Find a column" --click "Find" --type "vuln"

Renders 03 and 04: a dark dropdown with a "Find" box, "With a role: id, hostname", then "Other
columns: fqdn, ip_address, mac_address, role, tier ...". My text did not appear in either run.
(This was the study tool not accepting a typed string, not the app; on a real keyboard I would
just have typed. Not counted against the app.)

Think-aloud: "The list is just the columns in order. Fine, but I want to type."

## Step 4 -- type "vuln" in the column finder

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/05.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "Find a column" --key v --key u --key l --key n

Render 05: "vuln", "7 matches": vuln_count_critical (highlighted), vuln_count_high,
vuln_count_medium, vuln_count_low, "vuln_count_critical...iated_over_30_days" (cut off in the
middle), vuln_scan_last_completed_timestamp_utc, vuln_scan_policy.

Think-aloud: "There we go. 'Serious security holes' -- that's critical. vuln_count_critical. There's
also one that's 'critical something over 30 days', cut off in the middle -- probably
'unremediated' -- that's criticals that have been open more than a month, which is a subset. If
my manager says 'serious' he means critical. Maybe high too, honestly, some people count
critical plus high. I'll go with critical. Enter to jump to it."

## Step 5 -- jump to the column

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/06.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "Find a column" --key v --key u --key l --key n --key Enter

Render 06: the table scrolled so vuln_count_critical is outlined, with a "#" (number) tag, set as
an Attribute. First 8 rows are all 0. Next to it vuln_count_high (2, 14, 7, 1 ...), medium, low,
and the 30-days one, still truncated in the header.

Think-aloud: "That's the one: vuln_count_critical, a number, coming in as an attribute. All zeros
in the first 8, which is fine, these are load balancers. I'd have liked to see the whole name of
that '...er_30_days' column without hovering -- truncating in the middle of the one word that
tells me what it is isn't great. Anyway. Now the connections side: is it drawing them host to
host, and is the busy part done?"

## Step 6 -- check the connections table

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/07.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Render 07: "Each row is: an edge, host to host", "One edge per: Row". source tagged "From -> host",
target tagged "To -> host", bytes_total_24h tagged "Weight", "Higher means: Stronger | Farther |
Capacity", with Stronger selected. Match report: "1,105 rows; every row has both ends.
bytes_total_24h is each edge's weight; every row has a bytes_total_24h value. A row without one
would weigh [1|0]. 1,105 rows became 1,105 edges."

Think-aloud: "It's all set already. Source and target point at hosts, every row has both ends, so
no orphan edges -- I'd normally find that out after loading in Gephi. Weight is bytes_total_24h,
higher means stronger. That's 'busier ties them tighter'. I did wonder for a second whether busier
should be flow_count_24h -- number of flows -- instead of bytes; one fat backup transfer isn't
'busy' in the same way. But bytes is a fair reading and it's what it picked, and 'Stronger' is
exactly the word I'd want. I'll take it. 'Farther' is a nice touch, that's the thing that bites
you with shortest paths. Load."

## Step 7 -- Load

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t23--analyst-alex/08.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Render 08: the graph, gray dots in clumps around a ring with lines across. Banner: "Nothing is
colored or sized by a row." Right panel "Hosts, Graph from 2 tables": Nodes 300, Edges 1,105,
Direction Directed, Weight "bytes_total_24h, stronger", Isolated nodes 7, Average total degree
7.37, Highest total degree 25. Bottom: "Columns: 8 of 69".

Think-aloud: "300 and 1,105, matches. Weight shows bytes_total_24h, stronger -- so it remembered.
Seven isolated hosts, which I'd want to look at but that's not today's question. The clumps are
probably sites. Done. I'd stop here."

## Verdict

Succeeded? Yes. The hosts are nodes, every connection is an edge between its two hosts, weighted by
bytes_total_24h with higher meaning stronger, and the serious-vulnerabilities column is
vuln_count_critical.

Single Ease Question: 6 of 7. What took longest: deciding whether "serious" meant critical only or
also the "critical ... over 30 days" column, whose name was cut off in the middle of the word that
mattered, both in the finder and in the column header. Second: a moment of doubt whether "busier"
should be bytes or flow count; the app chose bytes without saying why, though it was easy to see
and I agreed.

Would I use this instead of my current tool? For this part, yes. Getting two CSVs in is the part
of Gephi I hate -- two separate imports, the wrong table type, finding out afterward there were
edges pointing at nothing. Here it read both at once, worked out which was which, told me every
key was unique and every edge had both ends before I loaded, and the data-stays-local line was
right next to the button. The column finder on a 69-column table is something Gephi's data lab
does not really give me. I would still compute anything I need to defend in NetworkX until I've
checked the numbers match.

## Problems noticed

- Long column names are cut off in the middle ("vuln_count_critical...iated_over_30_days",
  "vuln_count_...er_30_days"), hiding the word that tells you what the column is (severity 2).
- The weight column was picked for me (bytes_total_24h over flow_count_24h) with no hint why; fine
  here, but I could not tell whether it guessed or read something (severity 1).
