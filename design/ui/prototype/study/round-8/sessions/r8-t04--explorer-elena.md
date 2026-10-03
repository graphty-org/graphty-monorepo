# Session r8-t04 -- Explorer Elena

Task given: "You have never used this program before. Two spreadsheets from your team are in your
Downloads folder: one lists the machines on the office network, one lists which machine talks to
which. You want them in as one network and you want to know that every machine and every
connection arrived."

Participant: Explorer Elena (first-time graph user, product manager). Clock: first contact.
Renders: design/ui/prototype/tmp/round-8-sessions/r8-t04--explorer-elena/

All commands were run from design/ui/prototype. P = /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t04--explorer-elena

## Start screen (shots/tasks/r8-t04/01.png)

> OK, "Start". "Open project or file..." and "New from data...". I have two spreadsheets, not a
> project. "New from data" sounds like me. (Did not notice the "or drop a file" line until later.)

## Step 1 -- New from data

    timeout 120 node app-b/study.mjs --try $P/01.png task:r8-t04 --click "New from data..."

Screen: a "Choose files" dialog on Downloads > it-estate with hosts-2026-03.csv,
connections-2026-03.csv and a grayed-out estate-diagram.png, each with a checkbox.

> Oh good, a file picker. Checkboxes, so I can pick both. Hosts and connections.

## Step 2 -- pick both, Open

    timeout 120 node app-b/study.mjs --try $P/02.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Screen: a table view titled "Open as a new graph". Top line: "host (300) --connections (1,105)-->
host (300)". Left: Tables -- hosts 300 (green check), connections 1,105 (green check). Hosts table
with 69 columns, "Each row is a node", id marked Key, hostname marked Name. Bottom: "Match report:
hosts -- 300 rows; every key is unique." Footer: Direction (As the file says / Directed /
Undirected), Cancel, Load. The project got a name on its own: "IT estate, March 2026".

> Whoa, lots of columns. Top line says host 300, connections 1,105, host 300. Green ticks on both.
> "300 rows; every key is unique" -- that sounds good for the machines. Let me check the
> connections one before I hit Load.

## Step 3 -- look at connections

    timeout 120 node app-b/study.mjs --try $P/03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Screen: the connections table, "Each row is an edge, host to host", source = "From -> host",
target = "To -> host", bytes_total_24h = "Weight" with "Higher means Stronger / Farther /
Capacity". Match report: "1,105 rows; every row has both ends. 1,105 of 1,105 source found in
hosts. 1,105 of 1,105 target found in hosts. bytes_total_24h is each edge's weight ... 1,105 rows
became 1,105 edges."

> The bottom bit is what I want. 1,105 of 1,105 found, both columns. "1,105 rows became 1,105
> edges." I don't really know what an edge is, but the numbers match, so I think all my links got
> in. The Weight thing with Stronger / Farther / Capacity -- no idea, not touching it. Directed /
> Undirected, also leaving that. Load.

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try $P/04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Screen: the graph -- a big oval web of gray lines, a dense cluster on the right, some bigger dots,
a few stray dots outside. Floating box top left: "Size: vu....iated_over_30_days, 0 2 3 5 6,
Linear scale (radius) ...". Right panel, Data tab, Summary: Nodes 300 nodes; Edges 1,105
connections; 69 node attributes, 26 edge attributes; Direction Directed; Weight bytes_total_24h,
stronger; Isolated nodes 7; Average total degree 7.37; Highest total degree 25.

> Ooh, it's a big web. OK -- right side: 300 nodes, 1,105 connections. Same numbers as before, so
> everything got in? But "Isolated nodes 7" -- does that mean 7 machines didn't connect? Did I
> lose some? I probably did something wrong in the sheet. The big dots on the right must be the
> busiest machines, the ones with the most traffic. (She did not read the size box in the corner;
> it says size is a vulnerability count, not traffic.) Let me click the 7.

## Step 5 -- click the 7

    timeout 120 node app-b/study.mjs --try $P/05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "7"

Screen: a table opened under the graph: "300 nodes from hosts-2026-03.csv", columns id and
hostname, starting at CI0100003 lb-prod-fra-01. No row looked highlighted in the part she could
see, and she could not tell whether any dots in the picture changed.

> Hm. I clicked 7 and it opened a list, but it's all 300, not the 7. Well, 300 machines are there
> at least. But which are the 7? Maybe the little stray dots floating outside the web.

## Step 6 -- rest the pointer on "Isolated nodes"

    timeout 120 node app-b/study.mjs --try $P/06.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --hover "Isolated nodes"

Tooltip: "Nodes with no edges. Click to select the 7 nodes; the table marks them as selected rows"

> "Nodes with no edges." So it's 7 machines that just aren't in the connections list. Nothing got
> dropped; they just don't talk to anything. It says the table marks them, but when I clicked, the
> table started at the top with ordinary machines and I couldn't see which 7. Still: 300 machines
> in, 300 out; 1,105 rows in, 1,105 connections out. That's what I wanted. I'm done.

## Debrief

- **Succeeded?** Yes, I think so. The import screen told me 1,105 of 1,105 links found both
  machines, and after loading the side panel said 300 and 1,105, the same numbers as my files.
- **Single Ease Question (1-7):** 6. Picking two files at once and seeing the counts match was
  easy. I lost a point on "Isolated nodes 7": for a minute I thought I had lost 7 machines, and
  clicking it showed me the whole list instead of those 7.
- **Would I use this instead of my current tool?** For getting the two sheets in, yes -- in Sheets
  I would be doing VLOOKUPs to check every link matched, and this just told me. Whether I'd keep
  using it depends on whether the picture tells me anything. Right now it's a nice web and I
  can't say one sentence about it yet.

## Observer notes

- Path: New from data -> tick both files -> Open -> connections tab -> Load. No dead ends on the
  import itself. She chose "New from data..." over "Open project or file..." and never noticed the
  drop-a-file line.
- The words she trusted were the match report lines with matching numbers ("1,105 of 1,105",
  "1,105 rows became 1,105 edges"). She skipped "edge", "Weight", "Directed" without understanding
  them and did not change anything.
- "Isolated nodes 7" read at first as a loss ("did I lose 7?") and triggered self-blame. The
  tooltip fixed it, but only once she hovered.
- Clicking the 7 opened the table at its first rows with no selected row visible, so the promised
  selection did not show to her; she could not identify the 7 machines.
- Misreading: she took the big dots as "the busiest machines, most traffic". The corner box says
  size is a 30-day vulnerability count. She did not read it.
- Engagement stayed up to the end; she stopped because she believed she was done.
