# Tree test transcript: the Gephi holdout (Dr. Mara Lindqvist)

Text outline only. Confidence is 1 (pure guess) to 7 (certain). Her words in quotes.

## tree-1 -- something ready-made to try

Path: Start screen > Samples.
"Samples. Fine. I would rather drag my own GEXF in, but if I have nothing, that is where the
Les Miserables equivalent lives." Did not look further.
End: Start screen > Samples (each sample). Confidence 7.

## tree-2 -- bring in a spreadsheet from Downloads, first launch

Path: Start screen > Start > Open project or file... (Ctrl+O).
"In Gephi, File > Open on a CSV gives you the import report. Same reflex." Noticed "New from
data..." directly below and paused: "Is a CSV 'a file' or 'data'? Both, obviously." Stayed with
Open, because Ctrl+O is in her hands; would drop the file on the window if Open did not take it.
End: Start > Open project or file... (second choice: New from data...). Confidence 5.

## tree-3 -- who the whole network depends on most

Path: looked for "Statistics" in the rail first -- Graph, Data, Views, Notes, Assistant. None of
them. "Assistant, no." Went to the toolbar > Analyze > Rank nodes and edges.
"Betweenness is a ranking, so I assume it is under Rank. 'Depends on most' could be PageRank
too; I expect both there." Did not open Find groups or Measure the graph. Worry, said out loud:
"Measure the graph -- is that average path length and density? Then why is betweenness not
there too?"
End: Toolbar > Analyze > Rank nodes and edges. Confidence 5.

## tree-4 -- name beside each person, team under it

Path: looked at the toolbar for a label button like Gephi's bottom bar ("the T"). Not there.
Went to Inspector > Style tab > Label (+ adds a label line). "Label line, plural -- so a second
line is the team. Good." Then noticed Data > Attributes > an attribute's menu > Add label line,
and was annoyed: "Two places. Which one is the real one?" Kept the Inspector, because that is
where the rest of the appearance is.
End: Inspector > Style tab > Label (+), twice: name, then team. Confidence 4 (unsure the
Inspector shows graph-wide label settings when nothing is selected, though the outline says so).

## tree-5 -- try a different arrangement

Path: Toolbar > Layout > Method.
"Method is the algorithm list. I want ForceAtlas2 by name in there." Also saw Inspector >
Layout tab > Method and the canvas right-click "Re-run layout". Did not backtrack.
End: Toolbar > Layout > Method. Confidence 6.

## tree-6 -- picture of the drawing for tomorrow's slides

Path: Header > Project name menu > Export... > Image.
"Export, Image. This is my Preview. If Image only means PNG I will be cross, but for slides PNG
is fine." Saw that Main menu also has Export... (Ctrl+E); same thing, she assumed.
End: Project name > Export... > Image. Confidence 6.

## tree-7 -- the computed scores in Excel

Path: "Data Lab, export table." Looked for the table: Table (bottom) > Table options (...) >
Export table as CSV...
Briefly considered Project name > Export... > Data, then: "Data could be the whole graph as
GEXF. I want the node table, so the table's own export." Excel opens CSV.
End: Table > Table options > Export table as CSV... Confidence 6. (Only after checking that
the score columns actually appear in Columns.)

## tree-8 -- stop now, carry on tomorrow

Now: Save (Ctrl+S). "Before anything else. Where does it save to -- my disk or some server? It
is a browser app, I am not trusting it until I see a file." 
Tomorrow: Start screen > Recent projects > (the project).
Fallback if the list is empty after clearing the browser: Open project or file... and pick the
file she saved.
End: Save now; Recent projects tomorrow. Confidence 6 for the steps, 3 that the work actually
survives.

## tree-9 -- from now on, leave out the small ties everywhere

