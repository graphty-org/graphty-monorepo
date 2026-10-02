# Session: size hosts by unremediated critical vulnerabilities -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).
Task as given: "Among the 69 things recorded about each host, pick out the one that tallies serious
security holes left unfixed for more than a month, and make hosts with more of them look bigger in
the drawing."
Start screen: shots/tasks/t22/01.png. Renders: tmp/round-7-sessions/t22--knowledge-engineer/NN.png.
All commands were run from design/ui/prototype; the prefix
`timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t22--knowledge-engineer/` is
written as `try` below.

## Steps

### 01 -- start screen (shots/tasks/t22/01.png)
"300 nodes, 1,105 edges, directed, weight bytes_total_24h. Fine, counts are labeled nodes versus
edges, I like that. Bottom right says 'Columns: 8 of 69' -- that is where the 69 things live,
presumably. Top left there is a chip, 'Nothing is colored or sized by a row'. Row? I would call that
a property. A row of what? Let me click it and see if it is a door into sizing."

### 02 -- `try 02.png task:t22 --click "Nothing is colored or sized by a row"`
Nothing changed. "It is a label, not a button. It talks about sizing and then gives me no way to do
it. Noted."

### 03 -- `try 03.png task:t22 --click "Style"`
Right panel Style tab for the graph: canvas background, print-safe colors, layout method 'Spread
Out', seed 7. "Graph-level settings only. No node size here. At least the seed is shown; a layout
with a seed I can reproduce."

