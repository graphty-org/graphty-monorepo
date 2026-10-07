# Pilot of the "what did I get?" task on the rebuilt app

The task asks a first-time user to open the Les Miserables sample and say how many characters and
connections it has, whether every character can be reached from every other, and what facts are
recorded about each character and each connection. Walked on graphty@0.8.53, build b7590f8de22b,
commit b7590f8de, at `/?next`, with `tool/real.mjs`. No code was changed.

## Result

**The end state is reached in three steps, on the answer key's path.** Every answer is on screen
by `03.png`, and all four match the key.

| Question | What the screen shows | Screenshot |
|---|---|---|
| How many characters | Values > Overview: Nodes 77 | `02.png` |
| How many connections | Values > Overview: Edges 254 | `02.png` |
| Can every character reach every other | Values > Overview: Components 1 | `02.png` |
| Facts per character and per connection | Data > Attributes: Nodes `id`, `name`; Edges `shared_chapters` | `03.png` |

No script error, console error or failed request was printed.

## Steps walked

1. `--start empty` -- the start screen with the usage card; Les Miserables is listed under
   Samples with "77 characters" (`01.png`).
2. `--click "No thanks" --click "Les Miserables"` -- the graph is drawn; the right panel opens on
   Graph > Values > Overview: Nodes 77, Edges 254, Density 0.08681, Components 1 (`02.png`).
3. `--click "Data"` -- the left panel shows Sources (77 nodes, 254 edges) and Attributes: Nodes
   `id`, `name`; Edges `shared_chapters` (`03.png`).
4. `--key Shift+T` -- the alternative path: the table opens below the canvas with Nodes and Edges
   tabs, "77 nodes", columns `Id` and `name` (`04.png`).

## Blockers

None blocks the end state. Remaining findings, most important first:

### 1. The direction line overflows the Overview -- app defect

- **Evidence:** `02.png` to `04.png`: the line under Edges reads "Undirected, from the file:
  directed 0", is indented differently from the rows around it, and runs to the panel's right
  edge, past the value column. The same defect was recorded on the previous build; it is not
  fixed.
- **Why it matters:** "directed 0" is a raw file value; a reader looking for whether connections
  have a direction gets a developer's word and a zero.

### 2. Truncated labels in the panels -- app defect

- **Evidence:** `02.png`: "Edges per ..." in the Overview; `03.png`: the Sources rows read
  "Les Mis...", "Node t...", "Ed...", while their counts are shown in full beside them.
- **Why it matters:** none of the four answers depends on these, but a participant reading
  Sources to learn what was loaded cannot tell what "Node t..." and "Ed..." are without
  hovering.

### 3. The words "characters" and "connections" are not on screen -- task wording (expected)

- **Evidence:** the start card says "77 characters" (`01.png`), but the Overview and Attributes
  say Nodes and Edges (`02.png`, `03.png`). A participant has to map "connections" to Edges.
- **Why it matters:** this is the deliberate design of the task (the task notes keep
  "connections" as the everyday word), so it is a thing to watch in sessions, not a change to
  make.

### 4. The table names the id column "Id", Attributes names it "id" -- app defect (minor)

- **Evidence:** `04.png` column header "Id"; `03.png` attribute "id".
- **Why it matters:** a participant who reads facts off the table may report "Id" as a different
  fact from "id". Either spelling scores as the key accepts `id`.

### Tool and answer key

Nothing found. Every step printed only its screenshot path, and the key's path and counts (77,
254, one component, `id`, `name`, `shared_chapters`) are what the build shows.
