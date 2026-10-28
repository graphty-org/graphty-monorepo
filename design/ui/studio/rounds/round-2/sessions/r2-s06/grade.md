# Grade: session r2-s06 -- Mara, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because Mara used two tooltips to find
her way: "Analyze Shift+A" on the flask button (`04.png`) and "Size by attribute" on the
chain-link icon (`12.png`). Without them the run was clean.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `03.png`: opened from Samples; Overview shows 77 nodes and 254
   edges, matching the reference values.
2. **A ranking run finished.** `08.png`: Betweenness, run with its defaults. All 77 nodes were
   colored, the key reads "Color: Bridges, 0 to 1624" and a row "Bridges 77" appeared. Betweenness
   is a ranking that answers "who matters most". The maximum, 1624, is the exact unnormalized
   betweenness of the hub. The task does not ask for a top three, and none was read from the
   screen. Her "Valjean is 1624" came from her own NetworkX knowledge. It agrees with the final
   screen, where the name "Valjean" is drawn on the largest and darkest dot (`21.png`).
3. **Sizes bound to the result and visibly different.** `14.png`: a Size line reading "1 to 3"
   is bound to Bridges, and the key gains "Size: Bridges, 0 to 1624". The hub is clearly the
   largest dot, Fantine and Myriel are mid-sized, and most dots are small. Meaning: "Sizes and
   colors now both stand for betweenness ('Bridges'), 0 to 1624, the same thing twice." That is
   correct. "Bridges" is the on-screen name of this run, the same way "Influence" names PageRank.
4. **Names drawn.** `16.png`: a label line bound to `name` on the Bridges row, which covers all
   77 nodes. Real names are drawn, and the line reads "77 labels, 7 hidden to avoid overlap". She
   read the hidden count aloud and did not claim that every name was drawn.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (3612 x 3440, "For print" preset). It shows the
   same nodes in the same arrangement as `21.png`. The sizes are visibly different. The names
   drawn on screen are drawn in the image (soft, see problem 1). The key names both channels in
   use: "Size: Bridges" and "Color: Bridges", each running from 0 to 1624. `21.png` shows the toast
   "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 20 `real.mjs` steps after the start (`02.png` to `21.png`), two of them hovers. The
  success path is about 18. She opened Export from the main menu (`17.png`) rather than with
  Control+e. That is an equal route, not a detour.
- **Wrong turns:** 1. Opening "Advanced" on the Betweenness form (`07.png`) to look for
  normalization and weight settings changed nothing, and she then ran with defaults. Opening the
  Preset list (`19.png`) led to a deliberate choice of "For print", so it is not counted. The
  tooltips are counted as help, which is the reason for SD.
- **False "done":** none. She said "Part 1 done" (`03.png`), "Part 2 done, pending a look at the
  table" (`08.png`), "Part 3 done" (`14.png`), "Part 4 done", noting 7 hidden (`16.png`) and
  "Part 5 done for a document" (`21.png`, with the download present and passing the checklist).
  Each claim matches its screen. truth_on_screen: not applicable.
- **Activation:** no, by the strict rule. She chose Betweenness herself and ignored the
  "Start here" tag on PageRank, but she hovered for the Analyze tooltip first (`04.png`) and
  opened Advanced before running it (`07.png`).
- **Usage card:** declined ("No thanks", `02.png`). She drew no wrong belief from it. She noted
  "Local only" and, later, the line "nothing is uploaded".
- **Silent commits:** one. Adding Size (`11.png`) put a line with the fixed value 1 and left every
  dot unchanged. She did not take it for done ("A fixed size of 1 -- that's not a ranking").
- **Counts against the drawing:** none disagree. The 77 nodes, 254 edges, 0.08681 density and the
  1624 maximum all check against the reference.
