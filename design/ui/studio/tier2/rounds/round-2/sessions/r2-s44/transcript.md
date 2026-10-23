# Session r2-s44 -- Elena (returning), task T4, dataset B (football: players.csv + passes.csv)

Build: 8f0d5a6f7791 served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/

Prompt: "You have used this program a few times, always on a single list. Your Sunday football team's
coach keeps two spreadsheets, both in your Downloads folder: players.csv lists the squad, and
passes.csv counts the passes between players in last week's match. Get them into the program as one
network, drawn, and make sure every player and every pass arrived. Tell us anything that did not fit."

## Steps

### 1. Start
`REAL_DIST=... with-browser.sh node tool/real.mjs --start tier2/rounds/round-2/sessions/r2-s44 empty` -> 01.png

I see the start screen I remember: Open project or file, and a new one, "New from data...". There is a
usage-data box at the bottom; I will say no thanks first.

### 2. Dismiss usage prompt
`--click "No thanks"` -> 02.png

Last time I only ever opened one thing. "New from data..." is new to me, and it sounds like making a
network out of my own spreadsheets, so I will try that before "Open project or file".

### 3. New from data
`--click "New from data..."` -> 03.png

A page called "Open as a new graph" with a "Tables" list on the left (empty, a + next to it) and
"Drop a file here, or choose a file...". "Tables" plural suggests I can add more than one. I will
choose players.csv first.

### 4. Choose players.csv
`--click "choose a file..." --upload players.csv` -> 04.png

It read players.csv as "Nodes: players.csv, 10 rows", each row is "a node", id is the Key. All ten
players show in a table, Ana Torres to June Kaur. The bottom line says the load makes 10 nodes and 0
edges -- right, I have not given it the passes yet. I will press the + next to Tables to add the
second spreadsheet.

### 5. Add a table
`--click-at 271,107` (the + is "Add a table") -> 05.png

A small menu: File..., From a URL..., Paste... I pick File... and give it passes.csv.

### 6. Add passes.csv
`--click "File..." --upload passes.csv` -> 06.png

Now it says "players and passes: 10 nodes, 17 edges", and passes.csv shows a warning triangle: "18
rows, 1 left out". At the bottom: "1 edge row names a node missing from the node rows" with Add /
Leave out (Leave out is picked) and "Show the 1 unmatched row". That is exactly the "did not fit"
thing I am asked about. Also: "Weight: none (each edge counts 1)" -- hmm, the passes number is just
an attribute. I want to see the odd row first.

### 7. Show the unmatched row
`--click "Show the 1 unmatched row"` -> 07.png

Line 17: from s04 (Dina Moss) to s11, 3 passes, "s11 (no node row)". The squad list stops at s10, so
s11 is someone not on the coach's list -- maybe a sub. I was asked to make sure every pass arrives,
so I will choose "Add" rather than leaving it out, and tell them s11 has no name.

### 8. Add the missing player
`--click "Add"` -> 08.png

Now it says 11 nodes, 18 edges, and both tables have a green check. Good: 18 rows in passes.csv, 18
edges. Before loading, "Weight: none (each edge counts 1)" bothers me a bit -- the passes column is the
whole point of the coach's sheet, 17 passes is not the same as 3. I will open the passes dropdown to
see what else it could be.

### 9. (tool miss)
`--click "passes"` -> 09.png -- ambiguous between the column header button and the "Role of passes"
dropdown; nothing happened. I meant the dropdown under "passes" that says Attribute.

### 10. Role of passes
`--click "Role of passes"` -> 10.png

Options: From, To, Weight, Date or time, Edge id, Attribute (checked). Given the line "Weight: none
(each edge counts 1)" right below, Weight must mean how much a link counts. The number of passes is
how much the link counts, so I will pick Weight.

### 11. passes as Weight
`--click "Weight"` -> 11.png

Now "Weight: passes", and a new question "Higher means": Not set, Closer, Farther, Capacity. The
sentence underneath talks about paths and "PageRank and communities" -- that is jargon to me, I skim
it. But in plain terms, two players who pass a lot are closer, more connected. I will pick Closer.

### 12. Higher means Closer
`--click "Closer"` -> 12.png

"Weight: passes (closer)" and a plain sentence: "A higher weight means a closer tie, such as more emails
between two people." Emails, not passes, but I get it. Summary still says 11 nodes and 18 edges. I
leave Direction "As the file says" alone and press Load.

### 13. Load
`--click "Load"` -> 13.png

It is drawn: the title is "players and passes", and the right side says Graph "From 2 files", Nodes 11,
Edges 18, Direction Directed, Loaded weight "passes (closer)", Components 1. I count 11 dots. The dots
have no names on them, though. I want to check the extra one, s11, is there; I remember the find box,
so I will type s11 into it.

### 14. Find s11
`--click "Find nodes, edges, values" --type "s11"` -> 14.png

Found: Nodes 1 "s11", Edges 1 "s04 -> s11". So the extra player and the 3 passes arrived. Everything is
shown by code (s04), not by name, which is a bit annoying. Let me check the names came across too: I
will search for Ana.

### 15. Find Ana
`--key Control+a --type "Ana"` -> 15.png

"s01, name: Ana Torres". So the names from players.csv are on the players; they just are not written on
the dots. Ten named players plus s11, 18 links, matching 18 rows in passes.csv. I am done.

### 16. End
`node tool/real.mjs --end tier2/rounds/round-2/sessions/r2-s44`

## In character, at the end

**Did I finish?** Yes. Both spreadsheets went in as one network and it is drawn: 11 players and 18
passing links, "From 2 files", with the pass counts used as how strong each link is. players.csv had
10 rows and passes.csv 18 rows; every row arrived.

**What did not fit:** one row in passes.csv (line 17, Dina Moss s04 to "s11", 3 passes) names a player
who is not on the squad list. The program caught it before loading and asked me Add or Leave out; I
chose Add, so s11 is in the drawing with no name or position. The coach should say who s11 is.

**Ease:** 6 out of 7.

**What confused me:**
- "New from data..." was a lucky guess; nothing said "two spreadsheets" until I saw "Tables" and its
  small + button, which has no words on it.
- The passes column came in as just an "Attribute", with "Weight: none (each edge counts 1)". I had to
  think of opening that dropdown myself to make 17 passes count more than 3. "Weight" and then "Higher
  means: Closer / Farther / Capacity" were new words; the first explanation mentioned paths, PageRank
  and communities, which I skipped. Once I picked Closer the sentence was plain, though it talks about
  emails, not my passes.
- After loading, the dots have no names on them, and the find box shows codes (s04 -> s11) first and
  the name second. I could not glance at the drawing and see who is who.
- It says "Directed" -- fine for passes, but I never chose that; it just happened.
