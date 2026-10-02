# Session: Expert Emma, nested export -- split memberships, keep addresses bundled

Task as given: "In the research export, each researcher has more than one address and more than one
institution membership. Leave each researcher's addresses bundled as they are, a single item of
information about that person, but make each membership a separate record with the year it started."

Start screen: shots/tasks/t25/01.png (Graph panel, Research network, 200 nodes, 670 edges).

All commands ran from design/ui/prototype. Renders are in tmp/round-7-sessions/t25--expert-emma/.

## Steps

### 01 -- Data panel
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t25--expert-emma/01.png task:t25 --click "Data"
"Reshaping the import is a data job, so the Data rail. Sources, Filters, Attributes. The attribute
tree shows the nesting: attributes > profile > contact > metrics > citations, and relationships."

### 02 -- relationships
    ... --click "Data" --click "relationships"
"Only advisor_id in here. Memberships are not under relationships. Fine, wrong guess."

### 03 -- contact
    ... --click "Data" --click "contact"
"addresses is a {} attribute, one item. That half of the job is already the way I want it. But I do
not see memberships anywhere in this tree, so either the importer folded them into something or it
is a setting at the source."

### 04 -- the researchers source
    ... --click "Data" --click "researchers"
"This opens the import editor. Good, that is the right place. The table tree on the left lists the
nested lists as their own tables, unchecked: data.r...addresses [179] and data...affiliations
[242]. The match report says both lists are 'kept as one value'. They call memberships
'affiliations' -- close enough, I assume that is it. Truncated names in the tree ('data.r...',
'data...') are annoying; I had to infer which was which from the counts."

### 05 -- click the affiliations name
    ... --click "data...affiliations"
"Clicking the name did not check it; it scrolled the grid to the attributes.affiliations column,
which says 'One value'. So the setting lives on the column. OK."

### 06 -- open the column's role
    ... --click "One value"
"Menu: One value (170 values), Several values and Several edges greyed out with the reason --
'these items are records' -- and Several rows (242 rows). Good, it tells me why two are disabled
instead of just greying them. Several rows is the one: one record per membership."

### 07 -- Several rows
    ... --click "Several rows (242 rows)"
"Now the tree checkbox is on and the 'Makes' line reads researcher --affiliations (242)--
institution (30). So it went straight to edges to the institution. That is how I would model it
anyway. Report: 'made a child table under researchers: 242 rows, one per item'. Addresses still
kept as one value. Apply is enabled."

### 08 -- inspect the child table before applying
    ... --click "data...affiliations"
"Columns: parent (From -> researcher, locked), institution_id (To -> institution), role, since,
current. 'since' is the start -- 2007-12, 2006-07. Report: 242 researcher-institution edges with
role, since and current as edge attributes. Complaint: since is typed Abc, text, not a date or a
year. If I want 'memberships started after 2015' I have to parse it. I would want a type switch
there, and I did not see one. Not blocking for this task."

### 09 -- Apply
    ... --click "Apply"
"Edges 670 -> 912, which is 510 coauthor + 242 affiliations + 160 links. The arithmetic checks.
New source 'affiliations . 242 rows, 242 edges'. Contact still has its 2 children, so addresses
were left alone. The outlier dots joined the ring because they now have edges. Done."

## Verdict

- Succeeded: yes. Each membership is now its own record (an edge researcher -> institution) with
  role, since and current; addresses untouched as one value per researcher.
- Single Ease Question: 5 of 7. Two wrong turns (looked in the attribute tree first; clicking the
  table name in the import tree did not include it, the real control was the column's role menu).
  Once in the editor, the disabled options with reasons and the 'Makes' line made it obvious.
- Would I use this instead of my current tool: for this step, possibly. In my notebook this is a
  pandas json_normalize / explode plus a merge, five lines, and reproducible. Here it took nine
  clicks and I can see the counts reconcile, which is nice. But I want the 'since' column typed as
  a date, and I want this mapping exported as a script or config I can rerun on next month's
  export. Without that, it is a one-off, and next month I am doing it in pandas anyway.

## Problems noted
1. Import tree names truncate the middle ('data.r...addresses', 'data...affiliations'); had to
   infer from counts.
2. Clicking a nested table's name in the tree only scrolls to its column; it does not include it.
   The checkbox and the column's role menu are the real controls, which took a guess.
3. 'since' imported as text (Abc) with no visible way to type it as a date or year.
4. The Data panel's attribute tree does not show affiliations at all before import changes, so my
   first look for "memberships" found nothing.
5. No sign the mapping can be saved and rerun on the next export.
