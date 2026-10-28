# Pilot: T15, a whole first session (round 3 build)

Build under study: commit b7590f8de (graphty 0.8.53), the production build in `graphty/dist`,
opened at `/?next`. Both versions of the task were walked with `tool/real.mjs` from an empty start:
`A/` on the Les Miserables sample, `B/` on `friends.csv`. Every screenshot was looked at. No tool
step printed a script error, a `console.error` or a failed request.

**Result: the end state is reached on both datasets, with all five parts in one sitting and none
undone by a later step.** The round 3 route in `answers.md` holds as written, with one step fewer
than the round 2 route (no "Size by attribute" click).

## The walk (same commands on A and B except where noted)

| Step    | Command                                                                                               | Screen | What it showed                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| card    | `--click "No thanks"`                                                                                 | 02     | Card gone; "Usage data stays off. Change this in Settings > Privacy"                                                                                               |
| 1 open  | A `--click "Open the Les Miserables sample"`; B `--click "Open project or file" --upload friends.csv` | 03     | A: 77 nodes, 254 edges. B: 20 nodes, 41 edges, Directed                                                                                                            |
| 2 rank  | `--key Shift+A --type PageRank`                                                                       | 04     | One match, "PageRank -- Start here"                                                                                                                                |
|         | `--click PageRank`                                                                                    | 05     | Form with Run                                                                                                                                                      |
|         | `--click Run`                                                                                         | 06     | Outline row "PageRank 77" (B: 20); drawing colored; key "Color: PageRank" 0.003299 to 0.07543 (B: 0.04382 to 0.06608)                                              |
| 3 sizes | `--click PageRank` (the run row)                                                                      | 07     | Inspector opens on Style; Color line already "PageRank"                                                                                                            |
|         | `--click "Add to Shape"`                                                                              | 08     | Menu: Size, Shape                                                                                                                                                  |
|         | `--click Size`                                                                                        | 09     | "Size by attribute" list opens at once: Fixed size; PageRank, PageRank rank, PageRank percentile; id and name greyed ("Cannot be used: Holds groups, not amounts") |
|         | `--click "role=option:PageRank"`                                                                      | 10     | Size reads "1 to 3"; key gains "Size: PageRank" with the same range; dots visibly differ                                                                           |
| 4 names | `--click Everything`                                                                                  | 11     | Everything's Style tab                                                                                                                                             |
|         | `--click "Add label line"`                                                                            | 12     | "Label" list: A id, name, PageRank columns; B id, PageRank columns                                                                                                 |
|         | A `--click "role=option:name"`; B `--click "role=option:id"`                                          | 13     | Names drawn. A: "77 labels, 6 hidden" with an unchecked "Show all labels". B: "20 labels, 0 hidden"                                                                |
|         | A `--click "Show all labels"`                                                                         | A/14   | Statement "77 labels"; every name drawn                                                                                                                            |
|         | B `--click PageRank --click "role=tab:Values"`                                                        | B/14   | Top 10 Farah 0.06608, Ava 0.06423, Hana 0.05883 (matches the answer key)                                                                                           |
| 5 image | `--key Control+e`                                                                                     | 15     | Export dialog, Image chosen, preview with the key                                                                                                                  |
|         | `--click "role=button:Export"`                                                                        | 16     | Toast "Exported les-miserables_current-view.png" (B: friends_current-view.png); 1806 x 1720 each, in `downloads/`                                                  |

Steps: 15 tool commands on A (including the optional "Show all labels"), 13 on B to the image.

## Picture checklist

Both images pass: the same nodes and arrangement as the final screen; sizes visibly different; the
names drawn on screen are drawn in the image (A all 77, after "Show all labels"); a key naming both
channels in use, "Size: PageRank" and "Color: PageRank", each with its range. The key lists no
names, as intended.

## Meaning

The key reads "Size: PageRank" and "Color: PageRank" with the same range on both, and the outline,
inspector header and Values all say "PageRank". A bigger and darker dot means a higher PageRank.

## Remaining blockers and findings

None of these stops the end state. They are what a participant could trip on.

1. **element-defect -- the drawing's size order can contradict the values.** On B the top two
   by PageRank are Farah (0.06608, the largest size) and Ava (0.06423), but Ava's dot is drawn
   clearly larger than Farah's on screen (B/10, B/16) and in the exported image, because the 3D
   view's perspective makes nearer dots look bigger. Farah's dot is also partly hidden behind
   Chloe's. A participant who answers "the biggest dot is the one that matters most" names Ava
   and is wrong, from a screen that looks right. The drawing is graphty-element's; whether the
   fix is a size encoding that survives perspective or the graphty app opening a sized drawing
   in 2D is an open choice.
2. **element-defect -- label text in the exported image is soft.** At 2x the key's text is sharp
   but the node names are visibly blurred, as if drawn at screen resolution and scaled up
   (`A/downloads/les-miserables_current-view.png`, center). The smallest names ("Mother
   Plutarch", "Anzelma") are hard to read in the image. The checklist still passes.
3. **app-defect (cosmetic) -- Overview row overflows.** On Les Miserables the Graph Overview
   shows "Undirected, from the file: directed 0" running past the panel's right edge, and the next
   row's label is cut to "Edges per ..." (A/03). On friends.csv the same rows fit (B/03).
4. **app observation -- Everything's Style tab shows base values the drawing does not show.**
   After sizing, Everything's Style tab still reads Color 6366F1 (blue) and Size 1 (A/11, B/11)
   while every dot is orange and sized by the PageRank row above it. A participant who goes to
   Everything to add names may believe the sizing was lost. Not a defect in the layering; worth
   watching in sessions.
5. **tool-defect (minor) -- `--click "Show all labels"` prints `ambiguous`.** It matches the
   checkbox and its own label element as two controls, then takes the first, which is the right
   one (A/14). One switch should resolve as one control.

## Not covered

The keyboard and screen-reader paths were not walked here; the screen-reader check in
`answers.md` still needs the round 3 wording ("Size: PageRank", "77 labels, 6 hidden").
