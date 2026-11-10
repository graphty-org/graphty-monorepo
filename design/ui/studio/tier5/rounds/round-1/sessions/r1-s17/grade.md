# Grade: session r1-s17 (task T78A, Grace, returning)

Grade: SD
False done: no
Wrong turns: 1
Steps: 25 (inputs in `route.jsonl`, counted by `tool/steps.mjs`; the answer key's path for T78 A is 17, so 8 over)
Overwhelm: 2 (least sure: the Style tab of the right panel with nothing picked -- background, lighting and labels for the whole canvas, nothing about which people get a color; not part of the selection editor. A smaller wobble at Which nodes: Degree's base, inferred only from its range dropping from 3-8 to 1-5 -- part of the selection editor)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 41 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)
Tool refusal: none (no FAIL or refusal line in `route.jsonl`; every step exit code 0, 0 missed)

## The last screen and the records

Screenshot 18 and the end-state records agree with the answer key's A values (11 of 24):

- Style layer "Layer 1": Which nodes "Degree min 3", "11 of 24"; Fill color FFA500 (orange).
  `styles.json`: the node layer's selector keeps `graphty.degree` min 3 within `visible`, matched
  11, set `node.color` #FFA500.
- `key.json`: "Color: Layer 1, 11 of 24 nodes"; the drawing counts 11 nodes #ffa500 and 13 in the
  default #6366f1.
- The editor's matches at step 15 (screenshot 15) begin v01, v02, v05, v06, v10 -- the key's list.
- `data.json` / `work.json`: one Data place filter card on the edges, `shifts` min 2, keeping 31 of
  63 edges; 24 of 24 nodes.

This is the answer key's "Also success" route: a Data place filter on the ties (`shifts` 2 or
more) and the layer's Degree on the filtered graph. The count equals the main path's, but the
filter takes the 32 one-shift ties out of every reader's picture (the top bar reads "24 of 24
nodes, 31 of 63 edges"); noted as this session's route.

## Path and wrong turns

Data, Add filter, Edges, Value, `shifts`, min 2, Done (filter); Graph, + > Layer, Which nodes,
Degree, min 3, Done, Add to node fill, the color box, "orange". Success state reached at step 18
(the color committed).

- Wrong turn (1): step 9 opened the right panel's Style tab, a place the task does not need (the
  canvas-wide settings), then left it for the Graph place's Style layers at step 10. The
  participant recovered by themselves, hence SD.
- Not wrong turns: the Data place filter (the answer key's accepted route), typing the color name
  "orange" rather than a hex (the box took it as FFA500).

The 8 extra steps against the 17-step path: the Data place filter's own clicks in place of the
layer's Advanced "Edges where" steps (about the same), the Style tab and the return to Graph (2),
the clicks into the already-focused number boxes and Ctrl+A (4), the click in the color box (1).

## Follow-up

Present in the transcript. Rating 2. Least sure: right after saving the "shifts min 2" filter,
clicking the Style tab on the right showed background, lighting and labels -- nothing said who gets
a color -- and the participant had to remember the Graph place's "Style layers" +. A smaller wobble:
picking Degree at Which nodes only because its range had dropped from 3-8 to 1-5; "Nothing on
screen actually said so."

## Problems

1. Severity 2, behavior. Which nodes' Degree step does not say what it counts over: on a filtered
   graph it counts only the visible ties (`within: visible`), but the step shows only "Degree" and
   a 1-to-5 range. The participant trusted it only by noticing the range had changed from 3-8 (Data
   place values box, step 8) to 1-5 (step 14). Evidence: steps 13-15, screenshots 14 and 15; the
   follow-up answer. Part of the selection editor, so it counts toward bar 9's allowance if another
   task half names it too. Recovered here; a reader who had not seen the earlier range could not
   tell the base.
2. Severity 2, behavior. With nothing picked, the right panel's Style tab is canvas-wide settings
   (background, lighting, labels), while a returning user who "colored people by a result from the
   Style tab" looks there for per-node coloring; nothing on it points to the Graph place's Style
   layers. Evidence: step 9, screenshot 09; the follow-up's least-sure moment. Not the selection
   editor; backlog.
3. Severity 1, behavior. The route through the Data place filter removes the 32 one-shift ties
   from the whole picture to get the count; nothing on the layer path offered the layer's own
   Advanced "Edges where ..." as the way to count on just the strong ties while keeping every tie
   drawn. Evidence: steps 2-8, screenshots 02-08; the top bar "31 of 63 edges" in screenshot 18.
4. Severity 1, wording. "Degree" is the only name for "number of people worked with"; the
   participant would translate it for a slide. Evidence: step 13, screenshot 14; end-of-session
   notes.
5. Severity 1, behavior. The new layer keeps the default name "Layer 1", which the key card shows as
   "Color: Layer 1"; nothing prompts a name. Evidence: screenshot 18; end-of-session notes.

No build defect needed a scripted repro: every problem is visible in the session's own screenshots
and end-state records.
