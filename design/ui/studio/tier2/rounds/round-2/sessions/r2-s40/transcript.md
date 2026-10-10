# Session r2-s40 -- Tom (returning), task T21, dataset B (team.csv to team-v2.csv)

Commands run from design/ui/studio/tier2 with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/

## Start

    node ../tool/real.mjs --start <session> setup:team-ranked.txt   -> 01.png

01: The team project is open, as I left it. The left side says "Graph team.csv" with a PageRank row
showing 12. The right panel shows PageRank with Style and Values tabs. Dots are sized and colored by
the ranking. Before I bring anything new in, I want to write down who is first right now, so I will
open Values.

    --step --click Values   -> 02.png

02: Values shows a Top 10. Hal is first at 0.1293, then Ida, Di. "12 of 12 have a value", so the team
was 12 people. I'll remember: before, Hal was first. Now to put the new list in. I have never done
this. At the top left it says "Graph team.csv" -- that is the old file's name, so maybe clicking it
lets me swap the file. I'll try that.

    --step --click "team.csv"   -> 03.png

03: The right side now says "Graph" with 12 nodes, 16 edges. Under the title, in blue, "From
team.csv" -- blue usually means I can click it. That is the file I want to swap, so I'll click it.

    --step --click "From team.csv"   -> 04.png

04: It took me to the Data side. Under "Sources" there is "team.csv, 12 nodes, 16 edges". That is
the old list. I'll click on it to see what I can do with it.

    --step --click-at 160,141   (treeitem "team.csv")   -> 05.png

05: The right side now says "team.csv, Source, Loaded 12 nodes, 16 edges", and a table of the links
opened at the bottom. No button that says anything about a new file. There are three dots at the
top right of that panel; that is usually where the extra choices hide. I'll try them.

    --step --click-at 1419,73   (button "Source actions")   -> 06.png

06: A small menu: "Edit source..." and "Replace with file...". "Replace with file..." sounds like
exactly what I want: put the new list where the old one was. I'll click it and pick team-v2.csv.

    --step --click "Replace with file..." --upload team-v2.csv   -> 07.png

07: A big page "Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21". Good -- that says
plainly what will change: two more people, which matches what my manager said. There is a lot here
I do not understand ("Each row is a node / an edge", "Higher means: Not set / Closer / Farther /
Capacity", "Direction: As the file says"). I don't touch settings I don't understand; the old one
worked with whatever it had, and the text under "Higher means" says PageRank reads higher as closer
anyway, which is what the old run said too. The bottom line says "the load makes 14 nodes and 21
edges". I read it, it looks right. I'll press Replace.

    --step --click "Replace"   -> 08.png

08: It now says "Graph team-v2.csv", 14 nodes, 21 edges. So the team is 14 people now. Two small
blue dots appeared -- I guess the two new people, with no ranking yet. The key at the top left says
"PageRank, out of date", so the program knows the ranking is old. My PageRank row is still there
(good, nothing lost), with a little clock-like icon now. I'll click the PageRank row to see how to
redo it.

    --step --click "PageRank"   -> 09.png

09: A gray bar on the right: "Data changed since this run" with a blue "Rerun" button. The values
underneath are still the old ones (12 of 12, Hal first). That is clear enough. I'll press Rerun.

    --step --click "Rerun"   -> 10.png

10: The bar is gone, "ran Oct 9, 8:46:43 PM", "14 of 14 have a value". Top 10 now: Di 0.1339 first,
Hal 0.1305 second. The two blue dots turned orange like everyone else, and the key no longer says
out of date. My sizing and coloring are still on. Before I go I want it kept, so I'll save the way
I always do, with Control+S.

    --step --key Control+s   -> 11.png

11: "Save team as", name "team". Same name as before, that's what I want. Save.

    --step --click "Save"   -> 12.png

12: "Saved team in this browser." The ranking is redone and kept. I'm done.

    --end   -> session ended

## In my own words, at the end

**Did I finish?** Yes. The team has 14 people now (it was 12). Before, Hal was first (0.1293). Now
Di is first (0.1339), with Hal a close second (0.1305). My sizing and coloring by the ranking stayed
on, and I saved the project under the same name.

**Ease: 6 out of 7.**

**What confused me or slowed me down:**

- Finding where to bring in the new list took four clicks of guessing: the "team.csv" name at the
  top left, then a blue "From team.csv" link, then the file's row under Sources, then a three-dot
  menu. Nothing on the main screen says "new version of this file". Once I saw "Replace with
  file..." it was obvious, but it was hidden behind the dots.
- The replace page has a lot of words I don't know ("Each row is a node / an edge", "Higher means:
  Not set / Closer / Farther / Capacity", "Direction: As the file says"). I left them alone because
  the old ranking had worked and the note under "Higher means" said the ranking would read higher
  as closer anyway. I would have liked a line saying "these are the same settings as last time".
- What I liked: the top line "Was 12 nodes, 16 edges; now 14, 21" told me exactly what was going to
  change before I pressed anything. After the swap, "out of date" on the key and "Data changed since
  this run" with a Rerun button made the next step obvious. Nothing I had built was lost.
- The two new people showed as small blue dots until I reran. I guessed that meant "no ranking yet",
  but nothing told me so; for a moment I wondered if blue meant something.
