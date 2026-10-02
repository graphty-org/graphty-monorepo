# Session: split nested memberships into records -- Priya (threat hunter, SOC)

Task as given by the moderator: "In the research export, each researcher has more than one address
and more than one institution membership. Leave each researcher's addresses bundled as they are, a
single item of information about that person, but make each membership a separate record with the
year it started. The data on screen is a sample: one export from a research database, researchers
and institutions with records inside records. If that is not your line of work, treat it as your
own nested export."

Start screen: shots/tasks/t25/01.png. Renders: tmp/round-7-sessions/t25--cybersecurity-analyst/02.png to 16.png.
All commands were run from design/ui/prototype. P = tmp/round-7-sessions/t25--cybersecurity-analyst.

## Steps

**01 (start).** "Research data, not my world. Treat it like a nested JSON dump, a BloodHound export
with objects inside objects. 'Local only' at the top is good to see. Where do I see the import or
schema? 'Data' on the left looks right."

**02.** `timeout 120 node app-b/study.mjs --try P/02.png task:t25 --click "Data"`
"Sources, Filters, and an Attributes tree with nested groups: attributes, profile, contact, metrics,
citations, relationships. Memberships are a relationship, so I'll bet they're under relationships."

**03.** `... --try P/03.png task:t25 --click "Data" --click "relationships"`
"Relationships holds only advisor_id. Wrong guess. Try contact for the addresses."

**04.** `... --try P/04.png task:t25 --click "Data" --click "contact"`
"addresses, with a curly-brace icon, and email. So addresses is already one blob. That half of the
job is already done. Leave it."

**05.** `... --try P/05.png task:t25 --click "Data" --click "attributes"`
"'affiliations', curly braces again. Calling memberships 'affiliations' and filing them under a
group called 'attributes' is why I missed them, but fine, that's the field."

**06.** `... --click "Data" --click "attributes" --click "affiliations"`
"Inspector: Read as 'One value (kept whole)'. It says to open it on the Data page to read its parts.
I'm already on what the rail calls Data, so what does that mean? Also, the tree under the rail
collapsed back after my click."

**07.** `... --click "One value (kept whole)"`
"Plain text, not a control. Nothing happened."

**08.** `... --hover "More"` -- tooltip "More actions (Shift+F10)" on the inspector's "...".

**09.** `... --click "More actions"`
"Menu: Color by, Size by (grayed out), Label by, Show as groups, Filter to, Create set, Read as...,
Edit on the Data page, Show in table. 'Read as...' is the one I want."

**10.** `... --click "More actions" --click "Read as..."`
"Nothing. The menu closed and the screen looks the same. No dialog, no message. That's a dead
control as far as I'm concerned."

**11.** `... --click "More actions" --click "Edit on the Data page"`
"OK, so 'the Data page' is a different screen from the Data panel. This is an import mapper: the
file's table tree on the left, the researchers table in the middle, a match report at the bottom.
Under data.researchers there are two child tables, addresses [179] and affiliations [242], both
unticked. The report says both are 'kept as one value'. That I can read."

**12.** `... --click "Edit on the Data page" --click "affiliations"`
"I meant to tick the affiliations table in the tree, but it jumped to the affiliations column in
the grid and opened a dropdown: One value (170 values), Several values (grayed out), Several edges
(grayed out), Several rows (242 rows). 'Several rows' is one row per membership. Close enough."

**13.** `... --click "affiliations" --click "Several rows (242 rows)"`
"Report: 'attributes.affiliations made a child table under researchers: 242 rows, one per item.' The
summary line at the top now reads researcher --affiliations (242)-- institution (30). It turned
each membership into an edge to an institution, which is more than I asked for, but it's what I'd
want. Addresses are still unticked and still 'kept as one value'. Apply is now enabled."

**14.** `... --click "Several rows (242 rows)" --click "data...affiliations"`
"I don't believe the 'year it started' part until I see it. Child table: parent, institution_id,
role, since, current. 'since' is like 2007-12, year and month. 'role, since and current as edge
attributes.' Fine. But 'since' is typed Abc, text. If I want to filter memberships by a time range
later, text dates are going to bite me."

**15.** `... --click "data...affiliations" --click "since"`
"Clicking the 'since' header gives me nothing. I can't see where to make it a date. Not part of the
task, so I'll leave it, but I'd want that."

**16.** `... --click "data...affiliations" --click "Apply"`
"Applied. Back on the graph. Edges went from 670 to 912. 670 plus 242 is 912, so the counts add up
and nothing was silently dropped. New source 'affiliations . 242 rows, 242 edges'. The researchers'
'attributes' group went from 2 to 1, so affiliations is no longer stuck on the node. contact still
shows 2, so addresses is still one bundled value. The stray institution dots that floated outside
the ring before are now connected. Done."

## Outcome

Succeeded, I think. Addresses stayed one value per researcher; memberships became 242 separate
researcher-to-institution records, each with role, since (start year and month) and current. The
counts reconcile.

**Single Ease Question: 4 / 7.** The editor itself, once I got there, was clear and the match report
told me exactly what would change, which is the best thing in here. Getting there was not:
- The memberships were under a group named "attributes" and called "affiliations"; I looked under
  "relationships" first.
- "Read as..." in the menu did nothing at all.
- The inspector says "open it on the Data page" while I'm already on what the rail calls Data. The
  real thing is "Edit on the Data page", a separate screen.
- Clicking a table in the left tree opened a column dropdown instead; I got lucky that it was the
  right dropdown.
- The start date comes in as text and I found no way to make it a date.

**Would I use this instead of my current tool?** For this kind of job, maybe. Today I'd flatten a
nested export in pandas with json_normalize and explode, and that notebook records exactly what I
did and reruns on next month's file. This showed me the counts before and after and a plain
report of what each choice does, which my notebook doesn't do for free. But I'd need to know this
mapping is saved and reapplies to next month's export, and I'd need real dates, before I'd move off
the notebook. And none of it matters until it's on the approved list.
