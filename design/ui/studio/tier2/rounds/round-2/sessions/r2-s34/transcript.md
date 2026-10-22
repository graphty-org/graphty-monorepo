# Session r2-s34 -- Grace (returning), task T21, prompt B (team)

Participant: Grace, nonprofit data person, back after about six weeks. Task: the team list was
updated (team-v2.csv, two people joined); put the new list in place of the old one without losing
the work, redo the ranking, and say how many people the team has now, who was first before, and
who is first now.

Commands run from `design/ui/studio/tier2`, with
`S=rounds/round-2/sessions/r2-s34` and
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7`.

## Steps

### Start

`REAL_DIST=... ../tool/with-browser.sh node ../tool/real.mjs --start $S setup:team-ranked.txt`

(Waited for a free browser slot: all four machine-wide slots were in use.)
Output: build 8f0d5a6f7791; `01.png`.

### 01.png
Grace: "Okay, there's my team map from before -- team.csv, a PageRank run with 12 next to it, big
brown dots. Before I touch anything I want to write down who was first. The right side has Style
and Values; Values is where I read the top people last time."

### Step 2
`node ../tool/real.mjs --step $S --click Values`

### 02.png
Grace: "Top 10: Hal first at 0.1293, then Ida, Di, Jo, Ed. 12 of 12 have a value, so 12 people now.
Writing that down: before = Hal. Now I need to put team-v2.csv in. Data is where my file's columns
were listed last time -- I'll look there for something about the file."

### Step 3
`node ../tool/real.mjs --step $S --click Data`

### 03.png
Grace: "Sources -- team.csv, 12 nodes, 16 edges. That's my file. Excel had 16 rows, so that matches.
If I click on the file, maybe it lets me swap in the newer one."

### Step 4
`node ../tool/real.mjs --step $S --click team.csv`

### 04.png
Grace: "A table of my rows opened at the bottom, and the right side says team.csv, Source, Loaded 12
nodes 16 edges. There's a three-dot menu next to team.csv on the right. That's usually where the
'do something with this file' options hide."

### Step 5
`node ../tool/real.mjs --step $S --click-at 1419,73`

### 05.png
Grace: "'Replace with file...' -- that is exactly what my manager's email is asking me to do. I'll
pick it and give it team-v2.csv."

### Step 6
`node ../tool/real.mjs --step $S --click "Replace with file..." --upload team-v2.csv`

### 06.png
Grace: "A full page: 'Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21.' That's what I
expected -- two new people, five new ties, 21 rows. 'Higher means: Not set' -- last time the run
said it assumed a higher weight means closer, and this note says PageRank reads it as closer
until I choose. I didn't pick anything last time, so I'll leave it the same so before and after
are comparable. Direction 'As the file says', fine. Replace."

### Step 7
`node ../tool/real.mjs --step $S --click Replace`

### 07.png
Grace: "Nodes 14, edges 21 -- matches the 21 rows and two new people. My colors and sizes are still
on; the two new people are the blue dots, I guess because they have no number yet. The key says
'PageRank, out of date' and the PageRank row has a little clock-arrow icon, still showing 12. So I
need to redo it. I'll click PageRank on the left."

### Step 8
`node ../tool/real.mjs --step $S --click PageRank`

### 08.png
Grace: "'Data changed since this run' with a blue Rerun button. The old top 10 is still showing
(Hal first), which is good -- that's my 'before'. Rerun."

### Step 9
`node ../tool/real.mjs --step $S --click Rerun`

### 09.png
Grace: "Done. 'ran Oct 9, 8:39:04 PM', 14 of 14 have a value, and the PageRank row says 14. New
top 10: Di first at 0.1339, Hal second at 0.1305, then Ed, Ida, Jo. The blue dots are orange now,
and my sizes and colors stayed on. That's everything I was asked for, so I'm stopping."

### End
`node ../tool/real.mjs --end $S`
Output: `session ended`.

## Debrief (in character)

**Did I finish?** Yes. The team has 14 people now (14 nodes, 21 ties, matching the 21 rows in the
new sheet). Before, Hal was first (0.1293). Now Di is first (0.1339), with Hal a close second
(0.1305).

**Ease: 6 of 7.** Eight clicks, no dead ends. Data, the file, its three-dot menu, "Replace with
file..." -- each step was where I'd guess. The replace page told me "was 12 nodes, 16 edges; now
14, 21" before I said yes, which is exactly the check I'd do in Excel. Afterward the key said
"out of date", the run said "Data changed since this run", and Rerun was right there. My sizes
and colors stayed on, and the old top 10 stayed up until I reran it, so I could write down the
"before".

**What confused me or slowed me down:**
- Getting to "Replace" took a guess. It sits in a three-dot menu on the right side, and only after
  I clicked the file under Sources. Nothing on the main screen says "new version of this file?",
  and if I hadn't gone to Data first I'd have tried "Open project or file" and wondered if that
  starts a new project.
- "Higher means: Not set" on the replace page made me stop and think. The sentence under it helped
  (PageRank reads a higher weight as closer until you choose), and the run's "Made with" said the
  same thing, so I left it alone to keep before and after comparable. But I had to read two
  places to be sure that leaving it alone wouldn't change my numbers.
- The two new people showed up as blue dots before the rerun. I guessed it was because they had
  no number yet, but nothing said so. "Out of date" is in small print in the key.
- The new people's names (Mo and Nia) weren't in the top 10, so I never actually saw them by
  name. For the board I'd want to check they're there; I'd have searched for them next.
- The clock-arrow icon on the PageRank row didn't say anything by itself; it was the panel that
  explained it.
