# Session r3-s51 -- Dana Okafor (supply chain risk analyst), returning user

Every command was run as: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <args>
Screenshots 01.png to 12.png are in this folder.

Task: get people.csv (staff) and messages.csv (who emails whom) in as one network, drawn, check that every person and link arrived, and report what did not fit.

## Step 0 -- start
`--start <session> empty` -> 01.png
The start screen I remember: "Open project or file...", "New from data...", samples, and a usage-data banner at the bottom. There are two files this time; normally I merge them in Excel first. "New from data..." might take two sheets. First I'll get rid of the banner.

## Step 1
`--step <session> --click "No thanks" --click "New from data..."` -> 02.png
"Open as a new graph". A "Tables" list on the left has a plus, so it takes more than one table. Good. "Drop a file here, or choose a file..." is in tiny gray text again. I'll start with the staff list.

## Step 2
`--step <session> --click "choose a file..." --upload people.csv` -> 03.png
It read people.csv as "Nodes: people.csv, 12 rows": each row is a node, id is the Key, and name and team are attributes. All 12 staff are listed, p01 to p12. The footer says "12 node rows read; the load makes 12 nodes and 0 edges." Right so far. Next, the plus next to Tables to add the emails sheet.

## Step 3
`--step <session> --hover-at 271,107` -> 04.png
The tooltip says "Add a table". That's what I want.

## Step 4
`--step <session> --click "Add a table"` -> 05.png
A menu: File..., From a URL..., Paste... . File it is: messages.csv.

## Step 5
`--step <session> --click "File..." --upload messages.csv` -> 06.png
It worked out on its own that this sheet is edges, with from and to, and that emails is a whole number. The header says "people and messages: 12 nodes, 22 edges", but the file has 23 rows. The left list says "23 rows, 1 left out" with a warning triangle, and the footer says "1 edge row names a node missing from the node rows. Add / Leave out / Show the 1 unmatched row". Leave out is selected by default. I'm glad it says so instead of dropping the row silently. Let me see which row.
I also noticed "Weight: none (each edge counts 1)". That's fine for now; I wasn't asked about weights.

## Step 6
`--step <session> --click "Show the 1 unmatched row"` -> 07.png
Line 24: p11 (Kemi Bello) to p13, 6 emails, marked "p13 (no node row)". There is no p13 on the staff list: someone who left, or a contractor. It's my "Tier 2 supplier that's just a name" problem in miniature. I was told every link has to arrive, so I'll Add it rather than lose it, and mention p13 in my notes.

## Step 7
`--step <session> --click "Add"` -> 08.png
Now it says "13 nodes, 23 edges". Both tables have green checks, and messages shows "23 rows" with nothing left out. The footer says "12 node rows and 23 edge rows read; the load makes 13 nodes and 23 edges." The numbers add up: 12 staff plus p13, and all 23 email rows. The p13 row still shows its warning mark, which is honest, since p13 will be a node with no name or team. Direction is "As the file says"; from/to is who emailed whom, so I'll leave it. Load.

## Step 8
`--step <session> --click "Load"` -> 09.png
It's drawn. The title is "people and messages", "From 2 files". Overview: Nodes 13, Edges 23, Directed, 1 component. I count 13 dots on the canvas, with arrows, which matches what the loader promised. But there are no names on the dots, so I can't tell who is who or which one is p13. I'll check the Data place, where I usually look at what loaded.

## Step 9
`--step <session> --click "Data"` -> 10.png
Sources: "people.csv and messages.csv, 13 nodes, 23 edges", with both files under it. Attributes: the nodes have id, name 92% and team 92%; the edges have emails. 92% is 12 of 13, so p13 is the one with no name or team. That's consistent. I want to see the actual list, though, so I'll click "name".

## Step 10
`--step <session> --click "name"` -> 11.png
The summary for name: Has a value 92.31%, Distinct values 12. So all 12 staff names arrived and one node has none. "Kind: Groups" for a name column is odd, because a name isn't a group, but I won't fight it. Last check: find p13 with the search box, the way I'd search for a supplier.

## Step 11
`--step <session> --click "Graph" --click "Find nodes, edges, values" --type "p13"` -> 12.png
The search finds "Nodes 1: p13" and "Edges 1: p11 -> p13", so the extra person and the link to them are in. Nothing on the canvas was highlighted while I searched, and there are still no names drawn on the dots, but all the counts line up. I'm done.


## End
`real.mjs --end <session>` -- session ended.

## In my own words (Dana)

**Did I finish?** Yes. Both sheets went in as one network without merging them in Excel first: 12 staff from people.csv plus p13, and all 23 email rows. The loader, the Overview (13 nodes, 23 edges, 1 component) and the search all agree, and the picture shows 13 dots.

**Ease: 6 out of 7.** That's the first time I didn't have to glue two exports together by hand. The "Add a table" plus did it, and it guessed the edge sheet's from/to columns correctly and said so.

**What didn't fit:**
- messages.csv has one row, line 24, from p11 (Kemi Bello) to **p13**, and p13 isn't on the staff list. The app caught it before loading, said "1 left out", and showed me the row. I chose Add, so p13 is a node with no name and no team (which is why name and team show 92%). Somebody needs to tell me who p13 is.
- It defaults to **Leave out** for that row. If I had clicked Load straight away, I would have lost a link. It did say so on screen, but only in small print at the bottom.

**What confused or bothered me:**
- No names are drawn on the dots after loading. I can't point at Alma or Lars on the picture, and I can't see which dot is p13. Searching for p13 found it in the list but didn't show me where it is on the drawing.
- The "name" column is called "Kind: Groups". A person's name is not a group.
- "Weight: none (each edge counts 1)" sat right under the emails column. I wasn't asked about it, but if I later rank people by email volume, I'm not sure whether the emails number gets used.
- The labels are small and gray: "Each row is", "File settings", the 92% figures. That's hard on the laptop screen.
