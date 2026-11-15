# Tier 6 round 1: Figma product designer walkthrough

Build 3b2a7f0649 (graphty@0.8.92), the frozen study build, walked 2026-11-05 with `real.mjs` on the
GPU. Five sessions, every one ended; screenshots under `expert/figma/` in this round's folder:

- `w1/` (empty start, volunteers.graphml, 1440 x 900): rail, no provider, Settings' AI provider,
  ready and empty, a starter, working, a reply with its steps, Open run, the scope line and its x,
  the conversation list, a chip's peek and click, Show in table, Control+Z, a style change, Open
  layer, Undo in the reply.
- `w2/` (setup `connected-yeast.txt`, 1440 x 900): a large removal's request, its chip's peek, away
  from the panel, Remove, panel resize, Talk, Send on an empty composer, Quick actions, Undo of the
  removal, Delete's confirmation, Control+I.
- `w3/` (setup `connected-volunteers.txt`, 1440 x 900, request counter at its cap): a 429, Send again.
- `w4/` (empty start, 900 x 700, dark, counter at its cap): no provider, the provider section, ready
  and empty, a 429.
- `w5/` (setup `connected-volunteers.txt`, 1440 x 900, counter at its cap): Stop, a long draft.

Lens: where Figma solved a control, a list, a menu or a row, the Assistant should work the same way;
where graphty's model differs (a chat that changes a graph), it should match graphty's own panels.
Severity is Nielsen's 0 to 4, rated by what a reader would pay. A broken written rule is stated
apart from the severity. Expert counts are not user evidence. No finding here is rated 3 or 4, so
none needs a reproduction for bar 9.

## Not reached

The tier's shared request count reached its cap of 3,000 during this walk (this walk spent 21 of
it), so these states need another route or the cap raised:

- A question from the Assistant (4.8); a change landing with the panel closed (4.10); Stop with a
  real change to take back.
- 4.4 and 4.7 at 900 x 700 and in the dark theme. 4.1, 4.3 and 4.9 were reached there (`w4/`).
- A return with the tab's key gone (4.11): after `--reopen` the tab stayed on the start screen and
  the project was not reached (`w5/07.png`, `w5/08.png`).
- Talking (4.12): headless has no microphone, so only "No microphone found." was seen.
- Show in table on a large graph: the 331-gene turn held no chip row.

## Findings, most severe first

All paths are under `expert/figma/`.

