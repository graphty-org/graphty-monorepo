# Tree test: Priya, threat hunter in a corporate SOC

Participant: simulated from `../../personas/cybersecurity-analyst.md`. She saw only the text
outline of the navigation, one level at a time. Two separate sessions with no memory of each
other: arm A (Results is a section of the right panel) first, then arm B (Results is a place on
the rail). Arrows are the steps she took; "back" is backtracking. Confidence is 1 (guess) to 7
(certain).

Her opening remark, both sessions: "Where's the line that tells me whether this calls out? Oh --
'Nothing has been sent from this project', under the name. Fine. Where's the query box? There
isn't one. Filter chip, I guess, is the closest thing."

## Arm A: Results in the right panel

### tt-1. A second way of ranking which characters matter

Main menu -> Algorithms -> Centrality.
"Ranking who matters is centrality. Betweenness was probably the first one, so PageRank or
eigenvector as the second. I didn't even look at the right panel."
End: Main menu > Algorithms > Centrality. Confidence 6.
First top-level place: Main menu.

### tt-2. How Valjean scored and where he places

Bottom table -> Search.
"I know the name, so I search for it. It says every result column is shown on the row. That's
the score. 'Where he places' -- I'd sort the column after."
End: Bottom table > Search. Confidence 6.
First top-level place: Bottom table.

### tt-3. Find how an earlier calculation was set up, to repeat it exactly

Data (rail) -> Sources -> "Each file or query, with the choices made when it was loaded" -> back
-> back -> Right panel, with nothing selected -> Results -> Each run, newest first.
"My notebook is the record of what I ran. Here I went to Data first because that's where the
settings for the load are, but that's the import, not the calculation. Results, each run -- I'd
open the run and hope it shows the parameters and the seed. Nothing here says 'history' for
runs, which is what I'd call it."
End: Right panel, with nothing selected > Results > Each run. Confidence 4.
First top-level place: Data (rail).

### tt-4. Every character's score in one list, highest first

Bottom table -> Column header menu (sort).
"That's a table sorted descending. That's the one thing I know every tool does."
End: Bottom table > Column header menu (sort). Confidence 7.
First top-level place: Bottom table.

### tt-5. Cheapest route; make a bigger transfer count as more expensive

Main menu -> Selection -> Path between... -> back -> Canvas -> Floating toolbar -> Path (pick two
nodes; options: weight by, what a bigger value means).
"Path between says nothing about weight. The toolbar one actually says 'what a bigger value
means', which is literally the question. Half the tools I've used get this backwards and never
tell you. I'd still want to see which column it used on the result."
End: Canvas > Floating toolbar > Path (options). Confidence 5.
First top-level place: Main menu.

### tt-6. A picture of the network for a paper

Main menu -> File -> Export...
"Export. Not 'Share', I'm not touching anything called Share. I'd want a legend on the picture."
End: Main menu > File > Export... Confidence 7.
First top-level place: Main menu.

### tt-7. Bring in a colleague's file of colors and sizes

Main menu -> File -> (reads Open...: "opens a file as a new project" -- no) -> back -> Recipes ->
Apply a recipe...
"There's no Import. Open makes a new project, that's not it. 'Recipes' is a cooking word but
it's the only thing that sounds like a reusable package of settings. Guessing. And I'd want to
know what's in that file before I apply it."
End: Main menu > Recipes > Apply a recipe... Confidence 3.
First top-level place: Main menu.

### tt-8. Next month's transfers file, with everything carrying over

Main menu -> File -> Update with new data...
"That's the one I actually care about. Same hunt, next month's export. If this really keeps my
filters and runs, that's the reason I'd keep the tool."
End: Main menu > File > Update with new data... Confidence 7.
First top-level place: Main menu.

### tt-9. Two groups in colors you cannot tell apart

Canvas -> Legend -> Each entry's swatch.
"The legend is where the colors are. Click the swatch, pick another one. There's a 'too close'
flag too -- fine, if it flags it for me."
End: Canvas > Legend > an entry's swatch. Confidence 6.
First top-level place: Canvas.

