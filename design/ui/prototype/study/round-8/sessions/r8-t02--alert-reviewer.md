# Session: get a sample on screen -- Nadia, level-1 alert reviewer

Task as given by the moderator: "You have just installed this program to see whether it could
help with your work, but your own data is not ready yet. Before you spend time on your own file,
you would like to see the program working on something. Get something onto the screen to try it
on, and tell us what it is."

Start screen: shots/tasks/r8-t02/01.png. Renders are in
tmp/round-8-sessions/r8-t02--alert-reviewer/. All commands were run from
design/ui/prototype/.

## Step 0 -- the start screen (shots/tasks/r8-t02/01.png)

"OK. Open project, New from data, drop a file. Mine isn't ready, so not those. On the right,
Samples. Les Miserables, karate club, proteins... and 'Card and transfer transactions, 3,000
accounts. A month of money moving between accounts. Good for following money, finding rings.'
That's the one that looks like my job. Obviously that's the one I'd try.

There's a big box at the bottom asking to collect usage data. The bank laptop would block it
anyway. No thanks."

## Step 1 -- dismiss the banner, click the transactions sample

    timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--alert-reviewer/01.png task:r8-t02 --click "No thanks" --click "Card and transfer transactions"

"Something loaded. A graph, orange dots, lines. But the top says 'Les Miserables'. And the
labels are Valjean, Javert, Cosette, Fantine. Those are book characters, not accounts. I clicked
the bank one. Did I click the wrong row? The rows are close together but I'm sure I clicked the
transactions name."

## Step 2 -- try again, clicking the description line instead

    timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--alert-reviewer/02.png task:r8-t02 --click "No thanks" --click "A month of money moving between accounts"

"Same thing. Les Miserables again. So it is not me mis-clicking."

## Step 3 -- try without dismissing the banner first

    timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--alert-reviewer/03.png task:r8-t02 --click "Card and transfer transactions"

"Maybe the banner was in the way. No -- identical screen. Les Miserables, 77 of something.
Every time."

## Step 4 -- open the menu under the name at the top, looking for a way to switch samples

    timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--alert-reviewer/04.png task:r8-t02 --click "No thanks" --click "Card and transfer transactions" --click "Les Miserables"

"A file menu. Rename, Open, Save, Export, Version history, Close project. Nothing that says
samples. The right side changed to a summary: 77 nodes, 254 edges, 'from miserables.gexf'. So
it really is the book file. Close project, I guess, and go back."

## Step 5 -- close the project

    timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--alert-reviewer/05.png task:r8-t02 --click "No thanks" --click "Card and transfer transactions" --click "Les Miserables" --click "Close project"

"Back at the start. Now under Recent projects it says 'Les Miserables, 77 nodes, Card and
transfer transactions sa...'. So it thinks the transactions sample IS Les Miserables? Either the
name is wrong or the file is wrong. I don't know which one to believe. I've already spent longer
on this than on one alert. I'm stopping."

## What I would tell the moderator it is

"It's a picture of the characters in Les Miserables -- who appears with who, I think. Valjean in
the middle, everyone colored orange by something called PageRank. It's not what I asked for. I
clicked the card and transfer one three times and got the book every time, and the recent list
labels the book as the transactions sample."

## Wrap-up

- Did I succeed? "Half. Something is on the screen and I can tell you what it is. But it is not
  the thing I picked, and I couldn't get the thing I picked."
- Single Ease Question (1-7): 3. "Getting a picture was one click. Getting the right picture
  never happened."
- Would I use this instead of my current tool? "No. I don't have a graph tool -- the case
  system and a spreadsheet. If the bank sample opens a novel, how would I trust it to open my
  alert's file? And when it did open, the first screen had a list of twenty things on the left --
  Louvain, Shortest paths, Watchlist, For the report -- before I'd done anything. I wouldn't know
  which of that is the data and which is somebody's worked example. For one alert I need the
  account, its transfers and the amounts. I didn't see any of that."

## Problems observed

1. Clicking "Card and transfer transactions" (by name, by description, with or without the
   banner) opens Les Miserables every time. Severity: high -- the only sample in her field could
   not be reached.
2. Recent projects then lists the opened project as "Les Miserables, 77 nodes, Card and transfer
   transactions sa...", contradicting itself. Severity: medium -- she cannot tell what she
   actually opened.
3. The file menu under the project name has no way back to the samples except Close project.
   Severity: low.
4. The opened sample arrives full of pre-made worked examples (measures, groups, paths, notes)
   with no sign of which rows are data and which are added; she cannot tell what she is looking
   at. Severity: medium.
5. The usage-data banner covers the lower half of the start screen on first launch. Severity: low.
