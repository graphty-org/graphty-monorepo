# Session: find the circles of characters (Les Miserables) -- Explorer Elena

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Have the program pick out the circles of characters who keep turning up together.
Tell us how many circles it came up with, how big the largest one is, and which character is at its
center."

Participant: Explorer Elena (first-time graph user, product manager). Clock: curious afternoon.

All commands were run from `design/ui/prototype`. `D` stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t08--explorer-elena`.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

"OK, a start page. Samples on the right... Les Miserables, 77 characters. 'Good for a first look at
communities.' That's the one they said. There's a big box at the bottom asking about my data -- I
don't want to read that, 'No thanks'."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

"Ooh, OK, it's a web of dots, all orange, a few names. Valjean in the middle, so he's probably the
main guy. On the left there's a long list -- PageRank, Louvain, Shortest paths, Density... I don't
know most of these words. 'Louvain, 6 groups.' Groups! That sounds like circles. Did it already do
it? I didn't ask it to do anything yet."

## Step 3 -- click "Louvain"

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

(The tool said two things are called Louvain; it clicked the tab at the bottom, which is what I
would have hit too -- I didn't know which one I meant.)

"A table came up at the bottom. '6 communities.' Community 1 is 25, then 17, 10, 10, 9, 6. So six
circles, biggest is 25. That was easy -- too easy? The picture didn't change though. Everything's
still orange. I thought the groups would be colored."

## Step 4 -- click "Community 1"

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

"Right side: Size 25 nodes. 'Hub: Gavroche, 16 links inside.' Hub -- that's the center, right? So
Gavroche. Huh, I'd have guessed Valjean, he's in the middle of the picture. Wait, in the table at the
bottom Valjean has an orange square that says 2, and Gavroche has a blue square that says 8. Community
1 is orange. So... Gavroche is the center of the orange circle but he's blue? I don't get that. Maybe
the numbers are something else. I'll leave it."

## Step 5 -- click the Louvain row in the list on the left

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note"

"'Run from Louvain, Sep 28.' So somebody ran this on September 28. That's not me. The task said have
the program pick them out -- I think they want me to actually make it do it. 'Covered by PageRank for
Color on 77 of 77' -- no idea what that means. The picture is still all orange."

## Step 6 -- look for a way to make it do it

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

"There's a little flask button at the bottom, I guess that's 'Analyze'. A box: 'Search, or say what
to find.' Long list of words -- PageRank, Degree, Betweenness... nope. I'll just type what I want."

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "groups"

"'Find groups.' Louvain, Leiden, Label propagation. Leiden says 'Start here'. Fine, you tell me, I'll
start there."

## Step 7 -- Leiden

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "groups" --click "Leiden"

"Weight, Stronger, Farther, Capacity, Resolution 1.0... I'm not touching any of that. 'Under a
second.' Run."

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "groups" --click "Leiden" --click "Run"

"'Would add Leiden at the top of the list, running.' Would? Did it? Nothing changed. The list on the
left still says Louvain at the top area. I probably did something wrong. OK -- whatever, the Louvain
one is already there and it's the same kind of thing, I'll use that."

## Step 8 -- check the center character

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Gavroche, 16 links inside"

"It picked Gavroche on the picture, ring around him, 'Gavroche, 22 connections'. 22, but it said 16
before. Maybe 16 is just the ones in his circle. Still blue square, 8. Yeah, OK. I'm going with it."

## Answer given

"Six circles. The biggest one has 25 characters. Gavroche is at the center of it." (Said with some
doubt: "the colors didn't match, and I'm not sure it's the one I was supposed to make myself.")

## Debrief

- Succeeded? "I think so, mostly. I got numbers. But I didn't really make it do it -- it was already
  done, and when I pressed Run nothing happened that I could see."
- Single Ease Question: 4 of 7.
- Would I use this instead of what I use now? "Maybe for a look. The table with sizes was nice, that's
  like our dashboard -- click a row, get the details. But the picture never showed me the circles;
  everything stayed orange. If I'm putting this in front of my VP I need to see the groups in color,
  and I need the colors in the table to agree with each other. Right now I wouldn't trust the
  Gavroche answer enough to say it in a meeting."

## Observations for the study (moderator notes, not Elena's words)

- The sample opens with a community result already present, so the "have the program do it" part of
  the task was answered by a pre-existing run; Elena noticed the "Sep 28" run date and felt she had
  not done it herself.
- The communities were never visible on the canvas: PageRank owns color, and the Louvain inspector's
  "Covered by PageRank for Color on 77 of 77" did not tell her how to see the groups.
- Leiden "Run" produced only a toast ("Would add Leiden at the top of the list, running") and no
  visible result; she blamed herself and fell back to the existing Louvain result.
- The node table's "group" column (Valjean 2 orange, Gavroche 8 blue) uses a different numbering and
  coloring from the Louvain table (Community 1 to 6). The hub of the orange Community 1 is shown with
  a blue "8" swatch. This undermined her trust in the answer.
- "16 links inside" (inspector) versus "22 connections" (canvas label) for Gavroche read to her as a
  possible contradiction until she reasoned it out.
- "Louvain" names both a bottom tab and a list row; she did not know which she wanted.
- Typing "groups" into the Analyze search found the right family immediately -- a clear win.
