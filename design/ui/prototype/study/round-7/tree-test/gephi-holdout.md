# Tree test: the Gephi holdout (Dr. Mara Lindqvist)

Participant: an associate professor who has used Gephi for about twelve years, teaches it, and
translates every new term back into Gephi's words (Overview, Data Laboratory, Preview, partition,
ranking, filter, statistics). She saw only the text outline of graphty's navigation. Confidence
is 1 (pure guess) to 7 (certain).

General remark before the tasks: "So the rail on the left is my Overview side panels, Data is a
mix of my import dialog and Data Lab, and the table at the bottom is the Data Lab proper. There is
no Layout panel and no Statistics panel by name. That is going to cost me."

---

## tree01 -- the go-betweens

Path: Toolbar > Analyze > Measure the graph ... back ... Analyze > Rank nodes and edges.

"Go-betweens is betweenness centrality. In Gephi that is in Statistics, and 'Measure the graph'
is the nearest thing to Statistics, so I open that first. But 'measure the graph' sounds like one
number for the whole network -- density, diameter, average path length. Betweenness is a value per
node, which is a ranking. So: Rank nodes and edges, and I expect betweenness in the list. If it is
not called betweenness I will be annoyed."

Ends at: Toolbar > Analyze > Rank nodes and edges. Confidence: 5.

## tree02 -- a colleague's note about a cluster

Path: Rail > Notes > Find in notes.

"There is a Notes section on the rail. I go there and search for the cluster's name or my
colleague's name. I notice the Graph list also has a Notes row, and the inspector's Data tab has
Notes, so it may also be attached to the grouping itself, but I start with the one called Notes."

Ends at: Rail > Notes > Find in notes (or scroll Every note). Confidence: 5.

## tree03 -- a picture for Friday's slides

Path: Header > Main menu (looking for File > Export) ... back ... Project name > Export... > Image.

"I want File, Export. The three-line menu is the closest thing to File, but there is no Export in
it -- New, Open, Settings, and some selection commands that do not belong in a File menu. Back
out. Clicking the project name gives Save and Export, so Export, Image. For slides a PNG is fine;
for a paper I would need to know whether that Image is SVG."

Ends at: Project name > Export... > Image. Confidence: 6.

## tree04 -- a colleague's colors and settings file, no data

Path: Header > Main menu > Open... ... back ... Project name > Apply recipe or style file...

"Open would open it as a project, and it has no data, so that is wrong. Settings is my own
preferences, not a style. Under the project name there is 'Apply recipe or style file'. I do not
know what a recipe is versus a style file, and the colleague did not say which one they sent, but
the words 'style file' are what I would look for. In Gephi this simply does not exist -- I would be
copying hex codes by hand."

Ends at: Project name > Apply recipe or style file... Confidence: 4.

## tree05 -- what the project looked like before Tuesday

Path: Header > Undo (considered, rejected) > Project name > Version history.

"Undo is for my last mistake, not someone else's Tuesday. Version history under the project name
is the obvious thing. Whether it shows what was done since, step by step, I cannot tell from the
outline."

Ends at: Project name > Version history. Confidence: 6.

## tree06 -- leave out the small transfers everywhere from now on

Path: Header > Full graph (filter) ... Rail > Data > Filters > (+ adds a step).

"That is a filter on edge weight -- Gephi's Edge Weight range filter. The header chip saying
'Full graph (filter)' is the first thing I would click, since it tells me no filter is on. If it
does nothing useful I go to Data, Filters, add a step on weight. And then I will check whether the
statistics run on the filtered graph or the full graph, because in Gephi they silently follow the
filter. Here I actually want them to follow it, and I want it written down that they did."

Ends at: Rail > Data > Filters (+ adds a step). Confidence: 4.

## tree07 -- 40 swipes together counts as a stronger tie

