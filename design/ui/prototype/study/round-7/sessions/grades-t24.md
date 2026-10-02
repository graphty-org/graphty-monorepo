# Grades: bring a nested research export in as a co-author and membership network

The task: "A research database sent its whole export as one download, records inside records. It
is in your Downloads folder and graphty has never seen it. Make a picture where researchers who
wrote papers together are connected, and where researchers are connected to the institutions they
belong to. Check that nothing important was dropped before you bring it in."

The intended path: Open project or file... (or New from data..., or a drop) opens a file picker on
Downloads; choosing network-export-2026-03.json opens the Data page on the file, with a tree of the
document, a "Makes" line and a match report. The researchers, institutions and links tables are
kept; the co-author ids become one edge per co-author pair (510); the links table's targets point
at a researcher in 118 rows and an institution in 42; the report is read before Load; Load leaves
a graph of 170 researchers and 30 institutions.

Grading rule: success means the export (not the sample) was opened, every record list was kept,
co-authors came in as edges, the report was read before loading, and the graph was loaded.
Success with difficulty means a wrong turn on that path, a long search, or reading the report only
after loading. Failure means co-authors kept as one text value, a record list missing, the sample
opened instead, or a wrong conclusion about what was loaded. Grades go by what was on screen at
the end and what the participant concluded, not by how they rated themselves.

## A judgment call on what "belong to" requires

The intended path and the prototype disagree about where membership lives, and the grades side
with the prototype's data.

- The intended path's last screen (the Research network just loaded) shows 670 edges: coauthor 510
  and links 160, no affiliation edges. That treats the links table as the researcher-institution
  connection.
- But the links table holds "visited", "reviewed for" and "grant partner", with a 0 to 1 weight.
  None of that is belonging. Membership is in each researcher's affiliations list (242 records,
  each with an institution_id, role, since and current), which the import keeps as one value by
  default. The intended path's own report screen already shows affiliations turned into a child
  table of 242 researcher-institution edges, so the path contradicts itself between its last two
  screens.
- All seven participants found the affiliations list, turned it into 242 edges and loaded 912
  edges (coauthor 510, affiliations 242, links 160). That is the correct reading of the task, so
  it counts as success here, not as a departure from the path. A participant who had loaded the
  670-edge default and called links the membership would have been graded failure: wrong
  conclusion about what was loaded.

The second call: all seven tried to leave the links table out and none could (the checkbox beside
it has no name or tooltip). The task does not require leaving it out, and each participant knew
links was in and what it held, so this is not counted against the grade. It is the main finding
below.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Expert Emma | success with difficulty | success | Open project or file..., the JSON, Open. Read the report before touching anything (514 - 4 = 510 checked). Saw affiliations "kept as one value", clicked it in the tree, opened its "One value" menu and chose "Several rows (242 rows)" directly. Opened the affiliations and links tables, read the weight warning, reread the whole-file report, then loaded: 200 nodes, 912 edges (10.png). Correct conclusion: links came in too, past affiliations (current = false) are included. Her friction (could not untick links) is off the path. |
| Computational biologist | success with difficulty | success | Same path with no wrong click: report read, affiliations to Several rows, child table checked ("nothing failed to match"), links read and judged extra. Loaded 912 edges and reconciled every count (10.png). Reopened the import from the graph's source link and found the affiliations choice kept (11.png). Called the Several rows step "a guess", but it was the only enabled choice and she made it first time. Correct conclusion. |
| Gephi user | success with difficulty | success | Same path, no wrong click on it: expected clicking the affiliations name to tick it, but it opened the column, which is the designed next step. Checked the child table and links, tried three names to switch links off, loaded 912 edges and reconciled the sum (10.png). Correct conclusion, including that links is mixed in. |
| Knowledge engineer | success with difficulty | success | Same path, no wrong click on it; read the report most carefully of all (dedup, advisor ids, affiliations as the opaque value). Loaded 912 edges and reconciled nodes and edges (11.png). Her many failed attempts -- splitting links by its type column, leaving links out, coloring by node type (12.png, 13.png) -- were all beyond the task. Correct conclusion. |
| Genomics Cytoscape user | success with difficulty | success | Same path. Would have chosen "Several edges" but it was disabled, so took Several rows without a wrong click. Checked the child table, read the links table and the weight warning, listed every value the report keeps unconverted as her "nothing dropped" check, loaded 912 edges (09.png). Correct conclusion. |
| ML engineer, recommendations | success with difficulty | success with difficulty | One wrong turn on the path: clicked the column header "attributes.affiliations" expecting the role control, nothing happened (05.png), then found "One value" beneath it. Then Several rows, child table checked, links read (118 to researchers, 42 to institutions), loaded 912 edges (11.png). Correct conclusion. |
| Explorer Elena (first-time user) | success with difficulty | success with difficulty, with a false belief | Chose New from data..., which is a valid start. Read the report's bold lines, found affiliations only because the word matched the task, and chose Several rows "by luck". She half-read the links line as possibly the belonging relation and never opened links or read its report section ("I'll trust it"), so the links targets were not understood before loading; she used the post-load summary as her check (08.png). The data loaded is right, but she concluded that the clumps on the ring are institutions with their people, which nothing on screen supports: every node is the same gray and the layout is a ring. |

