# Session: door entries, shortest chain between Ana Ruiz and Priya Nair

Participant: Priya, threat hunter in a corporate SOC (persona file
study/personas/cybersecurity-analyst.md).

Task as given: "Could Ana Ruiz and Priya Nair have run into each other through the buildings
they use? Work out the chain that links them with as few go-betweens as possible, and say through
which building."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t12-doorentries--cybersecurity-analyst/ (D below).

## Think-aloud

**01 (start screen, shots/tasks/t12-doorentries/01.png).** OK. "Door entries, March 2026", so
the time range is in the title -- good, that's my first question answered. 412 people, 9
buildings, 1,306 edges, directed. A hairball, as always. Before anything: is this approved, where
does it run, does it phone home? There's a chip that says "Local only". Let me see what it means.

    timeout 120 node app-b/study.mjs --try D/02.png task:t12-doorentries --hover "Local only"

**02.** Tooltip says "Privacy settings". That's a label, not an answer. I'd want one line that
says "runs in your browser, no network calls". In a real trial I'd stop here and ask. It's a
study, so I keep going.

First thing I do in any tool: search for the entity I know. There's "Find rows and notes".

    timeout 120 node app-b/study.mjs --try D/03.png task:t12-doorentries --click "Find rows and notes"

**03.** Box is focused. Fine, but what I actually want is a path query, not a find. The left
side says "Analyze (Shift+A)". Let me look there.

    timeout 120 node app-b/study.mjs --try D/04.png task:t12-doorentries --click "Analyze"

**04.** A command list with "Shortest path" right under Recent. That's the query I want. No
query box where I can write it myself, but fine.

    timeout 120 node app-b/study.mjs --try D/05.png task:t12-doorentries --click "Analyze" --click "Shortest path"

**05.** "Path between" form: From, To, Direction (Either way is on -- correct, people swipe INTO
buildings so a directed path would never get from one person to another), Weight "count (loaded
weight)", "Stronger", "it uses 1/count". Hm. That means by default it's going to give me the
heaviest route, not the fewest hops. The task is fewest go-betweens. I'll have to change that.
Somebody who doesn't read the small gray text gets a weighted answer and doesn't know it.

    timeout 120 node app-b/study.mjs --try D/06.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name"
    timeout 120 node app-b/study.mjs --try D/07.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name" --click "Ana Ruiz"

**06-07.** Clicked "From". Tooltip: "Click a node on the canvas, or type a name". No list of
names drops down. I'm not clicking a dot in a 421-dot hairball. Let me go find her in the table
instead and come back.

    timeout 120 node app-b/study.mjs --try D/08.png task:t12-doorentries --click "Nodes"

**08.** Node table, from people.csv and buildings.csv. Ana Ruiz is row 1, id 1001, Facilities.
Priya Nair is id 1188, Legal. Good, that's my ground truth.

    timeout 120 node app-b/study.mjs --try D/09.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz"

**09.** Selecting Ana flipped the table to Edges on its own. I didn't ask for that. But now
I'm reading it: 1001 -> B1, 22 swipes, Mar 2 07:58 to Mar 27 17:12. The canvas says "Ana Ruiz,
1 connection". So she only ever uses B1. And row 3: 1188 -> B1, 6 swipes, Mar 2 08:12 to Mar 19.
That's Priya Nair. Same building, overlapping dates, both in B1 on the morning of Mar 2 fourteen
minutes apart. That's already the answer, from the table. I still want the tool to confirm it,
because I'm not sure this edge list is filtered to Ana -- the header still says 1,306 edges and it
shows four rows. Is that the top four by count, or Ana-related rows? Unclear.

    timeout 120 node app-b/study.mjs --try D/10.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Analyze" --click "Shortest path"

**10.** I opened Shortest path with Ana selected. From is still empty. She's selected, it's
right there in the side panel, and the form doesn't use her. Annoying.

    timeout 120 node app-b/study.mjs --try D/11.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Nodes" --click "Ana Ruiz"

