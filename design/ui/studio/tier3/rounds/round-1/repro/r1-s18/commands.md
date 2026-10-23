# Repro: the inspector's F6 stop shows no focus (build 758b8e8081)

Keyboard only. Run from design/ui/studio/tool with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3`.

1. `./with-browser.sh node real.mjs --start <this folder> empty --keys` -> 01.png
2. `--step` with Tab 16 times, then Enter (the start page's Samples button) -> 02.png
3. `--step` with Tab 4 times, then `--type football` (the "Search samples" box) -> 03.png
4. `--step` with Tab 12 times, then Enter (the College football card) -> 04.png: the graph is open.
5. `--step --key F6` -> 05.png: a dark frame around the drawing.
6. `--step --key F6` -> 06.png: focus ring on the toolbar's Analyze button.
7. `--step --key F6` -> 07.png: a frame around the left panel's top ("Graph College football").
8. `--step --key F6` -> 08.png: no focus indicator anywhere on screen. This is the inspector's
   stop (a Tab from here lands on the inspector's first control, as the study session showed).
9. `--step --key F6` -> 09.png: back to the frame around the drawing.
10. `--end`

Every F6 stop but the inspector's draws a visible frame or ring; at the inspector's stop a
keyboard user cannot see where focus is (WCAG 2.4.7, Focus Visible).
