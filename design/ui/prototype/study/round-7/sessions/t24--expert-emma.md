# Session t24 -- Expert Emma

Task given: "A research database sent its whole export as one download, records inside records. It is in your Downloads folder and graphty has never seen it. Make a picture where researchers who wrote papers together are connected, and where researchers are connected to the institutions they belong to. Check that nothing important was dropped before you bring it in."

Start screen: shots/tasks/t24/01.png. All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t24--expert-emma/.

## Step 0 -- start screen (no command)

"Files are read on this computer and never uploaded", and 'Local only' in the header. Good, that is the first thing I look for. I am not touching the 'Research network (nested JSON)' sample; my file is in Downloads. Open project or file.

## Step 1

    timeout 120 node app-b/study.mjs --try .../01.png task:t24 --click "Open project or file..."

A file chooser already sitting in Downloads > research-api. network-export-2026-03.json, 1.4 MB. Tick it.

## Step 2

    timeout 120 node app-b/study.mjs --try .../02.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open"

It went straight into an import screen instead of guessing and dumping a hairball on me. A tree of the JSON on the left, raw JSON, and a "Match report". A one-line summary at top: researcher (170) --coauthor (510)-- researcher, institution (30), researcher --links (160)-- researcher | institution.

Reading the report like a referee:
- 514 coauthor_ids items, 4 pairs listed by both researchers, one edge per Pair -> 510. 514 - 4 = 510. Reconciles. Good, it did not double count and it told me why.
- meta not read -- api_version, generated_at, request, page. Fine, that is envelope. ("page" makes me wonder if this export is paginated and I only have page one. It does not say. I will let it go.)
- addresses kept as one value, funding.grants kept as one value, advisor_id kept as an attribute. Kept, not dropped. OK.
- affiliations: "45 researchers hold two or more; each list is kept as one value." That is the problem. The membership I was asked for is buried in a list column. Institutions are 30 nodes with nothing attached to them except via that "links" table, and 42 rows of links is not 170 researchers' memberships.

## Step 3

    timeout 120 node app-b/study.mjs --try .../03.png task:t24 ... --click "data...affiliations"

Clicking the affiliations entry in the tree put me in the researchers table with the affiliations column outlined, role "One value". I half expected it to open its own table. Not quite, but it showed me where the thing lives.

## Step 4

    ... --click "One value"

A menu: One value (170 values), Several values (disabled: "these items are records"), Several edges (disabled: "needs ids; these items are records"), Several rows (242 rows). The disabled options tell me why they are disabled. Good. Several rows it is.

## Step 5

    ... --click "Several rows (242 rows)"

The summary line now reads researcher --affiliations (242)-- institution (30). It worked out on its own that the rows point at institutions. Report: "attributes.affiliations made a child table under researchers: 242 rows, one per item." The tree icon for affiliations changed to an edge icon and got ticked.

## Step 6

    ... --click "data...affiliations"   (second click, now it is a table)

parent "From -> researcher" (locked), institution_id "To -> institution", role, since, current as attributes. Report: "every institution_id is an institution. 242 rows became 242 researcher-institution edges, with role, since and current as edge attributes." Every id resolved -- that is what I wanted to see. Note "current": some of these are past affiliations. The task says "belong to", which arguably means current=true only. It kept the column, so I can filter later. I am not going to fight that now.

## Step 7

    ... --click "links"

What is "links"? type = visited, reviewed for, grant partner; weight 0-1; evidence.kind paper/grant/dataset. That is not co-authorship and not membership. And the report warns me: coauthor and affiliations have no weight, each reads 1, while links reads 0 to 1, so a weighted run treats the unweighted edges as strong as the strongest link. Thank you, that is exactly the trap I would have fallen into in a weighted Louvain. Honest.

For the picture I was asked for I would rather leave links out. Mixing "visited" with co-authorship is not the network the question is about.

## Step 8

    ... --click "network-export-2026-03.json"

Back to the whole-file report to read it end to end. 170, 30, 510, 242, 160. Nothing silently gone; everything not turned into nodes or edges is listed as kept as a value or attribute.

## Step 9 -- trying to leave links out

    ... --click "Include links"   -> nothing on screen is called "Include links"
    ... --hover "links"

There is a checkbox next to "links" in the tree, but it has no name I can find and hovering the row shows nothing. I would probably just click the box in real life; here I could not reach it by name. Fine -- deadline voice -- it is in the data with a "type" column, I can filter it out of the view later. Loading with links in.

## Step 10

    ... --click "Load"

Graph: 200 nodes (researcher 170, institution 30), 912 edges (coauthor 510, affiliations 242, links 160) = 510 + 242 + 160. Undirected. "Loaded weights: coauthor none; affiliations none; links weight, stronger." "Readings not computed." It even says "Nothing is colored or sized by a row." That is honest.

The picture itself is a grey ring-shaped hairball; institutions and researchers look identical and all three edge kinds are the same grey. As a figure it proves nothing yet. But the task was to bring it in correctly, and I did. Stopping here.

## Verdict

Succeeded? Mostly yes. Co-authorship and membership are both edges, counts reconcile with the file, nothing was dropped silently. Caveat: the extra "links" edges came along because I could not find how to untick that table, and past affiliations (current=false) are in as well.

Single Ease Question: 5 of 7. The match report did the hard part; the one real step (affiliations -> Several rows) was hidden behind a label, "One value", that does not read as a button, and the first click on "data...affiliations" took me to a column rather than a table.

Would I use this instead of my current tool? For this job, yes, probably. My current route is twenty lines of pandas json_normalize plus explode, and I always get the double-listed co-author pairs wrong the first time. This told me about the 4 duplicate pairs, the unresolved-id check and the weight mismatch without being asked, and it never left my machine. I would still want the import settings saved as something I can rerun or script; a screen I clicked through once is not reproducible.
