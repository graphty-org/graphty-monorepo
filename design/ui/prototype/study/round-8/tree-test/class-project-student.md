# Tree test transcript: the student with a class project (Dev)

Participant: Dev, a third-year history student on his first graph tool. He has watched one
tutorial (import, layout, size by degree, find communities, betweenness, labels, preview,
export) and looks for each step by that tutorial's words. He saw only the text outline of the
app's menus. Confidence is 1 (pure guess) to 7 (certain).

## tree-1: something ready-made to try

Path: Start screen > Samples.
"Samples, with one line on what each is good for. That's exactly what I'd click first, I want
to see what a finished one looks like before I touch my own spreadsheet."
End: Start screen > Samples. Confidence: 7.

## tree-2: bring in the spreadsheet from Downloads

Path: Start screen > Start > read "Open project or file..." and "New from data...".
"I don't have a project, I have a spreadsheet. 'Open project or file' might also work, but
'New from data' sounds like where a spreadsheet goes. I'd probably just drag it in, honestly,
since it says drop a file anywhere." Then expects the Data page: "Each row is: an edge, From ->,
To ->. That matches the tutorial's 'Edges table'. I'd look for where it asks about comma vs
semicolon -- maybe File settings."
End: Start > New from data... (drop as backup). Confidence: 5.

## tree-3: who the whole network depends on most

Path: I look for "Statistics" -- not there. Toolbar > Analyze. Reads the list. Tries
"Measure the graph" first because it sounds like statistics. "Hmm, 'the graph' sounds like one
number for the whole thing, not per person." Back up. "Rank nodes and edges" -- ranking is a
tutorial word, and betweenness is a ranking of people.
End: Toolbar > Analyze > Rank nodes and edges. Confidence: 4. "I'd hope betweenness is in
there by that name. If it's not called that I'm lost."

## tree-4: name beside each person, team under it

Path: I look for "Labels". Scrolling down the outline the first label thing I see is under
Data > Attributes > an attribute's menu > "Add label line". "So I pick the name column, Add
label line, then the team column, Add label line again, and I guess the second one goes
under?" Later I also see Inspector > Style tab > Label (+ adds a label line), which seems like
the same thing. "Two places, fine, either one."
End: Data > Attributes > (name) > Add label line, then (team) > Add label line.
Confidence: 4. "Not sure the order is the order on screen."

## tree-5: try a different arrangement

Path: Toolbar > Layout > Method. "Layout is the tutorial word, Method is where ForceAtlas or
whatever would be." Noticed the canvas right-click "Re-run layout" and "Reshuffle layout seed"
but those sound like the same arrangement again.
End: Toolbar > Layout > Method. Confidence: 6.

## tree-6: picture for tomorrow's slides

Path: Header > Project name > Export... > Image. (Also saw Export in the three-line menu.)
"The tutorial calls it Preview then export. Image is the obvious one."
End: Project name > Export... > Image. Confidence: 6.

## tree-7: everyone's scores in Excel

Path: Project name > Export... Options: Image, Video, Report, Recipe, Data. "Data, I guess?
But 'Data' might just give me back my own spreadsheet without the scores. Report might be a PDF."
I would pick Data and open it to check. If the scores weren't in it I'd give up and ask. I only
noticed Table > Table options > Export table as CSV after reading the whole outline -- "oh, that
might be the real one, if the scores show up as columns in the table."
End: Export... > Data. Confidence: 3.

## tree-8: stop now, carry on tomorrow

Now: Save (Ctrl+S). Header > Project name > Save. First time it probably asks for a name.
Tomorrow: Start screen > Recent projects > my project.
"My fear is it saves the data but not the colors and where the dots are. Gephi tutorials warn
about that. I wouldn't know about 'Save view' and I wouldn't think to use it."
End: Save today, Recent projects tomorrow. Confidence: 6.

## tree-9: leave out small ties everywhere from now on

Path: I look for "filter". First see Header > "Full graph (filter)" -- "no idea what that
is, it sounds like it's showing me something, not a setting." Then Data > Filters (+ adds a
step). "Add a step: weight over something. Each step has a checkbox, so it's on." 
End: Data > Filters > + step. Confidence: 3. "I don't know if the rankings would also leave the
small ties out, or only the picture. 'Every number' -- I'd just have to trust it."

## tree-10: colleague's colors and settings, no data

Path: Main menu > "Apply recipe or style file...". "Style file is the colors. I don't know what a
recipe is -- food? -- but the style file part matches."
End: Main menu (or Project name) > Apply recipe or style file... Confidence: 5.

## tree-11: select everyone matching a typed rule

Path: First thought: Graph > "Find rows and notes" -- "find" is a search. But it says rows and
notes, not people. Back. Toolbar > Analyze > "Search, or say what to find" -- tempting, but that's
inside Analyze, which is for scores. Back. Main menu > "Select where..." -- "select people where
country is X and score over 50. That reads like the rule."
End: Main menu > Select where... Confidence: 4. "Weird that it's in the three-line menu next to
Save."

## tree-12: add this week's swipes to last week's list

Path: Not Open project or file (that would open a new one). Data > Sources > last week's file >
its menu > "Add rows from file...". "Add rows, that's literally what I want."
End: Data > Sources > (file) > Add rows from file... Confidence: 5.

## tree-13: rerun everything from March on April's numbers

Path: Data > Sources > March file > "Replace with file...". "Replace March with April. I'm hoping
the groups and rankings redo themselves." Considered right-clicking each ranking and "Rerun" but
that would be one at a time. Did not consider Recipe -- I don't know what it is.
End: Data > Sources > (March file) > Replace with file... Confidence: 4. "If it just swaps the
file and the scores stay March's, I'd never notice."

## tree-14: pairs that appear 40 times count more than once

Path: I'd look for "weight" -- the tutorial mentioned weight columns. I don't have a weight
column though. Data > Sources > the file > "Edit source..." to get back to the setup page. There:
"One edge per: Row | Pair". "Pair... maybe that merges the 40 rows into one tie? Then Weight is
right below it." I'd pick Pair and then stare at Weight not knowing what to put.
Also looked at Attributes > "Read as..." first and backed out.
End: Data > Sources > Edit source... > One edge per: Pair (and Weight). Confidence: 3. "I'd
need someone to tell me this counts the repeats."

## tree-15: see one result alone for a moment

Path: First tried Legend (L) on the toolbar, since the legend is where colors are explained --
nothing there to turn things off. Back. Rail > Graph > the list of rows: "Rows added by Analyze,
each with its eye." "Eye means hide. I'd click the eyes of the others off." Then found the
right-click menu: "Show only this row". "Oh, that's the one, and I guess clicking it again brings
them back?"
End: Graph > (the result's row) > right-click > Show only this row. Confidence: 5.

## Dev's overall comments

- "Samples, Export > Image, Layout and Save were exactly where I expected."
- "I never found the word 'statistics', 'betweenness' or 'communities'. 'Rank' and 'Find groups'
  were close enough once I read them twice."
- "The three-line menu and the project-name menu have mostly the same stuff. I'd stop trusting
  that one of them has everything."
- "Recipe means nothing to me. Weight without a weight column, and 'Pair', I'd have to ask."
