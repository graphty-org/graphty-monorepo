Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s27 (task T38 A, persona Dev)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (26 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T38 A asks for `volunteers.graphml` brought in as a new graph, its people and ties counted from
the screen, then every board and staff member blue and the volunteers left as they were.

- Counts: "24 people and 63 ties", read from the read-the-file page ("volunteers: 24 nodes, 63
  edges", `02.png`) and again from Overview after Load (Nodes 24, Edges 63, `03.png`). Both on
  screen before they were given.
- New graph: opened from the start page with "Open a file"; the top bar reads "volunteers", and
  the sample's runs and layers are gone from the tree (`work.json`), so nothing was merged.
- Last screenshot `12.png`: eight deeper blue nodes, sixteen in the starting indigo; "Layer 1"
  (8) in the list; Which nodes "8 of 24 nodes" with the chip "role: staff, board, 8 nodes"; Fill
  Color `0077BB`; the key "Color: Layer 1", "8 of 24 nodes".
- `styles.json`: the node half of "Layer 1" (`layer-1_2`) has one category card on `data.role`
  with `staff` and `board` and sets `node.color` `#0077BB`; it matches and paints 8 nodes. Its
  edge half matches everything and sets nothing. Everything still sets `#6366F1`.
- `key.json` drawn: `#0077bb` 8, `#6366f1` 16; edges `#a9a9a9` 63, unchanged.
- Color: `#0077BB` (hue about 202, in `colorWord`'s blue band; the picker's swatch is labeled
  "blue 0077BB"). Holds.
- Stack: one layer, one category card with two values ticked -- the rule, not a hand-picked
  selection: S.

## Steps and wrong turns

12 steps from `01.png` to `12.png` against the key's 12: "Open a file" with the file, Load, "+"
beside Style layers, Layer, Which nodes, "Add a condition", role, tick staff, tick board (one
tool call, two ticks), Fill "+", the color square ("Pick node color"), the "blue 0077BB" swatch.
The participant skipped Done (the Which nodes section collapsed on its own when Fill "+" was
pressed, keeping the card) and used the swatch instead of typing a color, which costs the one
step Done would have. Wrong turns: 0.

The wrap-up ("the 3 board + 5 staff members are blue; volunteers unchanged") matches the screen
and the style tree: no false "done".

## Problems

1. **The color a new Fill line offers is the color everything already is** (severity 2,
   behavior). Fill "+" adds the Color line holding `6366F1`, the starting color of every node, so
   accepting it changes nothing on screen; the participant had to notice and pick another.
   Evidence: step 10, `10.png`; transcript: "If I leave it, board/staff look exactly like
   volunteers and nobody could tell." Same as T38 A session r1-s25 (same half and model, so not
   confirmed by the criteria's rule).
2. **The starting indigo reads as blue** (severity 1, opinion). Asked to make some people blue,
   the participant first wondered whether everyone already was, and judged the picked `0077BB`
   "close to the default" for a printed figure. Evidence: step 3 (`03.png`) and wrap-up. The
   answer key records the starting color and its name "indigo".
3. **"Nodes that pass every condition" reads as AND only** (severity 1, wording). The heading
   made the participant doubt board OR staff was possible until the category card showed "Is any
   of". Evidence: step 6, `06.png`.
4. **Nothing names "color by a column"** (severity 1, wording). The participant looked for a
   Gephi-like "Appearance / Partition" and reached Layer only by trying the "+" beside "Style
   layers"; the menu's Layer and Folder were a guess. Evidence: steps 3-4, `03.png`, `04.png`.
5. **Which nodes closes without saying the condition was kept** (severity 1, behavior). Pressing
   Fill "+" without Done collapsed the section; the participant was unsure the choice survived
   until reading the chip. It did. Evidence: steps 10-12, `10.png` to `12.png`.

No build defect: every control did what the answer key says it does on this build, so no repro
was made.
