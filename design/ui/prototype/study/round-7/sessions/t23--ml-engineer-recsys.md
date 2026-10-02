# Session: two wide CSVs into one host graph -- Chris, ML engineer (recsys)

Task as given: bring in two spreadsheets (hosts with 69 columns, connections with 26) so each
connection is drawn between its two hosts, with busier connections tying hosts more tightly;
before loading, find which host column tells how many serious security holes it has.

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t23--ml-engineer-recsys/.

## Start screen (shots/tasks/t23/01.png)

"Start" has "Open project or file..." and "New from data...". The task is new data, so I'll click
"New from data...". It also says "Files are read on this computer and never uploaded" -- good,
that's the first thing privacy review would ask.

## 01 -- New from data

    timeout 120 node app-b/study.mjs --try .../01.png task:t23 --click "New from data..."

A file chooser: Downloads > it-estate, with hosts-2026-03.csv, connections-2026-03.csv and a PNG
(grayed out, so it only takes data files). Checkboxes, so I can take both at once. Nice.

## 02 -- Pick both CSVs, Open

    timeout 120 node app-b/study.mjs --try .../02.png task:t23 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

A preview, not a load. Top line: `host (300) --connections (1,105)--> host (300)`. That's
exactly the schema line I want before committing. The hosts table: "Each row is a node", id is
the Key, hostname is the Name, "300 rows; every key is unique". 69 columns -- I'm not scrolling
across 69. There's a "Find a column" box.

## 03 -- Find a column

    ... --click "Find a column"

Dropdown with a Find field, then "With a role" (id, hostname) and "Other columns". I'm typing.

## 04 -- Type "vuln"

    ... --click "Find a column" --key v --key u --key l --key n

"7 matches": vuln_count_critical, vuln_count_high, vuln_count_medium, vuln_count_low,
vuln_count_critical...iated_over_30_days (truncated in the middle), vuln_scan_last_completed_timestamp_utc,
vuln_scan_policy. "Serious" means critical to me, so vuln_count_critical. The truncated one is a
competing reading ("serious" could mean "critical AND left open over 30 days"), and the middle
of the name is cut off -- I had to guess "unremediated".

## 05 -- Enter jumps to the column

    ... --key Enter

Table scrolls to vuln_count_critical, outlined, typed "#" (numeric). Answer to the first part:
**vuln_count_critical**. Every one of the 8 preview rows is 0, so the preview does not help me
sanity-check it -- I'd want min / max / count of nonzero in the header. There's also a
"patch_pendi...ical_count" column next to it that could be confused with it.

## 06 -- The connections table

    ... --click "connections"

"Each row is an edge", host to host. source is "From -> host", target is "To -> host",
bytes_total_24h is already the Weight with "Higher means: Stronger" selected (vs Farther,
Capacity). That's the "busier ties tighter" part, already done for me. Match report: "1,105 rows;
every row has both ends", "every row has a bytes_total_24h value", "1,105 rows became 1,105
edges".

Two doubts: it picked bytes, but flow_count_24h is an equally good meaning of "busier", and it
never asked. And "has both ends" -- does that mean both ends were found in hosts, or just not
blank? I'd want "every source and target matched a host".

## 07 -- Load

    ... --click "connections" --click "Load"

Graph shows. Summary panel: Nodes 300, Edges 1,105, Directed, Weight "bytes_total_24h, stronger",
7 isolated nodes, average total degree 7.37, highest 25. The counts match the files, so nothing
was dropped. The layout clusters into site-sized blobs, so the weight is doing something.
"Nothing is colored or sized by a row" -- honest. Done.

## Verdict

- Succeeded? Yes. The column is vuln_count_critical, and the graph loaded host-to-host with
  bytes_total_24h as a "stronger" weight.
- Single Ease Question: 6 of 7. Seven clicks plus typing. Nothing to figure out, and it guessed
  the edge ends and the weight before I asked. Not a 7 because the column header has no stats
  (all zeros in the preview), one name is truncated in the middle, and the weight column was
  chosen without telling me why bytes over flow count.
- Would I use it instead of my current tool? For a first look at two CSVs, yes -- this beats
  writing the pandas merge plus a networkx build just to see the shape, and the schema line plus
  the match report gives me the denominators I always check. For real work I'd still need it to
  read Parquet at tens of millions of rows; nothing here tells me that.
