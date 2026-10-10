# Grade: session r2-s05 -- Nadia (bank alert reviewer, returning), bus stops (T20 A), a number that means "farther"

**Grade: VOID.** The run failed: before the session, the participant read the grader-side notes of
the task in `tier2/tasks.md`, including its "Words avoided" list (line 180), which names the very
controls the task measures: "weight", "higher", "means", "farther", "closer" and "set" (the "Not
set" choice). The transcript says so at the top ("this participant also read the task's 'Words
avoided' note, which names two controls on the target path ('Higher means' and the choice
'Farther')"), and again at step 6 ("I knew from the task notes that a 'Farther' choice exists").
T20 exists to learn whether a user finds that a weight column needs a meaning and chooses
"Farther"; the prompt avoids those words for that reason. A participant who knows the answer's
control names has information no real person has, which is the criteria's definition of a tool
fault ("`real.mjs` did something a person could not", `../criteria.md`, "Tool fault"). The
participant's own claim that the on-screen sentence "would have led me to it anyway" is a
self-report and cannot be graded. Re-run the session with the same persona and prompt from a new,
empty folder, with a participant who sees only the prompt and the persona file.

**What the screen shows, for the record (not scored).** Had the run been clean, the end state
would grade **S**: the last screen (`16.png`) shows Summary "Path 5 nodes, 4 edges", "Total
minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with Analysis
"Shortest path", From "Depot", To "Harbor", Follow "All", Weight "minutes (farther)". The weight
was set at load (role Weight, Higher means Farther on the import page, then Load), and the
Overview after loading read "Loaded weight minutes (farther)", Direction "Directed" (`08.png`).
The participant pointed to Loaded weight, "Total minutes 14" and Made with's Weight row, all of
which the answer key accepts. Not `weight-not-read` (not Depot, Station, Harbor or Depot, School,
Harbor); not `read-wrong` (the "4 hops" in the tree was read as rides, not minutes).

Build seen: `8f0d5a6f7791 graphty@0.8.61` (`session.json`), the frozen build named in the
criteria, at 1440 x 900. Start: empty, no setup. The app and `real.mjs` themselves worked: every
step left a screenshot, the session log is empty, and `work.json` holds one run
(`shortest_path`), its two route layers and the source `bus-stops.csv`, with nothing gone. The
fault is in what the participant was given, not in the tool's clicks.

## Measures (recorded, not scored)

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`); 14 that changed
  something, since step 4 (`--click "minutes"`) was refused as ambiguous and left the screen
  byte-identical (`03.png` and `04.png` are the same size and image). The round 2 route is 10.
  The extra steps are not detours: one refused click (step 4); "No thanks" and the upload as
  separate steps; the analysis button, a typed filter word and a click on the result in place of
  the `p` key (3 steps for 1); From and To each typed and then picked (4 steps for 2).
- **Wrong turns:** 0. Every move went forward. Step 4 was an aiming slip on a duplicated name.
- **False "done":** none. "I'm done" (step 16) is true: the route, the total and the weight's
  meaning are on screen in `16.png`. truth-on-screen holds.
- **Broken habit:** no. The first move, "Open project or file...", is in the history and led to
  the import page where the weight is set.
- **Silent commit (bar 4):** none. Load drew the graph and the Overview named the loaded weight;
  Find path drew the route, its key and the run's Values.
- **Numbers that disagree (bar 5):** none. "Total minutes 14" matches the four rows (4 + 3 + 4 +
  3); "5 nodes, 4 edges" matches "4 hops".
- **"Capacity", "Closer" or "Date or time" chosen:** no.
- **Wording echo:** the participant quoted the "Farther" helper line ("That is exactly my case")
  after choosing Farther; the line appears only after the choice. The choice itself is tainted by
  the leaked word list, above.
- **Ease (from the transcript):** 6 of 7. Not used for any grade.

## Problems seen (carry to the re-run for confirmation; this session counts toward none)

| Severity | Problem | Evidence |
| -------- | ------- | -------- |
| 2 | The file loads Directed ("As the file says"), the Path form's Follow starts on "All", which ignores direction, and nothing says what "Out" or "All" means. Nadia could not tell whether the route might ride a one-way link backwards and said her QA would ask. A reader who must document exactly how two parties are linked cannot defend the answer from the screen. | `11.png`, `16.png` (Follow "All", Overview "Directed" in `08.png`); transcript step 11 and outcome |
| 1 | The minutes column loads as "Attribute" with only a small gray line, "Weight: none (each edge counts 1)", to say it will be ignored; Load is enabled. Picking Weight then raises a second question, Higher means, starting on "Not set". Nadia read the line and set both, but said a hurried user would load as-is. | `03.png`, `06.png`, `07.png`; transcript steps 3, 6 and outcome |
| 1 | The analysis list's first screen shows ranking analyses only; nothing about routes was visible until she typed "quickest" in the filter, which found "Shortest path". | `09.png`, `10.png`; transcript steps 9, 10 and outcome |
| 1 | The tree row reads "Shortest path 4 hops" where she expected the minutes; "hops" is a word she does not know. Not misread here. | `16.png`; transcript outcome |
| 1 | No stop names are drawn, so the route cannot be read from the drawing alone or from a saved picture. Known on this build. | `08.png`, `16.png`; transcript outcome |
| 1 | The column header and the role box share the name "minutes", so a click on "minutes" is refused as ambiguous and changes nothing. | `03.png`, `04.png`; transcript step 4 |

## Notes for scoring

- Task T20, half A, persona Nadia (`ux-storyboards-mocks-and-study/design/ui/prototype/study/personas/alert-reviewer.md`;
  history in `tier2/roster.md`, Nadia). Assigned in `rounds/round-2/plan.md` and `table.md`.
  Start: empty. Build 8f0d5a6f7791.
- Void reason: the participant read `tier2/tasks.md`'s T20 notes, whose "Words avoided" list
  names the target controls. Count it as a void session (target 0) and re-run it.
- Simulated participant: even on a clean re-run, a pass is weak evidence until real people
  confirm it.
