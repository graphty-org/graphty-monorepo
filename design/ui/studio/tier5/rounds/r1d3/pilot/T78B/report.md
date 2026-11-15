# T78 B pilot on build c3100058ab (targeted re-walk)

The study build is c3100058ab (`.study-builds/tier5-r1d3-c3100058ab`). The walk starts from the
task's real start (`rounds/tier-5/setups/gauges-clean.txt`: gauges.csv joined with flows.csv,
station as the label). Screenshots stay out of git, under the main checkout's
`tmp/design-studio/tier5/r1d3/pilot/T78B/<walk>/`.

This pass walks only the pointer success path and the routes the last fixes touched that belong to
T78 B. None of the touched routes asked for this pass belongs to T78 B: each names another task
(T70, T72 or T79) and another start, and is walked in that task's own pilot. The detours and the
full keyboard walk were not asked for this pass; their last reading stands.

## Result

Reached. The answer key's value holds: 7 of 11 gauges in orange (G02, G03, G04, G05, G07, G08,
G11). No crash, no script error, nothing that blocks the task or spoils its grade. The data stayed
the task's own the whole way: 11 nodes in the table, "11 nodes" on the Nodes tab, Everything 11.

## Walks

### success -- the pointer success path

Replayed the previous pass's 18 steps; every check point matched. + > Layer; Which nodes; type
"degree"; Enter; 2; Enter; Advanced; Edges where ...; Edge value...; `km`; the "km to" box,
Ctrl+A, 2.9, Enter; Done; Add to node fill; FF8C00, Enter.

- Before Done: Which nodes "Degree min 2 Edges", 7 of 11, No match 4; Advanced's right reads
  "Edges: km max 2.9" (tmp/design-studio/tier5/r1d3/pilot/T78B/success/13.png).
- After the fill: key "Color: Layer 1, 7 of 11 nodes"; Layer 1's row 7; Which nodes "7 of 11"
  (tmp/design-studio/tier5/r1d3/pilot/T78B/success/16.png).
- Field keys in the "km to" box: Enter takes the value; Tab keeps it; Escape keeps the typed value
  (2.5) and closes Advanced, as decided.md settles ("Esc is Done", "Escape closes an open Advanced")
  (tmp/design-studio/tier5/r1d3/pilot/T78B/success/12.png). Retyping 2.9 restores 7 of 11.
- Fill hex box: a new value then Escape puts back FF8C00; Tab keeps it
  (tmp/design-studio/tier5/r1d3/pilot/T78B/success/17.png to 19.png).

## Mismatches with the answer key

None.

## Defects

None that crash, block or spoil the grade.
