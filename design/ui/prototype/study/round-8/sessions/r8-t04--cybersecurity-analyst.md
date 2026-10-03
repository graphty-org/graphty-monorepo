# Session: load two spreadsheets as one network and confirm everything arrived

Participant: Priya, threat hunter in a corporate SOC (persona file study/personas/cybersecurity-analyst.md)
Task given: "You have never used this program before. Two spreadsheets from your team are in your
Downloads folder: one lists the machines on the office network, one lists which machine talks to
which. You want them in as one network and you want to know that every machine and every
connection arrived."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t04--cybersecurity-analyst/.

## 01 -- start screen (shots/tasks/r8-t04/01.png)

Think-aloud: "First three questions: is this approved, where does it run, does it phone home.
Top right says 'Local only', and under Start: 'Files are read on this computer and never
uploaded.' Fine, that answers two of three before I asked. Approved -- no, nothing here can tell
me that, and in real life this is where I'd stop and not file the review ticket. It's a study, so
I keep going. And these are inventory files, not logs, so I'm less twitchy.

Two choices: 'Open project or file...' and 'New from data...'. I have two CSVs, not a project.
'New from data' sounds like the import. Skipping the samples."

## 02 -- New from data...

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t04 --click "New from data..."

Screen: a "Choose files" dialog on Downloads > it-estate with checkboxes: hosts-2026-03.csv
(214 KB), connections-2026-03.csv (187 KB), and a grayed-out estate-diagram.png.

Think-aloud: "Checkboxes, so it takes more than one file at once. Good. The PNG is grayed out,
makes sense. Tick both."

## 03 -- tick both, Open

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t04 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Screen: an import view. Left: "Tables" with hosts 300 and connections 1,105, each with a green
check. Top strip: "Makes host (300) --connections (1,105)--> host (300)". The hosts table is
showing: id marked Key (auto), hostname marked Name, 69 columns, first 8 of 300 rows. "Each row
is a node." Match report at the bottom: "300 rows; every key is unique."

Think-aloud: "OK, that's actually what I wanted. It guessed id is the key and hostname is the
name, and it told me it guessed -- the little 'auto'. 300 rows, keys unique. The one-liner at the
top reads like a schema: host to host via connections. I can read that. Let me check the other
table before I trust it."

## 04 -- connections table

    ... --click "Open" --click "connections"

Screen: connections table. id = Edge id, source = "From -> host", target = "To -> host",
bytes_total_24h picked as Weight, "Higher means: Stronger". Match report: 1,105 rows, every row
has both ends; 1,105 of 1,105 source found in hosts; 1,105 of 1,105 target found in hosts;
every row has a bytes_total_24h value; "1,105 rows became 1,105 edges."

Think-aloud: "This is the part I care about. Every source and every target joined to a host,
nothing dropped. 1,105 in, 1,105 out. That's the count I'd check in Splunk with a lookup and a
stats count, and it just told me. Good.

It went and picked bytes_total_24h as a weight on its own. I didn't ask for that. It's fine, it
tells me, and it's a 24-hour number, so at least the time range is in the column name. Directed,
which is right for flows. Load."

## 05 -- Load

    ... --click "connections" --click "Load"

Screen: the graph. Right panel, Data tab, Summary: Nodes 300, Edges 1,105 connections, 69 node
attributes, 26 edge attributes, Directed, Weight bytes_total_24h stronger, Isolated nodes 7,
average total degree 7.37, highest 25. A legend floating top-left: "Size: vu....iated_over_30_days"
0 to 6. Left panel lists "vuln_co...0_days".

Think-aloud: "300 nodes, 1,105 connections. Matches both files. That's the task, basically.

Two things bug me. One: the nodes are sized by some vuln count over 30 days and I never asked
for that. The legend is truncated in the middle -- 'vu....iated_over_30_days' -- I have to guess
it's 'vuln_count_unremediated' or something. Who picked that, and why? If I'm screenshotting
this into a ticket, a size encoding I didn't choose is a liability.

Two: 'Isolated nodes 7'. Seven hosts that talk to nothing. That's either the ones nobody logged,
or real. I want to see which seven. Also, top bar says 'IT estate, March 2026' and the panel says
'Hosts'. Same thing? Probably the project vs the graph. Whatever."

## 06 -- from 2 tables

    ... --click "Load" --click "from 2 tables"

Screen: back to the import view, titled "Edit: hosts-2026-03.csv", same match report, "Apply is
off: Nothing has changed yet."

Think-aloud: "OK, so the provenance link takes me back to the mapping. Good to know I can redo
it. Nothing to change. Escape."

## 07 -- the 7 isolated nodes

    ... --click "Load" --click "7"

Screen: a table opened at the bottom: "300 nodes from hosts-2026-03.csv", id and hostname
columns, starting with CI0100003. Not 7 rows -- all 300.

Think-aloud: "I clicked 7 and got 300. That's not the 7. Either it's not filtered or the filter
isn't shown. I'd have to sort by degree or something to find them myself. Annoying -- that's
exactly the list I'd want to paste into the case: 'these seven hosts are in inventory but have no
flows.' But it's not part of what I was asked. The question was did everything arrive, and the
answer is yes: 300 and 1,105, every endpoint matched."

Stopped here.

## After the task

Succeeded? Yes. Both files came in as one network, and the import told me 300 of 300 hosts,
1,105 of 1,105 connections, every source and target matched to a host. The summary after loading
said the same numbers.

Single Ease Question: 6 of 7. The import was straightforward and the match report is the best
part. Points off for the unrequested sizing with a truncated legend, and the isolated-nodes link
that showed me everything instead of the seven.

Would I use this instead of my current tool? For this job -- joining an inventory to a flow list
and checking the join -- maybe. Right now I'd do it in pandas with a merge and a value_counts,
and that's about the same effort, but here I didn't write anything and got the join report for
free, which I'd actually paste into a case. I would not adopt it yet: it's not on our approved
list, and I haven't seen the part I really care about -- a query box and getting the matches out
as a CSV. If the "7 isolated" turned into a list I could export, that would be a concrete reason
to open it again.

## Problems noted

1. Clicking the isolated-nodes count (7) opened the full 300-node table, not the 7 isolated hosts.
2. Node size was set by a vulnerability-count column the participant never chose; the legend name
   is truncated in the middle ("vu....iated_over_30_days").
3. Weight column (bytes_total_24h) was auto-picked; it is disclosed, but unasked.
4. Two names for one thing: top bar "IT estate, March 2026" vs graph panel "Hosts".
5. Nothing on screen answers "is this approved software" -- out of scope for the app, but it is
   where a real trial would stop.
