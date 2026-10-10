# Session r1-s33 -- Grace (returning), task T4, dataset A (office: people.csv + messages.csv)

Build: 946256efb876 (frozen, served with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/)

Before starting, in Excel: people.csv has 12 staff rows (id, name, team). messages.csv has 23 rows (from, to, emails). So I expect 12 people and 23 links.

## Step 1 -- start

`REAL_DIST=... tool/with-browser.sh node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s33 empty` -> 01.png

Grace: "Okay, the start screen, same as before. There's the usage-data box at the bottom -- I'll say no thanks. I see 'Open project or file...' which I used last time, and also 'New from data...', which I don't remember. Two files this time, so 'New from data' sounds like the one for building something. First, clear the box."

## Step 2

`--click "No thanks"` -> 02.png

Grace: "Box gone. Last time 'Open project or file' took one list. I have two this time and 'New from data...' sounds like building a network from my spreadsheets. I'll try that."

## Step 3

`--click "New from data..."` -> 03.png

Grace: "'Open as a new graph'. There's a 'Tables' list on the left with a plus, which makes me think it takes more than one sheet -- good. 'Drop a file here, or choose a file...'. I'll start with the people list."

## Step 4

`--click "choose a file..." --upload people.csv` -> 04.png

Grace: "Nice -- 'people: 12 nodes', each row is 'a node', id is the Key, name and team are attributes. Twelve rows, same as Excel. Bottom says '12 node rows read; the load makes 12 nodes and 0 edges.' Zero edges is right, the links are in the other sheet. Now the plus next to 'Tables' to add messages.csv."

## Step 5

`--click-at 271,107` (the plus; tool says it is "Add a table") -> 05.png

Grace: "A little menu: File..., From a URL..., Paste... . File, obviously -- messages.csv."

## Step 6

`--click "File..." --upload messages.csv` -> 06.png

Grace: "It figured out messages is 'an edge' sheet, from and to, and emails as a whole number. Top says '12 nodes, 22 edges' but I have 23 rows -- and it says why right at the bottom: '1 edge row names a node missing from the node rows. Show the 1 unmatched row', with Add and Leave out. That's exactly what I want: tell me which row so I can fix the export. Let me see it. (Also 'Weight: none (each edge counts 1)' -- hm, the emails count isn't the weight? I'll come back to that.)"

## Step 7

`--click "Show the 1 unmatched row"` -> 07.png

Grace: "There it is: line 24, from p11 to p13, 6 emails, 'p13 (no node row)'. p13 isn't on my staff list -- probably someone who left or a contractor. Line 24 in the file is row 24 in Excel too, so I can find it. 'Leave out' looks like it's already the chosen one and the sheet says '23 rows, 1 left out'. I'd rather not invent a nameless person on a board picture, so I'll leave it out and write down 'p11 to p13, line 24' to fix in the export. Load."

## Step 8

`--click "Load"` -> 08.png

Grace: "It's drawn. Title is 'people and messages', and on the right: Nodes 12, Edges 22, 'From 2 files'. Twelve people -- matches Excel. 22 links -- 23 rows minus the p13 one I left out. Arrows, so it's treating emails as going one way, which is right. But there are no names on the dots, so I can't eyeball who's who. Last time Data listed the columns -- let me check that name, team and emails all came through."

## Step 9

`--click "Data"` -> 09.png

Grace: "Sources: 'people.csv and messages.csv, 12 nodes, 22 edges', each file listed, and '1 row left out' with a warning sign -- it kept a record of the one I dropped, good for next quarter. Attributes: nodes have id, name, team; edges have emails. Everything I had in Excel is here. Let me click '1 row left out' to make sure it still tells me which row."

## Step 10

`--click "1 row left out"` -> 10.png

Grace: "Right side: 'Line 24: p13 has no node row; from p11, to p13, emails 6', and Added: Nodes 12, Edges 22. That's a sentence I can act on. One last check: click the busy dot in the middle to make sure it's a real person with a name, not just an id."

## Step 11

`--click-at 774,436` (tool: node with id "p12") -> 11.png

Grace: "Lars Nilsen, Director, degree 6 -- the director in the middle of everything, makes sense. The heading of the panel says 'p12' though, not 'Lars Nilsen'; on a slide or when I'm hunting for someone, the id is useless to me. Everything arrived. I'm done."

## End

`--end tier2/rounds/round-1/sessions/r1-s33`

## Debrief (in character)

- **Finished?** Yes. Both sheets are in as one network, drawn: 12 people (matches Excel's 12 rows) and 22 links. Of the 23 rows in messages.csv, one did not fit: line 24, p11 to p13 (6 emails), because p13 is not in people.csv. I chose to leave it out; the program kept a note of it under Data > Sources, "1 row left out", with the line number.
- **Ease:** 6 of 7. "New from data...", then the plus beside Tables to add the second sheet, worked on the first try, and the counts and the one bad row were spelled out before I pressed Load.
- **What confused me:**
  - "Weight: none (each edge counts 1)" under the messages sheet. My emails column is obviously how strong the tie is, and I didn't see how to make it count. I'd want it to ask, or say how.
  - The selected person's panel is headed with the id ("p12") instead of the name, even though the program knows the name column. Names are also not drawn on the dots after loading.
  - "Add" next to the unmatched row: I wasn't sure whether it would add p13 as a nameless person or something else, so I left it alone.
  - I had to guess between "Open project or file..." (what I used before) and "New from data..." for two sheets; I guessed right, but nothing on the start screen says which one takes two files.
