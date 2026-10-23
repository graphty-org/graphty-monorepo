# Pilot: T12, one character and who he is tied to

Build under study: graphty@0.8.53, commit b7590f8de22b (production build of the studio worktree,
opened at `/?next`). Both prompts walked from an empty start, one session each. No script errors,
console errors or failed requests were printed in either session.

**Verdict: the end state is reached for both prompts, with no detour.** No blockers.

## Prompt A: Les Miserables, Javert (folder `A/`, 7 screenshots)

| Step | Command                                    | What the screen shows                                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | start, empty                               | Start page: Open, New from data, four sample cards, the usage card at the bottom.                                                                                                                                                                                                                                |
| 02   | `--click "No thanks"`                      | Card gone; the line "Usage data stays off. Change this in Settings > Privacy" in its place.                                                                                                                                                                                                                      |
| 03   | `--click "Open the Les Miserables sample"` | 77 nodes drawn; right panel Graph > Values > Overview: Nodes 77, Edges 254, Density, Components 1.                                                                                                                                                                                                               |
| 04   | `--key /` `--type Javert`                  | Find box holds "Javert"; Elements: Javert; Values: "Select where name is Javert (1)".                                                                                                                                                                                                                            |
| 05   | `--key ArrowDown`                          | The Elements row "Javert" is highlighted.                                                                                                                                                                                                                                                                        |
| 06   | `--key Enter`                              | Javert selected (yellow ring on the canvas, Selection 1). Right panel: Javert, Node, Summary: id Javert, name Javert, "Degree 17 >".                                                                                                                                                                             |
| 07   | `--click "Degree"`                         | Right panel "Javert, Neighborhood", section "Javert's 17 connections": Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. Selection 18; the 17 neighbors ringed on the canvas. |

The 17 names on screen match the answer key exactly, in its alphabetical order. Success A: one
fact read (degree 17), names and count on screen. 6 steps after the start, as the answer key's
Degree route says.

## Prompt B: Florentine families, Medici (folder `B/`, 5 screenshots)

| Step | Command                                                               | What the screen shows                                                                                                                                       |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | start, empty                                                          | Start page, as in A.                                                                                                                                        |
| 02   | `--click "No thanks"` `--click "Open the Florentine families sample"` | 15 nodes drawn; Overview: Nodes 15, Edges 20, Components 1.                                                                                                 |
| 03   | `--key /` `--type Medici`                                             | Elements: Medici; Values: "Select where name is Medici (1)".                                                                                                |
| 04   | `--key ArrowDown` `--key Enter`                                       | Medici selected; Summary: id Medici, name Medici, "Degree 6 >".                                                                                             |
| 05   | `--key g`                                                             | Right panel "Medici, Neighborhood", section "Medici's 6 connections" (focused): Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Selection 7. |

The six families match the answer key. Success B reached by the Neighborhood command (G), the
route the answer key lists as counting the same as the Degree row.

## Things seen that do not block this task

- **The selection moves the camera so part of the drawing goes under the toolbar** (A/06, A/07,
  B/04, B/05). Before the selection the whole drawing fits (A/03, B/02); after Enter the view
  recenters on the selected node and the lowest nodes run off the bottom edge or sit behind the
  floating toolbar (B/04: one node at about 738,840 half hidden). No neighbor in either answer is
  hidden, so the task is unaffected. Kind: element-defect if the recentering is graphty-element's
  own camera behavior on selection; app-defect if the app asks for it. Not traced here.
- **The Overview's direction row runs into the right edge** (A/03, B/02): "Undirected, from the
  file: directed 0" ends flush with the window edge, right of every other value. The label
  "Edges per ..." is cut short. Kind: app-defect (panel layout). Not on this task's path.
- **"Directed 0"** reads as a count with no noun; a reader may not know what is zero. Kind:
  app-defect (wording). Not on this task's path.
