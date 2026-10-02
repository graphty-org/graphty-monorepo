# Grades: production hosts that talk to at least three others

The task: "You want to work only with production hosts that talk to at least three other hosts.
How many hosts does that leave, and how many would there have been if you had not first limited
it to production?" The data is a sample IT estate: 300 hosts, 1,105 directed connections, 69
host attributes.

The intended path: from the graph, open the Data place (the "Full graph" chip in the top bar does
this), reach the Filters list on the hosts, and read the line under the computed step "Degree 3
or more": "179 nodes left; 182 on the full graph". The intended final screen is
shots/tasks/t07-wide/04.png.

Grading rule: success means both numbers, 179 and 182, were read from that line and stated
correctly. Success with difficulty means both were read only after opening the step's inspector
or the attribute list first. Failure means reporting 187 or 182 as what is left, or concluding
that the degree is counted on the full graph. Grades go by what was on screen at the end and what
they concluded, not by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | gave up | gave up | Built "environment is prod" by typing; the step kept "all 300 nodes" (12.png) and the table still listed dev and staging hosts (16.png). Searched the field picker for degree: "No match for deg" (21.png). Stopped with no answer; the only number held was 187 prod hosts, which she did not offer as the answer. |
| Knowledge engineer | gave up | gave up | Same step, same "Kept all 300 nodes" (09.png, 10.png). Added a second step but could not open its rule; clicking it only showed the tooltip "pick a field in its inspector" while the inspector stayed on the first step (13.png). Gave no number. |
| Expert Emma | gave up | gave up | Same step and count (10.png, 11.png). Got the second step open on the third try; degree not in the picker (18.png). Ran "Links (count)" in Analyze, which produced no column (21.png). Ended on "Top 10 by degree", still "300 of 300 nodes" (24.png). Gave no number. |
| Screen-reader analyst | gave up | gave up | Same step and count (10.png to 13.png); followed "300 of 300 nodes" to the table and found dev and staging hosts in it. Found "Export table as CSV" and would finish in Python. Offered "187 prod hosts before the connection limit", correctly framed as the count before the degree condition, not as what is left, so this is not the failure the rule names. |
| Bioinformatics researcher | failure | gave up | Never got a value into the box: a typed "p" opened Path between with "rod" in From (14.png). Ran "Links (count)", no result (17.png). Stopped with 187 prod hosts and "nothing else". No wrong number was reported, so this is gave up, not failure. |

Totals: 0 success, 0 success with difficulty, 0 failure, 5 gave up. Ease scores 2, 2, 2, 2, 2 out
of 7.

**The line this task was written to test was never seen.** No participant reached a screen with
the degree step, so this round says nothing about whether "179 nodes left; 182 on the full graph"
is read correctly. That question carries over to the next round unanswered.

## Why nobody could have succeeded (prototype fidelity, not a design finding)

The start screen leads to the Data place with no filters (the second render of the intended
path). The intended path then jumps to a screen where the steps already exist. A participant
clicking through has to build the steps, and the prototype's step builder does not run what is
built: a step the reader makes takes the name of its condition but has no rule behind it, so it
reports "Kept all 300 nodes" whatever is typed. All five built "environment is prod" (or tried
to), and all five saw it keep 300 of 300 while the attribute list said 187 hosts are prod. Every
participant stopped on that contradiction, and every one named it as the reason they would not
trust the tool. "Top 10 by degree" also showed 300 of 300 (Emma, 24.png), and "Run" on Links
(count) adds no column (Emma, Bioinformatics researcher). The "Full graph" chip staying unchanged
with steps on has the same cause.

What this cost: the whole task, for 5 of 5. It also sank trust in counts generally ("a wrong
number dressed as a right one", knowledge engineer), which colors every other comment in these
sessions. Before this task runs again, either the builder must apply a typed condition and a
degree threshold, or the task must start on the screen with the steps already built and ask only
for the reading.

Note on the shared formatter: the step rows still written outside the shared formatter ("300 to
187 nodes") never appeared in any session, so there is no misreading of them to file.

## Design findings that stand despite the above

These were met before the dead end and do not depend on the builder computing anything.

1. **The value box for a category attribute is a blank text box (5 of 5).** The app already knows
   environment has three values (prod 187, staging 67, dev 46), but the condition offers no list,
   and "is one of" gives the same empty box (4 of 5 tried it). Four said they would have typed
   "production" and got nothing if they had not stumbled onto the attribute page first. Severity
   3 (major): a misspelled value silently matches nothing.
2. **Degree cannot be used as a threshold condition (3 of 3 who looked for it).** The menu item
   reads "By an attribute or computed value", but typing "deg" in its picker finds nothing
   (Cybersecurity analyst, Emma); degree appears only under "Top of a computed value", which has
   no "at least". The screen-reader analyst found no way to say "at least N connections". Two
   others went to Analyze instead. k-core was offered and correctly rejected by four as a
   different thing. Severity 3: half the task cannot be expressed in the picker the menu points
   to. (The intended screen draws "Degree 3 or more" as a computed step, so the design intends
   this; the picker does not yet offer it.)
3. **Clicking a field name in the picker opened the same-named attribute in the left list (5 of
   5), and threw away the step being built.** Caveat: the study tool's click takes the first
   control with that name on screen, so part of this is the tool. But two names on one screen
   are still ambiguous to a screen reader, and the screen-reader analyst said so. Typing into the
   picker's search worked for every participant who tried it. Severity 2.
4. **"Talks to three other hosts" has no stated meaning on a directed graph (4 of 5).** In, out
   or either; distinct neighbors or edges, with a reciprocal pair counting once or twice. The
   summary says "total degree" and Analyze says "Links (count): how many edges each node has";
   nothing near a filter says which. The two expert participants called this the first thing
   they would check. Severity 2.
5. **Clicking a value row in an attribute ("prod, 187 hosts") does nothing (3 of 5).** Three
   expected it to offer "keep only these", the way they work in Cytoscape and Gephi. Severity 2,
   and a cheap route to the step that finding 1 makes hard.
6. **A second new step could not be selected (2 of 2 who added one).** After "Add filter step",
   clicking the new row only showed its tooltip ("pick a field in its inspector") while the
   inspector stayed on the first step; Emma needed three tries. Severity 3 for those who hit it:
   it blocks a two-step filter. Check whether this is the builder or the design before filing.
7. **Typing into the value box fired a global shortcut (1 of 5).** "p" opened Path between and
   the rest went into its From box (Bioinformatics researcher, 14.png). One voice, and the
   keystrokes may have landed after focus left the box, but a shortcut must never fire while a
   data field has focus. Verify before filing; if real, severity 3.
8. **Single voices, to watch:** two "More" buttons, one the graph's with "Clear graph data"
   (Screen-reader analyst); "the eye in the Graph tree" names a control by its look, not its name
   (Screen-reader analyst); "95 attributes" in Data against "Columns: 8 of 69" in the table, with
   nothing saying the 95 includes the 26 connection attributes (Knowledge engineer).

## What worked

- "Filters change what is computed; the eye in the Graph tree only hides" was quoted with
  approval by 5 of 5, and the experts said it named exactly the order-of-operations question the
  task asks. It is the right sentence in the right place.
- "Local only" in the top bar was noticed first and approved by 4 of 5.
- The attribute page (distinct values with counts and fill) gave all 5 the one number they
  trusted, 187.
- Typing in the field picker, with "1 match" spoken, worked for everyone who tried it.
- A disabled menu item that says why ("Select one or more nodes first") was praised by the
  screen-reader analyst.
