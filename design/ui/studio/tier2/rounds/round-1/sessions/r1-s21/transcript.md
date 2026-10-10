# Session r1-s21 -- Grace (returning), T18 prompt A (running club, friends.csv)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Started with setup `friends-ranked.txt`.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ ./tool/with-browser.sh node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s21 setup:friends-ranked.txt
```

## Step 1 (01.png)

Okay, my running club map is open, the PageRank ranking I did is there, dots sized and colored by
it. No names on the dots right now. I need Chloe to Milo with the fewest people in between. I have
never asked the program how two people are linked. First place I remember is the analysis button
in the toolbar at the bottom (the flask). I'll try that.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 680,864
```

-> `button "Analyze"`, 02.png

## Step 2 (02.png)

A list of analyses opened, with a filter box. "Rank nodes and edges": Degree, Betweenness,
Closeness, PageRank... these are all rankings, not "how do I get from one person to another". The
list goes on below, so I'll scroll down to see what other groups there are before I guess a word.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --wheel 680,700,600
```

-> 03.png

## Step 3 (03.png)

Groups first (Louvain and friends), then a heading "Find paths and edge sets" and "Shortest path --
The fewest steps, or the shortest route by weight, between two nodes." "Fewest steps between two"
is exactly my question, in plain enough words. Clicking it.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 566,794
```

-> `option "Shortest path ..."`, 04.png

## Step 4 (04.png)

A small form: From "Where the path starts", To "Where the path ends", Follow Out / All (All is
picked), Weight None with a line "Not read -- weight's meaning is not set, and a path needs a
distance." I don't care about weight, I just want the fewest people, so None is fine. "Follow All"
I take to mean ties count either way, which is what I want for "runs together". Typing Chloe into
From.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click "Where the path starts" --type "Chloe"
```

-> 05.png

## Step 5 (05.png)

It suggests "Chloe" under the box. Picking her from the list so it knows I mean that person.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 555,609
```

-> `option "Chloe"`, 06.png

## Step 6 (06.png)

Chloe is in From, and the To box looks ready. Nothing changed on the map yet, which is fine.
Typing Milo.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click "Where the path ends" --type "Milo"
```

-> 07.png

## Step 7 (07.png)

Milo is suggested. Picking him, then I'll press "Find path".

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 550,663
```

-> `option "Milo"`, 08.png

## Step 8 (08.png)

From Chloe, To Milo, Follow All, Weight None. Pressing "Find path".

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click "Find path"
```

-> 09.png

## Step 9 (09.png)

That was quick. The chain is drawn in black on the map and the right side switched to Values:
"Path 5 nodes, 4 edges", then "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. The left
list now has "Shortest path 4 hops" above my PageRank. The key on the map says "On the path".

So: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between (Ava, Ivan, Kofi), and four
introductions (Chloe-Ava, Ava-Ivan, Ivan-Kofi, Kofi-Milo). "4 edges" and "4 hops" both agree with
my count of four handoffs. I'd have liked it to say "introductions" or "steps" instead of "hops"
and "edges", but the numbered list is exactly what I would paste into an email. The map has no
names on it, so I'm reading the names from the right-hand list, not the picture; fine for this.

The "Not read -- weight's meaning is not set, and a path needs a distance" line puzzled me a
little: I'm not sure if it means something is wrong. It did not stop anything, so I left it.

Prompt A answer: Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions. Done with the first question.

### Follow-up given: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"

I'll go back to the analysis button; I expect Shortest path to be at the top under Recent now.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 680,864
```

-> `button "Analyze"`, 10.png

## Step 10 (10.png)

Yes, "Shortest path" is first under Recent. Clicking it.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 566,448
```

-> `option "Shortest path ..."`, 11.png

## Step 11 (11.png)

A fresh, empty form (From and To blank, Follow All, Weight None). Fine, typing Ben in From.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click "Where the path starts" --type "Ben"
```

-> 12.png

## Step 12 (12.png)

Ben is suggested. Picking him.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 549,609
```

-> `option "Ben"`, 13.png

## Step 13 (13.png)

Ben in From, the To box is focused. Typing Nora.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --type "Nora"
```

-> 14.png

## Step 14 (14.png)

Nora suggested. Picking her.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click-at 551,663
```

-> `option "Nora"`, 15.png

## Step 15 (15.png)

Ben to Nora, Follow All, Weight None. Find path.

```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s21 --click "Find path"
```

-> 16.png

## Step 16 (16.png)

New chain drawn in black, and the right side reads "Path 5 nodes, 4 edges", Nodes in order:
Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5. Made with: From Ben, To Nora, Follow All.

Follow-up answer: Ben -> Theo -> Ravi -> Pia -> Nora, three people in between, 4 introductions.

One thing I noticed: the left list still has just one "Shortest path 4 hops" row, and the
Chloe-to-Milo chain is gone from the map and the right side -- the new run replaced it. If I'd
wanted both chains for the email I'd have had to write the first one down before running the
second. I had, so no harm, but I didn't expect it to be overwritten without a word.

Done; ending the session.

```
node tool/real.mjs --end tier2/rounds/round-1/sessions/r1-s21
```

## In character, at the end

**Did I finish?** Yes, both questions.

- Chloe to Milo: Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions (Ava, Ivan and Kofi in between).
- Ben to Nora: Ben, Theo, Ravi, Pia, Nora -- 4 introductions (Theo, Ravi and Pia in between).

**Ease: 6 out of 7.** The analysis button was where I remembered, and the right one said "The
fewest steps ... between two nodes" in words I could match to my question. Typing a name and
picking it from the list was easy, and the numbered list of names on the right is exactly what I
need to paste into an email. The second time took half the clicks because it was under Recent.

**What confused me:**

- I had to scroll past a lot of ranking and grouping analyses before I found it; the name
  "Shortest path" is not the word I would have typed ("chain", "introduce", "connect"), so I
  found it by reading the descriptions, not by searching.
- "4 hops" in the left list and "5 nodes, 4 edges" on the right: I worked out that 4 edges means
  4 introductions, but I would not put "hops" or "edges" in front of the board.
- The weight line, "Not read -- weight's meaning is not set, and a path needs a distance", made me
  wonder if something was wrong. It didn't stop anything, so I ignored it.
- Running the second chain silently replaced the first one; I expected to keep both, or at least
  be told the first was being replaced.
- The names are not on the dots, so on the map I could see the chain but not who was in it
  without the right-hand list.
