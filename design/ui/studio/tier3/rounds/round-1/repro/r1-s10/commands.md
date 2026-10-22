# Repro: two clicks the color-and-layer route loses (build 758b8e8081)

Run from design/ui/studio/tool with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3`.

1. `./with-browser.sh node real.mjs --start <this folder> empty` -> 01.png
2. `--step --click "Open a file" --upload files/yeast-galactose.graphml` -> 02.png
3. `--step --click "Load"` -> 03.png
4. `--step --click "Find nodes, edges, values" --type "GAL"` -> 04.png: the find list is open and
   pushes Style layers down; its "+" sits at 276,705.
5. `--step --click-at 276,705` -> 05.png. The tool reports the target as button "Add a layer or a
   folder", but no menu opens: the click only closes the find list, Style layers jumps back to the
   top of the panel and the "+" is now at 276,122. The click is lost.
6. `--step --click "Add a layer or a folder" --click "role=menuitem:Layer" --key Enter` -> 06.png
7. `--step --click "Add to node fill"` -> 07.png
8. `--step --click "Pick node color"` -> 08.png: the Color popup, hue bar at y 710.
9. `--step --click-at 1146,710` -> 09.png. The tool reports slider "Hue". One click sets the
   color (DC63F1) and closes the popup, so the reader cannot adjust the hue or the square after
   the first click.
10. `--end`
