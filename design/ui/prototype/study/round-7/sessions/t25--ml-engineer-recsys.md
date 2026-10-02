# Session: nested export, memberships as separate records -- Chris (ML engineer, recommendation systems)

Task as given by the moderator: "In the research export, each researcher has more than one address
and more than one institution membership. Leave each researcher's addresses bundled as they are, a
single item of information about that person, but make each membership a separate record with the
year it started."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t25--ml-engineer-recsys/.

## Step 1 -- start screen (shots/tasks/t25/01.png)

Graph view, ring layout, 200 nodes, 670 edges. Right panel summary: researcher 170, institution 30,
coauthor 510, links 160. "Columns: 8 of 25" at the bottom right.

Thinking aloud: "OK, this is the 'flatten my nested JSON' problem. In pandas this is
`json_normalize` with `record_path='affiliations'` and `meta=['id']`. Where does this thing keep
the schema? The left rail says Data. That's my first guess. Second guess is the columns count."

## Step 2 -- Data in the left rail

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/02.png task:t25 --click "Data"

Sources (one JSON file, three tables: researchers, institutions, links), Filters, and an
Attributes tree with nested groups: attributes > profile > contact, metrics > citations,
relationships.

"A tree of nested fields. Good, it kept the nesting. Addresses are probably under contact."

## Step 3 -- the columns count, for comparison

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/03.png task:t25 --click "Columns: 8 of 25"

A Columns picker with the same tree plus checkboxes, and a node table opened below
(attributes.orcid, attributes.profile.field, h_index...). "Same tree twice. This one is just
visibility. Not what I want -- showing a column isn't restructuring it."

## Step 4 -- expand contact and relationships

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/04.png task:t25 --click "Data" --click "relationships" --click "contact"

contact expands to `{} addresses` and `email 58%`. relationships went off the bottom of the panel.

"Addresses has a curly-brace icon, so it's held as one object. That's already 'bundled'. Fine,
leave it. Now where are the memberships?"

## Step 5 -- collapse Sources and Filters to see more

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/05.png task:t25 --click "Data" --click "Sources" --click "Filters" --click "relationships"

relationships only holds advisor_id (34%). No memberships, no affiliations anywhere in the
attribute tree for researchers.

"Hm. So memberships either got dropped on import or they're hiding somewhere else. The tree
doesn't show it. That's a bit worrying -- if the import silently dropped a nested list I'd want
to know. Let me go look at how the source was read."

## Step 6 -- click the researchers source

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/06.png task:t25 --click "Data" --click "researchers"

This opens an import editor: "Edit: network-export-2026-03.json". Left: the JSON tree with
`data.researchers [170]`, and under it two unchecked nested lists, `data.r...addresses [179]` and
`data...affiliations [242]`. A "Makes" line at the top in a code font:
`researcher (170) --coauthor (510)-- researcher`, etc. A match report at the bottom:
"attributes.profile.contact.addresses: 59 researchers hold two or more; each list is kept as one
value." and "attributes.affiliations: 45 researchers hold two or more; each list is kept as one
value."

"THERE it is. 'Affiliations', not 'memberships', fine. The match report is honestly the best part
-- it tells me the counts and what it did with each list. 242 affiliation items across 170
researchers. Addresses: 'kept as one value' -- that's what I want for addresses. Affiliations: same,
which I don't want. Labels are truncated though -- 'data...affiliations', I'm guessing that's
researchers' affiliations and not institutions'."

## Step 7 -- click "affiliations"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/07.png task:t25 --click "Data" --click "researchers" --click "affiliations"

The grid scrolled to the column `attributes.affiliations` ("One value") and a menu opened on it:
"One value (170 values)" checked, "Several values" (grayed: needs single values; these items are
records), "Several edges: Links to a new type" (grayed: needs ids), "Several rows (242 rows)".

"OK, I meant to click the table on the left and got the column menu, but it's the right menu
anyway. 'Several rows (242 rows)' -- that's explode. 242 matches the count in the tree. The grayed
options tell me why they're grayed, which I appreciate."

## Step 8 -- Several rows

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/08.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)"

Makes line now reads `researcher --affiliations (242)-- institution (30)`. The affiliations
child table in the tree is now checked with an edge icon. Match report: "attributes.affiliations
made a child table under researchers: 242 rows, one per item." Apply is now enabled.

"Huh, it turned them into edges researcher to institution, not just rows. That's actually what I'd
want for a graph -- a membership IS a researcher-institution link. But I need to confirm the start
year came along."

## Step 9 -- open the affiliations child table

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/09.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)" --click "data...affiliations"

Columns: parent (From -> researcher, locked), institution_id (To -> institution), role, since,
current. Rows like res_0001 / inst_019 / professor / 2007-12 / true. Report: "242 rows became 242
researcher-institution edges, with role, since and current as edge attributes."

"There's the start: 'since', 2007-12. That's a year-month, and it's typed Abc -- a string. I'd want
it as a date or at least a year number so I could filter 'joined after 2015'. Let me see if I can
change the type."

## Step 10 -- try to change the type

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/10.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)" --click "data...affiliations" --click "Abc"

Nothing visible changed. "Clicking the type badge does nothing, or I hit the wrong one -- there's
an 'Abc' on every column. Whatever. The task said 'with the year it started', and the year is in
there, even if it's a string. I'm not fighting it."

## Step 11 -- Apply

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/11.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)" --click "data...affiliations" --click "Apply"

Back on the Data panel. Sources now: researchers, affiliations (242 rows, 242 edges),
institutions, links. Summary: Edges 912 (510 coauthor, 242 affiliations, 160 links). 670 + 242 =
912, checks out. Nodes still 200.

## Step 12 -- check the edges table

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--ml-engineer-recsys/12.png task:t25 --click "Data" --click "researchers" --click "affiliations" --click "Several rows (242 rows)" --click "data...affiliations" --click "Apply" --click "Edges"

Edge table: "912 edges ... 510 coauthor, 242 affiliation, 160 link", columns id, edge type,
institution_id, role, since, source, target, weight. The first rows are coauthor edges with blank
role/since.

"Denominators add up, since is a column. I'd have to scroll or filter to actually see an
affiliation row here -- no quick filter by edge type on the table that I can see. Also
institution_id is still carried as an attribute on the edge, which is redundant with target.
Minor. And addresses I never touched -- still one value per researcher, which is what was asked."

## Outcome

Did I succeed? Yes, I think so. Each affiliation (membership) is now its own researcher-institution
edge, 242 of them, carrying role, since and current; addresses stayed one bundled value per
researcher.

Single Ease Question: 5 of 7.

What cost me: the Attributes tree in the Data panel does not show the affiliations list at all, so
for a minute I thought the import had dropped it -- I only found it by clicking into the source.
The word is "affiliations", not "memberships", and the tree labels are truncated
("data...affiliations"). "Several rows" quietly became edges, which was right for me but was a
surprise. "since" comes in as a text string ("2007-12"), not a date or year, and I could not see how
to change that.

What I liked: the match report with exact counts ("45 researchers hold two or more", "242 rows
became 242 researcher-institution edges"), the Makes line that shows the resulting schema, the
grayed options that say why they are unavailable, and the counts adding up after Apply.

Would I use this instead of my current tool? For this specific job, no -- `pd.json_normalize(data,
record_path='affiliations', meta='id')` is one line and I control the types. But if I'm already in
the tool looking at the graph, this is a lot nicer than re-importing from a notebook, and the match
report is something I'd otherwise write asserts for. If "since" could be typed as a date I'd trust
it more.
