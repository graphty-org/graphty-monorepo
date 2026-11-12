# Session r2-s43 -- Dev (returning student), task T4, dataset A (office: people.csv + messages.csv)

Build: tier2-r2d4-8f0d5a6f7 (8f0d5a6f7791). Start: empty.

Commands run from the studio tool folder with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/` and `S=<this folder>`.

Before starting I opened both files in my spreadsheet: people.csv has 12 staff (id, name, team);
messages.csv has 23 rows (from, to, emails). One row is p11 -> p13, and there is no p13 in the
people list. So I expect 12 people, 23 links (or 22 if p13 is dropped, 13 people if p13 is added).

## Step 1 -- start
`node real.mjs --start $S empty` -> 01.png

Okay, same start screen as last time. Usage-data box at the bottom; I'll say no thanks like before.
Under Start there's "Open project or file..." and "New from data...". Last time I just opened my one
spreadsheet. Now I have two. "New from data..." sounds like where you build something from files.

## Step 2
`node real.mjs --step $S --click "No thanks" --click "New from data..."` -> 02.png

Wait, this is a page I haven't seen: "Open as a new graph". There's a "Tables" list on the left with a
plus, "Drop a file here, or choose a file..." in the middle, and Direction "As the file says" at the
bottom, Load greyed out ("Choose a file first"). Tables -- so maybe I can add two? I'll start with the
people file by clicking "choose a file...".

## Step 3
`node real.mjs --step $S --click "choose a file..." --upload people.csv` -> 03.png

Oh nice, it shows the people sheet as a table: "people: 12 nodes", "Each row is a node", id is Key,
name and team are Attribute. All 12 rows are there, p01 to p12. Bottom says "12 node rows read; the
load makes 12 nodes and 0 edges." 0 edges -- right, I haven't given it the messages yet. The left
says "Nodes: people.csv, 12 rows" with a green check. There's a plus next to "Tables"; I'll click it
to add the second sheet.

## Step 4
`node real.mjs --step $S --click-at 271,107` -> 04.png (the plus is "Add a table")

A little menu: File..., From a URL..., Paste... The messages sheet is a file in Downloads, so File...

## Step 5
`node real.mjs --step $S --click "File..." --upload messages.csv` -> 05.png

Oh wait, it figured out on its own that messages is the edges: "Each row is an edge", from = From,
to = To, emails = Attribute (whole number). Title says "people and messages: 12 nodes, 22 edges".
The left list has "Edges: messages.csv, 23 rows, 1 left out" with a warning triangle. Bottom:
"1 edge row names a node missing from the node rows. Add / Leave out / Show the 1 unmatched row",
and Leave out looks like the one picked. That has to be p13, the one I saw in the sheet. Also a line
"Weight: none (each edge counts 1)" -- hmm, the emails count isn't the weight then. The task didn't
ask about weight, so I'll leave it, but I'm noting it. Let me check the unmatched row first.

## Step 6
`node real.mjs --step $S --click "Show the 1 unmatched row"` -> 06.png

There it is: "1 unmatched row: p13 has no node row" -- line 24, p11 to p13, 6 emails. Exactly what I
saw in the sheet. p13 isn't on the staff list, so I don't want a mystery 13th person with no name in
my figure; I'll keep "Leave out" (it's already the white one) and tell you about it. So I expect
12 people and 22 links. Direction "As the file says" -- emails go from someone to someone, fine.
Clicking Load.

## Step 7
`node real.mjs --step $S --click "Load"` -> 07.png

Oh nice, it's drawn! Title is "people and messages". Right side, Values, Overview: Nodes 12, Edges 22,
Direction Directed, Components 1, and "From 2 files" under Graph. I count 12 dots on the canvas, with
arrows. 12 and 22 matches what I worked out from the sheets once p13's row is left out. But the dots
have no names, so I can't tell yet that they're actually my people and not just p01..p12. "From 2
files" is blue, like a link -- I'll click it to see what it says it loaded.

## Step 8
`node real.mjs --step $S --click "From 2 files"` -> 08.png

It jumped to the Data tab: Sources, "people.csv and messages.csv, 12 nodes, 22 edges", then people.csv,
messages.csv, and "1 row left out" with the warning sign. Attributes: nodes have id, name, team; edges
have emails. So the names and teams came in. Good -- that's my proof for the instructor. Let me click
the dot in the middle that everything points to, to see if it shows a name (I bet it's Lars, the
director).

## Step 9
`node real.mjs --step $S --click-at 774,436` -> 09.png (node with id "p12")

It's p12: name Lars Nilsen, team Director, Degree 6. Checking against my sheet: Lars shows up in
p03-p12, p01-p12, p04-p12, p06-p12, p11-p12 and p10-p12 -- that's 6. It agrees. So the people sheet
and the messages sheet got joined up by the id, which is what I needed. I'm done with what was asked.

`node real.mjs --end $S`

## At the end (in character)

**Did I finish?** Yes. Both sheets are in as one network, and it's drawn: 12 people, 22 links. I
checked the counts against my own count from the sheets and one person's links (Lars, 6) by hand.

**What did not fit:** one row in messages.csv, p11 (Kemi Bello) to p13, 6 emails. There's no p13 in
people.csv. The program caught it before loading and said so ("1 edge row names a node missing from
the node rows"), showed me the exact row, and let me pick Add or Leave out. I left it out, since p13
isn't on the staff list; so 23 rows in the sheet became 22 links. The Data tab still says "1 row left
out" afterwards, which is good for showing my instructor.

**Ease:** 6 out of 7.

**What confused me or slowed me down:**
- "New from data..." vs "Open project or file..." -- I guessed right, but last time I used "Open"
  for my one sheet, and I wasn't sure which one handles two sheets until I saw "Tables" and the plus.
- The plus next to "Tables" has no words on it; I only knew it was "Add a table" after clicking.
- "Weight: none (each edge counts 1)" under the messages table. I have an emails count right there,
  so I wondered if I was supposed to make that the weight. Nothing told me whether that matters
  for "every link arrived". I left it.
- When I click a person, the panel's heading says "p12", not "Lars Nilsen"; the name is only a row
  below. And the dots have no names on the drawing, so to check people arrived I had to click them
  one at a time.
- I didn't know what "Direction: As the file says" would do until after loading (it said Directed).
