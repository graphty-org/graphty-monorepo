# Session: t09 -- Expert Emma

Task as given by the moderator: "Shade the researchers on the list you kept by how much each one
has published, so the most productive stand out. The data on screen is a sample: one export from a
research database, researchers and institutions with records inside records."

Renders are in tmp/round-7-sessions/t09--expert-emma/. All commands were run from
design/ui/prototype.

## Start screen (shots/tasks/t09/01.png)

"OK. Header says Local only -- good, that is the first thing I look for. On the left there is a list
called 'Machine learning...' with 23 in it and a green dot; that is presumably the list I kept. The
right panel is already showing that list: 'Paints 23 nodes', Fill Color 009E73, and a label of
'a...last_5_years' -- truncated, so I do not know what that number is. Legend top left says
'Color: sets'. So the list owns a flat green fill. I want that fill to vary with a publication
count. The obvious place is the color value itself."

## Step 1 -- click the color value

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/01.png task:t09 --click "009E73"

"A color picker. Custom, Libraries, a hex field, a colorblind warning about orange and vermilion
-- fine, but this is a picker for one color. Nothing here says 'by value'. But while my pointer was
on the row a little database-cylinder icon appeared next to the swatch. That is probably it."

## Step 2 -- rest on the Color row to see that icon

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/02.png task:t09 --hover "Color"

"Yes, cylinder icon next to the hex value, then a minus. No label. I need its name."

## Step 3 -- trying to reach the cylinder icon by name

I tried to point at it by guessing what it is called. Every one of these said nothing on screen
has that name:

    ... --hover "Color" --click "From data"            (nothing)
    ... --hover "Color" --click "Use a column"         (nothing)
    ... --hover "Color" --click "Bind to data"         (nothing)
    ... --hover "Color" --hover "Use data"             (nothing)
    ... --hover "Color" --hover "Color by data"        (nothing)
    ... --hover "Color" --hover "Set from data"        (nothing)
    ... --hover "Color" --hover "Map to a column"      (nothing)
    ... --click "Color"                                 (03.png -- no change)
    ... --hover "Color" --click "Vary by data" / "Vary by a column" / "Map from data" /
        "Drive from data" / "Link to data" / "Vary"  (nothing)
    ... --hover "Color" --click "Bind"                 (nothing)
    ... --hover "Color" --hover "Set by attribute" / "From an attribute" / "Use an attribute" /
        "By attribute" / "Color by attribute" / "Bind to an attribute" / "Map to attribute" /
        "Data binding" / "Bind to attribute"  (nothing)
    ... --hover "Color" --click "Color from data" / "From a column" / "Color from a column" /
        "Use a value" / "Set from a column" / "Data-driven" / "Scale" / "Gradient" / "Ramp"  (nothing)

Two guesses did land somewhere, just not where I wanted:

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/04.png task:t09 --hover "Color" --click "column"

"That opened the table's Columns chooser at the bottom instead. Useful by accident: the data is
nested -- attributes > profile > metrics > citations > total -- and 'last_5_years' is a numeric
field currently used as the label. Still not what I wanted."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/08.png task:t09 --hover "Color" --click "attribute"

"That opened the Label editor ('Text: a...last_5_years', 'Top N by a value'). Nice to know Top N
exists, but this is the label, not the fill."

(Note on this stretch: a real person would simply have moved the mouse onto the icon and read the
tooltip in one second. The long guessing here is partly the test harness, partly the icon having
no visible label. I count it as a mild discoverability cost, not a ten-minute one.)

## Step 4 -- detour through the color libraries

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/05.png task:t09 --click "009E73" --click "Libraries"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/06.png task:t09 --click "009E73" --click "Libraries" --click "Greens"

"Libraries has sequential palettes -- Purple to yellow, Blues, Greens. I thought picking a ramp might
ask me which value to drive it with. Clicking Greens did nothing visible. Dead end; a palette
without a field is meaningless anyway."

## Step 5 -- found the icon's name

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/09.png task:t09 --hover "Color" --hover "field"

"Tooltip: 'Use a field or result for Color'. Right. 'Field or result' -- so computed values go
through the same door. Good."

## Step 6 -- open it

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/10.png task:t09 --hover "Color" --click "Use a field or result for Color"

"'Color from data', Source: Pick a field, with an attribute tree. In use: id, given, family,
last_5_years. Other: type, then the nested attributes > profile > contact / metrics > citations >
total, relationships, and 'Not usable here (3)' -- I like that it tells me what it will not take
instead of hiding it."

## Step 7 -- find the publication count

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/11.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics"

"Under metrics: 'papers' (numeric) and citations > total. 'How much each has published' is papers.
There is also last_5_years in use for the label, which might be papers in the last five years, or
citations -- the tree does not tell me which record it lives under from this view. I will take
papers, the total count. If the client meant recent output I would switch."

## Step 8 -- pick papers

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/12.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers"

"Now it is a proper mapping panel: Source attributes...metrics.papers, Scale Linear, Palette Orange
to brown with a reverse button, Values from Fit to data / Percentiles / Typed, Range 4 to 300,
Clamp on, No value: Nothing, and Detach. That is the set of knobs I want, and 'No value: Nothing'
is the honest default. Two questions: is 4 to 300 the range over my 23, or over everyone? It does
not say. And Linear on a publication count -- that is going to be skewed; I would probably want
log or percentiles, but fine for now. Also: the Color row behind it still says 009E73."

## Step 9 -- close it and look

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/13.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers" --key Escape

"Wait. Before, 23 nodes were green. Now practically the whole ring is orange and brown -- well over
a hundred nodes -- with only the institutions left gray. The legend has a new second entry, 'Color:
attributes.profile.metrics.papers, 4 to 300', underneath 'Color: sets ... 23'. And the panel on the
right -- which I opened FROM the 23-node list -- still says 'Paints 23 nodes', Fill 009E73, as if
nothing happened. So either it painted every researcher in the graph, or the panel is lying to me.
Either way it is not 'the researchers on the list I kept'. And the 4-to-300 range is then fitted to
everyone, so the shading among my 23 is relative to people I did not ask about."

## Step 10 -- try to find out what that new entry is

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t09--expert-emma/14.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers" --key Escape --click "Color: attributes.profile.metrics.papers"

"Clicking the legend entry does nothing. The left list still has Selection, Notes, Machine
learning... 23, Everything -- no new row for this shading, so I cannot see where it lives or what it
applies to. I am stopping here. I could filter the view down to the list via 'Full graph', but that
hides the rest, which is a different thing from shading the list, and I am not going to fight it."

## Outcome

- Did I succeed? No. I got a publication-count color scale onto the graph, with sensible
  parameters, but it went onto (apparently) every researcher, not the 23 on my list, and the panel
  I started from still claims the list paints 23 nodes in flat green. I cannot tell from the screen
  which of the two is true, and that is the bigger problem.
- Single Ease Question: 3 of 7. Finding the data-driven color control took far too long because it
  is an unlabeled icon that only shows on hover; once open, the mapping panel was good.
- Would I use this instead of my current tool? Not for this job yet. In Gephi I would partition to
  the subset and rank by the column; it is clunky but I know what it painted. Here the ranking
  panel itself (scale, palette, fit-to-data vs percentiles, clamp, explicit no-value) is better
  than Gephi's, and Local only in the header is exactly what I want to see. But a style that I
  started from my list and that then lands on the whole graph, while the list still reports 23,
  is the kind of opacity I do not accept in a figure I have to defend. Fix the scope, say the
  range's denominator ("4 to 300 over 23 nodes"), and give the icon a word, and I would use it
  for the client figure.