Path: Data > Filters (+ adds a step), an edge weight range.
"Filter on weight. That is what I would do in Gephi -- and in Gephi the statistics would then
follow the filter, which is the thing I complain about. Here I need it to follow, so it had
better." Noticed the header shows "Full graph (filter)" and took that as the switch that tells
her the filter is on. Did not trust that "every number" obeys it: "I would run degree with and
without and compare."
Considered Settings > General for a global "minimum weight" -- rejected: "Settings is for the
program, not my data."
End: Data > Filters > + (weight step). Confidence 4.

## tree-10 -- colleague's colors and settings file, no data in it

Path: Main menu > Apply recipe or style file...
"Style file. That is literally the words. In Gephi this does not exist, I copy the palette by
hand." Unsure what a "recipe" is versus a style file, and did not care.
End: Main menu (or Project name menu) > Apply recipe or style file... Confidence 6.

## tree-11 -- pick out everyone matching a typed rule

Path: first Data > Filters, because "filter and query are the same word for me." Then stopped:
"Pick out, not hide. I want them selected." Backtracked to the Main menu, which she had scanned
earlier, and found Select where...
Also saw Data > Attributes > an attribute's menu > Select where (this attribute) is..., and
rejected it: "That is one attribute. My rule has country AND score."
Ignored Analyze > "Search, or say what to find": "'Say what to find' sounds like a chatbot."
End: Main menu > Select where... Confidence 4. (Would a filter step do it too? She is not sure
which the tool wants.)

## tree-12 -- add this week's swipes to last week's list

Path: Data > Sources > last week's file > its menu > Add rows from file...
"Gephi calls this 'append to existing workspace'. Add rows is clearer, actually." Did not
consider Open project or file..., which she expects to open a new network.
End: Data > Sources > (file) menu > Add rows from file... Confidence 6.

## tree-13 -- rerun March's work on April's export

Path: Data > Sources > March's file > its menu > Replace with file...
"Replace the data, keep everything built on it -- if that is what it does. In Gephi I redo the
whole Appearance panel." Hesitated over Main menu > Apply recipe or style file... and Export >
Recipe: "Maybe recipe is the replay. But then I have to export March's recipe first, open April
as a new thing, and apply it. Two steps, and I do not know what a recipe contains." Went back to
Replace, then worried: "Does replacing rerun the groups and the rankings, or just leave March's
numbers sitting on April's nodes? That is the Gephi stale-column problem all over again."
Row right-click > Rerun exists, so she assumed she might have to rerun each one by hand.
End: Data > Sources > (file) > Replace with file... Confidence 3.

## tree-14 -- 40 co-occurrences count more than 1, in every analysis

Path: "This is an import question -- how rows become edges." Data > Sources > the file's menu >
Edit source... which opens the Data page. There: One edge per: Row | Pair -- picked Pair, and
the Weight setting next to it. "If Pair merges duplicate rows and the weight becomes the count,
that is exactly it. In Gephi the import wizard does 'merge parallel edges, sum'." Not certain
Weight without a column means "count of rows". Then wondered whether "every analysis" also needs
something in Analyze ("does betweenness use weights by default? Show me the option.").
End: Data > Sources > Edit source... > Data page > One edge per: Pair, plus Weight. Confidence 4.

## tree-15 -- see one coloring result alone for a moment

Path: Rail > Graph > the list of rows > Rows added by Analyze, each with its eye. First idea was
to turn off the other eyes one by one; then found the row's right-click menu > Show only this
row. "Solo. Good, as long as turning it off brings the others back exactly as they were."
Glanced at the Legend card, did not expect it to toggle anything.
End: Graph > the result's row > right-click > Show only this row. Confidence 5.

## Her overall remarks (unprompted)

- "Where are the statistics? I had to guess that 'Rank' means centrality. Measure the graph,
  Rank, Find groups -- three doors for what Gephi puts in one Statistics panel."
- "Select where, Filter to, Filters, Show only this row, Hide on canvas -- that is five words
  around filter and select. I will mix them up in front of students."
- "Label settings in two places, export in two menus. Pick one."
- "Nothing told me whether a number follows the filter. That is the first thing I would test."
