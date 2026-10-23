# Session r3-s50 -- Dev, returning: two football spreadsheets into one network

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
Screenshots: the numbered PNGs beside this file.

The commands below use `R="REAL_DIST=<build> node design/ui/studio/tool/real.mjs"` and `S=<session folder>`.

## Step 1 -- start
`$R --start $S empty` -> 01.png

Dev: "Okay, the start screen again: Open project or file, New from data, and the samples on the right. The data question is at the bottom, so I'll say no thanks like last time. I've got two files this time, players and passes, so 'New from data...' sounds more like it than just opening one."

## Step 2 -- dismiss the data prompt
`$R --step $S --click "No thanks"` -> 02.png

Dev: "Prompt gone. Now 'New from data...'. I've got two files, so I want the thing that builds a network from data."

## Step 3 -- New from data
`$R --step $S --click "New from data..."` -> 03.png

Dev: "'Open as a new graph', with a 'Tables' list on the left and a plus. Oh, so I can add more than one table -- that's what I need. Let me start with the players: 'choose a file...'."

## Step 4 -- choose players.csv
`$R --step $S --click "choose a file..." --upload players.csv` -> 04.png

Dev: "Nice -- 'players: 10 nodes'. Each row is 'a node', id is the Key, and name and position are attributes. All 10 players are there, s01 to s10, Ana Torres to June Kaur. The bottom says '10 node rows read; the load makes 10 nodes and 0 edges.' Zero edges because I haven't given it the passes yet. I'll add passes.csv with the plus next to Tables."

## Step 5 -- hover an icon (a stray look at the main menu)
`$R --step $S --hover-icon 1` -> 05.png -- tooltip "Main menu: open, save, export, settings". Not what I wanted.

## Step 6 -- the plus next to Tables
`$R --step $S --click-at 271,107 --upload passes.csv` -> 06.png
The plus is "Add a table". It opened a small menu (File..., From a URL..., Paste...) instead of a file chooser, so nothing was uploaded.

Dev: "Oh, it's a menu, not straight to the file. 'File...' it is."

## Step 7 -- File... -> passes.csv
`$R --step $S --click "File..." --upload passes.csv` -> 07.png

Dev: "Okay! It says 'players and passes: 10 nodes, 17 edges'. Each row is 'an edge', from and to got picked up on their own, and passes is an 'Attribute', whole number. Wait -- there are 18 rows in the file but only 17 edges? The left list says 'Edges: passes.csv, 18 rows, 1 left out' with a red warning triangle. And the bottom says '1 edge row names a node missing from the node rows.' with 'Add' and 'Leave out' -- and Leave out is already picked. I was told every pass has to arrive, so I don't want anything left out. Let me see which row it is first: 'Show the 1 unmatched row'."
I also noticed "Weight: none (each edge counts 1)". It's not today's job, but good to know where that is.

## Step 8 -- Show the 1 unmatched row
`$R --step $S --click "Show the 1 unmatched row"` -> 08.png

Dev: "There it is: line 17, s04 to s11, 3 passes, and 's11 (no node row)'. So someone passed to an s11 who isn't on the squad list -- a sub, maybe? That's the thing that 'did not fit', so I'll tell them. But I'm asked to get every pass in, so I'll pick 'Add'. I guess that makes s11 a dot with no name."

## Step 9 -- Add
`$R --step $S --click "Add"` -> 09.png

Dev: "Now it says 11 nodes and 18 edges, both tables have green ticks, and the bottom says 'the load makes 11 nodes and 18 edges.' That's the 10 players plus s11, and all 18 passes. Direction says 'As the file says'. Passes go from one player to another, so that's fine. Load."

## Step 10 -- Load
`$R --step $S --click "Load"` -> 10.png

Dev: "There's the drawing! The title is 'players and passes', 'From 2 files'. On the right, under Values / Overview: Nodes 11, Edges 18, Directed, Components 1. I count 11 dots on the canvas, with arrows. That matches: 10 players plus the mystery s11, and 18 passes. There are no names on the dots yet, though. Let me check that s11 really is in there -- I'll search for it."

## Step 11 -- search s11
`$R --step $S --click "Find nodes, edges, values" --type "s11"` -> 11.png

Dev: "Nodes 1: s11. Edges 1: s04 -> s11. So the extra one is in, with its 3-pass edge. Wait, does s11 show on the canvas? Nothing lit up that I can see, but it's in the list. Let me also make sure the names came across, not just the codes. I'll search for the last player, June."

## Step 12 -- (miss) tried to click the search box by its text
`$R --step $S --click "s11" --key Control+a --type "June"` -> 12.png -- "ambiguous", so nothing happened. I aimed wrong; the app did nothing wrong.

## Step 13 -- search June
`$R --step $S --click-at 170,90 --key Control+a --type "June"` -> 13.png

Dev: "s10, name: June Kaur. So the names came with the players, and position came in as an attribute too. That's everything: 11 dots (10 players plus s11), 18 passes, one connected group. I'm done, so I'll end it here."

## Step 14 -- end
`$R --end $S` -- session ended, no further request.

## Debrief (in character)

**Did I finish?** Yes. Both spreadsheets went in as one network and it drew. The app says 11 nodes and 18 edges, and I counted 11 dots. That is the 10 players plus one extra. All 18 pass rows made it in, and searching found June Kaur with her name and s11 with its pass.

**What did not fit:** passes.csv has a row on line 17, s04 to s11 with 3 passes, and s11 is not in players.csv. The app caught it before loading. It said "1 edge row names a node missing from the node rows" and showed me the row. I chose Add so the pass would not be lost. So s11 is in the network as a dot with no name and no position. I'd ask the coach who s11 is, maybe a sub.

**Ease:** 6 out of 7.

**What confused me:**
- The choice for the missing player was already set to "Leave out" before I had looked at anything. If I had clicked Load straight away, I would have lost a pass without noticing. All that warned me was the small "1 left out" and the red triangle in the table list. Every pass was supposed to arrive, so the starting choice worked against me.
- The plus next to Tables opens a small menu (File..., From a URL..., Paste...), not the file picker. It's one more click, but no big deal.
- After the load I couldn't tell which dot was s11. The search listed it, but nothing on the picture showed me which one it was. There were no names on the dots either, so I couldn't check the players on the picture itself.
- "Weight: none (each edge counts 1)" is right above the passes column. I didn't need it today, but it made me wonder if I should have made passes the weight.
