# Session: look up Valjean, then narrow to him and his neighbors -- the recipe recipient (Tom)

Participant: Tom, the lab manager who opens files other people send and never builds them
(study/personas/recipe-recipient.md).

Task as given by the moderator: "Look up the character Valjean: what is recorded about him, how he
stands on the measures already worked out, and who appears right around him. Then narrow the whole
picture to him and the characters directly around him, so that every number describes only them.
The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in
the same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t04/01.png. All renders are in
tmp/round-7-sessions/t04--recipe-recipient/. Every command was run from
design/ui/prototype with the render path written in full (shortened to `$D/` below).

## Step by step

### Start (shots/tasks/t04/01.png)

"OK, a picture of dots with names. Valjean is the dark one in the middle, biggest. Lots of stuff
on the left I'm not going to read. Simplest thing: click on him."

### 01 -- click Valjean

    timeout 120 node app-b/study.mjs --try $D/01.png task:t04 --click "Valjean"

"He's picked. There's a little tag at the bottom, 'Valjean, 36 connections'. That's a number, good.
The right side says 'Valjean, Node' and a list called 'Why this look' -- Notes, PageRank, Degree,
Group 2, Selection, Everything, with words like 'Label below', 'Color', 'Size'. That's about how
he's drawn, not about him. Next to 'Style' there's 'Data'. I want what's recorded, so Data."

### 02 -- click Data

    timeout 120 node app-b/study.mjs --try $D/02.png task:t04 --click "Valjean" --click "Data"

"No. That swapped the whole left side to some 'Data, Les Miserables' page with sources and
attributes, and Valjean isn't picked any more. The right side is about the whole graph now: 77
nodes, 254 edges, density. I must have hit the big 'Data' on the far left, not the small one next
to Style. Two things called Data on one screen. Fine, try something else."

### 03 -- click Valjean, then Table at the bottom

    timeout 120 node app-b/study.mjs --try $D/03.png task:t04 --click "Valjean" --click "Table"

"That's better. A table, and Valjean is the top row: group 2, Degree 36, PageRank 0.0754, Rank by
PageRank 1, Betweenness 0.570. Above it, in plain words: 'Valjean is first on all three measures;
Gavroche is in the top 3 on all three.' I don't know what PageRank or betweenness are, but I can
read 'first'. That answers how he stands. What's recorded about him -- I suppose the label and the
group. Is that all? There's a 'Notes' line in that 'Why this look' list; maybe someone wrote a
note on him, but I didn't see it anywhere.

Now, who's around him. When I picked him a row of little round icons came up over the toolbar.
Target, squiggle, a check with a star, an eye crossed out, a speech bubble. No words."

### 04, 05 -- trying to find out what the icons are

    timeout 120 node app-b/study.mjs --try $D/04.png task:t04 --click "Valjean" --hover "Neighbors"
    -> nothing on screen is called "Neighbors"
    timeout 120 node app-b/study.mjs --try $D/scratch.png task:t04 --click "Valjean" --hover "Neighbours"
    -> nothing on screen is called "Neighbours"
    timeout 120 node app-b/study.mjs --try $D/scratch.png task:t04 --click "Valjean" --hover "Focus"
    -> nothing on screen is called "Focus"
    timeout 120 node app-b/study.mjs --try $D/scratch.png task:t04 --click "Valjean" --hover "Select neighbors"
    -> nothing on screen is called "Select neighbors"
    timeout 120 node app-b/study.mjs --try $D/scratch.png task:t04 --click "Valjean" --hover "Connections"
    (saved as 05.png)

"I rested on them and nothing told me anything I could use. 'Connections' only landed on the little
'36 connections' tag, no tooltip. I'm not going to guess at icons."

### 06 -- click the '36 connections' tag

    timeout 120 node app-b/study.mjs --try $D/06.png task:t04 --click "Valjean" --click "Valjean, 36 connections"

"Thought clicking the 36 might show me the 36. Nothing happened. That's a dead end."

### 07 -- the three dots next to Valjean on the right

    timeout 120 node app-b/study.mjs --try $D/07.png task:t04 --click "Valjean" --click "More"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t04 --click "Valjean" --click "More actions"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t04 --click "Valjean" --click "Node actions"
    -> nothing on screen is called "Node actions"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t04 --click "Valjean" --click "Valjean actions"
    -> nothing on screen is called "Valjean actions"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t04 --click "Valjean" --click "More actions"

