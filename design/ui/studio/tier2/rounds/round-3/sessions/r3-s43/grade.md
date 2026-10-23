# Grade: session r3-s43 -- Dana (regular analyst, returning), running club (T24 A), one tie on the drawing

**Grade: F** (failure). Dana read the right number but did not end with exactly the two ends
selected. The last screen (`13.png`) shows the left panel's Selection row at **1**, with the
yellow selection halo on Ivan only. Gus and Ivan are both painted black by a "Shortest path" run
that she started from Ivan's right-click menu ("Path between..."). The key credits only the two
ends selected; it grades a participant who colors the two instead under the F rule ("more or
fewer than the two selected"), with the route recorded. The route here was a shortest-path run
used as a highlighter: Ivan selected, and the run's style layer paints Gus, Ivan and their tie.

Build: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked-names.txt`, which leaves the Everything
inspector open. Tool commit `acf3894e2c56`, no uncommitted changes. leaks.json: no leaks.

## The answer against the key

- **The number (right): 1.** A click on the line at 757,583 (the first try; the tool reported
  edge id 13) opened the edge inspector "Gus -> Ivan", subtitle "Edge", Summary From Gus, To
  Ivan, weight 1, with the line drawn in a blue band and Selection 1 (`03.png`). This matches the
  key. She read "weight" as the run count because it was her own file; nothing on screen named
  the column's meaning.
- **The two ends (wrong): only Ivan selected.** `13.png`: Selection 1; Ivan has the halo, Gus
  has none. The inspector shows the Shortest path run (Path 2 nodes, 1 edge; Nodes in order Ivan
  1, Gus 2; Made with From Ivan, To Gus, Follow All, Weight None). `work.json` agrees: the end
  state adds the run `shortest_path Shortest path (label Shortest route)` and two layers,
  "Shortest route (nodes)" and "Shortest route (edges)". Nothing is gone.
- **Did not read the tie as Gus to Hana.** Although the Hana label covers the lower half of
  Ivan's sphere and the line stops at the label's edge (`01.png`, `03.png`), Dana named the tie
  Gus to Ivan from the start and confirmed it in the inspector.
- **The success route was not found.** She never opened the edge inspector's three-dot menu
  ("Edge actions", which holds "Select endpoints"). After reading the number she clicked Gus
  directly (`04.png`), which replaced the edge selection.

## Measures

- **Clicked the line itself:** yes, at the first try (`02.png` hover, `03.png` click at the same
  point).
- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`); the success path is 4.
  `12.png` and `13.png` are identical byte for byte, and both already show the finished path run.
  The transcript says step 11 (`--click "role=option:Gus" --click "Find path"`) was refused because
  two options named "Gus" were open (the left find list from step 7 and the path form's
  suggestion, `11.png`) and that Enter in step 12 then ran the path. The screens do not bear that
  out: the run is already on `12.png`, so either step 11 reached Find path after all or its
  screenshot was taken after the run; Enter then changed nothing visible. Which of the two steps
  ran the path cannot be told from the files; the end state is the same either way.
- **Wrong turns:** 6. (1) Shift-click on Ivan to add him (replaced Gus, `05.png`). (2) Ctrl-click
  on Gus to add him (replaced Ivan, `06.png`). (3) The Selection row, looking for a way to add
  (`07.png`). (4) The find box, looking for checkboxes or "select all" (`08.png`; it did confirm
  the tie, but gave no way to select two). (5) Right-click on Ivan, looking for "add to
  selection" (`09.png`). (6) "Path between..." as a way to mark both, which ended the session
  in the failing state (`10.png` to `13.png`).
- **False "done": yes.** Her wrap-up says "Did I finish? Yes ... Gus and Ivan are marked on the
  drawing (black, with their tie), and no one else is." The task is graded F. truth-on-screen:
  her description of the drawing is accurate (both black, nobody else black), and she herself
  noted "Ivan still has the yellow glow on top, so it is two different markings at once"; the
  false part is the claim that the task is complete, since the selection holds Ivan alone.
