# Session r1-s07b -- Ruth, task T15B (friends.csv)

Participant: Ruth, a newspaper reporter, first time with this program. Fast in spreadsheets,
impatient with jargon, wants every number to be explainable to an editor.

Tool: `node tool/real.mjs` from `design/ui/studio`, session folder
`rounds/round-1/sessions/r1-s07b`. Every screenshot is in that folder.

## Steps

1. `--start <S> empty` -> 01.png. Start page: Open project or file, New from data, samples on the
   right, a data-sharing notice at the bottom.
   Think-aloud: "I have my own file. I'll say no to the usage data and open it."

2. `--step <S> --click "No thanks" --click "Open project or file..." --upload friends.csv` -> 02.png.
   The drawing appears at once: 20 blue balls, arrows between them. Right panel: Nodes 20,
   Edges 41, Directed, 1 component.
   Think-aloud: "20 people, 41 ties -- matches the sheet, nothing dropped. On screen: part one
   done." Noticed the left-panel hint "Analyze (Shift+A) to add results here".

3. `--step <S> --key Shift+A` -> 03.png. A list of analyses under "Rank nodes and edges": Degree,
   Betweenness, Closeness, PageRank (badge "Start here"), Eigenvector, Katz, HITS...
   Think-aloud: "A lot of jargon. But one says 'Start here', so I'll trust it."
   Hesitation: I would not have known which one means "matters most" without that badge.

4. `--step <S> --click-at 536,600` (PageRank) -> 04.png. A small form: "Damping factor 0.85",
   "Under a second", Run.
   Think-aloud: "Damping factor? No idea. Leave it."

5. `--step <S> --click "Run"` -> 05.png. Balls turn orange to dark brown. A key top-left:
   "Color: Influence 0.04382 - 0.06608". Left panel gains "Influence 20".
   Think-aloud: "Darker means more influence. Part two done." Hesitation: I chose "PageRank" and
   the result is called "Influence" -- I assume they are the same thing, but I'd have to explain
   that to my editor.

6. `--step <S> --click "Influence"` -> 06.png. Right panel: Values histogram, a Top 10 list (Farah
   0.06608, Ava, Hana, Ivan, Gus...), "Made with: Influence, damping factor 0.85".
   Think-aloud: "A ranked list I can check. Farah is first. Good." Still no plain explanation of
   what 0.066 counts.

7. `--step <S> --click "Style"` -> 07.png. Rows: Fill, Color (Influence), Shape, Effects, Label,
   Tooltip, each with a plus.
   Think-aloud: "No 'Size' row. Maybe it's under Shape."

8. `--step <S> --click-at 1419,226` (plus by Shape) -> 08.png. Menu: Size, Shape.
   Think-aloud: "There it is."

9. `--step <S> --click-at 1340,262` (Size) -> 09.png. A Size row with "1" and a chain-link icon.
   Nothing changed on the drawing. Hesitation: a fixed number, not my influence.

10. `--step <S> --hover-at 1381,256` -> tooltip "Size by attribute".

11. `--step <S> --click-at 1381,256` -> 11.png. A picker: Influence, Influence rank, Influence
    percentile; "id" greyed out as "holds groups, not amounts".

12. `--step <S> --click-at 1193,324` (Influence) -> 12.png. Size reads "1 to 3"; Ava and Farah are
    now big dark balls. The key now shows "Size: Influence" above "Color: Influence".
    Think-aloud: "Bigger and darker both mean more influence. Part three done."

13. `--step <S> --click-at 1419,324` (plus by Label) -> 13.png. Picker: "id", and the three
    Influence values. Hesitation: "No 'name'. In my sheet the names ARE the ids, I think."

14. `--step <S> --click-at 1106,422` (id) -> 14.png. Every ball gets its name above it. Under the
    Label row: "20 labels, 0 hidden to avoid overlap".
    Think-aloud: "Everyone's named. Part four done." But Chloe's name sits over Farah's ball, and
    Eli and Dev crowd each other at the bottom.

15. `--step <S> --click-at 24,20` (main menu) -> 15.png. New project, Open, Save, Export...

16. `--step <S> --click "Export..."` -> 16.png. Export dialog, Image: preset "To share -- PNG, 2x",
    view "Current view", background, a preview with the key visible in its corner.

17. `--step <S> --click "Export"` -> 17.png; saved `downloads/friends_current-view.png`,
    1806 x 1720. I opened it: names, sizes, colors and the key (Size: Influence, Color:
    Influence, 0.04382 to 0.06608) all there.
    Think-aloud: "That's a picture I could paste. Done."

18. `--end <S>`.

No script errors or failed requests were printed during the session.

## What the sizes and colors stand for (in my words)

Both the size and the darkness of a ball show "Influence", which the program worked out with
the method it called PageRank: bigger and darker = more influential in the club. Farah and Ava
are the biggest. The numbers run 0.044 to 0.066; I could not say what one unit means.

## Debrief, in character

- **Finished?** Yes, all five parts: on screen, influence worked out, bigger dots, names, a PNG
  with its key.
- **Difficulty:** 3 out of 7.
- **What confused me:**
    - The list of analyses is all jargon; only the "Start here" badge told me which to pick.
    - I picked "PageRank" and everything after calls it "Influence". Is that the same thing?
    - Size was hidden under "Shape", and adding it gave a fixed "1" -- I had to find the small
      chain-link icon to tie it to Influence.
    - For names I was offered "id", not "name". It worked because my ids are names.
    - The numbers (0.04382 to 0.06608) mean nothing to me; I could not explain them to an editor.
    - On the exported picture Chloe's label sits on Farah's ball, and Eli and Dev overlap, even
      though the panel said nothing was hidden for overlap.
