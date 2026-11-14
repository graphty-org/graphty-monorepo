# Pilot: T92 A, two facts from sources.graphml with 14 people left selected (targeted re-pilot)

Build 48879618c4, served from .study-builds/tier6-r1d1-48879618c4, start
`setup:connected-sources-selected.txt`. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T92A/ (each path below is
relative to that folder). The walks of the previous build moved to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build-3549e11129/pilot/T92A/.

Result: both facts can be reached by pointer and by keyboard, but the answer key's route does not get
fact 2 on its own. Once fact 1 has been asked, the x on the scope line did not bring 7 of 12 on any of
the three walks that used it: the reply was 6 of 9, twice with no seven in it at all. A new
conversation, or a message that says "whole graph" in words, did give 7 of 12.

The frozen build holds none of the fixes the second dry run asked for. `git diff 3549e11129
48879618c4` on `graphty`, `graphty-element`, `compact-mantine` and `pnpm-lock.yaml` is empty, and the
two served folders differ only in `index.html` and two source maps. `settleTarget` in `fields.ts`
still narrows every target to the bound ids, the chip fix `2e760cfa8e` is still reverted, and no line
about which read comes last was added. So this pass measures the previous build's code again.

Every session held 24 nodes and 59 edges from sources.graphml at its end, nothing the session started
with was gone, each `--end` passed its key check, and no step printed a script error. The one failed
request was the model call that Stop aborted on purpose (touched-29/06.png).

## Routes walked

| Folder     | Route                                                                  | Outcome                                                           |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| success    | Pointer: Assistant, bridge question, Open run, s20, x, donations, chip | Reached, on a second ask: 6 of 9 first, then "7 of the 12" (16)   |
| touched-13 | x before the first message, donations, chip, Show in table             | Right: 7, chip 7, the seven rows marked (02 to 06)                |
| touched-33 | x, bridge, then donations under the model's selection                  | Right words, 7 of the 12, with nothing behind them (04)           |
| touched-16 | Donations with the 14, bridge, x, donations again                      | Trap fired; after the x still 6 of 9, no steps (05); words fixed it (06) |
| touched-19 | Stray edge, color request, Send again                                  | No failure on three tries, so no Send again (06, 09, 12)          |
| touched-29 | Stray edge, color request, x after a failure                           | No failure on two tries; "Yes" to the offer was dead (05)         |
| keyboard   | Keys only, in screen-reader mode, both facts, chip, Show in table      | Reached, keyboard/76.png                                          |

Routes 15 and 17 of the fix pass's list are success and keyboard above.

Send again never came up on this build: nine sends of the color request or the bridge question with a
selection on all ended in a reply, not a failure row. So "Send again goes with what the scope line says
now" was not exercised here on T92 A, and neither was the x after a failure. The closest state is the
message Stop took back, which restores the text; the x and Enter from there worked (touched-29/10.png).

## Pointer success path

1. Start: 14 nodes selected, scope line "Selection 14" (success/02.png).
2. Bridge question. Reply: "Among the selected sources, Victor Szabo (s10) has the highest betweenness
   centrality across the network (45.4) ... Ines Moreau (s11)", with "Computed Bridges for 24 nodes",
   "Computed Bridges for 14 nodes", Open run and Undo (success/04.png). The reply does not name s20.
3. Open run: "Betweenness (visible)", Values, 24 of 24, Top 10 with s20 first at 67.68, then s12 at
   61.64, and s10 fourth at 45.4 (success/06.png). A reader who opens the run can see the reply's name
   is not the top of the list.
4. s20 in Top 10: name Silverline Media, 67.68, #1 of 24 (success/07.png).
5. x: "Whole graph 24 59" (success/09.png). Donations question, 2 steps: "6 of the 9 on-record sources
   gave donations." with a chip of 9 and Show in table (success/10.png). Steps show chips of 6 and 9
   (success/11.png). All 9 are `kind` person in the inspector, and City Planning Office, on the record
   and an agency, is not marked in the table (success/13.png): the model filtered to people by itself.
