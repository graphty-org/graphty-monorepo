# Pilot: T92 A, two facts from sources.graphml with 14 people left selected

Build 8fa33aa786, served from .study-builds/tier6-r1-8fa33aa786. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T92A/ (each path below is
relative to that folder).

Result: both facts can be reached by pointer and by keyboard alone. The selection plant works: with
the 14 still selected, the donations reply narrowed to them ("6 of the 9"), and the scope line said
"Selection 14". The network stayed 24 nodes and 59 edges from sources.graphml on every walk, with
no run or layer the walk did not cause. Every session was ended and its key check was clean.

The model's reply varied a lot between walks. The bridge question got Silverline Media (s20, right),
Paula Greene (a degree ranking, wrong) and Victor Szabo (wrong) on the same build.

## Routes walked

| Folder   | Route                                                                                     | Outcome                                       |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| success  | Pointer: Assistant, bridge question, Open run, s20, scope x, donations, chip, Show in table | Reached: s20 is Silverline Media; 7 of 12     |
| detour-1 | Donations first with the 14 left selected, bridge question, Send again, scope x, ask again | Trap fired, then recovered to 7 of 12         |
| detour-2 | Click empty canvas to clear the selection, both facts in one message                       | Both right, one reply; donations has no chip  |
| detour-3 | Find box, right-click on the canvas, Analyze, Quick actions, ask with an edge selected     | Find box gives the 12; the rest lead on       |
| keyboard | Keys only, in screen-reader mode, both facts, chip by key, Control+I                       | Reached, keyboard/70.png                      |

detour-3 was ended while its last message was still running, so the reply to a question scoped to
one edge was not seen (detour-3/11.png shows the scope line "Selection Edge 1").

## Pointer success path

1. Start: 14 nodes selected, inspector "14 nodes selected", Selected layer 14 (success/01.png).
2. Assistant: starters, composer focused, scope line "Selection 14" (02).
3. The bridge question and Enter. "Sending to Google" with a growing step count, about 45 seconds
   (03, 04). Reply: "Across the entire graph, source s20 has the highest betweenness centrality
   score (67.68) ... If limited to your selected group of people, s10 ..." with the change line
   "Computed Bridges for 24 nodes", Open run and Undo. No chip.
4. 8 steps opens: Bridges and seven Query data rows, with chips reading 14 (05).
5. Open run: inspector "Betweenness", on an empty Style tab (06, 07). Values: distribution, Top 10
   by id, s20 at 67.68 (08).
6. Clicking s20 in Top 10: the node's inspector gives name Silverline Media, Betweenness "67.68, #1
   of 24" (11). The selection became 1 and the canvas moved and zoomed.
7. Scope x: "Whole graph 24 59 Use selection" (13). The donations question and Enter. The scope
   line went back to "Selection 1" as soon as the message was sent, as designed (14).
8. Reply: "7 of the 12 sources who are on the record gave donations." with a 7 chip and Show in
   table (15). Hovering the chip drew halos on the nodes in view, with no camera move and no change
   to the selection (16). Show in table opened the table with 7 rows marked and 24 nodes listed, and
   the inspector read on_record Yes (7), donations 300 to 18,000 (17).

Both facts match the answer key: Silverline Media at 0.267 normalized (67.68 of 253 pairs), and 7 of
12. Top 10 puts s12 second at 61.64, which is Port Authority at 0.244.

## Detours

**detour-1, the selection left in place.** Asked with "Selection 14" above the composer, the reply
was "Among the selected sources, 6 of the 9 who are on the record gave donations." with a 6 chip
(03). So the plant holds on this build, and the words of the reply say so as well as the scope line.
The bridge question next gave a full reply naming Silverline Media, followed by "Run an algorithm
failed. Nothing changed." with Send again (04). Send again removed that reply from the transcript,
and the new turn answered Paula Greene from a degree run after about 90 seconds (08). Scope x and
the same question gave "Across the whole graph, 7 of the 12" with a 12 chip (09).

