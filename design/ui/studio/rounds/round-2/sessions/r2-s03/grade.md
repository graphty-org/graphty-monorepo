# Grade: session r2-s03 -- Ruth, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because Ruth had to guess that size
lived under "+" beside Shape, and needed a tooltip ("Size by attribute", `12.png`) to learn how
to size the dots by a value.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `03.png`: opened from Samples; the Overview reads Nodes 77, Edges
   254, matching the reference values.
2. **A ranking run finished.** `08.png`: Degree (shown on screen as "Connections") colored all 77
   nodes, with a key "Color: Connections, 1 to 36" and a row "Connections 77". Degree is a
   ranking measure under the task's success definition, and its range matches the reference
   (Valjean 36).
3. **Sizes bound to the result and visibly different.** `14.png` and `20.png`: a Size line
   ("1 to 3") bound to Connections and "Size: Connections 1 to 36" in the key; the dots clearly
   differ, the largest and darkest in the middle. Meaning, at the end: "Both show the same thing,
   the number of ties ('Connections') each character has, from 1 to 36. A bigger dot means more
   ties, and so does a darker orange." Correct for the run she chose ("Connections" is Degree's
   on-screen name). Her "the biggest, darkest dot is Valjean" rests on the label drawn on that
   dot (`16.png`, `20.png`), so it was on screen before she said it.
4. **Names drawn.** `16.png` and `20.png`: a label line bound to `name` on the Connections row,
   which covers all 77 nodes, reads "77 labels, 6 hidden to avoid overlap". Real names are drawn,
   not ids.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `20.png`; sizes are visibly different; the names drawn on screen are drawn in
   the image (small and soft, but present); the key names both channels in use ("Size:
   Connections" and "Color: Connections", each 1 to 36). `20.png` shows the toast "Exported
   les-miserables_current-view.png".

## Measures

- **Steps:** 20 `real.mjs` steps after the start (`02.png` to `20.png`). One was a hover, two
  were tool selector misses that changed nothing, and one was a search she chose to make. The
  success path for this route (card, open, Analyze, Degree, Run, select row, add Size, size by
  attribute, pick, add label line, pick name, menu, Export, Export) is about 16 to 18, so about
  1.1x to 1.25x.
- **Wrong turns:** 1 -- the search for "Valjean" (`04.png`, `05.png`), a habit check off the
  success path that she left without acting on. The tooltip hover (`12.png`) is counted as help
  (the reason for SD), not a wrong turn. Adding Size under Shape (`10.png`, `11.png`) was a
  guess, but it is the success path.
- **False "done":** none. "77 of 77 arrived" (`03.png`), "Part 2 done" (`08.png`), "Part 3 done"
  (`14.png`), "names written on the drawing: done, with 6 of 77 held back" (`16.png`; she did not
  claim every name), and "Part 4 (picture file with its key): done" (download present, passes the
  checklist) are all true. truth_on_screen: not applicable.
- **Activation:** yes. She picked Degree from the Analyze list on its one-line description and
  ran it with no tooltip and no detour (`06.png` to `08.png`). She noticed PageRank's "Start
  here" tag and passed it over deliberately.
- **Usage card:** declined ("No thanks", `02.png`). She read the footer "Usage data stays off.
  Change this in Settings > Privacy." correctly; no wrong belief about what is sent.
- **Silent commits:** one. Adding Size (`11.png`) put a line with the fixed value 1 and left
  every dot the same size as before (`10.png` against `11.png`). She did not take it for done;
  binding by attribute (`14.png`) then changed the drawing.
- **Counts against the drawing:** none disagree. "77 labels, 6 hidden to avoid overlap" matches
  the reference for a sized Les Miserables.
- **Tool prints:** step 4, `--click "Find nodes, edges, values"`, found nothing (the search box's
  accessible name is "Find"; the longer text is its placeholder) and typed nothing; step 19,
  `--click "Export#2"`, resolved to something other than the dialog's blue button and nothing
  happened. Both were recovered by clicking the same visible control by position, which a person
  would simply have done; no app state changed. Not tool faults; the session is not void. No
  `ambiguous` print, no script error, no failed request (session.log is empty).
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                            | Evidence                                                                                     |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | 2        | behavior      | Size has no row of its own; it is reached only through "+" beside Shape, and she found it by guessing.                                                                                                                                                             | Steps 9-10, `09.png` (rows Fill, Color, Shape, Effects, Label, Tooltip; no "Size"), `10.png` |
| 2   | 2        | behavior      | Adding Size gives a fixed "1" and no visible change; binding it to a value needs a small chain-link icon whose meaning she learned only from its tooltip.                                                                                                          | Steps 11-13, `11.png` (all dots unchanged), `12.png` (tooltip "Size by attribute"), `13.png` |
| 3   | 2        | behavior      | The size picker offers "Connections in degree" and "Connections out degree" on a network the Overview calls undirected, which made her doubt what plain "Connections" counts.                                                                                      | Step 13, `13.png`; Overview "Undirected" in `03.png`                                         |
| 4   | 2        | behavior      | Names are tiny and soft on screen and in the exported PNG; the name on the biggest, darkest dot (Valjean) is the hardest to read. Fit for screen, not for print.                                                                                                   | Step 16 `16.png`, step 20 `20.png`, `downloads/les-miserables_current-view.png`              |
| 5   | 1        | behavior      | On screen the key box sits over the drawing and covers names near its top edge (Blacheville is half under it); the exported file does not have this overlap.                                                                                                       | `16.png`, `20.png` against the downloaded PNG                                                |
| 6   | 1        | opinion       | "77 labels, 6 hidden to avoid overlap" does not say which six are hidden, and there is no way to find out short of hunting dot by dot.                                                                                                                             | Step 16, `16.png`                                                                            |
| 7   | 1        | behavior      | Export is reached only through the main menu (or Control+E); nothing on the working screen says "picture" or "export".                                                                                                                                             | Steps 16-17, `16.png`, `17.png`                                                              |
| 8   | 1        | accessibility | The search box's accessible name is "Find" while the text a sighted user sees is "Find nodes, edges, values"; a voice-control user who speaks the visible words does not reach it (WCAG 2.5.3, label in name, if the placeholder is treated as its visible label). | Step 4, `04.png` (tool found no control by the visible text); step 5 reports combobox "Find" |
| 9   | 1        | wording       | The Overview line "Undirected, from the file: directed 0" took two readings to understand.                                                                                                                                                                         | Step 3, `03.png`                                                                             |
| 10  | 1        | opinion       | The orange color ramp's shades are hard to tell apart.                                                                                                                                                                                                             | Step 8, `08.png`                                                                             |
| 11  | 0        | opinion       | No vector (SVG or PDF) image export for print.                                                                                                                                                                                                                     | Step 18, `18.png`                                                                            |

No problem in this session is a build defect under the criteria (no crash, no control that does
nothing, no wrong count, keyboard not in scope for this participant), so none needed a scripted
reproduction. Every finding rests on this one participant and is unconfirmed until a second
session shows it.
