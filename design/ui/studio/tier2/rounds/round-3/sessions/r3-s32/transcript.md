# Session r3-s32 transcript (Tom, returning user)

Task: the Strozzi want a message carried to the Pazzi, only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?

All commands are run from the studio worktree as
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs ...`,
with `<session>` = `tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s32` (in the studio worktree).

## Step 1 -- start

Command: `--start <session> setup:florentine-ranked.txt`

01.png: Florentine families is open. Orange balls in a cluster, the biggest dark one in the middle, joined by thin lines. None of the balls has a name on it. On the left: Selection, PageRank (15), Everything. On the right a PageRank panel with Style and Values. A small toolbar at the bottom with a flask, a chart icon, "3D" and a magnifier. My colleague showed me the flask once; that is where the program runs its analyses.

## Step 2 -- open the analysis list

Thought: no names on the balls, so I can't find Strozzi or Pazzi by eye. The flask is where the colleague ran the ranking; maybe there is a "shortest route" in there.

Command: `--step <session> --click-at 680,864` (printed: button "Analyze")

02.png: a list opened with a "Filter analyses" box. Recent: PageRank. Then "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness ... All-pairs distance at the bottom. Lots of "shortest paths" in the descriptions, but these all rank everybody. I want one route, so I will type "path" in the filter box.

## Step 3 -- filter the list for "path"

Command: `--step <session> --type "path"`

03.png: the list narrowed. Under "Find paths and edge sets" there is "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." That is exactly what I want. "Guided route" is grayed out with "Select 2 nodes first". I will click Shortest path.

## Step 4 -- open Shortest path

Command: `--step <session> --click-at 566,768` (printed: option "Shortest path Start here ...")

04.png: a small form: From "Where the path starts", To "Where the path ends", Weight "None", Advanced (closed), and a blue "Find path" button. Weight None is fine -- marriages don't have weights, I just want the fewest families. I'll click into From and type Strozzi.

## Step 5 -- type Strozzi in From

Command: `--step <session> --click "Where the path starts" --type "Strozzi"`

05.png: a suggestion "Strozzi" dropped down under the box. Good, it knows the family. I'll pick it.

## Step 6 -- pick Strozzi

Command: `--step <session> --click-at 557,679` (printed: option "Strozzi")

06.png: From now says Strozzi, and the To box has a blue outline, so I think the cursor moved there by itself. Nothing changed on the picture yet. I'll type Pazzi.

## Step 7 -- type Pazzi in To

Command: `--step <session> --type "Pazzi"`

07.png: the To box took it and offers "Pazzi". I'll pick it.

## Step 8 -- pick Pazzi

Command: `--step <session> --click-at 553,733` (printed: option "Pazzi")

08.png: From Strozzi, To Pazzi, Weight None. "Find path" now has a ring around it, ready. I'll press Find path.

## Step 9 -- Find path

Command: `--step <session> --click "Find path"`

09.png: the route is drawn in black on the picture: five balls joined by thick black lines, the rest still orange. On the left a new row "Shortest path -- 4 hops" above my PageRank row, which is still there. On the right, "Nodes in order": 1 Strozzi, 2 Ridolfi, 3 Medici, 4 Salviati, 5 Pazzi. Summary "Path 5 nodes, 4 edges". "Made with" repeats From Strozzi, To Pazzi, Weight None, "Each edge counts as 1." That is the answer, written out in order, so I don't have to read it off the balls. I'm done.

First answer: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi.

Command: `--end <session>`

--end answered with a further request: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?" Continuing in the same session.

## Step 10 -- flask again for the second route

Thought: same as before. Flask, then Shortest path.

Command: `--step <session> --click-at 680,864` (printed: button "Analyze")

10.png: the list is back, and Shortest path is now at the top under Recent. Handy. Clicking it.

## Step 11 -- Shortest path from Recent

Command: `--step <session> --click-at 566,448` (printed: option "Shortest path The fewest steps ...")

11.png: the empty From/To form again, the old Strozzi-Pazzi route still drawn in black behind it. I'll type Peruzzi in From.

## Step 12 -- type Peruzzi in From

Command: `--step <session> --click "Where the path starts" --type "Peruzzi"`

12.png: "Peruzzi" offered under the box. I'll pick it and then type Ginori, since last time the cursor jumped to To by itself.

## Step 13 -- pick Peruzzi, type Ginori

Command: `--step <session> --click-at 558,679 --type "Ginori"` (printed: option "Peruzzi")

13.png: From Peruzzi, To shows "Ginori" with the suggestion under it. I'll pick it and press Find path.

## Step 14 -- pick Ginori, Find path

Command: `--step <session> --click-at 555,733 --click "Find path"` (printed: option "Ginori")

14.png: a new black route on the right-hand side of the picture. "Nodes in order": 1 Peruzzi, 2 Bischeri, 3 Guadagni, 4 Albizzi, 5 Ginori. Made with: From Peruzzi, To Ginori, Weight None, ran 5:49:24 PM. Still just one "Shortest path -- 4 hops" row on the left, so the Strozzi-Pazzi route I ran first has been replaced, not kept beside it. I had already written the first answer down, so that is fine for me, but nothing told me it would go away. The PageRank row is still there.

Second answer: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.

Command: `--end <session>` -- session ended.

## At the end (in character)

- Did I finish? Yes, both.
  - Strozzi to Pazzi: Strozzi, Ridolfi, Medici, Salviati, Pazzi.
  - Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi, Ginori.
- Ease: 6 out of 7.
- What confused me:
  - None of the balls on the picture has a family name, so I couldn't check the black route against the picture myself. I had to trust the list on the right. That list was clear, but I like to see it on the drawing too.
  - The first list under the flask is long and mostly about "ranking". Every description says "shortest paths", so I wasn't sure which one gives one route until I typed "path" and saw "Find paths and edge sets".
  - The second route quietly took the place of the first. One "Shortest path" row stayed on the left with the new answer in it. If I had wanted both routes up for lab meeting, I wouldn't have known how to keep the first one.
  - Small: after I picked the first family the cursor moved to the To box by itself. That helped, but I only noticed because of the blue outline.
