# Session: find the circles of characters in Les Miserables -- intelligence analyst (Marcus)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--intelligence-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

"No signup page, good. 'Files are read on this computer and never uploaded', and 'Local only' up
top. That's the first thing I'd ask, so fine. There's a box at the bottom asking me to share usage
data. No. Les Miserables is on the right under Samples, 77 characters. 'Good for a first look at
communities.' That's me."

## Step 2 -- decline usage data, open Les Miserables (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

"A lot on the screen. All orange dots, no icons, so it's not a link chart the way I'd draw one, but
it's a novel so fine. The list on the left already has 'Louvain -- 6 groups' in it. I don't know
what a Louvain is, but '6 groups' is the word I'd use. Looks like somebody already ran it. There's
also a 'For the report' folder with 'Group 2, 14 nodes' and 'Group 8, 13 nodes'. Hold that
thought."

## Step 3 -- click Louvain (03.png)

    ... --click "No thanks" --click "Les Miserables" --click "Louvain"

(The tool reported the name matched two controls -- a "Louvain" tab under the chart and the
"Louvain" row in the list -- and clicked the tab.)

"A table came up under the chart: '6 communities'. Community 1 is 25, Community 2 is 17, then 10,
10, 9, 6. So: six circles, biggest is 25. But on the left it says Group 2 has 14 and Group 8 has 13.
Group 8, when there are six? Which one's lying? And the chart is still all orange. It doesn't show
me the groups."

## Step 4 -- click Community 1 (04.png)

    ... --click "Louvain" --click "Community 1"

"Right side: Community 1, size 25 nodes, Hub: 'Gavroche, 16 links inside'. That's the answer to the
center question, I think -- hub, the guy with the most links inside the group. But the table at the
bottom switched to all the people. It shows Valjean in group '2' with a yellow-orange chip, the
same color Community 1 has, and Gavroche in group '8' with a light blue chip, the color Community 2
has. So is Gavroche in Community 1 or not? Colors say one thing, the panel says another."

## Step 5 -- click the hub link (05.png)

    ... --click "Community 1" --click "Gavroche, 16 links inside"

"It circled Gavroche on the chart, in that tight knot with Enjolras, Bossuet and Courfeyrac.
That's the student crew, the one I'd guess is Community 2 at 17. The right panel now tells me why
he's orange. I didn't ask that. I asked what group he's in."

## Step 6 -- try the Data tab on the right (06.png)

    ... --click "Gavroche, 16 links inside" --click "Data"

(Two controls are called "Data": the large Data button on the far left and the Data tab on the
right panel. The tool clicked the far-left one.)

"Wrong Data. It hit the big button on the left and threw away my Gavroche selection. By accident
it's useful though: under Attributes, 'group' is something that came in the file, and 'Louvain'
is listed separately under 'Results'. So that 'group 2 / group 8' column is the book file's own
grouping, not what the program found. That explains it. But I've got two different 'groups' on
one screen and the table never said which was which. On a real case I'd have briefed the wrong
one."

## Step 7 -- try to see Community 1's member list (07.png)

    ... --click "Louvain" --click "Community 1" --click "Show in table"

"Under Members it said 'Louvain ranks no members. Show in table.' I click it and get all 77
people sorted by degree, and the right side flips back to the whole graph. That's not Community
1's roster. Either it did nothing or it dropped what I'd picked. Strike one."

## Step 8 -- look for where you run it yourself (08.png, 09.png)

    ... --click "No thanks" --click "Les Miserables" --hover "Analyze"
    (tooltip: "Analyze Shift+A")
    ... --click "No thanks" --click "Les Miserables" --click "Analyze"

"You told me to have the program find the groups, and so far I've only read someone else's run.
The flask button at the bottom says Analyze. It opens a list: 'Search, or say what to find', and
under Recent, 'Louvain -- Last run: Resolution 1.0, weight value'. Resolution of what?"

## Step 9 -- open Louvain from Analyze (10.png)

    ... --click "Analyze" --click "Louvain"
    (matched four controls; the first, the tab, could not be clicked while the box was open)
    ... --click "Analyze" --click "Louvain Last run: Resolution 1.0, weight"

"'Which nodes form densely connected groups.' Plain enough. 'Opened with the last run's
settings.' Weight, Stronger/Farther/Capacity, all spelled out. Resolution 1.0 and nothing tells me
what resolution does, so I leave it. 'Under a second.' Two buttons: 'Run as copy' and 'Update
Louvain row'. I don't overwrite somebody else's work. Run as copy."

## Step 10 -- run as copy (11.png)

    ... --click "Louvain Last run: Resolution 1.0, weight" --click "Run as copy"

"'Would add Louvain as a copy at the top of the list, running.' Would? Nothing new showed up in
the list. It said these were the last run's settings, so a rerun should come out the same anyway.
I'll take the result already on the board and stop."

## Answer given

- Circles found: 6.
- Largest: 25 characters (Community 1).
- At its center: Gavroche -- the program's "hub", 16 links inside the group (22 overall).

"I'd put a caveat on the last one. 'Hub' here means most links inside the group, I'm assuming. And
when I clicked him he was sitting in the student knot, and the colors in the table put him with
another group. I'd want to see the 25 names before I said it to a sergeant, and I couldn't get the
program to list them."

## Debrief

- **Did I succeed?** Mostly. I have three numbers I can repeat. I'm not fully confident about
  the center character, because I never saw the 25 members and the colors pointed somewhere else.
  Also, I didn't run it myself. Somebody had already run it, and my own run didn't seem to happen.
- **Single Ease Question (1-7):** 4. The count and the size were right there in the table. The
  center showed up in one click. Everything after that made me doubt it.
- **Would I use this instead of my current tool?** Not yet. "Find the groups and tell me who's in
  the middle" is a question i2 can't answer and I'd normally need someone with Gephi for it, so
  the idea is worth something. But what I'm hired to do is say who's in the crew, on the stand. A
  tool that shows two different 'group' numbers on one screen, colors them alike, and can't list
  the members of a group when I ask is going to get me cross-examined. Show me the roster and color
  the chart by the groups it found, and I'd try it on a real phone dump. Local-only helps, too.

## Problems observed

1. The left list, the table and the color chips use "group" for two different things: the file's
   own `group` field (Group 2, Group 8) and the program's Louvain communities (Community 1-6). The
   colors overlap, so Gavroche, the hub of Community 1, wears Community 2's blue in the table.
   (03.png, 04.png)
2. "Show in table" under Members of Community 1 showed all 77 nodes instead of the 25 members
   and dropped the community from the right panel. (07.png)
3. The chart stays colored by PageRank after opening Louvain, so the groups are never visible on
   the picture. (03.png, 04.png)
4. Two controls are named "Data" (the left rail and the right panel tab), and two or more are
   named "Louvain". Clicking the wrong one lost the selection. (06.png)
5. "Resolution" has no explanation in the Louvain settings. (10.png)
6. "Run as copy" gave only a "Would add..." message; nothing visibly ran. (11.png)
7. The task's "have the program pick out" was already done in the sample, which made it unclear
   whether to read the existing result or run a new one. (02.png)
