Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s26 (task T38 B, persona Ruth)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (33 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

Record note: this folder first held `styles.json`, `key.json`, `styles-steps.jsonl`,
`styles-start.json` and `transcript.md` from an earlier start of the same session that stopped at
`02.png` (written 14:11 to 14:12 UTC, before this run's start at 14:14:30). The participant's own
folder held this run's files; they were copied over the stale ones before grading, so every file
here now matches the run the screenshots show.

## Against the success definition

T38 B asks for `sources.graphml` brought in as a new graph, its sources and ties counted from the
screen, then every company and agency blue and the people left as they were.

- Counts: "24 sources (nodes) and 59 ties (edges)", read from the read-the-file page ("sources:
  24 nodes, 59 edges", "24 node rows and 59 edge rows read", `02.png`) and again from Values after
  Load (Nodes 24, Edges 59, `03.png`). Both on screen before they were given.
- New graph: opened from the start page; the top bar reads "sources", the only source is
  `sources.graphml` (`work.json`), nothing merged.
- Last screenshot `15.png`: ten deep blue nodes (all ten in view, one of them selected with its
  halo), fourteen in the starting indigo; the layer "Organizations" (10) in the list; the key
  "Color: Organizations", "10 of 24 nodes". The inspector shows the clicked node s15 "Zoning
  Board", kind agency.
- `styles.json`: the layer `layer-1_2` "Organizations" has one category card on `data.kind` with
  `company` and `agency` and sets `node.color` `#0000FF`; it matches and paints 10 nodes.
  Everything still sets `#6366F1` and paints the other 14. The layer's edge half sets nothing;
  edges drawn `#a9a9a9`, 59.
- `key.json` drawn: `#0000ff` 10, `#6366f1` 14.
- Stack: one layer, one category card with two values ticked -- the rule, which the key counts as
  S.

## Steps and wrong turns

13 steps from `01.png` to `13.png` (the first and finished styled result) against the key's 12:
"Open a file" with the file, Load, "+" beside Style layers, Layer, the layer name typed with Enter
(`Organizations`), Which nodes, "Add a condition", kind, tick company, tick agency, Done, Fill
"+", `blue` with Enter. The one extra step is the rename, which moves nothing away from the goal:
not a wrong turn. Two more steps (`14.png` hover, `15.png` click on a blue node) only checked the
result; neither changed the style.

The participant's wrap-up ("Companies (6) and agencies (4) are blue (0000FF) ... the 14 people
keep the default color") matches the screen and the style tree: no false "done".

## Problems

1. **Pointing at a node shows nothing** (severity 2, behavior). After styling, the participant
   hovered a blue node to learn who it was: the Hovered layer counted 1 but no name, tooltip or
   visible change appeared, so checking each of the ten would take a click on each. Evidence:
   step 14, `14.png`; the tool reported "tooltip: null". A loaded file starts with no layer that
   names the pointed-at node (the sample graph had one, `work-start.json`).
2. **Clicking a node moves and shrinks the whole drawing** (severity 1, behavior). The click on
   s15 slid the drawing left and made it smaller as the inspector opened; the participant
   "nervous that something else changed". All ten blue nodes stayed in view. The camera's glide
   to a pick is a recorded product decision, so this is graded as the reader's reaction, not a
   defect. Evidence: step 15, `14.png` to `15.png`.
3. **The starting indigo and blue are close** (severity 1, opinion). Fill "+" offered `6366F1`,
   the color every node already had, and the participant judged the typed blue against it "a
   weak contrast" for a graphics desk. Evidence: steps 12 and 13, `12.png`, `13.png`, wrap-up.
4. **"Nodes that pass every condition" reads as AND only** (severity 1, wording). The heading made
   the participant fear company OR agency could not be said, until the category card showed "Is
   any of". No wrong turn followed. Evidence: step 7, `07.png`.

No build defect: every control did what the answer key says it does on this build, so no repro
was made.
