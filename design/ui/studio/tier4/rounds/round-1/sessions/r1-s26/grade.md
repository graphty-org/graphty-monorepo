Grade: S
False done: 0
Wrong turns: 0
Steps: 6 (path steps: 6)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 16 calls checked over 1 transcript)

# r1-s26 -- T68 B, Tom (returning user), build 79ed770292

## Result

The session started on `gauges-narrowed.txt`: both lists joined, with a Data source card that
leaves G12 out of the picture (top bar "11 of 12 nodes, 13 of 14 edges"). The last screenshot
(07.png) shows the Export window closed, the notice "Exported gauges_graph.graphml", and the
project unchanged (the card still on, "11 of 12", Autosave: saved).

`downloads/gauges_graph.graphml` (14,093 bytes) holds **12** `<node>` elements, G12 included, and
**14** `<edge>` elements, G09 -> G12 included. That is the answer key's success definition for B:
a `.graphml` file with 12 nodes and 14 edges. `downloads.jsonl` agrees (totalNodes 12, totalEdges
14; visible 11 and 13). `work.json` shows the project's layers, the filter step and both sources
the same at start and end, so the export changed nothing in the project.

The participant reported the file name, about 14 KB, that the browser put it in the downloads
folder, and that it should hold all 12 gauges and 14 edges because the Export scope read "All 12
nodes, 14 edges". All of that matches the file. S.

## Route against the success path

The path is Main menu > Export... > Format > GraphML > Export > Save anyway (6 steps). The
participant took exactly that route, in that order:

1. Main menu (02.png).
2. Export... (03.png: Data, Format CSV, Table Nodes, Scope "All 12").
3. Format (04.png: the format list).
4. GraphML (05.png: Scope "All 12 nodes, 14 edges", chips 12 and 14, the yellow line "Lost in
   GraphML: node visible not written").
5. Export (06.png: the orange box "Styles lost in GraphML", "Node visible not written",
   "Reopened: layers as layers", Save anyway / Choose another format).
6. Save anyway (07.png; the tool reported the saved file).

No wrong turns. The participant said done only after the file was saved and the screen said
"Exported gauges_graph.graphml": no false done. The first door was the main menu.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | -------- |
| 1 | 2 | build-defect | The export screen says "Lost in GraphML: node visible not written" and, after Export, "Node visible not written", but the saved file does write that state: G12 carries `graphty.style.node.hidden = true`. The warning that forced the extra Save anyway step names a loss that did not happen, in words the participant could not read ("not sure what that means"; "I don't know what 'node visible' ... means"). He went on only by guessing that it was about the look and not the gauges. A person who reads it the other way would cancel, or turn G12 back on first, with nothing to gain. Reproduced by script (below). | Steps 4 and 5, 05.png and 06.png; downloads/gauges_graph.graphml line 187; end-of-session notes; repro 02.png, 03.png and its file |
| 2 | 1 | wording | "Reopened: layers as layers" in the Styles lost box is not a sentence a reader can act on; the participant said he would have to ask someone what it meant. | Step 5, 06.png; end-of-session notes |
| 3 | 1 | behavior | The done notice gives only the file name ("Exported gauges_graph.graphml"), not where the file went; the participant assumed the downloads folder. The answer key already records this. | Step 6, 07.png; end-of-session notes |
| 4 | 1 | behavior | The top bar reads "11 of 12 nodes, 13 of 14 edges" while the Export scope reads "All 12 nodes, 14 edges", and nothing on the Export screen ties the two together; the participant checked the scope against the inspector's Full graph numbers to be sure the colleague got all 12. The scope was right and clear, so this cost a moment, not the task. | Steps 4 and 5, 05.png; end-of-session notes |
| 5 | 1 | accessibility | Under Format, a small green icon button with no visible label sits alone; its accessible name is "Advanced has configured values". Nothing on screen says what it is or that it holds settings. | 05.png (left of Scope, under Format); repro read-out (`button "Advanced has configured values" collapsed`) |

No severity 3 or 4: the file has every node and edge, and the scope said so before the export.

### Repro for problem 1

`design/ui/studio/tier4/rounds/round-1/repro/r1-s26/` (script `repro.sh` in
`design/ui/studio/tier4/rounds/round-1/repro/r1-s26-script/`), on the frozen build;
`real.mjs --start` takes its own browser slot through the gate:

```bash
REAL_DIST=<frozen build> node tool/real.mjs --start <repro> setup:<setups>/gauges-narrowed.txt
node tool/real.mjs --step <repro> --click "Main menu" --click "Export..." --click "Format" \
  --click "role=option:GraphML" --read                          # 02.png and the read-out
node tool/real.mjs --step <repro> --click "Export"              # 03.png: Styles lost in GraphML
node tool/real.mjs --step <repro> --click "Save anyway"         # 04.png, the saved file
node tool/real.mjs --end <repro>
```

The read-out gives `Node 12 Edge 14 Lost in GraphML: node visible not written`. The saved
`downloads/gauges_graph.graphml` has 12 nodes and 14 edges, declares
`<key id="d11" for="node" attr.name="graphty.style.node.hidden" attr.type="boolean"/>`, and writes
`<data key="d11">true</data>` on `<node id="G12">`: the state the warning calls "not written" is in
the file.
