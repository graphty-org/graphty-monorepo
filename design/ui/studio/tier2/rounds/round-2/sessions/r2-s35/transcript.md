# Session r2-s35 -- Dana (supply-chain risk analyst), task T21 prompt A (running club)

Participant: Dana Okafor, returning user (four earlier monthly sessions).
Start: setup friends-ranked.txt (friends.csv open, ranked, dots colored and sized by the ranking).
File to bring in: friends-v2.csv.

Commands are run from design/ui/studio/tool with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ and S=this folder.

```
node real.mjs --start $S setup:friends-ranked.txt
```

The start waited for one of the machine's four browser slots before the app opened.

## Step 1 -- 01.png (start)

Dana: "Right, last month's club work. Dots colored and sized by PageRank, the key top left.
Before I swap anything I want last month's winner written down. There's a Values tab on the
PageRank panel -- that's where the list was."

```
node real.mjs --step $S --click "Values"
```

## Step 2 -- 02.png

Dana: "Good, a Top 10 table. Farah 0.06394 is first, then Hana 0.05941, Milo 0.05648. Noting
Farah. The 'Made with' bit says the weight was read as closer and its meaning was never set --
I'll leave that. Now the new file. Last time I loaded things from the Data place, so I'll go
there and look for a way to swap the file."

```
node real.mjs --step $S --click "Data"
```

## Step 3 -- 03.png

Dana: "Sources, friends.csv, 20 nodes 41 edges. That's the file I want to swap. No button next to
it that I can see. I'll click the file and see what it offers."

```
node real.mjs --step $S --click "friends.csv"
```

## Step 4 -- 04.png

Dana: "It opened the table at the bottom -- Ava to Ben 3, Ava to Chloe 5 -- and on the right a
friends.csv panel, Source, Loaded 20 / 41. Nothing that says load a new file. There are three
dots at the top right of that panel; menus usually hide the useful stuff there."

```
node real.mjs --step $S --click-at 1419,73
```

## Step 5 -- 05.png

Dana: "'Edit source...' and 'Replace with file...'. Replace with file is exactly what I'm doing.
Clicking it and handing it friends-v2.csv."

```
node real.mjs --step $S --click "Replace with file..." --upload friends-v2.csv
```

## Step 6 -- 06.png

Dana: "A preview: 'Replace: friends-v2.csv. Was 20 nodes, 41 edges; now 20, 41.' Same people,
same links -- good, nobody dropped out. The weights changed (Ava-Chloe was 5, now 1). It guessed
source, target, weight, and says so. There's a 'Higher means: Not set' row; the one line under it
says until I choose, PageRank reads higher as closer. Last month I never set it either, so
leaving it the same keeps the two months comparable. Clicking Replace."

```
node real.mjs --step $S --click "Replace"
```

## Step 7 -- 07.png

Dana: "It took it: 'Graph friends-v2.csv', the table shows Ava-Chloe 1 now. My PageRank row is
still there, and the key says 'PageRank, out of date' -- honest, I like that it tells me rather
than showing last month's colors as if they were current. The PageRank row has a little clock
icon now. I'll click the PageRank row to see how to get it current."

```
node real.mjs --step $S --click "PageRank"
```

## Step 8 -- 08.png

Dana: "'Data changed since this run' with a blue Rerun button. That's the button. The Top 10
underneath is still last month's (Farah first). Clicking Rerun."

```
node real.mjs --step $S --click "Rerun"
```

## Step 9 -- 09.png

Dana: "Ran Oct 9, 8:33:50 PM. The key lost its 'out of date' and the range moved to 0.02872 to
0.08012. New Top 10: Ava 0.08012 first, then Farah 0.06556, Hana 0.06428, Ivan 0.06141. The big
dot moved to the middle of the drawing. Colors and sizes followed on their own -- I didn't have to
redo them. That's it, I'm done."

```
node real.mjs --end $S
```

## End of session (in character)

**Finished:** yes. Before (friends.csv): Farah first, 0.06394. Now (friends-v2.csv): Ava first,
0.08012 (Farah second, 0.06556).

**Ease:** 6 of 7.

**What worked:** "Replace with file..." said exactly what I was doing, and the preview told me
'was 20 nodes, 41 edges; now 20, 41' before I committed -- that's the check I'd do in Excel
anyway. Marking the old ranking 'out of date' in the key and putting a Rerun button right on
the ranking meant I never had to rebuild the coloring by hand, which is the thing I do every
month today.

**What confused me / slowed me down:**
- Finding the swap took three clicks of guessing: Data, then clicking the file, then the three
  dots on the right-hand panel. Nothing on the Sources row itself says it can be replaced.
- Rerun overwrote last month's Top 10. I'd written Farah down first, so I was fine, but if I
  hadn't I'd have lost the "before" number. For my quarterly comparison I want before and after
  side by side, or at least last month's list kept somewhere.
- The 'Higher means: Not set' row in the replace preview. I left it, because last month was
  the same, but I wasn't sure whether leaving it would change the numbers. The line under it
  helped; I'd not have read more than that line.
- The little clock icon on the PageRank row didn't say anything by itself; it was the blue Rerun
  in the panel that told me what to do.