**detour-2, clearing the selection first.** A click on empty canvas cleared it; the scope line then
read "Whole graph 24 59" (03). Both facts in one message came back right in 3 steps (04): "Silverline
Media (s20) ... Out of the 12 sources on the record, 7 gave donations." There were two change lines
and one Open run, which opened Betweenness (07). No chip backs the 7, because a turn that made a
change shows the change line in place of chips, as decided.

**detour-3, the places a person looks first.** The Find box with "on_record" offers "Select the 12
nodes (on_record: yes)" (02); Enter selects them, replacing the 14, and the inspector then shows
donations 0 to 18,000 for the 12 but no count above zero (03). Escape clears the box and keeps the
selection (04). A right-click at a selected cluster landed on an edge, which became the selection
at once and replaced the 12 (05). The menu offers nothing toward either fact. Analyze with
"betweenness" lists Betweenness first (07). Quick actions with "assistant" lists Assistant with
Ctrl+I (09); Enter opens the panel with focus in the composer and the scope line "Selection Edge 1"
(10).

## Keyboard walk

Focus names from the top: "Main menu", "Project: sources", "Undo" (disabled), "Redo" (disabled),
"Graph", "Graph sources.graphml", combobox "Find", "Add a layer or a folder". Tab does not reach
Assistant; from "Graph", ArrowDown does. Enter opens the panel and focus goes to textbox "Message
the assistant". Going on: "Gemini 3.8 Flash", "Talk", "Send" (disabled). Going back from the
composer: "Ask about the whole graph", then the turn's own buttons ("4 steps", "8 steps"), region
"Conversation", "Close", "New conversation". Chip: "7 nodes, select"; Enter selects and says "7
nodes selected" in the polite region, focus stays. Focus on the chip draws the same halos as a hover
(keyboard/70.png).

Focus fell to the page body at no point after the start. It fell to region "Conversation" when Send
again was pressed and its button went away.

Fields: in the composer Enter sends, Tab goes to the model label, Shift+Tab to the scope x, and
Escape keeps the text when idle. Control+I in the composer closes the panel with focus on
"Assistant", and Control+I there returns to the composer. Empty Enter does nothing.

Open run and Show in table were not pressed by key, because the keyboard turns that reached them
gave no Open run; both are ordinary buttons in the tab order.

On this walk the model got the bridge wrong after one failure and Send again: "Victor Szabo (s10) has the highest
betweenness centrality" with "Whole graph" on the scope line, and it selected him unasked. The
right name was in the first failed reply, which Send again removed. The donations question in the
same conversation gave "6 ... (7 if including the organization Friends of the Waterfront)"; in a new
conversation it gave "Seven of the 12".

## Mismatches with the answer key

- "An analysis repaints the network and adds a key card." Neither happened on any walk: the run was
  recorded and the drawing stayed as it was (success/04.png, detour-2/04.png). "An analysis asked as
  a question repaints the network", listed as seen while writing the key, did not show here.
- The key's path reads "the reply and its chip" for fact 1. The reply to the bridge question has no
  chip; it has a change line with Open run and Undo, so hovering a chip is not available for it
  (success/04.png, detour-1/08.png).
- "Fact 1 under the selection may name a person." The reply named s20 across the whole graph and
  s10 for the selection, both in one reply; the selection did not narrow the run, which reads
  "for 24 nodes" (success/04.png).
- The reply gave the id, s20, rather than the name. The key's answer is a name, and a reader has to
  open a node to get from one to the other (success/04.png, success/11.png). Some other replies gave
  both.
- The key's 4 to 7 steps: the pointer route took 9 once the id had to be turned into a name.
- A chip was keyed as the check for the count. The chip's number follows what the last query found,
  not the answer: 7 on two walks, 12 on another for the same 7 of 12 (success/15.png,
  detour-1/09.png).

