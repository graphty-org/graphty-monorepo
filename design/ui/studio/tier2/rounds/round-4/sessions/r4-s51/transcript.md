# Session r4-s51 -- Jordan, marketing network analyst (returning user)

Task: load people.csv (staff) and messages.csv (who emails whom, how often) as one drawn network,
check every person and every link arrived, and report anything that did not fit.

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s51 (worktree-relative).
All commands run from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and
T=design/ui/studio/tool, S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s51.

## Steps

### 01 -- start
`node $T/real.mjs --start $S empty`
Start screen. "Local only" in the top bar and "Files are read on this computer and never
uploaded" under Start -- good, that answers my first question before I asked it, since this is
staff email data. Usage-data banner at the bottom; I'll say no. Two files to bring in, so "New
from data..." sounds more like it than "Open project or file...".

### 02 -- dismiss the banner, New from data
`node $T/real.mjs --step $S --click "No thanks" --click "New from data..."`
"Open as a new graph" with a "Tables" list on the left and a + next to it. Plural tables -- so
maybe it takes both spreadsheets. I'll choose people.csv first.

### 03 -- people.csv
`node $T/real.mjs --step $S --click "choose a file..." --upload people.csv`
It read people.csv as "Nodes: people.csv, 12 rows", "Each row is a node", id is the Key, name and
team are attributes. Footer: "12 node rows read; the load makes 12 nodes and 0 edges." That is
the staff list, all 12 -- fine. I won't hit Load yet; the + next to Tables should add the emails.

### 04 -- hover an icon
`node $T/real.mjs --step $S --hover-icon 1`
Tooltip "Main menu: open, save, export, settings" -- wrong icon, that's the hamburger. I'll just
click the + by Tables.

