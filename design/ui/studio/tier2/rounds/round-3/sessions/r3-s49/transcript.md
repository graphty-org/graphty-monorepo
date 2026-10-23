# Session r3-s49 -- Explorer Elena, returning user

Task: get people.csv (staff) and messages.csv (who emails whom) into the program as one network, drawn, and make sure every person and every link arrived. Tell us anything that did not fit.

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ (commit 26f3bb968)

Every command is `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <args> <session folder>`, with the arguments shown in each step below.

## Steps

### 01 -- `--start empty`
The start page again. Open project or file, New from data, samples on the right, and the "help us" box at the bottom. I'll say No thanks to that first.

### 02 -- `--click "No thanks"`
Box gone. Start screen. I have two spreadsheets, so "New from data..." sounds more like me than "Open project".

### 03 -- `--click "New from data..."`
"Open as a new graph". A "Tables" list on the left with a plus, and "Drop a file here, or choose a file..." Tables, plural -- good, maybe it takes both. I'll choose people.csv first.

### 04 -- `--click "choose a file..." --upload people.csv`
It shows my staff list: 12 people, "Each row is a node". Bottom says "12 node rows read; the load makes 12 nodes and 0 edges." Zero edges, right, the emails are in the other file. There's a plus next to "Tables" -- I'll try that for messages.csv.

### 05 -- `--click-at 271,107` (the plus: "Add a table")
A little menu: File..., From a URL..., Paste... File it is.

### 06 -- `--click "File..." --upload messages.csv`
Both files are in the list now. Heading: "people and messages: 12 nodes, 22 edges". Wait -- my messages file has 23 rows. The left list says "23 rows, 1 left out" with a warning triangle. At the bottom: "1 edge row names a node missing from the node rows. Add / Leave out" and "Leave out" is the one picked. Probably I exported something wrong. Let me see which row it is.

### 07 -- `--click "Show the 1 unmatched row"`
Line 24: Kemi (p11) emailed "p13", and p13 has "no node row". So somebody is in the emails who is not on the staff list -- maybe someone who left, or a contractor. I don't want to lose that link; I was asked to make sure every link arrives. "Add" sounds like it keeps it. I'll press Add.

### 08 -- `--click "Add"`
Now it says 13 nodes, 23 edges, and both tables have green ticks. 12 people plus the mystery p13, and all 23 email rows. The row still has the red "(no node row)" mark, but the numbers add up. There's also "Weight: none (each edge counts 1)" -- not sure what that means, I'll leave it. Load.

### 09 -- `--click "Load"`
Ooh, there it is -- dots and arrows. Right side says Nodes 13, Edges 23, "From 2 files". That matches what the loading screen promised. No names on the dots though. Some dots are bigger -- the big one way up at the top on its own, I bet that's Lars, the director, he's the big one. I'll click it to see.

### 10 -- `--click-at 895,118` (prints: node with id "p13")
Oh -- it's not Lars, it's p13, the one who wasn't on the staff list. Just "id p13, Degree 1". OK so the one off on its own is the stranger, that makes sense. It looked big because... I don't know, it's closer? Let me click the dot it's tied to, should be Kemi, and check the names from people.csv came along.

### 11 -- `--click-at 918,338` (prints: node with id "p11")
Kemi Bello, Operations -- the name and team came through from people.csv. Good, so the two files really got joined. Degree 4 with a little arrow; last time I read someone's connections on the right, I think that's the arrow. I want to see the email counts are on the links too.

### 12 -- `--click-at 1411,268` (the arrow beside Degree)
"p11 and 4 connections": p09, p10, p12, p13. Just the codes, not the names -- I'd have to remember p09 is Ines. And the left now says Selection 5, so it grabbed all five. No email counts here. Let me click the line from Kemi up to p13 and see if it says 6 emails.

### 13 -- `--click-at 906,230` (prints: edge with id "22")
The line lights up blue: "p11 -> p13, emails 6". That's exactly line 24 from the file. So the email counts came along too. 13 dots, 23 lines, names on the people, the stranger kept. I think that's everything. I'm done.

### 14 -- `--end`
Session ended.

## At the end, in character

**Did I finish?** Yes. Both files went in as one network: 13 dots (my 12 staff plus "p13") and 23 lines, the same 23 rows as messages.csv. Names and teams showed up when I clicked a person, and the email count showed up when I clicked a line.

**Ease: 6 out of 7.**

**What did not fit, and what confused me:**
- messages.csv names somebody, p13, who isn't in people.csv. The program caught it before loading and showed me the exact row (line 24, Kemi to p13), which was great. But "Leave out" was already picked, so if I had just pressed Load I'd have lost a link without noticing. I only saw it because the heading said 22 when I knew there were 23 rows.
- p13 came in with no name and no team, just the code. Fine, but on the picture it looks like any other person.
- The dots have no names on them. I had to click each one to find out who it was. I guessed the big dot at the top was the director, and it was actually p13.
- Kemi's connections list shows p09, p10, p12, p13 instead of people's names, even though the names are in the data.
- "Weight: none (each edge counts 1)" on the loading screen -- I didn't know what that meant or whether I should have picked my emails column for it.
- Clicking the arrow next to Degree selected all five people. I didn't mean to select anything; I only wanted to read the list.
