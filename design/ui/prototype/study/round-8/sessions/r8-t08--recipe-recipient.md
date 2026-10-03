# Session: find the circles of characters in Les Miserables -- participant: the recipe recipient (Tom, lab manager)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--recipe-recipient/.

## Step 1 -- the start screen (shots/tasks/r8-t08/01.png)

Think-aloud: "OK, a web page, nothing to install, good. 'Files are read on this computer and never
uploaded' -- I like that line, that's the first thing I'd ask. There's a box at the bottom asking
to share usage data. No thanks, I'm not agreeing to anything on a first look. On the right,
Samples, Les Miserables, 77 characters. That's the one they told me to use. It even says 'good for
a first look at communities'. Click."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

Think-aloud: "Whoa. That's a lot. A list down the left with twenty-odd rows, a picture in the
middle, a panel on the right that says PageRank and 'Orange to brown'. Everything is orange. I
don't know what PageRank is. The task says 'circles of characters'. I'm reading the list: Selection,
Notes, Labels, PageRank, then 'Louvain -- 6 groups'. I don't know what Louvain is either, but
'6 groups' sounds like what they want. Further down there's 'For the report: Group 2, 14 nodes;
Group 8, 13 nodes'. Hmm, are those groups the same groups? I'll go with the one that says 6 groups.
I'm not clicking the word Louvain, I'll click '6 groups'."

Note: he did not try to make the program do the grouping himself. It already looked done ("6 groups").

## Step 3 -- click "6 groups"

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "6 groups"

Think-aloud: "The row lit up, the right panel now says Louvain, 'Run from Louvain, Sep 28'. Sep 28?
So somebody did this already, before me. The picture didn't change at all. Still all orange. If
there are six groups I'd expect six colors. It says 'Covered by PageRank for Color on 77 of 77'.
I have no idea what that means. Covered? Is my group thing hidden? I clicked and nothing moved.
There's a 'Data' tab over there, let me see if that gives numbers."

## Step 4 -- click "Data" (landed in the wrong place)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "6 groups" --click "Data"

(The tool reported two controls named "Data"; the left-hand one opened.)

Think-aloud: "That's a whole different page -- sources, filters, 'miserables.gexf', density 0.0868.
Not what I wanted. It says 77 nodes, 254 edges, fine, but nothing about six groups. Down at the
bottom left under Results there's 'Louvain' again with a little stack icon. I'm going back. That's
my first wrong turn."

## Step 5 -- try the "Table" at the bottom instead

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "6 groups" --click "Table"

Think-aloud: "OK, now this is something. A table: '6 communities'. Community 1, 25. Community 2, 17.
Community 3, 10 ... down to Community 6 with 6. There's a 'size' column and it's sorted, biggest
first. So six circles, the biggest has 25. The list on the left also opened up and shows the same
six with node counts. Fine. Density, edges inside, edges leaving -- I'm skipping those. But which
character is in the middle of Community 1? It doesn't say. And the picture is STILL all orange, the
little colored dots next to the community names don't show up anywhere on the network."

## Step 6 -- click "Community 1"

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "6 groups" --click "Table" --click "Community 1"

Think-aloud: "Right panel: Community 1. Size 25 nodes. Hub: Gavroche, 16 links inside. 'Hub' -- I
take that to mean the one in the middle, the one with the most connections inside the circle. So
Gavroche. But hold on. The table at the bottom flipped to a list of all 77 characters and the top
line says 'Valjean is first on all three measures'. Valjean has a degree of 36, Gavroche 22. And
there's a 'group' column: Valjean is group 2, Gavroche is group 8. Community 1 but group 8? And the
left list has 'Group 2' and 'Group 8' under 'For the report'. Now I have communities numbered 1 to 6
and groups numbered 2 and 8, and I can't tell if they are the same thing. If the PI asked me 'who's
at the center', I'd say Gavroche because the panel says so for this circle, but I'd be nervous
somebody says 'no, it's obviously Valjean'. Also the picture never showed me the circles. I'd want
to see them in color to believe it."

I stop here: I have three numbers and a name.

## Answer given to the moderator

- Number of circles: 6 ("6 communities").
- Largest circle: 25 characters (Community 1).
- Character at its center: Gavroche ("Hub: Gavroche, 16 links inside").

## Did I succeed?

"I think so. I have six, twenty-five and Gavroche, and those came straight off the screen. But I
didn't make the program pick out anything -- it was already done, on Sep 28, by somebody. I just
found it. And I'm only fairly sure Gavroche is right, because the table right underneath was
shouting that Valjean is first on everything, and there are 'groups' with different numbers than
the 'communities'."

## Single Ease Question (1 = very difficult, 7 = very easy)

4. "Opening the sample was easy, and once the table came up the numbers were plain. But clicking
'6 groups' did nothing to the picture, I wandered into a page about sources by accident, and the
answer to 'who's in the middle' was on a word, 'Hub', in a side panel, next to a table telling me
something different."

## Would I use this instead of my current tool?

"My current tool is the postdoc sending me a PNG and an Excel file. For this -- no, not on my own.
The good part: it opened in the browser, nothing to install, and it says files never leave my
computer. That matters to me. The bad part: the picture never matched the numbers. It said six
groups and showed me one orange blob. If I had to put this on a slide for lab meeting I'd still ask
her to make it."

## Problems observed (as experienced)

1. Selecting the groups did not change the picture; it stayed orange and the panel said "Covered by
   PageRank for Color on 77 of 77", which he could not read. He expected to see the six circles in
   color. (High)
2. The grouping was already done ("Run from Louvain, Sep 28"); he never found, or looked for, a way
   to have the program do it himself, so "have the program pick out" was answered by finding an old
   result. (Medium)
3. "Community 1..6" in one place and "Group 2", "Group 8" and a "group" column elsewhere looked like
   the same idea with different numbers; Gavroche is in Community 1 but "group 8". (High)
4. The answer to "who is at the center" was labeled "Hub" in the side panel while the table directly
   below said "Valjean is first on all three measures"; he was left unsure which to report. (High)
5. Two controls are named "Data" (a left-side page and a tab in the right panel); the click went to
   the page he did not want. (Medium)
6. The algorithm name "Louvain" and the word "Covered" carried meaning he had to guess past; he
   relied on "6 groups" and "communities" instead. (Low)

## What worked for him

- No install, and "Files are read on this computer and never uploaded" on the first screen.
- The sample card said what it was good for ("a first look at communities").
- "6 groups" written next to the row, and the communities table sorted by size, gave him two of the
  three answers without counting.
- "Size 25 nodes" and "Hub: Gavroche, 16 links inside" were plain numbers and a plain name.
