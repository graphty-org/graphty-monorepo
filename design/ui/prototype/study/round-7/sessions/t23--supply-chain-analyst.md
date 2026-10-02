# Session: bring in two wide spreadsheets -- supply chain risk analyst (Dana)

Task as given: "The configuration database exported two spreadsheets: one line per host, with 69
things recorded about each, and one line per network connection, with 26 things recorded about
each. They are in your Downloads folder and graphty has never seen them. Bring them in so each
connection is drawn between the two hosts it runs between, with busier connections tying hosts
more tightly. Before you bring them in, find which of the 69 things recorded about each host tells
how many serious security holes it has."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t23--supply-chain-analyst/.

## Step 1 -- start screen (shots/tasks/t23/01.png)

"OK. Start, recent projects, samples. Not my line of work, this is IT stuff, but it's a wide
spreadsheet, fine. I want 'import'. There's 'Open project or file...' and 'New from data...'. I
have two CSVs, not a project, so 'New from data'. Good that it says files never get uploaded --
that's the first thing IT asks."

## Step 2 -- New from data

    timeout 120 node app-b/study.mjs --try .../02.png task:t23 --click "New from data..."

"A file picker on Downloads > it-estate. hosts-2026-03.csv, connections-2026-03.csv, and a PNG
that's grayed out. Checkboxes, so I can take both at once. Nice, I was afraid it'd be one at a
time."

## Step 3 -- tick both, Open

    timeout 120 node app-b/study.mjs --try .../03.png task:t23 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

"Right, it's a table view, which is where I live. Left side: hosts 300, connections 1,105, both
with green checks. At the top it says 'host (300) --connections (1,105)--> host (300)'. So it has
already figured out hosts are the things and connections run between them. I didn't have to tell
it which column is which, at least not yet. It picked 'id' as the Key and 'hostname' as the Name.
Fine.

Now the 69 columns. I can see about ten across. I'm not scrolling sideways through 69. There's a
'Find a column' box -- that's what I want. I'd type 'vuln' or 'critical'."

## Step 4 -- try to type in Find a column

    timeout 120 node app-b/study.mjs --try .../04.png ... --click "Find a column" --type "vuln"
    timeout 120 node app-b/study.mjs --try .../05.png ... --click "Find a column" --click "Find" --type "vuln"

"It opens a dark list: 'With a role' id, hostname, then 'Other columns' in file order. My typing
didn't show up in the Find box." (Note for moderator: the click-through tool did not take typed
text; a real user would have typed here and probably found it in one keystroke.) "OK, I'll just
go down the list then."

## Step 5 -- arrow down the column list

    timeout 120 node app-b/study.mjs --try .../06.png ... --click "Find a column" --key ArrowDown x20
    timeout 120 node app-b/study.mjs --try .../07.png ... --click "Find a column" --key ArrowDown x35
    timeout 120 node app-b/study.mjs --try .../08.png ... --click "Find a column" --key ArrowDown x55

"os_family, os_version, kernel... cpu, memory, disk, net... uptime, last_reboot... then
patch_pending_count, patch_pending_critical_count, vuln_count_critical, vuln_count_high,
vuln_count_medium, vuln_count_low. There it is. 'Serious security holes' -- critical
vulnerabilities, that's vuln_count_critical. 'Vuln' I know from our own security questionnaires
to suppliers.

There's also one cut off: 'vuln_count_critical...iated_over_30_days'. The middle is chopped. I'm
guessing 'unremediated over 30 days' -- critical ones nobody fixed in a month. That's arguably
the more serious number for a VP, but the question was how many it has, so the plain count. I'd
want to hover and see the full name; I shouldn't have to guess what got cut out."

## Step 6 -- jump to it

    timeout 120 node app-b/study.mjs --try .../09.png ... --key ArrowDown x55 --click "vuln_count_critical"

"Good -- it jumped the table sideways and put a blue box round vuln_count_critical. It's a number
column (the # mark). First eight rows are all 0, but those are load balancers, I'd expect that.
vuln_count_high next to it has real numbers. Answer: vuln_count_critical."

## Step 7 -- check the connections table before loading

    timeout 120 node app-b/study.mjs --try .../10.png ... --click "Open" --click "connections"

"This is the bit where tools usually get it wrong without telling you. It says each row is 'an
edge', host to host. source is 'From -> host', target is 'To -> host'. And bytes_total_24h is
marked 'Weight', 'Higher means Stronger'. Underneath: '1,105 rows; every row has both ends' and
'every row has a bytes_total_24h value'. That's what I want -- it told me what it guessed AND
checked it against the data. I trust that more than a silent guess.

One question: 'busier'. Is that bytes or flow_count_24h? There's a flow count column right there.
Bytes is a reasonable reading of busy, so I'll leave it, but it picked one of two candidates and
didn't say why. If I wanted flows I assume I'd change it on that column's dropdown."

## Step 8 -- Load

    timeout 120 node app-b/study.mjs --try .../11.png ... --click "connections" --click "Load"

"There's the picture. Summary on the right: Nodes 300, Edges 1,105, Directed, Weight
'bytes_total_24h, stronger', 7 isolated nodes. Numbers match the files. Hosts clump into groups,
probably sites. 'Nothing is colored or sized by a row' -- fine, I haven't asked it to. Done."

## Outcome

- Succeeded, I believe: the serious-security-holes column is vuln_count_critical, and the two
  files are in with connections between hosts weighted by bytes_total_24h (higher = stronger).
- Single Ease Question: 6 of 7. The import guessed everything right and showed its work. Lost a
  point for the column finder: the list is in file order with no search hits shown to me, and a
  long name was cut in the middle, so I had to guess what "...iated_over" meant.
- Would I use it instead of my current tool? For this job, bringing two exports in and seeing
  which columns matter, it beat Gephi easily -- Gephi makes you name source and target yourself
  and I never trusted the result. It also says files stay on my machine, which helps with IT. But
  it's still a side tool unless I can get a table out of it into Power BI; that's where my VP
  looks.

## Problems noted

1. The column finder lists 69 columns in file order; without typing, finding one means paging
   through dozens.
2. Long column names are truncated in the middle in both the finder and the table header
   ("vuln_count_critical...iated_over_30_days", "vuln_count_...er_30_days"), and the cut hides
   the word that matters.
3. The weight was chosen as bytes_total_24h with no reason given while flow_count_24h is also a
   plausible "busier" measure; the choice is visible and editable, but unexplained.
