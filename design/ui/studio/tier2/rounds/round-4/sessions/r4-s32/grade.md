# Grade: session r4-s32 -- Dev (returning student), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`15.png`) holds the key's answer: the Shortest path run
open on its Values, Summary "Path 5 nodes, 4 edges" and "Total km 7.5", Nodes in order Trailhead
1, Creek 2, Meadow 3, Ridge 4, Summit 5, and Made with From Trailhead, To Summit, Weight
"km (farther)". Dev named the same route and total, and pointed to two places that say the
kilometers were used: "Loaded weight km (farther)" on the graph's Overview (`09.png`) and the
Weight row under Made with (`15.png`). The key accepts either. The weight was set at load, on the
import page, before the run, which is what the prompt's "every calculation" asks for. The wrong
answer (Trailhead, Pine Fork, Summit, 9 km, `weight-not-read`) was not given; Dev checked it by
hand against the file and rejected it as longer.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty. Tool commit `435e878a1d4c`, no uncommitted changes.
`leaks.json`: 33 calls, no leaks.

## The answer against the key

- **Route (right).** Trailhead, Creek, Meadow, Ridge, Summit (`15.png`, Nodes in order).
- **Total (right).** "Total km 7.5" (`15.png`).
- **Where the program says it used the kilometers (right).** "Loaded weight km (farther)"
  (`09.png`) and Made with "Weight km (farther)" (`15.png`).
- **Direction.** Dev chose "Undirected" on the import page (the persona's course tutorial says to
  set trails as undirected); the Overview reads "Direction Undirected, set in the project"
  (`09.png`). The key's walk keeps "As the file says" (Directed). On this file the answer is the
  same either way: no route using an edge backwards is shorter than 7.5 km (the next shortest
  undirected candidates are Trailhead, Pine Fork, Meadow, Ridge, Summit at 8 km and Trailhead,
  Lookout, Ridge, Summit at 8.5 km). Not a wrong turn.
- **Work kept.** `work.json`: start empty; end one Shortest path run, the node and edge default
  layers and the two route layers, one source trails.csv. Nothing gone.

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). Counted the key's way
  (each type-then-pick of From and To as one), about 13 against the round 2 route's 10: one
  refused click (below), one extra step to open Direction, and the Analyze button plus its filter
  plus a click in place of the `p` key (3 for 1). Well within bar 11's 2x.
- **Route to the weight:** the role box under "km", Weight, Higher means Farther, all on the
  import page, before Load. The summary line "Weight: none (each edge counts 1)" (`04.png`) is
  what sent Dev to the km column, by Dev's own account.
- **Route to the run:** Analyze in the toolbar, typed "shortest" in its filter, picked "Shortest
  path"; the form's Weight already read "km (farther, loaded)" (`12.png`).
- **Wrong turns:** 0. Step 4 (`--click "km"`) was refused by the tool as ambiguous (the column
  header and the role box both match "km") and changed nothing on screen; it is an addressing
  slip of the tool, not a move in the app.
- **False "done":** none. Every end claim (route, 7.5 km, both "km (farther)" rows, "Direction
  Undirected") is on `09.png` or `15.png`. truth-on-screen: holds.
- **Scripted exit:** not applicable.
- **Wording echo:** prompt B's "shortest walk" shares "shortest" with the word Dev typed in the
  Analyze filter and with "Shortest path". Recorded as tasks.md asks; it counts only if a T20 A
  session fails where this one passed. Dev chose Farther before the "such as a longer distance or
  travel time" line appeared, so that line could not lead the choice.

## Problems

1. **Severity 2 -- the route cannot be read from the drawing.** No junction names are drawn
   (`09.png`, `15.png`), and Creek and Summit, both on the route, overlap at about 755,645 and
   790,636 (`15.png`). Dev: "I could only tell which black dots were which from the list on the
   right, not from the picture." The answer key lists this as a known trait of the build. It did
   not cost the task here because Nodes in order is on the same screen.
2. **Severity 1 -- nothing on the import page says how "As the file says" treats a plain from/to
   CSV.** Dev set Undirected from the tutorial and said "nothing on the page told me whether trails
   would be treated as one-way, so I'm not sure it mattered" (`07.png`, `08.png`). Harmless on
   this file; on a file where direction changes the shortest route, a reader could not tell which
   was used until the Overview after Load. Opinion-level, one participant.
3. **Severity 0 -- the column header and its role box share the name "km".** The tool's text
   click matched both and was refused (`04.png`, unchanged from `03.png`). The box's accessible
   name "Role of km" is distinct, so this is a tool-addressing note, not a defect a person meets.

Ease rating 6 of 7 (not used for the grade).
