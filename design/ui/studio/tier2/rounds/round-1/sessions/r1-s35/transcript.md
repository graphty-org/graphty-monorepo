# Session r1-s35 -- Dana (supply-chain risk analyst, returning), task T4, dataset A (office)

Task as given: two spreadsheets in Downloads, people.csv (the staff) and messages.csv (who emails
whom and how often). Get them into the program as one network, drawn, make sure every person and
every link arrived, and say anything that did not fit.

What I know about my files (I opened them in Excel first, as I always do): people.csv has 12 rows
(id, name, team: p01 Alma Reyes ... p12 Lars Nilsen). messages.csv has 23 rows (from, to, emails),
using the p-numbers. One row, p11 -> p13, points at a p13 who is not on the staff list.

Commands run from design/ui/studio/tool with S=../tier2/rounds/round-1/sessions/r1-s35 and
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/

## Step 1

`node real.mjs --start $S empty` -> 01.png

Start screen, same as always. Usage-data box at the bottom. "Open project or file..." is what I
normally use for my supplier export, but this time I have two sheets. There's a "New from data..."
right under it -- that sounds like building something from more than one file. First I'll get rid
of the usage box.

## Step 2

`node real.mjs --step $S --click "No thanks" --click "New from data..."` -> 02.png

A page "Open as a new graph". Left side says "Tables" with a plus, right side "Drop a file here, or
choose a file...". A "Direction: As the file says" box, and Load is greyed ("Choose a file first").
The grey labels are small, but "Tables" with a plus looks like I can add more than one sheet. Good.
I'll start with the staff list, people.csv, via "choose a file...".

## Step 3

`node real.mjs --step $S --click "choose a file..." --upload people.csv` -> 03.png

It read the staff list: "people: 12 nodes", each row is "a node", id is the "Key", name and team
are "Attribute". The table shows all 12 people, p01 to p12 -- matches my sheet. Bottom line: "12
node rows read; the load makes 12 nodes and 0 edges." Fine so far, it says what it guessed. Now I
need the second sheet. The plus next to "Tables" -- I'll click it and give it messages.csv.

## Step 4

`node real.mjs --step $S --click-at 271,107` (the plus; it is "Add a table") -> 04.png

A little menu: File..., From a URL..., Paste.... File... it is, then messages.csv.

## Step 5

`node real.mjs --step $S --click "File..." --upload messages.csv` -> 05.png

Now two tables on the left: "Nodes: people.csv 12 rows" with a green tick and "Edges:
messages.csv 23 rows, 1 left out" with a red warning triangle. It guessed from/to right. Heading:
"people and messages: 12 nodes, 22 edges". At the bottom: "1 edge row names a node missing from
the node rows. Show the 1 unmatched row Add Leave out". That is exactly my p13 row -- good, it
caught it instead of quietly dropping it. Also it says "Weight: none (each edge counts 1)" and
emails is just an "Attribute" -- I'll come back to that, the email count is the whole point of
"how often". First, show me the unmatched row so I know it is the one I think.

## Step 6

`node real.mjs --step $S --click "Show the 1 unmatched row"` -> 06.png

"1 unmatched row: p13 has no node row" -- line 24, p11 to p13, 6 emails. Exactly the one. It looks
like "Leave out" is the one picked right now (it has the outline). I was told every link has to
arrive, and Kemi really did send those six emails, so I'd rather keep the link and have p13 show up
as an unknown person than lose it. Same as a supplier survey answer that's "just a name": I keep
it and flag it. Click "Add".

## Step 7

`node real.mjs --step $S --click "Add"` -> 07.png

Now "13 nodes, 23 edges", both tables green, "the load makes 13 nodes and 23 edges". 12 people
plus the mystery p13; all 23 rows of messages. That's my count. Now the email numbers: "Weight:
none (each edge counts 1)". If I later rank who matters, a pair that emailed 18 times should count
more than one that emailed twice. The "emails" box says "Attribute" -- I'll open it and see if
"weight" is a choice.

## Step 8

`node real.mjs --step $S --click-at 728,203` (the "emails" role box) -> 08.png

List: From, To, Weight, Date or time, Edge id, Attribute (ticked). "Weight" -- yes. Picking it.

## Step 9

`node real.mjs --step $S --click "Weight"` -> 09.png

"Weight: emails", and a new row "Higher means: Not set | Closer | Farther | Capacity" with a long
grey sentence about paths and PageRank -- I read the first bit: "Choose what a higher weight
means." More emails means two people work closer together. "Closer" it is. (Capacity sounds like
a truck or a warehouse, not email.) The Direction box still says "As the file says" -- emails go
from one person to another, so that's fine; I'm leaving it.

