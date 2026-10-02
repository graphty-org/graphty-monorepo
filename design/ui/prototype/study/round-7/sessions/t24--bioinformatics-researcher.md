# Session: nested research export into a coauthor + affiliation network

Participant: Dr. Chen, computational biologist (persona file study/personas/bioinformatics-researcher.md)
Task given: "A research database sent its whole export as one download, records inside records. It is in
your Downloads folder and graphty has never seen it. Make a picture where researchers who wrote papers
together are connected, and where researchers are connected to the institutions they belong to. Check that
nothing important was dropped before you bring it in."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t24--bioinformatics-researcher/. Below, PREFIX stands for
`timeout 120 node app-b/study.mjs --try <that folder>/NN.png task:t24`.

## Step 1 -- start screen (shots/tasks/t24/01.png)

Think-aloud: "Start, Recent, Samples. There is a 'Research network (nested JSON)' sample but the file is
mine, in Downloads, so I want Open. 'Files are read on this computer and never uploaded' -- good, that is
the first thing I would have asked."

## Step 2 -- Open project or file

    PREFIX --click "Open project or file..."            -> 02.png

"A file chooser on Downloads > research-api. network-export-2026-03.json, 1.4 MB. The PDF is the API
reference; I do not want that. Tick the JSON, Open."

## Step 3 -- open the JSON

    PREFIX --click "Open project or file..." --click "network-export-2026-03.json" --click "Open"   -> 03.png

"It went straight to a mapping screen, which is what I want. Top line says what it makes:
researcher (170) --coauthor (510)-- researcher, institution (30), and researcher --links (160)--
researcher | institution. The match report underneath reads like a methods section, which I like:
170 rows, ids unique, 514 coauthor_ids items, 4 coauthor pairs listed by both researchers, one edge per
pair. 514 - 4 = 510. That reconciles, so I believe the 510.

But: there is no researcher-to-institution edge. 'attributes.affiliations: 45 researchers hold two or
more; each list is kept as one value.' So the membership I was asked for is sitting inside the researcher
as a lump. The 'links' table goes to institutions in 42 rows, but I do not know yet what those are.
Also 'meta is not read' -- that is api_version 2.3 and generated_at. That is my database version and date;
for me that is not junk, it is provenance."

## Step 4 -- look at affiliations

    PREFIX ... --click "data...affiliations"            -> 04.png

"It showed me the researchers table with the affiliations column highlighted, 'One value', values like
[1], [3]. So it is a list of records per researcher. There is a small menu under the column name."

    PREFIX ... --click "data...affiliations" --click "One value"     -> 05.png

"Options: One value (170 values); Several values -- greyed, 'these items are records'; Several edges --
greyed, 'needs ids; these items are records'; Several rows (242 rows). It tells me why the greyed ones are
not allowed, which I appreciate. I would have guessed 'Several edges' first, because an edge is what I
want, and it is disabled. 'Several rows' does not sound like an edge to me, but it is the only thing left
that does anything, so I will try it."

## Step 5 -- affiliations as several rows

    PREFIX ... --click "One value" --click "Several rows (242 rows)"   -> 06.png

"Now the top line has researcher --affiliations (242)-- institution (30). So 'several rows' made a child
table and it was smart enough to turn it into edges. Good, but I would not have predicted that from the
wording. The report adds 'attributes.affiliations made a child table under researchers: 242 rows, one per
item.'"

    PREFIX ... --click "Several rows (242 rows)" --click "data...affiliations"   -> 07.png

"Child table: parent -> researcher (locked), institution_id -> institution, role, since, current.
'every institution_id is an institution', '242 rows became 242 researcher-institution edges, with role,
since and current as edge attributes.' Nothing failed to match -- that is the sentence I look for.
One thing: 'current' is there. The task says 'belong to'. Some of these 242 are past affiliations. It kept
the column, so I can filter later; I would not want it deciding that for me."

## Step 6 -- what is 'links'?

    PREFIX ... --click "links"                           -> 08.png

"links: visited, reviewed for, grant partner, with a weight 0-1 and evidence. Not coauthorship, not
membership. The report warns that coauthor and affiliations have no weight and read as 1, so anything
weighted would treat them as the strongest. Fair warning, and it states it plainly.

I would rather leave links out of this picture. I tried to untick it:"

    PREFIX ... --click "links" --click "Include links"   -> 09.png (first attempt)
    output: nothing on screen is called "Include links"
    PREFIX ... --click "links" --rclick "links"          -> 09.png

"Clicking the name only selects it; right-click does nothing. The checkbox has no label I can name. Fine,
I leave it in -- it is extra, it is typed, it is not dropping anything. But I could not find how to leave
a table out."

Other things the report says it is not turning into structure: contact addresses (kept as one value),
funding grants (kept as one value), advisor_id (kept as an attribute, with a sentence saying how to make
advisor edges). "That is all stated. Nothing I was asked for is silently dropped. The only thing I would
call dropped is meta."

## Step 7 -- load

    PREFIX ... --click "Several rows (242 rows)" --click "Load"   -> 10.png

"Summary: Nodes 200 (researcher 170, institution 30), Edges 912 (coauthor 510, affiliations 242,
links 160). 510 + 242 + 160 = 912. Every number matches what the mapping screen promised. Direction
undirected. Loaded weights: coauthor none, affiliations none, links weight. Good.

The picture itself is a ring of grey dots with a hairball through the middle. I cannot tell an institution
from a researcher -- 'Nothing is colored or sized by a row'. The connections are there, but as a figure it
says nothing yet. I would want the institutions a different shape or color by default when there are two
node types."

## Step 8 -- can I get back to the mapping?

    PREFIX ... --click "Load" --click "from network-export-2026-03.json"   -> 11.png

"The 'from network-export...' link reopens the mapping as 'Edit: network-export-2026-03.json' with my
affiliations choice kept, and Apply off because nothing changed. So the import is a recipe, not a one-shot.
That is the right idea for reproducibility."

## Verdict

- Did I succeed? Yes. Researchers are joined by 510 coauthor edges and to institutions by 242 affiliation
  edges, and I checked the counts reconcile before and after loading. The extra 160 'links' edges are in
  there too, because I could not find how to leave them out.
- Single Ease Question: 5 of 7. The reporting is the best I have seen for an import; finding that
  'Several rows' is how you get membership edges was a guess, and leaving a table out defeated me.
- Would I use this instead of my current tool? For getting a nested JSON into a network, yes -- in R this
  is an hour of tidyr::unnest and joins and I would not get a report this honest at the end. For the
  figure, not yet: two node types drawn identically, a ring layout, and the export's api_version and
  timestamp not carried along. And I still have not seen whether I can drive this from a script.

## Problems noted

1. Affiliation membership edges hide behind "Several rows", while "Several edges" -- the wording I wanted
   -- is disabled. The result was right, the path was a guess.
2. No findable way to leave a whole table (links) out of the graph; the checkbox has no name and
   right-click does nothing.
3. "meta is not read" drops api_version and generated_at, which are the source's version and date --
   provenance a reviewer will ask for.
4. After loading, researchers and institutions look identical; with two node types nothing distinguishes
   them.
5. Initial picture is a ring with every edge crossing the middle; uninformative.

## Delights

- The match report: counts, uniqueness, unmatched ids, and the 514 - 4 = 510 duplicate-pair arithmetic
  stated so I can check it.
- Disabled options say why they are disabled.
- Post-load summary breaks nodes and edges down by type and every number matches the import screen.
- The weight warning (unweighted edges read as 1, as strong as the strongest link).
- The import stays editable from the graph's source link.
