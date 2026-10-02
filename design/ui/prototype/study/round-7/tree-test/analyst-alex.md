# Tree test -- Analyst Alex

Participant: Analyst Alex, an operations data analyst who knows Gephi and NetworkX. He reads button
names, skims everything else, and searches by algorithm name when he can.
Material: the text outline of graphty's navigation (round 7 tree), nothing else.
Confidence: 1 = pure guess, 7 = certain.

---

## tree01 -- the go-betweens between groups

"That's betweenness. I don't browse for it, I type it."

1. Toolbar (bottom) > Analyze (Shift+A).
2. Search, or say what to find -- type "betweenness".
3. If the search let me down I'd go to Rank nodes and edges, because betweenness is a ranking.

Ends at: Toolbar > Analyze > Search ("betweenness"), fallback Rank nodes and edges.
Confidence: 6. "Find paths and edge sets" made me hesitate for a second -- go-betweens sounds
path-ish -- but betweenness is a score on a person, so it's a ranking.

## tree02 -- reading a colleague's note on a cluster

"They wrote it down, so it's a note."

1. Rail > Notes.
2. Find in notes -- type the cluster name or the colleague's name. Or Show > about this graph and
   scroll the list.
3. Thought about going Rail > Graph > the grouping row and opening it, since the note is about one
   cluster, but I don't know if the note hangs off the row or off the group. The Notes rail has
   everything, so that's the safer bet.

Ends at: Rail > Notes > Find in notes.
Confidence: 5. Small worry: does "Find in notes" also find who wrote it? There's no author filter.

## tree03 -- a picture of the network for Friday's slides

1. Main menu (three lines) first, because in Gephi export is under File. Nothing called Export
   there. Backtrack.
2. Header > Project name > Export... (Ctrl+E) > Image.

Ends at: Project name > Export... > Image.
Confidence: 5. Lost a few seconds because "Export" is under the project name and not the main
menu. I'd also want to know if Image gives me PNG or SVG and what size.

## tree04 -- a colleague's colors and settings, no data, put to use on my network

1. Main menu > Open... -- but that sounds like it opens a whole project and would close mine. Didn't
   go in.
2. Main menu > Settings... -- that's my preferences (theme, number format), not a style. Backtrack.
3. Header > Project name > Apply recipe or style file...

Ends at: Project name > Apply recipe or style file...
Confidence: 5. "Style file" is the words I needed. I'd want to know if it overwrites my own colors
or adds to them, and whether I can undo it.

## tree05 -- what the project looked like before Tuesday, and what was done since

1. Header > Undo -- no, that's one step at a time and probably only this session.
2. Header > Project name > Version history.

Ends at: Project name > Version history.
Confidence: 5. The name fits. I'm assuming it shows who changed what and lets me look at the old
version without wiping the new one -- if it only offers "restore" I'd be nervous.

## tree06 -- leave out small transfers in every number and every drawing

"Filter out the small stuff. That's a filter on weight."

1. Header > Full graph (filter) -- that looks like the filter state. I'd click it, expecting it to
   take me to the filters.
2. Rail > Data > Filters (+ adds a step), add a step on the weight attribute.
3. Also saw Data > Attributes > weight's menu > Filter to... Probably the same thing from another
   door.

Ends at: Rail > Data > Filters (+), weight step.
Confidence: 4. What I can't tell from here: does a filter change the numbers (betweenness, counts)
or only what's drawn? The task said every number. Canvas has "Show filtered-out nodes faintly",
which makes me think filter might just be a visual thing. If the counts don't change I've
filtered the picture and lied in the table.

## tree07 -- 40 swipes together counts as a stronger tie than 1

"That's edge weight. But my spreadsheet doesn't have a weight column -- the 40 is just rows
repeating."

1. Rail > Data > Attributes -- looked for "weight"; there isn't one to pick because I never had a
   column. Backtrack.
2. Rail > Data > Sources > my file's menu > Edit source... -> the data page.
3. On the data page: "Each column's role" has Weight, but I have no column to give that role.
4. "One edge per: Row | Pair" -- I think "Pair" merges the 40 rows into one edge. Whether it then
   counts them as weight 40, I'm guessing.

Ends at: Data > Sources > Edit source... > data page > One edge per: Pair.
Confidence: 3. It doesn't say "count" anywhere. Honestly I'd probably do this in pandas
(groupby, size) and load a weight column instead.

## tree08 -- try a different way of arranging the tangle

"In Gephi there's a Layout panel. Here..."

1. Toolbar > Pause layout / Resume layout -- that's stop and go, not a different method.
2. Right-click empty canvas > Re-run layout, Reshuffle layout seed -- same layout, new roll. Not
   what I want.
3. Toolbar > View -- that's camera stuff. Backtrack.
4. Inspector (right) with nothing selected > Style tab > Layout > Method.

Ends at: Inspector > Style tab > Layout > Method.
Confidence: 4. Took four places. Layout under "Style" is not where I'd look -- to me layout is its
own thing, not styling. I'd also try typing "layout" in Quick actions (Ctrl+K) if I'd found that.

