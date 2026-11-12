# Session r4-s49 transcript (Dev, returning)

Task: get people.csv and messages.csv in as one network, drawn, check every person and link arrived, report anything that did not fit.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s49
All commands run from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s49.

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png
Okay, the start screen, same as September. Open project or file, New from data, samples, and the usage-data box at the bottom. Two files this time though -- people and messages. "New from data..." sounds like it might be the one for building from spreadsheets? First I'll dismiss the usage box with No thanks.

## Step 2 -- dismiss usage box
`--step $S --click "No thanks"` -> 02.png

## Step 3 -- New from data
`--step $S --click "New from data..."` -> 03.png
Oh, a whole page: "Open as a new graph", a "Tables" list on the left with a plus, and "Drop a file here, or choose a file...". "Tables", plural -- so maybe I can put both spreadsheets in. Direction "As the file says" at the bottom, Load is greyed out. I'll choose people.csv first.

## Step 4 -- choose people.csv
`--step $S --click "choose a file..." --upload people.csv` -> 04.png
Oh nice. "Nodes: people.csv, 12 rows" with a green check on the left, and it says "Each row is: a node" already picked. id is the Key, name and team are Attributes. All 12 staff, p01 Alma Reyes to p12 Lars Nilsen. Bottom says "12 node rows read; the load makes 12 nodes and 0 edges." Makes sense, no links yet. There's a plus next to Tables -- I'll add messages.csv with it.

## Step 5 -- hover first icon (mis-aim)
`--step $S --hover-icon 1` -> 05.png. Tooltip "Main menu: open, save, export, settings" -- wrong one, that's the top-left menu.

## Step 6 -- hover the plus
`--step $S --hover-at 271,107` -> 06.png. Tooltip "Add a table". That's what I want. (Cursor stays an arrow, not a hand, small thing.)

## Step 7 -- Add a table
`--step $S --click "Add a table" --upload messages.csv` -> 07.png
No file window -- the plus opens a small menu instead: File..., From a URL..., Paste... (tool: no file chooser open, nothing uploaded). Fine, File... it is.

## Step 8 -- File... messages.csv
`--step $S --click "File..." --upload messages.csv` -> 08.png
Wait -- it worked it out on its own: "Edges: messages.csv, 23 rows, 1 left out" with a red warning triangle. from = From, to = To, emails = Attribute (whole number). "Weight: none (each edge counts 1)". Header says "12 nodes, 22 edges". Bottom: "12 node rows and 23 edge rows read; the load makes 12 nodes and 22 edges. 1 edge row names a node missing from the node rows. Add / Leave out (selected) / Show the 1 unmatched row." So one link would be dropped! I was told every link has to arrive. Let me see which row it is first.

## Step 9 -- show the unmatched row
`--step $S --click "Show the 1 unmatched row"` -> 09.png
There it is: line 24, from p11 (Kemi Bello) to p13, 6 emails, "p13 (no node row)". p13 isn't on the staff list -- maybe someone who left, or a typo. That's the "anything that did not fit" I should tell them about. But I was told every link must arrive, so I'll click "Add" rather than leave it out -- I guess that makes p13 a person with no name.
(Also noticed: "Weight: none (each edge counts 1)" -- the emails number is just kept as an attribute. Not asked to do anything with it this time, so I'm leaving it.)

## Step 10 -- Add
`--step $S --click "Add"` -> 10.png
Oh nice -- both tables have green checks now, "23 rows" with no "left out", and the header says "13 nodes, 23 edges". Bottom: "the load makes 13 nodes and 23 edges." 12 people + p13 = 13, all 23 message rows = 23 links. That matches the sheets when I count. Load.

## Step 11 -- Load
`--step $S --click "Load"` -> 11.png
Oh nice, there it is: a drawing, title "people and messages", "From 2 files" under Graph on the right. Values tab, Overview: Nodes 13, Edges 23, Direction Directed, Components 1. I count 13 dots on the canvas too, with arrows. So the numbers match what the load screen promised. No names on the dots though, so I can't tell which one is p13. I'll open the table button in the toolbar to see the list of people.

## Step 12 -- Table
`--step $S --click-at 793,863` (button "Table") -> 12.png
A table slid up from the bottom: Nodes / Edges tabs, "13 nodes", "In the order loaded", columns id, name, team. p01 Alma Reyes at the top. I'll scroll down to the end to find p13.

## Step 13 -- scroll node table
`--step $S --wheel 700,820,1000` -> 13.png
Bottom of the list: p10 Jonah Weiss, p11 Kemi Bello, p12 Lars Nilsen Director, and p13 with an empty name and empty team. So p13 came in as a person with no name, like I chose. Let me peek at Edges to make sure the email counts came along too.

## Step 14 -- Edges tab
`--step $S --click "role=tab:Edges"` -> 14.png
"23 edges", columns From, To, emails: p01 -> p02 14, p01 -> p03 9, p02 -> p03 11, p03 -> p12 4. Same as the first lines of messages.csv. The email counts came along. I'm done.

## End
`node design/ui/studio/tool/real.mjs --end $S` -> session ended, copied to the design session folder.

## Wrap-up (in character)

**Did I finish?** Yes. Both spreadsheets went in as one network through "New from data...": people.csv as nodes, messages.csv added with the plus ("Add a table" -> File...), and it worked out which was nodes and which was edges by itself. The drawing shows 13 dots and the panel says 13 nodes, 23 edges, 1 component. The table shows all 12 staff plus p13, and 23 links with their email counts.

**What did not fit:** messages.csv line 24 is Kemi Bello (p11) -> p13, 6 emails, and p13 is not in people.csv. The program caught it before loading ("1 edge row names a node missing from the node rows") and would have left it out by default. I chose "Add", so p13 is in the network as a person with no name and no team. Someone should check who p13 is -- a former staff member or a typo.

**Ease: 6 / 7.** Really smooth. The counts on the load screen ("the load makes 13 nodes and 23 edges") were exactly what I needed to prove nothing was dropped, and they matched the Overview afterwards.

**What confused me:**
- The plus next to "Tables" doesn't open a file straight away -- it opens a little menu (File..., From a URL..., Paste...). Fine once I saw it, but I expected the file window.
- "Leave out" was already picked for the missing person. If I hadn't read the bottom line I'd have lost a link without noticing; the red triangle and "1 left out" on the left did catch my eye though.
- "Weight: none (each edge counts 1)" -- I wasn't sure whether the number of emails should have been the weight. The task didn't ask, so I left it, but I'm not sure if that counts as everything "arriving".
- The dots have no names, so I couldn't find p13 on the drawing, only in the table.
