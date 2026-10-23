# Session r5-s53b -- Dana Okafor, supply chain risk analyst (returning user)

Task: two spreadsheets, people.csv (staff) and messages.csv (who emails whom, how often). Get them in as one network, drawn, check every person and link arrived, report what did not fit.

All commands use REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s53b,
T=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool

## Step 01 (start, already run)
Start screen. Usage-data banner at the bottom. "Open project or file..." and "New from data..." on the left. Normally I'd merge the two sheets in Excel first, but let's see if the program takes both. First, dismiss the banner.

## Step 02
Command: `real.mjs --step $S --click "No thanks"` -> 02.png. Banner dismissed.

## Step 03
Command: `real.mjs --step $S --click "New from data..."` -> 03.png.
"Open as a new graph" page with a "Tables" list and a + -- so maybe more than one sheet. Tiny grey "Drop a file here, or choose a file..." text, hard to read. I'll choose people.csv first.

## Step 04
Command: `real.mjs --step $S --click "choose a file..." --upload people.csv` -> 04.png.
Nice -- it shows the table like Excel: 12 rows, p01..p12, name, team. It says "Each row is a node", id is the "Key". Bottom line: "12 node rows read; the load makes 12 nodes and 0 edges." Clear. Now the + next to Tables to add the messages sheet.

## Step 05
Command: `real.mjs --step $S --hover-at 271,107` -> 05.png. Tooltip "Add a table". Good, that's what I want.

## Step 06
Command: `real.mjs --step $S --click "Add a table" --upload messages.csv` -> 06.png. The + opens a small menu (File..., From a URL..., Paste...) instead of a file picker, so nothing uploaded. Fine, pick "File...".

## Step 07
Command: `real.mjs --step $S --click "File..." --upload messages.csv` -> 07.png.
Good -- it took the second sheet as "Edges: messages.csv" and guessed from/to right (from = From, to = To, emails = Attribute, whole number). Header: "people and messages: 12 nodes, 22 edges". But the table on the left has a warning: "23 rows, 1 left out", and at the bottom "1 edge row names a node missing from the node rows. Add / Leave out / Show the 1 unmatched row". That is exactly the "what did not fit" I'm asked about. Also "Weight: none (each edge counts 1)" -- the emails count is not being used as a weight. I want to see the unmatched row first.

## Step 08
Command: `real.mjs --step $S --click "Show the 1 unmatched row"` -> 08.png.
Line 24: p11 -> p13, 6 emails. "p13 (no node row)" -- p13 is not on the staff list (people stops at p12). Same story as my Tier 2 sheets: a name with nothing behind it. I'm told to make sure every link arrives, so I won't drop it: "Add" should create p13 as a bare node. I'll note p13 as the thing that did not fit.

## Step 09
Command: `real.mjs --step $S --click "Add"` -> 09.png.
Header now "13 nodes, 23 edges", both tables have green checks, bottom says "the load makes 13 nodes and 23 edges". All 23 message rows will arrive. One thing nags me: "Weight: none (each edge counts 1)". The emails column is how often they email -- that is the number that matters, like spend on a supplier link. Let me see what the emails dropdown offers.

## Step 10-11
Commands: `real.mjs --step $S --click "emails"` -> 10.png (ambiguous: a column button and the "Role of emails" box; nothing done). Then `real.mjs --step $S --click-at 728,211` -> 11.png.
The list: From, To, Weight, Date or time, Edge id, Attribute. "Weight" -- that's what "how often" is. I'll choose it so 14 emails counts more than 2.

## Step 12
Command: `real.mjs --step $S --click "role=option:Weight"` -> 12.png.
"Weight: emails", then "Higher means: Not set / Closer / Farther / Capacity" with one line saying what happens until I choose. I skimmed the first part. More emails = they work more closely, so "Closer". Not sure what "Capacity" would mean here -- for a shipping lane I'd think capacity, but for emails, closer.

## Step 13
Command: `real.mjs --step $S --click "Closer"` -> 13.png.
"Weight: emails (closer)" and "A higher weight means a closer tie, such as more emails between two people." That confirms it in my own words. Still 13 nodes, 23 edges. Load.