### tt-10. Accounts that take in far more money than they send out

Bottom table -> Column header menu -> new column -> back -> back -> Main menu -> Algorithms ->
Centrality (Weighted degree: in, out, total).
"First instinct: money in minus money out, as a column, sort it. That's how I'd do it in Splunk.
'New column' is there but I don't know if it can sum over edges. Then I saw weighted degree in
and out under Centrality. I wouldn't call that centrality, but it's the in-sum and the out-sum.
I'd run both and compare in the table."
End: Main menu > Algorithms > Centrality (Weighted degree). Confidence 4.
First top-level place: Bottom table.

### tt-11. Total money along a selected route

Bottom table -> Footer.
"The footer sums the selected rows. Good, that's the spreadsheet behavior I'd expect."
End: Bottom table > Footer. Confidence 6.
First top-level place: Bottom table.

### tt-12. How the biggest group differs from the rest of the network

Right panel, with a set, a group or a path selected -> Members -> back -> back -> Bottom table ->
Row menu (compare this group with the rest).
"Selected the group first. It gives me a count and Appearance. Nothing compares. The table's row
menu says 'compare this group with the rest', which is exactly it -- but I wouldn't have looked
in a row menu first. Also: does 'group' mean a community run or a set I made? Not clear."
End: Bottom table > Row menu. Confidence 4.
First top-level place: Right panel, with a set, a group or a path selected.

### tt-13. A stray click cleared 18 picked characters; get them back

Main menu -> Edit -> Previous selection.
"I was going for Undo, Ctrl+Z, but Previous selection is right there in the same list. That's
the one."
End: Main menu > Edit > Previous selection. Confidence 6.
First top-level place: Main menu.

### tt-14. Take out only the second of three narrowing steps

Filter chip -> Filter steps.
"This is basically my query, as steps. Delete or turn off step two. Undo would eat step three
too, so not that."
End: Filter chip > Filter steps. Confidence 6.
First top-level place: Filter chip.

### tt-15. Has anything from this project left your computer?

Data (rail) -> Sent and saved.
"The line under the name says nothing was sent, but IT wants the log, not a sentence. 'Every
file written and everything sent' is the log. That's what I'd screenshot for them."
End: Data > Sent and saved. Confidence 7.
First top-level place: Data (rail).

### tt-16. Where money went next after it left one account in early August

Right panel, with a node selected -> Header actions: Neighbors (hops, direction, a date window).
"Pivot on the account, outbound, date window on August. That's a hop. What I really want is the
hops in time order as a timeline, and nothing here says timeline."
End: Right panel, with a node selected > Header actions (Neighbors). Confidence 5.
First top-level place: Right panel, with a node selected.

## Arm B: Results on the rail

(Separate session. Same tree except Results is a rail place and the empty right panel has only
Overview and Style stack.)

### tt-1

Main menu -> Algorithms -> Centrality.
"Algorithms, centrality. I see there's a Results thing on the rail too, but starting an
algorithm is under Algorithms."
End: Main menu > Algorithms > Centrality. Confidence 6. First: Main menu.

### tt-2

Bottom table -> Search.
End: Bottom table > Search. Confidence 6. First: Bottom table.

### tt-3

Results (rail) -> Each run, newest first -> (an opened run) -> Details (the run record: method,
seed, settings).
"Results, the runs, open the one and there's a run record with the seed. That's my notebook
cell. Easy."
End: Results (rail) > an opened run > Details. Confidence 6. First: Results (rail).

### tt-4

Bottom table -> Column header menu (sort).
End: Bottom table > Column header menu (sort). Confidence 7. First: Bottom table.

### tt-5

Main menu -> Algorithms -> Path -> back -> back -> Canvas -> Floating toolbar -> Path (options:
weight by, what a bigger value means).
"Shortest path under Algorithms doesn't mention the weight. The toolbar one does."
End: Canvas > Floating toolbar > Path (options). Confidence 5. First: Main menu.

### tt-6

Main menu -> File -> Export...
End: Main menu > File > Export... Confidence 7. First: Main menu.

