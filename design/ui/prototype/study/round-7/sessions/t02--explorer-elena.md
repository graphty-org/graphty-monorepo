# Session: top five characters, Explorer Elena

Task as given: "Someone on your team already worked on this project. Work out which five characters
their work says matter most to the whole story, in order, and how the drawing shows it. The data on
screen is a sample: characters of the novel Les Miserables, linked when they appear in the same
chapter. If that is not your line of work, treat them as your own people or things."

Variant: curious afternoon (long clock). All commands run from
`design/ui/prototype`. Renders are in `tmp/round-7-sessions/t02--explorer-elena/`.

## Start screen (shots/tasks/t02/01.png)

"OK. Orange dots and gray lines. There's one big dark one in the middle, Valjean -- that's
obviously the main guy. Then Marius and Gavroche down at the bottom look big too. So my first guess,
just from the picture: Valjean, Gavroche, Marius, Javert, Cosette. The big ones."

(Wrong-ish read: she is ranking by dot size, which the box says is Degree, not by color.)

"There's a box in the corner. 'Color: PageRank', 'Size: Degree'. I don't know what either of those
is. Darker color means more PageRank, I guess? And the circles 1, 10, 20, 30... size of what?"

"On the left there's a list. 'PageRank' is one of the rows. Somebody did a PageRank. That's probably
'their work'. Let me click it."

## Step 1

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t02--explorer-elena/01.png task:t02 --click "PageRank"
```

"The right side changed. 'PageRank, Measure from Analyze. Paints 77 nodes (every node with a
value).' Color 'Orange to brown'. OK so it's the thing doing the colors. It doesn't tell me who's
on top though. I want a list. There's a 'Data' tab up there -- maybe that's the numbers."

## Step 2

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t02--explorer-elena/02.png task:t02 --click "PageRank" --click "Data"
```

"Whoa, the whole left side changed. Sources, Filters, Attributes, 'miserables.gexf'. That's not what
I clicked... I meant the little tab on the right. Or did I? The right side says 'Co-appearances'
now with Density, Connected components... no names. I probably clicked the wrong Data. There are
two things called Data."

"Never mind. At the bottom there's 'Table'. Tables I understand."

## Step 3

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t02--explorer-elena/03.png task:t02 --click "PageRank" --click "Table"
```

"Oh good, a spreadsheet. 'Valjean is first on all three measures; Gavroche is in the top 3 on all
three.' Nice, a sentence. It's sorted by Degree right now: Valjean, Gavroche, Marius, Javert,
Thenardier. But there's a column 'Rank by PageRank' and it goes 1, 3, 4, 5, 6. Who's number 2?
Somebody is missing from the top. Let me click that column."

## Step 4

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t02--explorer-elena/04.png task:t02 --click "PageRank" --click "Table" --click "Rank by PageRank"
```

"There we go. By PageRank: 1 Valjean, 2 Myriel, 3 Gavroche, 4 Marius, 5 Javert. Myriel?! He's way
up in the corner on his own, smaller dot. Oh -- but his dot is darker brown than the others around
him. So the darkness is the importance, not the size. Hm. That's not what I said at the start."

"But there are three measures. Degree, PageRank and Betweenness, and there's another column cut off
on the right. Which one did my teammate mean? Degree gives Thenardier in the top five, PageRank gives
Myriel. Those are different answers. In the list on the left 'Betweenness' has the eye crossed out,
so maybe they turned it off. There was 'Notes 4' in the list too -- maybe they wrote it down."

## Step 5

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t02--explorer-elena/05.png task:t02 --click "Notes"
```

"Notes. 'Highest betweenness in the book, 0.57. Next is Myriel at 0.177.' And 'Javert follows
Valjean through the whole book. Check whether PageRank ranks them side by side.' So they looked at
both. Neither note says 'here are the top five'. I'll go with PageRank, because that's what they
put on the picture -- it's the color -- and betweenness is switched off."

"I'm done."

## Answer given

Top five, in order: Valjean, Myriel, Gavroche, Marius, Javert (by PageRank, the measure the team
colored the drawing with).

How the drawing shows it: the darker brown the dot, the higher the PageRank -- Valjean is the
darkest, Myriel is dark even though he is small. The size of the dot is something else ("Degree",
the number of connections), so the big dots are not the same as the important ones.

## Wrap-up

- Succeeded? "I think so. I'm maybe 70 percent sure. I got a list, but I had to pick which of three
  scores 'their work' meant, and nothing told me which one was the final answer."
- Single Ease Question: 4 of 7.
- Would she use it instead of her current tool? "Maybe. The table with the sentence on top is the
  good part -- that's like our dashboard. But I wouldn't send this to my VP yet; the picture made
  me say the wrong five people at first, and I clicked 'Data' and the whole left side went away."

## Observations for the moderator

- She read size as importance on the start screen and named the degree top five, not the PageRank
  one; only the sorted table corrected her.
- Two controls called "Data" (left rail and the right panel tab); her click went to the rail and
  replaced the whole left panel, which she took as her own mistake.
- The table opened sorted by Degree while the selected row was PageRank; she had to notice the gap
  in "Rank by PageRank" (1, 3, 4, 5, 6) to find Myriel.
- With three measures shown and notes citing two of them, "which one did the team mean" was a guess.
  She chose PageRank because it is the one painting the picture.
- She never opened the legend's terms; "PageRank" and "Degree" stayed unexplained words.
