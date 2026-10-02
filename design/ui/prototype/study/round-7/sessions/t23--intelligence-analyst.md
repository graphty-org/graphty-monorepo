# Session: bring in two wide spreadsheets (hosts and connections) -- Marcus, criminal intelligence analyst

Task as given: "The configuration database exported two spreadsheets: one line per host, with 69
things recorded about each, and one line per network connection, with 26 things recorded about
each. They are in your Downloads folder and graphty has never seen them. Bring them in so each
connection is drawn between the two hosts it runs between, with busier connections tying hosts
more tightly. Before you bring them in, find which of the 69 things recorded about each host tells
how many serious security holes it has."

Renders are in tmp/round-7-sessions/t23--intelligence-analyst/. Every command was run from
design/ui/prototype with the prefix
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t23--intelligence-analyst/NN.png task:t23`
(written below as `--try NN`).

## Step 1 -- start screen (shots/tasks/t23/01.png)

"Start screen. 'Open project or file', 'New from data'. Down the side it says files are read on
this computer and never uploaded. Good, that's the first thing I'd ask. Up top it says 'Local
only' too. Two spreadsheets, so 'New from data' sounds like the import door."

## Step 2 -- New from data

Command: `--try 02 --click "New from data..."`

"File chooser opened on Downloads > it-estate. hosts-2026-03.csv, connections-2026-03.csv and a
picture I don't want. Checkboxes, so I can take both at once. Fine."

## Step 3 -- pick both files, Open

Command: `--try 03 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"`

"Okay. It read both and the strip across the top says 'host (300) --connections (1,105)--> host
(300)'. That's the picture I want, in one line, before I've told it anything. Hosts table on the
left with 300 and a green check, connections with 1,105. It picked id as the key and hostname as
the name. The grid is wide, 69 columns, and it only shows me the first nine or ten. I'm not
scrolling through 69 columns. There's a 'Find a column' box."

## Step 4 -- look for the security-holes column

Commands:
- `--try 04 ... --click "Find a column" --type "vuln"` (the list opened but my typing did not show)
- `--try 05 ... --click "Find a column" --click "Find" --type "vuln"` (same)
- `--try 06 ... --click "Find a column" --key v --key u --key l --key n`

(The first two attempts were the test rig not passing my typing through, not the app; with the
keys pressed one at a time the box filled. A real keyboard would have done this the first time.)

"The list itself is fine without typing: 'With a role' -- id, hostname -- then 'Other columns'.
I typed 'vuln': seven matches. vuln_count_critical, _high, _medium, _low, then
'vuln_count_critical...iated_over_30_days' with the middle cut out, then two scan columns.
'Serious' to me means critical. Top hit."

## Step 5 -- jump to it

Command: `--try 07 ... --key v --key u --key l --key n --key Enter`

"Jumped right to vuln_count_critical, outlined in blue, marked with a # so it's a number. First
eight rows all zero -- those are load balancers, fine. Next to it is 'patch_pendi...ical_count',
middle chopped off again. Patch pending critical count? That nags me: is that the holes or the
patches? I'd read vuln_count_critical as 'how many serious holes'. That's my answer:
vuln_count_critical. If my sergeant asked, I'd want to see the full name of that patch column
without hovering around for it."

## Step 6 -- check the connections table

Command: `--try 08 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"`

"Each row is an edge, host to host. source is 'From -> host', target is 'To -> host'. Done for me.
bytes_total_24h is tagged 'Weight', and under it 'Higher means: Stronger / Farther / Capacity'
with Stronger picked. That's exactly 'busier ties tighter'. At the bottom: every row has both
ends, every row has a bytes value, 1,105 rows became 1,105 edges. That's the kind of report I
like -- I can repeat it.

I'd have argued flow_count_24h is 'busier' -- number of calls versus minutes on the phone -- and
nothing asked me which one I meant. It just chose bytes. I'm not going to fight it; bytes is
defensible. But it made that call without telling me there was a choice."

## Step 7 -- Load

Command: `--try 09 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"`

"Chart's up. Right panel: 300 nodes, 1,105 edges, directed, weight 'bytes_total_24h, stronger'.
7 isolated nodes -- I can see a few lonely dots floating around the edge. Clusters around a ring,
a big heavy one on the right. A banner says 'Nothing is colored or sized by a row' -- not sure
what that's telling me, I'd ignore it. All gray dots, no icons, so it's not a link chart in my
sense yet. But the data's in, wired the way I asked."

## Verdict

- Succeeded? Yes. Both files in, each connection drawn between its two hosts, weighted by
  bytes_total_24h with higher meaning stronger. The serious-security-holes column is
  vuln_count_critical.
- Single Ease Question: 6 of 7. The import guessed everything right and told me so. Points off
  for the column names cut in the middle (I could not tell 'patch_pendi...ical_count' from the
  real one without guessing) and for the weight being chosen for me without saying bytes versus
  flow count was a choice.
- Would I use this instead of my current tool? For the import, yes -- this beat my usual Excel
  cleanup and i2 import spec by a mile: two files in, one line telling me what it built, a count
  of what matched. For the chart, not yet: gray dots with no icons is not something I put in front
  of a prosecutor. And before real case data goes in, I'd want IT's paperwork backing up that
  "never uploaded" line.

## Problems noted

1. Long column names are cut in the middle ('vuln_count_critical...iated_over_30_days',
   'patch_pendi...ical_count'), in the column finder and in the grid headers. With two similar
   columns side by side, the cut-out part is the part that tells them apart.
2. The weight column was chosen for me (bytes_total_24h) with no sign that flow_count_24h was a
   candidate. 'Busier' can mean either.
3. 'Nothing is colored or sized by a row' after Load reads like a status nobody asked for; I did
   not know what to do with it.
4. The loaded chart is identical gray dots; nothing says which dot is a server and which is a load
   balancer.