### 04 -- `try 04.png task:t22 --click "Columns: 8 of 69"`
A Columns picker opened, with a 'Find attribute' search, the attributes typed (Abc, #, date), and a
percent filled on some. Also opened a table at the bottom. "Good: types and completeness. Now
search."

### 05 -- `... --click "Columns: 8 of 69" --click "Find attribute" --key v --key u --key l --key n`
Seven matches. "vuln_count_critical_unremediated_over_30_days. That is the one: critical,
unremediated, over 30 days. Numeric, the # says. Unambiguous, which is more than I can say for most
CMDB column names."

### 06 -- `... --click "vuln_count_critical_unremediated_over_30_days"`
It ticked the checkbox; count went to 9 of 69. "So this dialog only chooses table columns. That is
not sizing. Clicking the name did the same as the box."

### 07 -- `... --key Escape`
"Escape closed the picker AND collapsed the table. I wanted only the dialog gone." Tooltip on the
isolated nodes count happened to show: 'Nodes with no edges. Click to select the 7.' Fine.

### 08 -- `try 08.png task:t22 --click "Everything"`
The 'Everything' row: 'Built-in row. Paints 300 nodes, 1,105 edges. Default look, under every other
row.' Fill color 6366F1, Shape faceted sphere, Size 1. "Wait. The fill says 6366F1 -- that is a
purple -- and every dot on the canvas is gray. Either the swatch or the drawing is lying. I do not
trust a legend that disagrees with the picture. Also 'faceted sphere' -- on a 2D drawing?"

### 09 -- `... --click "Everything" --click "Size"`
A small database-cylinder icon appeared at the end of the Size field. "That probably means 'take
this from a column'. No label."

### 10-11 -- hovering to learn the icon's name
`... --click "Everything" --hover "Size"` showed no tooltip. Guessed names, each "nothing on screen
is called ...": "From a column", "Use a column", "From data", "Bind to data", "Size by a column",
"Size from a column", "Map to a column", "Size from data". Then
`... --hover "Size" --key Tab --key Enter` (17.png) opened the Analyze palette instead -- focus was
somewhere else. "I give up on the little cylinder. And I am not sure I would want to size on the
'Everything' row anyway; that sounds like changing the default for everything."

### 12-14 -- the table header
`... --click "Close" --click "vuln_count_critical_unremediated_over_30_days"` -- after closing the
picker the table was collapsed again, so the header was not there (12.png). With `--click "Table"`
first (13.png) the new column was off the right edge; clicking its name (14.png) scrolled to it and
sorted descending: 6, 6, 6, 5, 4... "Good, a sort. The values are clipped at the right edge, I can
barely read them. There is a chevron on the header."

### 15, 18 -- `... --click "Column menu"` (and with a hover on the header first)
A menu opened, but its title was 'id', not my column: Color by, Size by (grayed: 'Not a number'),
Label by, Show as groups, Filter to..., Create set where this is..., Read as..., Edit on the Data
page. "So Size by exists. But the menu I get is for the key column, and mine's chevron sits under
the panel edge. I tried naming it four ways ('... menu', 'Column menu: ...', '... column menu',
'Column menu for ...'); nothing. A Tab/Enter (16.png) selected a random host instead."

### 19 -- `try 19.png task:t22 --click "Data"`
The Data page: Sources (hosts-2026-03.csv, 300 nodes; connections-2026-03.csv, 1,105 rows, 1,105
edges), Filters, Attributes with search. "This is the right place for me. Sources with row and edge
counts that agree. This I can check against my own extract."

### 20 -- `... --click "Data" --click "Find attribute" --key v --key u --key l --key n --click "vuln_count_critical_unremediated_over_30_days"`
Attribute inspector: Read as Number, from hosts-2026-03.csv (imported, not computed), on 300 nodes,
missing none, a histogram 0 to 6, '27 have at least 1', Painted by: no row. "Now this is honest.
Provenance, cardinality, missing values, distribution. 27 of 300 hosts. But there is no Size button
on it."

### 21 -- `... --click "More actions"`
(Guessed the name of the '...' at the top right of the inspector; "More" also worked.) Menu titled
with the full attribute name: Color by, Size by, Label by, Show as groups, Filter to..., Create set
where this is..., Read as..., Show in table. "There."

### 22 -- `... --click "More actions" --click "Size by"`
A new row 'vuln_count_critic...' sits above Everything in the Graph list. The canvas legend reads
'Size: vuln_count_...er_30_days, 0 / 2 / 4 / 6, Linear scale (radius), 0 to 6'. Right panel: 'Paints
300 hosts (every host with a value)', Size '# 0.5 to 3'. About 25 hosts are now big dots, most of
them in the dense cluster at the upper right and a few on the left.
"Done. It names the scale and says radius, not area -- I would want to know that, a radius scale
exaggerates the 6s. '0.5 to 3' is in what unit? Times the default? And it shrank the 273 hosts with
zero to specks, which is right for the question but it means the rest of the estate nearly
disappears. The row says it paints every host with a value, which is true, zero is a value."

## Outcome

Succeeded: the right attribute is chosen and hosts with more unremediated criticals are drawn
bigger, with a legend naming the attribute and the scale.

Single Ease Question: 3 of 7. Finding the attribute took ten seconds with search; finding where to
size by it took most of the session. Three places looked like they should do it (the 'Nothing is
colored or sized' chip, the Size field on Everything, the table column menu) and each was a dead
end or reached the wrong column. The one that worked was an unlabeled '...' on the attribute's own
page.

Would I use this instead of my current tool? For this, against SPARQL plus a spreadsheet: maybe.
The Data page is the best thing here -- provenance, 'imported, not computed', missing values and a
histogram are exactly what I check first, and the legend names its scale. But I would not show it to
anyone until the Everything row's color swatch agrees with what is drawn, and I would want 'Size by'
offered where the chip says nothing is sized.

## Problems observed

1. The canvas chip 'Nothing is colored or sized by a row' is not clickable; it names the job and
   offers no way to do it. (severity 2)
2. The Columns picker looks like the attribute list but only toggles table columns; clicking an
   attribute's name ticks its box rather than opening it. (severity 2)
3. The Size field's data icon on 'Everything' has no visible label and no tooltip reachable by
   hover; could not learn what it does. (severity 3)
4. Table column menu: the newly added column lands off the right edge with its chevron hidden;
   the reachable 'Column menu' is the id column's. Values in that column are clipped. (severity 3)
5. Escape on the Columns picker also collapses the table; closing the picker always collapses it.
   (severity 2)
6. 'Everything' row shows fill 6366F1 (purple) while every node is drawn gray. (severity 3 for this
   persona: a legend that disagrees with the picture breaks trust)
7. 'Size by' on the attribute is only behind an unlabeled '...' button. (severity 3)
8. Size range '0.5 to 3' has no unit; 'row' used for a style layer and 'faceted sphere' on a flat
   drawing are confusing vocabulary. (severity 1)
