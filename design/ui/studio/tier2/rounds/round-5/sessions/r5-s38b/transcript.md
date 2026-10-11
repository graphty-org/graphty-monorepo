# Session r5-s38b -- Dev, returning (replace team.csv with team-v2.csv, redo the ranking)

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and
`S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s38b`.

## 01 (arrived)

Okay, my team project is open: "Graph team.csv", a PageRank row with 12 next to it, big brown dots, no names. Before I swap the file I need to know who was first. The PageRank panel has a "Values" tab -- that's probably the ranking list. Trying that.

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Values"` -> 02.png

## 02

Oh nice, "Top 10": Hal 0.1293 is first, then Ida 0.1224, Di 0.1177. "12 of 12 have a value", so the old team is 12 people. Writing that down: before, Hal was first. Now to swap in team-v2.csv. Last time I opened files from the menu, so I'll open the main menu (the three lines top left) and look for something like replace or open.

Command: `--click "Main menu"` -> 03.png

## 03

Menu: New project, Open project or file..., Open sample, Save... No "Replace" here. I'm nervous that Open will throw away my project, but it's the door I used before. I'll try "Open project or file..." and pick team-v2.csv, and see whether it asks me anything.

Command: `--click "Open project or file..." --upload team-v2.csv` -> 04.png

## 04

Wait -- it didn't throw my project away, it opened "Add to team". Good. Top line: "team: 12 nodes, 16 edges; team-v2 adds 0 nodes, 16 edges". Zero nodes? My manager said two people joined. Bottom: "5 edge rows name 2 nodes missing from the node rows" with "Add" / "Leave out", and Leave out is the one pressed. That has to be the two new people -- so it's leaving them out by default. Also a warning: "16 edges in this file are already in team. Load adds them a second time." So plain Load would double everything; there's a "Replace team.csv" button, which is literally what I was asked. First I'll press "Add" so the two new people come in.
(Side note: "missing from the node rows" confused me -- my file has no node rows, it's just a list of links.)

Command: `--click "Add"` -> 05.png

## 05

Now it says "team-v2 adds 2 nodes, 21 edges" and the table has a green check. "the load makes 14 nodes and 37 edges" -- 37 is wrong, that's old plus new stacked. That's the Load button. I want the new list in place of the old one, so "Replace team.csv". The weight "Higher means: Not set" -- my old ranking also said "assumed a higher weight means closer", so I'll leave it the same as before so the comparison is fair. Clicking "Replace team.csv".

Command: `--click "Replace team.csv"` -> 06.png

## 06

"Replace: team-v2.csv -- Was 12 nodes, 16 edges; now 14, 21." That's exactly right: 14 people, 2 new. "the load makes 14 nodes and 21 edges", no doubling warning anymore. Pressing the blue "Replace".

Command: `--click "Replace"` -> 07.png

## 07

Graph now says team-v2.csv. Two blue dots -- the new people, not colored because they weren't in the old ranking. My PageRank layer is still there, and the panel says "Data changed since this run" with a blue "Rerun" button, and the key says "PageRank, out of date". Very clear. Clicking "Rerun".

Command: `--click "Rerun"` -> 08.png

## 08

Oh nice, that's it. PageRank row now says 14, "14 of 14 have a value", ran 10:35:25. Top 10: Di 0.1339 first, Hal 0.1305 second, Ed 0.1245. Hal dropped to second. Made with: PageRank, weight read as closer, same as the old run, so it's apples to apples. All dots are colored again, sizes kept. I'll save so I don't lose this -- Main menu has Save (Ctrl+S).

Command: `--key Control+s` -> 09.png

## 09

"Save team as", name "team". Fine (it's "Local only", so I guess it hadn't been saved to a file in this browser yet). Clicking Save.

Command: `--click "Save"` -> 10.png

## 10

"Saved team in this browser." Done. Ending the session.

Command: `--end` -> session ended.

## Wrap-up (in character)

**Did I finish?** Yes.

- The team has **14 people** now (it was 12).
- **Before:** Hal was first (PageRank 0.1293).
- **Now:** Di is first (PageRank 0.1339). Hal is second (0.1305).

My ranking layer, its colors and sizes all stayed, and the project is saved in the browser.

**Ease:** 6 out of 7.

**What confused me:**
- "Open project or file..." opened an "Add to team" screen. I was relieved, but it never said it would add to my work and not replace it until I read the heading.
- On that screen, the two new people were left out at first. The top line said "adds 0 nodes", and "Leave out" was already pressed. The line that explains it says "5 edge rows name 2 nodes missing from the node rows". My file is only a list of links and has no node rows, so I only worked out that these were the two new people because my manager told me two had joined. If I hadn't known, I'd have loaded a team with nobody new in it.
- The difference between "Load" and "Replace team.csv" only became clear after I read the warning that Load would add the 16 edges a second time. "Replace" is the word I was looking for, so that part was easy once I spotted it.
- After the swap, the two new people showed up as blue dots, and "Data changed since this run" with a "Rerun" button appeared right where my ranking is. That was very clear. Same with "out of date" in the key.
- After the rerun, "Made with" showed that it used the same settings as before (weight read as closer), so I can tell my manager the comparison is fair.

My sentence: "The updated team has 14 people. Hal ranked first by PageRank before (0.129); on the new list Di ranks first (0.134) and Hal is second (0.131)."
