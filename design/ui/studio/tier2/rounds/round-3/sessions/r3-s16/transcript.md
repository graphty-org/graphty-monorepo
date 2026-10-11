# Session r3-s16 transcript

Participant: Tom, lab manager, returning user. Task: with the Les Miserables network open, point out on the drawing every tie of 10 or more shared chapters, without taking any character or tie off the drawing, and say how many there are.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s16

## Start

`node design/ui/studio/tool/real.mjs --start $S setup:lesmis-ranked.txt` -- waited for a free browser slot (other jobs held all four).
Result: 01.png. The Les Miserables drawing is open, orange balls sized and shaded by PageRank (a legend at top left says so). Left panel: search box "Find nodes, edges, values", Selection, PageRank (77), Everything. Right panel shows PageRank style.

## Step 1
Tom: "That's the lab map look, all orange. I need the ties with 10 or more chapters. There's a box that says find values -- I'll click it and see what it offers."
`--step $S --click "Find nodes, edges, values"`
Result: 02.png. The box is focused, nothing else changed, no suggestions shown.

## Step 2
Tom: "It just sits there. I'll type the number I care about, 10, and see what it finds."
`--step $S --type "10"`
Result: 03.png. A list: "Edges 2" -- MmeMagloire -- Myriel (shared_chapters: 10) and Bossuet -- Enjolras (shared_chapters: 10). Under "Values": "Select where shared_chapters is 1..." (cut off).

## Step 3
Tom: "Two ties with exactly 10. But I want 10 or more -- those two can't be all of them. The line below says 'Select where shared_chapters is...' -- selecting doesn't take anything off, so I'll click it and see what it selects."
`--step $S --click "Select where shared_chapters is 1"`
Result: 04.png. "2 edges selected", the two ties drawn in blue on the picture. Right panel: Summary, Edges 2. It selected only the ties of exactly 10.

## Step 4
Tom: "Good, it lights them up in blue. But it took 'is 10' literally. I want 10 and up. I'll try typing it the way I'd write it in Excel: >=10."
`--step $S --click "Find nodes, edges, values" --type ">=10"`
Result: 05.png. Under the box: 'No match for ">=10". To select by a value, type a rule such as =shared_chapters > `16`' (in small grey code text). The earlier two ties stay selected.

## Step 5
Tom: "At least it tells me what it wants. Odd little tick marks around the number, but I'll copy it exactly, only with 'greater or equal' and 10. Clear the box first."
`--step $S --click "Clear" ...` (see output) then `--type '=shared_chapters >= `10`'`
Actual command: `--step $S --click-at 276,90 --click "Find nodes, edges, values" --type '=shared_chapters >= `10`'` (276,90 is the "Clear search" X). Tool noted the click into the box was slow (over 3 s).
Result: 06.png. The box now reads the rule; below: "Rule: press Enter to select matches".

## Step 6
Tom: "It understood it as a rule. Enter, then."
`--step $S --key Enter`
Result: 07.png. "13 edges selected" under the box and at the top right; the 13 ties drawn in blue across the picture; the right panel lists each tie with its shared_chapters value (10, 13, 12, 31, 17, 12, 21, 19, 15, 17, 13, 12, 10 -- all 10 or more). Every character and tie is still on the drawing; PageRank colors untouched.

## Step 7
Tom: "There. Thirteen, every one of them 10 or above -- I checked the column, the lowest is 10. They're lit up in blue on the picture and nothing has gone. That answers it. I'm done."
`--end $S`
Result: session ended.

## In character, at the end

- Finished: yes. 13 ties of 10 or more shared chapters, all shown in blue on the drawing, nothing taken off. Lowest 10 (MmeMagloire -- Myriel, Bossuet -- Enjolras), highest 31 (Cosette -- Valjean).
- Ease: 5 of 7.
- What confused me: typing "10" only found ties of exactly 10, and the line under it ("Select where shared_chapters is 1...") was cut off, so I could not tell it meant "exactly 10" until I clicked it and saw only two. My Excel-style ">=10" got "No match"; the hint told me the form it wanted, but the little tick marks around the number in "=shared_chapters > `16`" are not something I would ever have guessed, and that hint is small grey code text. Once I copied the pattern it worked first time, and the count and the list with each value were right there -- I could check the lowest was 10 without counting by hand.
