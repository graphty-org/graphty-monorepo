# Repro: "Samples" scrolls to the library but leaves focus on the button (build 758b8e8081)

Keyboard only. Run from design/ui/studio/tool with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3`.

1. `./with-browser.sh node real.mjs --start <this folder> empty --keys` -> 01.png: the start page.
2. `--step --key Tab --key Tab` -> 02.png: focus on the top bar's "Samples".
3. `--step --key Enter` -> 03.png: the page scrolls down to "Sample library"; no focus ring on
   the library's search box or anywhere in it.
4. `--step --type les` -> exits 1: "nothing that takes text has focus (focus is on a "Samples");
   typed nothing, not "les"" (04.png unchanged).
5. `--step --key Tab` -> 05.png: focus goes to "Docs" in the top bar, the next control after the
   button that was pressed, not into the library.
6. `--end`

The start card's "Samples" button does the same (the session's steps 10 to 13): the page scrolls
to the library and focus stays on the button, now off screen, so the next Tab scrolls the page
back up to the start card and the reader sees the library "close". A control that moves the view
to a section should move focus into it (its search box), so typing and Tab start there.