**11.** With the form open I can't reach the table at all. Nothing on screen called "Nodes".

    timeout 120 node app-b/study.mjs --try D/12.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "1 note"

**12.** Side detour: Ana has "1 note", I clicked it. The whole thing switched to Les Miserables.
Different graph, different notes, Valjean and Javert. My door data is gone from the screen. If
this happened on a real case I'd assume I'd lost my work. That's a trust killer.

    timeout 120 node app-b/study.mjs --try D/13.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --hover "Path"
    timeout 120 node app-b/study.mjs --try D/14.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between"

**13-14.** Back on the door data. The little toolbar over Ana has an icon whose tooltip is
"Path between (P)". Started from her own toolbar -- From is STILL empty. That's just wrong.

    timeout 120 node app-b/study.mjs --try D/15.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between" --click "Click to pick"
    timeout 120 node app-b/study.mjs --try D/16.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between" --click "count (loaded weight)"
    timeout 120 node app-b/study.mjs --try D/17.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between" --click "Nodes" --click "Ana Ruiz"

**15-17.** "Click to pick" just moves the "type a name" focus to To. The Weight dropdown has
"None" -- good, that's how I get fewest hops. Clicking a row in the table while the form is up
doesn't work. Fine, I'll type the names, which is what I'd have done first if the box had
looked like it took typing.

    timeout 120 node app-b/study.mjs --try D/18.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name" --key A --key n --key a
    timeout 120 node app-b/study.mjs --try D/19.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name" --key A --key n --key a --key Space --key R --key u --key i --key z --key Enter

**18-19.** Typed "Ana" -- no suggestions, no "1 match". Typed the full name and Enter, it took
"Ana Ruiz" and jumped to To. Works, but with no autocomplete I'm guessing at spelling. On my
real data with tokenized account names that's a problem.

    timeout 120 node app-b/study.mjs --try D/20.png task:t12-doorentries <the steps from 19> --key P --key r --key i --key y --key a --key Space --key N --key a --key i --key r --key Enter
    timeout 120 node app-b/study.mjs --try D/21.png task:t12-doorentries <the steps from 20> --click "count (loaded weight)" --click "None" --click "Find path"

**20-21.** Both set, Find path is live. Set weight to None, ran it. Result panel: "Ana Ruiz to
Priya Nair", 3 nodes, 2 edges, Via B1. Members in path order: Ana Ruiz (start), B1 (hop 1),
Priya Nair (end). "Made with: Weight None (this run's override)". It's in the left list under
"Shortest paths" with a color and a legend, and there's Undo. That is exactly what I saw in the
edge table, so I believe it.

## Answer

Yes. Ana Ruiz and Priya Nair are linked directly through building B1, with no other person in
between: Ana Ruiz -> B1 -> Priya Nair. From the edge table, both badged into B1 in overlapping
windows (Ana Mar 2 to Mar 27, 22 entries; Priya Mar 2 to Mar 19, 6 entries), and both on the
morning of Mar 2, at 07:58 and 08:12. Whether they were in the same room at the same moment I
can't tell from first/last swipe; I'd need the raw swipes.

## Verdict

- Succeeded: yes, I think so. The path agrees with the raw edge rows, which is the check I care
  about.
- Single Ease Question: 4 of 7. The algorithm and the result panel were fine. Getting the two
  names into it was not: the selected node isn't used as From, there's no autocomplete, the form
  locks the table, the default weight would have given me a weighted answer to a hop question,
  and one click on a note dumped me into a different dataset.
- Would I use it instead of my current tool? Not for this. For "do these two share a building" a
  pivot in Splunk or two lines of pandas is faster, and gives me the timestamps, which is the part
  that actually answers "could they have met". The path panel with the hops in order and the
  "Via B1" line is the nicest part -- I'd paste that into a case. If From took my selection and
  the path came with the overlapping time windows per hop, I'd consider it for multi-hop cases
  where the table gets painful.
