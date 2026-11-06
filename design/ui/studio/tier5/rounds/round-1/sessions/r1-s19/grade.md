# Grade: session r1-s19 (task T78A, Dana)

Grade: S
False done: no
Wrong turns: 0
Steps: 22 (from `route.jsonl`; the answer key's path for T78 A is 17, so 5 over)
Overwhelm: 2 (least sure: screenshot 17, right after the Fill row's "+" -- an empty Color box with only a text cursor, no swatches, and all 24 nodes still in their old color; this is the Fill color box, not the selection editor. Smaller: after the filter's Done (screenshot 08), nothing in the Data place pointed to the Graph place's Style layers)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 42 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)
Tool refusals: none

## The last screen and the records

Screenshot 18 and the end-state records hold the answer key's "Also success" route: a Data place
filter on the ties plus a layer's Degree on the filtered graph.

- Filter card "filter-1", on, keep, edges side: `shifts` min 2 (`data.json`), 31 of 63 edges
  kept. The top bar reads "24 of 24 nodes, 31 of 63 edges".
- Style layer "Layer 1", Which nodes "Degree min 3", 11 of 24 (inspector, screenshot 18), fill
  FFA500 (orange). `key.json`: key "Color: Layer 1, 11 of 24 nodes"; 11 nodes drawn #ffa500, 13 in
  the default #6366f1.
- The 11 are the answer key's set (screenshot 14's matches table starts v01, v02, v05, v06, v10,
  in the key's order). Reported: 11. Right, and the screen shows it, so not a false "done".

Why S: the answer key lists this route under "Also success" (an equal count; every reader loses
the weak ties, noted as its route). It is not the near miss (24, Degree on every tie), and it took
no detour, so S rather than SD. The route's cost is that the 32 one-shift ties are now hidden from
the whole graph, not only from the count.

## Path and wrong turns

Data (step 1), Add filter "+" (2), Edges tab (3), Value... (4), `shifts` (5), Ctrl+A, 2, Enter
(6-8: 31 of 63), Done (9), Graph rail (10), Style layers "+" (11), Layer (12), Which nodes (13),
Degree (14), Ctrl+A, 3, Enter (15-17: 11 of 24), Done (18), Fill "+" (19), click the color box
(20), type "orange", Enter (21-22).

- Wrong turns: 0. Nothing was closed empty, undone or removed; every step moved forward on the
  filter route.
- 5 over the path: the filter route costs the trip to the Data place and back (Data, Graph) and
  the Edges tab, and the participant clicked into the color box before typing.

## Follow-up

Present in the transcript. Rating 2. Least sure: after Fill's "+", a "Color" box under Fill,
empty and highlighted; a click gave only a blinking cursor, no palette, and the picture still had
all 24 dots in their old colors, so nothing said whether it wanted a name or a code. Typing
"orange" (as in Excel) worked and became FFA500. A smaller wobble: after the filter, guessing that
painting some people lives under the Graph place's Style layers.

## Problems

1. Severity 2, behavior. The Degree step on the layer counts over the filtered graph and nothing
   in the workspace says so: the participant trusted it only because the range read 1 to 5, matching the Values panel after the filter. A reader who missed that would not know
   which base the "11 of 24" is over. Evidence: steps 13-17, screenshots 13-14 (range 1 to 5,
   header "11 of 24"; only the top bar's "31 of 63 edges" hints at the filter); wrap-up's first
   confusion. One session; a second on the other half would make it the criteria's severity 3
   ("a count over a base nobody can tell").
2. Severity 2, behavior. The filter route hides the 32 one-shift ties from the whole graph to
   count over the strong ones; the layer's own Advanced > Edges where, which keeps every tie
   drawn, was never offered on the way. Evidence: step 9 (Done, screenshot 08: 31 of 63 edges
   drawn); `data.json` filter-1. The answer key accepts the route; the loss of the weak ties is
   the noted cost.
3. Severity 2, behavior. Clicking the empty Fill Color box gives only a text cursor, no swatches
   or picker, so a reader who does not know a name or hex has no way forward from the box
   itself. Evidence: step 20, screenshot 17; the follow-up's least-sure moment. Also r1-s14 and
   r1-s11. The Fill color box, not the selection editor: backlog, not bar 9.
4. Severity 1, wording. "Degree" in the value picker carries no plain meaning on screen; the
   participant guessed "how many people they're tied to". Evidence: step 14, screenshot 13.
5. Severity 1, opinion. The range's low box means "at least", so "more than one" and "more than
   two" had to be turned into 2 and 3 by hand. Evidence: steps 6 and 15, screenshots 07 and 14;
   wrap-up.
