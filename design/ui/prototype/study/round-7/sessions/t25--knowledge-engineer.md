# Session: split nested memberships into records, keep addresses bundled -- Dr. Min-ji Kim (knowledge graph engineer)

Task as given by the moderator: "In the research export, each researcher has more than one address
and more than one institution membership. Leave each researcher's addresses bundled as they are, a
single item of information about that person, but make each membership a separate record with the
year it started."

Start screen: shots/tasks/t25/01.png. Renders: tmp/round-7-sessions/t25--knowledge-engineer/02.png to 18.png.
All commands run from design/ui/prototype; each replays from the start screen.

## Step 1 -- look for the data model

Start screen shows a hairball and a summary: 200 nodes (170 researcher, 30 institution), 670 edges
(510 coauthor, 160 links). Several isolated dots around the ring -- probably institutions nothing
points at yet. Memberships are not edges here, so they must be buried inside the researcher records.
The rail has "Data". That is where a mapping should live.

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--knowledge-engineer/02.png task:t25 --click "Data"

02: Sources (one JSON export, three tables), Filters, Attributes. The attribute tree is nested:
attributes > profile > contact > metrics > citations, and relationships. Good: it admits the source
is nested instead of flattening it silently.

## Step 2 -- find addresses and memberships

    timeout 120 node app-b/study.mjs --try .../03.png task:t25 --click "Data" --click "relationships" --click "contact"

03: contact holds "addresses" with a {} icon (kept as one object) and email at 58%. Addresses are
already bundled. Fine, that half needs no work. relationships is expanded but pushed off the bottom.

    timeout 120 node app-b/study.mjs --try .../04.png task:t25 --click "Data" --click "relationships" --click "memberships"

"nothing on screen is called memberships". My word, not theirs. Collapse the panels above to get room.

    timeout 120 node app-b/study.mjs --try .../05.png task:t25 --click "Data" --click "Sources" --click "Filters" --click "relationships"

05: relationships has only advisor_id (34%). Not memberships.

    timeout 120 node app-b/study.mjs --try .../06.png task:t25 --click "Data" --click "Sources" --click "Filters" --click "profile"
    timeout 120 node app-b/study.mjs --try .../07.png task:t25 --click "Data" --click "Sources" --click "Filters" --click "attributes"

06: profile is field and h_index. 07: attributes holds "affiliations" ({}) and orcid. Affiliations =
memberships. Took me four tries to find it; the tree is honest, but a nested export always is a hunt.
Minor annoyance: the indentation of profile/contact/metrics under attributes is confusing -- I
could not tell what was a child of what at a glance.

## Step 3 -- find how to change it

    timeout 120 node app-b/study.mjs --try .../08.png task:t25 --click "Data" --click "Sources" --click "Filters" --click "attributes" --click "affiliations"

08: right panel: "Read as: One value (kept whole)", 100% fill, "open it on the Data page to read its
parts". I AM on the Data page. That sentence sent me in a circle. Also the tree on the left jumped and
collapsed my expanded group when I selected the row -- disorienting.

    timeout 120 node app-b/study.mjs --try .../09.png ... --click "One value (kept whole)"

09: nothing. The value looks like a setting but is just text.

    timeout 120 node app-b/study.mjs --try .../10.png ... --click "More"

10: menu: Color by / Size by (disabled, with the reason -- good), Label by, Show as groups, Filter to,
Create set, "Read as...", "Edit on the Data page", Show in table.

    timeout 120 node app-b/study.mjs --try .../11.png ... --click "More" --click "Read as..."

11: "Read as..." did nothing visible. That is exactly the item I expected to work. Second dead end.
One more and I would have been close to leaving.

    timeout 120 node app-b/study.mjs --try .../12.png ... --click "More" --click "Edit on the Data page"

12: now an actual mapping editor for network-export-2026-03.json. A "Makes" line in plain notation
(researcher (170) --coauthor (510)-- researcher, ...), a table tree with sub-arrays
data.r...addresses [179] and data...affiliations [242] as unchecked child tables, column roles, and a
match report. The report says it straight: "addresses: 59 researchers hold two or more; each list is
kept as one value" and the same for affiliations, 45 researchers. That is what I want an importer to
tell me. This should have been the first thing "Read as" opened.

## Step 4 -- make memberships records

    timeout 120 node app-b/study.mjs --try .../13.png ... --click "Edit on the Data page" --click "data...affiliations"

13: selecting the child table only scrolled to the attributes.affiliations column; its role says
"One value". Checkbox still off.

    timeout 120 node app-b/study.mjs --try .../14.png ... --click "data...affiliations" --click "One value"

14: role menu: One value (170 values) checked; "Several values" and "Several edges" disabled with
reasons ("these items are records", "needs ids") -- good, it explains why instead of hiding them;
"Several rows (242 rows)".

    timeout 120 node app-b/study.mjs --try .../15.png ... --click "One value" --click "Several rows (242 rows)"

15: "Makes" now includes researcher --affiliations (242)-- institution (30). The child table is
checked and has an edge icon. Report: "attributes.affiliations made a child table under researchers:
242 rows, one per item". addresses still "kept as one value". Apply is now enabled.

    timeout 120 node app-b/study.mjs --try .../16.png ... --click "Several rows (242 rows)" --click "data...affiliations"

16: the child table: parent (From -> researcher, locked), institution_id (To -> institution), role,
since, current. Each row is "an edge", researcher to institution. 242 rows -> 242 edges with role,
since, current as edge attributes. So each membership is a record (an edge with properties) and the
start is in "since". Reservations: since is "2007-12", typed Abc -- a string, not a year or a date.
And the graph is Undirected even though this is plainly researcher -> institution. I would want the
direction kept per predicate.

    timeout 120 node app-b/study.mjs --try .../17.png ... --click "data...affiliations" --click "since"

17: clicking the since header does nothing. I could not find how to retype it as a date or pull out
the year. I let it go.

## Step 5 -- apply and check counts

    timeout 120 node app-b/study.mjs --try .../18.png ... --click "data...affiliations" --click "Apply"

18: Edges 912 = 510 coauthor + 242 affiliations + 160 links. Nodes still 200, so no invented nodes.
The isolated dots are gone (institutions now have members). Researchers' "attributes" dropped from 2
to 1 child; contact still has 2 (addresses kept whole). A new "affiliations" attribute group:
institution_id (To), current, role, since. Counts reconcile. I trust it.

## Verdict

- Succeeded? Yes. Each membership is a separate researcher-to-institution edge with role, since and
  current; addresses remain one bundled value per researcher. The "year it started" is there as
  "since", but as year-month text, not a typed year -- I would have to fix that downstream.
- Single Ease Question: 4 of 7. The editor itself, once found, is good. Getting to it was not:
  "Read as..." did nothing, "open it on the Data page" while already on the Data page, the
  inspector value that looks clickable but is not, and the tree collapsing when I selected a row.
- Would I use it instead of my current tool? For this job, partly. Today I would do this in a
  notebook (pandas json_normalize / explode) or a SPARQL CONSTRUCT that mints a membership node.
  What it gets right that my tools do not: the match report states what was kept whole and what was
  split, with counts, and the edge total reconciles exactly. What stops me: memberships become
  edges with properties, which is the property-graph answer; I would model a membership as its own
  individual (n-ary relation) so I can attach provenance to it, and I saw no option for "each row
  is a node linked to both". Direction collapsed to Undirected, and dates stay strings. Fine for
  exploring the export; I would not make it my pipeline.