Everything else matched: 6 of 9 under the selection, 7 of 12 without it, the Top 10 order, and the
names behind the ids.

## Defects

Severity is 0 to 4. The "name" starter is known and kept in this build, so it is not listed. The x
lasting for one message, Show in table and a chip click selecting, and no chips on a changing turn
are decided or designed, so they are not listed.

1. (3) A complete, correct reply is followed by "Run an algorithm failed. Nothing changed." The
   mechanism is in `runConversation.ts`: when the turn's last write batch fails and nothing fixes
   it, the whole message's writes are rolled back, so the run the reply rests on is gone while its
   prose stays. The reader cannot tell whether to believe the answer. It came on 2 of the 4 bridge
   questions asked with the 14 selected. The turn shows no steps, so which call failed is not
   visible. detour-1/04.png, keyboard walk at the first reply
2. (3) Send again deletes the reply it retries. The earlier prose vanishes and only the failure row
   stays, so a right answer (Silverline Media) is replaced by a wrong one (Paula Greene, Victor
   Szabo) with nothing left to compare. detour-1/04.png, detour-1/08.png
3. (3) The model selected nodes when only asked a question: "I have narrowed the selection to Victor
   Szabo", "I have selected these 6 sources". The reader's selection is replaced with no way back,
   and it silently becomes the next message's scope. Keyboard walk, keyboard/70.png shows 6 selected
4. (3) "Whole graph" did not bind the answer in an ongoing conversation. With the scope line on
   Whole graph, the reply still gave 6 of the 9 first, carrying the narrowing of earlier turns. A
   new conversation gave 7 of 12. Keyboard walk
5. (2) A rolled-back turn leaves Redo lit with Undo dim, though the row says nothing changed. Redo
   stays lit into a new conversation. detour-1/04.png, keyboard/70.png
6. (2) One turn sat at "Sending to Google" and a stale "7 steps" for about three minutes, between
   model calls 15 and 16 in session.log. Nothing tells the reader it is still alive or suggests
   Stop. It ended by itself. Keyboard walk
7. (2) Scope x sends focus to different places: the composer when nothing else is going on, "Send
   again" on a failed turn, "Show in table" on a turn with a chip. On the failed turn, the next Enter
   resends. Keyboard walk
8. (2) The reply, the run's Top 10 and the spoken news use ids (s20, "Betweenness finished: s20 ranks
   first, 67.68"), and the file has a name column. success/04.png, success/08.png
9. (2) The reply says "No visual changes were made" above "Computed Bridges for 24 nodes" and an
   Undo, with Undo lit in the top bar. success/04.png
10. (2) Open run lands on an empty Style tab with nothing to say why. success/06.png, success/07.png
11. (2) Two change lines and one Open run: Connections cannot be opened from the turn.
    detour-2/04.png, detour-2/07.png
12. (2) Clicking a row in the run's Top 10 moves and zooms the canvas, cuts part of the network off
    under the toolbar and at the right edge, and replaces the selection, which is the next message's
    scope. Nothing says the scope changed except the line above the composer. success/11.png
13. (2) A disabled Send looks the same as an enabled one: solid green with an empty composer, though
    the name reads disabled. success/02.png, success/04.png
14. (2) A right-click on an edge replaces the selection before the menu opens, so looking at a menu
    loses 12 or 14 selected nodes. detour-3/05.png
15. (2) The status news reports a run that the turn then takes back: "Betweenness finished: s20 ranks
    first, 67.68" during a turn that ended "Nothing changed". Keyboard walk
16. (1) "No microphone found." stays under the composer through later messages and into a new
    conversation. keyboard/70.png
17. (1) The gear-shaped mark under "Made with" has no words beside it; its name is "Advanced run
    settings has configured values". success/08.png
18. (1) At the start, the Find box wears its focus ring although nothing has focus. success/01.png
19. (1) One node sits under the inspector's edge on the opening view. success/01.png
