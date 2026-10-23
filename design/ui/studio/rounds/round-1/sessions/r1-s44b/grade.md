# Grade: session r1-s44b -- Alex, change the layout of Les Miserables

**Grade: SD** (success with difficulty). Alex applied two layout methods that differ from the one
the graph opened with, and the node positions changed visibly both times: "Force, flat" spread the
graph into an even disc (`10.png`, still the same after 5 seconds in `11.png`), and "Spectral"
piled most nodes into one clump with a few outliers (`13.png`). He then went back to "Force -
Recommended" on purpose, so the last screenshot (`14.png`) shows the starting drawing again; the
task does not ask him to keep a new layout, only to try one and say whether it helped. His answer,
"neither helped, both were worse", is an opinion and is not graded. It is SD rather than S because
the Layout button is an unlabeled icon and he found it only by hovering all five toolbar icons.

## Measures

- **Steps:** 9 `real.mjs` actions to the first success (`10.png`): open the sample, 5 hovers,
  Layout, Method, "Force, flat". The success path is 3 actions (open the sample, Layout, pick a
  method; opening the Method list is part of picking), so about 3x. 13 actions in all, including
  the second method and the return to the start.
- **Wrong turns:** 0. The 5 hovers were a search for an unlabeled control, not a step off the path.
  At step 7 one command named the Method list by its value ("role=combobox:Force, flat") and the
  tool found nothing (`12.png`); that was a slip in the command, it changed nothing on screen, and
  the next command did what he meant.
- **False "done":** none. He said "Partly" finished and described each result as it was on screen:
  the disc had settled (`10.png` and `11.png` are identical), Spectral piled the nodes under the
  popover (`13.png`), and going back gave the starting drawing (`14.png` matches `04.png`).
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                              | Evidence                                   |
| --- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | 3        | wording  | The Method list shows bare names with no description. graphty-element's catalog describes "Force, flat" as spreading the nodes evenly over a flat disc so that "groups show faintly if at all", but the app shows only "Force, flat". A Gephi user read it as the flat version of a normal force layout (ForceAtlas 2, Fruchterman-Reingold), picked it to separate clusters, got the opposite, and said it made him "doubt the tool, not the data". | step 5 `09.png`, step 6 `10.png`, `11.png` |
| 2   | 2        | behavior | After Spectral, almost every node sits in one small clump at the bottom center, under the Layout popover and the toolbar. The view is fitted to the whole spread including a few far outliers, so the result the user asked for is hidden by the control used to ask for it.                                                                                                                                                                         | step 7 `13.png`                            |
| 3   | 2        | behavior | The Layout button in the bottom toolbar is an icon with no label; Alex had to hover every toolbar icon to find it. There is no Layout entry anywhere else he looked (top bar).                                                                                                                                                                                                                                                                       | step 3 `03.png` to `07.png`                |
| 4   | 1        | behavior | The Seed field appears for the force methods and disappears for Spectral with nothing saying why. Alex noticed and was unsure whether the result was still repeatable.                                                                                                                                                                                                                                                                               | `10.png`, `13.png`                         |
| 5   | 1        | opinion  | No method name matches the names a Gephi or NetworkX user knows (ForceAtlas 2, Fruchterman-Reingold), and "Recommended" does not say what it is recommended over.                                                                                                                                                                                                                                                                                    | step 5 `09.png`                            |
| 6   | 1        | opinion  | For "tell the clusters apart" Alex would color by community rather than change the layout, and nothing on the Layout popover points there.                                                                                                                                                                                                                                                                                                           | debrief                                    |
| 7   | 0        | behavior | The tool, not the app: `real.mjs` printed each hovered icon's tooltip one icon late ("Layout" button, "Analyze Shift+A" tooltip), and Alex took the app's tooltips to lag. The screen shows the right tooltip on the hovered icon (`04.png`: the Layout icon with the tooltip "Layout"). The same was noted in session r1-s21b. Not counted against the app; the tool's tooltip read-out should be fixed.                                            | step 3 `03.png` to `07.png`                |

No build defect was found. The even disc of "Force, flat" is the method's described behavior in
graphty-element's catalog, and the Spectral clump is what spectral layout does with this graph's
outliers. The scripted path in `rounds/round-1/repro/r1-s44b/run.sh` (open the sample, "Force,
flat", wait 5 s and 20 s more, then Spectral) confirms both: the disc is byte-identical after 0, 5
and 25 seconds (repro `04.png`, `05.png`, `06.png`, and identical to this session's `11.png`), and
Spectral again leaves the clump under the popover (repro `08.png`).
