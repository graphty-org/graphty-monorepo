# Grade: session r5-s25b -- Ruth (tier 1 graduate), running club (T24 A), one tie on the drawing

**Grade: S** (success). The last screen (`04.png`) matches the answer key's A end state: the
inspector header reads "2 nodes selected" (subtitle "Selection"), Summary Nodes 2, "Edges joining
these nodes 1", the left panel's Selection row reads 2, and Gus and Ivan both carry yellow halos,
their fill still the PageRank color. Ruth answered "Gus and Ivan ran together once", reading
weight 1 from the edge inspector (`02.png`: "Gus -> Ivan", Edge, From Gus, To Ivan, weight 1), the
key's number.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the running-club names setup (friends.csv loaded, PageRank run,
nodes sized and colored by PageRank, every label shown). Tool commit `753bae997bc6`, no
uncommitted changes.

## The answer against the key

- **Number (right).** 1, read from the edge inspector after a click on the line itself (`02.png`).
  She did not read the tie as Gus to Hana: the inspector named Ivan, and she checked it.
- **Selection (right).** Exactly Gus and Ivan (`04.png`).
- **Route.** Not the key's success path (Edge actions, Select endpoints) but the key's listed other
  route: a click on Gus (`03.png`, Selection 1, node inspector), then a Shift-click on Ivan
  (`04.png`). The key credits this route with the same end state. She never opened the "Edge
  actions" menu, so how she got from "the two on this tie" to the app's word "endpoints" does not
  arise: she selected the two people by name, which her history (find a person, read their ties)
  makes natural.
- **Work kept.** `work.json`: start and end lists identical (one PageRank run, four style layers,
  no notes, no steps, one source); nothing gone.

## Measures

- **Clicked the line itself:** yes, on the first try (`--click-at 755,585`, the tool reports edge
  13; the key's point is 755,586). One try.
- **Steps:** 3 `real.mjs` steps after the start (line, Gus, Shift-click Ivan). The key's success
  path is 3 after the line click's read (line, Edge actions, Select endpoints); this route is the
  same length.
- **Wrong turns:** 0.
- **False "done":** none. "Gus and Ivan are selected, and only them" is true on `04.png`;
  truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none. Inspector Nodes 2 and the Selection row 2 agree.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Four screenshots for three steps plus the start;
  `leaks.json` shows no leaks over 10 calls.
- **Scripted exit:** not applicable; Ruth finished.

## Problems

| #   | Severity | Kind        | Problem                                                                                                                                                                                                                                       | Evidence                                                                                                       |
| --- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | wording     | The tie's only number is labeled with the file's column name "weight"; the reader must assume it is the run count. This is the reader's own data label, not app wording, so it is recorded only as a moment of doubt.                    | `02.png` (Summary: weight 1); transcript step 1 and "What confused me"                                         |
| 2   | 1        | meaning     | The edge title's arrow "Gus -> Ivan" made her wonder whether a second tie ran the other way carrying more runs; nothing on the edge inspector says whether a reverse tie exists. "Edges joining these nodes 1" answered it only after selecting both. | `02.png` (title "Gus -> Ivan"), `04.png` (Edges joining these nodes 1); transcript step 3 and "What confused me" |
| 3   | 1        | target size | The line is a thin target; the click landed, but she reported needing "a steady hand" and planned the find box as a fallback. The key's measure of tries records 1 here.                                                                    | `01.png`, `02.png`; transcript "What confused me"                                                              |

The "Hana" label box drawn over Ivan's lower half (the key's known overlap) shows on every screen
(`01.png` to `04.png`) but did not mislead her.
