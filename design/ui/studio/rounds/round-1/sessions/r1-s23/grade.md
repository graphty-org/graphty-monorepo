# Grade: r1-s23 (T12B, Sam, keyboard only, Florentine families)

**Result: SD -- success with difficulty.**

The task: open the Florentine families sample, go to the Medici, read what the program knows about
them, and name the families they married into and how many. Success B in answers.md asks for the
Medici selected and the six families named from the screen: Acciaiuoli, Albizzi, Barbadori,
Ridolfi, Salviati, Tornabuoni.

## What the screen shows

- `10.png`: the Florentine families graph is open (15 nodes, 20 edges in the Overview).
- `20.png`: Medici is selected (yellow halo, Selection 1). The right panel reads Node "Medici",
  Summary: id Medici, name Medici, Degree 6. One fact read: degree 6.
- `22.png` (last screenshot): the right panel is "Medici -- Neighborhood", headed "Medici's 6
  connections", listing Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The Medici
  and the six are highlighted on the drawing; Selection reads 7.
- Answer given: "Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati
  and Tornabuoni." It matches the screen and the reference list exactly, and the count matches.

No files were downloaded; none were asked for.

## Why SD and not S

The second half followed the success path exactly (`/`, type the name, Down arrow, Enter, Tab to
Degree, Enter). The first half did not:

- Sam opened the sample without ever seeing where focus was. `04.png` to `07.png` and `09.png` are
  byte-identical to the untouched start page: after "New from data..." no stop shows a focus ring,
  the Florentine families card included. Sam pressed Enter blind to find out what had focus and the
  right sample happened to open ("I got there by luck, not by sight"). About 10 of 15 presses were
  spent finding focus.
- Three dead ends before reaching Find: Ctrl+F (nothing happened, `13.png`), and the Ctrl+K command
  palette, where typing "Medici" gave "No results" (`15.png`). The palette is what taught Sam that
  Find is `/`.

The task was finished, but it depended on a blind guess and on detours, which is difficulty.

## Measures

- **Steps:** 22 `real.mjs` steps, about 27 key actions. The keyboard path in answers.md is 30 keys
  on Florentine families, so the count is at or under the reference; the extra time went to blind
  presses and dead ends, not to more keys.
- **Wrong turns:** 3 (Ctrl+F; Ctrl+K and typing the name into the palette; Escape out of it).
  The Shift+Tab walk on the start page was a search for invisible focus, counted under problem 1.
- **False "done":** none. The final claim matches `22.png`.
- **Build-decided:** no. **Void:** no. `real.mjs` sent only keys a person could press.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                               | Evidence                                                              |
| --- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | 3        | accessibility | On the start page, the tab stops after "New from data..." (including every sample card) show no focus ring. A keyboard user cannot see which sample is focused and opens one blind. Fails WCAG 2.4.7 (focus visible). | `04.png`-`07.png`, `09.png` identical to the unfocused page; `10.png` |
| 2   | 2        | behavior      | After the graph opens, focus starts in the bottom toolbar, past the "Find nodes, edges, values" box, and the next Tab goes to the right panel, so Find is behind the user.                                            | `11.png`, `12.png`                                                    |
| 3   | 2        | behavior      | No on-screen hint that `/` opens Find; Ctrl+F does nothing; Ctrl+K is shown only as a toolbar icon. The participant learned `/` only from the command palette.                                                        | `13.png`, `14.png`                                                    |
| 4   | 2        | behavior      | The command palette does not find nodes: typing a node's name gives "No results" with no pointer to Find.                                                                                                             | `15.png`                                                              |
| 5   | 1        | behavior      | Closing the palette with Escape returns focus to the toolbar's command button, not to where the user was before opening it.                                                                                           | `16.png`                                                              |
| 6   | 1        | behavior      | Nothing says the Degree row can be opened; pressing Enter on it to list the connections was a guess (a lucky one).                                                                                                    | `21.png`, `22.png`                                                    |
| 7   | 1        | behavior      | Names are not drawn on the dots after opening the sample, so the drawing gives a keyboard user nothing to aim for.                                                                                                    | `10.png`                                                              |

Problem 1 is a single-participant finding seen directly in the screenshots; it was not reproduced
as a scripted path on the current build, so it counts as confirmed only once another keyboard
session or a scripted run shows it.