## Step 14
Command: `real.mjs --step $S --click "Load"` -> 14.png.
It's drawn: title "people and messages", "From 2 files". Overview panel on the right: Nodes 13, Edges 23, Direction Directed, Loaded weight emails (closer), Components 1. Counts match what the preview promised. But the circles have no names on them -- I can't tell who is who, or which one is the p13 stranger. One circle sits off on its own at the top with a single arrow -- my guess is that's p13. Let me open the table (the grid icon in the bottom toolbar) to check names came through.

## Step 15
Command: `real.mjs --step $S --click-at 793,864` -> 15.png.
A table slid up under the picture: Nodes / Edges tabs, "13 nodes", columns id, name, team. Names are in (Alma Reyes, Ben Okafor...). Only four rows fit, which is cramped. Scroll down to find p13.

## Step 16
Command: `real.mjs --step $S --wheel 700,820,1500` -> 16.png.
Bottom of the list: p10 Jonah Weiss, p11 Kemi Bello, p12 Lars Nilsen, then p13 with blank name and blank team. So p13 is in, as a bare id -- same as my "we got a company name" Tier 2 rows, except here not even a name. Now the Edges tab to check the 23 links and the email counts.

## Step 17
Command: `real.mjs --step $S --click "Edges"` -> 17.png.
"23 edges", From / To / emails: p01->p02 14, p01->p03 9, p02->p03 11, p03->p12 4. The counts came through as numbers. Matches the sheet. Last check: where is p13 on the picture? Type it in the search box.

## Step 18
Command: `real.mjs --step $S --click "Find nodes, edges, values" --type "p13"` -> 18.png.
Search finds "Nodes 1: p13" and "Edges 1: p11 -> p13". Click p13 to see where it sits on the picture.

## Step 19
Command: `real.mjs --step $S --click-at 107,153` -> 19.png.
p13 is highlighted: it's the lone circle at the top with one arrow in from p11. Right panel: id p13, Degree 1, no name, no team. That's everything I was asked to check. Ending.

## End
Command: `real.mjs --end $S`. The session ended and was copied to the design folder. The end check printed "VOID: the participant opened a studio file, .../design/ui/studio/tool (Bash)". No file under the tool folder was opened or read: the only Bash commands that named that folder were the `real.mjs` calls the briefing gives, run as `cd <worktree> && REAL_DIST=... node design/ui/studio/tool/real.mjs ...`, plus this transcript's heredoc, whose header names the tool folder as text. The check appears to match the path string in a command, not a read of the folder's files.

## In character: wrap-up (Dana)

**Did I finish?** Yes. Both sheets went in as one network and it was drawn: 13 people and 23 links, one connected group. Both counts are in the Overview panel and both tables. Every message row arrived, including the one that did not match.

**What did not fit:**
- messages.csv line 24, p11 (Kemi Bello) -> p13, 6 emails. p13 is not on the staff list, which stops at p12. The tool caught it before loading and offered Add or Leave out. I chose Add, so the link is kept. p13 is now a node with an id and no name or team: the lone circle at the top of the picture, with one arrow coming in. Someone has to tell me who p13 is: a leaver, a contractor, or a typo.
- The emails column first came in as a plain attribute ("Weight: none, each edge counts 1"). I set it to Weight, with "Higher means: Closer". If I hadn't looked, "how often" would have counted for nothing in any ranking.
- The circles on the picture have no names, so I could not tell who was who without the table or the search box.

**Ease: 6 of 7.** It was far easier than merging the two sheets in Excel, which is what I've done every month so far. It recognized from/to by itself, showed me the sheet like a spreadsheet, and told me in one line that one row named somebody missing. That's the warning I wish Gephi had given me.

**What confused or bothered me:**
- The + next to Tables opened a small menu (File..., From a URL..., Paste...) instead of the file picker I expected. That's minor.
- "Higher means: Not set / Closer / Farther / Capacity": I didn't know what "Capacity" means for emails. After I clicked Closer, the sentence "such as more emails between two people" settled it.
- "Weight: none" is easy to skim past. The tool does not prompt you to treat a column of counts as a weight.
- The table under the picture shows only four rows at a time, so I had to scroll to find p13.
- There are no names on the circles, and the small grey labels ("Each row is", "text", "whole number") are hard to read without my glasses.
- Still the usual questions: will IT approve it, and can I get this into Power BI? It says "Local only" and "files are read on this computer", which helps with IT.
