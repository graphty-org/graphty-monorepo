# Session r2-s23 -- Tom (returning lab manager), task T17 prompt A (running club, friends.csv)

Build: frozen build 8f0d5a6f7791 (`.study-builds/tier2-r2d4-8f0d5a6f7`). Setup: `friends-ranked.txt`.

Prompt as given: "You have used this program a few times. Your running club's list of who runs with
whom, friends.csv, is already open; its third column counts how many runs each pair did together
last month. For a flyer about running partners you care only about pairs who ran together 4 or more
times. Change the drawing so it has only those pairs, tell us how many people are still in it, and
then bring the whole club back."

Commands are run from `design/ui/studio/tool` with `S=../tier2/rounds/round-2/sessions/r2-s23`.

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7 ./with-browser.sh node real.mjs --start $S setup:friends-ranked.txt

(Waited for a free browser slot first.)

01.png: The club map is up, same as last time: orange balls, the ranking legend at the top left,
"friends.csv" on the left, "PageRank 20". Good, nothing has moved. Nothing here says anything about
how many runs a pair did. The column with the run counts is data, so I will try "Data" on the left.

## Step 1

    node real.mjs --step $S --click "Data"

02.png: The left side now lists "friends.csv, 20 nodes, 41 edges", then "Filters" with a plus,
then "Attributes": Nodes "id", Edges "weight". "weight" must be that third column, the run counts.
I will click "weight" first to see what it says before I press any plus.

## Step 2

    node real.mjs --step $S --click "weight"

03.png: The right side shows a summary of "weight": Edges, Amount, from the file, range 1 to 5.
Right, that is the run counts. But nothing here lets me do anything with it. The only thing that
sounds like cutting things down is "Filters" with the plus next to it. I will press that plus.

## Step 3

    node real.mjs --step $S --click-at 276,197     # the plus beside "Filters" ("Add filter step")

04.png: A "New filter step" panel on the right: "Keep: an attribute's value", then an empty
"Attribute" box and a grey "Add step" button. "Keep" is what I want. The attribute box is empty;
I will open it and look for "weight".

## Step 4

    node real.mjs --step $S --click "Attribute"

05.png: A short list: under Nodes "id", under Edges "weight". I pick "weight".

## Step 5

    node real.mjs --step $S --click-at 1245,295     # option "weight"

06.png: Now it reads "weight", "Is: at least", and an empty "Value" box, with a small grey line
under it about keeping edges that pass and the people at their ends. "At least" is already
what I need. I will put 4 in the Value box.

## Step 6

    node real.mjs --step $S --click "Value" --type "4"

07.png: "4" is in the box and "Add step" turned blue. Nothing on the picture changed yet, which is
fine, I have not pressed it. I press "Add step".

## Step 7

    node real.mjs --step $S --click "Add step"

08.png: The lines thinned out a lot. Top bar now says "19 of 20 nodes". On the left under Filters:
"weight is at least 4, 20 to 19 nodes", with a ticked box. On the right: "Nodes showing 19 of 20",
"Edges showing 12 of 41". I counted the balls: 19, and the one on the far left is gone. So 19 of
the 20 people still have at least one partner they ran with 4 or more times, and 12 of the 41
pairs are left. That surprises me a little -- I expected more people to drop -- but the count and
the picture agree. The legend says "PageRank on 20 nodes"; I take that to mean the ranking was
done on the whole club, which is what we did last time. Answer to the first question: 19 people.

Now bring the whole club back. I will not press anything that says delete or remove. The tick box
beside "weight is at least 4" looks like it switches the step off, so I untick it.

## Step 8

    node real.mjs --step $S --click-at 273,238     # the box "Apply step: weight is at least 4"

09.png: All the lines are back, the far-left person is back, the top bar no longer says "19 of 20",
and the right side says Nodes 20, Edges 41. The step is still listed, greyed, with "off" under it,
so I did not throw it away. Whole club back. First part done: 19 people.

Follow-up given: "Your club now asks the same for pairs who ran together 5 or more times. How many
people are in the drawing then? Bring the whole club back when you are done."

The step I made is still there saying "at least 4". I would rather change that one than make a
second one. I click on its name to see if I can change the number.

## Step 9

    node real.mjs --step $S --click "weight is at least 4"

10.png: The right side shows the same form again, filled in: weight, at least, 4, and a button
"Save and turn on". Good, I can change it. I will replace the 4 with a 5.

## Step 10

    node real.mjs --step $S --click "Value" --key Control+a --type "5"

11.png: The box says 5. The title still says "at least 4", but I have not saved. I press
"Save and turn on".

## Step 11

    node real.mjs --step $S --click "Save and turn on"

12.png: Much emptier. Top bar "10 of 20 nodes"; the step now reads "weight is at least 5, 20 to 10
nodes" and is ticked; right side "Nodes showing 10 of 20", "Edges showing 5 of 41". I counted:
10 balls, in five pairs (two of them sit almost on top of each other at the bottom, I had to look
twice). So 10 people for 5 or more runs. Now the whole club back: untick the box again.

## Step 12

    node real.mjs --step $S --click-at 273,238     # the box "Apply step: weight is at least 5"

13.png: Everyone is back: 20 balls, all the lines, right side Nodes 20 and Edges 41, nothing in the
top bar about "of 20". The step stays in the list, greyed, "weight is at least 5, off". Done.

## End

    node real.mjs --end $S     # first call repeated the follow-up, which I had already done
    node real.mjs --end $S     # session ended

## In my own words (Tom)

**Did I finish?** Yes, both. Pairs who ran together 4 or more times: 19 of the 20 people are still
in it (12 of the 41 pairs). 5 or more times: 10 people (5 pairs). The whole club is back both times.

**Ease:** 6 out of 7.

**What went well.** I have never done this before and I did not have to guess much. "Data" was
the obvious place for a column, "weight" told me it ran 1 to 5 so I knew I had the right column,
and the plus next to "Filters" gave me a form that read like a sentence: weight, at least, 4.
After I pressed the button, the count was on the screen in three places and it matched the balls
I counted. Bringing everyone back was a tick box, and it kept my step, so for the second question
I only had to change 4 to 5. Nothing asked me to delete anything.

**What made me stop and think.**
- The column is called "weight", not "runs". I only knew it was the run counts because the task
  told me it was the third column and the range 1 to 5 looked right.
- 19 of 20 for "4 or more" surprised me; I counted the balls to be sure. The little grey line under
  the value box ("keeps edges that pass and the nodes at their ends") is what explains it, but that
  text is small and grey and I only half read it.
- The legend says "PageRank on 20 nodes" while only 19 or 10 are showing. I guessed it means the
  ranking was done on the whole club. I'd probably ask the postdoc whether the sizes are still right
  with people taken out.
- Two balls at the bottom sit almost on top of each other, so counting by eye I nearly got it wrong.
- The step's title still said "at least 4" while I had typed 5, until I pressed "Save and turn on".
  That was fine once I pressed it.
- I did not try to save the project, so I do not know whether the step being left "off" in the
  list will still be there next time I open the lab map. I would want to know it does not change
  what the map shows when someone else opens it.
