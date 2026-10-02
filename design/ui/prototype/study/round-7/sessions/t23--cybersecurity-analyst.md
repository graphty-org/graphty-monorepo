# Session: bring in two wide CSV exports (hosts, connections) -- Priya, threat hunter

Task as given by the moderator: "The configuration database exported two spreadsheets: one line
per host, with 69 things recorded about each, and one line per network connection, with 26 things
recorded about each. They are in your Downloads folder and graphty has never seen them. Bring them
in so each connection is drawn between the two hosts it runs between, with busier connections
tying hosts more tightly. Before you bring them in, find which of the 69 things recorded about each
host tells how many serious security holes it has."

Renders are in design/ui/prototype/tmp/round-7-sessions/t23--cybersecurity-analyst/.

## Step 0 -- the start screen (shots/tasks/t23/01.png)

Think-aloud: "Before I load anything: is this approved, where does it run, does it phone home?
Top right says 'Local only', and under Start: 'Files are read on this computer and never
uploaded.' Good, that's the first thing I look for and it's right there. I can't verify it from
here, but at least it says it. Approved list -- this is a study, so I keep going.
Samples on the right, I skip those. 'Open project or file...' or 'New from data...'. These are two
raw CSVs, not a project, so 'New from data'."

## Step 1 -- New from data (01.png)

    timeout 120 node app-b/study.mjs --try .../t23--cybersecurity-analyst/01.png task:t23 --click "New from data..."

Saw: a "Choose files" dialog at Downloads > it-estate: hosts-2026-03.csv (214 KB),
connections-2026-03.csv (187 KB), estate-diagram.png grayed out. Open is disabled until I pick.

Think-aloud: "Checkboxes, so I can take both at once. The PNG is grayed out, fine, it's not data."

## Step 2 -- pick both files and open (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Saw: an import screen. Left: "Tables" with hosts 300 and connections 1,105, both with a check.
Top: "Makes host (300) --connections (1,105)--> host (300)". The hosts table preview shows id as
Key, hostname as Name, the rest as Attribute; "69 columns"; "Match report: hosts -- 300 rows;
every key is unique."

Think-aloud: "OK, it already figured out that one file is nodes and one is edges, and it tells me
in one line what it's going to build. 300 hosts, 1,105 connections. That 'Makes' line is the kind
of thing I'd actually check. Now -- before I load -- which of these 69 columns is critical vulns?
I'm not scrolling sideways through 69 columns. There's 'Go to column / Find a column'. Good."

Small gripe: the title bar already says "IT estate, March 2026" before I've loaded anything. I
didn't name it. Not a blocker; I assume it took it from the files.

## Step 3 -- open the column finder (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t23 ... --click "Open" --click "Find a column"

Saw: a dropdown list, "With a role" (id, hostname) then "Other columns" fqdn, ip_address, ...

## Step 4 -- first attempt to type "vuln" (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:t23 ... --click "Find a column" --type "vuln"

Saw: nothing changed, the Find box was still empty. (This was my driving tool not taking a
"--type" step, not the app; I retyped key by key.)

## Step 5 -- type "vuln" (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:t23 ... --click "Find a column" --key v --key u --key l --key n

Saw: "7 matches": vuln_count_critical, vuln_count_high, vuln_count_medium, vuln_count_low,
vuln_count_critical...iated_over_30_days (truncated), vuln_scan_last_completed_timestamp_utc,
vuln_scan_policy.

Think-aloud: "There it is. 'Serious security holes' -- that's criticals, vuln_count_critical. If my
lead meant critical plus high I'd add vuln_count_high, but the one column that IS 'serious' is
critical. The fifth one is cut off in the middle -- 'critical...iated_over_30_days' -- I'm guessing
'unremediated over 30 days'. That's actually the one I'd care about more for a hunt, and I can't
read its full name here. Annoying."

## Step 6 -- jump to it (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:t23 ... --key v --key u --key l --key n --key Enter

Saw: the table scrolled to vuln_count_critical, outlined, typed '#' (number), Attribute. First 8
rows all 0. Neighbors: vuln_count_high, medium, low.

Think-aloud: "Enter takes me there, keyboard works, good. Numeric, all zeros for these first eight
-- they're load balancers, plausible. Answer: vuln_count_critical. I'd still want min/max or a
count of non-zero before I trust it isn't an empty column, and I don't see that here."

## Step 7 -- check the connections table (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:t23 ... --click "Open" --click "connections"

Saw: "Each row is an edge, host to host". source = "From -> host", target = "To -> host",
bytes_total_24h = "Weight", "Higher means Stronger / Farther / Capacity" with Stronger selected.
Also flow_count_24h, bytes_in_p95 as Attributes. Match report: "1,105 rows; every row has both
ends. bytes_total_24h is each edge's weight; every row has a bytes_total_24h value. A row without
one would weigh 1 / 0. 1,105 rows became 1,105 edges."

Think-aloud: "It already wired source and target to the hosts, and it says every row has both ends
-- so nothing dropped. That's the line I'd look for. It guessed bytes_total_24h as the weight and
'higher means stronger', which is 'busier ties tighter'. Busier could also mean flow_count_24h --
number of sessions rather than volume. For this task bytes is fine; I'd want to know it chose bytes
over flows on purpose, and it doesn't say why. But it showed me its guess, so I can change it. I
leave it."

## Step 8 -- Load (08.png)

    timeout 120 node app-b/study.mjs --try .../08.png task:t23 ... --click "connections" --click "Load"

Saw: the graph view. Right panel Summary: Nodes 300, Edges 1,105, Directed, Weight
"bytes_total_24h, stronger", Isolated nodes 7, average total degree 7.37, highest 25. Graph shows
clusters with a few lone dots. A chip says "Nothing is colored or sized by a row".

Think-aloud: "300 and 1,105 -- matches the files, no rows lost. Weight says bytes, stronger. Done.
Seven isolated hosts -- that's a thing I'd look at later: a host in the CMDB with no connections
is either decommissioned or not being monitored. The picture itself I don't care about."

## Outcome

- Succeeded: yes. The serious-vulnerability column is vuln_count_critical; both files are loaded,
  connections drawn host to host, weighted by bytes_total_24h with higher meaning stronger.
- Single Ease Question: 6 of 7. The column finder made the 69-column part quick. Lost a point for
  the truncated column name in the finder and for not explaining why bytes was picked over flow
  count as "busier".
- Would I use it instead of my current tool? For this job -- getting two CMDB exports joined into a
  host graph -- maybe, yes; it was faster than writing the pandas merge in my notebook and it told
  me nothing was dropped. For hunting, not yet: I haven't seen a query box, a time range, or a way
  to get rows back out as CSV, and those decide it. The local-only statement up front is the
  reason I'd even try it at the bank.

## Problems noted

1. Column finder truncates long names in the middle ("vuln_count_critical...iated_over_30_days"),
   hiding the word that distinguishes it. Medium.
2. The weight guess (bytes_total_24h) is shown and changeable but its reason is not; "busier" is
   ambiguous between volume and flow count, and nothing hints flow_count_24h was considered. Low.
3. No quick profile of a column (min, max, non-zero count) before loading, so I can't confirm
   vuln_count_critical isn't empty when the first 8 rows are all zero. Low.
4. The project is already titled "IT estate, March 2026" during import, before I named it. Low.
