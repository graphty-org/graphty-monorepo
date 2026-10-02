# Session: nested JSON export to a coauthor + affiliation graph -- Chris (ML engineer, recommendations)

Task as given: "A research database sent its whole export as one download, records inside records. It is in your Downloads folder and graphty has never seen it. Make a picture where researchers who wrote papers together are connected, and where researchers are connected to the institutions they belong to. Check that nothing important was dropped before you bring it in."

All commands were run from `design/ui/prototype`. `$D` is `tmp/round-7-sessions/t24--ml-engineer-recsys` (absolute path in each real command).

## Step 1 -- start screen (shots/tasks/t24/01.png)

"OK, start page. 'Open project or file...' with Ctrl+O, drop zone, 'Files are read on this computer and never uploaded' -- good, that is the first thing privacy review asks. There is a 'Research network (nested JSON)' sample but the task says the file is in my Downloads, so I am not touching samples. Open."

## Step 2 -- file picker

    timeout 120 node app-b/study.mjs --try $D/02.png task:t24 --click "Open project or file..."

"File dialog, Downloads > research-api. network-export-2026-03.json, 1.4 MB. The PDF is grayed out. Fine."

## Step 3 -- open the JSON

    timeout 120 node app-b/study.mjs --try $D/03.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open"

"Not loaded yet -- it is showing me a preview with a tree of what it found and a 'Match report'. That is the right instinct. Top line: 'Makes researcher (170) --coauthor (510)-- researcher, institution (30), researcher --links (160)-- researcher | institution'. Reading the numbers:
- 514 coauthor_ids items, 4 pairs listed by both sides, one edge per Pair -> 510. 514 - 4 = 510. The denominator checks out. I like that it tells me it deduplicated instead of silently doing it.
- 'meta is not read' -- fine, that is request metadata.
- 'attributes.affiliations: 45 researchers hold two or more; each list is kept as one value.' That is the problem. Affiliations is where 'belongs to an institution' lives, and it is being squashed into a cell. The institutions are nodes, but nothing connects researchers to them except whatever 'links' is.
- advisor_id kept as an attribute -- not asked for, leave it.
- funding.grants kept as one value -- not asked for either."

## Step 4 -- poke at affiliations

    timeout 120 node app-b/study.mjs --try $D/04.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations"

"Clicking the affiliations child in the tree jumped me to the researchers table with the attributes.affiliations column outlined. Cells are '[1]', '[3]' -- counts of nested records. Under the header it says 'One value'. That looks like the role picker."

    timeout 120 node app-b/study.mjs --try $D/05.png task:t24 ... --click "attributes.affiliations"

"Clicking the header name did nothing. OK, the little 'One value' under it then."

## Step 5 -- change the column role

    timeout 120 node app-b/study.mjs --try $D/06.png task:t24 ... --click "data...affiliations" --click "One value"

"Menu: One value (170 values) / Several values (disabled, 'these items are records') / Several edges (disabled, 'needs ids') / Several rows (242 rows). The disabled options say why they are disabled, which saves me guessing. 'Several rows' = explode it into a child table. That is what I would do with explode() in Spark."

    timeout 120 node app-b/study.mjs --try $D/07.png task:t24 ... --click "One value" --click "Several rows (242 rows)"

"Now the top line says 'researcher --affiliations (242)-- institution (30)'. It figured out on its own that the child rows point at institutions. Report: 'attributes.affiliations made a child table under researchers: 242 rows, one per item.' The tree icon for affiliations changed to the edge icon and it is checked."

## Step 6 -- verify the new edge table

    timeout 120 node app-b/study.mjs --try $D/08.png task:t24 ... --click "Several rows (242 rows)" --click "data...affiliations"

"parent From -> researcher (locked), institution_id To -> institution, role / since / current as attributes. Report: '242 rows ... every institution_id is an institution. 242 rows became 242 researcher-institution edges.' Nothing dangling. Good. That is exactly the check I would write by hand -- anti-join on the ids -- and it did it for me."

## Step 7 -- what is 'links'?

    timeout 120 node app-b/study.mjs --try $D/09.png task:t24 ... --click "Several rows (242 rows)" --click "links"

"links is a different relation: 'visited', 'reviewed for', 'grant partner', weighted 0 to 1. 118 to researchers, 42 to institutions. Not coauthorship and not membership. The task did not ask for it, and a 'visited' edge to an institution next to a 'belongs to' edge is going to confuse anybody reading the picture. I would rather leave it out. It also warns that coauthor and affiliations have no weight and would be read as strongest -- honest, I appreciate that."

    timeout 120 node app-b/study.mjs --try $D/10.png task:t24 ... --click "links" --click "Include links"
    -> nothing on screen is called "Include links"
    timeout 120 node app-b/study.mjs --try $D/10.png task:t24 ... --click "links" --click "links"

"Clicking the name only selects the table, it does not toggle the checkbox. I could not find a way to switch the checkbox off by name. Not worth fighting -- it is an edge type, I can filter it out after. Keeping it."

## Step 8 -- load

    timeout 120 node app-b/study.mjs --try $D/11.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations" --click "One value" --click "Several rows (242 rows)" --click "Load"

"Summary on the right: Nodes 200 (researcher 170, institution 30). Edges 912 (coauthor 510, affiliations 242, links 160). 510 + 242 + 160 = 912. Matches the preview. Direction undirected. 'Loaded weights: coauthor none; affiliations none; links weight, stronger.' That is the denominator panel I always ask for and it is there by default.

The picture itself is a ring of 200 gray dots with a hairball through the middle. 'Nothing is colored or sized by a row.' I cannot tell an institution from a researcher, and I cannot tell a coauthor edge from an affiliation edge. So the data is right but the picture does not yet show what was asked. I would go color by node type next, but the data side is done and checked, so I am calling it here."

## Wrap-up

- Succeeded? Mostly yes. The graph has exactly the coauthor and researcher-institution edges, with counts I verified against the report. Two caveats: the extra 'links' relation came along because I could not switch it off, and the first picture does not distinguish node or edge types.
- Single Ease Question: 5 of 7. The match report made checking easy; finding that affiliations needed 'One value' changed to 'Several rows' took some poking, and I would never have guessed that from the word 'One value' if I had not been hunting for it.
- Would I use this instead of my current tool? For this job -- a nested export I have never seen -- maybe. In a notebook this is json_normalize, an explode, two merges and an anti-join to check orphans: maybe 20 lines and a few wrong guesses. Here the report did the orphan and duplicate checks for me and said what it dropped. That is real value. But the default picture is a ring hairball with no type colors, and I could not exclude a table I did not want, so I would still end up exporting to my notebook to look at it properly.

## Problems noted
1. Affiliations, the relation the task is about, defaults to 'kept as one value'. The report says so, but in the same calm tone as harmless things like addresses. A list of records with ids that all match a node table should be offered as edges, or at least flagged as 'these look like edges'.
2. The role control is labeled with its current value, 'One value'; clicking the column name does nothing. I found it by guessing.
3. Could not uncheck the 'links' table: clicking its name selects it, and the checkbox has no name I could find.
4. After load: ring layout, all gray, no legend, nothing distinguishes researchers from institutions or coauthor from affiliation edges.

## What worked
- 'Read on this computer, never uploaded' on the start page.
- Preview before load with a one-line 'Makes' summary with counts.
- Explicit dedup of the 4 doubly-listed coauthor pairs (514 -> 510) and the Item/Pair switch.
- 'every institution_id is an institution' -- the orphan check I would have written myself.
- Disabled menu options say why they are disabled.
- Loaded summary: counts by type, and by edge type, that add up, plus which edge sets have weights.
