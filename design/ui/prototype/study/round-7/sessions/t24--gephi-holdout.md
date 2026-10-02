# Session: nested research export, played as the Gephi holdout (Dr. Mara Lindqvist)

Task as given: "A research database sent its whole export as one download, records inside
records. It is in your Downloads folder and graphty has never seen it. Make a picture where
researchers who wrote papers together are connected, and where researchers are connected to the
institutions they belong to. Check that nothing important was dropped before you bring it in."

Start screen: shots/tasks/t24/01.png. All commands were run from design/ui/prototype; renders are
in tmp/round-7-sessions/t24--gephi-holdout/. "PFX" below stands for
`timeout 120 node app-b/study.mjs --try <render> task:t24 --click "Open project or file..."
--click "network-export-2026-03.json" --click "Open"`.

## Step 1 -- open the file (01.png)

`timeout 120 node app-b/study.mjs --try .../01.png task:t24 --click "Open project or file..."`

Mara: "Start screen, samples on the right, I ignore those. 'Open project or file', Ctrl+O, fine,
that's File > Open. 'Files are read on this computer and never uploaded' -- good, that is the
first thing I'd ask. A file picker: Downloads > research-api, there's the JSON, 1.4 MB. The PDF
is the API reference, I'm not reading that."

## Step 2 -- pick the JSON and open it (02.png)

`PFX` (output 02.png)

Mara: "Oh, this is not Gephi's import report, it's more. It shows me the tree of the JSON on the
left -- meta, data, data.researchers 170, data.institutions 30, links 160 -- and two greyed
child lists under researchers: addresses 179 and affiliations 242. And a 'Makes' line across the
top: researcher 170 --coauthor 510-- researcher, institution 30, researcher --links 160--
researcher or institution. That's the thing I actually want to see first. Good.

The match report. 514 coauthor_ids, 4 pairs listed by both people, one edge per pair: 514 minus
4 is 510. The arithmetic checks. I'd have had to do that dedup myself in pandas.

Now the problem. 'attributes.affiliations: 45 researchers hold two or more; each list is kept as
one value.' That's where membership lives. And there is no researcher-to-institution edge in
'Makes' except whatever 'links' is. So as it stands, the institution part of my picture would be
missing, or would be the wrong thing. That is exactly the 'silently dropped' case -- except it
isn't silent, it told me. I'll give it that."

## Step 3 -- try the affiliations list (03.png)

`PFX --click "data...affiliations"` (output 03.png)

Mara: "I clicked the affiliations entry expecting it to switch on. Instead it opened the
researchers table and boxed the affiliations column: 'One value', with [1], [1], [3] in the
cells. So clicking the name takes me to where it lives rather than ticking it. Slightly not what
I expected, but this is the Data Laboratory view I'd want anyway: id, orcid, field, h_index."

## Step 4 -- the column's menu (04.png)

`PFX --click "data...affiliations" --click "One value"` (output 04.png)

Mara: "Menu: 'One value (170 values)', 'Several values' greyed with a reason -- items are
records -- 'Several edges: Links to a new type' greyed, same reason, and 'Several rows (242
rows)'. The greyed ones tell me why, which I like. 'Several rows' is the only thing that keeps
the records. I'd call it 'split into its own table'. I'll take it."

## Step 5 -- split affiliations into rows (05.png)

`PFX --click "data...affiliations" --click "One value" --click "Several rows (242 rows)"`
(output 05.png)

Mara: "There. 'Makes' now reads researcher --affiliations (242)-- institution (30). It worked
out by itself that the rows point at institutions. The report line changed to 'made a child
table under researchers: 242 rows, one per item.' And the tree icon for affiliations turned into
the edge icon, ticked."

## Step 6 -- check the affiliations table (06.png)

`PFX --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click
"data...affiliations"` (output 06.png)

Mara: "parent From -> researcher, institution_id To -> institution, then role, since, current as
attributes. Report: '242 rows, one per item; every institution_id is an institution. 242 rows
became 242 researcher-institution edges, with role, since and current as edge attributes.' That
is the check I was asked to make, and it's made for me with a number I can repeat. I'd want to
filter 'current == true' later for a figure, and the attribute is there, so I can."

## Step 7 -- what is 'links'? (07.png)

`PFX --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click
"links"` (output 07.png)

Mara: "links: source researcher, target researcher or institution, weight 0 to 1, type 'visited',
'reviewed for', 'grant partner'. So these are NOT co-authorship and NOT membership. 'Visited'
an institution is not belonging to it. For my picture I don't want them mixed in. The warning
about weights is useful: coauthor and affiliations have no weight, links do, so a weighted run
would treat them as the strongest. I'd want to switch links off."

## Step 8 -- trying to switch 'links' off (08.png, 09.png)

`PFX --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click
"Include links"` -> nothing on screen is called "Include links" (08.png)

`... --click "Load links"` -> nothing on screen is called "Load links" (09.png)

`... --click "Skip links"` -> nothing on screen is called "Skip links" (09.png, overwritten)

Mara: "There's a checkbox next to links. Clicking the word 'links' just opens the table. I can't
find what the checkbox is called, there's no tooltip I can see, and I'm not hunting further. I'll
load it with links in and filter that edge type out on the canvas, the way I'd use an edge-type
partition filter in Gephi."

## Step 9 -- load (10.png)

`PFX --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click
"Load"` (output 10.png)

Mara: "Summary panel: Nodes 200 -- researcher 170, institution 30. Edges 912 -- coauthor 510,
affiliations 242, links 160. 510 + 242 + 160 is 912. Every number matches what the import
screen promised. Direction undirected, 'Loaded weights: coauthor none; affiliations none; links
weight, stronger'. 'Readings not computed' -- so no statistics have run yet; good, nothing ran
behind my back.

The picture itself is a ring of nodes with a hairball of lines through it. That is not a map,
that's the default placement before anyone spatialized it. I'd run the force layout next, and I
want to know whether it's ForceAtlas2 and whether I can set gravity and LinLog, but that's the
next job. And the links edges are in there, mixed with the ones I asked for."

## Verdict

**Succeeded?** Mostly. Co-authorship (510) and affiliation (242) edges are both in, counts match,
nothing important was dropped, and I checked it before loading. But I could not leave the
'links' edges out at import, so the picture carries 160 edges I didn't ask for (visits,
reviewing, grant partners), and it isn't spatialized yet.

**Single Ease Question:** 5 of 7. The report did the checking for me, and the arithmetic is
honest. Two frictions: clicking a list's name navigates rather than toggles, so turning
affiliations into edges took a detour through a column menu ('Several rows' is not a phrase I'd
look for), and I never found how to untick a table.

**Would I use this instead of my current tool?** For this job, yes -- Gephi has no answer at all
for a nested JSON; I'd be in Python writing a flattener and a GEXF writer, and I'd get the
double-listed co-author pairs wrong the first time. The import report is better than anything I
have. For the paper figure, not yet: I haven't seen the layout's name or parameters, and I
don't switch tools on an import screen. It earns a second session.

## Observations for the designers (in her words)

- "Clicking the name of a list jumps me to the column instead of ticking it. Fine once you know,
  but I expected the checkbox behavior."
- "'Several rows' is your word for 'split into a table'. I found it only because the other two
  options were greyed with a reason."
- "I could not find how to turn a table off. The checkbox has no name I could find."
- "The report's arithmetic -- 514 items, 4 double-listed, 510 edges; every institution_id is an
  institution -- is the reason I trust the load."
