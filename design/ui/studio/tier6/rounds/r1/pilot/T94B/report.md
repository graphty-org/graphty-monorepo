# Pilot of tier 6 task T94B: taking two Assistant changes back in volunteers-thanks

Build 8fa33aa786 from .study-builds/tier6-r1-8fa33aa786, 1440 x 900, started from
`setup:connected-volunteers-thanks.txt` on every walk (saved project open, Assistant connected,
Graph place showing). Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T94B/ (shortened to `T94B/`
below). The data stayed the 24 people and 63 edges of volunteers.graphml on every walk, and the
starting key card "Color: Thank-you cards, 6 of 24 nodes" was the key's.

Result: reached by pointer and by keyboard. Nothing asked for was skipped. The success path matches
the answer key, with no mismatch. Off it, deleting the two layers by hand gives the picture back but
leaves the community run behind (defect 2), and the keyboard walk finds that Undo in a turn takes
focus away from the conversation (defect 1).

| Walk      | First look   | After color  | After size   | Last look    | Runs left | Model calls |
| --------- | ------------ | ------------ | ------------ | ------------ | --------- | ----------- |
| success   | d531fe5816d6 | 013fe4ea72ce | d75feb76a12f | d531fe5816d6 | none      | 10          |
| keyboard  | d531fe5816d6 | 013fe4ea72ce | d75feb76a12f | d531fe5816d6 | none      | 9           |
| detour-1  | d531fe5816d6 | 013fe4ea72ce | d75feb76a12f | d531fe5816d6 | none      | 12          |
| detour-2  | d531fe5816d6 | 013fe4ea72ce | d75feb76a12f | d531fe5816d6 | Louvain   | 7           |
| detour-3  | d531fe5816d6 | 013fe4ea72ce | d75feb76a12f | d531fe5816d6 | none      | 9           |

`styles.json` listed no layer gone, added or changed on any walk, and `data.json` read 24 nodes, 63
edges, nothing selected.

## Routes walked

### Success path by pointer (T94B/success)

Assistant on the rail (02). Typed the color request, Enter; "Sending to Google" (03), then three
colors, key card "Color: Louvain" with Group 1 to 3, the change line "Computed Communities for 24
nodes", Open run and Undo (04). The size request: key card adds "Size: hours", the change line "Sized
24 nodes by hours", Open layer and Undo, and Undo has left the first turn (05). Undo: the second row
reads Undone, the size is gone, and Undo returns to the first turn (06). Undo again: both rows read
Undone, the key card is "Color: Thank-you cards", the top bar's Undo is dimmed (07). The Graph place
lists Hovered, Selected, Thank-you cards 6, Everything 24 (08). Back in the Assistant the conversation
is still there (09). Seven steps, as the key says.

### Keyboard (T94B/keyboard, started --keys --sr)

Reached the end. Tab from the top: "Main menu", "Project: volunteers-thanks", "Undo" (disabled), "Redo"
(disabled), "Graph"; ArrowDown to "Assistant"; Enter puts focus in textbox "Message the assistant".
Focus never fell to the page body. In the composer, Enter when empty does nothing, Escape keeps the
text, Enter sends. The status line says "Working", "Louvain finished: 3 groups", "Computed Communities
for 24 nodes. Answer ready", and for the second request "Sized 24 nodes by hours. Answer ready". Focus
stays in the composer through both.

Shift+Tab from the composer: "Undo", "Open layer", "3 steps", "Open run", "4 steps", region
"Conversation". Enter on Undo: the status line says "Undid Now make the people with the most hours
bigger as well.", and focus moves to the first turn's Undo (22). Enter there: "Undid Color every person
by the crew they mostly work with.", and focus moves to the top bar's disabled "Undo" (29). Typing
there was refused: nothing takes text. Control+I returns to the composer. `--read` on the region
"Conversation" reads both change lines ending "Undone". Screen-reader mode hides the paths; the
screenshots are T94B/keyboard/01.png to 46.png.

### Detour 1: asking the Assistant to put it back (T94B/detour-1)

"Put it back the way it was before you changed anything". The first Enter did nothing because the
second reply was still arriving, so the text stayed in the composer (03, 04). A second Enter sent it
(05). After about 25 seconds the reply said it had removed the community run and the hours layer,
with two change lines both reading "Changed the graph" and one Undo (06). The look, the key card, the
layers and the runs were all as at the start, so the Assistant's way worked: SD. The two earlier turns
keep their change lines with no Undone. "2 steps" opens to "Algorithm results 15 ms" and "Style 5 ms"
(07). Open layer (08) and Open run (09) on the things now gone do nothing. The Graph place shows the
starting list (10). Undo on the third turn brings the color and size both back in one step (11), and
Redo returns to the start (12).