| #   | Sev | Screen                  | Finding                                                                                                                                                                                                                                                                                                                                                                                  | Evidence                         | Package                                                  |
| --- | --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| 1   | 2   | A reply that repaints   | "Which nodes matter most?" recolored all 24 nodes, added a layer and opened the key card, and the change lines say only "Computed Influence" and "Computed Bridges". No line says the picture changed. Rule broken: bar 11, a reply claiming a change has a line for it ("styled the graph"). The repaint itself is kept by the key; the missing line is not.                           | `w1/17.png`, `w1/21.png`         | graphty-element (a run's painted layer needs its effect) |
| 2   | 2   | A change line           | The change line is plain body text directly under the prose, with no glyph or chip: "Colored 9 nodes" reads as one more sentence of the model's. Design 4.6 draws `Colored (o)77`, and a turn with a change has no chip row, so nothing on it is marked computed. Rule broken: "Three marks". This goes straight at the round's question 3.                                              | `w1/45.png`, `w2/08.png`         | graphty                                                  |
| 3   | 2   | Several                 | One measure, three names on one screen: "Computed Influence", layer Influence, against key card, inspector and prose PageRank; "Bridges" against Betweenness; "Separate pieces" against Components. The glossary retires influence and every retired plain name for the algorithm's own name. Rule broken: glossary, line 481. The app may replace a plain name by id.                   | `w1/17.png`, `w1/21.png`, `w2/03.png` | graphty (`words.ts`); the layer name graphty-element |
| 4   | 2   | Layer list, key card    | A layer the Assistant adds with no name reads "assistant node style" in the list, the inspector and the key card ("Color: assistant node style"). It names who made it, in lowercase English from the element, not what it is. Figma names a thing for its content, and graphty's layers are rule-named. Its own Which nodes already reads "trained: no, 9 nodes".                      | `w1/42.png`, `w1/46.png`         | graphty-element (`tools/families/style.ts` line 397)     |
| 5   | 2   | A reply with two runs   | One Open run sits under two Computed lines and opens only the first (PageRank). Bridges has no door, and the layer the turn painted has no Open layer. A door belongs to its line.                                                                                                                                                                                                       | `w1/18.png`, `w1/19.png`         | graphty (`Checks.tsx`)                                   |
| 6   | 2   | Composer                | Send on an empty composer is drawn as the full primary button and does nothing. A dead control in the one primary color, on every rest state. `aria-disabled` is right; the drawing is not, and its tooltip gives no reason. Rule broken: interaction-patterns "Hide or disable".                                                                                                        | `w1/10.png`, `w2/12.png`         | graphty (`Composer.tsx`)                                 |
| 7   | 2   | Scope line, chips       | The scope line's counts are drawn exactly as a reply's chips, but do nothing: no hover, cursor `auto`, a plain span. In a reply the same drawing peeks and selects. Same look must mean same behavior.                                                                                                                                                                                    | `w1/24.png`, `w1/33.png`         | graphty                                                  |
| 8   | 2   | Chip click              | Clicking a chip moved the drawing about 230 px. Design 5.3 says "The camera never moves"; tier 4's settled rule says a pick glides. A chip click is a look for a checker, and the two texts disagree. Peek rightly moves nothing.                                                                                                                                                         | `w1/34.png`, `w1/35.png`         | graphty (settings it passes), design record              |
| 9   | 2   | Show in table           | Rows stay in load order, 3 of the 9 are on screen and the header reads "24 nodes" with no selected count. The door exists to check a list, and the list is not gathered. Selected first, or a count beside the 24.                                                                                                                                                                       | `w1/36.png`                      | graphty                                                  |
| 10  | 2   | Undo notice             | "Undid Which nodes matter most?." and "Undid Color the people who have not been trained orange..": doubled punctuation on every Assistant undo. The reader's whole message goes in the notice, across the canvas, beside "Undone" in the turn. A short name would do both jobs.                                                                                                          | `w1/37.png`, `w1/48.png`, `w2/19.png` | graphty (`historyWords.ts`, line 358)               |
| 11  | 2   | Failed                  | A failure is the same ink and size as prose: only Send again tells it from a reply. Send again adds a second copy of the question and the failure, while the sent text also sits in the composer above a primary Send, so two controls do one job. Figma's retry replaces the failed row.                                                                                                | `w3/03.png`, `w4/06.png`         | graphty                                                  |
| 12  | 2   | Settings, AI provider   | Save and Done are both primary on one surface, and Done drops a typed key (backlog, T90). Forget key and Delete all conversations are live with nothing saved; an action that does not apply is absent. The section holds 63 words, over bar 12's 50; keep it, since the disclosure is what bar 3 measures, but the disclosure is the smallest text in the dialog.                       | `w1/05.png`, `w4/04.png`         | graphty (`AiProviderSection.tsx`)                        |
| 13  | 2   | Starters                | Centered borderless text in a panel where everything else sits on one left edge. At rest they read as a caption, not as three rows to click; only hover shows a fill. Figma's list rows are left-aligned.                                                                                                                                                                                | `w1/10.png`, `w1/15.png`, `w4/05.png` | graphty (`assistant.css`)                           |
| 14  | 2   | Conversation list       | Each row rests with two labeled buttons, Open and Delete, the row is not the target, and the open conversation is not marked. The title reads Assistant with any conversation open, so nothing names which one. Figma's page list: the row opens, the current row is marked, actions come on hover.                                                                                     | `w1/29.png`, `w2/18.png`         | graphty (`ConversationList.tsx`)                         |
| 15  | 2   | After Undo of a removal | The 82 nodes and 63 edges come back selected, and the scope line flips to Selection with nothing said. Kept for this round by the answer key; fix it after.                                                                                                                                                                                                                              | `w2/17.png`                      | graphty-element                                          |
| 16  | 1   | Steps                   | Step rows are caption size, against design 8's two sizes. Three identical "Query data" rows, each with a bare "5", tell a checker little.                                                                                                                                                                                                                                                | `w1/18.png`                      | graphty                                                  |
| 17  | 1   | Panel edges             | Three left edges: title and prose at 73, scope line and request at 65, steps and Open run at 81. Design 4.4 asks for one.                                                                                                                                                                                                                                                                | `w1/17.png`, `w2/03.png`         | graphty (`assistant.css`)                                |
| 18  | 1   | After an approval       | The request leaves no mark, and the two passes of prose run together: "requires your confirmation before proceeding. The largest connected component...". A paragraph break would do.                                                                                                                                                                                                    | `w2/08.png`                      | graphty                                                  |
| 19  | 1   | Approval card           | The node count has a chip that peeks; the 63 edges have none, though the scope line draws both.                                                                                                                                                                                                                                                                                          | `w2/03.png`                      | graphty                                                  |
| 20  | 1   | Chips                   | A chip has no tooltip, so nothing on screen says a click selects and changes the next message's scope. A name is enough ("Select 9 nodes"), and it would teach the peek's sibling.                                                                                                                                                                                                       | `w1/33.png`                      | graphty                                                  |
| 21  | 1   | Talk                    | "No microphone found." is caption size and stayed through nine further steps, against design 8. The tooltip reads Shift+Ctrl+Space, design 6.1 Ctrl+Shift+Space.                                                                                                                                                                                                                         | `w2/13.png`, `w2/19.png`         | graphty (`Composer.tsx`, `Talk.tsx`)                     |
| 22  | 1   | Steps, on return        | Opened steps fold again after a trip to another place.                                                                                                                                                                                                                                                                                                                                   | `w1/19.png`, `w1/23.png`         | graphty (`Conversation.tsx`)                             |
| 23  | 1   | Stopped                 | "Stopped. Changes taken back." when nothing had changed (backlog, T90 A).                                                                                                                                                                                                                                                                                                                | `w5/02.png`                      | graphty                                                  |

## Classed no change

Each is settled, so it is no finding: 40 px of canvas and toolbar movement between the Graph place
and the Assistant (`decided.md`, Width); the x in a panel where other places have none (The panel has
an x); Remove in the brand color with no red (No red); "Does name line up with the groups?" (kept for
this round); a question repainting the network (kept for this round; finding 1 asks only for its
line); a pick gliding the camera on a canvas click, though how far it zooms stays a backlog defect
(`tier4/decided.md`; `w1/23.png` leaves nodes under the toolbar).

## What already works the Figma way

- One door and no form on the no-provider screen; Save lands in the composer (`w1/04.png`, `w1/10.png`).
- Peek: a neutral halo on hover, no selection, no scope change, on 24 nodes and on 331 (`w1/33.png`,
  `w2/04.png`).
- The request: pinned, one primary, Send quiet, verbs on the buttons, a true count (`w2/03.png`).
- Away from the panel: the rail dot and a lasting notice with Open (`w2/06.png`).
- Open layer opens the real editor and the chat stays (`w1/46.png`).
- Quick actions finds Assistant with its key, and AI provider... (`w2/15.png`, `w2/16.png`).
- The scope line and its x: one message, then back to Selection (`w1/26.png`, `w1/27.png`).
- Dark at 900 x 700 holds every state reached, with nothing clipped (`w4/05.png`, `w4/06.png`).

## Limits

An expert read, not user evidence. The model varies from run to run, so a turn here may not repeat;
finding 1 is the one that depends on what the model chose to call.
