# Session r1-s46 -- Dana (regular analyst), task T22, dataset B (Les Miserables)

Build: 946256efb876 (served from `.study-builds/tier2-r1d4-946256efb/`).

Prompt: "You have used this program a few times. The ready-made network of characters from Les
Miserables is already open; each tie counts the chapters two characters share. You want to see
where the closest pairs sit in the whole cast. Without taking any character or tie off the
drawing, make every tie of 10 or more shared chapters stand out from the rest, and tell us how
many there are."

Commands are run from `design/ui/studio/tool`, with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/` and
`S=<this folder>`.

## Step 01 -- start

    ./with-browser.sh node real.mjs --start $S setup:lesmis-ranked.txt

Screenshot 01.png. The map I left last time: dots colored and sized by the ranking, the key at top
left says Size and Color are PageRank. Left list: Selection, PageRank (77), Everything. Right side
is the Style panel with a Nodes / Edges switch. The ties are thin grey lines. I need the ties with
10 or more chapters to stand out. The ties are "edges" here, so I will try the Edges side of the
Style panel first and see whether I can color them by their number.

## Step 02 -- Edges side of the Style panel

    node real.mjs --step $S --click "Edges"

Screenshot 02.png. The Edges side has three headings: Line, Arrows, Label, each with a plus. This
panel is under "PageRank" at the top right, so I think I am styling the ranking's layer, which is
odd for ties, but Line is the obvious place for how a tie looks. I will open Line with its plus
and see if I can make lines thicker or a color based on the chapter count.

## Step 03 -- (tool lookup, no change in the app)

    node real.mjs --step $S --hover-icon 1

Screenshot 03.png. I only hovered the first unlabeled icon (the main menu, "open, save, export,
settings") while looking for the plus by Line. Nothing changed. Next I click the plus beside Line.

## Step 04 -- plus beside Line

    node real.mjs --step $S --click-at 1419,168

Screenshot 04.png. A short menu: Color, Width, Opacity, Pattern, Curved. In Excel I would do this
with conditional formatting: a color when the cell is 10 or more. Color is the closest, so I will
pick it and see whether it lets me set a cutoff or only one color for every tie.

## Step 05 -- Color

    node real.mjs --step $S --click "Color"

Screenshot 05.png. The tool printed browser click-wait lines ("done scrolling", "performing click
action"); I cut the output short and missed the start of the message, so I cannot say whether the
click was refused. What I see: the Line heading still shows only its plus, nothing new under it,
but the key at top left now has a new first entry, "Edge color: Everything" with a grey swatch,
and the whole drawing jumped -- smaller and shifted, the dots in different places. So something
was added, to "Everything" rather than to the ranking, and it did not show up where I added it.
Not what I wanted, and the picture moving by itself bothers me. This route colors every tie the
same anyway. In my head this is a filter: "show me the rows where the number is 10 or more". The
box at the top left says "Find nodes, edges, values", so I will try typing a condition there the
way I would in an Excel filter.

## Step 06 -- click the find box

    node real.mjs --step $S --click "Find nodes, edges, values"

Output:

    could not click "Find nodes, edges, values": elementHandle.click: Timeout 3000ms exceeded.
        - attempting click action
        - waiting for element to be visible, enabled and stable

Screenshot 06.png. Nothing changed: the same jumped drawing, the find box is right there and
looks normal, but it would not take my click. No message on screen. (Step 05's cut-off output
showed the same kind of click-wait lines, so the Color click probably failed the same way, which
would explain why nothing appeared under Line.) I will click straight on the box where I see it.

## Step 07 -- click on the find box by position

    node real.mjs --step $S --click-at 180,90

Output: `at 180,90: combobox "Find"`. Screenshot 07.png. The box now has a blue focus outline.
Nothing dropped down. I will type the condition the way I would in an Excel number filter.

## Step 08 -- type a condition

    node real.mjs --step $S --type ">= 10"

Screenshot 08.png. Under the box: `No match for ">= 10"`. No hint of what it would accept. Fair
enough, it does not know which number I mean. I do not know what this program calls the chapter
count on a tie. I usually check what loaded on the Data place, so I will go there and look at
the ties' columns.

## Step 09 -- Data place

    node real.mjs --step $S --click "Data"

Screenshot 09.png. Data place: Sources (Les Miserables, 77 nodes, 254 edges; Node table; Edge
table), Filters with a plus, and Attributes: nodes have id and name, edges have one number,
"shared_chapters". So that is the column. There is a Filters plus, but a filter in my world hides
rows, and I was told not to take anything off the drawing, so I stay away from it. I will click
shared_chapters to see what it tells me about the number.

## Step 10 -- shared_chapters

    node real.mjs --step $S --click "shared_chapters"

Screenshot 10.png. A summary for shared_chapters: Edges, Amount, from the file, 100% have a value,
17 distinct values, range 1 to 31. Useful, but no "count above X" and no way to act on it here.
Now I know the name, so I go back to the Graph place and try the find box again with the column
name in front.

## Step 11 -- back to Graph

    node real.mjs --step $S --click "Graph"

Screenshot 11.png. Back on Graph. The find box is empty again (my ">= 10" is gone), the right
panel shows the graph overview: 77 nodes, 254 edges. I click into the find box and type the
condition with the column name.

## Step 12 -- type the condition with the column name

    node real.mjs --step $S --click-at 180,90 --type "shared_chapters >= 10"

Screenshot 12.png. `No match for "shared_chapters >= 10"`. Same as before. Maybe it only searches
once I press Enter, like a search box on a website. I will press Enter.

## Step 13 -- Enter

    node real.mjs --step $S --key Enter

Screenshot 13.png. Enter did nothing; still "No match". So the box is a text search: it looks for
the words. In Excel conditional formatting you write a formula, and a formula starts with "=".
One more try in that style before I give up on this box: clear it and type the formula form.

## Step 14 -- formula form

    node real.mjs --step $S --key Control+a --type "=shared_chapters >= 10"

Screenshot 14.png. Now it reacted. In red: "Put numbers in backticks: shared_chapters > `16`".
Backticks? I had to look at the example to see it means those little tick marks around the
number. And why 16 when I typed 10? Odd example, but fine -- it is telling me the syntax. I will
put the 10 in ticks.

## Step 15 -- with backticks

    node real.mjs --step $S --key Control+a --type "=shared_chapters >= \`10\`"

Screenshot 15.png. Grey text now: "Rule: press Enter to select matches". It took it. No count yet.
Press Enter.

## Step 16 -- Enter

    node real.mjs --step $S --key Enter

Screenshot 16.png. That is it. Under the box: "13 edges selected"; Selection in the list shows 13.
On the drawing, 13 ties are now thick blue lines, and every other character and tie is still
there in grey. The right panel says "13 edges selected" and has a table, "Selected edges", with
each pair and its shared_chapters: MmeMagloire -- Myriel 10, Thenardier -- MmeThenardier 13,
Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert -- Valjean 17, Marius -- Gillenormand 12,
Marius -- Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras 15, Courfeyrac -- Enjolras 17,
Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet -- Enjolras 10. I checked the
column: every value is 10 or more, and both 10s are in, so ">=" worked as I meant. The close pairs
sit in the middle of the cast, around Valjean and the students' cluster, plus one thick line down
to the lower hub. I stop here.

## End

    node real.mjs --end $S

## Debrief (in character)

**Finished?** Yes. 13 ties have 10 or more shared chapters. They stand out as thick blue lines,
and nothing was taken off the drawing.

**Ease: 3 out of 7.**

**What confused me:**

- I went to the Style panel first, because "make it stand out" is a look. Edges > Line > Color
  only colors every tie the same; there is no "when the number is 10 or more" there. And picking
  Color did not show anything under Line, yet the key gained "Edge color: Everything" and the
  whole drawing jumped and re-arranged itself. I do not know what I changed, and I did not like
  the picture moving.
- Twice the program would not take a click on a control that was plainly on screen (the Color
  item, then the find box), with no message. Clicking the box by its position worked.
- The find box says "Find nodes, edges, values". I typed ">= 10", then "shared_chapters >= 10",
  then pressed Enter: each time just "No match". Nothing told me a condition has to start with
  "=". I only got there because Excel formulas start with "=". Somebody who does not think in
  Excel formulas would have stopped there.
- I had to leave for the Data place to learn what the number is called (shared_chapters). Nothing
  near the find box offered the column names.
- "Put numbers in backticks" -- I had to read the example to work out what a backtick is. And the
  example said 16 when I had typed 10.
- The answer itself was good: the count in three places, and the table of pairs with the number
  beside each -- that table is the part I would actually use. But it is a "selection": I am not
  sure it stays if I click somewhere else, and for a slide I would want it to stay. In Excel this
  is two clicks of conditional formatting; here it took me about fifteen steps.