### 05 -- the + ("Add a table")
`node $T/real.mjs --step $S --click-at 271,107 --upload messages.csv`
The + is "Add a table" and opens a small menu: File..., From a URL..., Paste... (so my upload
went nowhere -- my fault, it's a menu, not a file picker). File... it is.

### 06 -- messages.csv added
`node $T/real.mjs --step $S --click "File..." --upload messages.csv`
OK, this is actually good. Heading "people and messages: 12 nodes, 22 edges". messages.csv is
"Edges: messages.csv, 23 rows, 1 left out" with a warning triangle. from/to picked up as From/To,
emails as an attribute (whole number), "Weight: none (each edge counts 1)". Footer: "12 node rows
and 23 edge rows read; the load makes 12 nodes and 22 edges. 1 edge row names a node missing from
the node rows. Add / Leave out / Show the 1 unmatched row". So 23 rows in, 22 edges out -- that
is exactly the "4,000 on the dashboard, 3,100 in the download" thing I hate, except here it tells
me why. Let me see which row.

### 07 -- the unmatched row
`node $T/real.mjs --step $S --click "Show the 1 unmatched row"`
"1 unmatched row: p13 has no node row." Line 24: p11 -> p13 (no node row), 6 emails. So Kemi
Bello (p11) emails somebody called p13 who isn't on the staff list -- a leaver, a contractor, or
a typo in the export. I was asked to get every link in, so I'd rather keep the row and flag p13
than drop six emails silently. "Add" it is; I'll note p13 in what didn't fit.

### 08 -- Add
`node $T/real.mjs --step $S --click "Add"`
Now "13 nodes, 23 edges", both tables green-ticked, "Add" shown pressed. 23 rows in, 23 edges
out -- the numbers match, that I can put in a report. The table still marks p13 "(no node row)",
which is honest. One more thing: the file is "how often", and the emails column is just an
attribute with "Weight: none (each edge counts 1)". A 2-email tie and an 18-email tie should not
count the same. Let me see what the emails dropdown offers.

### 09 -- "emails" was ambiguous
`node $T/real.mjs --step $S --click "emails"`
Tool said two things are called emails (the table header and "Role of emails"). Nothing changed.

### 10 -- Role of emails
`node $T/real.mjs --step $S --click "Role of emails"`
List: From, To, Weight, Date or time, Edge id, Attribute (ticked). Weight is what I want -- more
emails, stronger tie.

### 11 -- emails as Weight
`node $T/real.mjs --step $S --click "role=option:Weight"`
"Weight: emails. Higher means: Not set / Closer / Farther / Capacity", with a line explaining
that until I choose, a path counts every edge as one step and PageRank and communities read
higher as closer. More emails = closer ties, obviously. Picking Closer, then Load.

### 12 -- Closer
`node $T/real.mjs --step $S --click "Closer"`
"Weight: emails (closer). A higher weight means a closer tie, such as more emails between two
people." Plain English, fine. Direction says "As the file says" -- emails have a sender, so I'll
leave it. Load.

### 13 -- Load
`node $T/real.mjs --step $S --click "Load"`
Drawn, in under a second. Title "people and messages", "From 2 files". Values > Overview: Nodes
13, Edges 23, Directed, Loaded weight emails (closer), Components 1. Counts match what the import
screen promised. But: no names on the dots, so I can't tell Alma from p13 by eye, and every line
is the same thin grey -- the 18-email tie looks like the 2-email one. Before I believe "every
person arrived" I want the list. The grid icon in the bottom toolbar looks like a table.

### 14 -- Table
`node $T/real.mjs --step $S --click-at 793,864`
A table slid up: Nodes / Edges tabs, "13 nodes", columns id, name, team, "In the order loaded".
This is the thing I always want. It's only four rows tall on a laptop screen though; scrolling
to the bottom to see p13.

### 15 -- bottom of the node table
`node $T/real.mjs --step $S --wheel 700,820,1000`
p10 Jonah Weiss, p11 Kemi Bello, p12 Lars Nilsen (Director), and p13 with an empty name and an
empty team. So the 12 staff plus p13 are all in. Once loaded, though, nothing here says p13 was
added by me because it wasn't in people.csv -- it's just a row with blanks. If I hand this to
someone else they'll think the export lost a name. Now the Edges tab, to check the 23 links and
that the emails numbers came through.

### 16 -- Edges tab
`node $T/real.mjs --step $S --click "Edges"`
"23 edges", From / To / emails. First rows p01->p02 14, p01->p03 9, p02->p03 11, p03->p12 4 --
same as the file. Annoying: From and To are the p-codes, not names, so to read "who emails whom"
I'd have to cross-reference the Nodes tab. Scrolling to the end for the p13 row.

### 17 -- end of the edge table
`node $T/real.mjs --step $S --wheel 700,820,2000`
Last row p11 -> p13, 6 emails. All 23 links are in with their counts. The lonely dot at the top
of the drawing with a single line is probably p13 -- clicking it to check, since nothing on the
canvas has a name on it.

### 18 -- click the top dot
`node $T/real.mjs --step $S --click-at 853,96`
It is p13: highlighted, right panel says "p13, Node", Summary id p13, Degree 1. No name, no team,
and nothing saying "not in people.csv -- added from messages.csv". That's what I'd flag. I have
what I was asked for: 12 staff plus p13, 23 links with their email counts, drawn as one network.
Done. (And honestly, this is the first time in a year a vendor CSV came in without me fixing
headers in Excel first -- the listening suite's exports still put two header rows on top.)

### 19 -- end
`node $T/real.mjs --end $S`
Session ended, with no further request.

## Debrief (as Jordan)

**Did I finish?** Yes. people.csv and messages.csv went in as one network through New from
data: the + next to Tables added the second file. It drew 13 nodes and 23 edges, and I checked
both against the files in the table: all 12 staff, all 23 email rows, and every email count
matches.

**Ease: 6 / 7.** It read both files right on the first try, with no schema to set up. It found
the id, from and to columns itself. Above all, it told me before loading that 23 rows would make
22 edges, and why, and gave me Add / Leave out. Every other tool I use loses that row without a
word.

**What did not fit, or confused me:**
- **p13 is not on the staff list.** messages.csv line 24 says Kemi Bello (p11) sent p13 six
  emails, but people.csv has no p13. I chose Add, so p13 is in the network with no name and no
  team. Once loaded, nothing marks p13 as "added because a message named them". The node panel
  shows only the id and Degree 1, and the table row just has blanks. Someone I hand this to will
  think the export dropped a name. The import screen said it clearly; the loaded graph forgets it.
- **"How often" is not a weight by default.** emails came in as a plain attribute ("Weight:
  none, each edge counts 1"). I had to find "Role of emails", set it to Weight, then choose
  Closer. The wording there was clear ("such as more emails between two people"), but a new user
  would load without doing it and get every tie counted the same.
- **The drawing doesn't show the weight or the names.** Every line is the same thin grey, so an
  18-email tie looks like a 2-email tie, and no node has a label. Before I can show this to
  anyone I still have to style it (names, line thickness by emails, color by team).
- **The edge table shows p-codes, not names.** From and To show only ids, so to read who emails
  whom I have to cross-check the Nodes tab.
- **Small: the + by Tables opens a menu** (File..., From a URL..., Paste...), not a file picker.
  That's fine once you know, but I expected a picker.
- **The table panel is four rows tall at laptop size**, so checking 23 rows meant scrolling.
