# Session: t02 -- screen-reader analyst (Morgan Reyes)

Task as given by the moderator: "Someone on your team already worked on this project. Work out
which five characters their work says matter most to the whole story, in order, and how the
drawing shows it. The data on screen is a sample: characters of the novel Les Miserables, linked
when they appear in the same chapter."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t02--screen-reader-analyst/. The tool can only click named controls, so
"listening" below means reading the names and text a screen reader would reach.

Caveat for the reader: this is a simulated screen-reader user driving a mouse-style click-through.
Nothing here tests actual focus order, live-region announcements or keyboard movement through the
drawing. Where Morgan says "I would hear", that is the persona's assumption about the text being
exposed, not a measured fact.

## Start screen (shots/tasks/t02/01.png)

Morgan: "Title is the project name, Les Miserables. Fine. Top bar says 'Local only' -- good, that
is the first thing I want to hear, my file is not going anywhere. Left list has named rows:
Selection, Notes 4, PageRank, Louvain 6 groups, Shortest paths, Watchlist, a folder called 'For the
report', Betweenness, Everything. There is a key box on the drawing: 'Color: PageRank, 0.0033 to
0.0754. Size: Degree, 1 to 36, square root scale (area)'. Good -- it says what the color is in
words, with the range. That is already half the 'how does the drawing show it' answer. I don't
trust the drawing; I want a table. Two things in the list look like importance measures --
PageRank and Betweenness. Betweenness is under 'For the report' and has a crossed-out eye, so it is
hidden? I am not sure yet which one 'their work' means."

## Step 1 -- open the PageRank row

    timeout 120 node app-b/study.mjs --try .../01.png task:t02 --click "PageRank"

Morgan: "Right panel now says 'PageRank, Measure from Analyze', 'Paints 77 nodes (every node with a
value)', 'Covers Louvain for Color', Fill color 'Orange to brown'. So PageRank owns the color and
it beat Louvain to it. Useful. There is a 'Style' tab and a 'Data' tab. I want Data."

## Step 2 -- the Data tab (went wrong)

    timeout 120 node app-b/study.mjs --try .../02.png task:t02 --click "PageRank" --click "Data"

Morgan: "That did not do what I asked. I got the whole left side switched to a 'Data' section --
sources, filters, attributes -- and the right panel jumped to the graph, not PageRank. There are
two things called 'Data': the section on the far left and the tab on the PageRank panel. I can't
tell them apart by name and I won't guess. That is a fail on naming. Consolation prize: the graph
summary is excellent. Nodes 77, edges 254, undirected, weight 'value, stronger', density 0.0868,
one connected component, average degree 6.6, highest 36. That is exactly the first thing I ask
for. Also under Attributes > Results: Louvain and PageRank. Betweenness is under 'Other attributes',
so it was loaded with the file, not computed here. Noted."

## Step 3 -- the table

    timeout 120 node app-b/study.mjs --try .../03.png task:t02 --click "Table"

Morgan: "Table opens under the drawing. '77 nodes', then a one-line summary: 'Valjean is first on
all three measures; Gavroche is in the top 3 on all three'. Good -- a summary before the rows,
that is what I want. Columns: label, group, Degree (full graph), PageRank (full graph), Rank by
PageRank, Betweenness (full graph), and something cut off past the edge. It is sorted by degree
descending: Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16. But someone made a
'Rank by PageRank' column. Nobody makes that column unless that is the ranking they care about.
Sort by it."

## Step 4 -- sort by Rank by PageRank

    timeout 120 node app-b/study.mjs --try .../04.png task:t02 --click "Table" --click "Rank by PageRank"

Morgan: "Sorted ascending, arrow on the header. Valjean 1 (0.0754), Myriel 2 (0.0428), Gavroche 3
(0.0358), Marius 4 (0.0309), Javert 5 (0.0303). Myriel jumps from degree 10 to second. Different
answer from degree. So I need to be sure PageRank is what they meant, not betweenness."

## Step 5 -- read their notes

    timeout 120 node app-b/study.mjs --try .../05.png task:t02 --click "Notes"

Morgan: "Notes are plain text, dated, each with what it is about. Good. The relevant ones:
'Highest betweenness in the book, 0.57. Next is Myriel at 0.177.' -- on Valjean, cites
Betweenness. And: 'Javert follows Valjean through the whole book. Check whether PageRank ranks them
side by side.' -- cites PageRank, and under it 'Earlier run', 'Add current value', 'Keeps the
earlier run and its value'. So the colleague used both. The drawing is colored by PageRank, the
table has a PageRank rank column, and 'whole book' sits in the PageRank note. I go with PageRank.
But 'Earlier run' worries me: does that mean PageRank was re-run since the note and the numbers
moved? That needs an answer before I quote a number."

