Grade: SD
False done: no
Wrong turns: 0

# Grade: r1-s31 (task T41 A, persona Tom)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (43 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the start page's "Open a file"; the top bar reads "volunteers").

## Against the success definition

T41 A asks for `volunteers.graphml` opened, every volunteer who is trained AND has no phone
painted bright red, everyone else unchanged, and their names reported.

- Layer: one node layer "4 nodes", made from a selection picked by hand in the table
  ("Picked by hand: 4 nodes", notice "Made a layer for the 4 selected nodes", `16.png`,
  `17.png`). `styles.json`: its selector is a list of ids (`v03`, `v10`, `v14`, `v20`), not the
  rule. The key does not list this stack for T41, but grades a colored hand-picked selection SD
  wherever it names one (T40, T45: "it holds node ids, not the rule"), so SD here: the right four
  are painted today, and the layer will not follow a change in anyone's trained or phone value.
- Color: Fill `FF0000` (the word `red` typed), drawn `#ff0000`; `colorWord` gives "red", which
  holds for "bright red" ("bright" recorded, not graded). The key reads "Color: 4 nodes, 4 of 24
  nodes".
- Everyone else unchanged: `key.json` draws 4 nodes `#ff0000` and 20 at the default `#6366f1`;
  the 63 ties stay `#a9a9a9`. No other layer was touched.
- Names: Aisha Bello, Diego Ruiz, Nora Lindqvist, Julia Rossi -- the answer exactly. All four were
  on screen in the table with trained Yes and a blank phone before they were given (`10.png`),
  and the count was on screen first ("phone 11 of 15 have a value" on the 15 trained, `05.png`;
  "trained Yes (4)", "phone 0 of 4 have a value" on the four, `13.png`).
- Final screen (`17.png`): four red dots, twenty blue, the selection cleared, all four red dots in
  view.

## Steps

18 steps against the key's 18, by another route. Open a file with the file (1), Load (2), `trained`
typed in the find box (3), "Select the 15 nodes" (4), a click on the summary's phone line (5,
does nothing), Table (6), sort on phone twice (7, 8), scroll (9), click Aisha's row (10),
Control+click Diego, Nora and Julia (11-13), Style tab (14), Fill "+" (15), `red` with Enter (16,
the four red), Close table (17), Escape (18). No move led away from the success state: the dead
click and the second sort gave nothing but changed nothing.

## Problems

1. Severity 3, behavior. Nothing on the way the participant took combines two facts: the find box
   offers "trained" as one selection, and the selection's summary says "phone 11 of 15 have a
   value" but its line cannot be clicked to narrow to the four without one (step 5-6, `05.png`,
   `06.png`). The reader fell back to picking four rows by hand, which makes a layer of fixed ids
   ("Picked by hand: 4 nodes") that will not follow the data; the participant guessed as much
   ("If one of them gives us a phone number next week... I'd have to do this again").
2. Severity 2, wording. The layer and the key are named by count, "4 nodes" and "Color: 4 nodes",
   so the key handed to someone else does not say what red means (steps 16-18, `16.png`,
   `17.png`).
3. Severity 2, behavior. No names on the drawing: the reader could tell who anyone was only from
   the table (step 3 on, `03.png`, `17.png`).
4. Severity 1, behavior. Sorting on phone puts the blank cells last in both directions, so the
   reader who flipped the sort to bring them up had to scroll for them (steps 7-9, `08.png`,
   `09.png`). Also in the key.
5. Severity 1, wording. The Style tab's sections name no "color"; the reader guessed that Fill is
   color, and the color box shows a hex code (`6366F1`) the reader did not know (steps 14-15,
   `14.png`, `15.png`). Typing the word `red` worked.
6. Severity 1, wording. The storage notice ("This browser may clear what it keeps for this site")
   worried a reader about losing work, with nothing saying whether this session's work was at risk
   (step 2, `03.png`).

No build defect: nothing here contradicts what the key says the build does, so no repro was
scripted.