6. Asking again with "all the sources in the file": "Among the people ... 6 of the 9 ... If counting
   all entities in the file (including organizations), 7 of the 12", chip 12, and the 12 in the table
   (success/14.png, 16.png).

With x before any other message the same question gave "There are 7 sources on the record who gave
donations (6 individuals and 1 organization)", chip 7 (touched-13/02.png). Hover drew rings with no
selection or camera change (04); the chip selected 7 (05); Show in table marked the seven, inspector
on_record Yes (7), donations 300 to 18,000 (06).

## Touched routes

**touched-33.** Fact 1 selected s20 unasked ("It has been selected on the graph"), so the second
message started under Selection 1. Reply: "7 of the 12 sources on the record gave donations (s02, s05,
s06, s11, s16, s17, and s21).", then "Selected 0 nodes" twice, no chip and no Show in table, six steps
(touched-33/04.png). The network also repainted in Betweenness with a key card, which the key keeps.
My click on "6 steps" named it wrongly, so the steps list was not opened (05).

**touched-16.** With the 14: "Among the on-record sources in your selection, 6 gave donations.", chip 9
(02). Bridge: "Across the full graph, Silverline Media (s20) ... (67.68) ... Among the selected
individual sources, Victor Szabo (s10)" (03). x and the same question: "There are 6 sources on the
record who gave donations (out of 9 total on the record).", no steps at all, no chip (05). The model
answered from the conversation and called no tool. x and "Count across the whole graph, not my
selection": "Across the whole graph, 7 of the 12", chip 7 (06).

**touched-19 and touched-29.** The right-click at 642,470 hits edge 14 once the drawing has settled,
and empty canvas just after the panel opens, as on the earlier walk. Every color request under the edge
cleared the selection and colored nothing, ending in a reply that asks to repeat: "please repeat your
request" (touched-19/06.png), "please confirm" (09), "would you like me to apply this styling across
the entire graph?" (12), "please clear your selection and ask again" under a line already reading
Whole graph (touched-29/08.png). Repeating, or "yes" after the selection was gone, colored 7 (touched-19/
07.png, 13.png). On touched-29 the first reply left Selection Edge 1 on, and "Yes, apply it to the
entire graph" ended "the current selection scope prevented targeting the 7 ... Please send your request
again without an active selection", with the line reading Whole graph (05). Stop restored the text and
said "Stopped. Changes taken back." (06). x then the request colored 7 nodes under a stray edge (10).

## Keyboard walk

Steps 1 to 17 of the earlier route matched exactly: the names from the top, ArrowDown to Assistant,
Enter to the composer, and the composer's Enter, Tab and Escape. Enter sends, Tab goes to the model
label, Shift+Tab to the x, Escape keeps the text when idle.

Going on: Shift+Tab from the composer reads "Ask about the whole graph", "Undo", "Open run". Enter on
Open run keeps focus there and opens the run. From it Tab goes through "Undo", the x, the composer,
"Gemini 3.8 Flash", "Talk", "Send" (disabled), separator "Resize left panel", Canvas "Graph drawing",
"Analyze", "ran Nov 5, 4:24:21 PM", tab "Style". ArrowRight gives tab "Values"; Tab gives "s20 67.68",
"s12 61.64". Enter on "s20 67.68" says "s20 selected", and focus moves to tab "Values" as the rows go;
the inspector reads Silverline Media. Control+I returns to the composer; Shift+Tab and Enter on the x
returns to the composer with "Whole graph" on the line. A new conversation by key put focus in the
composer. Chip "12 nodes, select" by Enter says "12 nodes selected", focus stays. Show in table by
Enter keeps focus. Control+I closes with focus on tab "Values", and opens again to the composer.

Focus fell to the page body at no point after the start.

