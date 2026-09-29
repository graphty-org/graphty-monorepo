# First-click test: Chris, ML engineer (recommendation systems)

Chris lives in notebooks and VS Code. He uses the keyboard a lot, skims prose and reads numbers.
He looked at each screen image once and named the first thing he would click. Confidence is
on a scale of 1 (guess) to 7 (certain). Each answer was scored against the target only after
he had given it, and no answer was changed.

| Prompt | Screen | First click | Confidence | Correct |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, nothing selected | Main menu button (top left), expecting File > Export as PNG/SVG | 5 | yes |
| Repeat the bridges calculation exactly | Les Miserables, nothing selected | "Bridges -- done" row under Results | 6 | yes |
| Rank the characters a second way | Les Miserables, nothing selected | The + on Results | 5 | yes |
| Groups 2 and 3 look alike; recolor one | Les Miserables, nothing selected | Orange swatch for group 2 in the legend | 5 | yes |
| Get back a selection lost to a stray click | Les Miserables, nothing selected | Cmd+Z (Undo), no click | 5 | no |
| What is painting Valjean this color | Les Miserables, Valjean selected | "Group color" row under Appearance | 6 | yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" row under Results | 6 | yes |
| Bring in next month's transfers file | Transfers | The file chip "transfers-2026..." under the project name | 4 | no |
| Accounts that take in far more than they send | Transfers | The + on Results | 4 | yes |
| Cheapest route where a bigger transfer costs more | Transfers | "Change..." in the "amount not used yet" line | 5 | no |
| Has anything left the computer | Transfers | "Nothing has been sent from this project" under the project name | 7 | yes |
| Ribosome and Spliceosome look alike; recolor one | Protein interactions | Spliceosome swatch in the legend | 6 | yes |
| Bring in the lab's color and size file | Protein interactions | The + on Style stack | 3 | no |
| How Ribosome differs from the rest | Protein interactions | "Ribosome" in the legend, hoping it selects the module and the statistics then describe it | 4 | yes |

Score: 10 of 14.

## In his words

- **Picture for the paper:** "No export icon anywhere. So it's the hamburger, and I'd want SVG,
  not a screenshot at screen resolution."
- **Repeating bridges:** "Bridges is the only thing under Results and it says done. That's the
  run. I'd click it and expect the parameters and whether weights were used."
- **Second ranking:** "Plus next to Results. I'd want to see the list of algorithms with a
  one-line definition each."
- **Recoloring groups:** "Group 3 isn't even in the legend, it's hidden under '6 more'. I'd click
  the orange swatch for 2 and hope it opens a color picker. It might just select the group."
- **Lost selection:** "Cmd+Z. Every tool I use undoes a selection change with Cmd+Z. If that
  doesn't work, I'd assume it's gone. I wouldn't think to look for a 'previous selection' in a
  menu."
- **What paints Valjean:** "Appearance lists Group color, and he's orange, the group 2 color.
  Size is degree, so that isn't it. Clearly the group color row. This is good, I can see the
  stack for the one node."
- **Where betweenness comes from:** "The Results row. Also, 0.57 -- normalized? Those are the
  things I need from it."
- **Next month's file:** "The file chip is the source. I'd click it expecting 'replace file'.
  If this project's styles survive a new file, I'd want that said on the chip."
- **Money in versus money out:** "No in-strength or out-strength column. Plus on Results and
  look for weighted in-degree minus out-degree. I'm not confident it exists."
- **Cheapest route:** "The panel literally says 'amount not used yet'. First I make amount the
  weight -- Change... -- then I'd go find shortest path. A bigger amount costing more is the
  normal way round, so plain weighted Dijkstra is fine."
- **Has anything left the computer:** "It's right there, with a lock icon. That line is the
  thing that gets this past privacy review."
- **Ribosome and Spliceosome:** "Light blue and dark blue, yes. Click the Spliceosome swatch."
- **Lab's style file:** "It's a style file, so I'd go to Style stack and hit plus, looking for
  'import layers'. Honestly a guess -- Data didn't occur to me because this isn't data."
- **How Ribosome differs:** "Click Ribosome in the legend, select the module, and hope the
  statistics panel switches to 'selection versus rest' -- degree, density, the numbers. If it
  only highlights the nodes, that tells me nothing I can't see."