## Step 10

`node real.mjs --step $S --click "Closer"` -> 10.png

"Weight: emails (closer)" and the sentence now reads "A higher weight means a closer tie, such as
more emails between two people." That's my case in their words. Still 13 nodes, 23 edges. Load.

## Step 11

`node real.mjs --step $S --click "Load"` -> 11.png

It's drawn. Title bar now "people and messages", right side "From 2 files", Nodes 13, Edges 23,
Direction Directed, "Loaded weight: emails (closer)", Components 1. Counts match my sheets plus
p13. But the dots have no names on them, so from the picture I can't tell who is who, or which dot
is the stray p13 (probably the lonely one at the top). I trust tables, not pictures: I'll go to the
Data place and check the rows, like I do with my supplier export.

## Step 12

`node real.mjs --step $S --click "Data"` -> 12.png

Data place: Sources "people.csv and messages.csv, 13 nodes, 23 edges", with both files listed
under it. Attributes: Nodes id, name 92%, team 92%; Edges emails. 92% -- that's 12 of 13, so
p13 has no name or team, which is what I'd expect. Not a row-by-row table, though, so I'll use the
search box like I do for a supplier: type p13 and see where it is.

## Step 13

`node real.mjs --step $S --click "Graph" --click "Find nodes, edges, values" --type "p13" --key Enter` -> 13.png

As I guessed: the lonely dot at the top lights up yellow. Right panel: "p13, Node", id p13, Degree
1 -- no name, no team. So the stranger came in and is tied to one person. Now the other way: check
a real person came in with her name and her links. Kemi Bello (p11) is the one who wrote to p13.

## Step 14

`node real.mjs --step $S --click "Find nodes, edges, values" --key Control+a --type "Kemi" --key Enter` -> 14.png

Kemi lights up -- the dot right under p13. Panel: id p11, name Kemi Bello, team Operations, Degree 4. In my sheet Kemi has four rows: with Ines (p09), Jonah (p10), Lars (p12) and p13. Four. So the
name and team came over from people.csv onto the dots that messages.csv made -- the two sheets
really were joined on the p-number, which is the thing I always did by hand with XLOOKUP. Counts
match, the stray row is accounted for, a spot check matches. I'm done.

## End

`node real.mjs --end $S`

## Debrief (in character)

**Did I finish?** Yes. One network from the two sheets, drawn: 13 dots and 23 links. That's all 12
staff plus one extra, p13, and every one of the 23 email rows. Emails are loaded as the weight, and
it says "emails (closer)".

**What didn't fit:** messages.csv line 24 has Kemi Bello (p11) emailing "p13" six times, and there
is no p13 on the staff list. The program flagged it before loading ("1 edge row names a node
missing from the node rows") and showed me the row. I chose Add, so p13 is in the network as a dot
with no name and no team. Someone needs to tell me who p13 is: a leaver, a contractor, or a typo
for p12. Nothing else was off.

**Ease:** 6 of 7. This is the first time I didn't have to merge the two sheets in Excel first. It
guessed the columns right (id as the key, from/to) and said what it guessed. It counted rows and
told me what the load would make before I pressed Load. It caught the orphan row instead of quietly
dropping it. That last part is what earns my trust. My supplier sheets are full of those.

**What confused me or slowed me down:**

- Nothing said whether "Add" or "Leave out" was picked until I'd clicked. The picked one only gets
  a thin outline, and on my laptop screen I'd miss it. I assumed "Leave out" was the default, which
  means the 23rd link would have gone missing if I hadn't looked.
- The emails column came in as a plain "Attribute" with "Weight: none". If I hadn't noticed, every
  ranking afterwards would treat 2 emails the same as 18. I'd want it to at least ask about a
  number column like that. Then the "Higher means: Closer / Farther / Capacity" choice had a long
  grey sentence about PageRank and paths. "Closer" with its example sentence was clear. I don't
  know what "Capacity" would have done.
- After loading, the dots have no names on them, so the picture alone can't tell me who anyone
  is. I had to use the search box and read the side panel to check people one at a time. A plain
  table of the rows that loaded, side by side with my sheet, would let me tick them off the way I
  check things in Excel.
- The grey labels on the import page ("Each row is", "Direction", "Higher means", "text", "whole
  number") are tiny and low-contrast. I'd need my glasses.
- "Direction: As the file says" -- I left it. I'm not sure what else it would have done.

**Still my standing questions:** where the data goes (it says "Local only" and "never uploaded",
which is good to see), and whether I can get this into Power BI.
