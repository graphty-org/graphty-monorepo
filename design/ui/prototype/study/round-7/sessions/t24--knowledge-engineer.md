# Session: nested research export, played as the knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).

Task as given: "A research database sent its whole export as one download, records inside records.
It is in your Downloads folder and graphty has never seen it. Make a picture where researchers who
wrote papers together are connected, and where researchers are connected to the institutions they
belong to. Check that nothing important was dropped before you bring it in."

Start screen: shots/tasks/t24/01.png. Renders are in tmp/round-7-sessions/t24--knowledge-engineer/.
All commands were run from design/ui/prototype; `P` below stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t24--knowledge-engineer`.

## Steps

### 1. Open the file

    timeout 120 node app-b/study.mjs --try $P/01.png task:t24 --click "Open project or file..."

"Start screen. Open project or file, top left, with a keyboard shortcut. Files are read on this
computer and never uploaded -- good, that is the first thing I need to know. There is a 'Research
network (nested JSON)' sample, but the task says my own file, so I go to Open."

A file chooser: Downloads > research-api, network-export-2026-03.json (1.4 MB) and an
api-reference.pdf grayed out. "Fine. The PDF is grayed out, so it only offers what it can read."

### 2. Select and open the JSON

    timeout 120 node app-b/study.mjs --try $P/02.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open"

"Now this I did not expect. It went straight into an import view, not a hairball. Left: a tree of
the document -- meta, data, data.researchers [170], under it addresses [179] and affiliations [242]
unticked, data.institutions [30] with funding.grants [48] unticked, and links [160]. Top: a 'Makes'
line in monospace: researcher (170) --coauthor (510)-- researcher, institution (30), researcher
--links (160)-- researcher | institution. That is almost a schema diagram in one line. I like it."

Reading the match report carefully:
- "meta is not read: it holds no array of records." Correct; that is envelope, not data.
- "514 relationships.coauthor_ids items; 4 co-author pairs are listed by both researchers. One edge
  per Item / Pair" with Pair selected. "So 514 list entries, 4 pairs written from both ends, one
  edge per pair: 514 minus 4 is 510. The arithmetic checks. And it told me it de-duplicated and
  let me choose. That is the opposite of silent de-duplication."
- "relationships.advisor_id: all 58 values are researcher ids, kept as an Attribute." "It noticed
  those are references and tells me how to make them edges. Not asked for today, but it did not
  throw them away."
- "attributes.affiliations: 45 researchers hold two or more; each list is kept as one value."

"Here is the problem. The task is researcher-to-institution, and the Makes line has no
researcher-to-institution edge except via 'links', and only 42 links rows point at an institution.
There are 242 affiliations sitting in the researcher records as one opaque value. That is where
membership lives. If I loaded now I would have 30 institutions with almost nothing attached to
them, and I would only notice if I knew to look. To be fair, the report does say 'kept as one
value', so it is not hidden -- but it does not say these are institution ids."

### 3. Look at affiliations

    timeout 120 node app-b/study.mjs --try $P/03.png task:t24 --click "Open project or file..." --click "network-export-2026-03.json" --click "Open" --click "data...affiliations"

"Clicking the affiliations line takes me to the researchers table with the affiliations column
outlined: 'One value', cells show [1], [3]. There is a little list icon. The tree truncates names
to 'data...affiliations' and 'data.r...addresses' -- annoying, I would rather see the leaf name."

### 4. Open the column's role menu

    timeout 120 node app-b/study.mjs --try $P/04.png ... --click "One value"

Menu: One value (170 values) checked; Several values (disabled: "these items are records");
Several edges: Links to a new type (disabled: "needs ids; these items are records"); Several rows
(242 rows). "Clear enough. They are records, not ids, so they become rows. The disabled options
explain why they are disabled -- good, I do not have to guess."

### 5. Make affiliations a child table

    timeout 120 node app-b/study.mjs --try $P/05.png ... --click "Several rows (242 rows)"

"Makes line now reads researcher --affiliations (242)-- institution (30). The tree row turned
into an edge icon and is ticked. Report: 'attributes.affiliations made a child table under
researchers: 242 rows, one per item.' I did not have to tell it the target is an institution."

### 6. Check the affiliations table

    timeout 120 node app-b/study.mjs --try $P/06.png ... --click "data...affiliations"

"parent: From -> researcher, locked. institution_id: To -> institution. role, since, current as
Attribute. Report: 'every institution_id is an institution. 242 rows became 242
researcher-institution edges, with role, since and current as edge attributes.' That is exactly
the thing generic viewers flatten: the statement about the statement -- role and start date -- stays
on the edge. No dangling ids. I am satisfied with this table."

Small quibble: the edge type is named 'affiliations', plural, from the JSON key. I would call the
predicate 'affiliatedWith' or 'memberOf'. I did not see where to rename it, and did not look hard.

### 7. Check the links table

    timeout 120 node app-b/study.mjs --try $P/07.png ... --click "links"

"links is a different relation entirely: type column says 'visited', 'reviewed for', 'grant
partner', with a weight 0-1 and evidence. Not co-authorship and not membership. And 42 of these
go researcher-to-institution. In a picture without edge types visible, 'visited inst_030' is going
to look exactly like 'belongs to inst_030'. That is a modeling trap."

"The report also warns that coauthor has no weight (reads 1) while links has 0 to 1, so a weighted
algorithm treats every co-authorship as the strongest link. That is an honest warning that most
tools would not give."

### 8. Try to use the type column as the predicate

    timeout 120 node app-b/study.mjs --try $P/08.png ... --click "links" --click "type"

"I want 'type' to be the edge predicate, not an attribute called 'type' on edges called 'links'.
Clicking the header does nothing. I did not find how to split one edge table into three predicates."

### 9. Try to leave links out

    timeout 120 node app-b/study.mjs --try $P/09.png ... --click "links" --click "Include links"      -> nothing on screen is called "Include links"
    ... --click "links" --click "Leave out"                                                       -> nothing
    ... --click "Load links" / "Load this table" / "Use links" / "Read links" / "Leave links out" -> nothing
    ... --click "links" --hover "Remove" / "Remove table" / "Don't load" / "Skip"                 -> nothing

"The task asked for co-authorship and membership. I would leave links out. There is a checkbox next
to links in the tree, but it has no name I could find and no tooltip. In real life I would probably
just click the box. Here I could not, so links stays in. It is not wrong data, it is just a third
relation I did not ask for, and I will have to remember it is in there."

### 10. Back to the whole-file report

    timeout 120 node app-b/study.mjs --try $P/10.png ... --click "network-export-2026-03.json"

"Full report, top to bottom: meta not read; researchers 170, coauthor 510 with the 4 shared pairs
explained; affiliations child table 242; advisor kept as attribute; institutions 30, funding.grants
kept as one value; links 160. Addresses and grants are kept as single values, not dropped. Nothing
was silently dropped as far as the report says. The only thing I had to change was affiliations."

### 11. Load

    timeout 120 node app-b/study.mjs --try $P/11.png ... --click "Several rows (242 rows)" --click "Load"

"Summary panel: Nodes 200 -- researcher 170, institution 30. Edges 912 -- coauthor 510,
affiliations 242, links 160. 510 + 242 + 160 = 912, 170 + 30 = 200. Counts reconcile with the
import report. Nodes and edges are labeled separately, per class. That is the known-answer check I
care about and it passes."

"The picture itself: 200 gray dots on a ring with a gray web through the middle. I cannot tell an
institution from a researcher, or a co-author edge from an affiliation edge. A chip says 'Nothing is
colored or sized by a row' -- at least it is honest that the colors mean nothing. Is position
meaningful? It is a ring; I assume not."

### 12. Try to color by class

    timeout 120 node app-b/study.mjs --try $P/12.png ... --click "Load" --click "Nothing is colored or sized by a row"   -> no change
    timeout 120 node app-b/study.mjs --try $P/13.png ... --click "Load" --click "Style"

"Clicking the chip does nothing. Style tab has canvas background, print-safe colors, label overlap,
layout method 'Spread Out', seed 7. Nothing that says 'color by type'. I stop here; the task was to
get the connections in and verified, and that is done. Making it presentable is another session."

## Outcome

Did I succeed? Yes, with one caveat. Researchers are connected by co-authorship (510 edges, duplicates
explained) and to their institutions (242 edges with role, since and current on each). I checked
the import report and the loaded counts and they reconcile. The caveat: the unrelated 'links'
relation (visited, reviewed for, grant partner) came in too, because I could not find how to leave
it out, and on the canvas nothing distinguishes it from membership.

Single Ease Question: 5 of 7. The affiliations step was the one real decision, and the default
would have quietly given me a graph with almost no membership edges if I had loaded straight away.
The report says "kept as one value", which is honest, but it does not say "these records reference
institutions; make them edges?" I had to know to go looking.

Would I use this instead of my current tool? For this kind of nested JSON export: yes, over writing
a jq or pandas flattening script. The import report is the best I have seen in a viewer: it counts,
it explains de-duplication, it names what it did not read, it keeps edge attributes. I would trust
these numbers. For my actual work it still is not an RDF tool -- no Turtle, no JSON-LD -- and I
could not map a 'type' column to the predicate or color nodes by class, which I would need before
showing anyone this picture. "Fine for import and verification. Not yet for the stakeholder slide."
