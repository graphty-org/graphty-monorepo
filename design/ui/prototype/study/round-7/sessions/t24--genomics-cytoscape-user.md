# Session: nested research export -- Maren (genomics Cytoscape user)

Task as given: "A research database sent its whole export as one download, records inside records. It is in your Downloads folder and graphty has never seen it. Make a picture where researchers who wrote papers together are connected, and where researchers are connected to the institutions they belong to. Check that nothing important was dropped before you bring it in."

All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t24--genomics-cytoscape-user/. D below is that folder.

## Step 0 -- start screen (shots/tasks/t24/01.png)

Start, Recent projects, Samples. "Files are read on this computer and never uploaded" -- good, I read that one, my PI would ask. The file is in Downloads, so "Open project or file..." it is. Not a nested-JSON person, this is like someone handing me a STRING JSON dump.

## Step 1 -- open dialog (01.png)

    timeout 120 node app-b/study.mjs --try $D/01.png task:t24 --click "Open project or file..."

File picker: Downloads > research-api, network-export-2026-03.json, 1.4 MB. Fine.

## Step 2 -- pick the file (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open"

Okay, this is not what I expected -- it shows me the raw JSON and a tree on the left: meta, data, data.researchers [170], addresses [179], affiliations [242], data.institutions [30], funding.grants [48], links [160]. And a strip at the top: "researcher (170) --coauthor (510)-- researcher, institution (30), researcher --links (160)-- researcher | institution."

And a "Match report" with numbers. That is the thing Cytoscape never gives me. "514 coauthor_ids items... 4 co-author pairs are listed by both researchers" -- 514 minus 4 is 510, it adds up. I checked that by hand because I always do.

But here is my problem: the institutions are 30 nodes floating on their own. Nothing says researcher -- institution except "links", and links only hits an institution in 42 rows. The report says "attributes.affiliations: 45 researchers hold two or more; each list is kept as one value." Affiliations is the belongs-to, surely. Kept as one value means it is a blob in a column, not an edge. That's my "fold change is not where I expect it" moment, except this time it actually told me.

## Step 3 -- look at affiliations (03.png)

    ... --click "data...affiliations"

It jumped to the researchers table with the affiliations column outlined, showing [1], [1], [3]. Role says "One value". Someone with 3 affiliations stuffed in one cell. Not what I want.

## Step 4 -- the role menu (04.png)

    ... --click "One value"

Menu: One value (170 values), Several values (grayed: "needs single values; these items are records"), Several edges (grayed: "needs ids; these items are records"), Several rows (242 rows). I'd have guessed "Several edges" -- that's the word I want -- and it's grayed out. The gray reason is one line so I read it, but "items are records" means nothing to me. 242 matches the number in the tree, so I take "Several rows".

## Step 5 -- several rows (05.png)

    ... --click "Several rows (242 rows)"

The strip at the top now reads "researcher --affiliations (242)-- institution (30)". It worked out on its own that the rows point at institutions. Good. The report line changed to "made a child table under researchers: 242 rows, one per item." I'm suspicious of anything automatic so I want to see the child table.

## Step 6 -- the affiliations table (06.png)

    ... --click "data...affiliations"

parent "From -> researcher", institution_id "To -> institution", plus role, since, current. Report: "242 rows... every institution_id is an institution. 242 rows became 242 researcher-institution edges, with role, since and current as edge attributes." That is exactly the sentence I want from Cytoscape and never get. Every id matched, it says so with a count. I believe it.

Small thing: "current" -- some of these might be former affiliations. "Belong to" probably means current. I'm not going to fight that today; it's kept as an attribute so I can filter later.

## Step 7 -- what is "links"? (07.png)

    ... --click "links"

type column: "visited", "reviewed for", "grant partner". So this is not co-authorship and not membership. It's going into my picture anyway, mixed in with the edges I asked for. I want it out of the picture, but I don't want it thrown away either.

## Step 8 -- try to leave links out (08.png, nothing changed)

    ... --click "links" --hover "Include links"     -> nothing on screen is called "Include links"
    ... --hover "Load links"                         -> nothing on screen is called "Load links"
    ... --hover "Load this table"                    -> nothing on screen is called "Load this table"
    ... --hover "Leave out links" / "Skip links" / "Exclude links" / "Remove links" / "Leave out"  -> nothing on screen is called any of these

There's a checkbox next to "links" but I can't find what it is or what unchecking it does -- drop it entirely? Keep it in the project but not draw it? I'm not going to untick something next to my data without knowing. Leaving it in. It'll be extra edges; I'll hide them later, I suppose.

Also noticed the report line: "coauthor and affiliations have no weight ... A run that reads the loaded weight treats them as strong as the strongest link." Read it twice. I think it means co-authorship counts as weight 1 and links are 0-1. Fine, but I would not have caught that if it didn't say it.

What was not brought in as edges, from the reports: meta (not read, it's just api_version etc. -- fine), contact addresses (kept as one value per researcher), funding grants (kept as one value per institution), advisor_id (kept as an attribute, "set Links to -> researcher to make advisor edges"). Nothing I asked for is dropped. That's my "check nothing important was dropped" done, as far as I can tell.

## Step 9 -- Load (09.png)

    ... --click "Several rows (242 rows)" --click "Load"

Summary panel: Nodes 200 (researcher 170, institution 30), Edges 912 (coauthor 510, affiliations 242, links 160). 510 + 242 + 160 = 912. The numbers survived the load. Good.

The picture itself: a gray ring of dots with a hairball through the middle. Researchers and institutions look identical -- same gray dot. I can't see which 30 are institutions, and the co-author and affiliation edges look the same as the "visited" links. There's a note "Nothing is colored or sized by a row." So technically the picture exists. It's not a figure yet. I'm stopping here; the task was to bring it in and make the picture, and it is in.

## Verdict

- Succeeded? Yes, mostly. Co-author edges 510, affiliation edges 242 to institutions, every id matched, counts held after load. Two caveats: the "links" edges came along because I couldn't work out how to leave them out, and the picture doesn't distinguish researchers from institutions.
- Single Ease Question: 5 of 7. The match report is the best part -- numbers, every time, and it told me what it did NOT turn into edges. The hard part was knowing that "Several rows" is what makes edges when the option I wanted, "Several edges", was grayed out with a reason I didn't understand.
- Would I use this instead of Cytoscape? For a nested export like this, yes -- Cytoscape would make me flatten this in R first, and that's an afternoon. The match report alone would have saved me a week once. For my actual paper figures, no: the picture that came out is a gray hairball, the protocol says Cytoscape, and I'd still need to know how to cite this.
