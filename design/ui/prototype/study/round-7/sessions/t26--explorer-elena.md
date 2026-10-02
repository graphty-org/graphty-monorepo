# Session: bring in a coauthor network and look at one person (Explorer Elena)

Task as given by the moderator: "A colleague sent a small, ready-made network of who wrote papers
with whom. Bring it in and look at one person in it. The data on screen is a sample: a small
network of researchers who wrote papers together. If that is not your line of work, treat it as
your own small network."

Participant: Explorer Elena (first-time graph user, product manager). Clock: first contact.
Renders: design/ui/prototype/tmp/round-7-sessions/t26--explorer-elena/

All commands were run from design/ui/prototype. OUT below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t26--explorer-elena

## Step 1 -- start screen (shots/tasks/t26/01.png)

What I see: a table of people. id, name, field, h_index. "Coauthors: 12 nodes, 16 edges" at the top.
A big blue Load button at the bottom right.

Thinking aloud: "OK, looks like it already opened the file for me. A list of names, 12 rows,
that's fine. I don't know what 'nodes' and 'edges' are but 12 matches the rows. 'Direction', 'As
the file says', 'Directed', 'Undirected'... I'm not touching that. Blue button says Load. Load."

## Step 2 -- click Load (02.png)

    timeout 120 node app-b/study.mjs --try OUT/02.png task:t26 --click "Load"

What I see: 12 gray dots in a ring with lines crossing the middle. A box at the top says "Nothing
is colored or sized by a row". Right side: Nodes 12, Edges 16, Direction Undirected.

Thinking aloud: "Ooh, there it is. Dots in a circle. That was quick. But no names on any of them,
so I can't tell who's who. 'Nothing is colored or sized by a row' -- OK? I didn't ask it to.
I'll just click a dot. I'll go for Wei Diallo, she was first in the list."

## Step 3 -- click Wei Diallo (03.png)

    timeout 120 node app-b/study.mjs --try OUT/03.png task:t26 --click "Load" --click "Wei Diallo"

What I see: the top dot gets a ring around it. Right side now says Wei Diallo, field machine
learning, h_index 47. Under the picture a little label "Wei Diallo, 3 connections" and a new row
of five icons with no words.

Thinking aloud: "There she is, at the top. So she's kind of the head of this group, I guess --
she's sitting at the top of the circle. Machine learning, 47 on the h_index, whatever that is,
sounds high. And '3 connections', nice, that's a plain sentence. But which three? I can follow
the lines with my finger, sort of, but they cross everything. Is there a way to just see the ones
connected to her? There are some little icons that just popped up. Let me rest my pointer on the
first one, the target-looking one."

## Step 4 -- hover the first icon (04.png, 05.png, 06.png)

    timeout 120 node app-b/study.mjs --try OUT/04.png task:t26 --click "Load" --click "Wei Diallo" --hover "Connections"

What I see: nothing changed. No tooltip.

    timeout 120 node app-b/study.mjs --try OUT/05.png task:t26 --click "Load" --click "Wei Diallo" --hover "Neighbors"

Result: nothing on screen is called "Neighbors".

    timeout 120 node app-b/study.mjs --try OUT/06.png task:t26 --click "Load" --click "Wei Diallo" --hover "Focus"

Result: nothing on screen is called "Focus".

Thinking aloud: "Nothing came up. Maybe I missed the icon. Neighbors? No. Focus -- a target means
focus, right? No. I don't know what these little pictures are. Forget the icons."

(Moderator note: two dead ends in a row on the icon row. She did not guess the right names and
gave up on the icons entirely.)

## Step 5 -- open the Table (07.png)

    timeout 120 node app-b/study.mjs --try OUT/07.png task:t26 --click "Load" --click "Wei Diallo" --click "Table"

What I see: a table slides up under the picture, the same list of people as before. The picture
got shoved up and the icons now sit on top of the bottom dots.

Thinking aloud: "It's the same list I already saw. It doesn't say who she wrote with. And now the
buttons are covering the dots at the bottom."

## Step 6 -- switch to Edges (08.png)

    timeout 120 node app-b/study.mjs --try OUT/08.png task:t26 --click "Load" --click "Wei Diallo" --click "Table" --click "Edges"

What I see: 16 rows of source, target, weight. res_0004 to res_0006, res_0009 to res_0001, and so
on. Numbers like 0.64 and 0.72.

Thinking aloud: "Edges, I guess that's the lines. Codes. res_0009, res_0001. Not names. I'd have
to match them back against the other list myself, like a VLOOKUP. Nope. And 0.72 -- is that a
lot? Is that how many papers?"

(Engagement dropped here. Answers got short.)

"Well. I brought it in and I'm looking at Wei. Good enough."

## After the task

Did I succeed? "Yes, I think so. It loaded and I clicked on Wei and it told me about her. I
couldn't tell you who her three people are, though."

Single Ease Question (1 = very difficult, 7 = very easy): 5. Loading was one click and clicking a
person was easy. Finding out who she's connected to I couldn't do.

Would I use this instead of my current tool? "Maybe, for a quick look. It's in the browser and it
opened without me fixing anything, which is more than I got last time. But the dots have no names,
the icons don't say what they do, and the lines list only shows codes. In our dashboard I click
the bar and get a list of names. Here I click a dot and get '3 connections' and no list. If I
can't say 'Wei mostly works with these three people', I've got nothing to paste into Slack."

## What happened, for the study team

- Load from the preview was found immediately; the big blue button was the obvious next step.
- Clicking the person worked and the right panel and the "Wei Diallo, 3 connections" label read
  well to her.
- The icon row that appears after selecting a person was a dead end: she guessed two names for
  the first icon ("Neighbors", "Focus"), neither matched, no tooltip helped her, and she
  abandoned the icons. She never found a way to show only Wei's connections.
- The edges table lists ids (res_0009), not names, so it could not answer "who did she write
  with". The weight column (0.72) had no meaning to her.
- Opening the table pushed the picture up so the two icon rows covered the bottom dots.
- Misreading: she concluded Wei was "the head of this group" because her dot sat at the top of
  the ring. Position carries no meaning in this layout, and nothing on screen said so.
- No names on the dots in the picture, so the picture alone could not tell her who anyone was.