- **Ease (from the transcript):** 4 of 7. Not used for the grade.
- **Silent commit:** none. The path run that ended the session is shown (a new left-panel row
  "Shortest path 1 hop", a key entry "Shortest path", the run's Values), `13.png`.
- **Build-decided:** partly. Shift-click and Ctrl-click on a node's drawn name replaced the
  selection instead of adding to it (`04.png` to `06.png`, Selection 1 each time). The key lists
  "Selecting Gus and then Ivan with Shift held" as an accepted route; on this build, from the
  drawn names, it did not work. The tool holds the modifier key down through Playwright for the
  click (`tool/real.mjs`, `act`, and its `--shift-click` / `--ctrl-click` options), so this is
  not a tool fault on the evidence; a scripted repro is needed to confirm it as a build defect.
  Had either modifier added to the selection, she would have finished at step 4 with an S or SD.
- **Void:** no. Every step printed a screenshot and the end state is clear from `13.png` and
  `work.json`. The mismatch between the transcript's step 11 and `12.png` (see Steps) leaves open
  only which step ran the path, not the outcome, so it does not void the session.
- **Scripted exit:** not applicable; she claimed to finish.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                  |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 3        | build-behavior  | Shift-click and Ctrl-click on a node's drawn name replace the selection instead of adding to it; the Selection row stays at 1. The common "add to selection" habit from spreadsheets and file browsers fails with no sign why. This alone turned a likely success into a failure. Needs a scripted repro to confirm. | `04.png` Gus selected; `05.png` Shift-click Ivan, Gus loses halo, Selection 1; `06.png` Ctrl-click Gus, Ivan loses halo, Selection 1 |
| 2   | 3        | discoverability | The edge inspector offers no visible action for "the two on this tie": "Select endpoints" sits only inside an unlabeled three-dot menu at the inspector's top right. Dana read the inspector, then left it without opening that menu.                                                         | `03.png` (only the "..." button at 1420,73); transcript steps 2-3                                          |
| 3   | 2        | comprehension   | A shortest-path run reads as "marking" two people: it paints them black and leaves a lasting run and two style layers, while the selection holds one node. Dana took this as done, with two different markings on Ivan at once.                                                                | `13.png` Selection 1, Ivan halo, Gus and Ivan black, run row "Shortest path 1 hop"; work.json end state    |
| 4   | 2        | discoverability | The Selection row's inspector shows only the selection's look (glow, size, edge color), not who is selected or how to add someone.                                                                                                                                                             | `07.png`; transcript step 6                                                                                |
| 5   | 2        | discoverability | No "add to selection" in a node's right-click menu (Neighborhood, Path between..., Frame selection, Add note), and the find box's results have no way to select several.                                                                                                                        | `08.png`, `09.png`; transcript steps 7-8                                                                   |
| 6   | 1        | feedback        | Hovering a line turns the pointer into a hand but shows no tooltip, names or value; the tie can be read only by clicking it.                                                                                                                                                                  | `02.png`; transcript step 1                                                                                |
| 7   | 1        | interaction     | The participant reports that Enter in the path form's "To" box picked the suggestion and ran the analysis in one press. Not confirmed: `12.png` and `13.png` are identical and the run already shows on `12.png`, so the screens cannot tell whether Enter or the step before it ran the path. | `11.png` suggestion; `12.png` = `13.png`; transcript steps 11-12                                           |
| 8   | 1        | accessibility-name | With the left find list still open, the path form's suggestion "Gus" shares its accessible name and role with the find list's "Gus" option; the tool reported a refusal. Cost up to one step (see Steps).                                                                                | `12.png`; transcript step 11                                                                               |
| 9   | 1        | wording         | The run count is shown under the column name "weight"; Dana assumed weight meant runs because the file is hers. Right here, but nothing on screen confirms it.                                                                                                                                  | `03.png`; transcript wrap-up                                                                               |

No severity 4: the number she reported is right, and her account of the drawing is accurate; the
failure is that the two ends are not both selected, which she could not get the app to do with
the moves she tried.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a failure here is strong evidence, a pass would be weak.
