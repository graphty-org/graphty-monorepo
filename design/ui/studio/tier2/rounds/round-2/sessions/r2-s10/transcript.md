# Session r2-s10 -- Nadia (returning), task T22, dataset B (Les Miserables)

Build: frozen build tier2-r2d4-8f0d5a6f7 (commit 8f0d5a6f7791). Started from setup `lesmis-ranked.txt`.

Commands run from `design/ui/studio/tier2`, with S=rounds/round-2/sessions/r2-s10 and
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/.

## Start

`node ../tool/real.mjs --start $PWD/$S setup:lesmis-ranked.txt` -> 01.png

01: Les Miserables is open, colored and sized by PageRank from an earlier run. Left list: Selection,
PageRank (77), Everything. Find box at top left. Right panel shows PageRank's style.

## Steps

### Step 1 -- click the find box
Said: "Ties with 10 or more chapters. The find box is where I always start -- I'll click it and see what it offers."
`--step $S --click "Find nodes, edges, values"` -> 02.png
Result: the tool reported "Could not click: elementHandle.click: Timeout 3000ms exceeded" although the box was
"visible, enabled and stable". 02 looks the same as 01; the box did not take focus.
Note (observer): this is a click on a plain, visible text box that did not land -- an implementation issue, not
the participant's confusion. Something appears to sit over the box or the click never resolves.

### Step 2 -- click the find box by position
Said: "I clicked the search box and nothing happened -- no cursor, no list. I'll click right on it again."
`--step $S --click-at 170,90` -> 03.png ("at 170,90: combobox \"Find\"")
Result: the box now has a blue outline, so it has focus. No list of suggestions opened.

### Step 3 -- type 10
Said: "OK, it's in the box. I'll type 10 and see what comes back -- maybe it lists ties with 10."
`--step $S --type "10"` -> 04.png
Result: a list opened: "Edges 2" (MmeMagloire -- Myriel, Bossuet -- Enjolras, each shared_chapters: 10), then
"Values" with one line cut off: "Select where shared_chapters is 1...". So the column is called shared_chapters.

### Step 4 -- read the cut-off line
Said: "Two ties with exactly 10. But I need 10 *or more*. There's a line under Values, cut off. I'll hover it."
`--step $S --hover-at 190,287` -> 05.png
Result: tooltip "Select where shared_chapters is 10 (2)". Exactly 10, only two. Not what I need.

### Step 5 -- try >=10
Said: "Exactly 10 is not it. In the spreadsheet I'd write >=10. I'll replace what I typed with >=10."
`--step $S --key Control+a --type ">=10"` -> 06.png
Result: "No match for ">=10"". No hint about what it does understand.

### Step 6 -- try shared_chapters >= 10
Said: "It told me the column is called shared_chapters, so maybe it wants the name first."
`--step $S --key Control+a --type "shared_chapters >= 10"` -> 07.png
Result: a hint under the box: "Start with = to select by a value:" and, in code type,
"=shared_chapters >= `10`". Helpful -- it rewrote my own words. But the 10 has little tick marks around it,
which I would never have typed. Like an Excel formula, starts with =.

### Step 7 -- type the suggested text
Said: "OK, it's telling me exactly what to type. I'll copy it as shown, ticks and all."
`--step $S --key Control+a --type '=shared_chapters >= `10`'` -> 08.png
Result: "Rule: press Enter to select matches". No count yet -- I'd like to know how many before I commit.

### Step 8 -- press Enter
Said: "It says press Enter. Pressing Enter."
`--step $S --key Enter` -> 09.png
Result: "13 edges selected" under the box; Selection in the list now shows 13. On the drawing, 13 ties are thick
blue, every character and every other tie still drawn as before. The right panel switched to "13 edges selected",
Values tab, with a table: MmeMagloire -- Myriel 10, Thenardier -- MmeThenardier 13, Thenardier -- Valjean 12,
Cosette -- Valjean 31, Javert -- Valjean 17, Marius -- Gillenormand 12, Marius -- Cosette 21, Marius -- Valjean 19,
Combeferre -- Enjolras 15, Courfeyrac -- Enjolras 17, Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12,
Bossuet -- Enjolras 10. All 10 or more, and both 10s are in.

Said: "13 edges selected, thick blue on the drawing, everything else still there, and the right side lists each
with its chapters. That's my answer: 13. Done."

`--end $S`

## Debrief (in character)

- **Finished?** Yes. 13 ties have 10 or more shared chapters; they are drawn thick blue with the whole cast
  still on screen. Mostly in the middle cluster around Valjean, the students' group (Enjolras, Combeferre,
  Courfeyrac, Bossuet), and one long one down to the bottom group.
- **Ease: 5 of 7.** About 8 actions, roughly two minutes -- fine for one alert, but only because the box
  coached me.
- **What confused me:**
  - The first click on the search box did nothing at all. I had to click it a second time. If that happens
    on my work laptop I assume the program is frozen.
  - Typing 10 gave me only ties of exactly 10, and the line under "Values" was cut off ("Select where
    shared_chapters is 1..."), so I had to hover to find out it meant "is 10", not "10 or more".
  - ">=10" just said "No match", with no hint. Only when I typed the column name did it show me the
    "Start with =" example. I would never have guessed the = at the start, and the little tick marks around
    the 10 look like a typo -- I copied them only because it showed them. Do I need them? It didn't say.
  - It said "press Enter to select matches" but not how many would match before I pressed it.
  - Not sure the blue stays: if I click somewhere on the drawing does my selection go away? For the case
    file I'd need it to stay for the picture and the export. And "selected" is not the same as "marked" to
    me -- I wasn't sure this changed the view only, not the data (I think view only).
