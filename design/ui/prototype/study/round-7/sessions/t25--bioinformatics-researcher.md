# Session: split nested memberships into records, keep addresses whole

Participant: Dr. Chen, computational biologist (persona: bioinformatics-researcher)
Task given: "In the research export, each researcher has more than one address and more than one
institution membership. Leave each researcher's addresses bundled as they are, a single item of
information about that person, but make each membership a separate record with the year it
started."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t25--bioinformatics-researcher/.

## Start screen (shots/tasks/t25/01.png)

"A grey ring of 200 nodes. Summary on the right: 170 researcher, 30 institution, 670 edges,
coauthor 510, links 160. Nothing about memberships or addresses. This is a data-shape question,
not a picture question, so I want wherever the columns live. There is a 'Data' item on the left
rail. Cytoscape would make me do this before import with a table import dialog; let's see."

## Step 1 -- open Data

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--bioinformatics-researcher/01.png task:t25 --click "Data"

"Sources: one file, three tables -- researchers, institutions, links. Below that an Attributes
tree: attributes > profile > contact, metrics, citations, and relationships. So the nesting is
visible. Addresses are probably under contact, memberships maybe under relationships."

## Step 2 -- expand relationships and contact

    timeout 120 node app-b/study.mjs --try .../02.png task:t25 --click "Data" --click "relationships" --click "contact"

"contact has 'addresses' with a {} icon and email at 58%. Relationships expanded off the bottom
of the panel, I can't see it. Annoying, but fine."

## Step 3 -- click addresses

    timeout 120 node app-b/study.mjs --try .../03.png task:t25 --click "Data" --click "contact" --click "addresses"

"Right panel: 'Read as: One value (kept whole)', 120 of 170 researchers have a value, nothing uses
it. Good -- addresses are already bundled. That half of the job is already the state I want, as
long as I don't break it. (The tree on the left seems to have collapsed contact again when I
clicked, which is a bit odd, but the inspector told me what I needed.)"

## Step 4 -- collapse Sources and Filters, open relationships

    timeout 120 node app-b/study.mjs --try .../04.png task:t25 --click "Data" --click "Sources" --click "Filters" --click "relationships"

"relationships holds only advisor_id at 34%. No memberships. Institutions have founded, kind,
funding. So where did the memberships go? They are not in this attribute tree at all. Maybe
'links' is memberships? It says researcher --links-- researcher | institution, 160 rows, but I
have no years there. I'll look at the researchers table itself."

## Step 5 -- click the researchers source

    timeout 120 node app-b/study.mjs --try .../05.png task:t25 --click "Data" --click "researchers"

"Now this is a proper import editor: 'Edit: network-export-2026-03.json'. A tree of the raw file
on the left: data.researchers [170] with two nested lists under it, data.r...addresses [179]
and data...affiliations [242], both unchecked. A 'Makes' line across the top that reads like a
schema: researcher (170) --coauthor (510)-- researcher. And a match report at the bottom, which
I actually read: 'attributes.affiliations: 45 researchers hold two or more; each list is kept as
one value.' So 'affiliations' is what the task calls memberships. Same sentence for addresses.
Fine -- the report says exactly what was done with each list. That's the kind of statement I
can put in a methods section."

## Step 6 -- click affiliations in the tree

    timeout 120 node app-b/study.mjs --try .../06.png task:t25 --click "Data" --click "researchers" --click "affiliations"

"It scrolled the grid to the attributes.affiliations column and dropped a menu: One value (170
values) -- checked; Several values (greyed, 'these items are records'); Several edges (greyed,
'needs ids'); Several rows (242 rows). The greyed ones even say why they are greyed. 'Several
rows' is what I want: one row per membership. I'd have liked the word 'record' in there,
but 242 rows matches the 242 in the tree, so I trust it."

## Step 7 -- choose Several rows

    timeout 120 node app-b/study.mjs --try .../07.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)"

"The 'Makes' line now has researcher --affiliations (242)-- institution (30). The affiliations
entry in the tree became checked with an edge icon. Report: 'attributes.affiliations made a
child table under researchers: 242 rows, one per item.' Addresses line is unchanged: still kept
as one value. Good. But did the start year come with it?"

## Step 8 -- open the new affiliations table

    timeout 120 node app-b/study.mjs --try .../08.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)" --click "data...affiliations"

"Each row is an edge, researcher to institution. Columns: parent (From -> researcher, locked),
institution_id (To -> institution), role, since, current. 'since' is the start: 2007-12,
2006-07... 'every institution_id is an institution', '242 rows became 242 researcher-institution
edges, with role, since and current as edge attributes.' That's the year it started, kept.

One complaint: 'since' is typed Abc, text. It's year-month, not a year, and as text I can't
filter 'started after 2015' or sort it as a date without fixing it. I didn't see how to change
the type here and I didn't go looking; for the task as stated it is there. I'd also have
expected to be asked whether a membership should be its own node or an edge -- an edge is fine
for me, it's how I'd model it in igraph anyway."

## Step 9 -- Apply

    timeout 120 node app-b/study.mjs --try .../09.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)" --click "data...affiliations" --click "Apply"

"Back to the Data view. Source now says 200 nodes, 912 edges from 4 tables. 670 + 242 = 912, the
arithmetic reconciles. Nodes still 200, so nothing was dropped or invented. affiliations shows
as its own table, 242 rows, 242 edges. Addresses I never touched and the report said they stay
as one value. I'm done."

## Outcome

- Succeeded? Yes, I believe so: 242 memberships are separate researcher-institution edges carrying
  role, since (start) and current; addresses stayed one value per researcher; the counts
  reconcile (670 + 242 = 912 edges, 200 nodes unchanged).
- Single Ease Question: 5 of 7.
  - Lost a minute because the Data panel's attribute tree has no memberships in it at all; I
    only found them after opening the source's import editor. The Data panel and the editor show
    two different trees of the same file, and only one of them has the nested lists.
  - The word in the file is "affiliations"; the task said "membership". The match report bridged
    that ("45 researchers hold two or more"), which is what saved me.
  - Clicking a nested list in the tree jumps the grid to a column and opens a menu over it -- not
    what I expected from clicking a tree item, though it was the right place.
  - "since" arrives as text (year-month), not as a year or a date; I'd have to fix that before
    filtering on it.
- Would I use this instead of my current tool? For this step, possibly. In R this is a
  tidyr::unnest_longer and a join -- three lines, but I have to know the JSON shape first. Here the
  tree showed me the shape, the menu said why the other choices were unavailable, and the match
  report wrote the methods sentence for me with numbers that add up. That beats Cytoscape's table
  import, which would not even open nested JSON. But I'd want the same operation scriptable and
  the resulting edge table exportable as a TSV before it goes into a pipeline; nothing I saw
  answered that, and the date-as-text issue would bite me on the first filter.
