# Tree test -- Morgan Reyes (screen-reader analyst)

Morgan read the outline as text, top to bottom, the way they would read a page by headings.
Opening remark: "The outline tells me where things sit: top of the window, left edge, bottom
of the canvas, right side. I never see that. And I am told the toolbar is 'icons, named by their
tooltips', which makes me nervous. Fine. It's a text outline, so I can read it."

## tree01 -- the go-betweens

Path: "That's betweenness. I want a ranking." Toolbar > Analyze > looked at "Search, or say what
to find" and skipped it ("say what to find" sounds like a chatbot) > Rank nodes and edges.
End: Toolbar > Analyze > Rank nodes and edges (expect betweenness inside).
Sure: 5. "Find paths and edge sets" made me hesitate for a second; go-betweens are about paths.
But what I want is a ranked list of people, so Rank. Whether it tells me normalized or raw is the
next question, and the outline doesn't say.

## tree02 -- colleague's note about a cluster

Path: Rail > Notes > Find in notes. "Show" has "about the selection", so I could also pick the
cluster first. Saw Graph > The list of rows > Notes as well, and Inspector > Data tab > Notes.
End: Rail > Notes > Find in notes (or Every note, newest first).
Sure: 6. Three places say "Notes". I'll assume they are the same notes. If they aren't, I can't
tell them apart.

## tree03 -- picture for Friday's slides

Path: Header > Project name > Export... > Image.
End: Project name > Export... > Image.
Sure: 6. "Project name, click it for its menu" -- a menu hiding behind a name is not where I'd
start, but Ctrl+E is listed, and Export is the word I'd search for. A colleague makes my pictures
anyway.

## tree04 -- colleague's lab colors and settings file

Path: First went to Main menu > Settings... "Settings" is the word in the email. Theme, Number
format, Privacy... those are mine, not a file someone sent me. Backtracked. Header > Project name
> Apply recipe or style file...
End: Project name > Apply recipe or style file...
Sure: 5. "Style file" sounds like colors. I don't know what a "recipe" is and whether my
colleague's file is one or the other. I'd try it and hope it says which.

## tree05 -- what changed since Tuesday

Path: Header > Project name > Version history. Glanced at Undo, but that's only my own last steps.
End: Project name > Version history.
Sure: 6. Assuming it lists who did what, in text, with dates.

## tree06 -- leave out small transfers everywhere

Path: Header > "Full graph (filter)" -- that sounds like a status, not a place to build a rule.
Rail > Data > Filters (+ adds a step).
End: Rail > Data > Filters > + (add a step on the weight or amount).
Sure: 5. The question I'd ask: does a filter here change the numbers, or only the drawing? The
task says both. Nothing in the outline promises the counts and rankings follow the filter.
Also saw Graph row menu "Filter to..." and attribute "Filter to...". Three filter entries. I'd
assume they all land in Data > Filters.

## tree07 -- 40 swipes together means a tighter tie

Path: "In NetworkX I'd collapse the multigraph and sum the count as weight." Rail > Data >
Attributes -- nothing about weight. Backtracked to Data > Sources > my file's menu > Edit
source... > the data page > The chosen table. Saw column role "Weight", but I have no weight
column, just repeated rows. Then "One edge per: Row | Pair". Pair is the collapse.
End: Data page > The chosen table > One edge per: Pair.
Sure: 3. It collapses repeats, fine. Whether it keeps the count, and whether every analysis then
uses that count as weight, I can't tell from here. If it just merges 40 rows into one plain edge,
that is the opposite of what I want. I'd want it to say what it's doing with the count.

## tree08 -- the drawing is a tangle, try another arrangement

Path: Toolbar > View -- Fit, standard views, 2D/3D. That's the camera, not the arrangement.
Backtracked. Canvas right-click > Re-run layout and Reshuffle layout seed -- same method, new
roll of the dice. Not what I asked. Inspector > Style tab > Layout (when nothing is selected) >
Method.
End: Inspector > Style tab > Layout > Method.
Sure: 4. Layout under "Style" is a surprise, and "only when nothing is selected" means if I have
something picked I won't find it at all. Good that the seed is listed next to it; I'd set it.

