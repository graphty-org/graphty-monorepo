# Session r3-s14 -- Explorer Elena, returning user

Task: Les Miserables network is open. Without removing any character or tie, point out on the
drawing every tie of 10 or more shared chapters, and say how many there are.

`<session>` below is the session folder the tool ran in; its screenshots and logs are copied
beside this file.

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs --start <session> setup:lesmis-ranked.txt

01.png: The orange dot picture again. Left: a find box, "Selection", "PageRank 77", "Everything".
Right: a PageRank panel with Style and Values. A little box top-left says size and color are
PageRank. Lots of thin grey lines; I can't tell which ones are "strong". Last time I used the find
box, and it says "values", so I'll type 10 there.

## Step 1 -- type 10 in the find box

    real.mjs --step <session> --click "Find nodes, edges, values" --type "10"

02.png: "Edges 2": MmeMagloire -- Myriel and Bossuet -- Enjolras, both "shared_chapters: 10". So the
lines DO carry the chapter count. But that's only exactly 10; I want 10 or more. Under "Values"
there is "Select where shared_chapters is 1..." -- cut off. Maybe that's it. I'll hover to read it.

## Step 2 -- hover the cut-off Values row

    real.mjs --step <session> --hover-at 190,287

Tooltip: "Select where shared_chapters is 10 (2)". Still only exactly 10. In a spreadsheet filter I'd
type ">=10", so I'll try that.

## Step 3 -- type >=10

    real.mjs --step <session> --click "Find nodes, edges, values" --key Control+a --type ">=10"

04.png: 'No match for ">=10". To select by a value, type a rule such as =shared_chapters > `16`'.
OK, weird little backticks, but it gave me a pattern. I'll copy it with >= and 10.

## Step 4 -- type the rule

    real.mjs --step <session> --click "Find nodes, edges, values" --key Control+a --type '=shared_chapters >= `10`'

05.png: "Rule: press Enter to select matches." It didn't show a count yet. Pressing Enter.

## Step 5 -- Enter

    real.mjs --step <session> --key Enter

06.png: "13 edges selected". Thirteen lines are now thick blue on the drawing, and everything else
is still there. The right side lists them with shared_chapters: MmeMagloire -- Myriel 10,
Thenardier -- MmeThenardier 13, Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert -- Valjean
17, Marius -- Gillenormand 12, Marius -- Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras 15,
Courfeyrac -- Enjolras 17, Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet --
Enjolras 10. All of them 10 or more. Most of the blue is bunched in the middle around the big dark
dot -- so the big dark one must be the character everybody spends the most chapters with (I'm
guessing; the little box says the size is "PageRank", whatever that is). One blue line is off on its
own at the bottom left. That's my answer.

## End

    real.mjs --end <session>

Session ended cleanly.

## In my own words, at the end

- **Did I finish?** Yes. There are 13 ties of 10 or more shared chapters, all shown in blue on the
  drawing, with nothing taken off it.
- **Ease:** 5 out of 7.
- **What confused me:** Typing "10" only found ties of exactly 10, and the cut-off "Select where
  shared_chapters is 1..." row looked like it might be "10 or more" until I hovered it. ">=10", the
  way I'd write it in a spreadsheet, didn't work. The hint saved me, but I'd never have guessed the
  "=" in front or the little backticks around the number -- I just copied them. After I typed the
  rule it only said "press Enter", with no count, so I didn't know if it was right until I pressed
  it. Once it worked, the blue lines plus the list with the numbers were exactly what I wanted to
  paste into Slack: "13 pairs share 10+ chapters, mostly around Valjean and the students."