Totals: 5 success, 2 success with difficulty, 0 failure, 0 gave up. Seven of seven loaded the
export with 510 co-author edges and 242 membership edges, and nobody opened the sample.

Ease scores (1 to 7): 5, 5, 5, 5, 5, 5, 4. Every participant rated 5 or lower, including the five
graded success; the ratings reflect the guess at "Several rows", the links table they could not
leave out and the unreadable first picture, not trouble on the path.

## Findings

1. **The links table cannot be left out at import (7 of 7 wanted to; 6 of 7 tried and failed).**
   Every participant who opened links judged it the wrong relation for this picture ("'Visited' an
   institution is not belonging to it"; "a 'visited' edge to an institution next to a 'belongs to'
   edge is going to confuse anybody"). The only control is an unlabeled checkbox with no tooltip;
   clicking the table's name selects it, right-click and hover do nothing. The Genomics user would
   not untick it even if found, because nothing says whether unticking drops the data or only
   leaves it undrawn. All seven loaded 160 edges they did not ask for and said they would filter
   them out later. Severity 3 (major): the picture asked for is not the picture produced, and the
   fix is invisible.

2. **Membership is off by default and the default looks complete (7 of 7 had to find it; 1 of 7
   found it by luck).** The import keeps each researcher's affiliations as one value, while the
   "Makes" line already reads "researcher --links-- researcher | institution", so institutions
   look connected before membership is turned on. The report's line about affiliations is in the
   same calm tone as harmless lines about addresses and grants. The knowledge engineer: "the
   default would have quietly given me a graph with almost no membership edges if I had loaded
   straight away." Elena: "If I hadn't recognized the word 'affiliations' I'd have loaded it
   without the institution lines and not noticed." Every institution_id matches an institution,
   which the import knows; a list of records whose ids all resolve should be offered as edges, or
   at least flagged as looking like edges. Severity 3 (major): the expert six caught it by domain
   knowledge, the first-time user by a word match.

3. **The option that makes edges is called "Several rows", and the one called "Several edges" is
   disabled (5 of 7 said so).** Four would have picked "Several edges" first and three said
   "Several rows" did not sound like it would connect anything; they chose it because it was the
   only enabled choice. The disabled reason, "needs ids; these items are records", meant nothing to
   the Genomics user or to Elena. Nobody clicked wrong, so this cost hesitation, not grades.
   Severity 2 (minor), raised by finding 2: the step everyone must find is the one whose label
   misleads.

4. **The role control is labeled with its current value (2 of 7 stumbled).** The ML engineer
   clicked the column header first and nothing happened; Emma said "One value" "does not read as a
   button". Clicking the affiliations entry in the tree opens the column rather than a table or a
   toggle, which surprised Emma and the Gephi user, though it led them to the right place.
   Severity 2.

5. **The first picture cannot show what was asked (7 of 7).** After Load every node is the same
   gray on a ring, and co-author, membership and links edges are the same gray line. Nobody could
   tell an institution from a researcher; the knowledge engineer looked for "color by type" in the
   Style tab and did not find it. Elena guessed that the clumps are institutions, a false belief
   nothing on screen corrects. When a graph has two node types or several edge types, the default
   picture should distinguish them. Severity 3 (major) for the task's "make a picture", though
   outside the import step graded here.

6. **The match report is the reason they trusted the load (7 of 7).** Every participant checked
   514 - 4 = 510 on their own, six quoted "every institution_id is an institution", and all
   reconciled the loaded summary (200 nodes; 510 + 242 + 160 = 912) against it. Five named the
   weight warning (unweighted co-author and membership edges read as 1, as strong as the strongest
   link) as a trap they would otherwise have fallen into. Five said they would use this over
   flattening the JSON in pandas, R or a script. Keep it.

## Smaller notes, one voice each

- The report says "meta is not read" for api_version and generated_at; the computational
  biologist calls those provenance a reviewer will ask for, not envelope. Emma noticed "page" in
  meta and wondered whether the export is paginated; the report does not say.
- Past affiliations (current = false) are loaded as membership; three noted "belong to" probably
  means current only, and accepted filtering later because the column was kept.
- The knowledge engineer wanted the edge type named "memberOf" rather than "affiliations" and
  links split into three edge types by its type column; neither was findable.
- Tree names are truncated ("data...affiliations", "data.r...addresses"); the leaf name is the
  part people need.
- Emma and the ML engineer want the import settings saved as something rerunnable; the
  computational biologist found that the graph's source link reopens the import with choices kept,
  which answers part of it.
