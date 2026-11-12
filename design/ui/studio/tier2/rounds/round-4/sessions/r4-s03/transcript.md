# Session r4-s03 -- Nadia (returning user)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s03/
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

Task: friends.csv is open. How many runs did Gus and Ivan do together? Then point out Gus and Ivan, and nobody else, so whatever I do next applies only to those two.

## Step 1 -- start

    REAL_DIST=... node design/ui/studio/tool/real.mjs --start .../r4-s03 setup:friends-ranked-names.txt

01.png: the club drawing, colored and sized by PageRank, names above every ball. Left panel has a find box, "Selection", "PageRank 20" and "Everything". Gus is lower middle, Ivan just above Hana to his right; a line runs between them.
Next: the tie is a line, so I will hover it to see if it tells me the weight (number of runs).

## Step 2 -- hover the line

    --hover-at 760,582

Output: edge with id "13", pointer cursor, no tooltip. 02.png looks the same. So hovering tells me nothing; the pointer hand says it is clickable.
Next: click the line and see if the right panel shows its details.

## Step 3 -- click the line

    --click-at 760,582

03.png: the line turned blue, right panel now says "Gus -> Ivan, Edge" with From Gus, To Ivan, weight 1. "Selection" in the left list shows 1.
Weight is the only number on the tie, and in the club list the weight is how many runs. So: Gus and Ivan ran together once. Easy -- one click, same as reading a row in the case system.
Next: now point out the two people. The selection holds the line, not the people. I will click Gus, then shift-click Ivan to add him, like picking two files in Windows.

## Step 4 -- click Gus

    --click "Gus"

04.png: Gus has a yellow glow, the right panel shows Gus (Degree 4, PageRank #5 of 20). Selection still says 1, so the line was swapped for Gus, good.
Next: shift-click Ivan to add him. His ball is mostly behind Hana's, so I am a bit worried I will hit Hana.

## Step 5 -- shift-click Ivan

    --shift-click "Ivan"

Output: clicked node "Ivan" at 821,547 (it hit Ivan, not Hana).
05.png: both Gus and Ivan glow yellow, nobody else does. Right panel header: "2 nodes selected", Nodes 2, Edges joining these nodes 1. Selection in the left list says 2.
Small doubt out loud: "Edges joining these nodes 1" -- is the line between them picked too, or just counted? The panel says "nodes selected", so I read it as only the two people, with the line just a count. Nothing changed the data; only what is picked.
That is what I was asked. Done. Next: end.

## Step 6 -- end

    --end

Session ended; the session folder was copied next to this transcript.

## In my own words (Nadia)

- Did I finish? Yes. Gus and Ivan ran together once (the tie's weight is 1). Gus and Ivan are picked, and nobody else ("2 nodes selected").
- Ease: 6 of 7. About a minute, well inside one alert.
- What confused me:
  - Hovering the line gave a hand pointer but no popup with the number; I had to click it. A tooltip with the weight would save a click.
  - The tie only says "weight", not "runs". I knew from the club list that weight means runs, but QA would ask me how I know.
  - "Edges joining these nodes 1" under "2 nodes selected" made me wonder for a second whether the line was picked as well. I decided it was only a count.
  - Ivan's ball sits almost behind Hana's; I was worried shift-click would grab Hana. It did not.
