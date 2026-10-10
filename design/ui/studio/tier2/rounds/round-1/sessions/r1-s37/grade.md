# Grade: session r1-s37 -- Elena, back with two office spreadsheets, joins staff and emails into one network (people.csv + messages.csv)

**Grade: S** (success). Both files were loaded as one drawn network, the counts were stated and
right for her choice, and she named the one row that did not fit before loading: line 24 of
messages.csv, Kemi Bello (p11) emailing p13 six times, where p13 is not on the staff list. She
chose "Add", so the load made 13 nodes and 23 edges; the answer key accepts Add (13 and 23) or
Leave out (12 and 22) when the participant says which row did not fit. She then checked on the
drawing that p13, Kemi's name and team, and the 6 emails all arrived.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes,
started empty. This is the frozen build named in the criteria. Every screenshot matches its
command. The session is not void (see "Tool and run" for one click by name that found nothing).

## What the last screens show

- `17.png` (last): the Graph page of "people and messages", 13 dots with arrows. The tie from the
  top dot down to its neighbor is selected (blue band); the inspector reads "p11 -> p13", Edge,
  From p11, To p13, emails 6.
- `14.png`: right after Load. Header "From 2 files"; Overview Nodes 13, Edges 23, Directed, Loaded
  weight "emails (closer)", Density 0.1474, Components 1, "Edges per node 1 to 6, mean 3.538".
- `15.png`, `16.png`: node p13 (id only, Degree 1); node p11 with name Kemi Bello, team Operations,
  Degree 4.
- `09.png`: before Load, after Add: "people and messages: 13 nodes, 23 edges", "12 node rows and 23
  edge rows read; the load makes 13 nodes and 23 edges.", the unmatched row shown as line 24, p11,
  "p13 (no node row)", 6. `07.png` and `08.png` show the earlier state the answer key describes
  (22 edges, "1 left out", Leave out preselected).

## Measures

- **Steps:** 16 after the start (`02.png` to `17.png`). The graded end state is reached at step 14
  (Load). Steps 10 to 13 set emails as the weight (outside the task); steps 15 to 17 were her own
  checks. The success path is about 8 to Load.
- **Wrong turns: 0 on the task.** She chose "New from data..." first, found the "+" beside Tables
  by hovering, showed the unmatched row and decided knowingly. Step 10 was a click by name that
  the tool could not match (below), not a wrong choice.
- **Detour recorded per the answer key:** she stopped to set the weight (steps 10 to 13), prompted
  by the line "Weight: none (each edge counts 1)". It did not change the task's outcome.
- **She did not visit the Data page** after Load; not needed, since she read and acted on the
  report before loading.
- **Self-rating** (6 of 7) was not used in grading.

## Claims

- "13 and 23, matches what the setup screen promised -- 12 staff plus that p13, and every email
  row" (`14.png`): true.
- "p13 -- no name, no team, just the code" (`15.png`): true.
- "There she is, with her name and team, so the staff list joined up with the emails" (`16.png`):
  true for p11. She inferred the join for everyone from one node; the import page's attribute
  mapping (`04.png`, name and team as Attributes on 12 rows) supports it.
- "6, matches the spreadsheet" (`17.png`): true.
- **False "done" claims: none.** truth-on-screen: no wrong claim.

## Problems

Severity 0-4 (Nielsen). "Confirmed" here notes other round 1 T4 sessions that report the same
thing (r1-s33, r1-s34); the round report decides confirmation.

1. **Severity 2 -- "Leave out" is preselected for an edge row that names a missing node, and the
   choice is shown only by an outline, with no words.** Elena: "If I had been in a hurry I would
   have lost a link without noticing"; the warning triangle and "1 left out" in the Tables list
   are what stopped her. Held at 2 in this session: she was not misled. Also reported in r1-s34.
   Evidence: `07.png`, `08.png`, debrief.
2. **Severity 2 -- the people's names never show where she looks for them: no labels on the dots,
   the node inspector is titled with the id ("p11", not "Kemi Bello"), and a tie reads "p11 ->
   p13".** It cost her a click per person to learn who anyone was. Outside the task per the answer
   key. Also reported in r1-s33 and r1-s34. Evidence: `14.png`, `16.png`, `17.png`.
3. **Severity 2 -- "Weight: none (each edge counts 1)" reads as a problem to fix, and making emails
   the weight means changing a dropdown that reads "Attribute" to "Weight".** The "Higher means"
   sentence then talks about PageRank, communities and paths, and offers "Capacity", none of which
   she understood; only the follow-up sentence "such as more emails between two people" made the
   choice clear. Also reported in r1-s33 and r1-s34. Evidence: `09.png`, `11.png`, `12.png`,
   `13.png`.
4. **Severity 1 -- after setting emails as a "closer" weight, the drawing looks the same: every
   line is the same thickness, so she could not tell whether the weight did anything.** The
   Overview does say "Loaded weight emails (closer)". Opinion-level (the weight is a fact for later
   runs, not a style), held down. Evidence: `14.png`, debrief.
5. **Severity 1 -- the "Add a table" control is a bare "+" with no words; its name appears only as
   a hover tooltip, and the pointer stays an arrow over it.** She found it by hovering. Evidence:
   `05.png`.

What worked: the running count ("the load makes 13 nodes and 23 edges") and "Show the 1 unmatched
row", which names the line, the sender, the missing person and the number, let her decide Add
knowingly; she called the count the part she would show a colleague.

## Tool and run

No tool fault that affected the session. Step 10, `--click "Attribute"`, matched nothing: the
dropdown's accessible name is its column label ("emails"), and "Attribute" is its value, so the
tool's name lookup found no control and nothing changed (`10.png`). Step 11's `--click-at 728,203`
opened that dropdown, as one click on the visible word would for a person. The cost was one step
with no change of state. Step 5's `--hover-at 271,107` showed the "Add a table" tooltip, and steps
15 to 17's `--click-at` hit p13, p11 and the p11 -> p13 tie as reported.

No build defect showed up: every control did what the answer key says it does, and no step was
spent on a broken control or an implementation fault. The problems are design findings.
