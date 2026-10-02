# Grades: split nested memberships into records, keep addresses whole

The task: "In the research export, each researcher has more than one address and more than one
institution membership. Leave each researcher's addresses bundled as they are, a single item of
information about that person, but make each membership a separate record with the year it
started." The data on screen is a sample research export (170 researchers, 30 institutions) with
records nested inside records.

The intended path: from the graph, open the researchers table on the Data page (the import editor
for the export file); see that addresses are already kept as one value and leave them; open the
role menu of the affiliations column and choose Several rows, which makes a child table (one row
per membership, with role and since) that becomes researcher-to-institution edges; Apply; then a
researcher's inspector still shows addresses as one kept item.

Grading rule: success means addresses stayed one value, affiliations became Several rows with role
and since, and the participant confirmed the addresses were untouched. Success with difficulty
means the same end after a wrong turn, a long search or a dead end (the task's own example is
trying the four outcomes on the addresses list first; nobody did that). Failure means addresses
were split into records, or affiliations stayed one value while the participant believed each had
its own year. Grades go by what was on screen at the end and what they concluded.

How the last step is counted: nobody opened a researcher's inspector after Apply. Every participant
confirmed the addresses another way that shows the same fact: the match report line "each list is
kept as one value" for addresses, the addresses entry still unticked in the editor's table tree,
and, after Apply, the contact group in the Data panel still holding its two attributes. That is
graded as confirmed, not as a missed step. It does mean the inspector's "1 item" link on
addresses was never tested in this round.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Knowledge graph engineer | success with difficulty | success with difficulty | Longest search of the five. Looked under relationships, profile and attributes in the Data panel's attribute tree, found affiliations under attributes, then hit two dead ends: the inspector's "One value (kept whole)" looks like a setting but is text, and "Read as..." in its menu changed nothing. Reached the editor through "Edit on the Data page", chose Several rows, checked the child table (role, since, current), applied. End screen: 912 edges = 510 + 242 + 160, contact still 2, a new affiliations group (18.png). Conclusion correct. |
| Computational biologist | success with difficulty | success with difficulty | Checked addresses first in the Data panel ("Read as: One value (kept whole)"), looked for memberships under relationships, then opened the researchers source, which goes straight to the editor. Clicked affiliations in the table tree, chose Several rows (242 rows), checked the child table, applied. End screen: 200 nodes, 912 edges, affiliations as its own table (09.png). Conclusion correct, including the arithmetic. |
| Expert Emma | success with difficulty | success with difficulty | Two wrong turns: looked in the attribute tree (relationships, contact) before opening the researchers source, and expected clicking the affiliations table name to include it, when it only scrolled to the column. Opened the column's role menu, chose Several rows, checked the child table (08.png), applied: 912 edges, contact unchanged. Conclusion correct. |
| ML engineer | success with difficulty | success with difficulty | Detoured through the Columns picker and the relationships group before opening the researchers source. Then direct: affiliations, Several rows, child table, Apply, and checked the edges table (12.png: 912 edges, 242 affiliation, since a column). Also tried to retype since by clicking its type badge; nothing happened. Conclusion correct. |
| Threat hunter | success with difficulty | success with difficulty | Same dead ends as the knowledge graph engineer: guessed relationships first, found affiliations under attributes, then "One value (kept whole)" was not a control and "Read as..." did nothing. Found "Edit on the Data page" in the same menu; from there direct to Several rows, child table, Apply (16.png: 912 edges, attributes group down to 1, contact still 2). Conclusion correct. |

Totals: 0 success, 5 success with difficulty, 0 failure, 0 gave up. Ease scores: 4, 5, 5, 5, 4
out of 7. Every participant ended with addresses as one value and 242 membership edges carrying
role and since, and every one checked the counts (670 + 242 = 912). Nobody split the addresses,
and nobody tried the role menu on the wrong list.

All five grades agree with the participants' own verdicts. The difficulty is entirely in getting
to the editor; once inside it, all five went from the role menu to Apply without a wrong click.

## Findings

Severity is Nielsen's 0-4 scale. Counts are participants out of 5.

1. **The editor is hard to reach from the Data panel (severity 3, 5 of 5).** Everyone started in
   the Data panel's attribute tree, which shows the nested groups but offers no way to change how
   a list is read. Two routes lead to the editor: clicking a table name under Sources (3 of 5 found
   this) and "Edit on the Data page" in an attribute's menu (2 of 5). Neither is labeled as the
   place where a list's shape is decided.

2. **"open it on the Data page" while on the Data panel (severity 3, 2 of 5 saw it, both
   confused).** The attribute inspector says each value is kept whole and to "open it on the Data
   page to read its parts". Both participants who read it were already on what the rail calls
   Data and took it as a circular instruction. The rail item and the editor share one name for
   two different places.

3. **"Read as..." does nothing visible from the attribute inspector (severity 3, 2 of 5).** In
   the skeleton it opens the attribute's inspector, which is the panel they were already looking
   at, so the menu closes and nothing changes. Both people who chose it expected the place to
   change the reading, and both called it a dead control. This is a design defect, not a gap in
   the mock: the menu item routes to the screen it was opened from.

4. **"One value (kept whole)" reads as a setting but is text (severity 2, 2 of 5).** Clicking it
   did nothing.

5. **Clicking a nested table in the editor's tree jumps to its column instead of including it
   (severity 2, 4 of 5 remarked on it).** Every one of them ended up at the right menu anyway, and
   the role menu's disabled options with reasons ("these items are records", "needs ids") were
   praised by 4 of 5. The tree's middle-truncated names ("data.r...addresses",
   "data...affiliations") made 2 of 5 infer which was which from the counts.

6. **"since" arrives as text with no visible way to make it a date (severity 2, 5 of 5).** Not
   part of the task as written, but every participant noticed, three tried a click (the column
   header or its Abc badge) and found nothing. All five said it would bite on the first filter by
   time.

7. **Several rows silently became edges (severity 1, 3 of 5 commented).** All five accepted edges
   as the right model; the knowledge graph engineer wanted the option of a membership node linked
   to both (an n-ary relation) and kept direction instead of Undirected. Recorded as a request,
   single voice.

8. **The vocabulary gap was bridged by the match report (positive, 5 of 5).** The task said
   "membership"; the file says "affiliations". Every participant made the connection through the
   match report's "45 researchers hold two or more" line or the counts. The match report and the
   "Makes" line were the most praised parts of the screen.

9. **Reuse on next month's file (request, 4 of 5).** Four said they would not move off a notebook
   unless the mapping can be saved and rerun on the next export. Nothing on screen answered it.

## A claim not to carry forward

Three participants (computational biologist, Expert Emma, ML engineer) said the Data panel's
attribute tree "does not show affiliations at all". It does: it sits under the attributes group,
where the other two found it. The three expanded only relationships and contact. The real finding
is that a list of relationships to institutions filed under a group called "attributes", next to
an empty-looking "relationships" group, sends people to the wrong group first (all 5 opened
relationships before finding the list), not that the list is missing.
