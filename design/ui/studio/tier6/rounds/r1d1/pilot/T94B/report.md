# T94B targeted re-pilot: taking two Assistant changes back in volunteers-thanks

Build 48879618c4, frozen build .study-builds/tier6-r1d1-48879618c4, 1440 x 900, start
`setup:connected-volunteers-thanks.txt` (saved project open, Assistant connected, Graph place
showing). The live model was Gemini 3.8 Flash. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T94B/ (written below as
`<walk>/<n>.png`). Walks of the earlier build 3549e11129 are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build-3549e11129/pilot/T94B/.

This pass walks the success path by pointer and the one T94B route the fixes touched: New
conversation, the arrow, reopen (touched-40). The other routes on the list belong to other tasks.

Result: reached on both walks. Nothing crashed, blocked the task or gave a wrong result. Both walks
ended with the starting look, no layer changed and no run left, on the project's own 24 nodes and 63
edges. The answer key and the screen agree. The conversation reopened after an Undo made elsewhere
now reads Undone on both messages, as `decided.md` says.

| Walk       | First look   | After color  | After size   | Last look    | Runs left | Model calls |
| ---------- | ------------ | ------------ | ------------ | ------------ | --------- | ----------- |
| success    | d531fe5816d6 | 013fe4ea72ce | 7fa3ec901b30 | d531fe5816d6 | none      | 10          |
| touched-40 | d531fe5816d6 | 013fe4ea72ce | d75feb76a12f | d531fe5816d6 | none      | 9           |

The size look differs between the walks because the model chooses the size rule on each run; both
drew hours from 2 to 52. On both walks `styles.json` lists nothing gone, added or changed, `work.json`
lists nothing gone and no run at the end, `data.json` reads 24 nodes, 63 edges, nothing selected, and
the key card ends "Color: Thank-you cards 6 of 24 nodes".

## Routes walked

### Success path by pointer (success)

Replayed from the earlier build. It stopped at the third step only because the first reply was still
arriving after 12 seconds; the rest was walked by hand.

Assistant (02), the color request and Enter (03). The key card "Color: Louvain" with Group 1 to 3 was
on the canvas while "Sending to Google" still showed (04). The reply followed: "Computed Communities
for 24 nodes", Open run, Undo (05). The size request: key card adds "Size: hours" 2 to 52, the change
line "Sized 24 nodes by hours", Open layer and Undo, and the first turn's Undo has gone (06). Undo: the
second row reads Undone, the size is gone, the color stays, Undo returns to the first turn (07). Undo
again: both rows read Undone, the key card is "Color: Thank-you cards, 6 of 24 nodes", the top bar's
Undo is dimmed (08). The Graph place lists Hovered 0, Selected 0, Thank-you cards 6, Everything 24
(09). Back in the Assistant the conversation is still there (10). Seven steps, as the key says.

### New conversation, the arrow, reopen (touched-40)

Eight of nine steps matched the earlier build. The ninth differed only in how many steps the model
took and in the notice still showing.

Both changes made (02, 03). Control+Z with focus in the empty composer undid the size (04). With "is
this" typed, Control+Z took back the last letter and left the network alone (05). Main menu (06). New
conversation shows the starters and keeps the draft "is thi" (07). The top bar's arrow undid the color
with that conversation showing: the key card is back, the arrow reads "Nothing to undo" (08). The
conversation list offers Open and Delete (09). Open: both messages read Undone, with no Open run or
Open layer, and the draft is still in the composer (10).

## Answer key against the screen

No mismatch on the success path.

## Defects

None that crashes, blocks the task or would spoil its grading.