### tt-7

Right panel, with nothing selected -> Style stack -> Add a layer -> back -> back -> Main menu ->
Recipes -> Apply a recipe...
"Colors and sizes are styles, so the style stack. Add a layer doesn't say from a file. Recipes
is the only other thing. Guess."
End: Main menu > Recipes > Apply a recipe... Confidence 3. First: Right panel, with nothing
selected.

### tt-8

Main menu -> File -> Update with new data...
End: Main menu > File > Update with new data... Confidence 7. First: Main menu.

### tt-9

Canvas -> Legend -> Each entry's swatch.
End: Canvas > Legend > an entry's swatch. Confidence 6. First: Canvas.

### tt-10

Main menu -> Algorithms -> Centrality (Weighted degree: in, out, total).
"In and out, weighted -- there it is. I'd diff them in the table."
End: Main menu > Algorithms > Centrality (Weighted degree). Confidence 5. First: Main menu.

### tt-11

Bottom table -> Footer.
End: Bottom table > Footer. Confidence 6. First: Bottom table.

### tt-12

Results (rail) -> Each run -> (an opened run) -> Compare with... (another result, or the rest of
the graph).
"The group came from a community run, so I go to that run. 'Compare with the rest of the graph'
-- yes."
End: Results (rail) > an opened run > Compare with... Confidence 5. First: Results (rail).

### tt-13

Main menu -> Edit -> Previous selection.
End: Main menu > Edit > Previous selection. Confidence 6. First: Main menu.

### tt-14

Filter chip -> Filter steps.
End: Filter chip > Filter steps. Confidence 6. First: Filter chip.

### tt-15

Data (rail) -> Sent and saved.
End: Data > Sent and saved. Confidence 7. First: Data (rail).

### tt-16

Main menu -> Selection -> Neighbors... (hops, direction, a date window).
"Neighbors, outbound, a date window. Still not a timeline."
End: Main menu > Selection > Neighbors... Confidence 5. First: Main menu.

## Scored against the answer key (answers above unchanged)

| Task | Arm A | Arm B |
|---|---|---|
| tt-1 | correct, direct | correct, direct |
| tt-2 | correct, direct | correct, direct |
| tt-3 | correct, not direct (Data > Sources first; not a column pick) | correct, direct |
| tt-4 | correct, direct | correct, direct |
| tt-5 | correct, not direct | correct, not direct |
| tt-6 | correct, direct | correct, direct |
| tt-7 | correct, not direct (looked at File > Open... first) | correct, not direct (looked at Style stack > Add a layer first) |
| tt-8 | correct, direct | correct, direct |
| tt-9 | correct, direct | correct, direct |
| tt-10 | correct, not direct (table "new column" first) | correct, direct |
| tt-11 | correct, direct | correct, direct |
| tt-12 | correct, not direct | correct, direct |
| tt-13 | correct, direct | correct, direct |
| tt-14 | correct, direct | correct, direct |
| tt-15 | correct, direct | correct, direct |
| tt-16 | correct, direct | correct, direct |

Arm A: 16 of 16 correct, 11 direct. Arm B: 16 of 16 correct, 14 direct. On tasks 1 to 4, arm A
had 3 direct and arm B 4.

Picks counted separately: none of her final picks. On the way, task 7 looked at File > Open...
(arm A) and Style stack > Add a layer (arm B); task 3 in arm A opened Data > Sources > a file's
load choices, not a column.

## What she said that matters

- "Recipes" does not say "a file of colors and sizes" to her. She reached it both times by
  elimination, at confidence 3.
- The run record lived where she expected only when Results was its own place: in arm A she went
  to Data first to find how a calculation was set up.
- Her first move for "money in versus money out" was to build a column in the table, not to run
  an algorithm; she would not have called weighted degree "centrality".
- Only the toolbar's Path says what a bigger value means; the menu paths to shortest path do not,
  so she backed out of them.
- "Group" is ambiguous to her: a community from a run, or a set she made.
- For task 16 she found the pivot easily but wanted the hops as a timeline, which nothing in the
  tree names.