- **Tool prints:** `ambiguous` on "Preset" (`19.png`, took the combobox) and on "Export"
  (`21.png`, took the dialog's button). Both reached the control a person would have pressed. They
  are not tool faults, and the session is not void.
- **Build-decided:** no. **Void:** no.

## Problems

"Confirmed" means the same finding was also seen in another round 2 session on this task (r2-s03,
r2-s04 or r2-s05).

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                            |
| --- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | build-defect | The "For print -- PNG, 4x, sharper" preset saves the 2x picture enlarged. It adds no detail, so node names are exactly as blurry at 4x as at 2x, while the key is drawn sharp. Mara picked it to get a print figure and found the names "smudges". Reproduced on every run: see below.                                    | Steps 20-21, `20.png`, `21.png`, `downloads/les-miserables_current-view.png`. Repro: `rounds/round-2/repro/r2-s06/` |
| 2   | 2        | behavior     | Names are tiny and soft on screen and in the export. Valjean's name is printed across his own large dot. Confirmed (r2-s05 problem 3).                                                                                                                                                                                    | Step 16 `16.png`, `downloads/les-miserables_current-view.png`                                                       |
| 3   | 2        | wording      | The method picked is "Betweenness", but its result is called "Bridges" everywhere afterward: the row, the key and the Style tab. She worked out that the two were the same only by checking the 1624 maximum against NetworkX by hand. The same rename is confirmed for PageRank becoming "Influence" (r2-s05 problem 6). | Steps 6-9, `06.png`, `08.png`, `09.png`                                                                             |
| 4   | 2        | wording      | The only Advanced setting, "Sample size 0", does not say that 0 means exact. Nothing says whether the result is normalized or uses edge weights. An expert user could not tell what was computed without checking it externally.                                                                                          | Step 7, `07.png`                                                                                                    |
| 5   | 2        | behavior     | Size has no row of its own. It is reached through "+" beside Shape, which gives a fixed "1" that changes nothing, and binding it needs a small chain-link icon she hovered to understand. Confirmed (r2-s05 problems 1 and 2).                                                                                            | Steps 9-14, `09.png`, `11.png`, `12.png`, `14.png`                                                                  |
| 6   | 2        | opinion      | Image export offers only PNG, JPEG and WebP: no SVG or PDF. For her, a journal figure needs vector output so labels can be fixed, and this is the reason she would "stay on Gephi". It would be severity 3, held one level down as opinion.                                                                               | Steps 18-20, `18.png`, `19.png`; verdict                                                                            |
| 7   | 1        | opinion      | The run colored the graph without being asked, and the orange ramp is so flat that only the hub stands out. Color and size then encode the same measure twice. The flat ramp is confirmed (r2-s05 problem 8).                                                                                                             | Step 8 `08.png`; step 14 `14.png`                                                                                   |
| 8   | 1        | behavior     | On screen the key box sits over the top-left corner of the drawing, against the Blacheville and Listolier group. In the export the key sits clear of the nodes. Confirmed (r2-s05 problem 10).                                                                                                                            | `16.png`, `21.png` against the downloaded PNG                                                                       |
| 9   | 1        | wording      | In Overview, the row label "Edges per ..." is cut off, and "Undirected, from the file: directed 0" is unclear and runs to the panel's edge.                                                                                                                                                                               | Step 3, `03.png`                                                                                                    |
| 10  | 1        | opinion      | Nothing names the layout that drew the picture or offers its parameters. She would need both before citing a figure.                                                                                                                                                                                                      | Step 3 `03.png`; verdict                                                                                            |

### Reproduction of problem 1

`rounds/round-2/repro/r2-s06/repro.sh` drives the same build through `real.mjs`. It opens Les
Miserables, puts names on Everything, exports once with the default ("To share -- PNG, 2x",
1806 x 1720) and once with "For print -- PNG, 4x, sharper" (3612 x 3440), and writes `run.log` and
`run/downloads/`. `crop.py` then compares the two files:

- The 2x file, enlarged to 4x with bicubic scaling, differs from the 4x file by a mean of 0.14 on
  a 0-255 scale. They are the same picture.
- Edge strength per native pixel falls from 4.65 (2x) to 2.21 (4x). That is what enlarging an
  image does. A true 4x render would hold it near 4.65.
- `labels-2x-left-4x-right.png` shows the same name ("Baroness T") from each file at the same
  size. It is equally blurred in both.

The preset's own words promise "sharper", so the control does not do what it says. That makes it
a build defect, confirmed at one participant by the scripted path.