## tree09 -- keep this camera angle for Monday

Path: Rail > Views > Save view (+). Also Toolbar > View > Save view.
End: Rail > Views > Save view.
Sure: 6. Two buttons for one thing, both called Save view. As long as they're the same list.

## tree10 -- how far groups moved between last month and this month

Path: Rail > Graph > Graph switcher > Compare graphs... Considered the row menu "Compare with
another row..." -- run the grouping on both months and compare the two groupings. That's closer
to what I'd do in Python.
End: Graph switcher > Compare graphs...
Sure: 4. "Compare graphs" might only tell me nodes and edges added and removed, not where the
groups went. If it doesn't, I'd go to the grouping row and "Compare with another row...". Two
compares, I don't know which one answers this.

## tree11 -- pick everyone matching a typed rule

Path: Graph > Find rows and notes -- that finds rows in the list, not people. Toolbar > Analyze
> Search, or say what to find -- "say" again, I don't want to talk to it. Main menu > Select
where...
End: Main menu > Select where...
Sure: 4. A selection command in the same menu as New project and Settings is an odd home, but the
words fit exactly. Data > Attributes > "Create set where this is..." also nearly fits, but that's
one attribute, and I have two conditions.

## tree12 -- what does it send back to its makers

Path: Main menu > Settings... > Privacy. Also noticed Header > "Local only (privacy)".
End: Settings > Privacy (and the "Local only" item in the header to check the current state).
Sure: 6. This is the first thing I'd look for before loading patient data. "Local only" being
right there in the header is the most reassuring line in the whole outline -- if it's a real
control with a name a screen reader says, and not a colored dot. Diagnostics is also under
Settings; I'd check that too, because that's usually where the sending hides.

## tree13 -- rerun everything from March on April's numbers

Path: Rail > Data > Sources > March file's menu > Replace with file...
End: Data > Sources > (March file) > Replace with file...
Sure: 5. I'd then expect to press Rerun on each row in Graph, or for it to rerun itself. The
outline doesn't say which. And I'd want March kept somewhere -- Save as first, probably, because
nothing tells me Replace keeps the old numbers.

## tree14 -- name next to each person, department under it

Path: Rail > Data > Attributes > name > Label by. Then department... "Label by" again would
probably replace the name. Inspector (nothing selected) > Style tab > Label (+ adds a label
line).
End: Data > Attributes > name > Label by, then Inspector > Style > Label > + for department.
Sure: 4. Two places to set labels, and I'm not certain the second one adds a line under the first
rather than replacing it. "+ adds a label line" suggests it does.

## tree15 -- hide three people but keep them in every count

Path: Selected the three from the Table (Nodes). Selection bar > Hide on canvas. Not "Filter" --
filters remove things from the numbers, I assume.
End: Selection bar > Hide on canvas (same as right-click on a node > Hide on canvas).
Sure: 4. "On canvas" is the right hint: the drawing only. But I don't trust it until the
rankings say they still include them. And "Show hidden elements" in the Main menu next to
"Show hidden rows" in the list -- two kinds of hidden. I can't tell them apart from the names.

## tree16 -- scores came in as words

Path: Rail > Data > Attributes > score's menu > Read as...
End: Data > Attributes > score > Read as...
Sure: 5. "Read as" is vague, but it's the only thing that sounds like changing a type. Also
looked at the data page's "Type", but that's next to "Each row is a node or an edge", so it's
probably the table's type, not the column's.

## Overall

Where I'd look is mostly where things are. What I can't tell from the outline is what a thing
does to the numbers: filter versus hide, Pair versus a weight, Replace versus a new graph,
Compare graphs versus compare rows. Those are the questions I'd ask a moderator, and I'm only
allowed one per task.

Would I use this instead of my scripts? Not from an outline. Ask me after I've pressed Tab.
