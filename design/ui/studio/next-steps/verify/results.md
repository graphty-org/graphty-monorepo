# Re-measure before the tier 2 study: results

Measured 2026-10-07 on one build: commit `b40f264a9`, build stamp `b40f264a9b6f graphty@0.8.55`,
served at `https://dev.ato.ms:9366/?next` (stamp confirmed in the served page). Study sessions
served a frozen copy of that same build (`REAL_DIST`). Logs are in `logs/`; the images named
below are beside this file.

Two defects were found and fixed before measuring:

- The element source at the "frame a kept angle by the box's corners" commit did not compile:
  `fitToGraph` used the free area before declaring it and `topView` had lost its 3D half. Builds
  had been made from an uncommitted working copy. Fixed in `ebb2cfcba`.
- compact-mantine's `touchDrag` test command left Chromium's touch emulation on, so every later
  test file matched `(hover: none)` and the tree's hover-only toggles showed at rest; the figma
  tree test failed whenever it ran after the color test. Fixed in `b40f264a9`.

## Summary

| Check | Result | Evidence |
|---|---|---|
| Every unit's own tests (element node, element browser, compact-mantine, graphty) | pass | `logs/element-node.log`, `logs/element-browser.log`, `logs/compact-mantine.log`, `logs/graphty.log` |
| `bars.mjs`, dark | pass, exit 0; axe 0 violations on all 13 screens | `logs/bars-dark.log` |
| `bars.mjs`, light | pass, exit 0; axe 0 violations on all 13 screens | `logs/bars-light.log` |
| App words at rest (bar 9, at most 50) | pass: 41 | `logs/bars-dark.log` |
| `real.mjs --prove` | pass, no FAIL ("every check passed") | `logs/prove.log` |
| Focus after a control goes away | pass on every named path (see below) | `logs/repro-r3-s*.log`, `logs/focus-drawing-dialog.log` |
| Gray text contrast | pass (unit test and both bars runs) | `logs/compact-mantine.log`, bars logs |
| Layout refusals in the app's words | pass | `logs/layout-refusal.log` |
| Export warnings in the app's words | pass | `logs/export-data.log` |
| Sharp names, real 4x | pass | `medici-crop.png` |
| "Whole graph" keeps the angle | pass | `compare-current-whole.png`, `logs/repro-r3-s01.log` |
| No selection ring in the picture | pass | `valjean-crop.png`, `logs/repro-r3-s02.log` |
| The key never covers a node | pass | `logs/repro-r3-s27.log`, `compare-current-whole.png` |
| 3D size order | pass: 0 of 190 pairs inverted at both angles and in 2D | `logs/trace-3d-size.log`, `friends-pagerank-3d-export.png` |
| Force re-applied settles | element test pass; app at spring length 80: still a cloud | `logs/element-browser.log`, `force-spring-80.png` |
| Sources row opens its table | pass | `logs/repro-r3-s53.log` |

## Notes per check

**Focus.** Each named path lands on its target: a sample opened by keyboard, and a recent project
opened with Enter, land on the drawing (`Canvas "Graph drawing"`); "No thanks" on the usage card
lands on "Open project or file..."; a refused file keeps focus on "Open project or file..." with
the reason announced; Escape from the shortcuts dialog returns to its opener, the drawing
included (`logs/focus-drawing-dialog.log`). The round 3 scripts still print some
`focus: nothing (the page itself)` lines. Every one is the page just loaded or reopened, or a Tab
or Shift+Tab past the first or last control: those scripts count Tab presses from the page body,
and focus now starts somewhere else, so their counts overrun the page. None follows a control
removing itself. In r3-s52 the refusal alert prints twice for one refused file; it was not a
check here and is not traced.

**Layout refusals.** Les Miserables, Layout menu: "No crossings" reads "Some edges of this graph
must cross, so it cannot be drawn without crossings"; the group layouts read "Needs groups: run
Louvain in Analyze first". None of "G is not planar", "results.", "dim:" or a backquote is on
screen. The Force method's description still says "with `dim: 2`": layout descriptions are still
the element's English, which no unit in this round covered.

**Export warnings.** Les Miserables, Louvain, Export > Data > CSV: five plain sentences under "CSV
cannot hold everything"; no code, backquote or field path.

**4x.** Florentine families, all names shown, Medici selected, Export at 4x: the file is 3612 x
3440 (4 times the 903 x 860 canvas), and "Medici" at 1:1 has clean glyph edges. No key was drawn
in this picture, so the side-by-side comparison with the key's text was not made.

**Selection ring.** Medici (Florentine) and Valjean (Les Miserables) are exported with no ring and
stay selected on screen afterward.

**Whole graph and key.** Les Miserables after Louvain, orbited: the "Whole graph" picture shows
the same angle as "Current view", every node inside, and no node under the key. On screen the
drawing sits below the key card. In r3-s27 the point where the key sits is the card, and Pazzi
is drawn below it.

**Force.** The element's re-apply test passes, and the defaults it publishes are now the ones
the engine runs. The round 2 repro sets spring length 80 (8 times the default 10): frames 12 and
13 are pixel-identical and show an even cloud, not groups. That fails the unit's app check as
written. The engine is not frozen: it has settled where ngraph's fixed repulsion puts it at
that spring length. Whether the app should bound the field is still an open app decision.

**Sources row.** friends.csv dropped, Data > Sources, click on the "friends.csv" row: the table
opens on Edges, 41 edges. The repro's Enter step ran with the table already open, so the
keyboard path rests on the graphty unit test.
