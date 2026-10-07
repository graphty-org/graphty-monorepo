# Grade: session r3-s21 -- Grace (nonprofit operations analyst), T12 prompt B, Florentine families

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, mouse
and keys. Graded from the last screenshot (07.png), the one before it (06.png) and the transcript.
No files were saved, and the task asks for none. Not graded from the participant's rating (6 of 7).

## Grade: S (success)

Each part of success B holds on screen:

1. **Medici selected.** Step 6 (06.png): the panel title reads "Medici -- Node", "Selection 1" on
   the left, one node ringed. In 07.png the Medici node is still ringed and the panel reads
   "Medici -- Neighborhood".
2. **What the program knows read.** Step 6: the Summary shows id Medici, name Medici, Degree 6.
   She read all three back in her wrap-up.
3. **The six families named from the screen.** Step 7 (07.png): "Medici's 6 connections" lists
   Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. She named all six, spelled as on
   screen, and said 6. They match the answer key exactly.

- **Route:** the Degree row. She clicked the row's word area (x 1320, the tool reported
  `button "Degree 6"`), not the chevron. In her words, the ">" is why she clicked: "looks like it
  might open a list".
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. At step 4, real.mjs could not find the search box by its placeholder text, and
  nothing was typed. That did not change the screen. At step 5 she clicked the box, which is what a
  person does. The outcome is the same as a person's, so the session stands. The naming gap behind
  it is recorded as problem 4 (the same gap met in session r3-s19).

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 6 (steps 2-7) | 6 on the documented path (open the sample, `/`, type, Down, Enter, Degree) |
| Steps that moved toward the answer | 5 (steps 2, 3, 5, 6, 7) | -- |
| Wrong turns | 0 | -- |

- Step 2 declined the usage card. It is the card step, not a detour.
- Step 4 was a tool no-op (see "Void" above). It is not a wrong turn.
- At step 5 she clicked the box instead of pressing `/`, and at step 6 clicked the "Medici" result
  instead of Down and Enter. That is the same route by mouse.

## False "done"

None. Her claim "the Medici married into 6 families" with the six names matches 07.png word for
word. Her claim that the program knows "only their name (id and name both 'Medici') and 'Degree
6'" matches 06.png. She worked out correctly that "Selection 7" counts the Medici plus the six.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was found,
so no repro script was needed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | "Degree 6" in a node's Summary does not say what it counts. She called it jargon and only guessed it meant six marriages; she found the list because the row had a ">". A reader who does not click arrows stops at the number. Confirmed: sessions r3-s19 ("17 of what?") and r3-s02 met the same thing. | Step 6, 06.png; wrap-up point 2. |
| 2 | 1 | wording | "Selection 7" on the left beside "Medici's 6 connections" on the right. Nothing says the 7 includes the Medici. She stopped and double-checked. Confirmed: r3-s19 met the same ("Selection 18" beside "17 connections"). | Step 7, 07.png. |
| 3 | 1 | wording | The graph Overview line "Undirected, from the file: directed 0" meant nothing to her, and the row label "Edges per n..." is cut off, so its value "1 to 6, mean 2.667" has no readable name. Off the success path; seen in one participant. | Step 3-4, 04.png. |
| 4 | 1 | accessibility | The search box's accessible name is "Find", while its visible text is the placeholder "Find nodes, edges, values". A voice-control user who says the visible words does not reach the box. Second session to meet it through the tool (also r3-s19). Not a build defect under the criteria: the box works by click and by `/`. | Step 4 (tool: nothing on screen is called "Find nodes, edges, values"), 04.png; step 5 (tool: `combobox "Find"`), 05.png. |
| 5 | 1 | wording | The neighbor list says "connections" and nothing on screen says that a connection here is a marriage. She relied on the start page's description of the sample. | Step 7, 07.png. |
| 6 | 1 | opinion | The drawing shows no names, so the only way to find the Medici is the search box; she wants names for a board slide. Cost nothing here; she found the box at once. Confirmed as an opinion (also r3-s19). | Step 3, 03.png. |

What worked: the sample was on the start page with its count and a plain description. The search
box found the Medici with one match and offered the node itself first. Selecting it put "Degree 6
>" in view, and one click opened the named list, whose count matches its length and whose names
match the answer key. "Local only" in the top bar and the start page's "never uploaded" line were
what she looks for with donor data.