Replies: bridge, "Among the sources in the selection, Victor Szabo (s10) ... (Silverline Media ranks
highest across the entire graph)", selected s10 unasked. Donations after the x: "Of the 9 sources who
are on the record, 6 gave donations ... (7 if including the organization Friends of the Waterfront)",
selected the 6, no chip (keyboard/54.png). In a new conversation with the x: "Seven of
the 12 sources on the record gave donations", chip 12 (keyboard/76.png).

## Mismatches with the answer key

- "A first message gives 7 of 12 outright" holds. "After the x in an ongoing conversation the reply can
  still lead with six ... Across all entity types in the graph, there are seven" does not cover what
  happened: two of three replies held no seven at all (success/10.png, touched-16/05.png). The key's
  route (ask, check, ask the second fact) ends on 6 of 9 for a reader who did press the x.
- Fact 1 under the selection: the key says one reply can give both s20 and s10. Two of three replies
  named s10 first (success/04.png, keyboard/19.png); one of them never named s20 or Silverline Media.
  Open run still has s20 first, as the key says.
- The chip row: the key's acceptance is 7 or 12. Walks showed 7, 12, 9 (under 6 of 9) and none.
- The key's "Trap fired" needs a reader to report 6. Here a reader who noticed the scope and pressed x
  gets the same 6, so `Scope noticed: yes` and `Trap fired: yes` come together, and the number measures
  the model's memory rather than the scope line.

## Defects

Severity 0 to 4. Only what crashes, blocks the task or spoils its grading is listed as such; carried
rows say so.

1. (3, spoils) After fact 1, the x does not bring the whole-graph count: 3 of 3 walks gave 6 of 9. The
   message does go out as whole graph: `prompt.ts` says so to the model, and on the success walk the
   selection then was s20 alone, off the record, yet the read found 9. All 9 are people, so the model
   appears to add `kind` person from its own earlier turns; on touched-16 it answered from them with no
   tool call. It needs a new conversation or the words "whole graph" to recover. success/10.png, touched-16/05.png,
   keyboard/54.png
2. (3, spoils, repeat) Fact 2 arrives with nothing behind it: 7 of the 12, "Selected 0 nodes" twice, no
   chip, no Show in table. The fix is not in the build. touched-33/04.png
3. (3, spoils, repeat) A selection cleared by the model does not free the message: "Yes, apply it to the
   entire graph" ends "the current selection scope prevented targeting the 7" under a line reading
   Whole graph. Not in the build either. touched-29/05.png
4. (3) No selection-only turn keeps its chip: "Selected 6 nodes", 6 of 9, no chip. keyboard/54.png
5. (2) The chip row can back a different number from the reply's: 9 under 6 of 9, 12 under 7 of 12, so
   the chip selects the on-record set rather than the donors. success/10.png, keyboard/76.png
6. (2) A reply names s10 as the one source "across the network", with s20 at 67.68 one click away in the
   run it computed. success/04.png, success/06.png
7. (2, carried) "Selected 0 nodes" is drawn as a change line on a reply that changed nothing.
   touched-19/09.png, touched-29/08.png
8. (2, carried) A reply gives advice the screen has overtaken: "please clear your selection" under
   Whole graph. touched-29/08.png
9. (2, carried) The model selects on a plain question, and that becomes the next message's scope.
   touched-33/02.png, keyboard/19.png, keyboard/54.png
10. (1, carried) Two scrollbars once the conversation is long. success/16.png
11. (1, carried) Open steps give two controls the same name: "9 nodes, select", "12 nodes, select".
    success/12.png
12. (1, carried) Two change lines, one Open run: the 14-node Betweenness run cannot be opened from the
    turn. success/06.png
13. (1) Enter on a Top 10 row moves focus to tab "Values" because the row goes; a keyboard reader lands
    back above the list. keyboard/49.png
14. (1, carried) Control+I closes with focus on tab "Values", not on the Assistant rail button.
    keyboard/75.png