### Detour 2: the layer list by hand (T94B/detour-2)

After both changes the Graph place lists hours 24, Communities 24, and Thank-you cards with a mark in
place of its count, "Painted over by Communities" (04, 05). Right-click hours: the menu has Delete
(06). Delete hours (07), then Communities: notice "Deleted Communities layer. Its results are kept."
with Undo (08). The look and the key card are back. The conversation shows neither turn as Undone and
the turn's Undo has gone (09). The Data place shows no sign of the run (10). Open run in the turn opens
Louvain in the inspector on an empty Style tab (11); Values shows the summary (12). Analyze lists
Louvain under Recent (13). The inspector offers no delete, and right-clicking its heading does nothing
(15). `work.json` ends with `louvain Louvain (label Communities)`: the picture is back, the run is not
gone.

### Detour 3: Control+Z, the main menu, a new conversation, the arrow (T94B/detour-3)

Control+Z with focus in the empty composer undid the size (04). With "is this" typed, Control+Z took
back only the last letter of the text and left the network alone, as a text box should (05). The main
menu has no undo or revert (06). New conversation shows the starters and keeps the draft "is thi" (07).
The top bar's arrow, named "Undo Color every person by the crew they mostly work with", undid the color
with that conversation showing (08). The conversation list offers Open and Delete (09). Open: the first
turn still reads "Computed Communities for 24 nodes", Open run, with no Undone, though that change is
undone and its run is gone (10).

## Answer key against the screen

No mismatch on the success path: the key card, the Undone rows, the conversation, `styles.json` and
`work.json` all read as the key says.

## Defects

1. Undo in a turn takes focus away from the conversation. The first goes to the older turn's Undo, the
   last to the top bar's disabled Undo, read as "Undo, disabled" right after the reader undid
   something. A letter typed then goes nowhere, so bar 8's "the next key typed lands in the composer"
   fails at Undo. Keyboard, 22, 29.
2. Deleting the layers by hand leaves the run behind with no way off it that I could find. The notice
   says the results are kept; the Data place does not show the run, and the run's inspector has no
   delete and no menu. A reader sees the picture back and has no way to tell the project is not as
   Noor made it. Bar 7 counts this against the session. Detour 2, 08, 10, 11, 12, 13, 15.
3. A turn undone while another conversation is showing does not read Undone when reopened. The row
   still offers Open run for a run that is gone, and the reader's check that it is back says otherwise.
   Detour 3, 08, 10.
4. Open layer and Open run do nothing, and say nothing, once the layer or run is gone. Detour 1, 08, 09.
5. The change line says only "Changed the graph", twice, for the two things the Assistant removed, and
   the earlier turns it reversed show no sign of it. Only the model's prose says what was done, which
   the design ranks lowest for trust. Detour 1, 06.
6. Enter while a reply is arriving does nothing and says nothing; the text stays and the reader must
   notice. It is easy to meet here, because the picture changes long before the reply ends: the size
   was on the canvas with "Sending to Google" still showing over 22 seconds after Enter. Detour 1, 03,
   04, 05; detour 2, 03.
7. The turn's button is named only "Undo", the same as the top bar's when that one has nothing to undo,
   and does not say what it undoes; the top bar's does. Keyboard, Shift+Tab from the composer.
8. Open run lands on an empty Style tab: a heading, two tabs and nothing under them. Detour 2, 11.
9. Steps read "Algorithm results 15 ms" and "Style 5 ms": a tool's name and a timing, not what happened.
   Opening them pushes the turn's Undo half out of the panel with no scroll to it (07), and Undo closes
   them again (11). Detour 1, 07, 11.
10. The key card says "Color: Louvain", Group 1 to 3, to a reader who asked for crews. The word Louvain
    means nothing to them. Success, 04.
11. Rows change height between "Open run, Undo" and "Undone", so everything below moves up 8 px at each
    Undo. Success, 06, 07.
12. Undo's notice puts the reader's sentence after the verb: "Undid Put it back the way it was before
    you changed anything." Detour 1, 11.
13. A draft survives New conversation, so "is thi" sits under the starters of an empty conversation.
    Detour 3, 07.

Seen and not reported as defects: the key card grows over the network's top left and hides nodes after
the size change (success, 04, 05), because framing uses the canvas alone and `decided.md` rules out
reframing; Undo offered on the newest step only, as `decided.md` settles; Escape keeping composer text,
also settled.

## The tool

The first start failed with `SETUP FAILED`, nothing on screen is called "AI provider...", though the
screenshot shows it. `match.mjs` returns a miss at once instead of waiting the 20 seconds a setup click
gets, so a control that arrives just after the look fails the start. That folder is
T94B/setup-miss-1; the same setup then started cleanly on all five walks.