"Three dots usually means 'more'. Yes, a menu, headed 'Valjean'. 'Neighborhood...' at the top --
that's the people around him, I'd guess. Further down: 'Remove from Watchlist', 'Hide on canvas',
'Delete'. Delete is in the same little list as looking someone up. I'm staying well away from that
part."

### 08 -- Neighborhood...

    timeout 120 node app-b/study.mjs --try $D/08.png task:t04 --click "Valjean" --click "More actions" --click "Neighborhood..."

"A box: 'Neighborhood of Valjean'. 'Hops: 1 2 3' -- I don't know what a hop is; it's on 1, leave it.
'Selected: Valjean and his 36 neighbors.' Plain sentence, and it matches the 36 from before. More
names came up on the picture: Thenardier, Claquesous, Montparnasse, Gillenormand, Bamatabois. But
there's no list of the 36. If the PI asked 'who are they', I'd be squinting at dots.

Two buttons: 'Add as steps' -- no idea, not touching that. 'Filter to neighbors', blue. That's what
I was asked: narrow it to him and the ones around him. Filter sounds like hiding, not changing the
file. OK."

### 09 -- Filter to neighbors

    timeout 120 node app-b/study.mjs --try $D/09.png task:t04 --click "Valjean" --click "More actions" --click "Neighborhood..." --click "Filter to neighbors"

"The top of the screen now says '37 of 77 nodes'. 36 plus him is 37, that adds up. Picture is
smaller. A black bar: 'Added filter step: Neighbors of Valjean, 1 hop', with Undo. Good, I can get
back.

But the box in the corner still says 0.0033 to 0.0754 and 1 to 36 -- exactly what it said before.
I was told every number should describe only them. Did they change or not?"

### 10 -- open the table again after filtering

    timeout 120 node app-b/study.mjs --try $D/10.png task:t04 --click "Valjean" --click "More actions" --click "Neighborhood..." --click "Filter to neighbors" --click "Table"

"This is what I don't trust. Top says '37 of 77 nodes'. The table right under it says '77 nodes',
and every column still says '(full graph)'. Same numbers as before: Gavroche 22, Marius 19. I doubt
Gavroche has 22 connections among just these 37. So the picture got smaller and the numbers
didn't. Which one am I supposed to believe? If I put this on a slide, someone will ask."

### 11 -- try the Data page to see if the numbers there follow

    timeout 120 node app-b/study.mjs --try $D/11.png task:t04 --click "Valjean" --click "More actions" --click "Neighborhood..." --click "Filter to neighbors" --click "Data"

"Earlier that Data page had a line that said filters change what is computed. So I went to look.
And now everything is back to the start: top says 'Full graph', the Filters box says 'No filters',
77 nodes, the whole picture is back. I didn't press Undo. Either going to that page threw away
what I did, or it never really stuck. That's two strikes on this part. I'd stop here and ask her
to just send me the numbers in Excel."

## Outcome

Did I succeed? Partly. I found how Valjean ranks (first on all three, 36 connections) and I got
the picture narrowed to him and his 36 neighbors -- the top bar said 37 of 77. I did not get
numbers that describe only those 37: the table still said 77 nodes and "full graph", and when I
went to the Data page to check, my narrowing was gone. I never saw a list of who his neighbors are
by name, and I never found anything written about him beyond his group.

Single Ease Question (1 = very difficult, 7 = very easy): 3.

Would I use this instead of what I do now? No. "She could have sent me a spreadsheet with his row
and his 36 people. Here the picture said one thing and the table said another, and when I went to
check, the thing I'd done disappeared. Finding him was fine, I'll give it that, and the sentence
'Valjean is first on all three measures' was the most useful thing on the screen. But I had to go
through a three-dots menu to find 'Neighborhood', the round icons told me nothing, and Delete was
sitting in the same menu."

## What stood out (participant's words)

- "Two things called Data. I clicked the wrong one and lost Valjean."
- "The icons that pop up when you pick him -- I don't know what any of them are."
- "'Selected: Valjean and his 36 neighbors' -- that's a sentence I can read. But who are they?"
- "'37 of 77' up top and '77 nodes, full graph' in the table. Which is it?"
- "I went to check and it was all back to the start. I didn't press Undo."
- "Delete is in the same menu as looking him up."
