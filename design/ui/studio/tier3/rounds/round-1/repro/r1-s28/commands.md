# Repro: coloring a selection moves the drawing about 130 px right (build 758b8e8081)

Pointer. Run from design/ui/studio/tool with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3`.

1. `./with-browser.sh node real.mjs --start <this folder> empty` -> 01.png
2. `--step --click "Open a file" --upload sources.graphml` -> 02.png (the read-the-file page)
3. `--step --click "Load"` -> 03.png
4. `--step --click "Find nodes, edges, values" --type "company"` -> 04.png
5. `--step --click "kind is company (6)"` -> 05.png: 6 nodes selected, ringed.
6. `--step --click "role=tab:Style"` -> 06.png
7. `--step --click "Add to node fill"` -> 07.png: the Color line, `6366F1`. Ringed nodes at
   about (604,209), (795,268), (659,417), (788,535), (707,601), (945,574); the right cluster's
   edge nodes at x 1182 to 1188.
8. `--step --type "blue" --key Enter` -> 08.png
9. `--step --wait 2000` -> 09.png: "Color: 6 nodes" key at the top left; the same six nodes
   now at about (727,209), (936,268), (799,417), (921,535), (836,601), (1074,574): every node
   moved 120 to 140 px right with no input on the canvas, and the right cluster went under the
   inspector (one node left in view at x 1188).
10. `--end`

Committing the first color of a selection (which makes the layer and adds the key over the
drawing) re-frames the drawing. The study's rule (decided.md, 2026-10-19) is that an arriving
key never re-frames the drawing.