## Step 6 -- follow the 'Earlier run' marker

    timeout 120 node app-b/study.mjs --try .../06.png task:t02 --click "Notes" --click "Earlier run"

Morgan: "It opened the PageRank run itself. Values: 77 of 77 have a value, 0.0033 to 0.0754, median
0.0124. 'Top 10' as a numbered list: 1 Valjean 0.0754, 2 Myriel 0.0428, 3 Gavroche 0.0358,
4 Marius 0.0309, 5 Javert 0.0303, then Thenardier, Fantine, Enjolras, Cosette, Mme.Thenardier.
Same as the table -- two places agree, that is the first praise I will give it. 'Made with:
Settings Defaults, Ran Sep 28, on the CPU, Writes pagerank.' The note is also Sep 28, so as far as I
can tell the note and this run are the same day. It did not tell me in words whether the note's
run IS this run or an older one. 'Earlier run' and 'Add current value' are not explained."

## Step 7 -- what are the 'Defaults'?

    timeout 120 node app-b/study.mjs --try .../07.png task:t02 --click "Notes" --click "Earlier run" --click "All options..."

Morgan: "PageRank options: Damping 0.85, Iterations up to 100, Weight 'None: no weight loaded'.
Damping 0.85 matches NetworkX. Unweighted -- but the graph summary told me edges have a weight,
'value, stronger'. So which is it? 'No weight loaded' sounds false when a weight column exists. I
think it means 'this run did not use one', which is what I would want, but it says it badly. If the
moderator's NetworkX numbers are weighted, these will not match, and the tool should have said why
in plain words. Also: no tolerance shown, and nothing says whether it converged in fewer than 100.
Minor. I stop here; I have my answer."

## Answer given to the moderator

The colleague's work ranks by PageRank (damping 0.85, unweighted, run Sep 28). Top five, in order:

1. Valjean -- 0.0754
2. Myriel -- 0.0428
3. Gavroche -- 0.0358
4. Marius -- 0.0309
5. Javert -- 0.0303

How the drawing shows it: node color is PageRank, orange (low, 0.0033) to dark brown (high,
0.0754), so the darkest node is the most important. Node size is degree, not PageRank, so Myriel
is dark but only mid-sized; size alone would have put Thenardier in the top five instead of Myriel.
I am taking the key's word for the colors; I cannot check them.

## Verdict

- Succeeded? I think so. The ranking is confirmed twice (table and the run's Top 10) and the
  settings are stated. My residual doubt is whether "their work" meant betweenness: a note quotes
  betweenness, and a hidden Betweenness row sits in a folder named "For the report". By
  betweenness the order would be different (Myriel and Gavroche close behind Valjean, Thenardier
  near the top), and nothing on screen says which measure is the headline.
- Single Ease Question: 5 of 7. Most of the facts were there in words. Lost points on the two
  controls both called "Data", the unexplained "Earlier run" / "Add current value", and the
  weight contradiction.
- Would I use this instead of my scripts? Not instead. Alongside, maybe, for one thing: reading
  what a sighted colleague left behind -- their notes tied to the numbers, the settings, and a key
  that says what the colors mean in words. That is the "what does it show?" question I usually
  have to ask a person. For producing the numbers myself I stay with NetworkX until I have checked
  these against it and the tool explains weight handling.

## Problems noted

1. Two controls called "Data" (the left section and the inspector tab). Clicking "Data" after
   opening PageRank switched the whole sidebar and the right panel to the graph. Severity: high
   for a screen-reader user; lost place.
2. PageRank options say "Weight: None: no weight loaded" while the graph summary says edges carry
   a weight ("value, stronger"). Contradictory; reads as a false statement.
3. "Earlier run", "Add current value" and "Keeps the earlier run and its value" on a note are not
   explained; I could not tell whether the note's numbers were from the current run.
4. Nothing says which measure the colleague treated as the headline; PageRank owns the color, but
   a betweenness note and a hidden Betweenness row in "For the report" compete with it.
5. Table columns run off the right edge ("R..." cut off); I would not know a column was there
   unless I arrowed into it.

## What worked

- "Local only" in the top bar, said first.
- The graph summary (counts, direction, components, weight) without running anything.
- The key on the drawing states color and size in words, with ranges and scale type.
- The one-line summary above the table ("Valjean is first on all three measures...").
- The PageRank run panel: Top 10 as a numbered list, value range, median, settings, date, CPU.
- Notes are text, dated, and say what they are about.