## tree09 -- come back to exactly this angle on Monday

1. Toolbar > View > Save view.
2. Or Rail > Views > Save view (+). Same thing, I'd guess. Then Monday: Views > your saved views.

Ends at: Rail > Views > Save view (+) (or Toolbar > View > Save view).
Confidence: 6. Only question is whether the saved view lives in the project file so it's still
there Monday after I close it.

## tree10 -- how far the groups moved between last month and this month

1. Rail > Graph > Graph switcher > Compare graphs...
2. Also saw "Compare with another row..." on a row's right-click. That might compare two
   groupings. But I have two months, which is two graphs, so Compare graphs first.

Ends at: Rail > Graph > Graph switcher > Compare graphs...
Confidence: 5. I'm not sure Compare graphs compares the groups or just the nodes and edges. If it
doesn't, I'd try Compare with another row on the grouping.

## tree11 -- select everyone matching a typed rule (country and high score)

1. Rail > Graph > Find rows and notes -- "rows" sounds like the list on the left, not people.
   Skipped.
2. Rail > Data > Attributes > country's menu > Create set where this is... -- that's one
   attribute, I need two at once. Backtrack.
3. Toolbar > Analyze > "Search, or say what to find" -- tempting, but Analyze is for algorithms.
4. Main menu > Select where... -- that's SQL. WHERE country = X AND score > Y.

Ends at: Main menu > Select where...
Confidence: 4. Once I saw it, obvious. But I'd never have looked for selection in the main menu
next to New project and Settings -- I went there last.

## tree12 -- what does this program send back to its makers, and change it

"First thing I'd look at anyway."

1. Header > Local only (privacy) -- click it, it should tell me what leaves the machine.
2. To change anything: Main menu > Settings... > Privacy. Glanced at Diagnostics too -- crash
   reports are exactly what IT asks about, so I'd check both.

Ends at: Main menu > Settings > Privacy (and Diagnostics).
Confidence: 5. The "Local only" chip in the header is reassuring. Having privacy and diagnostics as
two separate pages means I'd have to read both to answer IT.

## tree13 -- run everything built on March on April's numbers instead

"This is the thing I redo by hand every month in Gephi."

1. Header > Project name > Export... > Recipe -- then open April and Apply recipe or style file...?
   That would work but it's two trips and a new project.
2. Rail > Data > Sources > the March file's menu > Replace with file... -- that's literally "in
   place of March". Pick April.

Ends at: Data > Sources > March file > Replace with file...
Confidence: 4. Big unknown: after replacing, do the groups, rankings and colors rerun by
themselves, or do I have to hit Rerun on every row? There's "Refresh" and "Rerun" in different
places. If it silently keeps March's rankings on April's nodes, that's the report-goes-out-wrong
scenario.

## tree14 -- name next to each person, department written under it

1. Rail > Data > Attributes > name's menu > Label by. That does the name.
2. Same for department > Label by -- would that replace the name or add a second line? Can't tell.
3. Inspector > Style tab > Label (+ adds a label line) -- "adds a label line", so: name on line
   one, add a line, department.

Ends at: Inspector > Style tab > Label (+).
Confidence: 4. Two ways in and I'm not sure they do the same thing. I'd start from the attribute
and then go to the inspector when the second line didn't show.

## tree15 -- hide three people from the drawing but keep them in counts and rankings

1. Select the three, then the Selection bar > Hide on canvas. (Or right-click a node > Hide on
   canvas.)
2. "On canvas" tells me it's just the picture. Main menu > Show hidden elements to bring them back.
3. Did NOT use Delete, and did not use a filter -- a filter would drop them from the numbers.

Ends at: Selection bar > Hide on canvas.
Confidence: 5. Would want the counts somewhere to say "3 hidden" so I don't forget they're there.

## tree16 -- scores came in as words, make them numbers

1. Rail > Data > Sources > Edit source... > data page > the score column's role -- roles are Key,
   Name, Weight, Attribute... no "number". Backtrack.
2. Rail > Data > Attributes > score's menu > Read as...

Ends at: Data > Attributes > score > Read as...
Confidence: 4. "Read as" is vague -- I'd hover it hoping the tooltip says "number, text, date".
Gephi calls this the column type; I'd have searched for "type".

---

## Overall, in Alex's words

"Mostly findable. The things I do every week -- betweenness, export a picture, save a view -- are
where I'd expect or I can type them. What slowed me down: layout hiding under Style, Select where
sitting in the main menu with New project, and two doors for labels. What actually worries me
isn't navigation, it's two questions the outline can't answer: does a filter change the numbers
or just the picture, and when I swap in April's file does everything rerun or do I get March's
rankings on April's people. Those are the ones that end up in a report wrong."

Hardest tasks: tree07 (no way to say 'count the repeats'), tree08 (layout under Style),
tree11 (Select where in the main menu), tree06 and tree13 (unclear whether the numbers follow).