Path: Rail > Data > Attributes > (an attribute's menu) > Read as... ... back ... Rail > Data >
Sources > the file's menu > Edit source... > data page > One edge per: Pair (and a Weight column?).

"In Gephi this happens at import: the parallel edges get merged and the weight is summed. So it
must be at import here too. Attributes is the wrong place, there is no count attribute yet. Sources,
Edit source, and on the data page there is 'One edge per: Row | Pair'. Pair sounds like merge
parallel edges. Whether it then puts the count into the weight automatically, or whether I also
have to pick a Weight role for some column, I cannot tell. And I have no column that says 40, the
40 is the number of rows. I am guessing."

Ends at: Data > Sources > Edit source... > data page > One edge per: Pair. Confidence: 3.

## tree08 -- a different arrangement for the tangle

Path: Rail (looking for a Layout panel; none) > Toolbar > Pause layout / Resume layout (no choice
of method) > Canvas right-click > Re-run layout / Reshuffle layout seed (same method again) >
Inspector > Style tab > Layout (when nothing is selected) > Method.

"Where is Layout? In Gephi it is a panel on the left with a dropdown and Run. Here the rail has
Graph, Data, Views, Notes, Assistant -- no Layout. The toolbar only pauses. Right-click re-runs the
same thing or reshuffles the seed, which is not what I asked. I would finally find it in the
inspector under Style, Layout, Method, but only if I happened to click empty canvas first, since it
shows only when nothing is selected. Layout is not styling. I would have looked for a long time."

Ends at: Inspector > Style tab > Layout > Method. Confidence: 3.

## tree09 -- come back to this exact angle on Monday

Path: Toolbar > View > Save view (also seen: Rail > Views > Save view (+)).

"Save view. There are two of them, the toolbar and the Views rail, same thing presumably. And then
Save the project, or the view is gone with the browser tab."

Ends at: Toolbar > View > Save view. Confidence: 6.

## tree10 -- how far the groups moved between last month and this month

Path: Rail > Graph > Graph switcher > Compare graphs... (considered: a grouping row's right-click >
Compare with another row...).

"Two networks in one project, so the graph switcher, Compare graphs. But what I want to compare is
the modularity classes, and the grouping row has 'Compare with another row'. Is that between two
runs on the same graph or two graphs? I would try Compare graphs first, and I would want to see a
real measure -- normalized mutual information or something I can cite -- not a picture."

Ends at: Rail > Graph > Graph switcher > Compare graphs... Confidence: 4.

## tree11 -- pick out everyone matching a rule I can type

Path: Rail > Data > Filters (+ adds a step) ... back (that hides the rest, I want to select) ...
Toolbar > Analyze > Search, or say what to find (skipped -- "say what to find" sounds like a chat
box) ... Header > Main menu > Select where...

"My reflex is a filter -- in Gephi I build a query and then select. But I do not want the others
hidden, I want them picked. I remember seeing 'Select where...' in the three-line menu when I was
hunting for Export. Odd place for it, between Open recent and Settings, but that is the name of
the thing I want."

Ends at: Header > Main menu > Select where... Confidence: 4.

## tree12 -- what does it send back to its makers

Path: Header > Local only (privacy) > then Main menu > Settings... > Privacy (and a glance at
Diagnostics).

"The 'Local only' chip is the first thing I would click; it claims my data stays here, which is
what IRB cares about. To change anything I expect Settings, Privacy. Diagnostics might be where
crash reports go, so I would check that too. IT will want a sentence, not a checkbox."

Ends at: Main menu > Settings... > Privacy. Confidence: 5.

## tree13 -- rerun everything from March on April's numbers

Path: Rail > Data > Sources > the March file's menu > Replace with file...

"Replace with file is what I want. Whether the groups and rankings run again on the new data or
keep March's values I cannot tell, and I would distrust it until I see the counts change. The
alternative is Export, Recipe and then Apply recipe on a new project, which sounds like more
steps."

Ends at: Rail > Data > Sources > (file) > Replace with file... Confidence: 4.

## tree14 -- name next to each person, department under it

Path: Rail > Data > Attributes > name's menu > Label by ... then Inspector > Style tab > Label
(+ adds a label line) for department.

"Label by on the name attribute. For a second line I need the label settings, and the inspector's
Style tab has 'Label (+ adds a label line)'. Gephi cannot do two lines at all without Inkscape."

Ends at: Inspector > Style tab > Label (+ adds a label line). Confidence: 4.

## tree15 -- three people out of sight, still counted

Path: Canvas > right-click on a node > Hide on canvas (also on the selection bar).

"'Hide on canvas' says canvas, not graph, so the counts should keep them. A filter would drop them
from statistics, in Gephi at least. I would check the node count and a ranking before and after
before I believed it."

Ends at: Canvas > Right-click on a node > Hide on canvas. Confidence: 5.

## tree16 -- scores came in as words, make them numbers

Path: Rail > Data > Attributes > score's menu > Read as...

"Read as. In Gephi I would be duplicating the column with a new type in Data Lab. If Read as is
not there, the next place is the data page, the column's role, but that only offers Attribute, not
a type."

Ends at: Rail > Data > Attributes > (score) > Read as... Confidence: 5.

---

## Closing remarks, in her words

"Export, history and saved views I found straight away. Layout I nearly did not find: it is
hidden in a Style tab that only shows when nothing is selected, and that is the first thing I do
on any network. Merging repeated rows into a weight is a guess. Select where in the main menu next
to Settings is a strange home. And I still want to know, for every number, whether it ran on the
filtered graph or the whole one."
