# Grade: session r1-s20 (task T78B, Maren, returning)

Grade: S
False done: no
Wrong turns: 1
Steps: 33 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T78 B is 19. The success state was reached after 27 steps, 8 over; the last 6 are checks of the join made after it)
Overwhelm: 3 (least sure: the new layer's Which nodes value picker, screenshot 14 -- it listed only the data columns, with no Degree or anything about neighbors, until "degree" was typed into its search; this is the selection editor's value picker)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 55 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 25 and the end-state records agree with the answer key's B values:

- Top bar: "11 of 11 nodes, 10 of 13 edges". `data.json`: one filter card on the edges,
  `data.km` max 2.9, count "10 of 13"; total nodes 11 and total edges 13, so nothing was deleted.
- Style layer "Layer 1": Which nodes is one step, Degree (`graphty.degree`) min 2, over the
  visible graph; fill #FFA500 (a visible orange). `styles.json`: matched 7, visible 7 of 11,
  painted 7; the layer wins node color on 7 members. The canvas key reads "Color: Layer 1, 7 of
  11 nodes"; `key.json` counts 7 nodes drawn #ffa500 and 4 drawn #6366f1.
- The members, named by the participant and checked against the edge table on screenshot 25:
  Mill Pond, Cedar Bend, Quarry Pool, Fox Creek, Old Bridge, Stone Weir, Heron Marsh (G02, G03,
  G11, G04, G05, G07, G08) -- the key's seven.
- Reported: 7 gauges, with the filter (10 of 13 stretches under 3 km) and the rule (Degree min 2)
  that produce them. The count is right and the screen shows it.

## Path and wrong turns

The participant took the answer key's "also success" route: a Data place filter card on the
edges (`km` max 2.9), then a style layer whose Degree is counted on the filtered graph. The key
accepts it as an equal count, noted as its route: every reader of the graph loses the three long
stretches while the filter is on, where the key's own path keeps them and narrows the Degree with
the layer's Advanced, Edges where. Success state reached when the color was committed (step 20).

- Wrong turn (1): steps 2 and 3 opened the edge table and scrolled it to read the stretch
  lengths and count the answer by hand, a place the task does not need; it was left once the
  long stretches were known.
- Not wrong turns: the filter itself (the accepted route); step 7's "km" click, which the tool
  answered as ambiguous (two controls named km) and which the participant resolved with the
  option name; the checks of flows.csv and its join at steps 21 to 25, made after the success
  state and ended with Cancel, which changed nothing (screenshot 25 matches screenshot 20).

The 8 extra steps before success: the edge table and its scroll (2), the filter route's own
steps, against the key's Advanced route (Data, Edges, Value..., km, Done: about 5, less Advanced,
Edges where and Edge value... it skips), the ambiguous "km" click (1) and the Control+A before
typing 2 (1).

## Follow-up

Present in the transcript. Rating 3. Least sure: opening Which nodes on the new layer
(screenshot 14): the value picker listed lat, lon, depth_cm, station, code, installed, telemetry
and Data source, and nothing about connections, so for a few seconds the participant thought the
program could not choose nodes by their neighbors and did not know whether to look in another tab,
go back to the Data place or give up on the layer; Degree appeared only after typing "degree" on a
hunch. A close second: flows.csv's "13/15" beside the source panel's "Loaded: Nodes 1, Edges 14"
and a network of 13 edges, with nothing on that screen naming the rows left out until Edit join.

## Problems

1. Severity 2, behavior. The value picker in a style layer's Which nodes shows only data columns
   when it opens; Degree, In-degree and Out-degree, the only way to choose by neighbors, appear
   only after the person types their name into its search. Nothing in the open list says the
   graph's own measures are there. The participant nearly abandoned the route. Evidence: steps 13
   to 15, screenshots 14 and 15; the follow-up's least-sure answer names this element (the
   selection editor's value picker), so it counts for bar 9; the answer key already reads it on
   the earlier build ("Degree is not in the open value picker until searched").
2. Severity 2, behavior. flows.csv shows three edge counts over three bases, none named: the
   source row "13/15", the source inspector's "Loaded: Nodes 1, Edges 14", and the network's 13
   edges. The join view's chips ("14 edges added, 1 new node, 1 not in graph, 1 repeated key, 1
   unknown end") still count the stretch to G12 that was removed afterwards, so even the
   explanation does not add up to 13. The rows left out are reachable only through Edit join, a
   name that reads as changing the data. Evidence: steps 21 to 24, screenshots 22, 24 and 25.
   Not part of the selection editor: listed for the backlog, not bar 9.
3. Severity 1, behavior. With the node table open, the lowest orange gauge sits under the canvas
   toolbar, so a count of the drawing finds 6, not 7. Evidence: screenshots 20 and 25 (the node at
   the toolbar's top edge); a known build note in the answer key.
4. Severity 1, opinion. The layer and the canvas key say nothing about the Degree being counted on
   the filtered graph: the key reads "Color: Layer 1, 7 of 11 nodes" with no rule or cutoff, and
   turning the km filter off would recount Degree and change the set with no sign on the layer.
   The participant wants the rule and the cutoff in the key for a published figure. Evidence:
   the end-of-session comments; screenshot 25.

No build defect needed a scripted repro: problems 1 and 3 are known in the answer key and
problems 2 and 4 are screenshot-visible. The study tool refused nothing (no FAIL or refusal line
in `route.jsonl`); its two "ambiguous" answers (steps 7 and 21) were resolved by the participant
with a more exact name.
