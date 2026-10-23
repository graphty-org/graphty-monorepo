# Session r2-s25 -- Nadia (returning), T18 prompt A (running club, friends.csv)

Build: frozen build 8f0d5a6f7791 (`.study-builds/tier2-r2d4-8f0d5a6f7/`). Start: setup `friends-ranked.txt`.

Prompt: "You have used this program a few times. Your running club's list, friends.csv, is already
open. Chloe wants to be introduced to Milo through people who already run together. Work out the
chain from Chloe to Milo with the fewest people in between: who is in it, in order, and how many
introductions it takes."

## Steps

### 01 (start)

Command: `REAL_DIST=.../tier2-r2d4-8f0d5a6f7/ node ../tool/real.mjs --start rounds/round-2/sessions/r2-s25 setup:friends-ranked.txt`

What I see: friends.csv open, colored and sized by PageRank, key at top left. No names on the dots.
Left side: find box, Selection, PageRank, Everything. Toolbar at the bottom with four buttons.
Plan: what I always do -- type the name into the find box. Start with Chloe.

### 02

Command: `--step ... --click "Find nodes, edges, values" --type "Chloe"`

What I see: Chloe, one node, four ties: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah.
Nothing lit up on the drawing that I can tell, and there are no names on the dots.
Plan: before I start reading lists one by one, check Milo's end too. If they share someone, done.

### 03

Command: `--step ... --click "Find nodes, edges, values" --key Control+a --type "Milo"`

What I see: Milo's ties: Kofi -> Milo, Lena -> Milo, Milo -> Nora, Milo -> Omar. None of Chloe's four
(Ava, Ben, Dev, Farah) are here, so it is at least two people in between.
Plan: I could go list by list like always, but this is exactly the "how are they linked" job. The
analysis button in the toolbar is where I rank things; let me see if it does chains before I spend
ten minutes writing names down.

### 04

Command: `--step ... --click-at 679,864` (printed: button "Analyze")

What I see: a long list of analyses with a filter box at the top. Degree, Betweenness ("shortest paths
between others"), Closeness, PageRank... All of these rank everyone, that is not what I want.
Plan: type my own word for it into the filter box: "chain".

### 05

Command: `--step ... --type "chain"`

What I see: "chain" found one thing: "Shortest path -- The fewest steps, or the shortest path by
weight, between two nodes." Marked "Start here". Good, the word worked.
Plan: click it.

### 06

Command: `--step ... --click-at 600,812` (printed: option "Shortest path ...")

What I see: a small form. From "Where the path starts", To "Where the path ends", Follow Out / All
(All is on), Weight None ("Each edge counts as 1"). A "Find path" button.
Plan: "Follow: Out / All" -- out of what? I'll leave it on All, since an introduction works either
way. Weight None is what I want: count people, not anything else. Type Chloe in From.

### 07

Command: `--step ... --click "Where the path starts" --type "Chloe"`

What I see: a suggestion "Chloe" dropped down under the box, covering the To box.
Plan: pick Chloe from the suggestion.

### 08

Command: `--step ... --click-at 555,593` (printed: option "Chloe")

What I see: From says Chloe, and the cursor is already in To. Nice, no extra click.
Plan: type Milo.

### 09

Command: `--step ... --type "Milo"`

What I see: suggestion "Milo" under the To box.
Plan: pick it.

### 10

Command: `--step ... --click-at 550,647` (printed: option "Milo")

What I see: From Chloe, To Milo, Follow All, Weight None. Find path has focus.
Plan: click Find path.

### 11

Command: `--step ... --click "Find path"`

What I see: the chain is drawn in black on the picture, and the right side lists "Nodes in order":
Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Summary: "5 nodes, 4 edges". The left list has a new line,
"Shortest path 4 hops". The key at top left now says "On the path".
Answer: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions.
It matches what I saw in the lists: Ava is one of Chloe's ties and Kofi is one of Milo's.
Plan: I'm done. End the session.

### Follow-up given

"Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many
introductions does it take?"

### 12

What I see: the Chloe-Milo chain is still on screen.
Plan: same thing again. Open the analysis button and look for Shortest path.
Command: `--step ... --click-at 679,864`

What I see (12.png): Shortest path is at the top under Recent.
Plan: click it.

### 13

Command: `--step ... --click-at 565,455`

What I see (13.png): the same empty form again, From and To blank, Follow All, Weight None.
Plan: type Ben into From.

### 14

Command: `--step ... --click "Where the path starts" --type "Ben"`

What I see (14.png): suggestion "Ben" under From.
Plan: pick it, then type Nora (the cursor jumped to To last time).

### 15

Command: `--step ... --click-at 549,593 --type "Nora"`

What I see (15.png): From Ben, To shows "Nora" with a suggestion.
Plan: pick Nora, then Find path.

### 16

Command: `--step ... --click-at 551,647 --click "Find path"`

What I see (16.png): a new black chain. Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5.
"5 nodes, 4 edges". From Ben, To Nora.
Answer: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.
I notice the Chloe-Milo chain is gone: there is still only one "Shortest path" line on the left, so
the second one replaced the first one. I already wrote the first one down, so that's fine this time.
Plan: done. End.

### 17

Command: `--end rounds/round-2/sessions/r2-s25`

## In character, at the end

**Did I finish?** Yes, both.
- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions.
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.

**Ease: 6 of 7.** The first one took about two minutes, most of it spent checking both lists myself
first. I would never have found this in the long list of analyses. Typing my own word ("chain") in
the filter box is what got me there. The answer came as a numbered list of names, which is what I
would copy into the file. The second chain took under a minute.

**What confused me:**
- "Follow: Out / All". Out of what? I left it on All because an introduction works both ways, but
  I'd want to know what Out would have given me before I put this in front of QA.
- When I ran the second chain, the first one disappeared without asking. If I'd needed both on one
  picture for the file, I'd have lost the first. I only knew because the left side still showed a
  single "Shortest path" line.
- Nothing on the picture has names, so the black line alone tells me nothing; the list on the right
  is what I trust. For a screenshot in the case file I'd need the names on the dots.
- Odd that "4 hops" is the word on the left and "5 nodes, 4 edges" on the right. I count people and
  introductions. Four of whatever matches four introductions, so I took it.
